import axios from "axios";

// URL de la API configurable por ambiente (.env: VITE_API_URL). Por defecto, la API local.
const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5228/api",
});

// Ruta del login: no se intercepta su 401 (credenciales incorrectas no son una sesión vencida).
const LOGIN_PATH = "/auth/login";

API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

API.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const isLoginCall = error.config?.url?.toLowerCase().includes(LOGIN_PATH);

    if (status === 401 && !isLoginCall) {
      // Sesión vencida o inválida: se limpia y se vuelve al login.
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      if (!window.location.pathname.startsWith("/login")) {
        window.location.href = "/login?expired=1";
      }
    } else if (status === 403) {
      window.location.href = "/403forbidden";
    }
    return Promise.reject(error);
  }
);

/** Mensaje legible de un error de la API (ProblemDetails). */
export const apiErrorMessage = (error, fallback = "Ocurrió un error inesperado.") => {
  const data = error?.response?.data;
  if (data?.errors) {
    const first = Object.values(data.errors).flat()[0];
    if (first) return first;
  }
  if (error?.response?.status === 429) {
    return "Demasiados intentos. Espera un minuto y vuelve a intentar.";
  }
  return data?.detail || fallback;
};

export const api = API;
export default API;
