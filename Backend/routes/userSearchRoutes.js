const express = require('express');
const {
  searchUsers,
  findUser,
  updateLastSeenEnabled,
  getUserLastSeen,
} = require('../controllers/userSearchController');
const { blockUser, unblockUser, getBlockedUsers } = require('../controllers/blockedController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// All routes require authentication
router.use(protect);

// Search users by username or email
router.get('/search', searchUsers);

// Find user by username or email (exact match)
router.get('/find', findUser);

// Update last seen enabled setting
router.put('/settings/last-seen', updateLastSeenEnabled);

// Get blocked users list (must be before /:userId routes to avoid conflicts)
router.get('/blocked', getBlockedUsers);

// Block a user (must be before /:userId routes to avoid conflicts)
router.post('/:userId/block', blockUser);

// Unblock a user (must be before /:userId routes to avoid conflicts)
router.post('/:userId/unblock', unblockUser);
router.delete('/:userId/block', unblockUser); // Keep for backward compatibility

// Get last seen for a user (respecting privacy)
router.get('/:userId/last-seen', getUserLastSeen);

module.exports = router;

