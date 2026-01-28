import { useState, useRef } from 'react';
import { useDashboard } from '../Dashboard/useDashboard';

export function useProfileFull() {
    const { currentUser } = useDashboard();
    
    const [isEditing, setIsEditing] = useState({
        name: false,
        username: false,
        bio: false,
        statusMessage: false
    });

    const [profileData, setProfileData] = useState({
        name: currentUser.name,
        username: currentUser.username,
        bio: currentUser.bio || '',
        statusMessage: currentUser.statusMessage || '',
        avatar: currentUser.avatar,
        photoPreview: currentUser.avatar || null
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
                photoPreview: URL.createObjectURL(file)
            }));
        }
    };

    const toggleEdit = (field: keyof typeof isEditing) => {
        setIsEditing(prev => ({
            ...prev,
            [field]: !prev[field]
        }));
    };

    const handleSave = (field: keyof typeof isEditing) => {
        // Here you would typically save to backend
        console.log(`Saving ${field}:`, profileData[field]);
        setIsEditing(prev => ({
            ...prev,
            [field]: false
        }));
    };

    const handleCancel = (field: keyof typeof isEditing) => {
        // Reset to original value
        const originalValues: Record<string, string> = {
            name: currentUser.name,
            username: currentUser.username,
            bio: currentUser.bio || '',
            statusMessage: currentUser.statusMessage || ''
        };
        
        setProfileData(prev => ({
            ...prev,
            [field]: originalValues[field]
        }));
        setIsEditing(prev => ({
            ...prev,
            [field]: false
        }));
    };

    return {
        profileData,
        isEditing,
        fileInputRef,
        handleInputChange,
        handlePhotoUpload,
        toggleEdit,
        handleSave,
        handleCancel
    };
}

