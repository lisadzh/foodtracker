import React, { useEffect, useState } from "react";
import axios from "axios";
import { Ruler, Weight, Cake, Venus, Dumbbell, Target } from "lucide-react";
import BackButton from "./BackButton";
import BackgroundWrapper from "../../components/BackgroundWrapper";
import { allergenMap } from "../../utils/localization";

import "./Profile.css";

export default function Profile() {
  const [form, setForm] = useState({
    height: "",
    weight: "",
    age: "",
    gender: "",
    activity: "",
    goal: "",
    allergies: "",
  });

  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState({});
  const [nutrition, setNutrition] = useState(null);
  const [allergies, setAllergies] = useState([]);

  const token = localStorage.getItem("token");

  // Отримуємо профіль користувача при завантаженні сторінки
  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await axios.get("http://localhost:5000/api/profile", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.data) {
          console.log("Отримано профіль з бекенду:", res.data);
          console.log("Allergies з сервера:", res.data.allergies);

          const { height, weight, age, gender, activity, goal, allergies } =
            res.data;

          setForm({
            height,
            weight,
            age,
            gender,
            activity,
            goal,
            allergies,
          });

          if (typeof allergies === "string") {
            setAllergies(allergies.split(",").map((a) => a.trim()));
          } else {
            setAllergies([]);
          }
        }
      } catch (err) {
        console.error(err);
      }
    }
    fetchProfile();
  }, [token]);

  // Перевірка введених даних
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

  // Обробка зміни поля
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

    const cleanedAllergies = allergies.filter(Boolean).join(",");
    const updatedForm = {
      ...form,
      allergies: cleanedAllergies,
    };

    console.log("Збереження алергій:", allergies, "=>", cleanedAllergies);

    console.log("Updated form для збереження:", updatedForm);

    try {
      const res = await axios.post(
        "http://localhost:5000/api/profile",
        updatedForm,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

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

              {/* Селект зі значенням з бази + відображення перекладу */}
              <ProfileSelect
                name="gender"
                label="Стать"
                value={form.gender}
                onChange={handleChange}
                options={[
                  { value: "Male", label: "Чоловік" },
                  { value: "Female", label: "Жінка" },
                ]}
                error={errors.gender}
                Icon={Venus}
                helper="Стать впливає на розрахунок калорійності"
              />

              <ProfileSelect
                name="activity"
                label="Рівень активності"
                value={form.activity}
                onChange={handleChange}
                options={[
                  { value: "Low", label: "Низький" },
                  { value: "Medium", label: "Середній" },
                  { value: "High", label: "Високий" },
                ]}
                error={errors.activity}
                Icon={Dumbbell}
                helper="Оберіть, наскільки Ви активні протягом дня"
              />

              <ProfileSelect
                name="goal"
                label="Ціль"
                value={form.goal}
                onChange={handleChange}
                options={[
                  { value: "Lose", label: "Схуднути" },
                  { value: "Maintain", label: "Підтримувати" },
                  { value: "Gain", label: "Набрати вагу" },
                ]}
                error={errors.goal}
                Icon={Target}
                helper="Оберіть Вашу мету щодо ваги"
              />

              <div className="input-group">
                <label className="input-label">Алергії (опціонально):</label>
                <div className="checkbox-group">
                  {Object.entries(allergenMap).map(([key, label]) => (
                    <label key={key}>
                      <input
                        type="checkbox"
                        checked={allergies.includes(key)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setAllergies([...allergies, key]);
                          } else {
                            setAllergies(allergies.filter((a) => a !== key));
                          }
                        }}
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>

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
                  <strong>Жири:</strong> {nutrition.fats} г
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

function ProfileField({ name, label, value, onChange, error, Icon, helper }) {
  return (
    <div className="input-group">
      <label className="input-label">
        {Icon && <Icon className="inline-icon" />} {label}
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
        {Icon && <Icon className="inline-icon" />} {label}
        {helper && <span className="tooltip">{helper}</span>}
      </label>
      <div className="input-wrapper">
        <select name={name} value={value} onChange={onChange} required>
          <option value="">Оберіть...</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        {error && <div className="profile-error">{error}</div>}
      </div>
    </div>
  );
}
