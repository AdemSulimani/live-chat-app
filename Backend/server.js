const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const connectDB = require('./config/db');

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files (profile photos)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
const authRoutes = require('./routes/authRoutes');
const profileRoutes = require('./routes/profileRoutes');
const friendsRoutes = require('./routes/friendsRoutes');
const friendRequestRoutes = require('./routes/friendRequestRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const blockedRoutes = require('./routes/blockedRoutes');
const userSearchRoutes = require('./routes/userSearchRoutes');
const messageRoutes = require('./routes/messageRoutes');
const activityRoutes = require('./routes/activityRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/friends', friendsRoutes);
app.use('/api/friend-requests', friendRequestRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/blocked', blockedRoutes);
app.use('/api/users', userSearchRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/activity', activityRoutes);

// Basic route for testing
app.get('/', (req, res) => {
  res.send('API is running');
});

// Error handling middleware
const { notFound, errorHandler } = require('./middleware/errorMiddleware');
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// Start server function - ensures database is connected before server starts
const startServer = async () => {
  try {
    // Connect to database first
    await connectDB();
    
    // Start server only after database connection is established
    const server = app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });

    // Initialize Socket.IO after server is started
    const { initializeSocket } = require('./socket/socketServer');
    initializeSocket(server);
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
};

// Start the server
startServer();


 