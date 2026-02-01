const express = require('express');
const {
  getActivityStatus,
  updateActivityStatus,
} = require('../controllers/activityController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// All activity routes require authentication
router.use(protect);

// Get user activity status
router.get('/', getActivityStatus);

// Update user activity status
router.put('/', updateActivityStatus);

module.exports = router;

