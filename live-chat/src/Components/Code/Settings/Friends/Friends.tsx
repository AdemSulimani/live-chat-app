import '../../../Style/Settings style/Friends.css';
import { useFriends } from '../../../../hooks/Settings/useFriends';

interface FriendsProps {
    onBack: () => void;
}

export function Friends({ onBack }: FriendsProps) {
    const {
        friends,
        handleRemoveFriend,
        handleMessageFriend
    } = useFriends();

    return (
        <div className="friends-content">
            {/* Header */}
            <div className="friends-header">
                <button 
                    className="back-btn"
                    onClick={onBack}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="15 18 9 12 15 6"></polyline>
                    </svg>
                </button>
                <h2>Friends</h2>
            </div>

            {/* Friends Count Container */}
            <div className="friends-count-container">
                <div className="friends-count">
                    {friends.length} {friends.length === 1 ? 'friend' : 'friends'}
                </div>
            </div>

            {/* Friends List Container */}
            <div className="friends-list-container">
                {friends.map(friend => (
                    <div key={friend.id} className="friend-card">
                        <div className="friend-card-content">
                            <div className="friend-avatar">
                                {friend.avatar ? (
                                    <img src={friend.avatar} alt={friend.name} />
                                ) : (
                                    <div className="avatar-placeholder">
                                        {friend.name.charAt(0).toUpperCase()}
                                    </div>
                                )}
                                {friend.isOnline && <span className="online-indicator"></span>}
                            </div>
                            <div className="friend-info">
                                <h3 className="friend-name">{friend.name}</h3>
                                <p className="friend-username">@{friend.username}</p>
                            </div>
                        </div>
                        <div className="friend-actions">
                            <button 
                                className="message-friend-btn"
                                onClick={() => handleMessageFriend(friend)}
                            >
                                Message {friend.name}
                            </button>
                            <button 
                                className="remove-friend-btn"
                                onClick={() => handleRemoveFriend(friend.id)}
                            >
                                Remove friend
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

