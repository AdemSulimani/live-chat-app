import { Navigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import type { ReactNode } from 'react';

interface ProtectedRouteProps {
    children: ReactNode;
    requireProfile?: boolean; // Nëse true, kërkon që profili të jetë i plotësuar
}

export function ProtectedRoute({ children, requireProfile = true }: ProtectedRouteProps) {
    const { isAuthenticated, isLoading, user } = useUser();

    // Loading state - mos bëj redirect derisa të ngarkohen të dhënat
    if (isLoading) {
        return (
            <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                height: '100vh',
                fontSize: '18px',
                color: 'var(--black)'
            }}>
                Loading...
            </div>
        );
    }

    // Nëse nuk është authenticated, redirect në login
    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    // Nëse kërkohet profili i plotësuar dhe nuk është i plotësuar, redirect në profile
    if (requireProfile && user && !user.profileCompleted) {
        return <Navigate to="/profile" replace />;
    }

    // Nëse gjithçka është në rregull, shfaq children
    return <>{children}</>;
}

