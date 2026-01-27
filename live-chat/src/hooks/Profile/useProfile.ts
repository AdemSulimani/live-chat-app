import { useState, useRef } from 'react';

export function useProfile() {
    const [profileData, setProfileData] = useState({
        username: '',
        displayName: '',
        bio: '',
        statusMessage: '',
        profilePhoto: null as File | null,
        photoPreview: null as string | null
    });

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setProfileData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setProfileData(prev => ({
                ...prev,
                profilePhoto: file,
                photoPreview: URL.createObjectURL(file)
            }));
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        console.log('Profile Data:', profileData);
        // Here you would typically send the data to your backend
    };

    return {
        profileData,
        fileInputRef,
        handleInputChange,
        handlePhotoUpload,
        handleSubmit
    };
}

