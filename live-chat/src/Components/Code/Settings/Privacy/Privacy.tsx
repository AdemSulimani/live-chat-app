import '../../../Style/Settings style/Notifications.css';
import { usePrivacy } from '../../../../hooks/Settings/usePrivacy';

interface PrivacyProps {
    onBack: () => void;
}

export function Privacy({ onBack }: PrivacyProps) {
    const {
        lastSeenEnabled,
        loading,
        error,
        toggleLastSeen,
    } = usePrivacy();

    return (
        <div className="notifications-content">
            {/* Header */}
            <div className="notifications-header">
                <button 
                    className="back-btn"
                    onClick={onBack}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="15 18 9 12 15 6"></polyline>
                    </svg>
                </button>
                <h2>Privacy</h2>
            </div>

            {/* Error Message */}
            {error && (
                <div className="error-message" style={{ 
                    padding: '12px', 
                    margin: '16px', 
                    backgroundColor: '#fee', 
                    color: '#d32f2f', 
                    borderRadius: '8px',
                    fontSize: '14px'
                }}>
                    {error}
                </div>
            )}

            {/* Last Seen Section */}
            <div className="settings-section-group">
                <h3 className="section-title">Last Seen</h3>
                <div className="settings-option">
                    <div className="option-info">
                        <span className="option-label">Show last seen</span>
                        <span className="option-description">
                            When enabled, your friends can see when you were last active. 
                            When disabled, they will see "Last seen unavailable" instead.
                        </span>
                    </div>
                    <label className="toggle-switch">
                        <input 
                            type="checkbox" 
                            checked={lastSeenEnabled}
                            onChange={toggleLastSeen}
                            disabled={loading}
                        />
                        <span className="toggle-slider"></span>
                    </label>
                </div>
            </div>

            {/* Info Section */}
            <div className="settings-section-group">
                <div style={{ 
                    padding: '16px', 
                    backgroundColor: '#f0f7ff', 
                    borderRadius: '8px',
                    border: '1px solid #b3d9ff'
                }}>
                    <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '600', color: '#1976d2' }}>
                        About Last Seen
                    </h4>
                    <p style={{ margin: '0', fontSize: '13px', color: '#555', lineHeight: '1.5' }}>
                        When "Show last seen" is enabled, your friends can see when you were last active. 
                        This also affects whether they can see "Seen" status on messages you send them. 
                        Both you and your friend must have this setting enabled to see each other's last seen status.
                    </p>
                </div>
            </div>
        </div>
    );
}

