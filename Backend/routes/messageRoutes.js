const express = require('express');
const {
  getMessages,
  sendMessage,
  markAsRead,
} = require('../controllers/messageController');
const { protect } = require('../middleware/authMiddleware');
const { messageLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

// All routes require authentication
router.use(protect);

// Get messages between current user and a friend
router.get('/:friendId', getMessages);

// Send a message - me rate limiting për të shmangur spam
router.post('/', messageLimiter, sendMessage);

// Mark messages as read
router.put('/read/:friendId', markAsRead);

module.exports = router;

