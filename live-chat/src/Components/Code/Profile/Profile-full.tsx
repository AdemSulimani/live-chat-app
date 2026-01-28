import '../../Style/Profile style/Profile-full.css';
import { useNavigate } from 'react-router-dom';
import { useProfileFull } from '../../../hooks/Profile/useProfileFull';

export function ProfileFull() {
    const navigate = useNavigate();
    const {
        profileData,
        isEditing,
        fileInputRef,
        handleInputChange,
        handlePhotoUpload,
        toggleEdit,
        handleSave,
        handleCancel
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
                                    {profileData.name.charAt(0).toUpperCase()}
                                </div>
                            )}
                            <span className="profile-online-indicator"></span>
                            <div className="photo-edit-overlay">
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handlePhotoUpload}
                                    accept="image/*"
                                    className="file-input"
                                    id="photo-upload"
                                />
                                <label htmlFor="photo-upload" className="photo-edit-btn" title="Change Photo">
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
                                        >
                                            Save
                                        </button>
                                        <button 
                                            className="cancel-btn"
                                            onClick={() => handleCancel('name')}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                )}
                            </div>
                            {isEditing.name ? (
                                <input
                                    type="text"
                                    name="name"
                                    value={profileData.name}
                                    onChange={handleInputChange}
                                    className="profile-edit-input"
                                    autoFocus
                                />
                            ) : (
                                <p className="profile-info-value">{profileData.name}</p>
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
                                        >
                                            Save
                                        </button>
                                        <button 
                                            className="cancel-btn"
                                            onClick={() => handleCancel('username')}
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
                                <p className="profile-info-value">@{profileData.username}</p>
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
                                        >
                                            Save
                                        </button>
                                        <button 
                                            className="cancel-btn"
                                            onClick={() => handleCancel('bio')}
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
                                        >
                                            Save
                                        </button>
                                        <button 
                                            className="cancel-btn"
                                            onClick={() => handleCancel('statusMessage')}
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
            </main>
        </div>
    );
}
