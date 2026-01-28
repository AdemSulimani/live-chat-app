import '../../../Style/Settings style/Notifications.css';
import { useNotifications } from '../../../../hooks/Settings/useNotifications';

interface NotificationsProps {
    onBack: () => void;
}

export function Notifications({ onBack }: NotificationsProps) {
    const {
        notificationSettings,
        openDropdown,
        setOpenDropdown,
        toggleSetting,
        handleDropdownSelect
    } = useNotifications();

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
                <h2>Notifications</h2>
            </div>

            {/* General Notification Display */}
            <div className="settings-section-group">
                <div className="settings-option dropdown-option" onClick={() => setOpenDropdown(openDropdown === 'banner' ? null : 'banner')}>
                    <div className="option-info">
                        <span className="option-label">Show notification banner</span>
                    </div>
                    <div className="option-value">
                        <span>{notificationSettings.showBanner}</span>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="9 18 15 12 9 6"></polyline>
                        </svg>
                    </div>
                    {openDropdown === 'banner' && (
                        <div className="dropdown-menu">
                            <div 
                                className={`dropdown-item ${notificationSettings.showBanner === 'Always' ? 'selected' : ''}`}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleDropdownSelect('showBanner', 'Always');
                                }}
                            >
                                Always
                            </div>
                            <div 
                                className={`dropdown-item ${notificationSettings.showBanner === 'Never' ? 'selected' : ''}`}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleDropdownSelect('showBanner', 'Never');
                                }}
                            >
                                Never
                            </div>
                        </div>
                    )}
                </div>
                <div className="settings-option dropdown-option" onClick={() => setOpenDropdown(openDropdown === 'badge' ? null : 'badge')}>
                    <div className="option-info">
                        <span className="option-label">Show taskbar notification badge</span>
                    </div>
                    <div className="option-value">
                        <span>{notificationSettings.showBadge}</span>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="9 18 15 12 9 6"></polyline>
                        </svg>
                    </div>
                    {openDropdown === 'badge' && (
                        <div className="dropdown-menu">
                            <div 
                                className={`dropdown-item ${notificationSettings.showBadge === 'Always' ? 'selected' : ''}`}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleDropdownSelect('showBadge', 'Always');
                                }}
                            >
                                Always
                            </div>
                            <div 
                                className={`dropdown-item ${notificationSettings.showBadge === 'Never' ? 'selected' : ''}`}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleDropdownSelect('showBadge', 'Never');
                                }}
                            >
                                Never
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Messages Section */}
            <div className="settings-section-group">
                <h3 className="section-title">Messages</h3>
                <div className="settings-option">
                    <div className="option-info">
                        <span className="option-label">Message notifications</span>
                        <span className="option-description">Show notifications for new messages</span>
                    </div>
                    <label className="toggle-switch">
                        <input 
                            type="checkbox" 
                            checked={notificationSettings.messageNotifications}
                            onChange={() => toggleSetting('messageNotifications')}
                        />
                        <span className="toggle-slider"></span>
                    </label>
                </div>
                <div className="settings-option">
                    <div className="option-info">
                        <span className="option-label">Show previews</span>
                    </div>
                    <label className="toggle-switch">
                        <input 
                            type="checkbox" 
                            checked={notificationSettings.showPreviews}
                            onChange={() => toggleSetting('showPreviews')}
                        />
                        <span className="toggle-slider"></span>
                    </label>
                </div>
                <div className="settings-option">
                    <div className="option-info">
                        <span className="option-label">Show reaction notifications</span>
                    </div>
                    <label className="toggle-switch">
                        <input 
                            type="checkbox" 
                            checked={notificationSettings.showReactionNotifications}
                            onChange={() => toggleSetting('showReactionNotifications')}
                        />
                        <span className="toggle-slider"></span>
                    </label>
                </div>
                <div className="settings-option">
                    <div className="option-info">
                        <span className="option-label">Status reactions</span>
                        <span className="option-description">Show notifications when you get likes on a status</span>
                    </div>
                    <label className="toggle-switch">
                        <input 
                            type="checkbox" 
                            checked={notificationSettings.statusReactions}
                            onChange={() => toggleSetting('statusReactions')}
                        />
                        <span className="toggle-slider"></span>
                    </label>
                </div>
            </div>

            {/* Calls Section */}
            <div className="settings-section-group">
                <h3 className="section-title">Calls</h3>
                <div className="settings-option">
                    <div className="option-info">
                        <span className="option-label">Call notifications</span>
                        <span className="option-description">Show notifications for incoming calls</span>
                    </div>
                    <label className="toggle-switch">
                        <input 
                            type="checkbox" 
                            checked={notificationSettings.callNotifications}
                            onChange={() => toggleSetting('callNotifications')}
                        />
                        <span className="toggle-slider"></span>
                    </label>
                </div>
                <div className="settings-option">
                    <div className="option-info">
                        <span className="option-label">Incoming calls</span>
                        <span className="option-description">Play sounds for incoming calls</span>
                    </div>
                    <label className="toggle-switch">
                        <input 
                            type="checkbox" 
                            checked={notificationSettings.incomingCallSounds}
                            onChange={() => toggleSetting('incomingCallSounds')}
                        />
                        <span className="toggle-slider"></span>
                    </label>
                </div>
            </div>

            {/* Notification Tones Section */}
            <div className="settings-section-group">
                <h3 className="section-title">Notification tones</h3>
                <div className="settings-option">
                    <div className="option-info">
                        <span className="option-label">Incoming sounds</span>
                        <span className="option-description">Play sounds for incoming messages</span>
                    </div>
                    <label className="toggle-switch">
                        <input 
                            type="checkbox" 
                            checked={notificationSettings.incomingSounds}
                            onChange={() => toggleSetting('incomingSounds')}
                        />
                        <span className="toggle-slider"></span>
                    </label>
                </div>
                <div className="settings-option">
                    <div className="option-info">
                        <span className="option-label">Outgoing sounds</span>
                        <span className="option-description">Play sounds for outgoing messages</span>
                    </div>
                    <label className="toggle-switch">
                        <input 
                            type="checkbox" 
                            checked={notificationSettings.outgoingSounds}
                            onChange={() => toggleSetting('outgoingSounds')}
                        />
                        <span className="toggle-slider"></span>
                    </label>
                </div>
            </div>
        </div>
    );
}

