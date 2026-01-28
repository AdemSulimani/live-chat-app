import { useState } from 'react';

export interface BlockedUser {
    id: string;
    name: string;
    username: string;
    avatar: string;
}

export function useBlocked() {
    const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([
        { id: '1', name: 'Alex Brown', username: 'alexb', avatar: '' },
        { id: '2', name: 'Emma Wilson', username: 'emmaw', avatar: '' },
        { id: '3', name: 'David Lee', username: 'davidl', avatar: '' }
    ]);

    const handleUnblock = (userId: string) => {
        if (window.confirm('Are you sure you want to unblock this user?')) {
            setBlockedUsers(prev => prev.filter(user => user.id !== userId));
        }
    };

    return {
        blockedUsers,
        handleUnblock
    };
}

