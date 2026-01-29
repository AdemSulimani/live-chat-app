const User = require('../models/User');
const FriendRequest = require('../models/FriendRequest');

// @desc    Get blocked users list
// @route   GET /api/blocked
// @access  Private
const getBlockedUsers = async (req, res) => {
  try {
    // Verify user exists
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const user = await User.findById(req.user._id)
      .populate('blockedUsers', 'name displayName username profilePhoto')
      .select('blockedUsers');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Format blocked users data
    const blockedUsers = user.blockedUsers.map(blockedUser => ({
      id: blockedUser._id.toString(),
      name: blockedUser.displayName || blockedUser.name,
      username: blockedUser.username,
      avatar: blockedUser.profilePhoto || '',
    }));

    return res.status(200).json({
      message: 'Blocked users retrieved successfully',
      blockedUsers: blockedUsers,
    });
  } catch (error) {
    console.error('Get blocked users error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Block a user
// @route   POST /api/blocked/:userId
// @access  Private
const blockUser = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    // Check if user is trying to block themselves
    if (userId === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot block yourself' });
    }

    // Verify current user exists
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    // Check if target user exists
    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    const currentUser = await User.findById(req.user._id);
    if (!currentUser) {
      return res.status(404).json({ message: 'Current user not found' });
    }

    // Check if already blocked
    if (currentUser.blockedUsers.includes(userId)) {
      return res.status(400).json({ message: 'User is already blocked' });
    }

    // Add to blocked list
    await User.findByIdAndUpdate(req.user._id, {
      $addToSet: { blockedUsers: userId },
    });

    // Remove from friends if they are friends
    if (currentUser.friends.includes(userId)) {
      await User.findByIdAndUpdate(req.user._id, {
        $pull: { friends: userId },
      });

      await User.findByIdAndUpdate(userId, {
        $pull: { friends: req.user._id },
      });
    }

    // Cancel any pending friend requests between them
    await FriendRequest.updateMany(
      {
        $or: [
          { fromUser: req.user._id, toUser: userId },
          { fromUser: userId, toUser: req.user._id },
        ],
        status: 'pending',
      },
      { status: 'rejected' }
    );

    return res.status(200).json({
      message: 'User blocked successfully',
    });
  } catch (error) {
    console.error('Block user error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Unblock a user
// @route   DELETE /api/blocked/:userId
// @access  Private
const unblockUser = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    // Verify current user exists
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    // Check if target user exists
    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    const currentUser = await User.findById(req.user._id);
    if (!currentUser) {
      return res.status(404).json({ message: 'Current user not found' });
    }

    // Check if user is actually blocked
    if (!currentUser.blockedUsers.includes(userId)) {
      return res.status(400).json({ message: 'User is not blocked' });
    }

    // Remove from blocked list
    await User.findByIdAndUpdate(req.user._id, {
      $pull: { blockedUsers: userId },
    });

    return res.status(200).json({
      message: 'User unblocked successfully',
    });
  } catch (error) {
    console.error('Unblock user error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getBlockedUsers,
  blockUser,
  unblockUser,
};

