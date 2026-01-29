import '../../Style/Profile style/Profile.css';
import { useProfile } from '../../../hooks/Profile/useProfile';

export function Profile() {
    const {
        profileData,
        fileInputRef,
        loading,
        error,
        fieldErrors,
        checkingUsername,
        handleInputChange,
        handlePhotoUpload,
        handleSubmit
    } = useProfile();

    return (
        <section className="profile-section">
            <div className="profile-container">
                <h1 className="profile-title">Create Your Profile</h1>
                
                {error && <div className="auth-message auth-error" style={{ marginBottom: '1rem' }}>{error}</div>}
                
                <form onSubmit={handleSubmit} className="profile-form">
                    {/* Photo Upload Section */}
                    <div className="photo-upload-section">
                        <div className="photo-preview-container">
                            {profileData.photoPreview ? (
                                <img 
                                    src={profileData.photoPreview} 
                                    alt="Profile preview" 
                                    className="photo-preview"
                                />
                            ) : (
                                <div className="photo-placeholder">
                                    <span className="photo-icon">📷</span>
                                </div>
                            )}
                        </div>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handlePhotoUpload}
                            accept="image/*"
                            className="file-input"
                            id="photo-upload"
                        />
                        <label htmlFor="photo-upload" className="upload-button">
                            {profileData.photoPreview ? 'Change Photo' : 'Upload Photo'}
                        </label>
                        <p className="optional-text">(Optional)</p>
                        {fieldErrors.profilePhoto && (
                            <span className="field-error">{fieldErrors.profilePhoto}</span>
                        )}
                    </div>

                    {/* Username Input */}
                    <div className="form-group">
                        <input
                            type="text"
                            id="username"
                            name="username"
                            value={profileData.username}
                            onChange={handleInputChange}
                            placeholder="Username"
                            className={`profile-input ${fieldErrors.username ? 'error' : ''}`}
                            required
                        />
                        {fieldErrors.username && (
                            <span className="field-error">{fieldErrors.username}</span>
                        )}
                        {checkingUsername && (
                            <span className="checking-username">Checking availability...</span>
                        )}
                    </div>

                    {/* Display Name Input */}
                    <div className="form-group">
                        <input
                            type="text"
                            id="displayName"
                            name="displayName"
                            value={profileData.displayName}
                            onChange={handleInputChange}
                            placeholder="Display Name"
                            className={`profile-input ${fieldErrors.displayName ? 'error' : ''}`}
                            required
                        />
                        {fieldErrors.displayName && (
                            <span className="field-error">{fieldErrors.displayName}</span>
                        )}
                    </div>

                    {/* Bio Input */}
                    <div className="form-group">
                        <textarea
                            id="bio"
                            name="bio"
                            value={profileData.bio}
                            onChange={handleInputChange}
                            placeholder="Bio"
                            className={`profile-textarea ${fieldErrors.bio ? 'error' : ''}`}
                            rows={3}
                            maxLength={500}
                        />
                        {fieldErrors.bio && (
                            <span className="field-error">{fieldErrors.bio}</span>
                        )}
                        <span className="char-count">{profileData.bio.length}/500</span>
                    </div>

                    {/* Status Message */}
                    <div className="form-group">
                        <input
                            type="text"
                            id="statusMessage"
                            name="statusMessage"
                            value={profileData.statusMessage}
                            onChange={handleInputChange}
                            placeholder="Status Message"
                            className={`profile-input ${fieldErrors.statusMessage ? 'error' : ''}`}
                            maxLength={100}
                        />
                        {fieldErrors.statusMessage && (
                            <span className="field-error">{fieldErrors.statusMessage}</span>
                        )}
                        <span className="char-count">{profileData.statusMessage.length}/100</span>
                    </div>

                    {/* Submit Button */}
                    <button type="submit" className="profile-button" disabled={loading}>
                        {loading ? 'Saving...' : 'Save Profile'}
                    </button>
                </form>
            </div>
        </section>
    );
}
