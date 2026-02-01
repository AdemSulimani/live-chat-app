import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface UserData {
    id: string;
    name: string;
    email: string;
    country?: string;
    username?: string;
    displayName?: string;
    bio?: string;
    statusMessage?: string;
    profilePhoto?: string | null;
    profileCompleted: boolean;
    activityStatus?: 'online' | 'offline' | 'do_not_disturb';
    lastSeenEnabled?: boolean; // Nëse përdoruesi lejon last seen
    lastSeenAt?: string; // Koha e fundit kur përdoruesi ka lexuar mesazhe (si string nga API)
    createdAt?: string;
}

interface UserContextType {
    user: UserData | null;
    token: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    isRemembered: boolean; // Nëse token është në localStorage (remember me)
    login: (token: string, userData: UserData, rememberMe?: boolean) => void;
    logout: () => void;
    updateUser: (userData: Partial<UserData>) => void;
    getToken: () => string | null;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<UserData | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRemembered, setIsRemembered] = useState(false);

    // Load user data nga storage në mount
    useEffect(() => {
        const loadUserData = () => {
            try {
                // Kontrollo localStorage dhe sessionStorage
                const localToken = localStorage.getItem('token');
                const sessionToken = sessionStorage.getItem('token');
                const currentToken = localToken || sessionToken;

                const localUser = localStorage.getItem('user');
                const sessionUser = sessionStorage.getItem('user');
                const currentUserStr = localUser || sessionUser;

                if (currentToken && currentUserStr) {
                    try {
                        const userData = JSON.parse(currentUserStr);
                        setToken(currentToken);
                        setUser(userData);
                        // Nëse token është në localStorage, user-i ka "remember me"
                        setIsRemembered(!!localToken);
                    } catch (err) {
                        console.error('Error parsing user data:', err);
                        // Clear invalid data
                        localStorage.removeItem('token');
                        localStorage.removeItem('user');
                        sessionStorage.removeItem('token');
                        sessionStorage.removeItem('user');
                    }
                }
            } catch (err) {
                console.error('Error loading user data:', err);
            } finally {
                setIsLoading(false);
            }
        };

        loadUserData();
    }, []);

    const login = (newToken: string, userData: UserData, rememberMe: boolean = false) => {
        const storage = rememberMe ? localStorage : sessionStorage;
        
        // Clear old data
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
        
        // Set new data
        storage.setItem('token', newToken);
        storage.setItem('user', JSON.stringify(userData));
        
        setToken(newToken);
        setUser(userData);
        setIsRemembered(rememberMe);
    };

    const logout = () => {
        // Clear all storage
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
        
        setToken(null);
        setUser(null);
        setIsRemembered(false);
    };

    const updateUser = (userData: Partial<UserData>) => {
        if (!user) return;

        const updatedUser = { ...user, ...userData };
        setUser(updatedUser);

        // Update storage
        const storage = localStorage.getItem('token') ? localStorage : sessionStorage;
        storage.setItem('user', JSON.stringify(updatedUser));
    };

    const getToken = (): string | null => {
        return token || localStorage.getItem('token') || sessionStorage.getItem('token');
    };

    const value: UserContextType = {
        user,
        token,
        isAuthenticated: !!user && !!token,
        isLoading,
        isRemembered,
        login,
        logout,
        updateUser,
        getToken,
    };

    return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
    const context = useContext(UserContext);
    if (context === undefined) {
        throw new Error('useUser must be used within a UserProvider');
    }
    return context;
}

