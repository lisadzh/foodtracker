import React, { useState } from "react";
import axios from "axios";
import "./FeedbackForm.css";
import { Link } from "react-router-dom";

export default function FeedbackForm() {
  // Стан для повідомлення користувача
  const [message, setMessage] = useState("");
  // Стан для повідомлень про успіх / помилки
  const [status, setStatus] = useState("");

  // Токен з localStorage
  const token = localStorage.getItem("token");

  // Обробка відправки форми
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!message.trim()) return;

    try {
      await axios.post(
        "http://localhost:5000/api/feedback",
        { message },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // Повідомлення про успішну відправку
      setStatus("Ваше повідомлення надіслано!");
      setMessage("");
    } catch (err) {
      setStatus("Помилка при надсиланні!");
    }
  };

  return (
    <div className="feedback-container">
      <h2>Зворотній зв’язок</h2>
      <p>Залиште своє повідомлення, побажання або питання:</p>

      <form onSubmit={handleSubmit}>
        <textarea
          placeholder="Напишіть щось..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={6}
        ></textarea>

        <button type="submit">Надіслати</button>
      </form>

      {/* Вивід статусу після надсилання */}
      {status && <p className="feedback-status">{status}</p>}

      {/* Кнопка переходу до сторінки “Мої відгуки” */}
      <div className="feedback-navigation">
        <Link to="/my-feedbacks" className="view-my-feedback-btn">
          Переглянути мої відгуки
        </Link>
      </div>
    </div>
  );
}
