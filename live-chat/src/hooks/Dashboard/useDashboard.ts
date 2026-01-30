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
    unreadCount?: number;
}

interface Message {
    id: string;
    senderId: string;
    receiverId: string;
    content: string;
    timestamp: Date;
    isRead: boolean;
    isEdited?: boolean;
    editedAt?: Date;
    isDeleted?: boolean;
    deletedAt?: Date;
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
    relatedUserId?: string | null;
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
    const previousSelectedFriendRef = useRef<Friend | null>(null);
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
    
    // Message edit and options state
    const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
    const [editMessageContent, setEditMessageContent] = useState('');
    const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
    const [showMessageOptions, setShowMessageOptions] = useState<string | null>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const isInitialLoadRef = useRef<boolean>(false);

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
    // HELPER: CHECK IF USER IS AT BOTTOM OF CHAT
    // ============================================
    // Kontrollo nëse useri është në fund të chat-it (ose shumë afër fundit)
    // Kjo përdoret për të vendosur nëse duhet të scroll-ojmë automatikisht
    const isUserAtBottom = (): boolean => {
        if (!chatContainerRef.current) return false;
        const container = chatContainerRef.current;
        const threshold = 100; // 100px nga fundi - nëse është brenda kësaj distance, konsiderohet "në fund"
        return container.scrollHeight - container.scrollTop - container.clientHeight <= threshold;
    };

    // ============================================
    // SCROLL AUTOMATIC TO BOTTOM
    // ============================================
    // Scroll automatik te mesazhi i fundit kur:
    // - Mesazhet e reja shtohen (real-time) - VETËM nëse useri është në fund
    // - Mesazhet ngarkohen nga API - gjithmonë scroll (kur hapet chat i ri)
    // - Komponenti mount-ohet
    // 
    // IMPORTANT: Kur mesazh i ri vjen nga shoku, scroll-ojmë VETËM nëse useri është tashmë në fund
    // Nëse useri ka scrolluar lart, mos scroll-ojmë (le të shohë badge/notification)
    useEffect(() => {
        if (chatContainerRef.current && messages.length > 0) {
            // Përdor setTimeout për të garantuar që DOM është përditësuar
            setTimeout(() => {
                if (chatContainerRef.current) {
                    // Nëse është ngarkim fillestar (kur hapet chat i ri), gjithmonë scroll-ojmë në fund
                    // Nëse është mesazh i ri real-time, scroll-ojmë vetëm nëse useri është në fund
                    if (isInitialLoadRef.current) {
                        // Ngarkim fillestar - gjithmonë scroll në fund
                        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
                        isInitialLoadRef.current = false; // Reset flag pas scroll
                    } else {
                        // Mesazh i ri real-time - scroll vetëm nëse useri është në fund
                        if (isUserAtBottom()) {
                            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
                        }
                    }
                }
            }, 50);
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
            const senderId = message.senderId;
            
            // Kontrollo nëse mesazhi është për shokun e zgjedhur aktualisht
            if (selectedFriend && 
                (senderId === selectedFriend.id || message.receiverId === selectedFriend.id)) {
                
                // Formatizo mesazhin për frontend
                const formattedMessage: Message = {
                    id: message.id,
                    senderId: senderId === user?.id ? 'current' : senderId,
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

                // ============================================
                // CLEAR TYPING INDICATOR WHEN MESSAGE RECEIVED
                // ============================================
                // Nëse mesazhi vjen nga shoku i zgjedhur, hiq typing indicator
                // Kjo garanton që typing indicator fshihet kur mesazhi merret
                if (senderId === selectedFriend.id) {
                    setIsTyping(false);
                }

                // ============================================
                // HANDLE UNREAD COUNT FOR RECEIVED MESSAGES
                // ============================================
                // Nëse mesazhi vjen nga shoku (jo nga useri aktual) dhe useri ka scrolluar lart,
                // rrit unreadCount për të treguar që ka mesazh të ri
                if (senderId !== user?.id && senderId === selectedFriend.id) {
                    // Kontrollo nëse useri është në fund të chat-it
                    // Nëse nuk është në fund, rrit unreadCount
                    setTimeout(() => {
                        if (!isUserAtBottom()) {
                            setFriends(prev => prev.map(friend => {
                                if (friend.id === senderId) {
                                    return {
                                        ...friend,
                                        unreadCount: (friend.unreadCount || 0) + 1,
                                    };
                                }
                                return friend;
                            }));
                        }
                    }, 100); // Përdor timeout për të lejuar që DOM të përditësohet dhe scroll pozicioni të llogaritet
                }
            } else if (senderId !== user?.id) {
                // Mesazhi vjen nga një shok tjetër (jo i zgjedhur aktualisht)
                // Rrit numrin e mesazheve të palexuara për atë shok
                setFriends(prev => prev.map(friend => {
                    if (friend.id === senderId) {
                        return {
                            ...friend,
                            unreadCount: (friend.unreadCount || 0) + 1,
                        };
                    }
                    return friend;
                }));
            }
        });

        // ============================================
        // LISTEN FOR NEW NOTIFICATIONS
        // ============================================
        socket.on('new_notification', (data: any) => {
            setNotifications(prev => [
                {
                    id: data.id,
                    type: data.type as any,
                    message: data.message,
                    timestamp: new Date(data.timestamp),
                    isRead: data.isRead,
                    relatedUserId: data.relatedUserId || null,
                },
                ...prev
            ]);
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

        // ============================================
        // LISTEN FOR MESSAGE EDITED (REAL-TIME SYNC)
        // ============================================
        // Dëgjo për message_edited event - kur mesazhi editohet nga përdoruesi tjetër
        // Kjo garanton që të gjithë pjesëmarrësit shohin ndryshimin menjëherë
        socket.on('message_edited', (data: any) => {
            const message = data.data;
            if (!message) return;

            // Kontrollo nëse mesazhi është për shokun e zgjedhur aktualisht
            // Ose nëse mesazhi është i përdoruesit aktual (për të përditësuar edhe nëse nuk është në chat)
            if (selectedFriend && 
                (message.senderId === selectedFriend.id || 
                 message.receiverId === selectedFriend.id ||
                 message.senderId === user?.id || 
                 message.receiverId === user?.id)) {
                
                // Formatizo mesazhin për frontend
                const formattedMessage: Message = {
                    id: message.id,
                    senderId: message.senderId === user?.id ? 'current' : message.senderId,
                    receiverId: message.receiverId === user?.id ? 'current' : message.receiverId,
                    content: message.content,
                    timestamp: new Date(message.timestamp),
                    isRead: message.isRead,
                    isEdited: message.isEdited || true,
                    editedAt: message.editedAt ? new Date(message.editedAt) : new Date(),
                };

                // Përditëso mesazhin në state menjëherë (real-time sync)
                // IMPORTANT: Përdorim .map() për të ruajtur pozicionin e mesazhit në listë
                // Mesazhi mbetet në të njëjtin pozicion edhe pas editimit nga përdoruesi tjetër
                setMessages(prev => {
                    // Kontrollo nëse mesazhi ekziston tashmë në listë
                    const messageExists = prev.some(msg => msg.id === formattedMessage.id);
                    if (messageExists) {
                        // Mesazhi ekziston - përditëso në vend
                        return prev.map(msg => 
                            msg.id === formattedMessage.id ? formattedMessage : msg
                        );
                    } else {
                        // Mesazhi nuk ekziston - shto në listë (nëse është për chat-in aktual)
                        return [...prev, formattedMessage];
                    }
                });
            }
        });

        // ============================================
        // LISTEN FOR MESSAGE DELETED (REAL-TIME SYNC)
        // ============================================
        // Dëgjo për message_deleted event - kur mesazhi fshihet nga përdoruesi tjetër
        // Kjo garanton që të gjithë pjesëmarrësit shohin fshirjen menjëherë
        socket.on('message_deleted', (data: any) => {
            const message = data.data;
            if (!message) return;

            // Kontrollo nëse mesazhi është për shokun e zgjedhur aktualisht
            // Ose nëse mesazhi është i përdoruesit aktual (për të përditësuar edhe nëse nuk është në chat)
            if (selectedFriend && 
                (message.senderId === selectedFriend.id || 
                 message.receiverId === selectedFriend.id ||
                 message.senderId === user?.id || 
                 message.receiverId === user?.id)) {
                
                // Formatizo mesazhin për frontend
                const formattedMessage: Message = {
                    id: message.id,
                    senderId: message.senderId === user?.id ? 'current' : message.senderId,
                    receiverId: message.receiverId === user?.id ? 'current' : message.receiverId,
                    content: message.content || 'This message was deleted',
                    timestamp: new Date(message.timestamp),
                    isRead: message.isRead,
                    isDeleted: message.isDeleted || true,
                    deletedAt: message.deletedAt ? new Date(message.deletedAt) : new Date(),
                };

                // Përditëso mesazhin në state menjëherë (real-time sync)
                // IMPORTANT: Përdorim .map() për të ruajtur pozicionin e mesazhit në listë
                // Mesazhi shfaqet si i fshirë në të njëjtin pozicion (nuk hiqet nga lista)
                setMessages(prev => {
                    // Kontrollo nëse mesazhi ekziston tashmë në listë
                    const messageExists = prev.some(msg => msg.id === formattedMessage.id);
                    if (messageExists) {
                        // Mesazhi ekziston - përditëso në vend
                        return prev.map(msg => 
                            msg.id === formattedMessage.id ? formattedMessage : msg
                        );
                    } else {
                        // Mesazhi nuk ekziston - shto në listë (nëse është për chat-in aktual)
                        return [...prev, formattedMessage];
                    }
                });
            }
        });

        // Cleanup listeners on unmount
        return () => {
            socket.off('friend_request_received');
            socket.off('friend_request_accepted');
            socket.off('friend_request_rejected');
            socket.off('new_message');
            socket.off('new_notification');
            socket.off('user_typing');
            socket.off('message_read');
            socket.off('message_edited');
            socket.off('message_deleted');
        };
    }, [socket, selectedFriend, user]);

    // ============================================
    // CLEANUP TYPING INDICATOR WHEN FRIEND CHANGES
    // ============================================
    // Kur ndryshon shoku i zgjedhur, dërgo typing_stop te shoku i mëparshëm
    useEffect(() => {
        if (!socket) return;

        const previousFriend = previousSelectedFriendRef.current;
        
        // Nëse ka shok të mëparshëm dhe është i ndryshëm nga ai aktual, dërgo typing_stop
        if (previousFriend && previousFriend.id !== selectedFriend?.id) {
            socket.emit('typing_stop', { receiverId: previousFriend.id });
        }

        // Përditëso ref me shokun aktual
        previousSelectedFriendRef.current = selectedFriend;

        // Cleanup: kur komponenti unmount-ohet, dërgo typing_stop
        return () => {
            if (previousSelectedFriendRef.current && socket) {
                socket.emit('typing_stop', { receiverId: previousSelectedFriendRef.current.id });
            }
        };
    }, [selectedFriend, socket]);

    // ============================================
    // SEND TYPING INDICATORS
    // ============================================
    // Dërgo typing_start dhe typing_stop events kur përdoruesi shkruan
    // VËREJTJE: isTyping state tregon vetëm kur SHOKU po shkruan, jo kur përdoruesi aktual po shkruan
    useEffect(() => {
        if (!socket || !selectedFriend) {
            return;
        }

        // Nëse input është bosh, dërgo typing_stop
        if (!messageInput.trim()) {
            socket.emit('typing_stop', { receiverId: selectedFriend.id });
            // Clear timeout nëse ekziston
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
                typingTimeoutRef.current = null;
            }
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

        // NUK dërgojmë më typing_stop automatikisht pas 2 sekondash
        // Typing indicator do të qëndrojë deri sa:
        // 1. Input bëhet bosh (përdoruesi ndalon së shkruari)
        // 2. Mesazhi dërgohet (shih handleSendMessage)
        // 3. Shoku i zgjedhur ndryshon

        // Cleanup timeout në unmount ose kur ndryshon input
        return () => {
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
                typingTimeoutRef.current = null;
            }
        };
    }, [messageInput, socket, selectedFriend]);

    // ============================================
    // TRACK ACTIVE CHAT
    // ============================================
    // Dërgo enter_chat kur përdoruesi hyn në chat me një shok
    // dhe leave_chat kur del nga chat
    // Gjithashtu shëno njoftimet e mesazheve si të lexuara kur hyn në chat
    useEffect(() => {
        if (!socket) return;

        if (selectedFriend) {
            // Përdoruesi hyn në chat me këtë shok
            socket.emit('enter_chat', { friendId: selectedFriend.id });

            // Shëno njoftimet e mesazheve për këtë shok si të lexuara
            const markNotificationsAsRead = async () => {
                const token = getToken();
                if (!token) return;

                try {
                    const response = await fetch(`http://localhost:5000/api/notifications/read-by-user/${selectedFriend.id}`, {
                        method: 'PUT',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json',
                        },
                    });

                    if (response.ok) {
                        // Përditëso state lokal për njoftimet
                        // Kjo do të përditësojë automatikisht unreadCount sepse ai llogaritet nga notifications
                        setNotifications(prev => prev.map(notification => {
                            // Kontrollo nëse njoftimi është mesazh dhe është nga shoku i zgjedhur
                            if (notification.type === 'message' && 
                                notification.relatedUserId && 
                                selectedFriend.id &&
                                notification.relatedUserId.toString() === selectedFriend.id.toString() && 
                                !notification.isRead) {
                                return { ...notification, isRead: true };
                            }
                            return notification;
                        }));
                    }
                } catch (error) {
                    console.error('Error marking notifications as read:', error);
                }
            };

            markNotificationsAsRead();
        } else {
            // Përdoruesi del nga chat
            socket.emit('leave_chat');
        }

        // Cleanup: kur komponenti unmount-ohet ose ndryshon selectedFriend, dërgo leave_chat
        return () => {
            if (socket) {
                socket.emit('leave_chat');
            }
        };
    }, [socket, selectedFriend, getToken]);

    // ============================================
    // MARK MESSAGES AS READ WHEN USER SCROLLS TO BOTTOM
    // ============================================
    // Kur useri scroll-on në fund manualisht dhe sheh mesazhet e reja,
    // shënoji si të lexuara dhe hiq unreadCount
    useEffect(() => {
        if (!socket || !selectedFriend || !chatContainerRef.current) {
            return;
        }

        const container = chatContainerRef.current;
        let scrollTimeout: NodeJS.Timeout | null = null;
        
        const handleScroll = () => {
            // Përdor debounce për të shmangur kontrollime të shumta
            if (scrollTimeout) {
                clearTimeout(scrollTimeout);
            }
            
            scrollTimeout = setTimeout(() => {
                // Kontrollo nëse useri është në fund (ose shumë afër fundit)
                if (isUserAtBottom()) {
                    // Gjej mesazhet e palexuara nga shoku i zgjedhur
                    const unreadMessages = messages.filter(
                        msg => msg.senderId === selectedFriend.id && !msg.isRead
                    );

                    // Nëse ka mesazhe të palexuara, shënoji si të lexuara
                    if (unreadMessages.length > 0) {
                        // Dërgo message_received për çdo mesazh të palexuar
                        unreadMessages.forEach(msg => {
                            socket.emit('message_received', { messageId: msg.id });
                        });

                        // Përditëso statusin e mesazheve në state
                        setMessages(prev => prev.map(msg => 
                            unreadMessages.some(unread => unread.id === msg.id)
                                ? { ...msg, isRead: true }
                                : msg
                        ));

                        // Rivendos numrin e mesazheve të palexuara për shokun e zgjedhur
                        setFriends(prev => prev.map(friend => {
                            if (friend.id === selectedFriend.id) {
                                return {
                                    ...friend,
                                    unreadCount: 0,
                                };
                            }
                            return friend;
                        }));
                    }
                }
            }, 150); // Debounce 150ms
        };

        // Shto event listener për scroll
        container.addEventListener('scroll', handleScroll);
        
        // Kontrollo edhe menjëherë nëse useri është tashmë në fund
        handleScroll();

        // Cleanup
        return () => {
            if (scrollTimeout) {
                clearTimeout(scrollTimeout);
            }
            container.removeEventListener('scroll', handleScroll);
        };
    }, [socket, selectedFriend, messages]);

    // ============================================
    // MARK MESSAGES AS READ
    // ============================================
    // Dërgo message_received kur mesazhet shfaqen (për të shënuar si të lexuara)
    // Kjo është për rastet kur mesazhet tashmë janë të lexuara kur hapet chat
    useEffect(() => {
        if (!socket || !selectedFriend || messages.length === 0) {
            return;
        }

        // Gjej mesazhet e palexuara nga shoku i zgjedhur
        const unreadMessages = messages.filter(
            msg => msg.senderId === selectedFriend.id && !msg.isRead
        );

        // Dërgo message_received për çdo mesazh të palexuar
        // VËREJTJE: Kjo do të funksionojë vetëm nëse useri është në fund
        // Për scroll manual, shih useEffect më lart
        if (unreadMessages.length > 0 && isUserAtBottom()) {
            unreadMessages.forEach(msg => {
                socket.emit('message_received', { messageId: msg.id });
            });

            // Rivendos numrin e mesazheve të palexuara për shokun e zgjedhur
            setFriends(prev => prev.map(friend => {
                if (friend.id === selectedFriend.id) {
                    return {
                        ...friend,
                        unreadCount: 0,
                    };
                }
                return friend;
            }));
        }
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
                isInitialLoadRef.current = false; // Reset flag
                // Show sidebar on mobile when no friend is selected
                if (window.innerWidth <= 768) {
                    setShowSidebar(true);
                }
                return;
            }
            
            // Hiq typing indicator kur ndryshon shoku i zgjedhur
            setIsTyping(false);
            // Reset flag kur ndryshon shoku - do të vendoset në true kur mesazhet ngarkohen
            isInitialLoadRef.current = false;

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
                        // Përfshi fusha për edit dhe delete për sync real-time
                        isEdited: msg.isEdited || false,
                        editedAt: msg.editedAt ? new Date(msg.editedAt) : undefined,
                        isDeleted: msg.isDeleted || false,
                        deletedAt: msg.deletedAt ? new Date(msg.deletedAt) : undefined,
                    }));
                    
                    // Ruaj mesazhet në state - do të shfaqen automatikisht në UI
                    // Këto janë mesazhet e ruajtura nga databaza (përfshirë pas refresh)
                    setMessages(formattedMessages);
                    
                    // Shëno që është ngarkim fillestar - scroll-ojmë gjithmonë në fund
                    isInitialLoadRef.current = true;
                    
                    // ============================================
                    // REQUEST TYPING STATUS WHEN ENTERING CHAT
                    // ============================================
                    // Kur hyn në chat, kërko typing status për shokun e zgjedhur
                    // Kjo garanton që typing indicator shfaqet edhe pas refresh
                    if (socket && selectedFriend) {
                        socket.emit('request_typing_status', { friendId: selectedFriend.id });
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
        // Rivendos numrin e mesazheve të palexuara kur shoku klikohet
        setFriends(prev => prev.map(f => {
            if (f.id === friend.id) {
                return {
                    ...f,
                    unreadCount: 0,
                };
            }
            return f;
        }));
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
        
        // Scroll menjëherë në fund pas shtimit të mesazhit optimistik
        setTimeout(() => {
            if (chatContainerRef.current) {
                chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
            }
        }, 10);

        // ============================================
        // STOP TYPING INDICATOR WHEN MESSAGE IS SENT
        // ============================================
        // Dërgo typing_stop menjëherë kur mesazhi dërgohet
        // Kjo garanton që typing indicator fshihet te përdoruesi tjetër
        socket.emit('typing_stop', { receiverId: selectedFriend.id });
        
        // Clear timeout nëse ekziston
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = null;
        }

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

    // ============================================
    // MESSAGE EDIT FUNCTIONS
    // ============================================
    const handleStartEdit = (messageId: string) => {
        // Gjej mesazhin që duhet të editohet
        const messageToEdit = messages.find(msg => msg.id === messageId);
        
        if (!messageToEdit) {
            setErrorMessage('Message not found');
            setTimeout(() => setErrorMessage(null), 5000);
            return;
        }

        // Verifikojmë që mesazhi është i përdoruesit aktual
        if (messageToEdit.senderId !== 'current') {
            setErrorMessage('You can only edit your own messages');
            setTimeout(() => setErrorMessage(null), 5000);
            return;
        }

        // Verifikojmë që mesazhi nuk është i fshirë
        if (messageToEdit.isDeleted) {
            setErrorMessage('Cannot edit a deleted message');
            setTimeout(() => setErrorMessage(null), 5000);
            return;
        }

        // Vendos state për editim
        setEditingMessageId(messageId);
        setEditMessageContent(messageToEdit.content);
        setShowMessageOptions(null); // Fshi menu-n e opsioneve
    };

    const handleSaveEdit = (messageId: string) => {
        // Validim përmbajtje
        const trimmedContent = editMessageContent.trim();
        
        if (!trimmedContent) {
            setErrorMessage('Message content cannot be empty');
            setTimeout(() => setErrorMessage(null), 5000);
            return;
        }

        if (trimmedContent.length > 5000) {
            setErrorMessage('Message is too long. Maximum 5000 characters allowed.');
            setTimeout(() => setErrorMessage(null), 5000);
            return;
        }

        // Gjej mesazhin që duhet të editohet
        const messageToEdit = messages.find(msg => msg.id === messageId);
        
        if (!messageToEdit) {
            setErrorMessage('Message not found');
            setTimeout(() => setErrorMessage(null), 5000);
            return;
        }

        // Verifikojmë që mesazhi është i përdoruesit aktual
        if (messageToEdit.senderId !== 'current') {
            setErrorMessage('You can only edit your own messages');
            setTimeout(() => setErrorMessage(null), 5000);
            return;
        }

        // Verifikojmë që mesazhi nuk është i fshirë
        if (messageToEdit.isDeleted) {
            setErrorMessage('Cannot edit a deleted message');
            setTimeout(() => setErrorMessage(null), 5000);
            return;
        }

        // ============================================
        // ERROR HANDLING: SOCKET CONNECTION CHECK
        // ============================================
        if (!socket || !isConnected) {
            setErrorMessage('Socket connection not available. Please refresh the page.');
            setTimeout(() => setErrorMessage(null), 5000);
            return;
        }

        // ============================================
        // OPTIMISTIC UPDATE
        // ============================================
        // Përditëso mesazhin optimistikisht në UI menjëherë për përvojë më të mirë
        // Nëse dërgimi dështon, mesazhi do të rikthehet në versionin origjinal
        // IMPORTANT: Përdorim .map() për të ruajtur pozicionin e mesazhit në listë
        // Mesazhi mbetet në të njëjtin pozicion edhe pas editimit
        const editedAt = new Date();
        const originalMessage = { ...messageToEdit }; // Ruaj kopje të mesazhit origjinal për rikthim
        setMessages(prev => 
            prev.map(msg => 
                msg.id === messageId 
                    ? { 
                        ...msg, 
                        content: trimmedContent,
                        isEdited: true,
                        editedAt: editedAt
                    } 
                    : msg
            )
        );

        // ============================================
        // SEND EDIT VIA SOCKET
        // ============================================
        socket.emit('edit_message', {
            messageId: messageId,
            newContent: trimmedContent,
        });

        // ============================================
        // HANDLE SOCKET RESPONSES
        // ============================================
        // Dëgjo për konfirmim të suksesit
        let editTimeoutId: NodeJS.Timeout | null = null;
        const handleMessageEdited = (data: any) => {
            // Pastro timeout nëse mesazhi u editua me sukses
            if (editTimeoutId) {
                clearTimeout(editTimeoutId);
                editTimeoutId = null;
            }

            // Mesazhi u editua me sukses - përditëso me të dhënat e reja nga serveri
            if (data.data && data.data.id === messageId) {
                const editedMessage: Message = {
                    id: data.data.id,
                    senderId: data.data.senderId === user?.id ? 'current' : data.data.senderId,
                    receiverId: data.data.receiverId === user?.id ? 'current' : data.data.receiverId,
                    content: data.data.content,
                    timestamp: new Date(data.data.timestamp),
                    isRead: data.data.isRead,
                    isEdited: data.data.isEdited || true,
                    editedAt: data.data.editedAt ? new Date(data.data.editedAt) : editedAt,
                };

                // Përditëso mesazhin me të dhënat e reja
                // IMPORTANT: Përdorim .map() për të ruajtur pozicionin e mesazhit në listë
                // Mesazhi mbetet në të njëjtin pozicion edhe pas editimit
                setMessages(prev => 
                    prev.map(msg => msg.id === messageId ? editedMessage : msg)
                );
            }

            // Hiq listener pasi mesazhi u editua me sukses
            socket.off('message_edited', handleMessageEdited);
            socket.off('message_edit_error', handleEditError);
        };

        // Dëgjo për gabime
        const handleEditError = (error: any) => {
            // Pastro timeout nëse kemi gabim
            if (editTimeoutId) {
                clearTimeout(editTimeoutId);
                editTimeoutId = null;
            }

            // ============================================
            // ROLLBACK OPTIMISTIC UPDATE
            // ============================================
            // Editimi dështoi - rikthe mesazhin origjinal
            setMessages(prev => 
                prev.map(msg => 
                    msg.id === messageId 
                        ? { 
                            ...msg, 
                            content: originalMessage.content,
                            isEdited: originalMessage.isEdited || false,
                            editedAt: originalMessage.editedAt
                        } 
                        : msg
                )
            );
            setErrorMessage(error.message || 'Failed to edit message. Please try again.');
            setTimeout(() => setErrorMessage(null), 5000);

            // Hiq listeners
            socket.off('message_edited', handleMessageEdited);
            socket.off('message_edit_error', handleEditError);
        };

        // Regjistro listeners
        socket.once('message_edited', handleMessageEdited);
        socket.once('message_edit_error', handleEditError);

        // ============================================
        // TIMEOUT FALLBACK
        // ============================================
        // Nëse nuk marrim përgjigje brenda 10 sekondave, rikthe mesazhin origjinal
        editTimeoutId = setTimeout(() => {
            // Kontrollo nëse mesazhi ende ka optimistic update (nuk u konfirmua)
            setMessages(prev => {
                const message = prev.find(msg => msg.id === messageId);
                if (message && message.isEdited && message.content === trimmedContent) {
                    // Nuk morëm përgjigje - rikthe mesazhin origjinal
                    setErrorMessage('Message edit timeout. Please check your connection and try again.');
                    setTimeout(() => setErrorMessage(null), 5000);
                    return prev.map(msg => 
                        msg.id === messageId 
                            ? { 
                                ...msg, 
                                content: originalMessage.content,
                                isEdited: originalMessage.isEdited || false,
                                editedAt: originalMessage.editedAt
                            } 
                            : msg
                    );
                }
                return prev;
            });

            // Hiq listeners nëse ende janë aktiv
            socket.off('message_edited', handleMessageEdited);
            socket.off('message_edit_error', handleEditError);
        }, 10000);

        // Pastro state-et e editimit
        setEditingMessageId(null);
        setEditMessageContent('');
    };

    const handleCancelEdit = () => {
        // Anulo editimin dhe fshi state-et
        setEditingMessageId(null);
        setEditMessageContent('');
    };

    // ============================================
    // MESSAGE DELETE/UNSEND FUNCTION
    // ============================================
    const handleDeleteMessage = (messageId: string) => {
        // Gjej mesazhin që duhet të fshihet
        const messageToDelete = messages.find(msg => msg.id === messageId);
        
        if (!messageToDelete) {
            setErrorMessage('Message not found');
            setTimeout(() => setErrorMessage(null), 5000);
            return;
        }

        // Verifikojmë që mesazhi është i përdoruesit aktual
        if (messageToDelete.senderId !== 'current') {
            setErrorMessage('You can only delete your own messages');
            setTimeout(() => setErrorMessage(null), 5000);
            return;
        }

        // Verifikojmë që mesazhi nuk është tashmë i fshirë
        if (messageToDelete.isDeleted) {
            setErrorMessage('Message is already deleted');
            setTimeout(() => setErrorMessage(null), 5000);
            return;
        }

        // ============================================
        // ERROR HANDLING: SOCKET CONNECTION CHECK
        // ============================================
        if (!socket || !isConnected) {
            setErrorMessage('Socket connection not available. Please refresh the page.');
            setTimeout(() => setErrorMessage(null), 5000);
            return;
        }

        // ============================================
        // OPTIMISTIC UPDATE
        // ============================================
        // Fshi mesazhin optimistikisht nga UI menjëherë për përvojë më të mirë
        // Nëse dërgimi dështon, mesazhi do të rikthehet në versionin origjinal
        // IMPORTANT: Përdorim .map() për të ruajtur pozicionin e mesazhit në listë
        // Mesazhi shfaqet si i fshirë në të njëjtin pozicion (nuk hiqet nga lista)
        // Nëse dëshironi ta fshini plotësisht, përdorni .filter() në vend të .map()
        const deletedAt = new Date();
        const originalMessage = { ...messageToDelete }; // Ruaj kopje të mesazhit origjinal për rikthim
        setMessages(prev => 
            prev.map(msg => 
                msg.id === messageId 
                    ? { 
                        ...msg, 
                        isDeleted: true,
                        deletedAt: deletedAt,
                        content: 'This message was deleted'
                    } 
                    : msg
            )
        );

        // Fshi menu-n e opsioneve
        setShowMessageOptions(null);

        // ============================================
        // SEND DELETE VIA SOCKET
        // ============================================
        socket.emit('delete_message', {
            messageId: messageId,
        });

        // ============================================
        // HANDLE SOCKET RESPONSES
        // ============================================
        // Dëgjo për konfirmim të suksesit
        let deleteTimeoutId: NodeJS.Timeout | null = null;
        const handleMessageDeleted = (data: any) => {
            // Pastro timeout nëse mesazhi u fshi me sukses
            if (deleteTimeoutId) {
                clearTimeout(deleteTimeoutId);
                deleteTimeoutId = null;
            }

            // Mesazhi u fshi me sukses - përditëso me të dhënat e reja nga serveri
            if (data.data && data.data.id === messageId) {
                const deletedMessage: Message = {
                    id: data.data.id,
                    senderId: data.data.senderId === user?.id ? 'current' : data.data.senderId,
                    receiverId: data.data.receiverId === user?.id ? 'current' : data.data.receiverId,
                    content: data.data.content || 'This message was deleted',
                    timestamp: new Date(data.data.timestamp),
                    isRead: data.data.isRead,
                    isDeleted: data.data.isDeleted || true,
                    deletedAt: data.data.deletedAt ? new Date(data.data.deletedAt) : deletedAt,
                };

                // Përditëso mesazhin me të dhënat e reja
                // IMPORTANT: Përdorim .map() për të ruajtur pozicionin e mesazhit në listë
                // Mesazhi shfaqet si i fshirë në të njëjtin pozicion (nuk hiqet nga lista)
                setMessages(prev => 
                    prev.map(msg => msg.id === messageId ? deletedMessage : msg)
                );
            }

            // Hiq listener pasi mesazhi u fshi me sukses
            socket.off('message_deleted', handleMessageDeleted);
            socket.off('message_delete_error', handleDeleteError);
        };

        // Dëgjo për gabime
        const handleDeleteError = (error: any) => {
            // Pastro timeout nëse kemi gabim
            if (deleteTimeoutId) {
                clearTimeout(deleteTimeoutId);
                deleteTimeoutId = null;
            }

            // ============================================
            // ROLLBACK OPTIMISTIC UPDATE
            // ============================================
            // Fshirja dështoi - rikthe mesazhin origjinal
            setMessages(prev => 
                prev.map(msg => 
                    msg.id === messageId 
                        ? { 
                            ...msg, 
                            content: originalMessage.content,
                            isDeleted: originalMessage.isDeleted || false,
                            deletedAt: originalMessage.deletedAt
                        } 
                        : msg
                )
            );
            setErrorMessage(error.message || 'Failed to delete message. Please try again.');
            setTimeout(() => setErrorMessage(null), 5000);

            // Hiq listeners
            socket.off('message_deleted', handleMessageDeleted);
            socket.off('message_delete_error', handleDeleteError);
        };

        // Regjistro listeners
        socket.once('message_deleted', handleMessageDeleted);
        socket.once('message_delete_error', handleDeleteError);

        // ============================================
        // TIMEOUT FALLBACK
        // ============================================
        // Nëse nuk marrim përgjigje brenda 10 sekondave, rikthe mesazhin origjinal
        deleteTimeoutId = setTimeout(() => {
            // Kontrollo nëse mesazhi ende ka optimistic update (nuk u konfirmua)
            setMessages(prev => {
                const message = prev.find(msg => msg.id === messageId);
                if (message && message.isDeleted) {
                    // Nuk morëm përgjigje - rikthe mesazhin origjinal
                    setErrorMessage('Message delete timeout. Please check your connection and try again.');
                    setTimeout(() => setErrorMessage(null), 5000);
                    return prev.map(msg => 
                        msg.id === messageId 
                            ? { 
                                ...msg, 
                                content: originalMessage.content,
                                isDeleted: originalMessage.isDeleted || false,
                                deletedAt: originalMessage.deletedAt
                            } 
                            : msg
                    );
                }
                return prev;
            });

            // Hiq listeners nëse ende janë aktiv
            socket.off('message_deleted', handleMessageDeleted);
            socket.off('message_delete_error', handleDeleteError);
        }, 10000);
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
        // Message edit and options state
        editingMessageId,
        setEditingMessageId,
        editMessageContent,
        setEditMessageContent,
        hoveredMessageId,
        setHoveredMessageId,
        showMessageOptions,
        setShowMessageOptions,
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
        cancelBlockUser,
        // Message edit functions
        handleStartEdit,
        handleSaveEdit,
        handleCancelEdit,
        // Message delete function
        handleDeleteMessage
    };
}

