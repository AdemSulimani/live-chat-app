import '../../Style/Profile style/Profile.css';
import { useProfile } from '../../../hooks/Profile/useProfile';

export function Profile() {
    const {
        profileData,
        fileInputRef,
        handleInputChange,
        handlePhotoUpload,
        handleSubmit
    } = useProfile();

    return (
        <section className="profile-section">
            <div className="profile-container">
                <h1 className="profile-title">Create Your Profile</h1>
                
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
                            className="profile-input"
                            required
                        />
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
                            className="profile-input"
                            required
                        />
                    </div>

                    {/* Bio Input */}
                    <div className="form-group">
                        <textarea
                            id="bio"
                            name="bio"
                            value={profileData.bio}
                            onChange={handleInputChange}
                            placeholder="Bio"
                            className="profile-textarea"
                            rows={3}
                        />
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
                            className="profile-input"
                        />
                    </div>

                    {/* Submit Button */}
                    <button type="submit" className="profile-button">
                        Save Profile
                    </button>
                </form>
            </div>
        </section>
    );
}
