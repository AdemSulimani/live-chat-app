const express = require('express');
const {
  getFriends,
  removeFriend,
  getFriendStatus,
  updateLastSeenEnabled,
} = require('../controllers/friendsController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// All routes require authentication
router.use(protect);

// Get user's friends list
router.get('/', getFriends);

// Get displayed status for a specific friend
router.get('/:friendId/status', getFriendStatus);

// Remove a friend
router.post('/remove/:friendId', removeFriend);

// Update last seen enabled setting
router.put('/last-seen', updateLastSeenEnabled);

module.exports = router;

