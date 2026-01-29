const User = require('../models/User');

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

module.exports = {
  searchUsers,
  findUser,
};

