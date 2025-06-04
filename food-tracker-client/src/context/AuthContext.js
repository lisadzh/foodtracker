// AuthContext.js — глобальний контекст авторизації

import { createContext, useContext, useState, useEffect } from "react";

// Контекст
export const AuthContext = createContext();

// Провайдер: обгортає додаток
export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);

  // При завантаженні перевіряємо токен у localStorage
  useEffect(() => {
    const stored = localStorage.getItem("token");
    if (stored) setToken(stored);
  }, []);

  // Вхід
  const login = (newToken) => {
    localStorage.setItem("token", newToken);
    setToken(newToken);
  };

  // Вихід
  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ token, isLoggedIn: !!token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
