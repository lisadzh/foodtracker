import React, { useEffect, useState } from "react";
import axios from "axios";
import { Ruler, Weight, Cake, Venus, Dumbbell, Target } from "lucide-react"; // Іконки
import BackButton from "./BackButton";
import BackgroundWrapper from "./components/BackgroundWrapper";
import "./Profile.css";

export default function Profile() {
  const [form, setForm] = useState({
    height: "",
    weight: "",
    age: "",
    gender: "",
    activity: "",
    goal: "",
  });

  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState({});
  const [nutrition, setNutrition] = useState(null);

  const token = localStorage.getItem("token");

  // Завантажуємо профіль користувача при завантаженні сторінки
  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await axios.get("http://localhost:5000/api/profile", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.data) setForm(res.data);
      } catch (err) {
        console.error(err);
      }
    }
    fetchProfile();
  }, [token]);

  // Валідація введених даних
  const validate = () => {
    const newErrors = {};
    if (!form.height || form.height <= 0)
      newErrors.height = "Введіть коректний зріст";
    if (!form.weight || form.weight <= 0)
      newErrors.weight = "Введіть коректну вагу";
    if (!form.age || form.age <= 0) newErrors.age = "Введіть вік";
    if (!form.gender) newErrors.gender = "Оберіть стать";
    if (!form.activity) newErrors.activity = "Оберіть активність";
    if (!form.goal) newErrors.goal = "Оберіть ціль";
    return newErrors;
  };

  // Обробник змін у полях
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // Надсилання форми
  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setMessage("");
      return;
    }

    try {
      const res = await axios.post("http://localhost:5000/api/profile", form, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMessage(res.data.message);
      setErrors({});

      const nutritionRes = await axios.get(
        "http://localhost:5000/api/calories",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setNutrition(nutritionRes.data);
    } catch (err) {
      setMessage("Сталася помилка при збереженні");
    }
  };

  return (
    <BackgroundWrapper>
      <div className="profile-outer">
        <div className="profile-container">
          <div className="profile-content">
            <BackButton />
            <h2 className="page-title">Профіль користувача</h2>

            <form className="profile-form" onSubmit={handleSubmit}>
              <ProfileField
                name="height"
                label="Зріст (см)"
                value={form.height}
                onChange={handleChange}
                error={errors.height}
                Icon={Ruler}
                helper="Ваш ріст у сантиметрах. Наприклад: 170"
              />
              <ProfileField
                name="weight"
                label="Вага (кг)"
                value={form.weight}
                onChange={handleChange}
                error={errors.weight}
                Icon={Weight}
                helper="Ваша фактична вага. Наприклад: 65"
              />
              <ProfileField
                name="age"
                label="Вік"
                value={form.age}
                onChange={handleChange}
                error={errors.age}
                Icon={Cake}
                helper="Ваш повний вік у роках"
              />
              <ProfileSelect
                name="gender"
                label="Стать"
                value={form.gender}
                onChange={handleChange}
                options={["Чоловік", "Жінка"]}
                error={errors.gender}
                Icon={Venus}
                helper="Стать впливає на розрахунок калорійності"
              />
              <ProfileSelect
                name="activity"
                label="Рівень активності"
                value={form.activity}
                onChange={handleChange}
                options={["Низький", "Середній", "Високий"]}
                error={errors.activity}
                Icon={Dumbbell}
                helper="Оберіть, наскільки Ви активні протягом дня"
              />
              <ProfileSelect
                name="goal"
                label="Ціль"
                value={form.goal}
                onChange={handleChange}
                options={["Схуднути", "Підтримувати", "Набрати вагу"]}
                error={errors.goal}
                Icon={Target}
                helper="Оберіть Вашу мету щодо ваги"
              />

              <button type="submit">Зберегти профіль</button>
              {message && <p className="profile-message">{message}</p>}
            </form>

            {nutrition && (
              <div className="nutrition-box">
                <h3>Рекомендовані показники на день:</h3>
                <p>
                  <strong>Калорії:</strong> {nutrition.calories} ккал
                </p>
                <p>
                  <strong>Білки:</strong> {nutrition.protein} г
                </p>
                <p>
                  <strong>Жири:</strong> {nutrition.fat} г
                </p>
                <p>
                  <strong>Вуглеводи:</strong> {nutrition.carbs} г
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </BackgroundWrapper>
  );
}

// Компонент для числових полів
function ProfileField({ name, label, value, onChange, error, Icon, helper }) {
  return (
    <div className="input-group">
      <label className="input-label">
        {Icon && <Icon className="inline-icon" />}
        {label}
        {helper && <span className="tooltip">{helper}</span>}
      </label>
      <div className="input-wrapper">
        <input
          type="number"
          name={name}
          value={value}
          onChange={onChange}
          required
        />
        {error && <div className="profile-error">{error}</div>}
      </div>
    </div>
  );
}

// Компонент для селектів
function ProfileSelect({
  name,
  label,
  value,
  onChange,
  options,
  error,
  Icon,
  helper,
}) {
  return (
    <div className="input-group">
      <label className="input-label">
        {Icon && <Icon className="inline-icon" />}
        {label}
        {helper && <span className="tooltip">{helper}</span>}
      </label>
      <div className="input-wrapper">
        <select name={name} value={value} onChange={onChange} required>
          <option value="">Оберіть...</option>
          {options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
        {error && <div className="profile-error">{error}</div>}
      </div>
    </div>
  );
}
