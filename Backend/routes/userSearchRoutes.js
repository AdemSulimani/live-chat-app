const express = require('express');
const {
  searchUsers,
  findUser,
} = require('../controllers/userSearchController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// All routes require authentication
router.use(protect);

// Search users by username or email
router.get('/search', searchUsers);

// Find user by username or email (exact match)
router.get('/find', findUser);

module.exports = router;

