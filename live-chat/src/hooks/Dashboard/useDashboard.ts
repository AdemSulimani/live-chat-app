import { useState, useRef, useEffect, useMemo } from 'react';
import { useUser } from '../../contexts/UserContext';
import { useSocket } from '../../contexts/SocketContext';

interface Friend {
    id: string;
    name: string;
    username: string;
    avatar: string;
    isOnline: boolean;
    lastSeen?: string;
}

interface Message {
    id: string;
    senderId: string;
    receiverId: string;
    content: string;
    timestamp: Date;
    isRead: boolean;
}

interface FriendRequest {
    id: string;
    fromUserId: string;
    fromUserName: string;
    fromUserAvatar: string;
    timestamp: Date;
}

interface Notification {
    id: string;
    type: 'friend_request' | 'friend_request_accepted' | 'friend_request_rejected' | 'message' | 'friend_online';
    message: string;
    timestamp: Date;
    isRead: boolean;
}

interface User {
    id: string;
    name: string;
    username: string;
    avatar: string;
    status: string;
    bio?: string;
    statusMessage?: string;
}

export function useDashboard() {
    const [friends, setFriends] = useState<Friend[]>([]);
    const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
    const [showSidebar, setShowSidebar] = useState(true);
    const [messages, setMessages] = useState<Message[]>([]);
    const [messageInput, setMessageInput] = useState('');
    const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddFriend, setShowAddFriend] = useState(false);
    const [showFriendRequests, setShowFriendRequests] = useState(false);
    const [showMiniProfile, setShowMiniProfile] = useState(false);
    const [showMoreOptions, setShowMoreOptions] = useState(false);
    const [showBlockConfirm, setShowBlockConfirm] = useState(false);
    const [addFriendInput, setAddFriendInput] = useState('');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);

    const { user, getToken } = useUser();
    const { socket } = useSocket();
    
    // Convert context user to Dashboard User format
    const currentUser: User = user ? {
        id: user.id,
        name: user.displayName || user.name || 'User',
        username: user.username || '',
        avatar: user.profilePhoto || '',
        status: 'Online',
        bio: user.bio,
        statusMessage: user.statusMessage
    } : {
        id: '',
        name: 'Guest',
        username: '',
        avatar: '',
        status: 'Offline',
        bio: '',
        statusMessage: ''
    };

    // Scroll to bottom when new messages arrive
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    // Show sidebar on desktop, handle mobile separately
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth > 768) {
                setShowSidebar(true);
            }
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Calculate unread notifications using useMemo for optimization
    const unreadCount = useMemo(() => {
        return notifications.filter(n => !n.isRead).length;
    }, [notifications]);

    // Load data from API when component mounts
    useEffect(() => {
        const loadData = async () => {
            const token = getToken();
            if (!token || !user) {
                setLoading(false);
                return;
            }

            try {
                // Load friends
                const friendsResponse = await fetch('http://localhost:5000/api/friends', {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                });

                if (friendsResponse.ok) {
                    const friendsData = await friendsResponse.json();
                    const formattedFriends = (friendsData.friends || []).map((friend: any) => ({
                        ...friend,
                        timestamp: friend.timestamp ? new Date(friend.timestamp) : new Date(),
                    }));
                    setFriends(formattedFriends);
                } else if (friendsResponse.status === 401) {
                    // Unauthorized - token expired or invalid
                    console.error('Authentication failed');
                    // Will be handled by ProtectedRoute
                } else {
                    const errorData = await friendsResponse.json().catch(() => ({ message: 'Failed to load friends' }));
                    console.error('Error loading friends:', errorData.message);
                }

                // Load friend requests
                const requestsResponse = await fetch('http://localhost:5000/api/friend-requests', {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                });

                if (requestsResponse.ok) {
                    const requestsData = await requestsResponse.json();
                    // Only show received requests in the sidebar
                    const formattedRequests = (requestsData.received || []).map((request: any) => ({
                        ...request,
                        timestamp: request.timestamp ? new Date(request.timestamp) : new Date(),
                    }));
                    setFriendRequests(formattedRequests);
                } else if (requestsResponse.status === 401) {
                    // Unauthorized - token expired or invalid
                    console.error('Authentication failed');
                } else {
                    const errorData = await requestsResponse.json().catch(() => ({ message: 'Failed to load friend requests' }));
                    console.error('Error loading friend requests:', errorData.message);
                }

                // Load notifications
                const notificationsResponse = await fetch('http://localhost:5000/api/notifications', {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                });

                if (notificationsResponse.ok) {
                    const notificationsData = await notificationsResponse.json();
                    const formattedNotifications = (notificationsData.notifications || []).map((notification: any) => ({
                        ...notification,
                        timestamp: notification.timestamp ? new Date(notification.timestamp) : new Date(),
                    }));
                    setNotifications(formattedNotifications);
                } else if (notificationsResponse.status === 401) {
                    // Unauthorized - token expired or invalid
                    console.error('Authentication failed');
                } else {
                    const errorData = await notificationsResponse.json().catch(() => ({ message: 'Failed to load notifications' }));
                    console.error('Error loading notifications:', errorData.message);
                }
            } catch (error) {
                console.error('Error loading dashboard data:', error);
                // Network error or other unexpected errors
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [user, getToken]);

    // Listen to WebSocket events for real-time updates
    useEffect(() => {
        if (!socket) return;

        // Listen for friend request received
        socket.on('friend_request_received', (data: any) => {
            // Add notification
            setNotifications(prev => [
                {
                    id: data.notification.id,
                    type: data.notification.type as any,
                    message: data.notification.message,
                    timestamp: new Date(data.notification.timestamp),
                    isRead: data.notification.isRead,
                },
                ...prev
            ]);

            // Add friend request
            setFriendRequests(prev => [
                {
                    id: data.friendRequest.id,
                    fromUserId: data.friendRequest.fromUserId,
                    fromUserName: data.friendRequest.fromUserName,
                    fromUserAvatar: data.friendRequest.fromUserAvatar,
                    timestamp: new Date(data.friendRequest.timestamp),
                },
                ...prev
            ]);
        });

        // Listen for friend request accepted
        socket.on('friend_request_accepted', (data: any) => {
            // Add notification
            setNotifications(prev => [
                {
                    id: data.notification.id,
                    type: data.notification.type as any,
                    message: data.notification.message,
                    timestamp: new Date(data.notification.timestamp),
                    isRead: data.notification.isRead,
                },
                ...prev
            ]);

            // Update friends list
            setFriends(data.friends);

            // Remove friend request if it exists
            setFriendRequests(prev => prev.filter(r => r.fromUserId !== data.newFriend.id));
        });

        // Listen for friend request rejected
        socket.on('friend_request_rejected', (data: any) => {
            // Add notification if needed
            if (data.notification) {
                setNotifications(prev => [
                    {
                        id: data.notification.id,
                        type: data.notification.type as any,
                        message: data.notification.message,
                        timestamp: new Date(data.notification.timestamp),
                        isRead: data.notification.isRead,
                    },
                    ...prev
                ]);
            }

            // Remove friend request
            setFriendRequests(prev => prev.filter(r => r.id !== data.requestId));
        });

        // Cleanup listeners on unmount
        return () => {
            socket.off('friend_request_received');
            socket.off('friend_request_accepted');
            socket.off('friend_request_rejected');
        };
    }, [socket]);

    // Load messages for selected friend
    useEffect(() => {
        if (selectedFriend) {
            // Mock messages
            const mockMessages: Message[] = [
                { id: '1', senderId: selectedFriend.id, receiverId: 'current', content: 'Hey! How are you?', timestamp: new Date(Date.now() - 3600000), isRead: true },
                { id: '2', senderId: 'current', receiverId: selectedFriend.id, content: 'I\'m doing great, thanks!', timestamp: new Date(Date.now() - 1800000), isRead: true },
                { id: '3', senderId: selectedFriend.id, receiverId: 'current', content: 'Want to hang out later?', timestamp: new Date(Date.now() - 600000), isRead: true },
            ];
            setMessages(mockMessages);
            
            // Hide sidebar on mobile when friend is selected
            if (window.innerWidth <= 768) {
                setShowSidebar(false);
            }
        } else {
            setMessages([]);
            // Show sidebar on mobile when no friend is selected
            if (window.innerWidth <= 768) {
                setShowSidebar(true);
            }
        }
    }, [selectedFriend]);
    
    const handleFriendClick = (friend: Friend) => {
        setSelectedFriend(friend);
    };
    
    const handleBackToSidebar = () => {
        setShowSidebar(true);
        setSelectedFriend(null);
    };

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (messageInput.trim() && selectedFriend) {
            const newMessage: Message = {
                id: Date.now().toString(),
                senderId: 'current',
                receiverId: selectedFriend.id,
                content: messageInput.trim(),
                timestamp: new Date(),
                isRead: false
            };
            setMessages(prev => [...prev, newMessage]);
            setMessageInput('');
        }
    };

    const handleAddFriend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!addFriendInput.trim()) return;

        const token = getToken();
        if (!token) {
            console.error('No token available');
            setErrorMessage('You must be logged in to add a friend');
            setTimeout(() => setErrorMessage(null), 5000);
            return;
        }

        try {
            // First, find user by username or email
            const searchInput = addFriendInput.trim();
            const isEmail = searchInput.includes('@');
            
            const findUserResponse = await fetch(
                `http://localhost:5000/api/users/find?${isEmail ? 'email' : 'username'}=${encodeURIComponent(searchInput)}`,
                {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                }
            );

            const findUserData = await findUserResponse.json();

            if (!findUserResponse.ok) {
                if (findUserResponse.status === 401) {
                    setErrorMessage('Your session has expired. Please login again.');
                    setTimeout(() => setErrorMessage(null), 5000);
                    return;
                } else if (findUserResponse.status === 404) {
                    setErrorMessage('User does not exist');
                    setTimeout(() => setErrorMessage(null), 5000);
                } else {
                    setErrorMessage(findUserData.message || 'Failed to find user');
                    setTimeout(() => setErrorMessage(null), 5000);
                }
                return;
            }

            const targetUserId = findUserData.user.id;

            // Now send friend request
            const response = await fetch('http://localhost:5000/api/friend-requests/send', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: targetUserId,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                if (response.status === 401) {
                    setErrorMessage('Your session has expired. Please login again.');
                    setTimeout(() => setErrorMessage(null), 5000);
                    return;
                }
                setErrorMessage(data.message || 'Failed to send friend request');
                setTimeout(() => setErrorMessage(null), 5000);
                return;
            }

            // Show success message
            setSuccessMessage(`Sent a friend request to ${findUserData.user.name}`);
            setTimeout(() => setSuccessMessage(null), 5000);

            // Refresh friend requests and notifications
            const [requestsResponse, notificationsResponse] = await Promise.all([
                fetch('http://localhost:5000/api/friend-requests', {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                }),
                fetch('http://localhost:5000/api/notifications', {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                }),
            ]);

            if (requestsResponse.ok) {
                const requestsData = await requestsResponse.json();
                setFriendRequests(requestsData.received || []);
            } else if (requestsResponse.status === 401) {
                console.error('Authentication failed');
            }

            if (notificationsResponse.ok) {
                const notificationsData = await notificationsResponse.json();
                const formattedNotifications = (notificationsData.notifications || []).map((notification: any) => ({
                    ...notification,
                    timestamp: notification.timestamp ? new Date(notification.timestamp) : new Date(),
                }));
                setNotifications(formattedNotifications);
            } else if (notificationsResponse.status === 401) {
                console.error('Authentication failed');
            }

            setAddFriendInput('');
            // Don't close form immediately, let user see success message
            setTimeout(() => {
                setShowAddFriend(false);
                setSuccessMessage(null);
            }, 2000);
        } catch (error) {
            console.error('Error adding friend:', error);
            alert('Failed to send friend request. Please try again.');
        }
    };

    const handleAcceptFriendRequest = async (requestId: string) => {
        const token = getToken();
        if (!token) {
            console.error('No token available');
            return;
        }

        try {
            const response = await fetch(`http://localhost:5000/api/friend-requests/accept/${requestId}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            const data = await response.json();

            if (!response.ok) {
                if (response.status === 401) {
                    setErrorMessage('Your session has expired. Please login again.');
                    setTimeout(() => setErrorMessage(null), 5000);
                    return;
                }
                console.error('Error accepting friend request:', data.message);
                setErrorMessage(data.message || 'Failed to accept friend request');
                setTimeout(() => setErrorMessage(null), 5000);
                return;
            }

            // Refresh friends, friend requests, and notifications
            const [friendsResponse, requestsResponse, notificationsResponse] = await Promise.all([
                fetch('http://localhost:5000/api/friends', {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                }),
                fetch('http://localhost:5000/api/friend-requests', {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                }),
                fetch('http://localhost:5000/api/notifications', {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                }),
            ]);

            if (friendsResponse.ok) {
                const friendsData = await friendsResponse.json();
                const formattedFriends = (friendsData.friends || []).map((friend: any) => ({
                    ...friend,
                    timestamp: friend.timestamp ? new Date(friend.timestamp) : new Date(),
                }));
                setFriends(formattedFriends);
            }

            if (requestsResponse.ok) {
                const requestsData = await requestsResponse.json();
                const formattedRequests = (requestsData.received || []).map((request: any) => ({
                    ...request,
                    timestamp: request.timestamp ? new Date(request.timestamp) : new Date(),
                }));
                setFriendRequests(formattedRequests);
            } else if (requestsResponse.status === 401) {
                console.error('Authentication failed');
            }

            if (notificationsResponse.ok) {
                const notificationsData = await notificationsResponse.json();
                const formattedNotifications = (notificationsData.notifications || []).map((notification: any) => ({
                    ...notification,
                    timestamp: notification.timestamp ? new Date(notification.timestamp) : new Date(),
                }));
                setNotifications(formattedNotifications);
            } else if (notificationsResponse.status === 401) {
                console.error('Authentication failed');
            }
        } catch (error) {
            console.error('Error accepting friend request:', error);
            if (error instanceof TypeError && error.message.includes('fetch')) {
                setErrorMessage('Network error. Please check your connection and try again.');
            } else {
                setErrorMessage('Failed to accept friend request. Please try again.');
            }
            setTimeout(() => setErrorMessage(null), 5000);
        }
    };

    const handleRejectFriendRequest = async (requestId: string) => {
        const token = getToken();
        if (!token) {
            console.error('No token available');
            return;
        }

        try {
            const response = await fetch(`http://localhost:5000/api/friend-requests/reject/${requestId}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            const data = await response.json();

            if (!response.ok) {
                if (response.status === 401) {
                    setErrorMessage('Your session has expired. Please login again.');
                    setTimeout(() => setErrorMessage(null), 5000);
                    return;
                }
                console.error('Error rejecting friend request:', data.message);
                setErrorMessage(data.message || 'Failed to reject friend request');
                setTimeout(() => setErrorMessage(null), 5000);
                return;
            }

            // Refresh friend requests and notifications
            const [requestsResponse, notificationsResponse] = await Promise.all([
                fetch('http://localhost:5000/api/friend-requests', {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                }),
                fetch('http://localhost:5000/api/notifications', {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                }),
            ]);

            if (requestsResponse.ok) {
                const requestsData = await requestsResponse.json();
                const formattedRequests = (requestsData.received || []).map((request: any) => ({
                    ...request,
                    timestamp: request.timestamp ? new Date(request.timestamp) : new Date(),
                }));
                setFriendRequests(formattedRequests);
            }

            if (notificationsResponse.ok) {
                const notificationsData = await notificationsResponse.json();
                const formattedNotifications = (notificationsData.notifications || []).map((notification: any) => ({
                    ...notification,
                    timestamp: notification.timestamp ? new Date(notification.timestamp) : new Date(),
                }));
                setNotifications(formattedNotifications);
            }
        } catch (error) {
            console.error('Error rejecting friend request:', error);
            alert('Failed to reject friend request');
        }
    };

    const handleMarkNotificationAsRead = async (notificationId: string) => {
        const token = getToken();
        if (!token) {
            console.error('No token available');
            return;
        }

        try {
            const response = await fetch(`http://localhost:5000/api/notifications/${notificationId}/read`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                if (response.status === 401) {
                    console.error('Authentication failed');
                    return;
                }
                const data = await response.json().catch(() => ({ message: 'Failed to mark notification as read' }));
                console.error('Error marking notification as read:', data.message);
                return;
            }

            // Update local state
        setNotifications(prev =>
            prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
        );
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    };

    const handleMarkAllNotificationsAsRead = async () => {
        const token = getToken();
        if (!token) {
            console.error('No token available');
            return;
        }

        try {
            const response = await fetch('http://localhost:5000/api/notifications/read-all', {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                if (response.status === 401) {
                    console.error('Authentication failed');
                    return;
                }
                const data = await response.json().catch(() => ({ message: 'Failed to mark all notifications as read' }));
                console.error('Error marking all notifications as read:', data.message);
                return;
            }

            // Update local state
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        } catch (error) {
            console.error('Error marking all notifications as read:', error);
        }
    };

    const handleDeleteChat = () => {
        if (selectedFriend) {
            setMessages([]);
            setSelectedFriend(null);
            setShowMoreOptions(false);
            console.log(`Chat with ${selectedFriend.name} deleted`);
        }
    };

    const handleBlockUser = () => {
        setShowMoreOptions(false);
        setShowBlockConfirm(true);
    };

    const confirmBlockUser = () => {
        if (selectedFriend) {
            setFriends(prev => prev.filter(f => f.id !== selectedFriend.id));
            setSelectedFriend(null);
            setMessages([]);
            setShowBlockConfirm(false);
            console.log(`${selectedFriend.name} has been blocked`);
        }
    };

    const cancelBlockUser = () => {
        setShowBlockConfirm(false);
    };

    return {
        friends,
        selectedFriend,
        setSelectedFriend,
        showSidebar,
        setShowSidebar,
        messages,
        messageInput,
        setMessageInput,
        friendRequests,
        notifications,
        showAddFriend,
        setShowAddFriend,
        showFriendRequests,
        setShowFriendRequests,
        showMiniProfile,
        setShowMiniProfile,
        showMoreOptions,
        setShowMoreOptions,
        showBlockConfirm,
        setShowBlockConfirm,
        addFriendInput,
        setAddFriendInput,
        unreadCount,
        currentUser,
        loading,
        errorMessage,
        successMessage,
        setErrorMessage,
        setSuccessMessage,
        messagesEndRef,
        chatContainerRef,
        handleSendMessage,
        handleAddFriend,
        handleAcceptFriendRequest,
        handleRejectFriendRequest,
        handleMarkNotificationAsRead,
        handleMarkAllNotificationsAsRead,
        handleFriendClick,
        handleBackToSidebar,
        handleDeleteChat,
        handleBlockUser,
        confirmBlockUser,
        cancelBlockUser
    };
}

