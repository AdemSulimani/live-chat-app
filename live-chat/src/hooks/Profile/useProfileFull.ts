import { useState, useRef, useEffect } from 'react';
import { useUser } from '../../contexts/UserContext';

interface ProfileData {
    name: string;
    username: string;
    displayName?: string;
    bio: string;
    statusMessage: string;
    profilePhoto?: string | null;
    photoPreview?: string | null;
    email?: string;
    country?: string;
    activityStatus?: 'online' | 'offline' | 'do_not_disturb';
}

export function useProfileFull() {
    const [isEditing, setIsEditing] = useState({
        name: false,
        username: false,
        bio: false,
        statusMessage: false,
        activityStatus: false
    });

    const [profileData, setProfileData] = useState<ProfileData>({
        name: '',
        username: '',
        displayName: '',
        bio: '',
        statusMessage: '',
        profilePhoto: null,
        photoPreview: null,
        activityStatus: 'offline'
    });

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState<string | null>(null); // Field që po ruhet
    const [saveError, setSaveError] = useState<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const { getToken, updateUser } = useUser();

    // Fetch profile data nga backend
    useEffect(() => {
        const fetchProfile = async () => {
            setLoading(true);
            setError(null);

            try {
                const token = getToken();
                if (!token) {
                    setError('You must be logged in to view your profile');
                    setLoading(false);
                    return;
                }

                const response = await fetch('http://localhost:5000/api/profile', {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    setError(errorData.message || 'Failed to load profile');
                    setLoading(false);
                    return;
                }

                const data = await response.json();
                
                if (data.profile) {
                    setProfileData({
                        name: data.profile.name || data.profile.displayName || '',
                        username: data.profile.username || '',
                        displayName: data.profile.displayName || '',
                        bio: data.profile.bio || '',
                        statusMessage: data.profile.statusMessage || '',
                        profilePhoto: data.profile.profilePhoto || null,
                        photoPreview: data.profile.profilePhoto || null,
                        email: data.profile.email,
                        country: data.profile.country,
                        activityStatus: data.profile.activityStatus || 'offline',
                    });
                } else {
                    // Nëse nuk ka të dhëna, përdor default values
                    setProfileData({
                        name: '',
                        username: '',
                        displayName: '',
                        bio: '',
                        statusMessage: '',
                        profilePhoto: null,
                        photoPreview: null,
                        activityStatus: 'offline'
                    });
                }

                // Load activity status separately
                try {
                    const activityResponse = await fetch('http://localhost:5000/api/activity', {
                        method: 'GET',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json',
                        },
                    });

                    if (activityResponse.ok) {
                        const activityData = await activityResponse.json();
                        setProfileData(prev => ({
                            ...prev,
                            activityStatus: activityData.activityStatus || 'offline'
                        }));
                        updateUser({ activityStatus: activityData.activityStatus || 'offline' });
                    }
                } catch (err) {
                    console.log('Could not load activity status:', err);
                }
            } catch (err) {
                console.error('Fetch profile error:', err);
                setError('Something went wrong. Please try again.');
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setProfileData(prev => ({
            ...prev,
            [name]: value
        }));
    };

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

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Validim i foto para upload
            const photoError = validatePhoto(file);
            if (photoError) {
                setSaveError(photoError);
                e.target.value = ''; // Clear input
                return;
            }

            setSaving('photo');
            setSaveError(null);

            try {
                const token = getToken();
                if (!token) {
                    setSaveError('You must be logged in to upload photo');
                    setSaving(null);
                    return;
                }

                // Cleanup URL e vjetër nëse ekziston
                if (profileData.photoPreview && profileData.photoPreview.startsWith('blob:')) {
                    URL.revokeObjectURL(profileData.photoPreview);
                }

                // Upload foto
                const photoFormData = new FormData();
                photoFormData.append('photo', file);

                const photoResponse = await fetch('http://localhost:5000/api/profile/photo', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                    body: photoFormData,
                });

                if (!photoResponse.ok) {
                    const photoError = await photoResponse.json();
                    setSaveError(photoError.message || 'Failed to upload photo');
                    setSaving(null);
                    return;
                }

                const photoData = await photoResponse.json();

                // Përditëso state me URL të re të fotos
                setProfileData(prev => ({
                    ...prev,
                    profilePhoto: photoData.profilePhoto,
                    photoPreview: photoData.profilePhoto
                }));

                // Përditëso context
                updateUser({
                    profilePhoto: photoData.profilePhoto,
                });

            } catch (err) {
                console.error('Photo upload error:', err);
                setSaveError('Something went wrong. Please try again.');
            } finally {
                setSaving(null);
            }
        }
    };

    const toggleEdit = (field: keyof typeof isEditing) => {
        setIsEditing(prev => ({
            ...prev,
            [field]: !prev[field]
        }));
    };

    // Validim functions
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

    const validateDisplayName = (displayName: string): string | null => {
        if (!displayName) {
            return 'Display name is required';
        }
        if (displayName.trim().length < 1 || displayName.trim().length > 50) {
            return 'Display name must be between 1 and 50 characters';
        }
        return null;
    };

    const validateBio = (bio: string): string | null => {
        if (bio && bio.length > 500) {
            return 'Bio must not exceed 500 characters';
        }
        return null;
    };

    const validateStatusMessage = (statusMessage: string): string | null => {
        if (statusMessage && statusMessage.length > 100) {
            return 'Status message must not exceed 100 characters';
        }
        return null;
    };

    const checkUsernameAvailability = async (username: string): Promise<boolean> => {
        if (!username || validateUsername(username)) {
            return false;
        }

        try {
            const token = getToken();
            if (!token) return false;

            const response = await fetch(`http://localhost:5000/api/profile/check-username/${username}`, {
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
        }
    };

    const handleSave = async (field: keyof typeof isEditing) => {
        setSaveError(null);
        setSaving(field);

        try {
            const token = getToken();
            if (!token) {
                setSaveError('You must be logged in to save changes');
                setSaving(null);
                return;
            }

            // Map field names për backend
            const fieldMap: Record<string, string> = {
                name: 'displayName',
                username: 'username',
                bio: 'bio',
                statusMessage: 'statusMessage'
            };

            const backendField = fieldMap[field] || field;
            const fieldValue = profileData[backendField as keyof ProfileData] || '';

            // Validim bazuar në field
            let validationError: string | null = null;
            if (field === 'username') {
                validationError = validateUsername(fieldValue as string);
                if (!validationError) {
                    const isAvailable = await checkUsernameAvailability(fieldValue as string);
                    if (!isAvailable) {
                        validationError = 'Username is already taken';
                    }
                }
            } else if (field === 'name') {
                validationError = validateDisplayName(fieldValue as string);
            } else if (field === 'bio') {
                validationError = validateBio(fieldValue as string);
            } else if (field === 'statusMessage') {
                validationError = validateStatusMessage(fieldValue as string);
            }

            if (validationError) {
                setSaveError(validationError);
                setSaving(null);
                return;
            }

            // Dërgo PUT request për të përditësuar profilin
            const response = await fetch('http://localhost:5000/api/profile', {
                method: 'POST', // Backend përdor POST për create/update
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    username: field === 'username' ? fieldValue : profileData.username,
                    displayName: field === 'name' ? fieldValue : profileData.displayName || profileData.name,
                    bio: field === 'bio' ? fieldValue : profileData.bio,
                    statusMessage: field === 'statusMessage' ? fieldValue : profileData.statusMessage,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                setSaveError(data.message || 'Failed to save changes');
                setSaving(null);
                return;
            }

            // Përditëso state me të dhënat e reja nga backend
            if (data.profile) {
                setProfileData(prev => ({
                    ...prev,
                    name: data.profile.name || data.profile.displayName || prev.name,
                    username: data.profile.username || prev.username,
                    displayName: data.profile.displayName || prev.displayName,
                    bio: data.profile.bio || prev.bio,
                    statusMessage: data.profile.statusMessage || prev.statusMessage,
                    profilePhoto: data.profile.profilePhoto || prev.profilePhoto,
                    photoPreview: data.profile.profilePhoto || prev.photoPreview,
                }));

                // Përditëso original values ref
                originalValuesRef.current = {
                    ...profileData,
                    name: data.profile.name || data.profile.displayName || profileData.name,
                    username: data.profile.username || profileData.username,
                    displayName: data.profile.displayName || profileData.displayName,
                    bio: data.profile.bio || profileData.bio,
                    statusMessage: data.profile.statusMessage || profileData.statusMessage,
                };
            }

            // Përditëso context me të dhënat e reja
            if (data.profile) {
                updateUser(data.profile);
            }

            // Mbyll edit mode
            setIsEditing(prev => ({
                ...prev,
                [field]: false
            }));

        } catch (err) {
            console.error('Save profile error:', err);
            setSaveError('Something went wrong. Please try again.');
        } finally {
            setSaving(null);
        }
    };

    // Ruaj original values për cancel
    const originalValuesRef = useRef<ProfileData | null>(null);

    useEffect(() => {
        if (profileData && !loading && !error) {
            originalValuesRef.current = { ...profileData };
        }
    }, [loading, error]);

    const handleCancel = (field: keyof typeof isEditing) => {
        // Reset to original value nga ref
        if (originalValuesRef.current) {
            const fieldMap: Record<string, keyof ProfileData> = {
                name: 'displayName',
                username: 'username',
                bio: 'bio',
                statusMessage: 'statusMessage'
            };

            const actualField = fieldMap[field] || field;
            const originalValue = originalValuesRef.current[actualField] || '';

            setProfileData(prev => ({
                ...prev,
                [actualField]: originalValue
            }));
        }
        
        setIsEditing(prev => ({
            ...prev,
            [field]: false
        }));
    };

    const updateActivityStatus = async (newStatus: 'online' | 'offline' | 'do_not_disturb') => {
        setSaving('activityStatus');
        setSaveError(null);

        try {
            const token = getToken();
            if (!token) {
                setSaveError('You must be logged in to update activity status');
                setSaving(null);
                return;
            }

            const response = await fetch('http://localhost:5000/api/activity', {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ activityStatus: newStatus }),
            });

            if (response.ok) {
                const data = await response.json();
                setProfileData(prev => ({
                    ...prev,
                    activityStatus: data.activityStatus
                }));
                updateUser({ activityStatus: data.activityStatus });
                setIsEditing(prev => ({
                    ...prev,
                    activityStatus: false
                }));
            } else {
                const errorData = await response.json();
                setSaveError(errorData.message || 'Failed to update activity status');
            }
        } catch (err) {
            console.error('Error updating activity status:', err);
            setSaveError('Failed to update activity status');
        } finally {
            setSaving(null);
        }
    };

    return {
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
    };
}

