import { useState } from 'react';
import { useUser } from '../../contexts/UserContext';
import { API_URL } from '../../utils/apiConfig';

export function useLogin() {
    const { login } = useUser();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [redirectPath, setRedirectPath] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(false);
        setRedirectPath(null);

        setLoading(true);
        try {
            const response = await fetch(`${API_URL}/api/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    identifier: email, // mund të jetë email ose username, ne po përdorim email nga forma
                    password,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.message || 'Login failed');
                return;
            }

            console.log('Login success:', data);
            
            // Ruaj token dhe user data në context
            if (data.token && data.user) {
                login(data.token, data.user, rememberMe);
            }

            // Kontrollo nëse profili është i plotësuar
            const profileCompleted = data.user?.profileCompleted || false;
            
            // Vendos redirect path bazuar në profileCompleted
            if (profileCompleted) {
                setRedirectPath('/dashboard');
            } else {
                setRedirectPath('/profile');
            }

            setSuccess(true);
        } catch (err) {
            console.error(err);
            setError('Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const toggleShowPassword = () => {
        setShowPassword(!showPassword);
    };

    return {
        email,
        setEmail,
        password,
        setPassword,
        showPassword,
        rememberMe,
        setRememberMe,
        loading,
        error,
        success,
        redirectPath,
        handleSubmit,
        toggleShowPassword
    };
}

