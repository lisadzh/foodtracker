import React, { useEffect, useState } from "react";
import axios from "axios";
import "./AdminFeedback.css";
import { ShieldCheck } from "lucide-react";
import { Trash2, CheckCircle } from "lucide-react";

export default function AdminFeedback() {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const token = localStorage.getItem("token");
  const filteredFeedbacks = feedbacks.filter(
    (fb) =>
      fb.email.toLowerCase().includes(search.toLowerCase()) ||
      fb.message.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    fetchFeedbacks();
  }, []);

  async function fetchFeedbacks() {
    try {
      const res = await axios.get("http://localhost:5000/api/admin/feedbacks", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setFeedbacks(res.data);
      setLoading(false);
    } catch {
      setError("Не вдалося завантажити відгуки.");
      setLoading(false);
    }
  }

  async function deleteFeedback(id) {
    if (!window.confirm("Видалити цей відгук?")) return;

    try {
      await axios.delete(`http://localhost:5000/api/admin/feedbacks/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchFeedbacks(); // оновити список
    } catch {
      alert("Помилка при видаленні");
    }
  }

  async function markAsRead(feedbackId) {
    try {
      await axios.put(
        `http://localhost:5000/api/admin/feedback/${feedbackId}/read`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      fetchFeedbacks(); // оновлення списку
    } catch {
      alert("Не вдалося оновити статус");
    }
  }

  if (loading) return <p>Завантаження...</p>;
  if (error) return <p>{error}</p>;

  return (
    <div className="admin-feedback">
      <h2>Відгуки користувачів</h2>
      <input
        type="text"
        placeholder="Пошук email або повідомлення..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="search-input"
      />

      {loading ? (
        <p>Завантаження...</p>
      ) : feedbacks.length === 0 ? (
        <p>Немає відгуків</p>
      ) : (
        <ul className="feedback-list">
          {filteredFeedbacks.map((fb) => (
            <li key={fb.id} className={!fb.is_read ? "new-feedback" : ""}>
              <div className="feedback-header">
                <strong>{fb.email}</strong>
                {!fb.is_read && <span className="new-badge">Новий</span>}
              </div>
              <p>{fb.message}</p>
              <span>{new Date(fb.created_at).toLocaleString()}</span>
              <div className="feedback-actions">
                {!fb.is_read && (
                  <button
                    className="mark-read-btn"
                    onClick={() => markAsRead(fb.id)}
                  >
                    <CheckCircle size={16} style={{ marginRight: 6 }} />
                    Прочитано
                  </button>
                )}
                <button
                  className="delete-btn"
                  onClick={() => deleteFeedback(fb.id)}
                >
                  <Trash2 size={16} style={{ marginRight: 6 }} />
                  Видалити
                </button>
              </div>

              {/* Відповідь адміністратора */}
              {fb.reply ? (
                <div className="admin-reply">
                  <strong>Ваша відповідь:</strong>
                  <p>{fb.reply}</p>
                  <small>{new Date(fb.replied_at).toLocaleString()}</small>
                </div>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.target);
                    const text = formData.get("reply");

                    axios
                      .put(
                        `http://localhost:5000/api/admin/feedbacks/${fb.id}/reply`,
                        { reply: text },
                        {
                          headers: { Authorization: `Bearer ${token}` },
                        }
                      )
                      .then(fetchFeedbacks)
                      .catch(() => alert("Помилка при надсиланні відповіді"));
                  }}
                  className="reply-form"
                >
                  <textarea
                    name="reply"
                    placeholder="Ваша відповідь..."
                    required
                  />
                  <button type="submit">
                    <CheckCircle size={16} style={{ marginRight: 6 }} />
                    Надіслати
                  </button>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
