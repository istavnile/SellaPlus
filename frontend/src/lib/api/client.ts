import axios from 'axios';

const API_URL = typeof window === 'undefined'
  ? (process.env.BACKEND_URL || 'http://localhost:4300/api/v1')
  : '/api/backend';

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

export const uploadFile = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  return apiClient.post('/uploads/product', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const getImageUrl = (url?: string | null) => {
  if (!url) return null;
  if (url.startsWith('data:') || url.startsWith('http')) return url;
  const baseUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4300/api/v1').replace('/api/v1', '');
  return `${baseUrl}${url}`;
};
