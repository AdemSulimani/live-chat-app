const express = require('express');
const {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  markNotificationsByUserAsRead,
} = require('../controllers/notificationController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// All routes require authentication
router.use(protect);

// Get all notifications
router.get('/', getNotifications);

// Mark notification as read
router.put('/:notificationId/read', markNotificationAsRead);

// Mark all notifications as read
router.put('/read-all', markAllNotificationsAsRead);

// Mark message notifications from a specific user as read
router.put('/read-by-user/:userId', markNotificationsByUserAsRead);

module.exports = router;

