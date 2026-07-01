import axios from 'axios';

// 1. Define the Backend URL (Dynamic)
// - If VITE_API_URL is set in .env, use it.
// - If PROD (Vercel), use configured URL.
// - If DEV (Localhost), use Local Backend.
// - If VITE_API_URL is set, use it.
// - Otherwise, use relative path "" (proxied by Vercel) or localhost fallback? 
// BETTER: Use "" to use current domain, which triggers Vercel proxy, unless VITE_API_URL is explicitly provided.
export const API_BASE_URL = import.meta.env.VITE_API_URL || "https://lightgoldenrodyellow-stingray-297524.hostingersite.com";

const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000, // 30 second timeout
    headers: {
        'Content-Type': 'application/json',
    },
});

// List of WhatsApp endpoints
const WHATSAPP_ENDPOINTS = [
    '/api/send',
    '/api/send-group',
    '/api/status',
    '/api/get-qr',
    '/api/qr-image',
    '/api/reset-session',
    '/api/logout',
    '/api/reconnect',
    '/api/connect',
    '/api/sessions',
    '/api/disconnect',
    '/api/send-broadcast',
    '/api/send-custom-bulk'
];

// Add request interceptor to route WhatsApp requests
api.interceptors.request.use(
    (config) => {
        const url = config.url || "";
        
        // If the URL is one of the WhatsApp endpoints, route it to the darkslateblue domain
        const isWhatsappEndpoint = WHATSAPP_ENDPOINTS.some(endpoint => url.startsWith(endpoint));
        if (isWhatsappEndpoint) {
            config.baseURL = "https://darkslateblue-sandpiper-851386.hostingersite.com";
            
            // Append session parameter for multi-session support
            const adminName = localStorage.getItem('adminName') || 'default';
            const adminRole = localStorage.getItem('adminRole') || '';
            const sessionName = adminRole === 'admin' ? 'admin' : adminName.trim().replace(/\s+/g, '_');
            
            config.params = {
                ...config.params,
                session: sessionName
            };
        } else {
            config.baseURL = import.meta.env.VITE_API_URL || "https://lightgoldenrodyellow-stingray-297524.hostingersite.com";
        }

        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

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

