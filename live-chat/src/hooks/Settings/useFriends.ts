import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export interface Friend {
    id: string;
    name: string;
    username: string;
    avatar: string;
    isOnline: boolean;
}

export function useFriends() {
    const navigate = useNavigate();
    
    const [friends, setFriends] = useState<Friend[]>([
        { id: '1', name: 'John Doe', username: 'johndoe', avatar: '', isOnline: true },
        { id: '2', name: 'Jane Smith', username: 'janesmith', avatar: '', isOnline: false },
        { id: '3', name: 'Mike Johnson', username: 'mikej', avatar: '', isOnline: true },
        { id: '4', name: 'Sarah Williams', username: 'sarahw', avatar: '', isOnline: true }
    ]);

    const handleRemoveFriend = (friendId: string) => {
        if (window.confirm('Are you sure you want to remove this friend?')) {
            setFriends(prev => prev.filter(friend => friend.id !== friendId));
        }
    };

    const handleMessageFriend = (_friend: Friend) => {
        navigate('/dashboard');
        // You can add logic here to select the friend in dashboard
    };

    return {
        friends,
        handleRemoveFriend,
        handleMessageFriend
    };
}

