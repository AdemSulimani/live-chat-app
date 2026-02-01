const express = require('express');
const {
  getMessages,
  sendMessage,
  markAsRead,
  markMessageAsRead,
} = require('../controllers/messageController');
const { protect } = require('../middleware/authMiddleware');
const { messageLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

// All routes require authentication
router.use(protect);

// Send a message - me rate limiting për të shmangur spam
router.post('/', messageLimiter, sendMessage);

// Mark messages as read
router.put('/read/:friendId', markAsRead);

// Mark a specific message as read (must be before /:friendId route)
router.put('/:messageId/read', markMessageAsRead);

// Get messages between current user and a friend (must be last to avoid conflicts)
router.get('/:friendId', getMessages);

module.exports = router;

