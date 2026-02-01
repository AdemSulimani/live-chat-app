// API Configuration
// Uses VITE_API_URL from environment variables
// Falls back to localhost for development if not set
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

