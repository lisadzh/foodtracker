import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
  Title,
} from "chart.js";
import { Chart } from "react-chartjs-2";
import {
  SlidersHorizontal,
  Lightbulb,
  Flame,
  Egg,
  Sandwich,
  Droplet,
} from "lucide-react"; // Іконка сортування
import BackButton from "./BackButton";
import BackgroundWrapper from "./components/BackgroundWrapper";
import "./Statistics.css";

// Підключення модулів для ChartJS
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
  Title
);

// Переведення дати у формат YYYY-MM-DD без зсуву UTC
function formatLocalDate(dateObj) {
  const offset = dateObj.getTimezoneOffset();
  const localDate = new Date(dateObj.getTime() - offset * 60 * 1000);
  return localDate.toISOString().slice(0, 10);
}

export default function Statistics() {
  const token = localStorage.getItem("token");
  const [data, setData] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [goals, setGoals] = useState(null);
  const [loading, setLoading] = useState(true);

  const [period, setPeriod] = useState("7");
  const [from, setFrom] = useState(() =>
    formatLocalDate(new Date(Date.now() - 6 * 86400000))
  );
  const [to, setTo] = useState(() => formatLocalDate(new Date()));
  const [sortBy, setSortBy] = useState("date");

  // Оновлення діапазону при виборі періоду
  useEffect(() => {
    if (period === "7") {
      setFrom(formatLocalDate(new Date(Date.now() - 6 * 86400000)));
      setTo(formatLocalDate(new Date()));
    } else if (period === "30") {
      setFrom(formatLocalDate(new Date(Date.now() - 29 * 86400000)));
      setTo(formatLocalDate(new Date()));
    }
  }, [period]);

  // Завантаження статистичних даних
  useEffect(() => {
    async function fetchStatistics() {
      setLoading(true);
      try {
        const res = await axios.get(
          `http://localhost:5000/api/statistics?from=${from}&to=${to}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setData(res.data.data);
        setGoals(res.data.goals);
        setRecommendations(res.data.recommendations || []);
      } catch (err) {
        console.error("Помилка завантаження статистики:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchStatistics();
  }, [from, to, token]);

  // Обчислення середнього значення
  const calculateAverage = (key) => {
    if (!data.length) return 0;
    const sum = data.reduce((acc, day) => acc + Number(day[key]), 0);
    return Math.round(sum / data.length);
  };

  const sortedData = [...data].sort((a, b) => {
    if (sortBy === "date") return new Date(a.date) - new Date(b.date);
    return b[sortBy] - a[sortBy];
  });

  const labels = sortedData.map((d) => d.date);
  const calories = sortedData.map((d) => d.calories);
  const protein = sortedData.map((d) => d.protein);
  const fats = sortedData.map((d) => d.fats);
  const carbs = sortedData.map((d) => d.carbs);

  // Повертає іконку Lucide в залежності від тексту рекомендації
  function getLucideIcon(text) {
    const lower = text.toLowerCase();
    if (lower.includes("білк"))
      return <Egg size={18} className="icon-bullet" />;
    if (lower.includes("жир"))
      return <Droplet size={18} className="icon-bullet" />;
    if (lower.includes("вуглевод"))
      return <Sandwich size={18} className="icon-bullet" />;
    if (lower.includes("калор"))
      return <Flame size={18} className="icon-bullet" />;
    return <Lightbulb size={18} className="icon-bullet" />;
  }

  if (!goals) return <p>Дані про цілі недоступні.</p>;

  return (
    <BackgroundWrapper>
      <div className="stats-container">
        <BackButton />
        <h2 className="page-title">Статистика харчування</h2>

        {/* Панель фільтрації */}
        <div className="date-range-controls">
          <label>Період:</label>
          <select value={period} onChange={(e) => setPeriod(e.target.value)}>
            <option value="7">Останні 7 днів</option>
            <option value="30">Останні 30 днів</option>
            <option value="custom">Інший період</option>
          </select>

          {period === "custom" && (
            <>
              <label>Від:</label>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
              <label>До:</label>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </>
          )}

          <label>
            <SlidersHorizontal size={16} style={{ marginRight: 6 }} /> Сортувати
            за:
          </label>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="date">Датою</option>
            <option value="calories">Калоріями</option>
            <option value="protein">Білками</option>
            <option value="fats">Жирами</option>
            <option value="carbs">Вуглеводами</option>
          </select>
        </div>

        {/* Завантаження або відображення */}
        {loading ? (
          <p className="loading-text">Завантаження даних...</p>
        ) : (
          <>
            {/* Калорії */}
            <div className="chart-section">
              <h3>
                Калорії за день
                <span className="info-tooltip">
                  ⓘ
                  <span className="tooltip-text">
                    Графік показує щоденне споживання калорій. <br />
                    Червона лінія — це Ваша добова ціль.
                  </span>
                </span>
              </h3>
              <Chart
                type="line"
                data={{
                  labels,
                  datasets: [
                    {
                      label: "Фактичні калорії",
                      data: calories,
                      borderColor: "#207c65",
                      backgroundColor: "rgba(144, 201, 178, 0.3)",
                      tension: 0.4,
                      fill: true,
                      pointRadius: 4,
                      pointHoverRadius: 6,
                    },
                    {
                      label: "Ціль калорій",
                      data: Array(labels.length).fill(goals.calories),
                      borderColor: "#e74c3c",
                      borderDash: [6, 4],
                      pointRadius: 0,
                      tension: 0,
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  animation: {
                    duration: 800,
                    easing: "easeOutQuart",
                  },
                  plugins: { legend: { position: "top" } },
                }}
              />
            </div>

            {/* Макроелементи */}
            <div className="chart-section">
              <h3>
                Білки, жири, вуглеводи
                <span className="info-tooltip">
                  ⓘ
                  <span className="tooltip-text">
                    Стовпчики показують фактичне споживання макронутрієнтів по
                    днях. <br />
                    Сірі — це Ваші цілі.
                  </span>
                </span>
              </h3>
              <Chart
                type="bar"
                data={{
                  labels,
                  datasets: [
                    {
                      label: "Білки (г)",
                      data: protein,
                      backgroundColor: "#76b39d",
                    },
                    {
                      label: "Ціль білків",
                      data: Array(labels.length).fill(goals.protein),
                      backgroundColor: "#ccc",
                    },
                    {
                      label: "Жири (г)",
                      data: fats,
                      backgroundColor: "#f4b942",
                    },
                    {
                      label: "Ціль жирів",
                      data: Array(labels.length).fill(goals.fats),
                      backgroundColor: "#ddd",
                    },
                    {
                      label: "Вуглеводи (г)",
                      data: carbs,
                      backgroundColor: "#f28e8e",
                    },
                    {
                      label: "Ціль вуглеводів",
                      data: Array(labels.length).fill(goals.carbs),
                      backgroundColor: "#eee",
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  plugins: { legend: { position: "top" } },
                  scales: { y: { beginAtZero: true } },
                }}
              />
            </div>

            {/* Підсумки */}
            <div className="summary-section">
              <div className="averages-block">
                <h3>Середні значення за період</h3>
                <div className="averages-grid">
                  <div>
                    <span>Калорії</span>
                    {calculateAverage("calories")} / {goals.calories}
                  </div>
                  <div>
                    <span>Білки</span>
                    {calculateAverage("protein")}г / {goals.protein}г
                  </div>
                  <div>
                    <span>Жири</span>
                    {calculateAverage("fats")}г / {goals.fats}г
                  </div>
                  <div>
                    <span>Вуглеводи</span>
                    {calculateAverage("carbs")}г / {goals.carbs}г
                  </div>
                </div>
              </div>

              {recommendations.length > 0 && (
                <div className="recommendations-block">
                  <h3>Рекомендації</h3>
                  <ul className="recommendations-list">
                    {recommendations.map((rec, idx) => (
                      <li key={idx}>
                        {getLucideIcon(rec)}
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </BackgroundWrapper>
  );
}
