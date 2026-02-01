const Message = require('../models/Message');
const User = require('../models/User');
const Notification = require('../models/Notification');
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

    // Get messages between the two users (in both directions)
    const messages = await Message.find({
      $or: [
        { senderId: currentUserId, receiverId: targetFriendId },
        { senderId: targetFriendId, receiverId: currentUserId },
      ],
    })
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

    // Get total count for pagination
    const totalMessages = await Message.countDocuments({
      $or: [
        { senderId: currentUserId, receiverId: targetFriendId },
        { senderId: targetFriendId, receiverId: currentUserId },
      ],
    });

    // Format messages for frontend
    const formattedMessages = messages
      .reverse() // Reverse për të pasur mesazhet në rend kronologjik (të vjetrat së pari)
      .map((message) => ({
        id: message._id.toString(),
        senderId: message.senderId._id.toString(),
        receiverId: message.receiverId._id.toString(),
        content: message.content,
        timestamp: message.createdAt,
        isRead: message.isRead,
        readAt: message.readAt || null,
        deliveredAt: message.deliveredAt || null,
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
    const { receiverId, content } = req.body;

    if (!receiverId || !content) {
      return res.status(400).json({ message: 'Receiver ID and content are required' });
    }

    if (!content.trim()) {
      return res.status(400).json({ message: 'Message content cannot be empty' });
    }

    // ============================================
    // SANITIZE MESSAGE CONTENT
    // ============================================
    // Sanitizo përmbajtjen e mesazhit për të shmangur XSS attacks
    const sanitizedContent = sanitizeMessage(content);
    
    if (!sanitizedContent || sanitizedContent.trim().length === 0) {
      return res.status(400).json({ message: 'Message content is invalid or contains only unsafe characters' });
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
    // Verifikimi që përdoruesi nuk është bllokuar
    if (sender.blockedUsers.includes(receiverId) || receiver.blockedUsers.includes(senderId)) {
      return res.status(403).json({ message: 'Cannot send message to this user' });
    }

    // Create and save message
    const message = new Message({
      senderId: senderId,
      receiverId: receiverId,
      content: sanitizedContent.trim(),
      isRead: false,
    });

    const savedMessage = await message.save();

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

    // Privacy check: Mark messages as read ONLY if lastSeenEnabled is true
    // Nëse lastSeenEnabled = false, mesazhet NUK shënohen si të lexuara (privacy)
    if (currentUser.lastSeenEnabled === false) {
      return res.status(200).json({
        message: 'Messages cannot be marked as read when last seen is disabled',
        count: 0,
      });
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

    // Update lastSeenAt for the current user (only if lastSeenEnabled is true)
    if (currentUser.lastSeenEnabled !== false) {
      currentUser.lastSeenAt = readAt;
      await currentUser.save();
    }

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

    // Get current user to check lastSeenEnabled
    const currentUser = await User.findById(currentUserId);
    if (!currentUser) {
      return res.status(404).json({ message: 'Current user not found' });
    }

    // Privacy check: Mark message as read ONLY if lastSeenEnabled is true
    // Nëse lastSeenEnabled = false, mesazhi NUK shënohet si i lexuar (privacy)
    if (currentUser.lastSeenEnabled === false) {
      return res.status(200).json({
        message: 'Message cannot be marked as read when last seen is disabled',
        readAt: null,
      });
    }

    const readAt = new Date();

    // Mark message as read and set readAt timestamp
    message.isRead = true;
    message.readAt = readAt;
    await message.save();

    // Update lastSeenAt for the current user (only if lastSeenEnabled is true)
    if (currentUser.lastSeenEnabled !== false) {
      currentUser.lastSeenAt = readAt;
      await currentUser.save();
    }

    return res.status(200).json({
      message: 'Message marked as read successfully',
      readAt: readAt,
    });
  } catch (error) {
    console.error('Mark message as read error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getMessages,
  sendMessage,
  markAsRead,
  markMessageAsRead,
};

