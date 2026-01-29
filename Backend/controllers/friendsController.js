const User = require('../models/User');
const FriendRequest = require('../models/FriendRequest');

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
      .populate('friends', 'name displayName username profilePhoto')
      .select('friends');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Format friends data
    const friends = user.friends.map(friend => ({
      id: friend._id.toString(),
      name: friend.displayName || friend.name,
      username: friend.username,
      avatar: friend.profilePhoto || '',
      isOnline: false, // TODO: Implement online status tracking
    }));

    return res.status(200).json({
      message: 'Friends retrieved successfully',
      friends: friends,
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

module.exports = {
  getFriends,
  removeFriend,
};

