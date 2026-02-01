import { useState, useEffect } from 'react';
import { useUser } from '../../contexts/UserContext';
import { API_URL } from '../../utils/apiConfig';

export interface BlockedUser {
    id: string;
    name: string;
    username: string;
    avatar: string;
}

export function useBlocked() {
    const { getToken, user } = useUser();
    
    const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
    const [loading, setLoading] = useState(true);

    // Load blocked users from API when component mounts
    useEffect(() => {
        const loadBlockedUsers = async () => {
            const token = getToken();
            if (!token || !user) {
                setLoading(false);
                return;
            }

            try {
                const response = await fetch(`${API_URL}/api/blocked`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                });

                if (response.ok) {
                    const data = await response.json();
                    setBlockedUsers(data.blockedUsers || []);
                } else if (response.status === 401) {
                    console.error('Authentication failed');
                    // Will be handled by ProtectedRoute
                } else {
                    const errorData = await response.json().catch(() => ({ message: 'Failed to load blocked users' }));
                    console.error('Failed to load blocked users:', errorData.message);
                }
            } catch (error) {
                console.error('Error loading blocked users:', error);
            } finally {
                setLoading(false);
            }
        };

        loadBlockedUsers();
    }, [user, getToken]);

    const handleUnblock = async (userId: string) => {
        if (!window.confirm('Are you sure you want to unblock this user?')) {
            return;
        }

        const token = getToken();
        if (!token) {
            console.error('No token available');
            alert('You must be logged in to unblock a user');
            return;
        }

        try {
            const response = await fetch(`${API_URL}/api/blocked/${userId}`, {
                method: 'DELETE',
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
                console.error('Error unblocking user:', data.message);
                alert(data.message || 'Failed to unblock user');
                return;
            }

            // Refresh blocked users list
            const blockedResponse = await fetch(`${API_URL}/api/blocked`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (blockedResponse.ok) {
                const blockedData = await blockedResponse.json();
                setBlockedUsers(blockedData.blockedUsers || []);
            }
        } catch (error) {
            console.error('Error unblocking user:', error);
            if (error instanceof TypeError && error.message.includes('fetch')) {
                alert('Network error. Please check your connection and try again.');
            } else {
                alert('Failed to unblock user. Please try again.');
            }
        }
    };

    return {
        blockedUsers,
        loading,
        handleUnblock
    };
}

