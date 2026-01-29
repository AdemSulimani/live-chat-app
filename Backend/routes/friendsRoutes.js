const express = require('express');
const {
  getFriends,
  removeFriend,
} = require('../controllers/friendsController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// All routes require authentication
router.use(protect);

// Get user's friends list
router.get('/', getFriends);

// Remove a friend
router.post('/remove/:friendId', removeFriend);

module.exports = router;

