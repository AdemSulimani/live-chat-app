const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

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

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.userId}`);

    // Join user's personal room for direct notifications
    socket.join(`user:${socket.userId}`);

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.userId}`);
    });
  });

  return io;
};

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

module.exports = {
  initializeSocket,
  getIO: () => io,
  emitToUser,
  emitToUsers,
};

