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
import BackButton from "./BackButton";
import BackgroundWrapper from "./components/BackgroundWrapper";
import "./Weight.css"; // стилі

// Функція для конвертації дати у локальний формат без UTC-зсуву
function formatLocalDate(dateObj) {
  const offset = dateObj.getTimezoneOffset();
  const localDate = new Date(dateObj.getTime() - offset * 60 * 1000);
  return localDate.toISOString().slice(0, 10);
}

// Реєстрація компонентів Chart.js
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

  // Оновлення діапазону дати при зміні періоду
  useEffect(() => {
    if (period === "7") {
      setFrom(formatLocalDate(new Date(Date.now() - 6 * 24 * 60 * 60 * 1000)));
      setTo(formatLocalDate(new Date()));
    } else if (period === "30") {
      setFrom(formatLocalDate(new Date(Date.now() - 29 * 24 * 60 * 60 * 1000)));
      setTo(formatLocalDate(new Date()));
    }
  }, [period]);

  // Завантаження ваги за період
  useEffect(() => {
    async function fetchWeights() {
      try {
        const res = await axios.get(
          `http://localhost:5000/api/weight?from=${from}&to=${to}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setWeights(res.data);
      } catch (err) {
        console.error("Помилка при завантаженні ваги", err);
      }
    }
    fetchWeights();
  }, [token, from, to]);

  // Збереження або оновлення запису
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const cleanDate = formatLocalDate(new Date(date));
      await axios.post(
        "http://localhost:5000/api/weight",
        { date: cleanDate, weight: parseFloat(newWeight) },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessage("Вага успішно збережена");
      setNewWeight("");
      setTimeout(() => window.location.reload(), 500);
    } catch (err) {
      setMessage("Помилка при збереженні ваги");
    }
  };

  // Дані для графіка
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
        <h2 className="page-title">Контроль ваги</h2>

        {/* Фільтр періоду */}
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

        {/* Форма додавання/редагування */}
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

        {/* Вивід повідомлень */}
        {message && <p>{message}</p>}

        {/* Графік зміни ваги */}
        <div className="chart-section">
          <h3>
            Динаміка ваги
            <span className="info-tooltip">
              ⓘ
              <span className="tooltip-text">
                Графік відображає зміну ваги за вибраний період.
                <br />
                Ви можете змінити період зверху та редагувати записи нижче.
              </span>
            </span>
          </h3>
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
              animation: {
                duration: 1000,
                easing: "easeOutQuart",
              },
              plugins: {
                legend: { position: "top" },
                tooltip: { enabled: true },
              },
              scales: {
                y: {
                  beginAtZero: false,
                  ticks: { stepSize: 1 },
                },
              },
            }}
          />
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

        {/* Таблиця з усіма записами */}
        <div className="weight-table">
          <h3>
            Ваші записи
            <button
              style={{ marginLeft: "12px" }}
              onClick={() =>
                setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))
              }
              title={`Сортувати за датою (${
                sortOrder === "asc" ? "⬇️" : "⬆️"
              })`}
            >
              🔃
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
                    <td>{w.weight}</td>
                    <td>
                      <button
                        title="Редагувати запис"
                        onClick={() => {
                          setDate(displayDate);
                          setNewWeight(w.weight);
                          setMessage(`Редагування запису за ${displayDate}`);
                        }}
                      >
                        ✏️
                      </button>
                      <button
                        title="Видалити запис"
                        onClick={async () => {
                          try {
                            await axios.delete(
                              `http://localhost:5000/api/weight?date=${displayDate}`,
                              {
                                headers: { Authorization: `Bearer ${token}` },
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
                        🗑️
                      </button>
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
