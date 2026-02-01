const express = require('express');
const {
  getFriends,
  removeFriend,
  getFriendStatus,
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

module.exports = router;

