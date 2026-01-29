const express = require('express');
const {
  getFriendRequests,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
} = require('../controllers/friendRequestController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// All routes require authentication
router.use(protect);

// Get friend requests (sent and received)
router.get('/', getFriendRequests);

// Send friend request
router.post('/send', sendFriendRequest);

// Accept friend request
router.post('/accept/:requestId', acceptFriendRequest);

// Reject friend request
router.post('/reject/:requestId', rejectFriendRequest);

module.exports = router;

