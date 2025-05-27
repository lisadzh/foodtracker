import React, { useState } from "react";
import axios from "axios";
import { FaEnvelope, FaLock } from "react-icons/fa";
import BackButton from "./BackButton";
import BackgroundWrapper from "./components/BackgroundWrapper";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext"; // 🔐

import "./Register.css";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const { login } = useAuth(); // отримуємо login() з контексту
  const navigate = useNavigate(); // для редиректу

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // 1. Реєстрація
      await axios.post("http://localhost:5000/api/register", {
        email,
        password,
      });

      setMessage("Реєстрація успішна! Вхід..."); // повідомлення

      // 2. Вхід
      const loginRes = await axios.post("http://localhost:5000/api/login", {
        email,
        password,
      });

      login(loginRes.data.token); // токен у контекст

      // затримка перед редиректом
      setTimeout(() => {
        navigate("/profile");
      }, 2000); // 2 секунди
    } catch (err) {
      setMessage(err.response?.data?.message || "❌ Помилка реєстрації");
    }
  };

  return (
    <BackgroundWrapper>
      <div className="register-container">
        <BackButton />
        <h2 className="page-title">Реєстрація</h2>

        <form onSubmit={handleSubmit} className="register-form">
          <div className="input-wrapper">
            <FaEnvelope className="input-icon" />
            <input
              type="email"
              placeholder="Ваш email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="input-wrapper">
            <FaLock className="input-icon" />
            <input
              type="password"
              placeholder="Ваш пароль"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button type="submit">Зареєструватися</button>

          {message && <p className="register-message">{message}</p>}
        </form>
      </div>
    </BackgroundWrapper>
  );
}
