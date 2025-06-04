import React, { useEffect, useState } from "react";
import axios from "axios";
import { Pencil, Trash2 } from "lucide-react";
import {
  categoryMap,
  productMap,
  mealTypeMap,
  mealTypeReverseMap,
  allergenMap,
} from "../../utils/localization";

import "./AdminFoods.css";

export default function AdminFoods() {
  const token = localStorage.getItem("token");

  // Стан: список продуктів
  const [foods, setFoods] = useState([]);

  // Стан: ID редагованого продукту
  const [editingId, setEditingId] = useState(null);

  // Стан: форма продукту
  const [form, setForm] = useState({
    name: "",
    category: "Vegetable",
    calories: "",
    protein: "",
    fats: "",
    carbs: "",
    allergens: [],
    imageFile: null,
  });

  // Список категорій (англійські значення)
  const categories = [
    "Vegetable",
    "Fruit",
    "Grain",
    "Meat",
    "Dairy",
    "Drink",
    "Soup",
    "Sweet",
  ];

  const allergenOptions = [
    "lactose", // лактоза
    "gluten", // глютен
    "nuts", // горіхи
    "eggs", // яйця
    "fish", // риба
    "soy", // соя
    "shellfish", // морепродукти
    "sesame", // кунжут
    "mustard", // гірчиця
    "celery", // селера
    "peanuts", // арахіс
  ];

  // Завантажити продукти (тільки публічні, тобто від адміна)
  const fetchFoods = async () => {
    const res = await axios.get("http://localhost:5000/api/foods", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const publicFoods = res.data.filter((f) => f.is_custom === 0);
    setFoods(publicFoods);
  };

  useEffect(() => {
    fetchFoods();
  }, []);

  // Натискання "Редагувати"
  const handleEdit = (food) => {
    setEditingId(food.id);
    setForm({
      name: food.name,
      category: food.category,
      calories: food.calories,
      protein: food.protein,
      fats: food.fats,
      carbs: food.carbs,
      allergens: food.allergens ? food.allergens.split(",") : [],
      imageFile: null,
    });
  };

  // Видалення продукту
  const handleDelete = async (id) => {
    if (!window.confirm("Видалити продукт?")) return;

    try {
      await axios.delete(`http://localhost:5000/api/admin/foods/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      await fetchFoods();
    } catch (err) {
      console.error("Помилка видалення:", err);
      alert("Неможливо видалити продукт (ймовірно, він вже використовується)");
    }
  };

  // Надсилання форми
  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = new FormData();
    Object.entries(form).forEach(([key, val]) => {
      if (key === "imageFile") {
        if (val) data.append("image", val);
      } else if (key === "allergens") {
        data.append("allergens", Array.isArray(val) ? val.join(",") : "");
      } else {
        data.append(key, val); // добавляет name, category, calories
      }
    });

    try {
      if (editingId) {
        await axios.put(
          `http://localhost:5000/api/admin/foods/${editingId}`,
          data,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "multipart/form-data",
            },
          }
        );
        alert("Оновлено!");
      } else {
        await axios.post("http://localhost:5000/api/admin/foods", data, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        });
        alert("Додано!");
      }

      // Скидаємо форму
      setEditingId(null);
      setForm({
        name: "",
        category: "Vegetable",
        calories: "",
        protein: "",
        fats: "",
        carbs: "",
        imageFile: null,
      });

      await fetchFoods();
    } catch (err) {
      console.error("Помилка:", err);
      alert("Помилка при збереженні");
    }
  };

  return (
    <div className="admin-foods">
      <h2>{editingId ? "Редагувати продукт" : "Додати продукт для всіх"}</h2>

      {/* Форма додавання/редагування */}
      <form onSubmit={handleSubmit} className="admin-form">
        <label>
          Назва продукту:
          <input
            type="text"
            placeholder="Наприклад: Помідор"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
        </label>

        <label>
          Категорія:
          <select
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {categoryMap[cat] || cat}
              </option>
            ))}
          </select>
        </label>

        <label>
          Калорії на 100 г:
          <input
            type="number"
            placeholder="Наприклад: 18"
            value={form.calories}
            onChange={(e) => setForm({ ...form, calories: e.target.value })}
            required
          />
        </label>

        <label>
          Білки (г):
          <input
            type="number"
            placeholder="Білки на 100 г"
            value={form.protein}
            onChange={(e) => setForm({ ...form, protein: e.target.value })}
          />
        </label>

        <label>
          Жири (г):
          <input
            type="number"
            placeholder="Жири на 100 г"
            value={form.fats}
            onChange={(e) => setForm({ ...form, fats: e.target.value })}
          />
        </label>

        <label>
          Вуглеводи (г):
          <input
            type="number"
            placeholder="Вуглеводи на 100 г"
            value={form.carbs}
            onChange={(e) => setForm({ ...form, carbs: e.target.value })}
          />
        </label>

        <label>
          Фото (необов’язково):
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setForm({ ...form, imageFile: e.target.files[0] })}
          />
        </label>

        <label>
          Алергени (можна вибрати кілька):
          <select
            multiple
            value={form.allergens}
            onChange={(e) => {
              const selected = Array.from(e.target.selectedOptions).map(
                (o) => o.value
              );
              setForm({ ...form, allergens: selected });
            }}
          >
            {allergenOptions.map((allergen) => (
              <option key={allergen} value={allergen}>
                {allergenMap[allergen] || allergen}
              </option>
            ))}
          </select>
        </label>

        <button type="submit">
          {editingId ? "Зберегти зміни" : "Додати продукт"}
        </button>
      </form>

      {/* Список усіх продуктів */}
      <h3>Усі продукти</h3>
      <ul className="admin-food-list">
        {foods.map((food) => (
          <li key={food.id} className="admin-food-item">
            <div>
              <strong>{productMap[food.name] || food.name}</strong> —{" "}
              {food.calories} ккал
              <div className="food-macros">
                {food.protein}г Б / {food.fats}г Ж / {food.carbs}г В
              </div>
              <div className="food-category">
                Категорія: {categoryMap[food.category] || food.category}
              </div>
              {food.allergens && (
                <div className="food-category">
                  Алергени:{" "}
                  {food.allergens
                    .split(",")
                    .map((a) => allergenMap[a] || a)
                    .join(", ")}
                </div>
              )}
            </div>

            <div className="admin-buttons">
              <button onClick={() => handleEdit(food)} title="Редагувати">
                <Pencil size={18} />
              </button>
              <button onClick={() => handleDelete(food.id)} title="Видалити">
                <Trash2 size={18} />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
