const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Message = require('../models/Message');
const Notification = require('../models/Notification');
const BlockedUser = require('../models/BlockedUser');

let io;

// Initialize Socket.IO server
const initializeSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Authentication middleware for Socket.IO
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;

      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      if (!process.env.JWT_SECRET) {
        return next(new Error('Server configuration error'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId).select('-password');

      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }

      socket.userId = user._id.toString();
      socket.user = user;
      next();
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return next(new Error('Authentication error: Token expired'));
      } else if (error.name === 'JsonWebTokenError') {
        return next(new Error('Authentication error: Invalid token'));
      }
      return next(new Error('Authentication error'));
    }
  });

  // Store active users (online users) - për të gjurmuar përdoruesit online
  const activeUsers = new Map(); // userId -> socketId
  globalActiveUsers = activeUsers; // Store globally për të qasur nga helper functions

  // ============================================
  // HELPER: CALCULATE DISPLAYED STATUS (LOCAL)
  // ============================================
  // Llogarit statusin që duhet të shfaqet për përdoruesin bazuar në:
  // 1. Nëse është online (në activeUsers)
  // 2. Activity status preference (online, offline, do_not_disturb)
  const getDisplayedStatusLocal = async (userId) => {
    try {
      // Nëse përdoruesi nuk është online (nuk është në activeUsers)
      if (!activeUsers.has(userId)) {
        return 'offline';
      }

      // Nëse përdoruesi është online, merr activity status nga DB
      const user = await User.findById(userId).select('activityStatus');
      if (!user) {
        return 'offline';
      }

      // Përdor funksionin helper global për llogaritjen
      return getDisplayedStatus(user, userId);
    } catch (error) {
      console.error('Error calculating displayed status:', error);
      return 'offline';
    }
  };

  // ============================================
  // ACTIVE CHAT TRACKING
  // ============================================
  // Gjurmo se cili përdorues është në chat me kë
  // userId -> friendId (përdoruesi është në chat me këtë shok)
  const activeChats = new Map(); // userId -> friendId
  globalActiveChats = activeChats; // Store globally për të qasur nga helper functions

  // ============================================
  // TYPING STATUS TRACKING
  // ============================================
  // Gjurmo statusin e typing: userId -> Set<receiverIds>
  // Kjo tregon për kë po shkruan çdo përdorues
  const typingStatus = new Map(); // senderId -> Set<receiverId>
  globalTypingStatus = typingStatus; // Store globally për të qasur nga helper functions

  // ============================================
  // RATE LIMITING FOR SOCKET MESSAGES
  // ============================================
  // Gjurmo mesazhet e dërguara për çdo përdorues për rate limiting
  const messageRateLimit = new Map(); // userId -> { count: number, resetTime: timestamp }
  
  // Rate limiting për edit dhe delete
  const editRateLimit = new Map(); // userId -> { count: number, resetTime: timestamp }
  const deleteRateLimit = new Map(); // userId -> { count: number, resetTime: timestamp }
  
  // Funksion për të kontrolluar rate limit për mesazhe
  const checkRateLimit = (userId) => {
    const now = Date.now();
    const userLimit = messageRateLimit.get(userId);
    
    // Nëse nuk ka limit ose ka kaluar koha e reset
    if (!userLimit || now > userLimit.resetTime) {
      messageRateLimit.set(userId, {
        count: 1,
        resetTime: now + 60000, // Reset pas 1 minute (60 sekonda)
      });
      return true; // Lejo mesazhin
    }
    
    // Nëse ka kaluar limit (30 mesazhe në minutë)
    if (userLimit.count >= 30) {
      return false; // Bloko mesazhin
    }
    
    // Rrit counter
    userLimit.count++;
    return true; // Lejo mesazhin
  };

  // Funksion për të kontrolluar rate limit për edit
  const checkEditRateLimit = (userId) => {
    const now = Date.now();
    const userLimit = editRateLimit.get(userId);
    
    // Nëse nuk ka limit ose ka kaluar koha e reset
    if (!userLimit || now > userLimit.resetTime) {
      editRateLimit.set(userId, {
        count: 1,
        resetTime: now + 60000, // Reset pas 1 minute (60 sekonda)
      });
      return true; // Lejo editimin
    }
    
    // Nëse ka kaluar limit (20 editime në minutë)
    if (userLimit.count >= 20) {
      return false; // Bloko editimin
    }
    
    // Rrit counter
    userLimit.count++;
    return true; // Lejo editimin
  };

  // Funksion për të kontrolluar rate limit për delete
  const checkDeleteRateLimit = (userId) => {
    const now = Date.now();
    const userLimit = deleteRateLimit.get(userId);
    
    // Nëse nuk ka limit ose ka kaluar koha e reset
    if (!userLimit || now > userLimit.resetTime) {
      deleteRateLimit.set(userId, {
        count: 1,
        resetTime: now + 60000, // Reset pas 1 minute (60 sekonda)
      });
      return true; // Lejo fshirjen
    }
    
    // Nëse ka kaluar limit (15 fshirje në minutë)
    if (userLimit.count >= 15) {
      return false; // Bloko fshirjen
    }
    
    // Rrit counter
    userLimit.count++;
    return true; // Lejo fshirjen
  };

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.userId}`);

    // ============================================
    // SOCKET ROOMS MANAGEMENT
    // ============================================
    // Vendos përdoruesin në room personal për komunikim direkt
    // Format: "user:userId" - p.sh. "user:507f1f77bcf86cd799439011"
    // Kjo lejon dërgimin e mesazheve direkt te një përdorues specifik
    socket.join(`user:${socket.userId}`);

    // Gjurmon përdoruesin si online në activeUsers Map
    // Kjo përdoret për të kontrolluar nëse një përdorues është online para se të dërgohet mesazh real-time
    activeUsers.set(socket.userId, socket.id);

    // ============================================
    // SEND TYPING STATUS ON CONNECTION
    // ============================================
    // Kur përdoruesi lidhet, kontrollo nëse ka shokë që po shkruajnë për të
    // dhe dërgo typing indicators
    const checkAndSendTypingStatus = () => {
      typingStatus.forEach((receiverIds, senderId) => {
        // Nëse dikush po shkruan për përdoruesin që sapo u lidh
        if (receiverIds.has(socket.userId)) {
          // Dërgo typing indicator te përdoruesi që sapo u lidh
          socket.emit('user_typing', {
            userId: senderId,
            isTyping: true,
          });
        }
      });
    };

    // Dërgo typing status menjëherë pas lidhjes
    checkAndSendTypingStatus();

    // ============================================
    // NOTIFY FRIENDS WHEN USER CONNECTS
    // ============================================
    // Njofto miqtë që përdoruesi është online dhe dërgo statusin e shfaqur
    const notifyFriendsOnConnect = async () => {
      try {
        const user = await User.findById(socket.userId).select('friends activityStatus');
        if (!user || !user.friends || user.friends.length === 0) {
          return;
        }

        // Llogarit statusin e shfaqur
        const displayedStatus = await getDisplayedStatusLocal(socket.userId);

        // Dërgo njoftim te të gjithë miqtë që janë online
        user.friends.forEach(async (friendId) => {
          const friendIdStr = friendId.toString();
          // Nëse miku është online, dërgo njoftim
          if (activeUsers.has(friendIdStr)) {
            io.to(`user:${friendIdStr}`).emit('user_status_changed', {
              userId: socket.userId,
              displayedStatus: displayedStatus,
            });
          }
        });
      } catch (error) {
        console.error('Error notifying friends on connect:', error);
      }
    };

    // Njofto miqtë pas lidhjes
    notifyFriendsOnConnect();

    // Handle send_message event
    socket.on('send_message', async (data) => {
      try {
        const { receiverId, content, imageUrl, audioUrl } = data;

        // Validation
        if (!receiverId) {
          socket.emit('message_error', { message: 'Receiver ID is required' });
          return;
        }

        // Mesazhi duhet të ketë ose content, ose imageUrl, ose audioUrl (ose kombinime)
        if (!content && !imageUrl && !audioUrl) {
          socket.emit('message_error', { message: 'Message must have either content, imageUrl, or audioUrl' });
          return;
        }

        const senderId = socket.userId;

        // ============================================
        // RATE LIMITING CHECK
        // ============================================
        // Kontrollo rate limit për të shmangur spam
        if (!checkRateLimit(senderId)) {
          socket.emit('message_error', { 
            message: 'Too many messages sent. Please slow down and try again in a moment.' 
          });
          return;
        }

        // ============================================
        // VALIDATE IMAGE URL
        // ============================================
        // Nëse ka imageUrl, validoj që është valid URL
        if (imageUrl) {
          if (typeof imageUrl !== 'string' || imageUrl.trim().length === 0) {
            socket.emit('message_error', { message: 'Invalid imageUrl provided' });
            return;
          }
          
          // Validim bazik për URL format
          try {
            const url = new URL(imageUrl);
            // Kontrollo që URL është HTTP ose HTTPS
            if (!['http:', 'https:'].includes(url.protocol)) {
              socket.emit('message_error', { message: 'Image URL must use http or https protocol' });
              return;
            }
          } catch (urlError) {
            socket.emit('message_error', { message: 'Invalid imageUrl format' });
            return;
          }
        }

        // ============================================
        // VALIDATE AUDIO URL
        // ============================================
        // Nëse ka audioUrl, validoj që është valid URL
        if (audioUrl) {
          if (typeof audioUrl !== 'string' || audioUrl.trim().length === 0) {
            socket.emit('message_error', { message: 'Invalid audioUrl provided' });
            return;
          }
          
          // Validim bazik për URL format
          try {
            const url = new URL(audioUrl);
            // Kontrollo që URL është HTTP ose HTTPS
            if (!['http:', 'https:'].includes(url.protocol)) {
              socket.emit('message_error', { message: 'Audio URL must use http or https protocol' });
              return;
            }
          } catch (urlError) {
            socket.emit('message_error', { message: 'Invalid audioUrl format' });
            return;
          }
        }

        // ============================================
        // SANITIZE MESSAGE CONTENT
        // ============================================
        // Sanitizo përmbajtjen e mesazhit për të shmangur XSS attacks
        // Vetëm nëse ka content
        let sanitizedContent = '';
        if (content) {
          const sanitizeMessage = (content) => {
            if (!content || typeof content !== 'string') {
              return '';
            }
            let sanitized = content
              .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
              .replace(/<[^>]+>/g, '')
              .replace(/javascript:/gi, '')
              .replace(/on\w+\s*=/gi, '')
              .trim();
            if (sanitized.length > 5000) {
              sanitized = sanitized.substring(0, 5000);
            }
            return sanitized;
          };

          sanitizedContent = sanitizeMessage(content);
          
          // Nëse ka content por pas sanitizimit është bosh, kontrollo nëse ka imageUrl ose audioUrl
          if (!sanitizedContent || sanitizedContent.trim().length === 0) {
            // Nëse nuk ka imageUrl ose audioUrl, kjo është gabim
            if (!imageUrl && !audioUrl) {
              socket.emit('message_error', { message: 'Message content is invalid or contains only unsafe characters' });
              return;
            }
            // Nëse ka imageUrl ose audioUrl, lejo mesazh pa content
            sanitizedContent = '';
          } else {
            sanitizedContent = sanitizedContent.trim();
          }
        }

        // Check if trying to send to yourself
        if (senderId === receiverId) {
          socket.emit('message_error', { message: 'Cannot send message to yourself' });
          return;
        }

        // Check if receiver exists
        const receiver = await User.findById(receiverId);
        if (!receiver) {
          socket.emit('message_error', { message: 'Receiver not found' });
          return;
        }

        // Check if sender exists
        const sender = await User.findById(senderId);
        if (!sender) {
          socket.emit('message_error', { message: 'Sender not found' });
          return;
        }

        // ============================================
        // VERIFY FRIENDSHIP
        // ============================================
        // Verifikimi që dërguesi dhe marrësi janë miq
        if (!sender.friends.includes(receiverId)) {
          socket.emit('message_error', { message: 'You can only message your friends' });
          return;
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
          socket.emit('message_error', { 
            message: 'User either has deleted his account or has blocked you',
            isBlocked: true // Flag për të identifikuar këtë lloj gabimi në frontend
          });
          return;
        }

        // NUK kontrollojmë nëse dërguesi ka bllokuar marrësin
        // Kjo lejon që bllokuesi të dërgojë mesazhe nëse dëshiron
        // (biseda është e fshirë për bllokuesin, por ai mund të dërgojë mesazhe të reja)

        // Create and save message to database
        const message = new Message({
          senderId: senderId,
          receiverId: receiverId,
          content: sanitizedContent || '', // Mund të jetë bosh nëse ka vetëm foto ose audio
          imageUrl: imageUrl || null,
          audioUrl: audioUrl || null,
          isRead: false,
        });

        const savedMessage = await message.save();

        // Populate sender and receiver info
        await savedMessage.populate('senderId', 'name displayName username profilePhoto');
        await savedMessage.populate('receiverId', 'name displayName username profilePhoto');

        // ============================================
        // SET DELIVERED STATUS
        // ============================================
        // Mesazhi konsiderohet "delivered" sapo të ruhet në databazë
        // Pavarësisht nëse marrësi është online apo jo
        const deliveredAt = new Date();
        savedMessage.deliveredAt = deliveredAt;
        await savedMessage.save();

        // Format message for frontend
        const formattedMessage = {
          id: savedMessage._id.toString(),
          senderId: savedMessage.senderId._id.toString(),
          receiverId: savedMessage.receiverId._id.toString(),
          content: savedMessage.content,
          imageUrl: savedMessage.imageUrl || null,
          audioUrl: savedMessage.audioUrl || null,
          timestamp: savedMessage.createdAt,
          isRead: savedMessage.isRead,
          deliveredAt: deliveredAt,
        };

        // Send confirmation to sender
        socket.emit('message_sent', {
          message: 'Message sent successfully',
          data: formattedMessage,
        });

        // ============================================
        // CREATE NOTIFICATION FOR RECEIVER
        // ============================================
        // Krijo njoftim për marrësin që ka marrë mesazh
        // VËREJTJE: Mos krijo njoftim nëse marrësi është tashmë në chat me dërguesin
        try {
          // Kontrollo nëse marrësi është në chat me dërguesin
          const receiverActiveChat = activeChats.get(receiverId);
          const isReceiverInChatWithSender = receiverActiveChat === senderId;

          // Nëse marrësi NUK është në chat me dërguesin, krijo njoftim
          if (!isReceiverInChatWithSender) {
            const senderName = savedMessage.senderId.displayName || savedMessage.senderId.name || 'Someone';
            const notification = new Notification({
              userId: receiverId,
              type: 'message',
              message: `${senderName} sent you a message`,
              isRead: false,
              relatedUserId: senderId,
            });
            await notification.save();

            // Dërgo njoftim real-time nëse marrësi është online
            if (activeUsers.has(receiverId)) {
              io.to(`user:${receiverId}`).emit('new_notification', {
                id: notification._id.toString(),
                type: notification.type,
                message: notification.message,
                timestamp: notification.createdAt,
                isRead: notification.isRead,
                relatedUserId: senderId,
              });
            }
          }
        } catch (notificationError) {
          console.error('Error creating notification:', notificationError);
          // Nuk ndalojmë procesin nëse njoftimi dështon
        }

        // ============================================
        // CLEAR TYPING STATUS WHEN MESSAGE IS SENT
        // ============================================
        // Hiq typing status kur mesazhi dërgohet
        if (typingStatus.has(senderId)) {
          typingStatus.get(senderId).delete(receiverId);
          // Nëse nuk ka më receiverIds, hiq entry-në
          if (typingStatus.get(senderId).size === 0) {
            typingStatus.delete(senderId);
          }
        }

        // ============================================
        // REAL-TIME MESSAGE DELIVERY
        // ============================================
        // Dërgo message_delivered event te dërguesi (deliveredAt është tashmë i vendosur)
        if (activeUsers.has(senderId)) {
          io.to(`user:${senderId}`).emit('message_delivered', {
            messageId: savedMessage._id.toString(),
            deliveredAt: deliveredAt,
          });
        }

        // Kontrollo nëse marrësi është online për të dërguar mesazhin real-time
        if (activeUsers.has(receiverId)) {
          // Marrësi është online - dërgo mesazhin real-time
          io.to(`user:${receiverId}`).emit('new_message', {
            message: formattedMessage,
          });
        }
        // Nëse marrësi është offline, mesazhi është tashmë i ruajtur në DB me deliveredAt
        // Marrësi do ta marrë mesazhin kur të bëjë fetch mesazheve (në getMessages)

      } catch (error) {
        console.error('Send message via socket error:', error);
        socket.emit('message_error', { message: 'Server error while sending message' });
      }
    });

    // Handle message_received event (confirmation that message was received)
    socket.on('message_received', async (data) => {
      try {
        const { messageId } = data;

        if (!messageId) {
          return;
        }

        const userId = socket.userId;

        // Verify that this user is the receiver of the message
        const message = await Message.findById(messageId);
        if (!message) {
          return;
        }

        if (message.receiverId.toString() !== userId) {
          return; // Not authorized
        }

        // Get receiver user to update lastSeenAt - include lastSeenEnabled
        const receiver = await User.findById(userId).select('lastSeenEnabled');
        if (!receiver) {
          return;
        }

        const readAt = new Date();

        // Mark message as read and set readAt timestamp
        message.isRead = true;
        message.readAt = readAt;
        await message.save();

        // Update lastSeenAt for the receiver
        receiver.lastSeenAt = readAt;
        await receiver.save();
        
        // ============================================
        // PRIVACY CHECK: Last Seen Updated Event
        // ============================================
        // Dërgo last_seen_updated event te miqtë që janë online
        // Por vetëm nëse:
        // 1. Receiver ka lastSeenEnabled = true
        // 2. Friend ka lastSeenEnabled = true (reciprocitet)
        // Nëse njëri e ka disable, mos dërgo event-in
        const receiverLastSeenEnabled = receiver.lastSeenEnabled !== false; // Default: true
        
        if (receiverLastSeenEnabled) {
          const userWithFriends = await User.findById(receiver._id).select('friends');
          
          if (userWithFriends && userWithFriends.friends) {
            // Get all friends with their lastSeenEnabled setting
            const friendsData = await User.find({
              _id: { $in: userWithFriends.friends }
            }).select('_id lastSeenEnabled');
            
            // Create a map for quick lookup
            const friendsLastSeenMap = new Map();
            friendsData.forEach(friend => {
              friendsLastSeenMap.set(friend._id.toString(), friend.lastSeenEnabled !== false);
            });
            
            userWithFriends.friends.forEach((friendId) => {
              const friendIdStr = friendId.toString();
              const friendLastSeenEnabled = friendsLastSeenMap.get(friendIdStr) !== false; // Default: true
              
              // Dërgo vetëm nëse:
              // 1. Friend-i është online
              // 2. Receiver ka lastSeenEnabled = true (tashmë kontrolluar)
              // 3. Friend ka lastSeenEnabled = true (reciprocitet)
              if (activeUsers.has(friendIdStr) && friendLastSeenEnabled) {
                io.to(`user:${friendIdStr}`).emit('last_seen_updated', {
                  userId: userId,
                  lastSeenAt: receiver.lastSeenAt,
                });
              }
            });
          }
        }

        // ============================================
        // PRIVACY CHECK: Message Seen Event (Read Receipts)
        // ============================================
        // Notify sender that message was read (seen)
        // IMPORTANT: Delivered status dërgohet gjithmonë (nuk ka privacy check)
        // Por "seen" status dërgohet vetëm nëse:
        // 1. Receiver (që lexoi mesazhin) ka lastSeenEnabled = true
        // 2. Sender (që do ta marrë event-in) ka lastSeenEnabled = true (reciprocitet)
        // Nëse njëri e ka disable, mos dërgo message_seen event-in
        // Në këtë rast, sender do të shohë vetëm "delivered", jo "seen"
        if (receiverLastSeenEnabled && activeUsers.has(message.senderId.toString())) {
          // Get sender's lastSeenEnabled setting
          const sender = await User.findById(message.senderId).select('lastSeenEnabled');
          if (sender) {
            const senderLastSeenEnabled = sender.lastSeenEnabled !== false; // Default: true
            
            // Dërgo message_seen vetëm nëse të dy kanë lastSeenEnabled = true
            // Nëse njëri e ka disable, nuk dërgohet event-i
            // Sender do të shohë vetëm "delivered" status, jo "seen"
            if (senderLastSeenEnabled) {
              io.to(`user:${message.senderId.toString()}`).emit('message_seen', {
                messageId: messageId,
                readBy: userId,
                readAt: readAt,
                lastSeenAt: receiver.lastSeenAt,
              });
            }
            // Nëse senderLastSeenEnabled = false, nuk dërgohet message_seen
            // Por delivered status është tashmë dërguar (në send_message handler)
          }
        }
        // Nëse receiverLastSeenEnabled = false, nuk dërgohet message_seen
        // Por delivered status është tashmë dërguar (në send_message handler)

      } catch (error) {
        console.error('Message received confirmation error:', error);
      }
    });

    // Handle typing_start event
    socket.on('typing_start', async (data) => {
      try {
        const { receiverId } = data;

        if (!receiverId) {
          return;
        }

        const senderId = socket.userId;

        // Check if they are friends
        const sender = await User.findById(senderId);
        if (!sender || !sender.friends.includes(receiverId)) {
          return;
        }

        // ============================================
        // UPDATE TYPING STATUS
        // ============================================
        // Ruaj statusin e typing në Map
        if (!typingStatus.has(senderId)) {
          typingStatus.set(senderId, new Set());
        }
        typingStatus.get(senderId).add(receiverId);

        // Dërgo tregues typing te marrësi nëse është online (përmes Socket Room)
        if (activeUsers.has(receiverId)) {
          io.to(`user:${receiverId}`).emit('user_typing', {
            userId: senderId,
            isTyping: true,
          });
        }

      } catch (error) {
        console.error('Typing start error:', error);
      }
    });

    // Handle request_typing_status event
    // Kur përdoruesi hyn në chat, kërkon typing status për një shok specifik
    socket.on('request_typing_status', async (data) => {
      try {
        const { friendId } = data;

        if (!friendId) {
          return;
        }

        const userId = socket.userId;

        // Check if they are friends
        const user = await User.findById(userId);
        if (!user || !user.friends.includes(friendId)) {
          return;
        }

        // Kontrollo nëse shoku po shkruan për përdoruesin aktual
        if (typingStatus.has(friendId) && typingStatus.get(friendId).has(userId)) {
          // Dërgo typing indicator
          socket.emit('user_typing', {
            userId: friendId,
            isTyping: true,
          });
        }

      } catch (error) {
        console.error('Request typing status error:', error);
      }
    });

    // ============================================
    // HANDLE ENTER CHAT
    // ============================================
    // Kur përdoruesi hyn në chat me një shok, gjurmo se ai është në chat me atë shok
    socket.on('enter_chat', async (data) => {
      try {
        const { friendId } = data;

        if (!friendId) {
          return;
        }

        const userId = socket.userId;

        // Check if they are friends
        const user = await User.findById(userId);
        if (!user || !user.friends.includes(friendId)) {
          return;
        }

        // Gjurmo se përdoruesi është në chat me këtë shok
        activeChats.set(userId, friendId);
      } catch (error) {
        console.error('Enter chat error:', error);
      }
    });

    // ============================================
    // HANDLE LEAVE CHAT
    // ============================================
    // Kur përdoruesi del nga chat, hiq tracking
    socket.on('leave_chat', async (data) => {
      try {
        const userId = socket.userId;
        // Hiq tracking për përdoruesin
        activeChats.delete(userId);
      } catch (error) {
        console.error('Leave chat error:', error);
      }
    });

    // Handle typing_stop event
    socket.on('typing_stop', async (data) => {
      try {
        const { receiverId } = data;

        if (!receiverId) {
          return;
        }

        const senderId = socket.userId;

        // Check if they are friends
        const sender = await User.findById(senderId);
        if (!sender || !sender.friends.includes(receiverId)) {
          return;
        }

        // ============================================
        // UPDATE TYPING STATUS
        // ============================================
        // Hiq statusin e typing nga Map
        if (typingStatus.has(senderId)) {
          typingStatus.get(senderId).delete(receiverId);
          // Nëse nuk ka më receiverIds, hiq entry-në
          if (typingStatus.get(senderId).size === 0) {
            typingStatus.delete(senderId);
          }
        }

        // Dërgo tregues typing stop te marrësi nëse është online (përmes Socket Room)
        if (activeUsers.has(receiverId)) {
          io.to(`user:${receiverId}`).emit('user_typing', {
            userId: senderId,
            isTyping: false,
          });
        }

      } catch (error) {
        console.error('Typing stop error:', error);
      }
    });

    // ============================================
    // HANDLE EDIT MESSAGE
    // ============================================
    socket.on('edit_message', async (data) => {
      try {
        const { messageId, newContent } = data;

        // Validation
        if (!messageId || !newContent || !newContent.trim()) {
          socket.emit('message_edit_error', { 
            message: 'Message ID and new content are required' 
          });
          return;
        }

        const userId = socket.userId;

        // ============================================
        // RATE LIMITING CHECK
        // ============================================
        // Kontrollo rate limit për editime
        if (!checkEditRateLimit(userId)) {
          socket.emit('message_edit_error', { 
            message: 'Too many edit requests. Please slow down and try again in a moment.' 
          });
          return;
        }

        // ============================================
        // FIND MESSAGE
        // ============================================
        const message = await Message.findById(messageId);
        if (!message) {
          socket.emit('message_edit_error', { 
            message: 'Message not found' 
          });
          return;
        }

        // ============================================
        // VERIFY AUTHORSHIP
        // ============================================
        // Verifikon që dërguesi është autori i mesazhit
        if (message.senderId.toString() !== userId) {
          socket.emit('message_edit_error', { 
            message: 'You can only edit your own messages' 
          });
          return;
        }

        // ============================================
        // VERIFY MESSAGE NOT DELETED
        // ============================================
        // Verifikon që mesazhi nuk është tashmë i fshirë
        if (message.isDeleted) {
          socket.emit('message_edit_error', { 
            message: 'Cannot edit a deleted message' 
          });
          return;
        }

        // ============================================
        // VALIDATE CONTENT LENGTH
        // ============================================
        // Validon gjatësinë e përmbajtjes
        const trimmedContent = newContent.trim();
        if (trimmedContent.length === 0) {
          socket.emit('message_edit_error', { 
            message: 'Message content cannot be empty' 
          });
          return;
        }

        if (trimmedContent.length > 5000) {
          socket.emit('message_edit_error', { 
            message: 'Message is too long. Maximum 5000 characters allowed.' 
          });
          return;
        }

        // ============================================
        // SANITIZE MESSAGE CONTENT
        // ============================================
        // Sanitizo përmbajtjen e mesazhit për të shmangur XSS attacks
        const sanitizeMessage = (content) => {
          if (!content || typeof content !== 'string') {
            return '';
          }
          let sanitized = content
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/<[^>]+>/g, '')
            .replace(/javascript:/gi, '')
            .replace(/on\w+\s*=/gi, '')
            .trim();
          if (sanitized.length > 5000) {
            sanitized = sanitized.substring(0, 5000);
          }
          return sanitized;
        };

        const sanitizedContent = sanitizeMessage(newContent);
        
        if (!sanitizedContent || sanitizedContent.trim().length === 0) {
          socket.emit('message_edit_error', { 
            message: 'Message content is invalid or contains only unsafe characters' 
          });
          return;
        }

        // ============================================
        // UPDATE MESSAGE IN DATABASE
        // ============================================
        // Përditëson mesazhin në DB (content, isEdited: true, editedAt)
        message.content = sanitizedContent.trim();
        message.isEdited = true;
        message.editedAt = new Date();
        await message.save();

        // Populate sender and receiver info
        await message.populate('senderId', 'name displayName username profilePhoto');
        await message.populate('receiverId', 'name displayName username profilePhoto');

        // Format message for frontend
        const formattedMessage = {
          id: message._id.toString(),
          senderId: message.senderId._id.toString(),
          receiverId: message.receiverId._id.toString(),
          content: message.content,
          timestamp: message.createdAt,
          isRead: message.isRead,
          readAt: message.readAt || null,
          deliveredAt: message.deliveredAt || null,
          isEdited: message.isEdited,
          editedAt: message.editedAt || null,
        };

        // ============================================
        // EMIT TO ALL PARTICIPANTS (REAL-TIME SYNC)
        // ============================================
        // Emeton message_edited te të gjithë pjesëmarrësit (sender dhe receiver)
        // Kjo garanton që të gjithë pjesëmarrësit shohin ndryshimin menjëherë
        const receiverId = message.receiverId._id.toString();
        const senderId = message.senderId._id.toString();
        
        // Dërgo te dërguesi (sender) - ai që bëri editimin
        socket.emit('message_edited', {
          message: 'Message edited successfully',
          data: formattedMessage,
        });

        // Dërgo te marrësi (receiver) nëse është online
        // Kjo garanton që receiver-i shikon ndryshimin menjëherë nëse është online
        if (activeUsers.has(receiverId)) {
          io.to(`user:${receiverId}`).emit('message_edited', {
            message: 'Message was edited',
            data: formattedMessage,
          });
        }
        
        // Nëse receiver-i nuk është online, mesazhi është tashmë i përditësuar në DB
        // dhe do të merret automatikisht kur receiver-i të kthehet online dhe të bëjë fetch mesazheve

      } catch (error) {
        console.error('Edit message via socket error:', error);
        socket.emit('message_edit_error', { 
          message: 'Server error while editing message' 
        });
      }
    });

    // ============================================
    // HANDLE DELETE MESSAGE
    // ============================================
    socket.on('delete_message', async (data) => {
      try {
        const { messageId } = data;

        // Validation
        if (!messageId) {
          socket.emit('message_delete_error', { 
            message: 'Message ID is required' 
          });
          return;
        }

        const userId = socket.userId;

        // ============================================
        // RATE LIMITING CHECK
        // ============================================
        // Kontrollo rate limit për fshirje
        if (!checkDeleteRateLimit(userId)) {
          socket.emit('message_delete_error', { 
            message: 'Too many delete requests. Please slow down and try again in a moment.' 
          });
          return;
        }

        // ============================================
        // FIND MESSAGE
        // ============================================
        const message = await Message.findById(messageId);
        if (!message) {
          socket.emit('message_delete_error', { 
            message: 'Message not found' 
          });
          return;
        }

        // ============================================
        // VERIFY AUTHORSHIP
        // ============================================
        // Verifikon që dërguesi është autori i mesazhit
        if (message.senderId.toString() !== userId) {
          socket.emit('message_delete_error', { 
            message: 'You can only delete your own messages' 
          });
          return;
        }

        // ============================================
        // VERIFY MESSAGE NOT ALREADY DELETED
        // ============================================
        // Verifikon që mesazhi nuk është tashmë i fshirë
        if (message.isDeleted) {
          socket.emit('message_delete_error', { 
            message: 'Message is already deleted' 
          });
          return;
        }

        // ============================================
        // UPDATE MESSAGE IN DATABASE
        // ============================================
        // Vendos isDeleted: true dhe deletedAt në DB
        message.isDeleted = true;
        message.deletedAt = new Date();
        // Opsionale: mund të ruajmë përmbajtjen origjinale ose ta zëvendësojmë
        message.content = 'This message was deleted';
        await message.save();

        // Populate sender and receiver info
        await message.populate('senderId', 'name displayName username profilePhoto');
        await message.populate('receiverId', 'name displayName username profilePhoto');

        // Format message for frontend
        const formattedMessage = {
          id: message._id.toString(),
          senderId: message.senderId._id.toString(),
          receiverId: message.receiverId._id.toString(),
          content: message.content,
          timestamp: message.createdAt,
          isRead: message.isRead,
          isDeleted: message.isDeleted,
          deletedAt: message.deletedAt,
        };

        // ============================================
        // EMIT TO ALL PARTICIPANTS (REAL-TIME SYNC)
        // ============================================
        // Emeton message_deleted te të gjithë pjesëmarrësit (sender dhe receiver)
        // Kjo garanton që të gjithë pjesëmarrësit shohin fshirjen menjëherë
        const receiverId = message.receiverId._id.toString();
        const senderId = message.senderId._id.toString();
        
        // Dërgo te dërguesi (sender) - ai që bëri fshirjen
        socket.emit('message_deleted', {
          message: 'Message deleted successfully',
          data: formattedMessage,
        });

        // Dërgo te marrësi (receiver) nëse është online
        // Kjo garanton që receiver-i shikon fshirjen menjëherë nëse është online
        if (activeUsers.has(receiverId)) {
          io.to(`user:${receiverId}`).emit('message_deleted', {
            message: 'Message was deleted',
            data: formattedMessage,
          });
        }
        
        // Nëse receiver-i nuk është online, mesazhi është tashmë i përditësuar në DB
        // dhe do të merret automatikisht kur receiver-i të kthehet online dhe të bëjë fetch mesazheve

      } catch (error) {
        console.error('Delete message via socket error:', error);
        socket.emit('message_delete_error', { 
          message: 'Server error while deleting message' 
        });
      }
    });


    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.userId}`);
      
      // ============================================
      // CLEANUP ON DISCONNECT
      // ============================================
      // Hiq përdoruesin nga activeUsers Map (nuk është më online)
      activeUsers.delete(socket.userId);
      
      // Hiq tracking për chat aktiv
      activeChats.delete(socket.userId);
      
      // Hiq typing status për përdoruesin që u shkëput
      // Dërgo typing_stop te të gjithë receiverIds për të cilët po shkruante
      if (typingStatus.has(socket.userId)) {
        const receiverIds = typingStatus.get(socket.userId);
        receiverIds.forEach(receiverId => {
          if (activeUsers.has(receiverId)) {
            io.to(`user:${receiverId}`).emit('user_typing', {
              userId: socket.userId,
              isTyping: false,
            });
          }
        });
        typingStatus.delete(socket.userId);
      }
      
      // Socket.IO automatikisht e heq përdoruesin nga të gjitha rooms kur shkëputet
      // Kështu që nuk kemi nevojë të bëjmë socket.leave() manualisht

      // ============================================
      // NOTIFY FRIENDS WHEN USER DISCONNECTS
      // ============================================
      // Njofto miqtë që përdoruesi është offline
      const notifyFriendsOnDisconnect = async () => {
        try {
          const user = await User.findById(socket.userId).select('friends');
          if (!user || !user.friends || user.friends.length === 0) {
            return;
          }

          // Kur përdoruesi shkëputet, gjithmonë shfaqet si offline
          user.friends.forEach(async (friendId) => {
            const friendIdStr = friendId.toString();
            // Nëse miku është online, dërgo njoftim
            if (activeUsers.has(friendIdStr)) {
              io.to(`user:${friendIdStr}`).emit('user_status_changed', {
                userId: socket.userId,
                displayedStatus: 'offline',
              });
            }
          });
        } catch (error) {
          console.error('Error notifying friends on disconnect:', error);
        }
      };

      // Njofto miqtë pas shkëputjes
      notifyFriendsOnDisconnect();
    });
  });

  return io;
};

// Store active users globally (accessed from initializeSocket scope)
let globalActiveUsers = null;
let globalActiveChats = null;
let globalTypingStatus = null;

// Emit event to specific user
const emitToUser = (userId, event, data) => {
  if (io) {
    io.to(`user:${userId}`).emit(event, data);
  }
};

// Emit event to multiple users
const emitToUsers = (userIds, event, data) => {
  if (io) {
    userIds.forEach((userId) => {
      io.to(`user:${userId}`).emit(event, data);
    });
  }
};

// Check if user is online
const isUserOnline = (userId) => {
  if (!globalActiveUsers) {
    return false;
  }
  return globalActiveUsers.has(userId);
};

// Disconnect user socket and remove from activeUsers
const disconnectUser = (userId) => {
  if (!io || !globalActiveUsers) {
    return false;
  }

  const userIdStr = userId.toString();
  
  // Kontrollo nëse user-i është online
  if (!globalActiveUsers.has(userIdStr)) {
    return false; // User nuk është online
  }

  // Merr socketId nga activeUsers
  const socketId = globalActiveUsers.get(userIdStr);
  
  // Gjej socket-in
  const socket = io.sockets.sockets.get(socketId);
  
  if (socket) {
    // Njofto receiverIds që user-i nuk po shkruan më (nëse ka typing status)
    if (globalTypingStatus && globalTypingStatus.has(userIdStr)) {
      const receiverIds = globalTypingStatus.get(userIdStr);
      receiverIds.forEach(receiverId => {
        if (globalActiveUsers && globalActiveUsers.has(receiverId)) {
          io.to(`user:${receiverId}`).emit('user_typing', {
            userId: userIdStr,
            isTyping: false,
          });
        }
      });
      // Hiq typing status
      globalTypingStatus.delete(userIdStr);
    }

    // Shkëput socket-in
    socket.disconnect(true); // true = close connection immediately
  }

  // Hiq nga activeUsers
  globalActiveUsers.delete(userIdStr);

  // Hiq nga activeChats nëse ekziston
  if (globalActiveChats && globalActiveChats.has(userIdStr)) {
    globalActiveChats.delete(userIdStr);
  }

  return true;
};

// Check if user is in chat with a specific friend
const isUserInChatWith = (userId, friendId) => {
  if (!globalActiveChats) {
    return false;
  }
  return globalActiveChats.get(userId) === friendId;
};

// ============================================
// HELPER: GET DISPLAYED STATUS (CORE LOGIC)
// ============================================
// Funksion helper që llogarit statusin e shfaqur bazuar në:
// - Nëse përdoruesi është online (në activeUsers)
// - Activity status preference (online, offline, do_not_disturb)
// 
// @param {Object} user - Objekti user me activityStatus
// @param {String} userId - ID e përdoruesit për kontrollimin e online status
// @returns {String} 'online' | 'offline' | 'do_not_disturb'
const getDisplayedStatus = (user, userId) => {
  // Nëse nuk është online (nuk është në activeUsers)
  if (!isUserOnline(userId)) {
    return 'offline';
  }

  // Nëse është online, kontrollo activityStatus
  if (user.activityStatus === 'offline') {
    return 'offline'; // Edhe nëse është online, shfaq offline
  }

  if (user.activityStatus === 'do_not_disturb') {
    return 'do_not_disturb'; // Shfaq do not disturb
  }

  // activityStatus === 'online'
  return 'online'; // Shfaq online
};

// Helper function to get displayed status (exported for use in controllers)
// Version 1: Mer userId dhe bën query në DB
const getDisplayedStatusForUser = async (userId) => {
  if (!globalActiveUsers) {
    return 'offline';
  }
  try {
    // Nëse përdoruesi nuk është online
    if (!globalActiveUsers.has(userId)) {
      return 'offline';
    }

    // Nëse përdoruesi është online, merr activity status nga DB
    const user = await User.findById(userId).select('activityStatus');
    if (!user) {
      return 'offline';
    }

    // Përdor funksionin helper për llogaritjen
    return getDisplayedStatus(user, userId);
  } catch (error) {
    console.error('Error calculating displayed status:', error);
    return 'offline';
  }
};

module.exports = {
  initializeSocket,
  getIO: () => io,
  emitToUser,
  emitToUsers,
  isUserOnline,
  isUserInChatWith,
  getDisplayedStatus, // Core helper function - merr user object dhe userId
  getDisplayedStatusForUser, // Convenience function - merr userId dhe bën query në DB
  disconnectUser, // Disconnect user socket and remove from activeUsers
};

