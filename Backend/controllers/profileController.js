const User = require('../models/User');
const path = require('path');
const fs = require('fs').promises;

// @desc    Get user profile
// @route   GET /api/profile
// @access  Private
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const profileData = {
      id: user._id,
      name: user.name,
      email: user.email,
      username: user.username,
      displayName: user.displayName,
      bio: user.bio,
      statusMessage: user.statusMessage,
      profilePhoto: user.profilePhoto,
      profileCompleted: user.profileCompleted,
      country: user.country,
      activityStatus: user.activityStatus || 'offline',
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    return res.status(200).json({
      message: 'Profile retrieved successfully',
      profile: profileData,
    });
  } catch (error) {
    console.error('Get profile error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Create or update user profile
// @route   POST /api/profile
// @access  Private
const createOrUpdateProfile = async (req, res) => {
  try {
    const { username, displayName, bio, statusMessage } = req.body;

    // Validation - Required fields
    if (!username || !displayName) {
      return res.status(400).json({ 
        message: 'Username and display name are required' 
      });
    }

    // Validation - Username format (alphanumeric, underscore, dash, 3-20 characters)
    const usernameRegex = /^[a-zA-Z0-9_-]{3,20}$/;
    if (!usernameRegex.test(username)) {
      return res.status(400).json({ 
        message: 'Username must be 3-20 characters and can only contain letters, numbers, underscores, and dashes' 
      });
    }

    // Validation - Display name length (1-50 characters)
    if (displayName.trim().length < 1 || displayName.trim().length > 50) {
      return res.status(400).json({ 
        message: 'Display name must be between 1 and 50 characters' 
      });
    }

    // Validation - Bio length (max 500 characters)
    if (bio && bio.length > 500) {
      return res.status(400).json({ 
        message: 'Bio must not exceed 500 characters' 
      });
    }

    // Validation - Status message length (max 100 characters)
    if (statusMessage && statusMessage.length > 100) {
      return res.status(400).json({ 
        message: 'Status message must not exceed 100 characters' 
      });
    }

    // Check if username is already taken by another user
    const existingUser = await User.findOne({ 
      username: username.toLowerCase(),
      _id: { $ne: req.user._id } // Exclude current user
    });

    if (existingUser) {
      return res.status(400).json({ message: 'Username is already taken' });
    }

    // Update user profile
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      {
        username: username.toLowerCase().trim(),
        displayName: displayName.trim(),
        bio: bio ? bio.trim() : '',
        statusMessage: statusMessage ? statusMessage.trim() : '',
        profileCompleted: true,
      },
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    const profileData = {
      id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      username: updatedUser.username,
      displayName: updatedUser.displayName,
      bio: updatedUser.bio,
      statusMessage: updatedUser.statusMessage,
      profilePhoto: updatedUser.profilePhoto,
      profileCompleted: updatedUser.profileCompleted,
      country: updatedUser.country,
      activityStatus: updatedUser.activityStatus || 'offline',
      createdAt: updatedUser.createdAt,
      updatedAt: updatedUser.updatedAt,
    };

    return res.status(200).json({
      message: 'Profile updated successfully',
      profile: profileData,
    });
  } catch (error) {
    console.error('Create/Update profile error:', error);
    
    // Handle duplicate username error
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Username is already taken' });
    }
    
    return res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Upload profile photo
// @route   POST /api/profile/photo
// @access  Private
const uploadPhoto = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Get the file path from multer
    const photoPath = `/uploads/profile-photos/${req.file.filename}`;
    const fullPhotoUrl = `${req.protocol}://${req.get('host')}${photoPath}`;

    // Delete old photo if exists
    const user = await User.findById(req.user._id);
    if (user.profilePhoto) {
      const oldPhotoPath = user.profilePhoto.replace(
        `${req.protocol}://${req.get('host')}`,
        ''
      );
      const oldPhotoFullPath = path.join(__dirname, '..', oldPhotoPath);
      
      try {
        await fs.unlink(oldPhotoFullPath);
      } catch (error) {
        // Ignore error if file doesn't exist
        console.log('Old photo not found, skipping deletion');
      }
    }

    // Update user profile with new photo
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { profilePhoto: fullPhotoUrl },
      { new: true }
    ).select('-password');

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.status(200).json({
      message: 'Photo uploaded successfully',
      profilePhoto: fullPhotoUrl,
    });
  } catch (error) {
    console.error('Upload photo error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Check if username is available
// @route   GET /api/profile/check-username/:username
// @access  Private
const checkUsername = async (req, res) => {
  try {
    const { username } = req.params;

    if (!username) {
      return res.status(400).json({ available: false, message: 'Username is required' });
    }

    // Validation - Username format
    const usernameRegex = /^[a-zA-Z0-9_-]{3,20}$/;
    if (!usernameRegex.test(username)) {
      return res.status(400).json({ 
        available: false, 
        message: 'Username must be 3-20 characters and can only contain letters, numbers, underscores, and dashes' 
      });
    }

    // Check if username is already taken by another user
    const existingUser = await User.findOne({ 
      username: username.toLowerCase(),
      _id: { $ne: req.user._id } // Exclude current user
    });

    return res.status(200).json({ 
      available: !existingUser,
      message: existingUser ? 'Username is already taken' : 'Username is available'
    });
  } catch (error) {
    console.error('Check username error:', error);
    return res.status(500).json({ available: false, message: 'Server error' });
  }
};

module.exports = {
  getProfile,
  createOrUpdateProfile,
  uploadPhoto,
  checkUsername,
};

