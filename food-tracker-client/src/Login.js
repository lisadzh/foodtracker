import React, { useState } from "react";
import axios from "axios";
import { Mail, Lock, LogIn } from "lucide-react"; // 👈 додано LogIn
import BackButton from "./BackButton";
import BackgroundWrapper from "./components/BackgroundWrapper";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { jwtDecode } from "jwt-decode";

import "./Login.css";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post("http://localhost:5000/api/login", {
        email,
        password,
      });

      const decoded = jwtDecode(res.data.token);
      localStorage.setItem("role", decoded.role);
      login(res.data.token);
      navigate("/");
    } catch (err) {
      setMessage(err.response?.data?.message || "Щось пішло не так");
    }
  };

  return (
    <BackgroundWrapper>
      <div className="login-container">
        <BackButton />
        <h2 className="page-title">
          <LogIn size={22} style={{ marginRight: 8 }} />
          Увійти
        </h2>

        <form onSubmit={handleLogin} className="login-form">
          <div className="input-wrapper">
            <Mail className="input-icon" size={20} strokeWidth={1.5} />
            <input
              type="email"
              placeholder="Ваша пошта"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="input-wrapper">
            <Lock className="input-icon" size={20} strokeWidth={1.5} />
            <input
              type="password"
              placeholder="Пароль"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button type="submit">Увійти</button>
          {message && <p className="login-message">{message}</p>}
          <p className="auth-toggle">
            Немає акаунта?{" "}
            <a href="/register" className="auth-link">
              Зареєструйтеся тут
            </a>
          </p>
        </form>
      </div>
    </BackgroundWrapper>
  );
}
