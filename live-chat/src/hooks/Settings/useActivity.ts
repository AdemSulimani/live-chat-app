import { useState, useEffect } from 'react';
import { useUser } from '../../contexts/UserContext';
import { API_URL } from '../../utils/apiConfig';

export type ActivityStatus = 'online' | 'offline' | 'do_not_disturb';

export function useActivity() {
    const { getToken, updateUser, user } = useUser();
    const [activityStatus, setActivityStatus] = useState<ActivityStatus>('offline');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    // Load activity status from API on mount
    useEffect(() => {
        const loadActivityStatus = async () => {
            const token = getToken();
            if (!token) return;

            setLoading(true);
            try {
                const response = await fetch(`${API_URL}/api/activity`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                });

                if (response.ok) {
                    const data = await response.json();
                    const status = data.activityStatus || 'offline';
                    setActivityStatus(status);
                    // Update user context if needed
                    updateUser({ activityStatus: status });
                } else {
                    // If status doesn't exist yet, default to offline
                    setActivityStatus('offline');
                }
            } catch (err) {
                console.error('Error loading activity status:', err);
                setError('Failed to load activity status');
            } finally {
                setLoading(false);
            }
        };

        if (user) {
            loadActivityStatus();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id]); // Only reload when user ID changes

    // Update activity status
    const updateActivityStatus = async (newStatus: ActivityStatus) => {
        const token = getToken();
        if (!token) {
            setError('Not authenticated');
            return;
        }

        setSaving(true);
        setError(null);

        try {
            const response = await fetch(`${API_URL}/api/activity`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ activityStatus: newStatus }),
            });

            if (response.ok) {
                const data = await response.json();
                setActivityStatus(data.activityStatus);
                // Update user context
                if (user) {
                    updateUser({ activityStatus: data.activityStatus });
                }
            } else {
                const errorData = await response.json();
                setError(errorData.message || 'Failed to update activity status');
            }
        } catch (err) {
            console.error('Error updating activity status:', err);
            setError('Failed to update activity status');
        } finally {
            setSaving(false);
        }
    };

    return {
        activityStatus,
        loading,
        error,
        saving,
        updateActivityStatus,
    };
}

