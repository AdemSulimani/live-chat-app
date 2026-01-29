import { useState } from 'react';
import { useUser } from '../../contexts/UserContext';

const countries = [
    'Albania', 'Kosovo', 'United States', 'United Kingdom', 'Germany', 'France',
    'Italy', 'Spain', 'Netherlands', 'Belgium', 'Switzerland', 'Austria',
    'Sweden', 'Norway', 'Denmark', 'Finland', 'Poland', 'Greece', 'Portugal',
    'Canada', 'Australia', 'New Zealand', 'Japan', 'South Korea', 'China',
    'India', 'Brazil', 'Argentina', 'Mexico', 'Turkey', 'Russia', 'Other'
];

export function useRegister() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [country, setCountry] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [acceptTerms, setAcceptTerms] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [redirectPath, setRedirectPath] = useState<string | null>(null);
    const { login } = useUser();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(false);

        // Simple client-side checks before calling backend
        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setLoading(true);
        try {
            const response = await fetch('http://localhost:5000/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name,
                    email,
                    country,
                    password,
                    confirmPassword,
                    acceptTerms,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.message || 'Registration failed');
                return;
            }

            // Registration successful - auto login user
            console.log('Register success:', data);
            
            // Auto login pas regjistrimit nëse ka token
            if (data.user && data.token) {
                login(data.token, {
                    id: data.user.id,
                    name: data.user.name,
                    email: data.user.email,
                    country: data.user.country,
                    username: data.user.username || '',
                    displayName: data.user.displayName || '',
                    bio: data.user.bio || '',
                    statusMessage: data.user.statusMessage || '',
                    profilePhoto: data.user.profilePhoto || null,
                    profileCompleted: data.user.profileCompleted || false,
                    createdAt: data.user.createdAt || '',
                }, false);
                
                // Redirect në profile pasi profili nuk është i plotësuar pas regjistrimit
                setRedirectPath('/profile');
            } else {
                // Nëse nuk kthehet token, redirect në login
                setRedirectPath('/login');
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

    const toggleShowConfirmPassword = () => {
        setShowConfirmPassword(!showConfirmPassword);
    };

    return {
        name,
        setName,
        email,
        setEmail,
        country,
        setCountry,
        password,
        setPassword,
        confirmPassword,
        setConfirmPassword,
        showPassword,
        showConfirmPassword,
        acceptTerms,
        setAcceptTerms,
        loading,
        error,
        success,
        redirectPath,
        handleSubmit,
        toggleShowPassword,
        toggleShowConfirmPassword,
        countries
    };
}

