const User = require('../models/User');
const FriendRequest = require('../models/FriendRequest');
const Message = require('../models/Message');
const { isUserOnline, getDisplayedStatusForUser } = require('../socket/socketServer');

// @desc    Get user's friends list
// @route   GET /api/friends
// @access  Private
const getFriends = async (req, res) => {
  try {
    // Verify user exists (already verified by protect middleware, but double-check)
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const user = await User.findById(req.user._id)
      .populate('friends', 'name displayName username profilePhoto activityStatus')
      .select('friends');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Format friends data with unread message counts, online status, and displayed status
    const friendsWithUnreadCounts = await Promise.all(
      user.friends.map(async (friend) => {
        const friendIdStr = friend._id.toString();
        
        // Count unread messages from this friend
        const unreadCount = await Message.countDocuments({
          senderId: friend._id,
          receiverId: req.user._id,
          isRead: false,
        });

        // Check if friend is online (connected via Socket.IO)
        const isOnline = isUserOnline(friendIdStr);

        // Calculate displayed status based on online status and activity preference
        const displayedStatus = await getDisplayedStatusForUser(friendIdStr);

        return {
          id: friendIdStr,
          name: friend.displayName || friend.name,
          username: friend.username,
          avatar: friend.profilePhoto || '',
          isOnline: isOnline,
          activityStatus: friend.activityStatus || 'offline',
          displayedStatus: displayedStatus,
          unreadCount: unreadCount,
        };
      })
    );

    return res.status(200).json({
      message: 'Friends retrieved successfully',
      friends: friendsWithUnreadCounts,
    });
  } catch (error) {
    console.error('Get friends error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Remove a friend
// @route   POST /api/friends/remove/:friendId
// @access  Private
const removeFriend = async (req, res) => {
  try {
    const { friendId } = req.params;

    if (!friendId) {
      return res.status(400).json({ message: 'Friend ID is required' });
    }

    // Verify current user exists
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    // Check if friend exists
    const friend = await User.findById(friendId);
    if (!friend) {
      return res.status(404).json({ message: 'Friend not found' });
    }

    // Check if they are actually friends
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'Current user not found' });
    }

    if (!user.friends.includes(friendId)) {
      return res.status(400).json({ message: 'This user is not your friend' });
    }

    // Remove friend from both users' friends lists
    await User.findByIdAndUpdate(req.user._id, {
      $pull: { friends: friendId },
    });

    await User.findByIdAndUpdate(friendId, {
      $pull: { friends: req.user._id },
    });

    // Delete all friend requests between them (in both directions and all statuses)
    await FriendRequest.deleteMany({
      $or: [
        { fromUser: req.user._id, toUser: friendId },
        { fromUser: friendId, toUser: req.user._id },
      ],
    });

    return res.status(200).json({
      message: 'Friend removed successfully',
    });
  } catch (error) {
    console.error('Remove friend error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get displayed status for a specific friend
// @route   GET /api/friends/:friendId/status
// @access  Private
const getFriendStatus = async (req, res) => {
  try {
    const { friendId } = req.params;

    if (!friendId) {
      return res.status(400).json({ message: 'Friend ID is required' });
    }

    // Verify current user exists
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    // Check if friend exists
    const friend = await User.findById(friendId).select('activityStatus');
    if (!friend) {
      return res.status(404).json({ message: 'Friend not found' });
    }

    // Check if they are actually friends
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'Current user not found' });
    }

    if (!user.friends.includes(friendId)) {
      return res.status(403).json({ message: 'This user is not your friend' });
    }

    // Check if friend is online (connected via Socket.IO)
    const isOnline = isUserOnline(friendId);

    // Calculate displayed status based on online status and activity preference
    const displayedStatus = await getDisplayedStatusForUser(friendId);

    return res.status(200).json({
      message: 'Friend status retrieved successfully',
      isOnline: isOnline,
      activityStatus: friend.activityStatus || 'offline',
      displayedStatus: displayedStatus,
    });
  } catch (error) {
    console.error('Get friend status error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getFriends,
  removeFriend,
  getFriendStatus,
};

