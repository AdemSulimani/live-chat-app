import { useState } from 'react';

export function useLogin() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Handle login logic here
        console.log('Login:', { email, password, rememberMe });
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
        handleSubmit,
        toggleShowPassword
    };
}

