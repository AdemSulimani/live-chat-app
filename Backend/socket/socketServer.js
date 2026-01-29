const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Message = require('../models/Message');

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
  // RATE LIMITING FOR SOCKET MESSAGES
  // ============================================
  // Gjurmo mesazhet e dërguara për çdo përdorues për rate limiting
  const messageRateLimit = new Map(); // userId -> { count: number, resetTime: timestamp }
  
  // Funksion për të kontrolluar rate limit
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

    // Notify friends that user is online (optional - për status online/offline)
    // socket.broadcast.emit('user_online', { userId: socket.userId });

    // Handle send_message event
    socket.on('send_message', async (data) => {
      try {
        const { receiverId, content } = data;

        // Validation
        if (!receiverId || !content || !content.trim()) {
          socket.emit('message_error', { message: 'Receiver ID and content are required' });
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

        const sanitizedContent = sanitizeMessage(content);
        
        if (!sanitizedContent || sanitizedContent.trim().length === 0) {
          socket.emit('message_error', { message: 'Message content is invalid or contains only unsafe characters' });
          return;
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
        // Verifikimi që përdoruesi nuk është bllokuar
        if (sender.blockedUsers.includes(receiverId) || receiver.blockedUsers.includes(senderId)) {
          socket.emit('message_error', { message: 'Cannot send message to this user' });
          return;
        }

        // Create and save message to database
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

        // Format message for frontend
        const formattedMessage = {
          id: savedMessage._id.toString(),
          senderId: savedMessage.senderId._id.toString(),
          receiverId: savedMessage.receiverId._id.toString(),
          content: savedMessage.content,
          timestamp: savedMessage.createdAt,
          isRead: savedMessage.isRead,
        };

        // Send confirmation to sender
        socket.emit('message_sent', {
          message: 'Message sent successfully',
          data: formattedMessage,
        });

        // ============================================
        // REAL-TIME MESSAGE DELIVERY
        // ============================================
        // Kontrollo nëse marrësi është online duke kontrolluar activeUsers Map
        if (activeUsers.has(receiverId)) {
          // Marrësi është online - dërgo mesazhin real-time përmes Socket Room
          // io.to(`user:${receiverId}`) dërgon mesazhin vetëm te përdoruesi në atë room
          io.to(`user:${receiverId}`).emit('new_message', {
            message: formattedMessage,
          });
        }
        // Nëse marrësi është offline, mesazhi është tashmë i ruajtur në DB
        // dhe do të merret automatikisht kur përdoruesi të kthehet online dhe të bëjë fetch mesazheve

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

        // Mark message as read
        message.isRead = true;
        await message.save();

        // Notify sender that message was read
        if (activeUsers.has(message.senderId.toString())) {
          io.to(`user:${message.senderId.toString()}`).emit('message_read', {
            messageId: messageId,
            readBy: userId,
          });
        }

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

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.userId}`);
      
      // ============================================
      // CLEANUP ON DISCONNECT
      // ============================================
      // Hiq përdoruesin nga activeUsers Map (nuk është më online)
      activeUsers.delete(socket.userId);
      
      // Socket.IO automatikisht e heq përdoruesin nga të gjitha rooms kur shkëputet
      // Kështu që nuk kemi nevojë të bëjmë socket.leave() manualisht

      // Notify friends that user is offline (optional - për status online/offline)
      // socket.broadcast.emit('user_offline', { userId: socket.userId });
    });
  });

  return io;
};

// Store active users globally (accessed from initializeSocket scope)
let globalActiveUsers = null;

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

module.exports = {
  initializeSocket,
  getIO: () => io,
  emitToUser,
  emitToUsers,
  isUserOnline,
};

