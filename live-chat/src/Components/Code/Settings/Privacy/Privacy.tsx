import '../../../Style/Settings style/Notifications.css';

interface PrivacyProps {
    onBack: () => void;
}

export function Privacy({ onBack }: PrivacyProps) {
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
        </div>
    );
}

