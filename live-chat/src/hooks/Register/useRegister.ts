import { useState } from 'react';

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

            // Registration successful
            setSuccess(true);
            // Optional: clear form fields after success
            // setName('');
            // setEmail('');
            // setCountry('');
            // setPassword('');
            // setConfirmPassword('');
            // setAcceptTerms(false);

            console.log('Register success:', data);
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
        handleSubmit,
        toggleShowPassword,
        toggleShowConfirmPassword,
        countries
    };
}

