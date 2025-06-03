import React, { useEffect, useState } from "react";
import axios from "axios";
import "./MyFeedback.css";
import { MessageSquareReply, ShieldCheck, Trash2 } from "lucide-react";

export default function MyFeedback() {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const token = localStorage.getItem("token");

  // Завантажуємо власні фідбеки при завантаженні
  useEffect(() => {
    fetchMyFeedbacks();
  }, []);

  // Отримання власних відгуків з сервера
  async function fetchMyFeedbacks() {
    try {
      const res = await axios.get("http://localhost:5000/api/my-feedbacks", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setFeedbacks(res.data);
      setLoading(false);
    } catch {
      setError("Не вдалося завантажити ваші відгуки");
      setLoading(false);
    }
  }

  // Видалення власного фідбеку, якщо немає відповіді
  async function deleteFeedback(id) {
    if (!window.confirm("Ви впевнені, що хочете видалити відгук?")) return;
    try {
      await axios.delete(`http://localhost:5000/api/my-feedbacks/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchMyFeedbacks(); // оновлюємо список
    } catch {
      alert("Не вдалося видалити відгук");
    }
  }

  return (
    <div className="my-feedback">
      <h2>
        <MessageSquareReply size={20} /> Мої відгуки
      </h2>

      {loading ? (
        <p>Завантаження...</p>
      ) : error ? (
        <p>{error}</p>
      ) : feedbacks.length === 0 ? (
        <p>Ви ще не залишали відгуки.</p>
      ) : (
        <ul className="feedback-list">
          {feedbacks.map((fb) => (
            <li key={fb.id}>
              <p className="user-message">{fb.message}</p>
              <span className="date">
                {new Date(fb.created_at).toLocaleString()}
              </span>

              {/* Виводимо відповідь адміністратора або статус */}
              {fb.reply ? (
                <div className="admin-reply">
                  <ShieldCheck size={16} /> {fb.reply}
                </div>
              ) : (
                <div className="pending-reply">Очікує на відповідь...</div>
              )}

              {/* Кнопка видалення, якщо немає відповіді */}
              {!fb.reply && (
                <button
                  className="delete-btn"
                  onClick={() => deleteFeedback(fb.id)}
                >
                  <Trash2 size={16} style={{ marginRight: 6 }} />
                  Видалити
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
