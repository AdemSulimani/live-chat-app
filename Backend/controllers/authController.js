const validator = require('validator');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const FriendRequest = require('../models/FriendRequest');
const Message = require('../models/Message');
const Notification = require('../models/Notification');
const BlockedUser = require('../models/BlockedUser');
const { emitToUsers, isUserOnline, disconnectUser } = require('../socket/socketServer');
const fs = require('fs').promises;
const path = require('path');

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
  try {
    const { name, email, country, password, confirmPassword, acceptTerms } = req.body;

    // Basic validations based on frontend fields
    if (!name || !email || !country || !password || !confirmPassword) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    if (!validator.isEmail(email)) {
      return res.status(400).json({ message: 'Invalid email address' });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ message: 'Password must be at least 6 characters long' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match' });
    }

    if (!acceptTerms) {
      return res
        .status(400)
        .json({ message: 'You must accept terms & policies' });
    }

    // Check if email already exists
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({ message: 'Email is already in use' });
    }

    // Create and save user (password will be hashed by the model pre-save hook)
    const user = await User.create({
      name,
      email,
      country,
      password,
      acceptTerms,
    });

    // Create JWT token për auto-login pas regjistrimit
    let token = null;
    if (process.env.JWT_SECRET) {
      token = jwt.sign(
        { userId: user._id },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );
    }

    // Remove password from response
    const userResponse = {
      id: user._id,
      name: user.name,
      email: user.email,
      country: user.country,
      username: user.username,
      displayName: user.displayName,
      bio: user.bio,
      statusMessage: user.statusMessage,
      profilePhoto: user.profilePhoto,
      profileCompleted: user.profileCompleted || false,
      activityStatus: user.activityStatus || 'offline',
      createdAt: user.createdAt,
    };

    return res.status(201).json({
      message: 'User registered successfully',
      user: userResponse,
      token,
    });
  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Login user (me email ose username + password)
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    // identifier mund të jetë email ose username (name)
    if (!identifier || !password) {
      return res.status(400).json({ message: 'Email/username and password are required' });
    }

    // Vendosim nëse është email apo username
    const query = validator.isEmail(identifier)
      ? { email: identifier.toLowerCase() }
      : { name: identifier };

    const user = await User.findOne(query);

    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Opsionale: krijo JWT token nëse ekziston JWT_SECRET
    let token = null;
    if (process.env.JWT_SECRET) {
      token = jwt.sign(
        { userId: user._id },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );
    }

    const userResponse = {
      id: user._id,
      name: user.name,
      email: user.email,
      country: user.country,
      username: user.username,
      displayName: user.displayName,
      bio: user.bio,
      statusMessage: user.statusMessage,
      profilePhoto: user.profilePhoto,
      profileCompleted: user.profileCompleted || false,
      activityStatus: user.activityStatus || 'offline',
      createdAt: user.createdAt,
    };

    return res.status(200).json({
      message: 'Login successful',
      user: userResponse,
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Check if email exists
// @route   GET /api/auth/check-email/:email
// @access  Public
const checkEmail = async (req, res) => {
  try {
    const { email } = req.params;

    if (!email || !validator.isEmail(email)) {
      return res.status(400).json({ exists: false, message: 'Invalid email address' });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });

    return res.status(200).json({ exists: !!existing });
  } catch (error) {
    console.error('Check email error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Check if username exists
// @route   GET /api/auth/check-username/:username
// @access  Public
const checkUsername = async (req, res) => {
  try {
    const { username } = req.params;

    if (!username) {
      return res.status(400).json({ exists: false, message: 'Username is required' });
    }

    const existing = await User.findOne({ name: username });

    return res.status(200).json({ exists: !!existing });
  } catch (error) {
    console.error('Check username error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Delete user account
// @route   DELETE /api/auth/delete-account
// @access  Protected
const deleteAccount = async (req, res) => {
  // Audit log - regjistro fillimin e procesit të fshirjes
  const auditLog = {
    timestamp: new Date().toISOString(),
    userId: req.user._id.toString(),
    userEmail: req.user.email || 'N/A',
    userName: req.user.name || req.user.displayName || 'N/A',
    ipAddress: req.ip || req.connection.remoteAddress || 'N/A',
    userAgent: req.get('user-agent') || 'N/A',
    action: 'DELETE_ACCOUNT',
    status: 'IN_PROGRESS',
  };

  // Log fillimin e procesit
  console.log('[AUDIT LOG] Account deletion started:', JSON.stringify(auditLog, null, 2));

  try {
    // userId merret nga req.user (nga middleware protect)
    const userId = req.user._id;

    if (!userId) {
      auditLog.status = 'FAILED';
      auditLog.error = 'User ID is required';
      console.error('[AUDIT LOG] Account deletion failed:', JSON.stringify(auditLog, null, 2));
      return res.status(400).json({ message: 'User ID is required' });
    }

    // Verifikoj që user-i ekziston
    const user = await User.findById(userId).select('friends name displayName profilePhoto email');
    if (!user) {
      auditLog.status = 'FAILED';
      auditLog.error = 'User not found';
      console.error('[AUDIT LOG] Account deletion failed:', JSON.stringify(auditLog, null, 2));
      return res.status(404).json({ message: 'User not found' });
    }

    // Përditëso audit log me email-in e user-it
    auditLog.userEmail = user.email || 'N/A';

    // ============================================
    // 1. FSHIRJA NGA FRIEND LISTS
    // ============================================
    // Gjej të gjithë miqtë e user-it
    const friends = user.friends || [];
    
    // Inicializo deletedData për audit log
    let deletedData = {
      friendsRemoved: 0,
      messagesDeleted: 0,
      notificationsDeleted: 0,
      blockedRecordsDeleted: 0,
      friendRequestsDeleted: 0,
    };
    
    if (friends.length > 0) {
      // Për çdo mik, hiq userId nga lista e miqve të atij miku
      const friendIds = friends.map(friend => friend.toString());
      
      // Hiq userId nga lista e miqve të të gjithë miqve
      await User.updateMany(
        { _id: { $in: friendIds } },
        { $pull: { friends: userId } }
      );

      // Njofto përmes socket të gjithë miqtë që janë online
      const onlineFriends = friendIds.filter(friendId => isUserOnline(friendId));
      
      if (onlineFriends.length > 0) {
        try {
          // Dërgo event për të treguar që user-i është fshirë
          emitToUsers(onlineFriends, 'friend_deleted_account', {
            deletedUserId: userId.toString(),
            deletedUserName: user.name || user.displayName || 'User',
          });

          // Dërgo event për të përditësuar friends list
          emitToUsers(onlineFriends, 'friends_list_updated', {
            message: 'A friend has deleted their account',
          });
        } catch (socketError) {
          // Nuk ndalojmë procesin nëse Socket.IO dështon
          console.error('Error emitting friend deletion notification:', socketError);
        }
      }
    }

    // ============================================
    // 2. FSHIRJA E FRIEND REQUESTS
    // ============================================
    // Hiq të gjitha friend requests që përfshijnë këtë user
    // (si fromUser dhe si toUser)
    const deletedFriendRequests = await FriendRequest.deleteMany({
      $or: [
        { fromUser: userId },
        { toUser: userId },
      ],
    });
    deletedData.friendRequestsDeleted = deletedFriendRequests.deletedCount;
    deletedData.friendsRemoved = friends.length;

    // ============================================
    // 3. FSHIRJA E MESAZHEVE
    // ============================================
    // Fshi të gjitha mesazhet ku user-i është sender ose receiver
    // Gjej mesazhet që kanë imageUrl ose audioUrl për t'i fshirë file-at
    const messagesWithFiles = await Message.find({
      $and: [
        {
          $or: [
            { senderId: userId },
            { receiverId: userId },
          ],
        },
        {
          $or: [
            { imageUrl: { $exists: true, $ne: null } },
            { audioUrl: { $exists: true, $ne: null } },
          ],
        },
      ],
    }).select('imageUrl audioUrl');

    // Fshi file-at e mesazheve (chat photos dhe voice messages)
    for (const message of messagesWithFiles) {
      try {
        if (message.imageUrl) {
          // Extract path from URL (mund të jetë full URL ose relative path)
          let imagePath = message.imageUrl;
          
          // Nëse është full URL, hiq protocol dhe host
          if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
            const urlMatch = imagePath.match(/\/uploads\/.*$/);
            if (urlMatch) {
              imagePath = urlMatch[0];
            } else {
              imagePath = imagePath.replace(/^https?:\/\/[^\/]+/, '');
            }
          }
          
          // Nëse fillon me /uploads, hiq / për të marrë relative path
          if (imagePath.startsWith('/uploads/')) {
            imagePath = imagePath.substring(1);
          }
          
          const fullImagePath = path.join(__dirname, '..', imagePath);
          await fs.unlink(fullImagePath).catch(() => {
            // Ignore error nëse file nuk ekziston
          });
        }
        if (message.audioUrl) {
          // Extract path from URL (mund të jetë full URL ose relative path)
          let audioPath = message.audioUrl;
          
          // Nëse është full URL, hiq protocol dhe host
          if (audioPath.startsWith('http://') || audioPath.startsWith('https://')) {
            const urlMatch = audioPath.match(/\/uploads\/.*$/);
            if (urlMatch) {
              audioPath = urlMatch[0];
            } else {
              audioPath = audioPath.replace(/^https?:\/\/[^\/]+/, '');
            }
          }
          
          // Nëse fillon me /uploads, hiq / për të marrë relative path
          if (audioPath.startsWith('/uploads/')) {
            audioPath = audioPath.substring(1);
          }
          
          const fullAudioPath = path.join(__dirname, '..', audioPath);
          await fs.unlink(fullAudioPath).catch(() => {
            // Ignore error nëse file nuk ekziston
          });
        }
      } catch (fileError) {
        // Nuk ndalojmë procesin nëse fshirja e file-it dështon
        console.error('Error deleting message file:', fileError);
      }
    }

    // Fshi të gjitha mesazhet
    const deletedMessages = await Message.deleteMany({
      $or: [
        { senderId: userId },
        { receiverId: userId },
      ],
    });
    deletedData.messagesDeleted = deletedMessages.deletedCount;

    // ============================================
    // 4. FSHIRJA E NOTIFICATIONS
    // ============================================
    // Fshi njoftimet që lidhen me këtë user
    // (si userId ose si relatedUserId)
    const deletedNotifications = await Notification.deleteMany({
      $or: [
        { userId: userId },
        { relatedUserId: userId },
      ],
    });
    deletedData.notificationsDeleted = deletedNotifications.deletedCount;

    // ============================================
    // 5. FSHIRJA E BLOCKED USERS RECORDS
    // ============================================
    // Fshi rekordet ku user-i është blocker ose blocked
    const deletedBlockedRecords = await BlockedUser.deleteMany({
      $or: [
        { blockerId: userId },
        { blockedId: userId },
      ],
    });
    deletedData.blockedRecordsDeleted = deletedBlockedRecords.deletedCount;

    // ============================================
    // 6. FSHIRJA E PROFILE PHOTO
    // ============================================
    // Fshi foto e profilit nga server nëse ekziston
    if (user.profilePhoto) {
      try {
        // Extract path from URL (mund të jetë full URL ose relative path)
        // E.g., http://localhost:5000/uploads/profile-photos/filename.jpg
        // ose /uploads/profile-photos/filename.jpg
        let photoPath = user.profilePhoto;
        
        // Nëse është full URL, hiq protocol dhe host
        if (photoPath.startsWith('http://') || photoPath.startsWith('https://')) {
          // Extract path pas domain (e.g., /uploads/profile-photos/filename.jpg)
          const urlMatch = photoPath.match(/\/uploads\/.*$/);
          if (urlMatch) {
            photoPath = urlMatch[0];
          } else {
            // Nëse nuk gjejmë pattern, përpiqemi me replace
            photoPath = photoPath.replace(/^https?:\/\/[^\/]+/, '');
          }
        }
        
        // Nëse fillon me /uploads, hiq / për të marrë relative path
        if (photoPath.startsWith('/uploads/')) {
          photoPath = photoPath.substring(1); // Hiq / në fillim
        }
        
        const fullPhotoPath = path.join(__dirname, '..', photoPath);
        await fs.unlink(fullPhotoPath).catch(() => {
          // Ignore error nëse file nuk ekziston
        });
      } catch (photoError) {
        // Nuk ndalojmë procesin nëse fshirja e fotos dështon
        console.error('Error deleting profile photo:', photoError);
      }
    }

    // ============================================
    // 7. SOCKET CLEANUP
    // ============================================
    // Shkëput lidhjen e socket-it për këtë user dhe hiq nga activeUsers
    try {
      const wasOnline = disconnectUser(userId);
      
      // Nëse user-i ishte online, njofto miqtë që user-i është fshirë
      // (Kjo është opsionale - tashmë kemi njoftuar në hapin 1, por kjo është për siguri)
      if (wasOnline && friends.length > 0) {
        const friendIds = friends.map(friend => friend.toString());
        const onlineFriends = friendIds.filter(friendId => isUserOnline(friendId));
        
        if (onlineFriends.length > 0) {
          try {
            // Dërgo event për të treguar që user-i është fshirë dhe offline
            emitToUsers(onlineFriends, 'user_status_changed', {
              userId: userId.toString(),
              displayedStatus: 'offline',
            });
          } catch (socketError) {
            // Nuk ndalojmë procesin nëse Socket.IO dështon
            console.error('Error emitting user deletion status change:', socketError);
          }
        }
      }
    } catch (socketCleanupError) {
      // Nuk ndalojmë procesin nëse socket cleanup dështon
      console.error('Error during socket cleanup:', socketCleanupError);
    }

    // ============================================
    // 8. FSHIRJA E USER-IT NGA DATABAZA
    // ============================================
    // Pas pastrimit të të gjitha të dhënave, fshi rekordin e user-it nga koleksioni User
    // Activity status dhe të gjitha të dhënat e tjera të user-it do të fshihen automatikisht
    const deletedUser = await User.findByIdAndDelete(userId);

    if (!deletedUser) {
      // Nëse user-i nuk ekziston, kthe sukses (mund të jetë fshirë tashmë)
      // Kjo mund të ndodhë nëse user-i u fshi tashmë ose nëse ka ndonjë problem
      // Audit log - sukses por user-i ishte fshirë tashmë
      auditLog.status = 'SUCCESS';
      auditLog.note = 'User was already deleted or not found';
      auditLog.deletedData = deletedData;
      auditLog.completedAt = new Date().toISOString();
      console.log('[AUDIT LOG] Account deletion completed (user already deleted):', JSON.stringify(auditLog, null, 2));

      return res.status(200).json({
        success: true,
        message: 'Account deletion completed',
        userId: userId.toString(),
        note: 'User was already deleted or not found',
        deletedData,
      });
    }

    // Sukses - kthe 200 OK me mesazh dhe detaje
    // Audit log - sukses i plotë
    auditLog.status = 'SUCCESS';
    auditLog.deletedData = deletedData;
    auditLog.completedAt = new Date().toISOString();
    console.log('[AUDIT LOG] Account deletion completed successfully:', JSON.stringify(auditLog, null, 2));

    return res.status(200).json({
      success: true,
      message: 'Your account has been permanently deleted',
      userId: userId.toString(),
      deletedData,
    });
  } catch (error) {
    console.error('Delete account error:', error);
    
    // Audit log - gabim
    auditLog.status = 'FAILED';
    auditLog.error = error.message || 'Unknown error';
    auditLog.errorType = error.name || 'Error';
    auditLog.completedAt = new Date().toISOString();
    console.error('[AUDIT LOG] Account deletion failed:', JSON.stringify(auditLog, null, 2));
    
    // Kthe gabim të përshtatshëm bazuar në llojin e gabimit
    if (error.name === 'CastError' || error.name === 'ValidationError') {
      return res.status(400).json({ 
        message: 'Invalid user data',
        error: error.message 
      });
    }
    
    // Për gabime të tjera, kthe server error
    return res.status(500).json({ 
      message: 'An error occurred while deleting your account. Please try again later.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  registerUser,
  loginUser,
  checkEmail,
  checkUsername,
  deleteAccount,
};

