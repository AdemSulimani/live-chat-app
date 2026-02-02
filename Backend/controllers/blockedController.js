const User = require('../models/User');
const FriendRequest = require('../models/FriendRequest');
const BlockedUser = require('../models/BlockedUser');
const DeletedConversation = require('../models/DeletedConversation');

// @desc    Get blocked users list
// @route   GET /api/users/blocked
// @route   GET /api/blocked (backward compatibility)
// @access  Private
const getBlockedUsers = async (req, res) => {
  try {
    // Verify user exists
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    // Get blocked users from BlockedUser model
    const blockedUserRecords = await BlockedUser.find({
      blockerId: req.user._id,
    })
      .populate('blockedId', 'name displayName username profilePhoto')
      .sort({ blockedAt: -1 }) // Më të rejat së pari
      .lean();

    if (!blockedUserRecords) {
      return res.status(200).json({
        message: 'Blocked users retrieved successfully',
        blockedUsers: [],
      });
    }

    // Format blocked users data
    const blockedUsers = blockedUserRecords.map(record => ({
      id: record.blockedId._id.toString(),
      name: record.blockedId.displayName || record.blockedId.name,
      username: record.blockedId.username,
      avatar: record.blockedId.profilePhoto || '',
      blockedAt: record.blockedAt,
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
    const existingBlock = await BlockedUser.findOne({
      blockerId: req.user._id,
      blockedId: userId,
    });

    if (existingBlock) {
      return res.status(400).json({ message: 'User is already blocked' });
    }

    // ============================================
    // CREATE BLOCKED USER RECORD
    // ============================================
    // Krijo rekord në BlockedUser model
    const blockedUser = new BlockedUser({
      blockerId: req.user._id,
      blockedId: userId,
      blockedAt: new Date(),
    });
    await blockedUser.save();

    // ============================================
    // UPDATE USER MODEL (MAINTAIN BACKWARD COMPATIBILITY)
    // ============================================
    // Shto edhe në blockedUsers array për backward compatibility
    // dhe për queries më të shpejta në disa raste
    await User.findByIdAndUpdate(req.user._id, {
      $addToSet: { blockedUsers: userId },
    });

    // ============================================
    // NOTE: WE DO NOT REMOVE FRIENDSHIP
    // ============================================
    // Nuk heqim miqësinë kur bllokon një përdorues
    // Miqësia mbetet, por biseda fshihet vetëm për bllokuesin
    // Përdoruesi i bllokuar nuk mund të dërgojë mesazhe, por miqësia mbetet

    // ============================================
    // CANCEL FRIEND REQUESTS
    // ============================================
    // Anulo çdo friend request në pritje midis tyre
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

    // ============================================
    // DELETE CONVERSATION FOR BLOCKER ONLY
    // ============================================
    // Krijo rekord në DeletedConversation vetëm për bllokuesin
    // Kjo fshin bisedën vetëm për bllokuesin; për të bllokuarin mbetet e dukshme
    try {
      // Kontrollo nëse ekziston tashmë rekord për këtë bisedë
      const existingDeletedConversation = await DeletedConversation.findOne({
        userId: req.user._id,
        otherUserId: userId,
      });

      // Nëse nuk ekziston, krijo rekord të ri
      if (!existingDeletedConversation) {
        const deletedConversation = new DeletedConversation({
          userId: req.user._id, // Bllokuesi
          otherUserId: userId, // I bllokuari
          deletedAt: new Date(),
        });
        await deletedConversation.save();
      }
    } catch (deleteConversationError) {
      // Nuk ndalojmë procesin nëse krijimi i DeletedConversation dështon
      // Por logojmë gabimin për debugging
      console.error('Error creating deleted conversation record:', deleteConversationError);
    }

    return res.status(200).json({
      message: 'User blocked successfully',
    });
  } catch (error) {
    console.error('Block user error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Unblock a user
// @route   POST /api/users/:userId/unblock
// @route   DELETE /api/blocked/:userId (backward compatibility)
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
    const existingBlock = await BlockedUser.findOne({
      blockerId: req.user._id,
      blockedId: userId,
    });

    if (!existingBlock) {
      return res.status(400).json({ message: 'User is not blocked' });
    }

    // ============================================
    // REMOVE BLOCKED USER RECORD
    // ============================================
    // Fshi rekord nga BlockedUser model
    await BlockedUser.deleteOne({
      blockerId: req.user._id,
      blockedId: userId,
    });

    // ============================================
    // UPDATE USER MODEL (MAINTAIN BACKWARD COMPATIBILITY)
    // ============================================
    // Hiq edhe nga blockedUsers array për backward compatibility
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

