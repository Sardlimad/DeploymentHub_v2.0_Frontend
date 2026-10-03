import { createContext, useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";

export const AuthContext = createContext();

/** Lee la expiración del JWT (sin validar la firma: eso lo hace la API). */
function isTokenExpired(token) {
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return !payload.exp || payload.exp * 1000 <= Date.now();
  } catch {
    return true;
  }
}

function readSession() {
  const token = localStorage.getItem("token");
  const savedUser = localStorage.getItem("user");
  if (!token || !savedUser || isTokenExpired(token)) {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    return { token: null, user: null };
  }
  return { token, user: JSON.parse(savedUser) };
}

// full_name se mantiene para las pantallas que aún lo usan.
const toSessionUser = (user) => ({ ...user, full_name: user.name });

export const AuthProvider = ({ children }) => {
  const navigate = useNavigate();
  const [session] = useState(readSession);
  const [token, setToken] = useState(session.token);
  const [user, setUser] = useState(session.user);

  useEffect(() => {
    if (token) {
      localStorage.setItem("token", token);
    } else {
      localStorage.removeItem("token");
    }
  }, [token]);

  useEffect(() => {
    if (user) {
      localStorage.setItem("user", JSON.stringify(user));
    } else {
      localStorage.removeItem("user");
    }
  }, [user]);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    navigate("/login");
  }, [navigate]);

  // Cierra la sesión cuando vence el token, aunque la pestaña quede abierta.
  useEffect(() => {
    if (!token) return undefined;
    const timer = setInterval(() => {
      if (isTokenExpired(token)) logout();
    }, 30000);
    return () => clearInterval(timer);
  }, [token, logout]);

  const login = (newToken, userData, redirectTo = "/dashboard") => {
    setToken(newToken);
    setUser(toSessionUser(userData));
    navigate(redirectTo, { replace: true });
  };

  /** Actualiza los datos del usuario con sesión (ej: tras editar su nombre). */
  const refreshUser = useCallback((userData) => setUser((prev) => ({ ...prev, ...toSessionUser(userData) })), []);

  /** true si el usuario tiene alguno de los roles (ADMIN siempre puede). */
  const hasRole = useCallback(
    (...roles) => !!user && (user.role === "ADMIN" || roles.includes(user.role)),
    [user]
  );

  return (
    <AuthContext.Provider value={{ token, user, login, logout, hasRole, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};
