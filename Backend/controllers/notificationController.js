const Notification = require('../models/Notification');

// @desc    Get all notifications for user
// @route   GET /api/notifications
// @access  Private
const getNotifications = async (req, res) => {
  try {
    // Verify user exists
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const notifications = await Notification.find({ userId: req.user._id })
      .populate('relatedUserId', 'name displayName username profilePhoto')
      .sort({ createdAt: -1 })
      .limit(100); // Limit to last 100 notifications

    // Format notifications
    const formattedNotifications = notifications.map(notification => ({
      id: notification._id.toString(),
      type: notification.type,
      message: notification.message,
      timestamp: notification.createdAt,
      isRead: notification.isRead,
      relatedUserId: notification.relatedUserId ? notification.relatedUserId._id.toString() : null,
    }));

    return res.status(200).json({
      message: 'Notifications retrieved successfully',
      notifications: formattedNotifications,
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Mark notification as read
// @route   PUT /api/notifications/:notificationId/read
// @access  Private
const markNotificationAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;

    // Verify user exists
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const notification = await Notification.findById(notificationId);

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    // Check if notification belongs to current user
    if (notification.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    notification.isRead = true;
    await notification.save();

    return res.status(200).json({
      message: 'Notification marked as read',
    });
  } catch (error) {
    console.error('Mark notification as read error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/read-all
// @access  Private
const markAllNotificationsAsRead = async (req, res) => {
  try {
    // Verify user exists
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    await Notification.updateMany(
      { userId: req.user._id, isRead: false },
      { isRead: true }
    );

    return res.status(200).json({
      message: 'All notifications marked as read',
    });
  } catch (error) {
    console.error('Mark all notifications as read error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
};

