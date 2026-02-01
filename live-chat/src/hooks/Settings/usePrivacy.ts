import { useState, useEffect } from 'react';
import { useUser } from '../../contexts/UserContext';
import { useSocket } from '../../contexts/SocketContext';

export function usePrivacy() {
    const { user, updateUser, getToken } = useUser();
    const { socket } = useSocket();
    const [lastSeenEnabled, setLastSeenEnabled] = useState<boolean>(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Initialize state nga user context
    useEffect(() => {
        if (user) {
            setLastSeenEnabled(user.lastSeenEnabled !== undefined ? user.lastSeenEnabled : true);
        }
    }, [user]);

    const toggleLastSeen = async () => {
        if (!user) {
            setError('User not found');
            return;
        }

        const newValue = !lastSeenEnabled;
        setLoading(true);
        setError(null);

        try {
            const token = getToken();
            if (!token) {
                throw new Error('No authentication token found');
            }

            // Bëj API call për të përditësuar lastSeenEnabled
            const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/users/settings/last-seen`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    lastSeenEnabled: newValue,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to update last seen setting');
            }

            const data = await response.json();

            // Përditëso state në UserContext
            updateUser({
                lastSeenEnabled: data.lastSeenEnabled,
            });

            // Përditëso local state
            setLastSeenEnabled(data.lastSeenEnabled);

            // Njofto të tjerët përmes Socket.IO
            // Nëse socket është i lidhur, dërgo event për të njoftuar miqtë
            if (socket && socket.connected) {
                socket.emit('last_seen_setting_changed', {
                    userId: user.id,
                    lastSeenEnabled: data.lastSeenEnabled,
                });
            }
        } catch (err) {
            console.error('Error updating last seen setting:', err);
            setError(err instanceof Error ? err.message : 'Failed to update last seen setting');
            // Revert local state në rast error
            setLastSeenEnabled(lastSeenEnabled);
        } finally {
            setLoading(false);
        }
    };

    return {
        lastSeenEnabled,
        loading,
        error,
        toggleLastSeen,
    };
}

