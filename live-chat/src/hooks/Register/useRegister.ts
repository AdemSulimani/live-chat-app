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

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Handle register logic here
        console.log('Register:', { name, email, country, password, confirmPassword, acceptTerms });
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
        handleSubmit,
        toggleShowPassword,
        toggleShowConfirmPassword,
        countries
    };
}

