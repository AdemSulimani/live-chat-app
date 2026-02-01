const User = require('../models/User');
const { getIO, isUserOnline, getDisplayedStatusForUser } = require('../socket/socketServer');

// @desc    Get user activity status
// @route   GET /api/activity
// @access  Private
const getActivityStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('activityStatus');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.status(200).json({
      message: 'Activity status retrieved successfully',
      activityStatus: user.activityStatus,
    });
  } catch (error) {
    console.error('Get activity status error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update user activity status
// @route   PUT /api/activity
// @access  Private
const updateActivityStatus = async (req, res) => {
  try {
    const { activityStatus } = req.body;

    // Validation - Check if activityStatus is provided
    if (!activityStatus) {
      return res.status(400).json({ 
        message: 'Activity status is required' 
      });
    }

    // Validation - Check if activityStatus is valid
    const validStatuses = ['online', 'offline', 'do_not_disturb'];
    if (!validStatuses.includes(activityStatus)) {
      return res.status(400).json({ 
        message: 'Invalid activity status. Must be one of: online, offline, do_not_disturb' 
      });
    }

    // Update user activity status
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { activityStatus },
      { new: true, runValidators: true }
    ).select('activityStatus friends');

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // ============================================
    // NOTIFY FRIENDS WHEN ACTIVITY STATUS CHANGES
    // ============================================
    // Nëse përdoruesi është online, njofto miqtë për ndryshimin e statusit
    // Nëse përdoruesi është offline, nuk ka nevojë për njoftim (tashmë shfaqet "Offline")
    if (isUserOnline(req.user._id.toString())) {
      try {
        const io = getIO();
        if (io && updatedUser.friends && updatedUser.friends.length > 0) {
          // Llogarit statusin e shfaqur pas ndryshimit
          // Kjo mund të jetë 'online', 'offline', ose 'do_not_disturb' bazuar në activityStatus
          const displayedStatus = await getDisplayedStatusForUser(req.user._id.toString());

          // Dërgo njoftim te të gjithë miqtë që janë online
          // Miqtë që janë offline do të marrin statusin e ri kur të kthehen online
          updatedUser.friends.forEach((friendId) => {
            const friendIdStr = friendId.toString();
            if (isUserOnline(friendIdStr)) {
              io.to(`user:${friendIdStr}`).emit('user_status_changed', {
                userId: req.user._id.toString(),
                displayedStatus: displayedStatus,
              });
            }
          });
        }
      } catch (notificationError) {
        console.error('Error notifying friends about activity status change:', notificationError);
        // Nuk ndalojmë procesin nëse njoftimi dështon
      }
    }
    // Nëse përdoruesi është offline, nuk njoftojmë miqtë
    // Sepse displayedStatus do të jetë gjithmonë 'offline' kur përdoruesi është offline

    return res.status(200).json({
      message: 'Activity status updated successfully',
      activityStatus: updatedUser.activityStatus,
    });
  } catch (error) {
    console.error('Update activity status error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getActivityStatus,
  updateActivityStatus,
};

