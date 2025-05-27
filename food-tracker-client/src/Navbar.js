import React from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom"; //
import {
  FaUserCircle,
  FaUtensils,
  FaChartBar,
  FaWeight,
  FaSignOutAlt,
  FaTools, // для admin-панелі
} from "react-icons/fa";
import { useAuth } from "./AuthContext";
import "./Navbar.css"; // Стилі

export default function Navbar() {
  const { isLoggedIn, logout } = useAuth(); // Перевірка автентифікації
  const location = useLocation();
  const navigate = useNavigate();

  // Якщо користувач не залогінений навбар не показується
  if (!isLoggedIn) return null;

  const handleLogout = () => {
    logout(); // Очищення токенів
    navigate("/"); // Перенаправлення на головну
  };

  // Отримуємо роль користувача з localStorage
  const role = localStorage.getItem("role");

  return (
    <nav className="navbar">
      <ul className="navbar-links">
        <li className={location.pathname === "/profile" ? "active" : ""}>
          <Link to="/profile">
            <FaUserCircle /> Профіль
          </Link>
        </li>
        <li className={location.pathname === "/dashboard" ? "active" : ""}>
          <Link to="/dashboard">
            <FaUtensils /> Прийоми їжі
          </Link>
        </li>
        <li className={location.pathname === "/stats" ? "active" : ""}>
          <Link to="/stats">
            <FaChartBar /> Статистика
          </Link>
        </li>
        <li className={location.pathname === "/weight" ? "active" : ""}>
          <Link to="/weight">
            <FaWeight /> Вага
          </Link>
        </li>

        {/* Посилання для адміністратора */}
        {role === "admin" && (
          <li className={location.pathname === "/admin" ? "active" : ""}>
            <NavLink to="/admin">
              <FaTools /> Адмін-панель
            </NavLink>
          </li>
        )}

        <li>
          <button onClick={handleLogout} className="logout-btn">
            <FaSignOutAlt /> Вийти
          </button>
        </li>
      </ul>
    </nav>
  );
}
