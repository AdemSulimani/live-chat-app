import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../../contexts/UserContext';
import { API_URL } from '../../utils/apiConfig';

export function useProfile() {
    const navigate = useNavigate();
    const { getToken, updateUser } = useUser();
    const [profileData, setProfileData] = useState({
        username: '',
        displayName: '',
        bio: '',
        statusMessage: '',
        profilePhoto: null as File | null,
        photoPreview: null as string | null
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [checkingUsername, setCheckingUsername] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Cleanup URL.createObjectURL për të shmangur memory leaks
    useEffect(() => {
        return () => {
            if (profileData.photoPreview) {
                URL.revokeObjectURL(profileData.photoPreview);
            }
        };
    }, [profileData.photoPreview]);

    const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Validim i foto
            const photoError = validatePhoto(file);
            if (photoError) {
                setFieldErrors(prev => ({ ...prev, profilePhoto: photoError }));
                e.target.value = ''; // Clear input
                return;
            }

            // Clear error nëse foto është valid
            if (fieldErrors.profilePhoto) {
                setFieldErrors(prev => {
                    const newErrors = { ...prev };
                    delete newErrors.profilePhoto;
                    return newErrors;
                });
            }

            // Cleanup URL e vjetër nëse ekziston
            if (profileData.photoPreview) {
                URL.revokeObjectURL(profileData.photoPreview);
            }
            setProfileData(prev => ({
                ...prev,
                profilePhoto: file,
                photoPreview: URL.createObjectURL(file)
            }));
        }
    };

    // Validim i username format
    const validateUsername = (username: string): string | null => {
        if (!username) {
            return 'Username is required';
        }
        if (username.length < 3 || username.length > 20) {
            return 'Username must be between 3 and 20 characters';
        }
        const usernameRegex = /^[a-zA-Z0-9_-]+$/;
        if (!usernameRegex.test(username)) {
            return 'Username can only contain letters, numbers, underscores, and dashes';
        }
        return null;
    };

    // Validim i display name
    const validateDisplayName = (displayName: string): string | null => {
        if (!displayName) {
            return 'Display name is required';
        }
        if (displayName.trim().length < 1 || displayName.trim().length > 50) {
            return 'Display name must be between 1 and 50 characters';
        }
        return null;
    };

    // Validim i bio
    const validateBio = (bio: string): string | null => {
        if (bio && bio.length > 500) {
            return 'Bio must not exceed 500 characters';
        }
        return null;
    };

    // Validim i status message
    const validateStatusMessage = (statusMessage: string): string | null => {
        if (statusMessage && statusMessage.length > 100) {
            return 'Status message must not exceed 100 characters';
        }
        return null;
    };

    // Validim i foto
    const validatePhoto = (file: File): string | null => {
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            return 'Only image files are allowed (jpeg, jpg, png, gif, webp)';
        }
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
            return 'File size must not exceed 5MB';
        }
        return null;
    };

    // Check username availability
    const checkUsernameAvailability = async (username: string): Promise<boolean> => {
        if (!username || validateUsername(username)) {
            return false;
        }

        try {
            const token = getToken();
            if (!token) return false;

            setCheckingUsername(true);
            const response = await fetch(`${API_URL}/api/profile/check-username/${username}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            const data = await response.json();
            return data.available === true;
        } catch (err) {
            console.error('Check username error:', err);
            return false;
        } finally {
            setCheckingUsername(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setProfileData(prev => ({
            ...prev,
            [name]: value
        }));

        // Clear error për këtë field
        if (fieldErrors[name]) {
            setFieldErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[name];
                return newErrors;
            });
        }

        // Real-time validation
        let error: string | null = null;
        if (name === 'username') {
            error = validateUsername(value);
        } else if (name === 'displayName') {
            error = validateDisplayName(value);
        } else if (name === 'bio') {
            error = validateBio(value);
        } else if (name === 'statusMessage') {
            error = validateStatusMessage(value);
        }

        if (error) {
            setFieldErrors(prev => ({ ...prev, [name]: error! }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setFieldErrors({});
        setLoading(true);

        try {
            const token = getToken();
            if (!token) {
                setError('You must be logged in to create a profile');
                setLoading(false);
                return;
            }

            // Validim i të gjitha fushave
            const usernameError = validateUsername(profileData.username);
            const displayNameError = validateDisplayName(profileData.displayName);
            const bioError = validateBio(profileData.bio);
            const statusMessageError = validateStatusMessage(profileData.statusMessage);
            const photoError = profileData.profilePhoto ? validatePhoto(profileData.profilePhoto) : null;

            if (usernameError || displayNameError || bioError || statusMessageError || photoError) {
                setFieldErrors({
                    ...(usernameError && { username: usernameError }),
                    ...(displayNameError && { displayName: displayNameError }),
                    ...(bioError && { bio: bioError }),
                    ...(statusMessageError && { statusMessage: statusMessageError }),
                    ...(photoError && { profilePhoto: photoError }),
                });
                setLoading(false);
                return;
            }

            // Check username availability
            const isUsernameAvailable = await checkUsernameAvailability(profileData.username);
            if (!isUsernameAvailable) {
                setFieldErrors(prev => ({ ...prev, username: 'Username is already taken' }));
                setLoading(false);
                return;
            }

            // Nëse ka foto, upload-o së pari
            let profilePhotoUrl = null;
            if (profileData.profilePhoto) {
                const photoFormData = new FormData();
                photoFormData.append('photo', profileData.profilePhoto);

                const photoResponse = await fetch(`${API_URL}/api/profile/photo`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                    body: photoFormData,
                });

                if (!photoResponse.ok) {
                    const photoError = await photoResponse.json();
                    setError(photoError.message || 'Failed to upload photo');
                    setLoading(false);
                    return;
                }

                const photoData = await photoResponse.json();
                profilePhotoUrl = photoData.profilePhoto;
            }

            // Ruaj profilin (me ose pa foto)
            const response = await fetch(`${API_URL}/api/profile`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    username: profileData.username,
                    displayName: profileData.displayName,
                    bio: profileData.bio || '',
                    statusMessage: profileData.statusMessage || '',
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.message || 'Failed to save profile');
                setLoading(false);
                return;
            }

            // Përditëso user data në context
            if (data.profile) {
                updateUser({
                    ...data.profile,
                    profileCompleted: true,
                });
            }

            // Redirect në dashboard
            navigate('/dashboard');
        } catch (err) {
            console.error('Profile save error:', err);
            setError('Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return {
        profileData,
        fileInputRef,
        loading,
        error,
        fieldErrors,
        checkingUsername,
        handleInputChange,
        handlePhotoUpload,
        handleSubmit
    };
}

