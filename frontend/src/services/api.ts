const getApiBase = (): string => {
  if (typeof window !== 'undefined') {
    const port = window.location.port;
    const hostname = window.location.hostname;
    // When served via VS Code Live Server (e.g. port 5500, 5502) rather than Vite proxy (port 3000)
    if (port && port !== '3000' && (hostname === 'localhost' || hostname === '127.0.0.1')) {
      return 'http://localhost:5001/api';
    }
  }
  return '/api';
};

const API_BASE = getApiBase();

export const getAuthToken = (): string | null => {
  return localStorage.getItem('msot_auth_token');
};

export const setAuthToken = (token: string | null): void => {
  if (token) {
    localStorage.setItem('msot_auth_token', token);
  } else {
    localStorage.removeItem('msot_auth_token');
  }
};

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error ${response.status}: ${response.statusText}`);
  }

  // Handle binary downloads (e.g. CSV export)
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('text/csv')) {
    return (await response.text()) as unknown as T;
  }

  return response.json();
}
