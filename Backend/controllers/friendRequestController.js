const FriendRequest = require('../models/FriendRequest');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { emitToUser } = require('../socket/socketServer');

// @desc    Get friend requests (sent and received)
// @route   GET /api/friend-requests
// @access  Private
const getFriendRequests = async (req, res) => {
  try {
    // Get received friend requests (pending)
    const receivedRequests = await FriendRequest.find({
      toUser: req.user._id,
      status: 'pending',
    })
      .populate('fromUser', 'name displayName username profilePhoto')
      .sort({ createdAt: -1 });

    // Get sent friend requests (pending)
    const sentRequests = await FriendRequest.find({
      fromUser: req.user._id,
      status: 'pending',
    })
      .populate('toUser', 'name displayName username profilePhoto')
      .sort({ createdAt: -1 });

    // Format received requests
    const formattedReceived = receivedRequests.map(request => ({
      id: request._id.toString(),
      fromUserId: request.fromUser._id.toString(),
      fromUserName: request.fromUser.displayName || request.fromUser.name,
      fromUserAvatar: request.fromUser.profilePhoto || '',
      timestamp: request.createdAt,
    }));

    // Format sent requests
    const formattedSent = sentRequests.map(request => ({
      id: request._id.toString(),
      toUserId: request.toUser._id.toString(),
      toUserName: request.toUser.displayName || request.toUser.name,
      toUserAvatar: request.toUser.profilePhoto || '',
      timestamp: request.createdAt,
    }));

    return res.status(200).json({
      message: 'Friend requests retrieved successfully',
      received: formattedReceived,
      sent: formattedSent,
    });
  } catch (error) {
    console.error('Get friend requests error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Send friend request
// @route   POST /api/friend-requests/send
// @access  Private
const sendFriendRequest = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    // Check if user is trying to send request to themselves
    if (userId === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot send friend request to yourself' });
    }

    // Verify current user exists
    const currentUser = await User.findById(req.user._id);
    if (!currentUser) {
      return res.status(404).json({ message: 'Current user not found' });
    }

    // Check if target user exists
    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if already friends (using already fetched currentUser)
    if (currentUser.friends.includes(userId)) {
      return res.status(400).json({ message: 'You are already friends with this user' });
    }

    // Check if user is blocked
    if (currentUser.blockedUsers.includes(userId) || targetUser.blockedUsers.includes(req.user._id)) {
      return res.status(400).json({ message: 'Cannot send friend request' });
    }

    // Check if there's already a pending request (in either direction)
    const existingRequest = await FriendRequest.findOne({
      $or: [
        { fromUser: req.user._id, toUser: userId },
        { fromUser: userId, toUser: req.user._id },
      ],
      status: 'pending',
    });

    if (existingRequest) {
      return res.status(400).json({ message: 'Friend request already exists' });
    }

    // Create friend request
    const friendRequest = await FriendRequest.create({
      fromUser: req.user._id,
      toUser: userId,
      status: 'pending',
    });

    // Create notification for the recipient
    const notification = await Notification.create({
      userId: userId,
      type: 'friend_request',
      message: `${currentUser.displayName || currentUser.name} sent you a friend request`,
      isRead: false,
      relatedUserId: req.user._id,
    });

    // Emit real-time notification to recipient
    emitToUser(userId, 'friend_request_received', {
      notification: {
        id: notification._id.toString(),
        type: notification.type,
        message: notification.message,
        timestamp: notification.createdAt,
        isRead: notification.isRead,
        relatedUserId: req.user._id.toString(),
      },
      friendRequest: {
        id: friendRequest._id.toString(),
        fromUserId: req.user._id.toString(),
        fromUserName: currentUser.displayName || currentUser.name,
        fromUserAvatar: currentUser.profilePhoto || '',
        timestamp: friendRequest.createdAt,
      },
    });

    return res.status(201).json({
      message: 'Friend request sent successfully',
      requestId: friendRequest._id.toString(),
    });
  } catch (error) {
    console.error('Send friend request error:', error);
    
    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Friend request already exists' });
    }
    
    return res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Accept friend request
// @route   POST /api/friend-requests/accept/:requestId
// @access  Private
const acceptFriendRequest = async (req, res) => {
  try {
    const { requestId } = req.params;

    // Verify current user exists
    const currentUser = await User.findById(req.user._id);
    if (!currentUser) {
      return res.status(404).json({ message: 'Current user not found' });
    }

    // Find the friend request
    const friendRequest = await FriendRequest.findById(requestId)
      .populate('fromUser', 'name displayName');

    if (!friendRequest) {
      return res.status(404).json({ message: 'Friend request not found' });
    }

    // Verify sender user exists
    if (!friendRequest.fromUser) {
      return res.status(404).json({ message: 'Sender user not found' });
    }

    // Check if the request is for the current user
    if (friendRequest.toUser.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to accept this request' });
    }

    // Check if request is still pending
    if (friendRequest.status !== 'pending') {
      return res.status(400).json({ message: 'Friend request has already been processed' });
    }

    // Update request status
    friendRequest.status = 'accepted';
    await friendRequest.save();

    // Add each other to friends list
    await User.findByIdAndUpdate(req.user._id, {
      $addToSet: { friends: friendRequest.fromUser._id },
    });

    await User.findByIdAndUpdate(friendRequest.fromUser._id, {
      $addToSet: { friends: req.user._id },
    });

    // Create notifications for both users (currentUser already fetched above)
    const notificationToSender = await Notification.create({
      userId: friendRequest.fromUser._id,
      type: 'friend_request_accepted',
      message: `${currentUser.displayName || currentUser.name} accepted your friend request`,
      isRead: false,
      relatedUserId: req.user._id,
    });

    const notificationToAccepter = await Notification.create({
      userId: req.user._id,
      type: 'friend_request_accepted',
      message: `You accepted ${friendRequest.fromUser.displayName || friendRequest.fromUser.name}'s friend request`,
      isRead: false,
      relatedUserId: friendRequest.fromUser._id,
    });

    // Get updated friends list for both users
    const accepterUser = await User.findById(req.user._id)
      .populate('friends', 'name displayName username profilePhoto')
      .select('friends');
    
    const senderUser = await User.findById(friendRequest.fromUser._id)
      .populate('friends', 'name displayName username profilePhoto')
      .select('friends');

    // Emit real-time updates to both users
    emitToUser(friendRequest.fromUser._id.toString(), 'friend_request_accepted', {
      notification: {
        id: notificationToSender._id.toString(),
        type: notificationToSender.type,
        message: notificationToSender.message,
        timestamp: notificationToSender.createdAt,
        isRead: notificationToSender.isRead,
        relatedUserId: req.user._id.toString(),
      },
      newFriend: {
        id: req.user._id.toString(),
        name: currentUser.displayName || currentUser.name,
        username: currentUser.username,
        avatar: currentUser.profilePhoto || '',
        isOnline: false,
      },
      friends: senderUser.friends.map(friend => ({
        id: friend._id.toString(),
        name: friend.displayName || friend.name,
        username: friend.username,
        avatar: friend.profilePhoto || '',
        isOnline: false,
      })),
    });

    emitToUser(req.user._id.toString(), 'friend_request_accepted', {
      notification: {
        id: notificationToAccepter._id.toString(),
        type: notificationToAccepter.type,
        message: notificationToAccepter.message,
        timestamp: notificationToAccepter.createdAt,
        isRead: notificationToAccepter.isRead,
        relatedUserId: friendRequest.fromUser._id.toString(),
      },
      newFriend: {
        id: friendRequest.fromUser._id.toString(),
        name: friendRequest.fromUser.displayName || friendRequest.fromUser.name,
        username: friendRequest.fromUser.username,
        avatar: friendRequest.fromUser.profilePhoto || '',
        isOnline: false,
      },
      friends: accepterUser.friends.map(friend => ({
        id: friend._id.toString(),
        name: friend.displayName || friend.name,
        username: friend.username,
        avatar: friend.profilePhoto || '',
        isOnline: false,
      })),
    });

    return res.status(200).json({
      message: 'Friend request accepted successfully',
    });
  } catch (error) {
    console.error('Accept friend request error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Reject friend request
// @route   POST /api/friend-requests/reject/:requestId
// @access  Private
const rejectFriendRequest = async (req, res) => {
  try {
    const { requestId } = req.params;

    // Find the friend request
    const friendRequest = await FriendRequest.findById(requestId)
      .populate('fromUser', 'name displayName');

    if (!friendRequest) {
      return res.status(404).json({ message: 'Friend request not found' });
    }

    // Verify that the request exists and belongs to the current user
    if (!friendRequest.fromUser) {
      return res.status(404).json({ message: 'Sender user not found' });
    }

    // Check if the request is for the current user
    if (friendRequest.toUser.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to reject this request' });
    }

    // Check if request is still pending
    if (friendRequest.status !== 'pending') {
      return res.status(400).json({ message: 'Friend request has already been processed' });
    }

    // Update request status
    friendRequest.status = 'rejected';
    await friendRequest.save();

    // Create notification for the sender (optional - can be removed if not needed)
    const currentUser = await User.findById(req.user._id);
    const notification = await Notification.create({
      userId: friendRequest.fromUser._id,
      type: 'friend_request_rejected',
      message: `${currentUser.displayName || currentUser.name} declined your friend request`,
      isRead: false,
      relatedUserId: req.user._id,
    });

    // Emit real-time notification to sender
    emitToUser(friendRequest.fromUser._id.toString(), 'friend_request_rejected', {
      notification: {
        id: notification._id.toString(),
        type: notification.type,
        message: notification.message,
        timestamp: notification.createdAt,
        isRead: notification.isRead,
        relatedUserId: req.user._id.toString(),
      },
      requestId: requestId,
    });

    return res.status(200).json({
      message: 'Friend request rejected successfully',
    });
  } catch (error) {
    console.error('Reject friend request error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getFriendRequests,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
};

