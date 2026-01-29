import { Navigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import { ReactNode } from 'react';

interface PublicRouteProps {
    children: ReactNode;
}

export function PublicRoute({ children }: PublicRouteProps) {
    const { isAuthenticated, isLoading, user, isRemembered } = useUser();

    // Loading state
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

    // Nëse user-i ka account dhe ka "remember me" (token në localStorage), redirect automatik
    // Nëse token është vetëm në sessionStorage, nuk bëj redirect (pas refresh nuk do të jetë më authenticated)
    if (isAuthenticated && isRemembered && user) {
        if (user.profileCompleted) {
            return <Navigate to="/dashboard" replace />;
        } else {
            return <Navigate to="/profile" replace />;
        }
    }

    // Nëse nuk është authenticated ose nuk ka "remember me", shfaq login/register
    return <>{children}</>;
}

