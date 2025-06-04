import React, { useEffect, useState } from "react";
import axios from "axios";
import { Trash2, ShieldCheck } from "lucide-react"; // Іконки
import { jwtDecode } from "jwt-decode"; // Декодування токена
import "./AdminDashboard.css"; // Файл стилів

export default function AdminDashboard() {
  // Стан для користувачів, індикаторів та пошуку
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  // Отримуємо токен з локального сховища
  const token = localStorage.getItem("token");
  const decoded = jwtDecode(token);
  const currentUserId = decoded.id;

  // Відфільтрований список по email
  const filteredUsers = users.filter((u) =>
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  // Завантаження користувачів при відкритті сторінки
  useEffect(() => {
    fetchUsers();
  }, []);

  // Отримати всіх користувачів з сервера
  async function fetchUsers() {
    try {
      const res = await axios.get("http://localhost:5000/api/admin/users", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(res.data);
      setLoading(false);
    } catch (err) {
      setError("Не вдалося завантажити користувачів");
      setLoading(false);
    }
  }

  // Змінити роль користувача (user <=> admin)
  async function updateRole(userId, newRole) {
    try {
      await axios.put(
        `http://localhost:5000/api/admin/users/${userId}/role`,
        { role: newRole },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      fetchUsers(); // Оновити список
    } catch {
      alert("Помилка при оновленні ролі");
    }
  }

  // Видалити користувача (крім себе)
  async function deleteUser(userId) {
    if (!window.confirm("Ви впевнені, що хочете видалити цього користувача?"))
      return;

    try {
      await axios.delete(`http://localhost:5000/api/admin/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchUsers();
    } catch {
      alert("Помилка при видаленні користувача");
    }
  }

  // Виводимо індикатор або помилку
  if (loading) return <p>Завантаження...</p>;
  if (error) return <p>{error}</p>;

  return (
    <div className="admin-dashboard">
      <div className="admin-card">
        <div className="admin-panel">
          <h2 className="admin-title">
            <ShieldCheck size={24} /> Адмін-панель
          </h2>

          {/* Поле для пошуку */}
          <input
            type="text"
            placeholder="Пошук email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-input"
          />

          {/* Таблиця користувачів */}
          <table className="user-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Email</th>
                <th>Роль</th>
                <th>Змінити роль</th>
                <th>Видалити</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id}>
                  <td>{user.id}</td>
                  <td>{user.email}</td>
                  <td>{user.role}</td>
                  <td>
                    <button
                      onClick={() =>
                        updateRole(
                          user.id,
                          user.role === "admin" ? "user" : "admin"
                        )
                      }
                      className="change-role"
                    >
                      {user.role === "admin"
                        ? "Змінити на user"
                        : "Змінити на admin"}
                    </button>
                  </td>
                  <td>
                    {user.id !== currentUserId && (
                      <button
                        className="icon-button"
                        onClick={() => deleteUser(user.id)}
                        title="Видалити"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
