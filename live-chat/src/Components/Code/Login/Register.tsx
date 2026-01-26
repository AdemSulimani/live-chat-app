import { useState } from 'react';
import '../../Style/Login style/Register.css';

const countries = [
    'Albania', 'Kosovo', 'United States', 'United Kingdom', 'Germany', 'France',
    'Italy', 'Spain', 'Netherlands', 'Belgium', 'Switzerland', 'Austria',
    'Sweden', 'Norway', 'Denmark', 'Finland', 'Poland', 'Greece', 'Portugal',
    'Canada', 'Australia', 'New Zealand', 'Japan', 'South Korea', 'China',
    'India', 'Brazil', 'Argentina', 'Mexico', 'Turkey', 'Russia', 'Other'
];

interface RegisterProps {
    onSwitchToLogin: () => void;
}

export function Register({ onSwitchToLogin }: RegisterProps) {
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

    return (
        <section className="register-section">
            <div className="register-container">
                <h2 className="register-title">Register</h2>
                <form onSubmit={handleSubmit} className="register-form">
                    <div className="input-group">
                        <input
                            type="text"
                            placeholder="Enter your name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="register-input"
                            required
                        />
                    </div>
                    <div className="input-group">
                        <input
                            type="email"
                            placeholder="Email address"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="register-input"
                            required
                        />
                    </div>
                    <div className="input-group">
                        <select
                            value={country}
                            onChange={(e) => setCountry(e.target.value)}
                            className="register-input register-select"
                            required
                        >
                            <option value="">Country</option>
                            {countries.map((countryName) => (
                                <option key={countryName} value={countryName}>
                                    {countryName}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="input-group">
                        <input
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="register-input"
                            required
                        />
                        <button
                            type="button"
                            className="show-password-btn"
                            onClick={() => setShowPassword(!showPassword)}
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
                    <div className="input-group">
                        <input
                            type={showConfirmPassword ? 'text' : 'password'}
                            placeholder="Confirm password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="register-input"
                            required
                        />
                        <button
                            type="button"
                            className="show-password-btn"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        >
                            {showConfirmPassword ? (
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
                    <div className="terms-group">
                        <label className="terms-label">
                            <input
                                type="checkbox"
                                checked={acceptTerms}
                                onChange={(e) => setAcceptTerms(e.target.checked)}
                                className="terms-checkbox"
                                required
                            />
                            <span className="terms-text">I accept terms & policies</span>
                        </label>
                    </div>
                    <button type="submit" className="register-button">
                        Register
                    </button>
                </form>
                <p className="register-footer">
                    Already have an account? <a href="#" className="register-link" onClick={(e) => { e.preventDefault(); onSwitchToLogin(); }}>Login</a>
                </p>
            </div>
        </section>
    );
}
