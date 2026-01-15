import axios, { AxiosInstance, InternalAxiosRequestConfig } from "axios";

// Detect API URL based on environment
const getApiBaseUrl = (): string => {
  // Check for explicit environment variable first
  if (import.meta.env.VITE_API_URL) {
    console.log('[API] Using VITE_API_URL:', import.meta.env.VITE_API_URL);
    return import.meta.env.VITE_API_URL;
  }

  // For GitHub Codespaces, detect the forwarded port URL
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    
    console.log('[API] Detected hostname:', hostname);
    console.log('[API] Protocol:', protocol);

    // Check if running in GitHub Codespaces
    if (hostname.includes(".app.github.dev")) {
      // Extract the codespace name by replacing the current port with 8000
      const backendUrl = `${protocol}//${hostname.replace(/\-\d+\.app\.github\.dev/, '-8000.app.github.dev')}/api/v1`;
      console.log('[API] GitHub Codespaces detected, using:', backendUrl);
      return backendUrl;
    }
  }

  // Default to localhost for local development
  console.log('[API] Using localhost default');
  return "http://localhost:8000/api/v1";
};

const API_BASE_URL = getApiBaseUrl();
console.log('[API] Final API_BASE_URL:', API_BASE_URL);

interface RequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor - inject JWT token
api.interceptors.request.use((config: RequestConfig) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor - handle token refresh and errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as RequestConfig;

    // Handle 401 Unauthorized - try refresh token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem("refresh_token");
        if (!refreshToken) {
          // No refresh token, redirect to login
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
          window.location.href = "/login";
          return Promise.reject(error);
        }

        const response = await axios.post(
          `${API_BASE_URL}/auth/token/refresh/`,
          {
            refresh: refreshToken,
          }
        );

        const { access } = response.data;
        localStorage.setItem("access_token", access);

        originalRequest.headers.Authorization = `Bearer ${access}`;
        return api(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        window.location.href = "/login";
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
