import axios from 'axios';

// 1. Define the Backend URL (Dynamic)
// - If VITE_API_URL is set in .env, use it.
// - If PROD (Vercel), use configured URL.
// - If DEV (Localhost), use Local Backend.
// - If VITE_API_URL is set, use it.
// - Otherwise, use relative path "" (proxied by Vercel) or localhost fallback? 
// BETTER: Use "" to use current domain, which triggers Vercel proxy
export const API_BASE_URL = "";

const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000, // 30 second timeout
    headers: {
        'Content-Type': 'application/json',
        "ngrok-skip-browser-warning": "true",
    },
});

// Add response interceptor for better error handling
api.interceptors.response.use(
    (response) => response,
    (error) => {
        // Log detailed error for debugging
        console.error('API Error:', {
            url: error.config?.url,
            method: error.config?.method,
            status: error.response?.status,
            data: error.response?.data,
            message: error.message
        });
        return Promise.reject(error);
    }
);

export default api;

