import '../../../Style/Settings style/Blocked.css';
import { useBlocked } from '../../../../hooks/Settings/useBlocked';

interface BlockedProps {
    onBack: () => void;
}

export function Blocked({ onBack }: BlockedProps) {
    const {
        blockedUsers,
        handleUnblock
    } = useBlocked();

    return (
        <div className="blocked-content">
            {/* Header */}
            <div className="blocked-header">
                <button 
                    className="back-btn"
                    onClick={onBack}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="15 18 9 12 15 6"></polyline>
                    </svg>
                </button>
                <h2>Blocked</h2>
            </div>

            {/* Blocked Users Count Container */}
            <div className="blocked-count-container">
                <div className="blocked-count">
                    {blockedUsers.length} {blockedUsers.length === 1 ? 'blocked user' : 'blocked users'}
                </div>
            </div>

            {/* Blocked Users List Container */}
            <div className="blocked-list-container">
                {blockedUsers.map(user => (
                    <div key={user.id} className="blocked-card">
                        <div className="blocked-card-content">
                            <div className="blocked-avatar">
                                {user.avatar ? (
                                    <img src={user.avatar} alt={user.name} />
                                ) : (
                                    <div className="avatar-placeholder">
                                        {user.name.charAt(0).toUpperCase()}
                                    </div>
                                )}
                            </div>
                            <div className="blocked-info">
                                <h3 className="blocked-name">{user.name}</h3>
                                <p className="blocked-username">@{user.username}</p>
                            </div>
                        </div>
                        <div className="blocked-actions">
                            <button 
                                className="unblock-btn"
                                onClick={() => handleUnblock(user.id)}
                            >
                                Unblock
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

