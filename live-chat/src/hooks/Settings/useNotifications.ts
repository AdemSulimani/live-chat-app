import { useState } from 'react';

export interface NotificationSettings {
    showBanner: 'Always' | 'Never';
    showBadge: 'Always' | 'Never';
    messageNotifications: boolean;
    showPreviews: boolean;
    showReactionNotifications: boolean;
    statusReactions: boolean;
    callNotifications: boolean;
    incomingCallSounds: boolean;
    incomingSounds: boolean;
    outgoingSounds: boolean;
}

export function useNotifications() {
    const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
        showBanner: 'Always',
        showBadge: 'Always',
        messageNotifications: true,
        showPreviews: true,
        showReactionNotifications: true,
        statusReactions: true,
        callNotifications: true,
        incomingCallSounds: true,
        incomingSounds: true,
        outgoingSounds: false
    });

    const [openDropdown, setOpenDropdown] = useState<string | null>(null);

    const toggleSetting = (key: keyof NotificationSettings) => {
        setNotificationSettings(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    const handleDropdownSelect = (setting: 'showBanner' | 'showBadge', value: 'Always' | 'Never') => {
        setNotificationSettings(prev => ({
            ...prev,
            [setting]: value
        }));
        setOpenDropdown(null);
    };

    return {
        notificationSettings,
        openDropdown,
        setOpenDropdown,
        toggleSetting,
        handleDropdownSelect
    };
}

