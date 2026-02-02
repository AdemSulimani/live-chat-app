import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../../contexts/UserContext';
import { API_URL } from '../../utils/apiConfig';

export interface Friend {
    id: string;
    name: string;
    username: string;
    avatar: string;
    isOnline: boolean;
}

export function useFriends() {
    const navigate = useNavigate();
    const { getToken, user } = useUser();
    
    const [friends, setFriends] = useState<Friend[]>([]);
    const [loading, setLoading] = useState(true);

    // Load friends from API when component mounts
    useEffect(() => {
        const loadFriends = async () => {
            const token = getToken();
            if (!token || !user) {
                setLoading(false);
                return;
            }

            try {
                // Load blocked users first to filter them out
                const blockedResponse = await fetch(`${API_URL}/api/blocked`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                });

                let blockedUserIds: string[] = [];
                if (blockedResponse.ok) {
                    const blockedData = await blockedResponse.json();
                    blockedUserIds = (blockedData.blockedUsers || []).map((user: any) => user.id);
                }

                const response = await fetch(`${API_URL}/api/friends`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                });

                if (response.ok) {
                    const data = await response.json();
                    // Filter out blocked users (backend should already filter, but this is for safety)
                    const unblockedFriends = (data.friends || []).filter((friend: any) => 
                        !blockedUserIds.includes(friend.id)
                    );
                    setFriends(unblockedFriends);
                } else if (response.status === 401) {
                    console.error('Authentication failed');
                    // Will be handled by ProtectedRoute
                } else {
                    const errorData = await response.json().catch(() => ({ message: 'Failed to load friends' }));
                    console.error('Failed to load friends:', errorData.message);
                }
            } catch (error) {
                console.error('Error loading friends:', error);
            } finally {
                setLoading(false);
            }
        };

        loadFriends();
    }, [user, getToken]);

    const handleRemoveFriend = async (friendId: string) => {
        if (!window.confirm('Are you sure you want to remove this friend?')) {
            return;
        }

        const token = getToken();
        if (!token) {
            console.error('No token available');
            alert('You must be logged in to remove a friend');
            return;
        }

        try {
            const response = await fetch(`${API_URL}/api/friends/remove/${friendId}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            const data = await response.json();

            if (!response.ok) {
                if (response.status === 401) {
                    alert('Your session has expired. Please login again.');
                    return;
                }
                console.error('Error removing friend:', data.message);
                alert(data.message || 'Failed to remove friend');
                return;
            }

            // Load blocked users first to filter them out
            const blockedResponse = await fetch(`${API_URL}/api/blocked`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            let blockedUserIds: string[] = [];
            if (blockedResponse.ok) {
                const blockedData = await blockedResponse.json();
                blockedUserIds = (blockedData.blockedUsers || []).map((user: any) => user.id);
            }

            // Refresh friends list
            const friendsResponse = await fetch(`${API_URL}/api/friends`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (friendsResponse.ok) {
                const friendsData = await friendsResponse.json();
                // Filter out blocked users (backend should already filter, but this is for safety)
                const unblockedFriends = (friendsData.friends || []).filter((friend: any) => 
                    !blockedUserIds.includes(friend.id)
                );
                setFriends(unblockedFriends);
            }
        } catch (error) {
            console.error('Error removing friend:', error);
            if (error instanceof TypeError && error.message.includes('fetch')) {
                alert('Network error. Please check your connection and try again.');
            } else {
                alert('Failed to remove friend. Please try again.');
            }
        }
    };

    const handleMessageFriend = (_friend: Friend) => {
        navigate('/dashboard');
        // You can add logic here to select the friend in dashboard
    };

    return {
        friends,
        loading,
        handleRemoveFriend,
        handleMessageFriend
    };
}

