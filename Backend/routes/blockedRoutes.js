const express = require('express');
const {
  getBlockedUsers,
  blockUser,
  unblockUser,
} = require('../controllers/blockedController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// All routes require authentication
router.use(protect);

// Get blocked users list
router.get('/', getBlockedUsers);

// Block a user
router.post('/:userId', blockUser);

// Unblock a user
router.delete('/:userId', unblockUser);

module.exports = router;

