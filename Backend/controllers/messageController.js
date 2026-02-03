const Message = require('../models/Message');
const User = require('../models/User');
const Notification = require('../models/Notification');
const DeletedConversation = require('../models/DeletedConversation');
const BlockedUser = require('../models/BlockedUser');
const { isUserInChatWith } = require('../socket/socketServer');

// ============================================
// SANITIZATION HELPER FUNCTION
// ============================================
// Sanitizo përmbajtjen e mesazhit për të shmangur XSS attacks
const sanitizeMessage = (content) => {
  if (!content || typeof content !== 'string') {
    return '';
  }

  // Hiq HTML tags dhe karaktere të rrezikshme
  let sanitized = content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Hiq <script> tags
    .replace(/<[^>]+>/g, '') // Hiq të gjitha HTML tags
    .replace(/javascript:/gi, '') // Hiq javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Hiq event handlers (onclick, onload, etc.)
    .trim();

  // Limit për gjatësinë e mesazhit (tashmë në model, por kontrollojmë edhe këtu)
  if (sanitized.length > 5000) {
    sanitized = sanitized.substring(0, 5000);
  }

  return sanitized;
};

// @desc    Get messages between current user and a friend
// @route   GET /api/messages/:friendId
// @access  Private
const getMessages = async (req, res) => {
  try {
    const { friendId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50; // Default 50 mesazhe per faqe
    const skip = (page - 1) * limit;

    if (!friendId) {
      return res.status(400).json({ message: 'Friend ID is required' });
    }

    // Verify current user exists
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const currentUserId = req.user._id.toString();
    const targetFriendId = friendId;

    // Check if target user exists
    const targetUser = await User.findById(targetFriendId);
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if they are friends
    const currentUser = await User.findById(currentUserId);
    if (!currentUser) {
      return res.status(404).json({ message: 'Current user not found' });
    }

    if (!currentUser.friends.includes(targetFriendId)) {
      return res.status(403).json({ message: 'You can only message your friends' });
    }

    // ============================================
    // CHECK IF CONVERSATION IS DELETED BY CURRENT USER
    // ============================================
    // Perspektiva për përdoruesin:
    // - Përdoruesi që fshin bisedën: shfaqen vetëm mesazhet pas fshirjes (chat i ri)
    // - Përdoruesi tjetër: mesazhet e vjetra mbeten të dukshme (nuk ka rekord të fshirë për të)
    //
    // Si funksionon pas refresh:
    // 1. Pas refresh, frontend-i bën fetch nga API (GET /api/messages/:friendId)
    // 2. API-ja kontrollon DeletedConversation për përdoruesin aktual
    // 3. Nëse ka rekord të fshirë, kthehen vetëm mesazhet me createdAt > deletedAt
    // 4. Rezultati: mesazhet e vjetra nuk shfaqen, vetëm mesazhet e reja
    //
    // Logjika:
    // - Nëse ka rekord të fshirë: Query createdAt > deletedAt → kthehen vetëm mesazhet pas fshirjes
    // - Nëse nuk ka rekord të fshirë: kthehen të gjitha mesazhet
    const deletedConversation = await DeletedConversation.findOne({
      userId: currentUserId,
      otherUserId: targetFriendId,
    });

    // Query për mesazhet midis dy përdoruesve (në të dy drejtimet)
    let messageQuery = {
      $or: [
        { senderId: currentUserId, receiverId: targetFriendId },
        { senderId: targetFriendId, receiverId: currentUserId },
      ],
    };

    // Nëse biseda është e fshirë nga përdoruesi aktual, shto kusht për të marrë vetëm mesazhet pas deletedAt
    // Kjo garanton që mesazhet e vjetra (para deletedAt) nuk kthehen
    // Përdoruesi tjetër nuk ka rekord të fshirë, kështu që ai sheh të gjitha mesazhet
    if (deletedConversation && deletedConversation.deletedAt) {
      messageQuery.createdAt = { $gt: deletedConversation.deletedAt };
    }

    // Get messages between the two users (in both directions)
    // Nëse biseda është e fshirë, kthe vetëm mesazhet pas deletedAt
    const messages = await Message.find(messageQuery)
      .populate('senderId', 'name displayName username profilePhoto')
      .populate('receiverId', 'name displayName username profilePhoto')
      .sort({ createdAt: -1 }) // Më të rejat së pari
      .limit(limit)
      .skip(skip)
      .lean();

    // Set deliveredAt for messages received by current user that don't have it yet
    const deliveredAt = new Date();
    const messagesToUpdate = messages.filter(
      (msg) => 
        msg.receiverId._id.toString() === currentUserId && 
        !msg.deliveredAt
    );

    if (messagesToUpdate.length > 0) {
      const messageIds = messagesToUpdate.map((msg) => msg._id);
      await Message.updateMany(
        { _id: { $in: messageIds } },
        { $set: { deliveredAt: deliveredAt } }
      );
      
      // Update messages array with deliveredAt
      messages.forEach((msg) => {
        if (messageIds.some((id) => id.toString() === msg._id.toString())) {
          msg.deliveredAt = deliveredAt;
        }
      });
    }

    // Get total count for pagination (duke përdorur të njëjtin query si për mesazhet)
    const totalMessages = await Message.countDocuments(messageQuery);

    // Format messages for frontend
    const formattedMessages = messages
      .reverse() // Reverse për të pasur mesazhet në rend kronologjik (të vjetrat së pari)
      .map((message) => ({
        id: message._id.toString(),
        senderId: message.senderId._id.toString(),
        receiverId: message.receiverId._id.toString(),
        content: message.content,
        imageUrl: message.imageUrl || null,
        timestamp: message.createdAt,
        isRead: message.isRead,
        readAt: message.readAt || null,
        deliveredAt: message.deliveredAt || null,
        isEdited: message.isEdited || false,
        editedAt: message.editedAt || null,
        isDeleted: message.isDeleted || false,
        deletedAt: message.deletedAt || null,
      }));

    return res.status(200).json({
      message: 'Messages retrieved successfully',
      messages: formattedMessages,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalMessages / limit),
        totalMessages: totalMessages,
        hasMore: skip + messages.length < totalMessages,
      },
    });
  } catch (error) {
    console.error('Get messages error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Send a message
// @route   POST /api/messages
// @access  Private
const sendMessage = async (req, res) => {
  try {
    const { receiverId, content, imageUrl } = req.body;

    if (!receiverId) {
      return res.status(400).json({ message: 'Receiver ID is required' });
    }

    // Mesazhi duhet të ketë ose content ose imageUrl (ose të dyja)
    if (!content && !imageUrl) {
      return res.status(400).json({ message: 'Message must have either content or imageUrl' });
    }

    // ============================================
    // VALIDATE IMAGE URL
    // ============================================
    // Nëse ka imageUrl, validoj që është valid URL
    if (imageUrl) {
      if (typeof imageUrl !== 'string' || imageUrl.trim().length === 0) {
        return res.status(400).json({ message: 'Invalid imageUrl provided' });
      }
      
      // Validim bazik për URL format
      try {
        const url = new URL(imageUrl);
        // Kontrollo që URL është HTTP ose HTTPS
        if (!['http:', 'https:'].includes(url.protocol)) {
          return res.status(400).json({ message: 'Image URL must use http or https protocol' });
        }
      } catch (urlError) {
        return res.status(400).json({ message: 'Invalid imageUrl format' });
      }
    }

    // Nëse ka content, validoj dhe sanitizo
    let sanitizedContent = '';
    if (content) {
      if (!content.trim()) {
        return res.status(400).json({ message: 'Message content cannot be empty' });
      }

      // ============================================
      // SANITIZE MESSAGE CONTENT
      // ============================================
      // Sanitizo përmbajtjen e mesazhit për të shmangur XSS attacks
      sanitizedContent = sanitizeMessage(content);
      
      if (!sanitizedContent || sanitizedContent.trim().length === 0) {
        return res.status(400).json({ message: 'Message content is invalid or contains only unsafe characters' });
      }
      sanitizedContent = sanitizedContent.trim();
    }

    // Verify current user exists
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const senderId = req.user._id.toString();

    // Check if trying to send to yourself
    if (senderId === receiverId) {
      return res.status(400).json({ message: 'Cannot send message to yourself' });
    }

    // Check if receiver exists
    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return res.status(404).json({ message: 'Receiver not found' });
    }

    // Check if sender exists
    const sender = await User.findById(senderId);
    if (!sender) {
      return res.status(404).json({ message: 'Sender not found' });
    }

    // ============================================
    // VERIFY FRIENDSHIP
    // ============================================
    // Verifikimi që dërguesi dhe marrësi janë miq
    if (!sender.friends.includes(receiverId)) {
      return res.status(403).json({ message: 'You can only message your friends' });
    }

    // ============================================
    // VERIFY NOT BLOCKED
    // ============================================
    // Kontrollo nëse dërguesi është i bllokuar nga marrësi
    // Nëse marrësi ka bllokuar dërguesin, mos lejo dërgimin e mesazhit
    // dhe kthe mesazh gabimi që nuk zbulon që përdoruesi është i bllokuar
    const isSenderBlockedByReceiver = await BlockedUser.findOne({
      blockerId: receiverId,
      blockedId: senderId,
    });

    if (isSenderBlockedByReceiver) {
      return res.status(403).json({ message: 'User either has deleted his account or has blocked you' });
    }

    // NUK kontrollojmë nëse dërguesi ka bllokuar marrësin
    // Kjo lejon që bllokuesi të dërgojë mesazhe nëse dëshiron
    // (biseda është e fshirë për bllokuesin, por ai mund të dërgojë mesazhe të reja)

    // Create and save message
    const message = new Message({
      senderId: senderId,
      receiverId: receiverId,
      content: sanitizedContent || '', // Mund të jetë bosh nëse ka vetëm foto
      imageUrl: imageUrl || null,
      isRead: false,
    });

    const savedMessage = await message.save();

    // ============================================
    // REMOVE DELETED CONVERSATION RECORD IF EXISTS
    // ============================================
    // Kur dërgohet mesazh i ri, rekordi i DeletedConversation fshihet për të dy drejtimet
    // (sender dhe receiver). Kjo lejon që mesazhet e reja të shfaqen normalisht.
    // 
    // Logjika:
    // - Nëse sender ka fshirë bisedën më parë, fshi rekordin e sender
    // - Nëse receiver ka fshirë bisedën më parë, fshi rekordin e receiver
    // - Pas fshirjes, mesazhet e reja do të shfaqen për të dy përdoruesit
    try {
      // Fshi rekordin nëse sender ka fshirë conversation me receiver
      await DeletedConversation.deleteOne({
        userId: senderId,
        otherUserId: receiverId,
      });
      
      // Fshi rekordin nëse receiver ka fshirë conversation me sender
      await DeletedConversation.deleteOne({
        userId: receiverId,
        otherUserId: senderId,
      });
    } catch (deleteError) {
      // Nuk ndalojmë procesin nëse fshirja dështon
      // Kjo është një operacion "best effort" - mesazhi duhet të dërgohet edhe nëse
      // fshirja e rekordit të DeletedConversation dështon
      console.error('Error removing deleted conversation record:', deleteError);
    }

    // Populate sender and receiver info
    await savedMessage.populate('senderId', 'name displayName username profilePhoto');
    await savedMessage.populate('receiverId', 'name displayName username profilePhoto');

    // Check if receiver is online (for deliveredAt)
    // Note: This requires access to activeUsers from socketServer
    // For now, we'll set deliveredAt when receiver fetches messages (in getMessages)
    // If receiver is online, deliveredAt will be set via socket handler
    
    // Format message for response
    const formattedMessage = {
      id: savedMessage._id.toString(),
      senderId: savedMessage.senderId._id.toString(),
      receiverId: savedMessage.receiverId._id.toString(),
      content: savedMessage.content,
      imageUrl: savedMessage.imageUrl || null,
      timestamp: savedMessage.createdAt,
      isRead: savedMessage.isRead,
      deliveredAt: savedMessage.deliveredAt || null,
      readAt: savedMessage.readAt || null,
    };

    // ============================================
    // CREATE NOTIFICATION FOR RECEIVER
    // ============================================
    // Krijo njoftim për marrësin që ka marrë mesazh
    // VËREJTJE: Mos krijo njoftim nëse marrësi është tashmë në chat me dërguesin
    try {
      // Kontrollo nëse marrësi është në chat me dërguesin
      const isReceiverInChatWithSender = isUserInChatWith(receiverId, senderId);

      // Nëse marrësi është në chat me dërguesin, mos krijo njoftim
      if (isReceiverInChatWithSender) {
        // Përdoruesi është në chat, mos krijo njoftim
        return;
      }

      const senderName = savedMessage.senderId.displayName || savedMessage.senderId.name || 'Someone';
      const notification = new Notification({
        userId: receiverId,
        type: 'message',
        message: `${senderName} sent you a message`,
        isRead: false,
        relatedUserId: senderId,
      });
      await notification.save();
    } catch (notificationError) {
      console.error('Error creating notification:', notificationError);
      // Nuk ndalojmë procesin nëse njoftimi dështon
    }

    return res.status(201).json({
      message: 'Message sent successfully',
      data: formattedMessage,
    });
  } catch (error) {
    console.error('Send message error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Mark messages as read
// @route   PUT /api/messages/read/:friendId
// @access  Private
const markAsRead = async (req, res) => {
  try {
    const { friendId } = req.params;

    if (!friendId) {
      return res.status(400).json({ message: 'Friend ID is required' });
    }

    // Verify current user exists
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const currentUserId = req.user._id.toString();

    // Check if friend exists
    const friend = await User.findById(friendId);
    if (!friend) {
      return res.status(404).json({ message: 'Friend not found' });
    }

    // Check if they are friends
    const currentUser = await User.findById(currentUserId);
    if (!currentUser) {
      return res.status(404).json({ message: 'Current user not found' });
    }

    if (!currentUser.friends.includes(friendId)) {
      return res.status(403).json({ message: 'You can only mark messages from friends as read' });
    }

    const readAt = new Date();

    // Mark all unread messages from this friend as read and set readAt
    const result = await Message.updateMany(
      {
        senderId: friendId,
        receiverId: currentUserId,
        isRead: false,
      },
      {
        $set: { 
          isRead: true,
          readAt: readAt,
        },
      }
    );

    // Update lastSeenAt for the current user
    currentUser.lastSeenAt = readAt;
    await currentUser.save();

    return res.status(200).json({
      message: 'Messages marked as read successfully',
      count: result.modifiedCount,
    });
  } catch (error) {
    console.error('Mark as read error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Mark a specific message as read
// @route   PUT /api/messages/:messageId/read
// @access  Private
const markMessageAsRead = async (req, res) => {
  try {
    const { messageId } = req.params;

    if (!messageId) {
      return res.status(400).json({ message: 'Message ID is required' });
    }

    // Verify current user exists
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const currentUserId = req.user._id.toString();

    // Find the message
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Verify that current user is the receiver of the message
    if (message.receiverId.toString() !== currentUserId) {
      return res.status(403).json({ message: 'You can only mark your own received messages as read' });
    }

    // Check if message is already read
    if (message.isRead) {
      return res.status(200).json({
        message: 'Message is already marked as read',
        readAt: message.readAt,
      });
    }

    // Get current user to update lastSeenAt
    const currentUser = await User.findById(currentUserId);
    if (!currentUser) {
      return res.status(404).json({ message: 'Current user not found' });
    }

    const readAt = new Date();

    // Mark message as read and set readAt timestamp
    message.isRead = true;
    message.readAt = readAt;
    await message.save();

    // Update lastSeenAt for the current user
    currentUser.lastSeenAt = readAt;
    await currentUser.save();

    return res.status(200).json({
      message: 'Message marked as read successfully',
      readAt: readAt,
    });
  } catch (error) {
    console.error('Mark message as read error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Delete conversation with a friend
// @route   DELETE /api/messages/conversation/:friendId
// @access  Private
// 
// Ky endpoint fshin bisedën për përdoruesin aktual (vetëm për atë që e bën delete).
// Mesazhet nuk fshihen fizikisht nga databaza, por krijohet një rekord në DeletedConversation
// që tregon se mesazhet para deletedAt nuk duhet të shfaqen për këtë përdorues.
// 
// Procesi:
// 1. Verifikon autentifikimin dhe validitetin e përdoruesit
// 2. Kontrollon që përdoruesit janë miq
// 3. Nëse rekordi ekziston, update-on deletedAt me timestamp të ri
// 4. Nëse rekordi nuk ekziston, krijon rekord të ri në DeletedConversation
// 5. Pas kësaj, mesazhet e vjetra nuk do të shfaqen për këtë përdorues
const deleteConversation = async (req, res) => {
  try {
    const { friendId } = req.params;

    // Validim i parametrit
    if (!friendId) {
      return res.status(400).json({ message: 'Friend ID is required' });
    }

    // Verifikim autentifikimi
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const currentUserId = req.user._id.toString();
    const targetFriendId = friendId;

    // Validim: nuk mund të fshish bisedën me veten
    if (currentUserId === targetFriendId) {
      return res.status(400).json({ message: 'Cannot delete conversation with yourself' });
    }

    // Verifikim që përdoruesi i synuar ekziston
    const targetUser = await User.findById(targetFriendId);
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verifikim që përdoruesi aktual ekziston
    const currentUser = await User.findById(currentUserId);
    if (!currentUser) {
      return res.status(404).json({ message: 'Current user not found' });
    }

    // Verifikim miqësie - mund të fshish bisedën vetëm me miqtë
    if (!currentUser.friends.includes(targetFriendId)) {
      return res.status(403).json({ message: 'You can only delete conversations with your friends' });
    }

    // Kontrollo nëse biseda është tashmë e fshirë nga ky përdorues
    const existingDeletedConversation = await DeletedConversation.findOne({
      userId: currentUserId,
      otherUserId: targetFriendId,
    });

    const deletedAt = new Date();

    if (existingDeletedConversation) {
      // Nëse rekordi ekziston, update-on deletedAt me timestamp të ri
      // Kjo garanton që edhe mesazhet e reja (nëse ka pasur) do të fshihen
      existingDeletedConversation.deletedAt = deletedAt;
      await existingDeletedConversation.save();

      return res.status(200).json({
        message: 'Conversation deleted successfully',
        deletedAt: deletedAt,
      });
    }

    // Krijo rekord të ri në DeletedConversation
    // Kjo do të bëjë që mesazhet para deletedAt të mos shfaqen për këtë përdorues
    const deletedConversation = new DeletedConversation({
      userId: currentUserId,
      otherUserId: targetFriendId,
      deletedAt: deletedAt,
    });

    await deletedConversation.save();

    return res.status(200).json({
      message: 'Conversation deleted successfully',
      deletedAt: deletedAt,
    });
  } catch (error) {
    console.error('Delete conversation error:', error);
    
    // Error handling më specifik për validation errors
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        message: 'Validation error', 
        error: error.message 
      });
    }

    // Error handling për duplicate key (nëse ndodh ndonjë race condition)
    if (error.code === 11000) {
      // Rekordi u krijua nga një request tjetër, kthe success
      return res.status(200).json({
        message: 'Conversation deleted successfully',
      });
    }

    return res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Upload chat photo
// @route   POST /api/messages/upload-photo
// @access  Private
const uploadChatPhoto = async (req, res) => {
  try {
    // Verify current user exists
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Get the file path from multer
    const photoPath = `/uploads/chat-photos/${req.file.filename}`;
    const fullPhotoUrl = `${req.protocol}://${req.get('host')}${photoPath}`;

    return res.status(200).json({
      message: 'Photo uploaded successfully',
      imageUrl: fullPhotoUrl,
    });
  } catch (error) {
    console.error('Upload chat photo error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getMessages,
  sendMessage,
  markAsRead,
  markMessageAsRead,
  deleteConversation,
  uploadChatPhoto,
};

