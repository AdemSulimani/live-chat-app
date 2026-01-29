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
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [isTyping, setIsTyping] = useState(false); // Tregues typing për shokun e zgjedhur
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const [hasMoreMessages, setHasMoreMessages] = useState(false); // Për pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [loadingMoreMessages, setLoadingMoreMessages] = useState(false);
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
    const { socket, isConnected } = useSocket();
    
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

    // ============================================
    // SCROLL AUTOMATIC TO BOTTOM
    // ============================================
    // Scroll automatik te mesazhi i fundit kur:
    // - Mesazhet e reja shtohen (real-time)
    // - Mesazhet ngarkohen nga API
    // - Komponenti mount-ohet
    useEffect(() => {
        if (messagesEndRef.current && messages.length > 0) {
            // Përdor setTimeout për të garantuar që DOM është përditësuar
            setTimeout(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
                }
            }, 100);
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

        // ============================================
        // LISTEN FOR NEW MESSAGES (Real-time)
        // ============================================
        // Dëgjo për mesazhe të reja që vijnë nga shokët përmes socket
        // Mesazhet e reja shtohen real-time në state, por janë tashmë të ruajtura në databazë
        // nga backend (shih socketServer.js - send_message handler)
        // 
        // Kjo garanton që:
        // - Mesazhet shfaqen menjëherë (real-time)
        // - Mesazhet ruhen në databazë (persistence)
        // - Pas refresh, mesazhet ngarkohen nga databaza (shih useEffect më lart)
        socket.on('new_message', (data: any) => {
            const message = data.message;
            
            // Kontrollo nëse mesazhi është për shokun e zgjedhur aktualisht
            if (selectedFriend && 
                (message.senderId === selectedFriend.id || message.receiverId === selectedFriend.id)) {
                
                // Formatizo mesazhin për frontend
                const formattedMessage: Message = {
                    id: message.id,
                    senderId: message.senderId === user?.id ? 'current' : message.senderId,
                    receiverId: message.receiverId === user?.id ? 'current' : message.receiverId,
                    content: message.content,
                    timestamp: new Date(message.timestamp),
                    isRead: message.isRead,
                };

                // Shto mesazhin në state (vetëm nëse nuk ekziston tashmë)
                // Kjo është për mesazhet e reja real-time
                // Mesazhet e vjetra tashmë janë ngarkuar nga API (shih useEffect më lart)
                setMessages(prev => {
                    // Kontrollo nëse mesazhi ekziston tashmë (për të shmangur duplicates)
                    // Kjo mund të ndodhë nëse mesazhi u ngarkua tashmë nga API dhe u dërgua përsëri përmes socket
                    const exists = prev.some(msg => msg.id === formattedMessage.id);
                    if (exists) {
                        return prev;
                    }
                    return [...prev, formattedMessage];
                });
            }
        });

        // ============================================
        // LISTEN FOR TYPING INDICATORS
        // ============================================
        // Dëgjo për typing_start dhe typing_stop events
        socket.on('user_typing', (data: any) => {
            // Kontrollo nëse typing indicator është për shokun e zgjedhur aktualisht
            if (selectedFriend && data.userId === selectedFriend.id) {
                setIsTyping(data.isTyping);
            }
        });

        // ============================================
        // LISTEN FOR MESSAGE READ STATUS
        // ============================================
        // Dëgjo për message_read event - kur mesazhi lexohet nga marrësi
        socket.on('message_read', (data: any) => {
            const { messageId } = data;
            
            // Përditëso statusin e lexuar për mesazhet e përdoruesit aktual
            setMessages(prev =>
                prev.map(msg => 
                    msg.id === messageId ? { ...msg, isRead: true } : msg
                )
            );
        });

        // Cleanup listeners on unmount
        return () => {
            socket.off('friend_request_received');
            socket.off('friend_request_accepted');
            socket.off('friend_request_rejected');
            socket.off('new_message');
            socket.off('user_typing');
            socket.off('message_read');
        };
    }, [socket, selectedFriend, user]);

    // ============================================
    // SEND TYPING INDICATORS
    // ============================================
    // Dërgo typing_start dhe typing_stop events kur përdoruesi shkruan
    // VËREJTJE: isTyping state tregon vetëm kur SHOKU po shkruan, jo kur përdoruesi aktual po shkruan
    useEffect(() => {
        if (!socket || !selectedFriend || !messageInput.trim()) {
            // Nëse nuk ka socket, shok të zgjedhur, ose input është bosh, dërgo typing_stop
            if (socket && selectedFriend) {
                socket.emit('typing_stop', { receiverId: selectedFriend.id });
            }
            // NUK vendosim setIsTyping(false) këtu sepse isTyping tregon statusin e shokut, jo të përdoruesit aktual
            return;
        }

        // Dërgo typing_start kur përdoruesi fillon të shkruajë
        // Kjo do të dërgojë event te shoku që do të shfaqë "typing..." për përdoruesin aktual
        socket.emit('typing_start', { receiverId: selectedFriend.id });
        
        // NUK vendosim setIsTyping(true) këtu sepse isTyping tregon kur SHOKU po shkruan
        // setIsTyping vendoset vetëm kur merret 'user_typing' event nga shoku (shih listener më lart)

        // Clear timeout i mëparshëm nëse ekziston
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        // Dërgo typing_stop pas 2 sekondash pa aktivitet
        typingTimeoutRef.current = setTimeout(() => {
            if (socket && selectedFriend) {
                socket.emit('typing_stop', { receiverId: selectedFriend.id });
            }
            // NUK vendosim setIsTyping(false) këtu sepse isTyping tregon statusin e shokut
        }, 2000);

        // Cleanup timeout në unmount ose kur ndryshon input
        return () => {
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }
        };
    }, [messageInput, socket, selectedFriend]);

    // ============================================
    // MARK MESSAGES AS READ
    // ============================================
    // Dërgo message_received kur mesazhet shfaqen (për të shënuar si të lexuara)
    useEffect(() => {
        if (!socket || !selectedFriend || messages.length === 0) {
            return;
        }

        // Gjej mesazhet e palexuara nga shoku i zgjedhur
        const unreadMessages = messages.filter(
            msg => msg.senderId === selectedFriend.id && !msg.isRead
        );

        // Dërgo message_received për çdo mesazh të palexuar
        unreadMessages.forEach(msg => {
            socket.emit('message_received', { messageId: msg.id });
        });
    }, [messages, socket, selectedFriend]);

    // ============================================
    // FETCH MESSAGES FROM API - PERSISTENCE AFTER REFRESH
    // ============================================
    // Mesazhet ruhen në databazë (backend), kështu që:
    // 1. Kur hapet chat me një shok, bëhet fetch nga API
    // 2. Mesazhet e reja shtohen real-time përmes socket (shih listener 'new_message' më poshtë)
    // 3. Pas refresh, mesazhet ngarkohen automatikisht nga databaza
    //
    // Kjo garanton që mesazhet nuk humbasin pas refresh ose mbyllje të browser-it
    useEffect(() => {
        const loadMessages = async () => {
            // Nëse nuk ka shok të zgjedhur, pastro mesazhet dhe typing indicator
            if (!selectedFriend) {
                setMessages([]);
                setIsTyping(false); // Hiq typing indicator kur nuk ka shok të zgjedhur
                // Show sidebar on mobile when no friend is selected
                if (window.innerWidth <= 768) {
                    setShowSidebar(true);
                }
                return;
            }
            
            // Hiq typing indicator kur ndryshon shoku i zgjedhur
            setIsTyping(false);

            const token = getToken();
            if (!token || !user) {
                return;
            }

            setLoadingMessages(true);
            try {
                // ============================================
                // GET /api/messages/:friendId
                // ============================================
                // Merr mesazhet e ruajtura nga databaza midis përdoruesit aktual dhe shokut të zgjedhur
                // Kjo funksionon edhe pas refresh - mesazhet janë të ruajtura në databazë
                // Pagination: default page 1, limit 50 mesazhe
                const response = await fetch(`http://localhost:5000/api/messages/${selectedFriend.id}?page=1&limit=50`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                });

                if (response.ok) {
                    const data = await response.json();
                    
                    // ============================================
                    // FORMAT MESSAGES FOR FRONTEND
                    // ============================================
                    // Konverto mesazhet nga format API në format frontend
                    // senderId duhet të jetë 'current' për mesazhet e përdoruesit aktual
                    // ose friendId për mesazhet e shokut
                    const formattedMessages: Message[] = (data.messages || []).map((msg: any) => ({
                        id: msg.id,
                        senderId: msg.senderId === user.id ? 'current' : msg.senderId,
                        receiverId: msg.receiverId === user.id ? 'current' : msg.receiverId,
                        content: msg.content,
                        timestamp: new Date(msg.timestamp),
                        isRead: msg.isRead,
                    }));
                    
                    // Ruaj mesazhet në state - do të shfaqen automatikisht në UI
                    // Këto janë mesazhet e ruajtura nga databaza (përfshirë pas refresh)
                    setMessages(formattedMessages);
                    
                    // ============================================
                    // PAGINATION: SET HAS MORE MESSAGES
                    // ============================================
                    // Kontrollo nëse ka më shumë mesazhe për të ngarkuar
                    if (data.pagination) {
                        setHasMoreMessages(data.pagination.hasMore || false);
                        setCurrentPage(1);
                    } else {
                        setHasMoreMessages(false);
                    }
                    
                    // ============================================
                    // PAGINATION: SET HAS MORE MESSAGES
                    // ============================================
                    // Kontrollo nëse ka më shumë mesazhe për të ngarkuar
                    if (data.pagination) {
                        setHasMoreMessages(data.pagination.hasMore || false);
                        setCurrentPage(1);
                    } else {
                        setHasMoreMessages(false);
                    }
                } else if (response.status === 401) {
                    // Unauthorized - token expired or invalid
                    console.error('Authentication failed');
                    // Will be handled by ProtectedRoute
                    setMessages([]);
                } else if (response.status === 403) {
                    // Forbidden - not friends or blocked
                    const errorData = await response.json().catch(() => ({ message: 'Cannot load messages' }));
                    console.error('Error loading messages:', errorData.message);
                    setMessages([]);
                } else {
                    const errorData = await response.json().catch(() => ({ message: 'Failed to load messages' }));
                    console.error('Error loading messages:', errorData.message);
                    setMessages([]);
                }
            } catch (error) {
                console.error('Error loading messages:', error);
                setMessages([]);
            } finally {
                setLoadingMessages(false);
            }

            // Hide sidebar on mobile when friend is selected
            if (window.innerWidth <= 768) {
                setShowSidebar(false);
            }
        };

        loadMessages();
    }, [selectedFriend, user, getToken]);

    // ============================================
    // LOAD MORE MESSAGES (PAGINATION)
    // ============================================
    // Funksion për të ngarkuar më shumë mesazhe (për chat të gjatë)
    const loadMoreMessages = async () => {
        if (!selectedFriend || !hasMoreMessages || loadingMoreMessages) {
            return;
        }

        const token = getToken();
        if (!token || !user) {
            return;
        }

        setLoadingMoreMessages(true);
        try {
            const nextPage = currentPage + 1;
            const response = await fetch(`http://localhost:5000/api/messages/${selectedFriend.id}?page=${nextPage}&limit=50`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (response.ok) {
                const data = await response.json();
                
                // Formatizo mesazhet
                const formattedMessages: Message[] = (data.messages || []).map((msg: any) => ({
                    id: msg.id,
                    senderId: msg.senderId === user.id ? 'current' : msg.senderId,
                    receiverId: msg.receiverId === user.id ? 'current' : msg.receiverId,
                    content: msg.content,
                    timestamp: new Date(msg.timestamp),
                    isRead: msg.isRead,
                }));
                
                // Shto mesazhet e vjetra në fillim (pasi janë më të vjetrat)
                setMessages(prev => [...formattedMessages, ...prev]);
                
                // Përditëso pagination state
                if (data.pagination) {
                    setHasMoreMessages(data.pagination.hasMore || false);
                    setCurrentPage(nextPage);
                } else {
                    setHasMoreMessages(false);
                }
            } else {
                console.error('Failed to load more messages');
                setHasMoreMessages(false);
            }
        } catch (error) {
            console.error('Error loading more messages:', error);
            setHasMoreMessages(false);
        } finally {
            setLoadingMoreMessages(false);
        }
    };
    
    const handleFriendClick = (friend: Friend) => {
        setSelectedFriend(friend);
    };
    
    const handleBackToSidebar = () => {
        setShowSidebar(true);
        setSelectedFriend(null);
    };

    // ============================================
    // SEND MESSAGE VIA SOCKET
    // ============================================
    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!messageInput.trim() || !selectedFriend) {
            return;
        }

        // ============================================
        // ERROR HANDLING: SOCKET CONNECTION CHECK
        // ============================================
        if (!socket || !isConnected) {
            setErrorMessage('Socket connection not available. Real-time messaging may not work. Please refresh the page.');
            setTimeout(() => setErrorMessage(null), 5000);
            return;
        }

        const messageContent = messageInput.trim();
        const tempId = `temp-${Date.now()}`; // Temporary ID për optimistic update
        
        // ============================================
        // OPTIMISTIC UPDATE
        // ============================================
        // Shto mesazhin optimistikisht në state për UI të shpejtë
        const optimisticMessage: Message = {
            id: tempId,
                senderId: 'current',
                receiverId: selectedFriend.id,
            content: messageContent,
                timestamp: new Date(),
                isRead: false
            };
        
        setMessages(prev => [...prev, optimisticMessage]);
        setMessageInput(''); // Pastro input menjëherë

        // ============================================
        // SEND VIA SOCKET
        // ============================================
        // Dërgo mesazhin përmes socket
        socket.emit('send_message', {
            receiverId: selectedFriend.id,
            content: messageContent,
        });

        // ============================================
        // HANDLE SOCKET RESPONSES
        // ============================================
        // Dëgjo për konfirmim të suksesit
        const handleMessageSent = (data: any) => {
            // Mesazhi u dërgua me sukses - zëvendëso optimistic message me mesazhin real
            const realMessage: Message = {
                id: data.data.id,
                senderId: data.data.senderId === user?.id ? 'current' : data.data.senderId,
                receiverId: data.data.receiverId === user?.id ? 'current' : data.data.receiverId,
                content: data.data.content,
                timestamp: new Date(data.data.timestamp),
                isRead: data.data.isRead,
            };

            // Zëvendëso optimistic message me mesazhin real
            setMessages(prev => 
                prev.map(msg => msg.id === tempId ? realMessage : msg)
            );

            // Hiq listener pasi mesazhi u dërgua me sukses
            socket.off('message_sent', handleMessageSent);
            socket.off('message_error', handleMessageError);
        };

        // Dëgjo për gabime
        const handleMessageError = (error: any) => {
            // Mesazhi dështoi - hiq optimistic message dhe trego gabim
            setMessages(prev => prev.filter(msg => msg.id !== tempId));
            setErrorMessage(error.message || 'Failed to send message. Please try again.');
            setTimeout(() => setErrorMessage(null), 5000);

            // Hiq listeners
            socket.off('message_sent', handleMessageSent);
            socket.off('message_error', handleMessageError);
        };

        // Regjistro listeners
        socket.once('message_sent', handleMessageSent);
        socket.once('message_error', handleMessageError);

        // Timeout fallback - nëse nuk marrim përgjigje brenda 10 sekondave
        setTimeout(() => {
            // Kontrollo nëse mesazhi optimistic ende ekziston (nuk u zëvendësua)
            setMessages(prev => {
                const stillOptimistic = prev.find(msg => msg.id === tempId);
                if (stillOptimistic) {
                    // Nuk morëm përgjigje - hiq optimistic message dhe trego gabim
                    setErrorMessage('Message sending timeout. Please check your connection and try again.');
                    setTimeout(() => setErrorMessage(null), 5000);
                    return prev.filter(msg => msg.id !== tempId);
                }
                return prev;
            });

            // Hiq listeners nëse ende janë aktiv
            socket.off('message_sent', handleMessageSent);
            socket.off('message_error', handleMessageError);
        }, 10000);
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
        loadingMessages,
        loadingMoreMessages,
        hasMoreMessages,
        isTyping,
        errorMessage,
        successMessage,
        setErrorMessage,
        setSuccessMessage,
        messagesEndRef,
        loadMoreMessages,
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

