import '../../Style/Login style/Login.css';
import { useLogin } from '../../../hooks/Login/useLogin';
import { Link, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

export function Login() {
    const {
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
    } = useLogin();

    const navigate = useNavigate();

    useEffect(() => {
        if (success && redirectPath) {
            navigate(redirectPath);
        }
    }, [success, redirectPath, navigate]);

    return (
        <section className="login-section">
            <div className="login-container">
                <h2 className="login-title">Login</h2>

                {error && <div className="auth-message auth-error">{error}</div>}

                <form onSubmit={handleSubmit} className="login-form">
                    <div className="input-group">
                        <input
                            type="email"
                            placeholder="Enter your email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="login-input"
                            required
                        />
                    </div>
                    <div className="input-group">
                        <input
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="login-input"
                            required
                        />
                        <button
                            type="button"
                            className="show-password-btn"
                            onClick={toggleShowPassword}
                        >
                            {showPassword ? (
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M13.875 13.875A6.5 6.5 0 0 1 10 15c-4.5 0-7-5.5-7-5.5a12.5 12.5 0 0 1 3.375-4.125M7.25 3.25A7.5 7.5 0 0 1 10 3c4.5 0 7 5.5 7 5.5a12.5 12.5 0 0 1-1.5 2.25M12.5 10.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z"></path>
                                    <line x1="2.5" y1="2.5" x2="17.5" y2="17.5"></line>
                                </svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M1.25 10s3-5.5 8.75-5.5 8.75 5.5 8.75 5.5-3 5.5-8.75 5.5-8.75-5.5-8.75-5.5z"></path>
                                    <circle cx="10" cy="10" r="2.5"></circle>
                                </svg>
                            )}
                        </button>
                    </div>
                    <div className="remember-me-group">
                        <label className="remember-me-label">
                            <input
                                type="checkbox"
                                checked={rememberMe}
                                onChange={(e) => setRememberMe(e.target.checked)}
                                className="remember-me-checkbox"
                            />
                            <span className="remember-me-text">Remember me</span>
                        </label>
                    </div>
                    <button type="submit" className="login-button" disabled={loading}>
                        {loading ? 'Logging in...' : 'Login'}
                    </button>
                </form>
                <p className="login-footer">
                    Don't have an account? <Link to="/register" className="login-link">Register now!</Link>
                </p>
            </div>
        </section>
    );
}
