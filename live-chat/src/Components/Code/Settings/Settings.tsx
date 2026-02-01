import '../../Style/Settings style/Settings.css';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Notifications } from './Notifications/Notifications';
import { Friends } from './Friends/Friends';
import { Blocked } from './Blocked/Blocked';
import { Privacy } from './Privacy/Privacy';

export function Settings() {
    const navigate = useNavigate();
    const [selectedSection, setSelectedSection] = useState<string | null>(null);

    const handleLogout = () => {
        // Handle logout logic here
        console.log('Logging out...');
        navigate('/login');
    };

    return (
        <div className="settings-container">
            {/* Sidebar */}
            <aside className="settings-sidebar">
                {/* Settings Sections */}
                <div className="settings-sections">
                    <button 
                        className={`settings-section-btn ${selectedSection === 'notifications' ? 'active' : ''}`}
                        onClick={() => setSelectedSection('notifications')}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                        </svg>
                        Notifications
                    </button>
                    
                    <button 
                        className={`settings-section-btn ${selectedSection === 'friends' ? 'active' : ''}`}
                        onClick={() => setSelectedSection('friends')}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                            <circle cx="9" cy="7" r="4"></circle>
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                        </svg>
                        Friends
                    </button>
                    
                    <button 
                        className={`settings-section-btn ${selectedSection === 'blocked' ? 'active' : ''}`}
                        onClick={() => setSelectedSection('blocked')}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
                        </svg>
                        Blocked
                    </button>
                    
                    <button 
                        className={`settings-section-btn ${selectedSection === 'privacy' ? 'active' : ''}`}
                        onClick={() => setSelectedSection('privacy')}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                        </svg>
                        Privacy
                    </button>
                </div>

                {/* Logout Button */}
                <div className="settings-logout-section">
                    <button 
                        className="logout-btn"
                        onClick={handleLogout}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                            <polyline points="16 17 21 12 16 7"></polyline>
                            <line x1="21" y1="12" x2="9" y2="12"></line>
                        </svg>
                        Logout
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="settings-main">
                {selectedSection === 'notifications' ? (
                    <Notifications onBack={() => setSelectedSection(null)} />
                ) : selectedSection === 'friends' ? (
                    <Friends onBack={() => setSelectedSection(null)} />
                ) : selectedSection === 'blocked' ? (
                    <Blocked onBack={() => setSelectedSection(null)} />
                ) : selectedSection === 'privacy' ? (
                    <Privacy onBack={() => setSelectedSection(null)} />
                ) : (
                    <div className="settings-content">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 15.5A3.5 3.5 0 0 1 8.5 12A3.5 3.5 0 0 1 12 8.5a3.5 3.5 0 0 1 3.5 3.5a3.5 3.5 0 0 1-3.5 3.5m7.43-2.53c.04-.32.07-.64.07-.97c0-.33-.03-.66-.07-1l2.11-1.63c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.31-.61-.22l-2.49 1c-.52-.4-1.06-.73-1.69-.98l-.37-2.65A.506.506 0 0 0 14 2h-4c-.25 0-.46.18-.5.42l-.37 2.65c-.63.25-1.17.59-1.69.98l-2.49-1c-.22-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64L4.57 11c-.04.34-.07.67-.07 1c0 .33.03.65.07.97l-2.11 1.66c-.19.15-.25.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1.01c.52.4 1.06.74 1.69.99l.37 2.65c.04.24.25.42.5.42h4c.25 0 .46-.18.5-.42l.37-2.65c.63-.26 1.17-.59 1.69-.99l2.49 1.01c.22.08.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.66Z"/>
                        </svg>
                        <h2>Settings</h2>
                    </div>
                )}
            </main>
        </div>
    );
}
