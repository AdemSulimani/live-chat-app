import '../../Style/Profile style/Profile-full.css';
import { useNavigate } from 'react-router-dom';
import { useProfileFull } from '../../../hooks/Profile/useProfileFull';

export function ProfileFull() {
    const navigate = useNavigate();
    const {
        profileData,
        isEditing,
        loading,
        error,
        saving,
        saveError,
        fileInputRef,
        handleInputChange,
        handlePhotoUpload,
        toggleEdit,
        handleSave,
        handleCancel,
        updateActivityStatus
    } = useProfileFull();

    return (
        <div className="profile-full-container">
            {/* Thin Sidebar */}
            <aside className="profile-full-sidebar">
                <button 
                    className="back-to-dashboard-btn"
                    onClick={() => navigate('/dashboard')}
                    title="Back to Dashboard"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="15 18 9 12 15 6"></polyline>
                    </svg>
                </button>

                {/* Settings Section */}
                <div className="profile-settings-section">
                    <button 
                        className="profile-settings-btn" 
                        title="Settings"
                        onClick={() => navigate('/settings')}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 15.5A3.5 3.5 0 0 1 8.5 12A3.5 3.5 0 0 1 12 8.5a3.5 3.5 0 0 1 3.5 3.5a3.5 3.5 0 0 1-3.5 3.5m7.43-2.53c.04-.32.07-.64.07-.97c0-.33-.03-.66-.07-1l2.11-1.63c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.31-.61-.22l-2.49 1c-.52-.4-1.06-.73-1.69-.98l-.37-2.65A.506.506 0 0 0 14 2h-4c-.25 0-.46.18-.5.42l-.37 2.65c-.63.25-1.17.59-1.69.98l-2.49-1c-.22-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64L4.57 11c-.04.34-.07.67-.07 1c0 .33.03.65.07.97l-2.11 1.66c-.19.15-.25.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1.01c.52.4 1.06.74 1.69.99l.37 2.65c.04.24.25.42.5.42h4c.25 0 .46-.18.5-.42l.37-2.65c.63-.26 1.17-.59 1.69-.99l2.49 1.01c.22.08.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.66Z"/>
                        </svg>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="profile-full-main">
                {loading && (
                    <div className="profile-loading" style={{ padding: '2rem', textAlign: 'center' }}>
                        Loading profile...
                    </div>
                )}
                {error && !loading && (
                    <div className="auth-message auth-error" style={{ margin: '2rem', padding: '1rem' }}>
                        {error}
                    </div>
                )}
                {saveError && (
                    <div className="auth-message auth-error" style={{ margin: '2rem', padding: '1rem' }}>
                        {saveError}
                    </div>
                )}
                {!loading && !error && (
                <div className="profile-full-content">
                    {/* Profile Photo Section - Left Side */}
                    <div className="profile-photo-section">
                        <div className="profile-photo-container">
                            {profileData.photoPreview ? (
                                <img 
                                    src={profileData.photoPreview} 
                                    alt={profileData.name} 
                                    className="profile-photo"
                                />
                            ) : (
                                <div className="profile-photo-placeholder">
                                    {(profileData.name || profileData.displayName || 'U').charAt(0).toUpperCase()}
                                </div>
                            )}
                            <span className={`profile-activity-indicator ${profileData.activityStatus || 'offline'}`}></span>
                            <div className="photo-edit-overlay">
                                {saving === 'photo' && (
                                    <div style={{ 
                                        position: 'absolute', 
                                        top: '50%', 
                                        left: '50%', 
                                        transform: 'translate(-50%, -50%)',
                                        background: 'rgba(0,0,0,0.7)',
                                        color: 'white',
                                        padding: '0.5rem 1rem',
                                        borderRadius: '4px',
                                        fontSize: '0.875rem'
                                    }}>
                                        Uploading...
                                    </div>
                                )}
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handlePhotoUpload}
                                    accept="image/*"
                                    className="file-input"
                                    id="photo-upload"
                                    disabled={saving === 'photo'}
                                />
                                <label 
                                    htmlFor="photo-upload" 
                                    className="photo-edit-btn" 
                                    title="Change Photo"
                                    style={{ opacity: saving === 'photo' ? 0.5 : 1, pointerEvents: saving === 'photo' ? 'none' : 'auto' }}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                    </svg>
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Profile Info Sections */}
                    <div className="profile-info-sections">
                        {/* Display Name Section */}
                        <div className="profile-info-item">
                            <div className="profile-info-header">
                                <label className="profile-info-label">Display Name</label>
                                {!isEditing.name ? (
                                    <button 
                                        className="edit-btn"
                                        onClick={() => toggleEdit('name')}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                        </svg>
                                        Edit
                                    </button>
                                ) : (
                                    <div className="edit-actions">
                                        <button 
                                            className="save-btn"
                                            onClick={() => handleSave('name')}
                                            disabled={saving === 'name'}
                                        >
                                            {saving === 'name' ? 'Saving...' : 'Save'}
                                        </button>
                                        <button 
                                            className="cancel-btn"
                                            onClick={() => handleCancel('name')}
                                            disabled={saving === 'name'}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                )}
                            </div>
                            {isEditing.name ? (
                                <input
                                    type="text"
                                    name="displayName"
                                    value={profileData.displayName || profileData.name}
                                    onChange={handleInputChange}
                                    className="profile-edit-input"
                                    autoFocus
                                />
                            ) : (
                                <p className="profile-info-value">
                                    {profileData.displayName || profileData.name || 'No display name set'}
                                </p>
                            )}
                        </div>

                        {/* Username Section */}
                        <div className="profile-info-item">
                            <div className="profile-info-header">
                                <label className="profile-info-label">Username</label>
                                {!isEditing.username ? (
                                    <button 
                                        className="edit-btn"
                                        onClick={() => toggleEdit('username')}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                        </svg>
                                        Edit
                                    </button>
                                ) : (
                                    <div className="edit-actions">
                                        <button 
                                            className="save-btn"
                                            onClick={() => handleSave('username')}
                                            disabled={saving === 'username'}
                                        >
                                            {saving === 'username' ? 'Saving...' : 'Save'}
                                        </button>
                                        <button 
                                            className="cancel-btn"
                                            onClick={() => handleCancel('username')}
                                            disabled={saving === 'username'}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                )}
                            </div>
                            {isEditing.username ? (
                                <input
                                    type="text"
                                    name="username"
                                    value={profileData.username}
                                    onChange={handleInputChange}
                                    className="profile-edit-input"
                                    autoFocus
                                />
                            ) : (
                                <p className="profile-info-value">
                                    {profileData.username ? `@${profileData.username}` : 'No username set'}
                                </p>
                            )}
                        </div>

                        {/* Bio Section */}
                        <div className="profile-info-item">
                            <div className="profile-info-header">
                                <label className="profile-info-label">Bio</label>
                                {!isEditing.bio ? (
                                    <button 
                                        className="edit-btn"
                                        onClick={() => toggleEdit('bio')}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                        </svg>
                                        Edit
                                    </button>
                                ) : (
                                    <div className="edit-actions">
                                        <button 
                                            className="save-btn"
                                            onClick={() => handleSave('bio')}
                                            disabled={saving === 'bio'}
                                        >
                                            {saving === 'bio' ? 'Saving...' : 'Save'}
                                        </button>
                                        <button 
                                            className="cancel-btn"
                                            onClick={() => handleCancel('bio')}
                                            disabled={saving === 'bio'}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                )}
                            </div>
                            {isEditing.bio ? (
                                <textarea
                                    name="bio"
                                    value={profileData.bio}
                                    onChange={handleInputChange}
                                    className="profile-edit-textarea"
                                    rows={4}
                                    autoFocus
                                />
                            ) : (
                                <p className="profile-info-value">
                                    {profileData.bio || 'No bio available'}
                                </p>
                            )}
                        </div>

                        {/* Status Message Section */}
                        <div className="profile-info-item">
                            <div className="profile-info-header">
                                <label className="profile-info-label">Status Message</label>
                                {!isEditing.statusMessage ? (
                                    <button 
                                        className="edit-btn"
                                        onClick={() => toggleEdit('statusMessage')}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                        </svg>
                                        Edit
                                    </button>
                                ) : (
                                    <div className="edit-actions">
                                        <button 
                                            className="save-btn"
                                            onClick={() => handleSave('statusMessage')}
                                            disabled={saving === 'statusMessage'}
                                        >
                                            {saving === 'statusMessage' ? 'Saving...' : 'Save'}
                                        </button>
                                        <button 
                                            className="cancel-btn"
                                            onClick={() => handleCancel('statusMessage')}
                                            disabled={saving === 'statusMessage'}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                )}
                            </div>
                            {isEditing.statusMessage ? (
                                <input
                                    type="text"
                                    name="statusMessage"
                                    value={profileData.statusMessage}
                                    onChange={handleInputChange}
                                    className="profile-edit-input"
                                    autoFocus
                                />
                            ) : (
                                <p className="profile-info-value">
                                    {profileData.statusMessage || 'No status message'}
                                </p>
                            )}
                        </div>

                        {/* Activity Status Section */}
                        <div className="profile-info-item">
                            <div className="profile-info-header">
                                <label className="profile-info-label">Activity Status</label>
                                {!isEditing.activityStatus ? (
                                    <button 
                                        className="edit-btn"
                                        onClick={() => toggleEdit('activityStatus')}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                        </svg>
                                        Edit
                                    </button>
                                ) : (
                                    <div className="edit-actions">
                                        <button 
                                            className="cancel-btn"
                                            onClick={() => toggleEdit('activityStatus')}
                                            disabled={saving === 'activityStatus'}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                )}
                            </div>
                            {isEditing.activityStatus ? (
                                <div className="activity-status-dropdown">
                                    <button
                                        className={`activity-status-option ${profileData.activityStatus === 'online' ? 'selected' : ''}`}
                                        onClick={() => updateActivityStatus('online')}
                                        disabled={saving === 'activityStatus'}
                                    >
                                        <span className={`activity-status-dot online`}></span>
                                        Online
                                    </button>
                                    <button
                                        className={`activity-status-option ${profileData.activityStatus === 'offline' ? 'selected' : ''}`}
                                        onClick={() => updateActivityStatus('offline')}
                                        disabled={saving === 'activityStatus'}
                                    >
                                        <span className={`activity-status-dot offline`}></span>
                                        Offline
                                    </button>
                                    <button
                                        className={`activity-status-option ${profileData.activityStatus === 'do_not_disturb' ? 'selected' : ''}`}
                                        onClick={() => updateActivityStatus('do_not_disturb')}
                                        disabled={saving === 'activityStatus'}
                                    >
                                        <span className={`activity-status-dot do-not-disturb`}></span>
                                        Do Not Disturb
                                    </button>
                                    {saving === 'activityStatus' && (
                                        <p style={{ marginTop: '8px', fontSize: '14px', color: '#666' }}>Updating...</p>
                                    )}
                                </div>
                            ) : (
                                <p className="profile-info-value">
                                    <span className={`activity-status-badge ${profileData.activityStatus || 'offline'}`}>
                                        {profileData.activityStatus === 'online' ? 'Online' : 
                                         profileData.activityStatus === 'do_not_disturb' ? 'Do Not Disturb' : 
                                         'Offline'}
                                    </span>
                                </p>
                            )}
                        </div>

                        {/* Delete Account Button */}
                        <button 
                            className="delete-account-btn"
                            onClick={() => {
                                // Handle delete account logic here
                                console.log('Delete account clicked');
                                if (window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
                                    // Handle account deletion
                                    navigate('/login');
                                }
                            }}
                        >
                            Delete Account
                        </button>
                    </div>
                </div>
                )}
            </main>
        </div>
    );
}
