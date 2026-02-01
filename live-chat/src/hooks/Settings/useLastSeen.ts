import { useState, useEffect } from 'react';
import { useUser } from '../../contexts/UserContext';
import { API_URL } from '../../utils/apiConfig';

export function useLastSeen() {
    const { getToken, updateUser, user } = useUser();
    const [lastSeenEnabled, setLastSeenEnabled] = useState<boolean>(true); // Default: true
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    // Load last seen enabled setting from user context on mount
    useEffect(() => {
        if (user) {
            // Use lastSeenEnabled from user context, default to true if undefined
            setLastSeenEnabled(user.lastSeenEnabled !== undefined ? user.lastSeenEnabled : true);
        }
    }, [user?.id, user?.lastSeenEnabled]);

    // Update last seen enabled setting
    const updateLastSeenEnabled = async (enabled: boolean) => {
        const token = getToken();
        if (!token) {
            setError('Not authenticated');
            return;
        }

        setSaving(true);
        setError(null);

        try {
            const response = await fetch(`${API_URL}/api/users/settings/last-seen`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ lastSeenEnabled: enabled }),
            });

            if (response.ok) {
                const data = await response.json();
                const newValue = data.lastSeenEnabled !== undefined ? data.lastSeenEnabled : true;
                setLastSeenEnabled(newValue);
                // Update user context
                if (user) {
                    updateUser({ lastSeenEnabled: newValue });
                }
            } else {
                const errorData = await response.json().catch(() => ({ message: 'Failed to update last seen setting' }));
                setError(errorData.message || 'Failed to update last seen setting');
            }
        } catch (err) {
            console.error('Error updating last seen setting:', err);
            setError('Failed to update last seen setting');
        } finally {
            setSaving(false);
        }
    };

    return {
        lastSeenEnabled,
        loading,
        error,
        saving,
        updateLastSeenEnabled,
    };
}

