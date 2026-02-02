const User = require('../models/User');
const FriendRequest = require('../models/FriendRequest');
const Message = require('../models/Message');
const BlockedUser = require('../models/BlockedUser');
const { isUserOnline, getDisplayedStatusForUser, emitToUsers } = require('../socket/socketServer');

// @desc    Get user's friends list
// @route   GET /api/friends
// @access  Private
const getFriends = async (req, res) => {
  try {
    // Verify user exists (already verified by protect middleware, but double-check)
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    // Get current user with lastSeenEnabled setting
    const currentUser = await User.findById(req.user._id)
      .select('lastSeenEnabled friends');
    
    if (!currentUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Populate friends with necessary fields including lastSeenEnabled
    const user = await User.findById(req.user._id)
      .populate('friends', 'name displayName username profilePhoto activityStatus lastSeenAt lastSeenEnabled')
      .select('friends');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get list of blocked user IDs
    const blockedUserRecords = await BlockedUser.find({
      blockerId: req.user._id,
    }).select('blockedId').lean();

    const blockedUserIds = blockedUserRecords.map(record => record.blockedId.toString());

    // Filter out blocked users from friends list
    // NUK filtrojmë përdoruesit me biseda të fshira - ata duhet të mbeten në listën e miqve
    // Biseda është e fshirë (përmes DeletedConversation), por miqësia mbetet
    const unblockedFriends = user.friends.filter(friend => {
      const friendIdStr = friend._id.toString();
      return !blockedUserIds.includes(friendIdStr);
    });

    // Format friends data with unread message counts, online status, and displayed status
    const friendsWithUnreadCounts = await Promise.all(
      unblockedFriends.map(async (friend) => {
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

        // ============================================
        // PRIVACY CHECK: Last Seen
        // ============================================
        // Last seen shfaqet vetëm nëse:
        // 1. Friend ka lastSeenEnabled = true
        // 2. Current user ka lastSeenEnabled = true (reciprocitet)
        // Nëse njëri e ka disable, asnjëri nuk shikon last seen të tjetrit
        // Kthe vlerën aktuale nga databaza (undefined/null = true by default)
        const friendLastSeenEnabled = friend.lastSeenEnabled !== false && friend.lastSeenEnabled !== null; // Default: true
        const currentUserLastSeenEnabled = currentUser.lastSeenEnabled !== false && currentUser.lastSeenEnabled !== null; // Default: true
        const showLastSeen = friendLastSeenEnabled && currentUserLastSeenEnabled;

        return {
          id: friendIdStr,
          name: friend.displayName || friend.name,
          username: friend.username,
          avatar: friend.profilePhoto || '',
          isOnline: isOnline,
          activityStatus: friend.activityStatus || 'offline',
          displayedStatus: displayedStatus,
          lastSeenEnabled: friend.lastSeenEnabled !== undefined && friend.lastSeenEnabled !== null ? friend.lastSeenEnabled : true, // Kthe vlerën aktuale ose true si default
          lastSeenAt: showLastSeen && friend.lastSeenAt ? friend.lastSeenAt : null,
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

    const currentUserId = req.user._id.toString();

    // Check if friend exists - include lastSeenEnabled
    const friend = await User.findById(friendId).select('activityStatus lastSeenAt lastSeenEnabled');
    if (!friend) {
      return res.status(404).json({ message: 'Friend not found' });
    }

    // Check if they are actually friends
    const currentUser = await User.findById(currentUserId).select('lastSeenEnabled friends');
    if (!currentUser) {
      return res.status(404).json({ message: 'Current user not found' });
    }

    if (!currentUser.friends.includes(friendId)) {
      return res.status(403).json({ message: 'This user is not your friend' });
    }

    // Check if friend is online (connected via Socket.IO)
    const isOnline = isUserOnline(friendId);

    // Calculate displayed status based on online status and activity preference
    const displayedStatus = await getDisplayedStatusForUser(friendId);

    // ============================================
    // PRIVACY CHECK: Last Seen
    // ============================================
    // Last seen shfaqet vetëm nëse:
    // 1. Friend ka lastSeenEnabled = true
    // 2. Current user ka lastSeenEnabled = true (reciprocitet)
    // Nëse njëri e ka disable, asnjëri nuk shikon last seen të tjetrit
    // Kthe vlerën aktuale nga databaza (undefined/null = true by default)
    const friendLastSeenEnabled = friend.lastSeenEnabled !== false && friend.lastSeenEnabled !== null; // Default: true
    const currentUserLastSeenEnabled = currentUser.lastSeenEnabled !== false && currentUser.lastSeenEnabled !== null; // Default: true
    const showLastSeen = friendLastSeenEnabled && currentUserLastSeenEnabled;

    return res.status(200).json({
      message: 'Friend status retrieved successfully',
      isOnline: isOnline,
      activityStatus: friend.activityStatus || 'offline',
      displayedStatus: displayedStatus,
      lastSeenEnabled: friend.lastSeenEnabled !== undefined && friend.lastSeenEnabled !== null ? friend.lastSeenEnabled : true, // Kthe vlerën aktuale ose true si default
      lastSeenAt: showLastSeen && friend.lastSeenAt ? friend.lastSeenAt : null,
    });
  } catch (error) {
    console.error('Get friend status error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update last seen enabled setting
// @route   PUT /api/friends/last-seen
// @access  Private
const updateLastSeenEnabled = async (req, res) => {
  try {
    const { lastSeenEnabled } = req.body;

    // Verify current user exists
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    // Validate input
    if (typeof lastSeenEnabled !== 'boolean') {
      return res.status(400).json({ message: 'lastSeenEnabled must be a boolean' });
    }

    // Update user's lastSeenEnabled setting
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { lastSeenEnabled: lastSeenEnabled },
      { new: true }
    ).select('lastSeenEnabled friends');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // ============================================
    // EMIT SOCKET.IO EVENT TO ALL FRIENDS
    // ============================================
    // Dërgo update për të gjithë miqtë që last seen enabled ka ndryshuar
    // Kjo lejon që frontend të përditësojë menjëherë pa pasur nevojë për refresh
    try {
      if (user.friends && user.friends.length > 0) {
        const friendIds = user.friends.map(friend => friend.toString());
        
        // Dërgo event për të gjithë miqtë
        emitToUsers(friendIds, 'last_seen_enabled_updated', {
          userId: user._id.toString(),
          lastSeenEnabled: user.lastSeenEnabled,
        });
      }
    } catch (socketError) {
      // Nuk ndalojmë procesin nëse Socket.IO dështon
      console.error('Error emitting last seen enabled update:', socketError);
    }

    return res.status(200).json({
      message: 'Last seen setting updated successfully',
      lastSeenEnabled: user.lastSeenEnabled,
    });
  } catch (error) {
    console.error('Update last seen enabled error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getFriends,
  removeFriend,
  getFriendStatus,
  updateLastSeenEnabled,
};

