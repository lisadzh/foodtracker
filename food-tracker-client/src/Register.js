import React, { useState } from "react";
import axios from "axios";
import { Mail, Lock, UserPlus } from "lucide-react"; // іконки
import BackButton from "./BackButton";
import BackgroundWrapper from "./components/BackgroundWrapper";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

import "./Register.css";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post("http://localhost:5000/api/register", {
        email,
        password,
      });
      setMessage("Реєстрація успішна! Вхід...");

      const loginRes = await axios.post("http://localhost:5000/api/login", {
        email,
        password,
      });

      login(loginRes.data.token);
      setTimeout(() => {
        navigate("/profile");
      }, 2000);
    } catch (err) {
      setMessage(err.response?.data?.message || "Помилка реєстрації");
    }
  };

  return (
    <BackgroundWrapper>
      <div className="register-container">
        <BackButton />
        <h2 className="page-title">
          <UserPlus size={22} style={{ marginRight: 8 }} />
          Реєстрація
        </h2>

        <form onSubmit={handleSubmit} className="register-form">
          <div className="input-wrapper">
            <Mail className="input-icon" size={18} />
            <input
              type="email"
              placeholder="Ваш email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="input-wrapper">
            <Lock className="input-icon" size={18} />
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
          <p className="auth-toggle">
            Вже є акаунт?{" "}
            <a href="/login" className="auth-link">
              Увійдіть тут
            </a>
          </p>
        </form>
      </div>
    </BackgroundWrapper>
  );
}
