const User = require('../models/User');
const BlockedUser = require('../models/BlockedUser');

// @desc    Search users by username or email
// @route   GET /api/users/search?q=username_or_email
// @access  Private
const searchUsers = async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.trim().length === 0) {
      return res.status(400).json({ message: 'Search query is required' });
    }

    const searchQuery = q.trim().toLowerCase();

    // Search by username or email (case insensitive)
    const users = await User.find({
      $or: [
        { username: { $regex: searchQuery, $options: 'i' } },
        { email: { $regex: searchQuery, $options: 'i' } },
      ],
      _id: { $ne: req.user._id }, // Exclude current user
    })
      .select('_id name displayName username email profilePhoto')
      .limit(10);

    // Format users data
    const formattedUsers = users.map(user => ({
      id: user._id.toString(),
      name: user.displayName || user.name,
      username: user.username,
      email: user.email,
      avatar: user.profilePhoto || '',
    }));

    return res.status(200).json({
      message: 'Users found successfully',
      users: formattedUsers,
    });
  } catch (error) {
    console.error('Search users error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get user by username or email (exact match)
// @route   GET /api/users/find?username=xxx or ?email=xxx
// @access  Private
const findUser = async (req, res) => {
  try {
    const { username, email } = req.query;

    if (!username && !email) {
      return res.status(400).json({ message: 'Username or email is required' });
    }

    let user;
    if (username) {
      user = await User.findOne({ username: username.toLowerCase().trim() });
    } else if (email) {
      user = await User.findOne({ email: email.toLowerCase().trim() });
    }

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Don't return if it's the current user
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot search for yourself' });
    }

    // ============================================
    // CHECK IF SEARCHER IS BLOCKED BY FOUND USER
    // ============================================
    // Kontrollo nëse përdoruesi që kërkon është i bllokuar nga përdoruesi që kërkohet
    // Nëse është i bllokuar, kthe "User not found" për të mos zbuluar që përdoruesi ekziston
    const isSearcherBlockedByFoundUser = await BlockedUser.findOne({
      blockerId: user._id, // Përdoruesi që u gjet (bllokuesi)
      blockedId: req.user._id, // Përdoruesi që kërkon (i bllokuari)
    });

    if (isSearcherBlockedByFoundUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.status(200).json({
      message: 'User found successfully',
      user: {
        id: user._id.toString(),
        name: user.displayName || user.name,
        username: user.username,
        email: user.email,
        avatar: user.profilePhoto || '',
      },
    });
  } catch (error) {
    console.error('Find user error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update last seen enabled setting
// @route   PUT /api/users/settings/last-seen
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
      const { emitToUsers } = require('../socket/socketServer');
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

// @desc    Get last seen for a user (respecting privacy)
// @route   GET /api/users/:userId/last-seen
// @access  Private
const getUserLastSeen = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    // Verify current user exists
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const currentUserId = req.user._id.toString();

    // Check if target user exists
    const targetUser = await User.findById(userId).select('lastSeenEnabled lastSeenAt friends');
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if they are friends
    const currentUser = await User.findById(currentUserId).select('lastSeenEnabled friends');
    if (!currentUser) {
      return res.status(404).json({ message: 'Current user not found' });
    }

    if (!currentUser.friends.includes(userId)) {
      return res.status(403).json({ message: 'You can only view last seen for your friends' });
    }

    // ============================================
    // PRIVACY CHECK: Last Seen
    // ============================================
    // Last seen shfaqet vetëm nëse:
    // 1. Target user ka lastSeenEnabled = true
    // 2. Current user ka lastSeenEnabled = true (reciprocitet)
    // Nëse njëri e ka disable, asnjëri nuk shikon last seen të tjetrit
    const targetUserLastSeenEnabled = targetUser.lastSeenEnabled !== false; // Default: true
    const currentUserLastSeenEnabled = currentUser.lastSeenEnabled !== false; // Default: true
    const showLastSeen = targetUserLastSeenEnabled && currentUserLastSeenEnabled;

    return res.status(200).json({
      message: 'Last seen retrieved successfully',
      lastSeenEnabled: targetUserLastSeenEnabled,
      lastSeenAt: showLastSeen && targetUser.lastSeenAt ? targetUser.lastSeenAt : null,
    });
  } catch (error) {
    console.error('Get user last seen error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  searchUsers,
  findUser,
  updateLastSeenEnabled,
  getUserLastSeen,
};

