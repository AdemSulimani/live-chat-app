import '../../../Style/Settings style/LastSeen.css';
import { useLastSeen } from '../../../../hooks/Settings/useLastSeen';

interface LastSeenProps {
    onBack: () => void;
}

export function LastSeen({ onBack }: LastSeenProps) {
    const {
        lastSeenEnabled,
        loading,
        error,
        saving,
        updateLastSeenEnabled,
    } = useLastSeen();

    const handleToggle = async () => {
        if (!saving) {
            await updateLastSeenEnabled(!lastSeenEnabled);
        }
    };

    return (
        <div className="lastseen-content">
            {/* Header */}
            <div className="lastseen-header">
                <button 
                    className="back-btn"
                    onClick={onBack}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="15 18 9 12 15 6"></polyline>
                    </svg>
                </button>
                <h2>Last Seen</h2>
            </div>

            {/* Error Message */}
            {error && (
                <div className="lastseen-error">
                    {error}
                </div>
            )}

            {/* Loading State */}
            {loading && (
                <div className="lastseen-loading">
                    Loading last seen setting...
                </div>
            )}

            {/* Last Seen Toggle */}
            {!loading && (
                <div className="settings-section-group">
                    <h3 className="section-title">Privacy Settings</h3>
                    
                    <div className="lastseen-description">
                        <p>
                            When enabled, your friends can see when you were last active (last seen).
                            When disabled, your friends will only see your activity status (Online, Offline, Do Not Disturb).
                        </p>
                        <p className="lastseen-note">
                            <strong>Important:</strong> If you disable last seen, your friends <strong>cannot see</strong> when you have read their messages. 
                            However, <strong>you also cannot see</strong> when they have read your messages or their last seen status.
                        </p>
                    </div>

                    {/* Toggle Switch */}
                    <div 
                        className={`lastseen-toggle-container ${saving ? 'disabled' : ''}`}
                        onClick={handleToggle}
                    >
                        <div className="toggle-info">
                            <span className="toggle-label">Last Seen</span>
                            <span className="toggle-description">
                                {lastSeenEnabled 
                                    ? 'Your friends can see when you were last active and when you have read their messages' 
                                    : 'Your friends will only see your activity status. You cannot see when they have read your messages or their last seen status'}
                            </span>
                        </div>
                        <div className={`toggle-switch ${lastSeenEnabled ? 'enabled' : 'disabled'}`}>
                            <div className="toggle-slider"></div>
                        </div>
                    </div>
                </div>
            )}

            {/* Saving Indicator */}
            {saving && (
                <div className="lastseen-saving">
                    Updating setting...
                </div>
            )}
        </div>
    );
}

