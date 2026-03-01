const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

export function getToken() {
  return localStorage.getItem("token");
}

export function setToken(token) {
  localStorage.setItem("token", token);
}

export function clearToken() {
  localStorage.removeItem("token");
}

export async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    const res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers
    });

    const data = await res.json().catch(() => ({}));
    
    if (!res.ok) {
      const message = data?.message || `Request failed with status ${res.status}`;
      const error = new Error(message);
      error.status = res.status;
      error.data = data;
      
      // Auto-logout on 401
      if (res.status === 401 && path !== '/auth/login') {
        clearToken();
        window.location.href = '/login';
      }
      
      throw error;
    }
    
    return data;
  } catch (error) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('Network error. Please check your connection.');
    }
    throw error;
  }
}
