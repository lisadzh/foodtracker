import React from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FaUserPlus,
  FaSignInAlt,
  FaUserCircle,
  FaUtensils,
  FaChartBar,
  FaWeight,
  FaSignOutAlt,
} from "react-icons/fa";
import "./Home.css";
import backgroundImage from "./assets/images/background-pattern.png";
import { useAuth } from "./AuthContext"; // Підключаємо контекст

export default function Home() {
  const { isLoggedIn, logout } = useAuth(); // Доступ до стану авторизації
  const navigate = useNavigate();

  const handleLogout = () => {
    logout(); // Видаляємо токен і обнуляємо стан
    navigate("/"); // Повертаємось на головну
  };

  return (
    <div
      style={{
        backgroundImage: `url(${backgroundImage})`,
        backgroundRepeat: "no-repeat",
        backgroundSize: "cover",
        backgroundAttachment: "fixed",
        minHeight: "100vh",
      }}
    >
      <div className="home-container">
        <div className="home-header">
          <img src="/logo.png" alt="Logo" className="home-logo-inline" />
          <h1 className="home-title-inline">Food Tracker</h1>
        </div>

        <p className="home-subtitle">
          {isLoggedIn
            ? "Вітаємо! Оберіть розділ:"
            : "Увійдіть або зареєструйтесь, щоб продовжити:"}
        </p>

        <div className="home-buttons">
          {!isLoggedIn ? (
            <>
              <Link to="/register" className="home-button">
                <FaUserPlus /> Реєстрація
              </Link>

              <Link to="/login" className="home-button">
                <FaSignInAlt /> Увійти
              </Link>
            </>
          ) : (
            <>
              <Link to="/profile" className="home-button">
                <FaUserCircle /> Профіль
              </Link>

              <Link to="/dashboard" className="home-button">
                <FaUtensils /> Прийоми їжі
              </Link>

              <Link to="/stats" className="home-button">
                <FaChartBar /> Статистика
              </Link>

              <Link to="/weight" className="home-button">
                <FaWeight /> Контроль ваги
              </Link>

              <button className="home-button" onClick={handleLogout}>
                <FaSignOutAlt /> Вийти
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
