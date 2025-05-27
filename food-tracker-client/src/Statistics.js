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
import BackButton from "./BackButton";
import BackgroundWrapper from "./components/BackgroundWrapper";
import "./Statistics.css";

// Підключення частин графіків
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

// Функція для конвертації дати в локальний формат
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

  // Оновлення діапазону дат при виборі періоду
  useEffect(() => {
    if (period === "7") {
      setFrom(formatLocalDate(new Date(Date.now() - 6 * 86400000)));
      setTo(formatLocalDate(new Date()));
    } else if (period === "30") {
      setFrom(formatLocalDate(new Date(Date.now() - 29 * 86400000)));
      setTo(formatLocalDate(new Date()));
    }
  }, [period]);

  // Завантаження статистики
  useEffect(() => {
    async function fetchStatistics() {
      setLoading(true);
      try {
        const res = await axios.get(
          `http://localhost:5000/api/statistics?from=${from}&to=${to}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
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

  return (
    <BackgroundWrapper>
      <div className="stats-container">
        <BackButton />
        <h2 className="page-title">Статистика харчування</h2>

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

          <label>Сортувати за:</label>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="date">Датою</option>
            <option value="calories">Калоріями</option>
            <option value="protein">Білками</option>
            <option value="fats">Жирами</option>
            <option value="carbs">Вуглеводами</option>
          </select>
        </div>

        {loading ? (
          <p className="loading-text">Завантаження даних...</p>
        ) : (
          <>
            <div className="chart-section">
              <h3>
                Калорії за день
                <span className="info-tooltip">
                  ⓘ
                  <span className="tooltip-text">
                    Цей графік показує, скільки калорій Ви спожили кожного дня у
                    вибраному періоді. <br />
                    Червона пунктирна лінія — Ваша рекомендована добова норма.
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
                  plugins: { legend: { position: "top" } },
                }}
              />
            </div>

            <div className="chart-section">
              <h3>
                Білки, жири, вуглеводи
                <span className="info-tooltip">
                  ⓘ
                  <span className="tooltip-text">
                    Графік допомагає порівняти Ваше фактичне споживання
                    макронутрієнтів з цілями. <br />
                    Кожен стовпчик — це окремий день у періоді.
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
                      data: Array(labels.length).fill(goals.fat),
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

            <div className="summary-section">
              <div className="averages-block">
                <h3>📊 Середні показники за період</h3>
                <div className="averages-grid">
                  <div>
                    <span>Калорії:</span> {calculateAverage("calories")} /{" "}
                    {goals.calories}
                  </div>
                  <div>
                    <span>Білки:</span> {calculateAverage("protein")}г /{" "}
                    {goals.protein}г
                  </div>
                  <div>
                    <span>Жири:</span> {calculateAverage("fats")}г / {goals.fat}
                    г
                  </div>
                  <div>
                    <span>Вуглеводи:</span> {calculateAverage("carbs")}г /{" "}
                    {goals.carbs}г
                  </div>
                </div>
              </div>

              {recommendations.length > 0 && (
                <div className="recommendations-block">
                  <h3>💡 Рекомендації</h3>
                  <ul className="recommendations-list">
                    {recommendations.map((rec, idx) => (
                      <li key={idx}>
                        <span className="bullet">💡</span>
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
