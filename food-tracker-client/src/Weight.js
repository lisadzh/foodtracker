import React, { useEffect, useState } from "react";
import axios from "axios";
import { Chart } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
  Title,
  Filler,
} from "chart.js";
import {
  BarChart3,
  Trash2,
  Pencil,
  SortAsc,
  SortDesc,
  Save,
  X,
} from "lucide-react";
import BackButton from "./BackButton";
import BackgroundWrapper from "./components/BackgroundWrapper";
import "./Weight.css";

// Функція переведення UTC дати у локальний формат YYYY-MM-DD
function formatLocalDate(dateObj) {
  const offset = dateObj.getTimezoneOffset();
  const localDate = new Date(dateObj.getTime() - offset * 60 * 1000);
  return localDate.toISOString().slice(0, 10);
}

// Реєстрація необхідних модулів ChartJS
ChartJS.register(
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
  Title,
  Filler
);

export default function Weight() {
  const token = localStorage.getItem("token");
  const [weights, setWeights] = useState([]);
  const [newWeight, setNewWeight] = useState("");
  const [date, setDate] = useState(() => formatLocalDate(new Date()));
  const [message, setMessage] = useState("");
  const [sortOrder, setSortOrder] = useState("desc");
  const [period, setPeriod] = useState("30");
  const [from, setFrom] = useState(() =>
    formatLocalDate(new Date(Date.now() - 29 * 24 * 60 * 60 * 1000))
  );
  const [to, setTo] = useState(() => formatLocalDate(new Date()));
  const [editingDate, setEditingDate] = useState(null);
  const [editedWeight, setEditedWeight] = useState("");

  // Оновлення діапазону дат при зміні періоду
  useEffect(() => {
    if (period === "7") {
      setFrom(formatLocalDate(new Date(Date.now() - 6 * 24 * 60 * 60 * 1000)));
      setTo(formatLocalDate(new Date()));
    } else if (period === "30") {
      setFrom(formatLocalDate(new Date(Date.now() - 29 * 24 * 60 * 60 * 1000)));
      setTo(formatLocalDate(new Date()));
    }
  }, [period]);

  // Завантаження даних ваги з сервера
  const fetchWeights = async () => {
    try {
      const res = await axios.get(
        `http://localhost:5000/api/weight?from=${from}&to=${to}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setWeights(res.data);
    } catch (err) {
      console.error("Помилка при завантаженні ваги", err);
    }
  };

  // Завантажити дані при зміні діапазону або токену
  useEffect(() => {
    fetchWeights();
  }, [token, from, to]);

  // Збереження нової ваги
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const cleanDate = formatLocalDate(new Date(date));
      await axios.post(
        "http://localhost:5000/api/weight",
        { date: cleanDate, weight: parseFloat(newWeight) },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessage("Вага збережена!");
      setNewWeight("");
      await fetchWeights();
    } catch (err) {
      setMessage("Помилка при збереженні!");
    }
  };

  // Дані для графіку
  const weightValues = weights
    .map((w) => parseFloat(w.weight))
    .filter((w) => !isNaN(w));
  const labels = weights.map((w) => formatLocalDate(new Date(w.date)));
  const min = Math.min(...weightValues);
  const max = Math.max(...weightValues);
  const avg =
    weightValues.length > 0
      ? (
          weightValues.reduce((acc, w) => acc + w, 0) / weightValues.length
        ).toFixed(1)
      : "–";

  const sortedWeights = [...weights].sort((a, b) => {
    const dateA = new Date(a.date);
    const dateB = new Date(b.date);
    return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
  });

  return (
    <BackgroundWrapper>
      <div className="stats-container">
        <BackButton />
        <h2 className="page-title">
          <BarChart3 size={22} style={{ marginRight: 8 }} /> Контроль ваги
        </h2>

        {/* Вибір періоду */}
        <div className="date-range-controls">
          <label>Період:</label>
          <select value={period} onChange={(e) => setPeriod(e.target.value)}>
            <option value="7">7 днів</option>
            <option value="30">30 днів</option>
            <option value="custom">Власний</option>
          </select>
          {period === "custom" && (
            <>
              <label>з:</label>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
              <label>по:</label>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </>
          )}
        </div>

        {/* Форма для додавання ваги */}
        <form className="weight-form" onSubmit={handleSubmit}>
          <label>Вага (кг):</label>
          <input
            type="number"
            step="0.1"
            min="30"
            max="300"
            value={newWeight}
            onChange={(e) => setNewWeight(e.target.value)}
            required
          />
          <label>Дата:</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
          <button type="submit">Зберегти</button>
        </form>

        {/* Повідомлення */}
        {message && <p className="weight-message">{message}</p>}

        {/* Графік зміни ваги */}
        <div className="chart-section">
          <h3>Динаміка ваги</h3>
          <Chart
            type="line"
            data={{
              labels,
              datasets: [
                {
                  label: "Вага (кг)",
                  data: weightValues,
                  borderColor: "#207c65",
                  backgroundColor: "rgba(144, 201, 178, 0.3)",
                  tension: 0.4,
                  fill: true,
                  pointRadius: 4,
                  pointHoverRadius: 6,
                },
              ],
            }}
            options={{
              responsive: true,
              plugins: {
                legend: { position: "top" },
              },
              scales: {
                y: {
                  beginAtZero: false,
                  ticks: { stepSize: 1 },
                },
              },
            }}
          />

          {/* Статистика */}
          <div className="weight-stats">
            <p>
              Мінімум: <strong>{min} кг</strong>
            </p>
            <p>
              Максимум: <strong>{max} кг</strong>
            </p>
            <p>
              Середнє: <strong>{avg} кг</strong>
            </p>
          </div>
        </div>

        {/* Таблиця ваги */}
        <div className="weight-table">
          <h3>
            Ваші записи
            <button
              className="sort-toggle-btn"
              onClick={() =>
                setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))
              }
            >
              {sortOrder === "asc" ? (
                <SortAsc size={16} />
              ) : (
                <SortDesc size={16} />
              )}
            </button>
          </h3>
          <table>
            <thead>
              <tr>
                <th>Дата</th>
                <th>Вага (кг)</th>
                <th>Дії</th>
              </tr>
            </thead>
            <tbody>
              {sortedWeights.map((w) => {
                const displayDate = formatLocalDate(new Date(w.date));
                return (
                  <tr key={w.date} className="fade-in">
                    <td>{displayDate}</td>
                    <td>
                      {editingDate === displayDate ? (
                        <input
                          type="number"
                          min="30"
                          max="300"
                          step="0.1"
                          value={editedWeight}
                          onChange={(e) => setEditedWeight(e.target.value)}
                          style={{
                            width: "80px",
                            padding: "4px",
                            fontSize: "15px",
                          }}
                        />
                      ) : (
                        w.weight
                      )}
                    </td>
                    <td>
                      {editingDate === displayDate ? (
                        <>
                          <button
                            className="icon-btn save"
                            title="Зберегти"
                            onClick={async () => {
                              try {
                                await axios.post(
                                  "http://localhost:5000/api/weight",
                                  {
                                    date: displayDate,
                                    weight: parseFloat(editedWeight),
                                  },
                                  {
                                    headers: {
                                      Authorization: `Bearer ${token}`,
                                    },
                                  }
                                );
                                setEditingDate(null);
                                setEditedWeight("");
                                fetchWeights();
                                setMessage("Запис оновлено");
                              } catch {
                                setMessage("Помилка оновлення");
                              }
                            }}
                          >
                            <Save size={16} />
                          </button>
                          <button
                            className="icon-btn cancel"
                            title="Скасувати"
                            onClick={() => {
                              setEditingDate(null);
                              setEditedWeight("");
                            }}
                          >
                            <X size={16} />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            className="icon-btn edit"
                            title="Редагувати"
                            onClick={() => {
                              setEditingDate(displayDate);
                              setEditedWeight(w.weight);
                            }}
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            className="icon-btn delete"
                            title="Видалити"
                            onClick={async () => {
                              try {
                                await axios.delete(
                                  `http://localhost:5000/api/weight?date=${displayDate}`,
                                  {
                                    headers: {
                                      Authorization: `Bearer ${token}`,
                                    },
                                  }
                                );
                                setWeights((prev) =>
                                  prev.filter(
                                    (entry) =>
                                      formatLocalDate(new Date(entry.date)) !==
                                      displayDate
                                  )
                                );
                                setMessage("Запис видалено");
                              } catch {
                                setMessage("Помилка видалення");
                              }
                            }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </BackgroundWrapper>
  );
}
