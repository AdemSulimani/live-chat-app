import '../../../Style/Settings style/Activity.css';
import { useActivity } from '../../../../hooks/Settings/useActivity';

type ActivityStatus = 'online' | 'offline' | 'do_not_disturb';

interface ActivityProps {
    onBack: () => void;
}

export function Activity({ onBack }: ActivityProps) {
    const {
        activityStatus,
        loading,
        error,
        saving,
        updateActivityStatus,
    } = useActivity();

    const handleStatusChange = async (status: ActivityStatus) => {
        await updateActivityStatus(status);
    };

    const getStatusLabel = (status: ActivityStatus): string => {
        switch (status) {
            case 'online':
                return 'Online';
            case 'offline':
                return 'Offline';
            case 'do_not_disturb':
                return 'Do Not Disturb';
            default:
                return 'Offline';
        }
    };

    const getStatusIcon = (status: ActivityStatus) => {
        switch (status) {
            case 'online':
                return (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <circle cx="12" cy="12" r="6" fill="currentColor"></circle>
                    </svg>
                );
            case 'offline':
                return (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="12" x2="12" y2="12" strokeWidth="2"></line>
                    </svg>
                );
            case 'do_not_disturb':
                return (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
                    </svg>
                );
        }
    };

    const getStatusDescription = (status: ActivityStatus): string => {
        switch (status) {
            case 'online':
                return 'You are available and can receive messages';
            case 'offline':
                return 'You appear offline to others';
            case 'do_not_disturb':
                return 'You will not receive notifications';
            default:
                return '';
        }
    };

    return (
        <div className="activity-content">
            {/* Header */}
            <div className="activity-header">
                <button 
                    className="back-btn"
                    onClick={onBack}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="15 18 9 12 15 6"></polyline>
                    </svg>
                </button>
                <h2>Activity Status</h2>
            </div>

            {/* Error Message */}
            {error && (
                <div className="activity-error">
                    {error}
                </div>
            )}

            {/* Loading State */}
            {loading && (
                <div className="activity-loading">
                    Loading activity status...
                </div>
            )}

            {/* Activity Status Options */}
            {!loading && (
                <div className="settings-section-group">
                    <h3 className="section-title">Current Status</h3>
                    
                    {/* Online Option */}
                    <div 
                        className={`activity-option ${activityStatus === 'online' ? 'active' : ''}`}
                        onClick={() => !saving && handleStatusChange('online')}
                    >
                        <div className="activity-option-left">
                            <div className={`activity-status-icon online ${activityStatus === 'online' ? 'selected' : ''}`}>
                                {getStatusIcon('online')}
                            </div>
                            <div className="option-info">
                                <span className="option-label">Online</span>
                                <span className="option-description">{getStatusDescription('online')}</span>
                            </div>
                        </div>
                        {activityStatus === 'online' && (
                            <div className="activity-check">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="20 6 9 17 4 12"></polyline>
                                </svg>
                            </div>
                        )}
                    </div>

                    {/* Offline Option */}
                    <div 
                        className={`activity-option ${activityStatus === 'offline' ? 'active' : ''}`}
                        onClick={() => !saving && handleStatusChange('offline')}
                    >
                        <div className="activity-option-left">
                            <div className={`activity-status-icon offline ${activityStatus === 'offline' ? 'selected' : ''}`}>
                                {getStatusIcon('offline')}
                            </div>
                            <div className="option-info">
                                <span className="option-label">Offline</span>
                                <span className="option-description">{getStatusDescription('offline')}</span>
                            </div>
                        </div>
                        {activityStatus === 'offline' && (
                            <div className="activity-check">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="20 6 9 17 4 12"></polyline>
                                </svg>
                            </div>
                        )}
                    </div>

                    {/* Do Not Disturb Option */}
                    <div 
                        className={`activity-option ${activityStatus === 'do_not_disturb' ? 'active' : ''}`}
                        onClick={() => !saving && handleStatusChange('do_not_disturb')}
                    >
                        <div className="activity-option-left">
                            <div className={`activity-status-icon do-not-disturb ${activityStatus === 'do_not_disturb' ? 'selected' : ''}`}>
                                {getStatusIcon('do_not_disturb')}
                            </div>
                            <div className="option-info">
                                <span className="option-label">Do Not Disturb</span>
                                <span className="option-description">{getStatusDescription('do_not_disturb')}</span>
                            </div>
                        </div>
                        {activityStatus === 'do_not_disturb' && (
                            <div className="activity-check">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="20 6 9 17 4 12"></polyline>
                                </svg>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Saving Indicator */}
            {saving && (
                <div className="activity-saving">
                    Updating status...
                </div>
            )}
        </div>
    );
}

