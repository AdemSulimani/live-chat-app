import { useState, useRef, useEffect } from 'react';
import { useUser } from '../../contexts/UserContext';

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
    type: 'friend_request' | 'message' | 'friend_online';
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
    const [friends, setFriends] = useState<Friend[]>([
        { id: '1', name: 'John Doe', username: 'johndoe', avatar: '', isOnline: true },
        { id: '2', name: 'Jane Smith', username: 'janesmith', avatar: '', isOnline: false },
        { id: '3', name: 'Mike Johnson', username: 'mikej', avatar: '', isOnline: true },
    ]);

    const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
    const [showSidebar, setShowSidebar] = useState(true);
    const [messages, setMessages] = useState<Message[]>([]);
    const [messageInput, setMessageInput] = useState('');
    const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([
        { id: '1', fromUserId: '4', fromUserName: 'Alice Brown', fromUserAvatar: '', timestamp: new Date() },
    ]);
    const [notifications, setNotifications] = useState<Notification[]>([
        { id: '1', type: 'friend_request', message: 'Alice Brown sent you a friend request', timestamp: new Date(), isRead: false },
        { id: '2', type: 'message', message: 'New message from John Doe', timestamp: new Date(), isRead: false },
    ]);
    const [showAddFriend, setShowAddFriend] = useState(false);
    const [showFriendRequests, setShowFriendRequests] = useState(false);
    const [showMiniProfile, setShowMiniProfile] = useState(false);
    const [showMoreOptions, setShowMoreOptions] = useState(false);
    const [showBlockConfirm, setShowBlockConfirm] = useState(false);
    const [addFriendInput, setAddFriendInput] = useState('');
    const [unreadCount, setUnreadCount] = useState(0);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);

    const { user } = useUser();
    
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

    // Calculate unread notifications
    useEffect(() => {
        const unread = notifications.filter(n => !n.isRead).length;
        setUnreadCount(unread);
    }, [notifications]);

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

    const handleAddFriend = (e: React.FormEvent) => {
        e.preventDefault();
        if (addFriendInput.trim()) {
            // Mock adding friend
            const newFriend: Friend = {
                id: Date.now().toString(),
                name: addFriendInput.trim(),
                username: addFriendInput.trim().toLowerCase(),
                avatar: '',
                isOnline: false
            };
            setFriends(prev => [...prev, newFriend]);
            setAddFriendInput('');
            setShowAddFriend(false);
            
            // Add notification
            const newNotification: Notification = {
                id: Date.now().toString(),
                type: 'friend_request',
                message: `${newFriend.name} has been added to your friends`,
                timestamp: new Date(),
                isRead: false
            };
            setNotifications(prev => [newNotification, ...prev]);
        }
    };

    const handleAcceptFriendRequest = (requestId: string) => {
        const request = friendRequests.find(r => r.id === requestId);
        if (request) {
            const newFriend: Friend = {
                id: request.fromUserId,
                name: request.fromUserName,
                username: request.fromUserName.toLowerCase().replace(' ', ''),
                avatar: request.fromUserAvatar,
                isOnline: false
            };
            setFriends(prev => [...prev, newFriend]);
            setFriendRequests(prev => prev.filter(r => r.id !== requestId));
            
            // Add notification
            const newNotification: Notification = {
                id: Date.now().toString(),
                type: 'friend_request',
                message: `You accepted ${request.fromUserName}'s friend request`,
                timestamp: new Date(),
                isRead: false
            };
            setNotifications(prev => [newNotification, ...prev]);
        }
    };

    const handleRejectFriendRequest = (requestId: string) => {
        setFriendRequests(prev => prev.filter(r => r.id !== requestId));
    };

    const handleMarkNotificationAsRead = (notificationId: string) => {
        setNotifications(prev =>
            prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
        );
    };

    const handleMarkAllNotificationsAsRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
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

