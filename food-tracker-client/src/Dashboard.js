import React, { useEffect, useState, useCallback, useMemo } from "react";
import axios from "axios";
import "./Dashboard.css";
import BackButton from "./BackButton";
import BackgroundWrapper from "./components/BackgroundWrapper";
import {
  Pencil,
  Trash2,
  AlertCircle,
  CheckCircle,
  Repeat,
  Search,
  Plus,
  Save,
  X,
} from "lucide-react";
import {
  categoryMap,
  productMap,
  mealTypeMap,
  mealTypeReverseMap,
  allergenMap,
} from "./localization";

import { useRef } from "react";

export default function Dashboard() {
  const token = localStorage.getItem("token");
  const [foods, setFoods] = useState([]); // Список всіх продуктів
  const [type, setType] = useState("Сніданок"); // Тип обраного прийому їжі
  const [selected, setSelected] = useState([]); // Список обраних продуктів
  const [categoryFilter, setCategoryFilter] = useState("All"); // Категорія фільтрації
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10)); // Сьогоднішня дата
  const [mealsByDate, setMealsByDate] = useState([]); // Прийоми їжі за обрану дату
  const [editingItemId, setEditingItemId] = useState(null); // id продукту, який редагується
  const [editedQty, setEditedQty] = useState({}); // нова кількість
  const [goals, setGoals] = useState(null); // норма
  const [todayStats, setTodayStats] = useState(null); // фактичне споживання
  const [searchQuery, setSearchQuery] = useState(""); // Пошук по назві
  const [editFoodId, setEditFoodId] = useState(null); // ID редактируемого продукта
  const [showAllergenicFoods, setShowAllergenicFoods] = useState(false);
  const [userAllergies, setUserAllergies] = useState([]);

  // Завантаження прийомів їжі з бекенду та переклад типів
  const loadMealsForDate = useCallback(async () => {
    try {
      const res = await axios.get(
        `http://localhost:5000/api/meals?date=${date}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // Переклад типу прийому їжі з англійської на українську
      const transformed = res.data.map((meal) => ({
        id: meal.id,
        type: mealTypeReverseMap[meal.type] || meal.type,
        foods: meal.foods,
      }));

      setMealsByDate(transformed);
    } catch (err) {
      console.error("Помилка завантаження прийомів їжі:", err);
    }
  }, [date, token, mealTypeReverseMap]);

  const copyYesterdayMeal = async () => {
    const yesterday = new Date(new Date(date).getTime() - 86400000)
      .toISOString()
      .slice(0, 10);

    try {
      const res = await axios.get(
        `http://localhost:5000/api/meals?date=${yesterday}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const yesterdayMeals = res.data;

      for (const meal of yesterdayMeals) {
        await axios.post(
          "http://localhost:5000/api/meals",
          {
            type: meal.type,
            date, // сьогоднішня дата
            foods: meal.foods.map((f) => ({
              foodId: foods.find((x) => x.name === f.name)?.id,
              quantity: f.quantity,
              calories: f.calories,
              protein: f.protein,
              fats: f.fats,
              carbs: f.carbs,
            })),
          },
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
      }

      alert("Прийоми з вчора скопійовані!");
      await loadMealsForDate();
      await refreshTodayStats();
    } catch (err) {
      console.error("Не вдалося скопіювати вчорашні прийоми", err);
      alert("Помилка при копіюванні вчорашнього дня");
    }
  };

  // обновления todayStats
  const refreshTodayStats = async () => {
    try {
      const res = await axios.get(
        `http://localhost:5000/api/meals/summary?date=${date}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setTodayStats(res.data);
      console.log("Обновлена статистика за дату:", date, res.data);
    } catch (err) {
      console.error("Помилка оновлення todayStats:", err);
    }
  };

  // Завантаження списку всіх продуктів
  useEffect(() => {
    if (!token) return;
    axios
      .get("http://localhost:5000/api/foods", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setFoods(res.data))
      .catch((err) => console.error("Помилка завантаження продуктів:", err));
  }, [token]);

  // Оновлення прийомів при зміні дати
  useEffect(() => {
    if (token && date) {
      loadMealsForDate();
      refreshTodayStats(); //  обновления статистики
    }
  }, [date, token, loadMealsForDate]);

  // для завантаження
  useEffect(() => {
    if (!token) return;

    // Отримуємо норму
    axios
      .get("http://localhost:5000/api/calories", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setGoals(res.data))
      .catch((err) => console.error("Помилка цілей:", err));

    axios
      .get("http://localhost:5000/api/profile", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        const allergyRaw = res.data?.allergies;
        if (typeof allergyRaw === "string" && allergyRaw.trim()) {
          setUserAllergies(
            allergyRaw.split(",").map((a) => a.trim().toLowerCase())
          );
        } else {
          setUserAllergies([]); // явно очищаем
        }
      })

      .catch((err) => console.error("Помилка алергій:", err));

    // Отримуємо фактичні значення
    axios
      .get(`http://localhost:5000/api/meals/summary?date=${date}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setTodayStats(res.data))
      .catch((err) => console.error("Помилка статистики:", err));
  }, [token, date]);

  // Вибір або зняття вибору продукту
  const toggleFood = (id) => {
    const exists = selected.find((item) => item.id === id);
    if (exists) {
      setSelected((prev) => prev.filter((item) => item.id !== id));
    } else {
      setSelected((prev) => [...prev, { id, quantity: 100 }]);
    }
  };

  // Зміна кількості грамів продукту
  const handleQuantityChange = (id, qty) => {
    setSelected((prev) =>
      prev.map((item) => (item.id === id ? { ...item, quantity: qty } : item))
    );
  };

  // Збереження прийому їжі
  const handleSave = async () => {
    if (selected.length === 0) {
      alert("Ви не обрали жодного продукту!");
      return;
    }
    try {
      await axios.post(
        "http://localhost:5000/api/meals",
        {
          type: mealTypeMap[type],
          date,
          foods: selected.map((item) => {
            const food = foods.find((f) => f.id === item.id);
            const grams = item.quantity;
            return {
              foodId: item.id,
              quantity: grams,
              calories: Math.round((food.calories / 100) * grams),
              protein: Math.round((food.protein / 100) * grams),
              fats: Math.round((food.fats / 100) * grams),
              carbs: Math.round((food.carbs / 100) * grams),
            };
          }),
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      alert("Прийом їжі збережено!");
      setSelected([]);
      await loadMealsForDate();
      await refreshTodayStats();
    } catch (error) {
      console.error("Помилка при збереженні прийому їжі:", error);
      alert("Не вдалося зберегти прийом їжі");
    }
  };

  // Видалення прийому їжі
  const handleDeleteMeal = async (mealId) => {
    if (!window.confirm("Ви впевнені, що хочете видалити цей прийом їжі?"))
      return;

    try {
      await axios.delete(`http://localhost:5000/api/meals/${mealId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      await loadMealsForDate(); // оновлюємо список після видалення
      await refreshTodayStats();
    } catch (err) {
      console.error("Помилка при видаленні прийому їжі:", err);
      alert("Не вдалося видалити прийом їжі");
    }
  };

  // Видалення одного продукту з прийому їжі
  const handleDeleteMealItem = async (itemId) => {
    if (!window.confirm("Ви впевнені, що хочете видалити цей продукт?")) return;

    try {
      await axios.delete(`http://localhost:5000/api/meal-items/${itemId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      await loadMealsForDate();
      await refreshTodayStats();
    } catch (err) {
      console.error("Помилка при видаленні продукту:", err);
      alert("Не вдалося видалити продукт");
    }
  };

  // Функція оновлення
  const handleUpdateMealItem = async (item) => {
    try {
      const grams = editedQty[item.mealItemId];
      console.log("Зміна продукту:", item.mealItemId, grams);

      await axios.put(
        `http://localhost:5000/api/meal-items/${item.mealItemId}`,
        { quantity: grams },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setTimeout(async () => {
        await loadMealsForDate();
        await refreshTodayStats();
      }, 300); // Пауза 300 мс

      setEditingItemId(null);
      await loadMealsForDate();
      await refreshTodayStats(); // обн таблицу
    } catch (err) {
      console.error("Помилка при оновленні продукту:", err);
      alert("Не вдалося оновити продукт");
    }
  };

  // Фільтрація продуктів за категорією
  const filteredFoods =
    categoryFilter === "All"
      ? foods
      : foods.filter(
          (food) => food.category.toLowerCase() === categoryFilter.toLowerCase()
        );

  const searchedFoods = filteredFoods.filter((food) =>
    (productMap[food.name] || food.name)
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
  );

  const allergenFilteredFoods = showAllergenicFoods
    ? searchedFoods
    : searchedFoods.filter((food) => {
        if (!food.allergens) return true;
        const foodAllergens = food.allergens
          .split(",")
          .map((a) => a.trim().toLowerCase());

        return !foodAllergens.some((a) => userAllergies.includes(a));
      });

  const categories = [
    "All",
    "Vegetable",
    "Fruit",
    "Grain",
    "Meat",
    "Dairy",
    "Drink",
    "Soup",
    "Sweet",
  ];

  // додати продукт
  const [showAddModal, setShowAddModal] = useState(false);
  const [newFood, setNewFood] = useState({
    name: "",
    category: "Vegetable",
    calories: "",
    protein: "",
    fats: "",
    carbs: "",
  });

  const formData = new FormData();
  formData.append("name", newFood.name);
  formData.append("category", newFood.category);
  formData.append("calories", newFood.calories);
  formData.append("protein", newFood.protein);
  formData.append("fats", newFood.fats);
  formData.append("carbs", newFood.carbs);
  if (newFood.imageFile) {
    formData.append("image", newFood.imageFile);
  }

  const handleAddFood = async () => {
    const formData = new FormData();
    Object.entries(newFood).forEach(([key, value]) => {
      if (key === "imageFile" && value) {
        formData.append("image", value);
      } else if (key !== "imageFile") {
        formData.append(key, value);
      }
    });

    try {
      const url = editFoodId
        ? `http://localhost:5000/api/foods/${editFoodId}`
        : "http://localhost:5000/api/foods";
      const method = editFoodId ? "put" : "post";

      await axios[method](url, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      alert(editFoodId ? "Продукт оновлено!" : "Продукт додано!");
      setShowAddModal(false);
      setEditFoodId(null);
      setNewFood({
        name: "",
        category: "Vegetable",
        calories: "",
        protein: "",
        fats: "",
        carbs: "",
        imageFile: null,
      });

      const res = await axios.get("http://localhost:5000/api/foods", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setFoods(res.data);
    } catch (err) {
      alert("Помилка під час збереження продукту");
      console.error(err);
    }
  };

  const handleDeleteFood = async (id) => {
    if (!window.confirm("Ви впевнені, що хочете видалити цей продукт?")) return;
    try {
      await axios.delete(`http://localhost:5000/api/foods/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setFoods((prev) => prev.filter((f) => f.id !== id));
    } catch (err) {
      alert("Не вдалося видалити продукт");
      console.error(err);
    }
  };

  const openEditModal = (food) => {
    setNewFood({
      name: food.name,
      category: food.category,
      calories: food.calories,
      protein: food.protein,
      fats: food.fats,
      carbs: food.carbs,
      imageFile: null, // если нужно заменить картинку
    });
    setEditFoodId(food.id);
    setShowAddModal(true);
  };

  // Інтерфейс
  return (
    <BackgroundWrapper>
      <div className="dashboard-container">
        <BackButton />
        <h2 className="page-title">Щоденник харчування</h2>

        {goals && todayStats && (
          <div className="daily-stats">
            <h3>Ваш день — {date}</h3>
            <table className="stats-table">
              <thead>
                <tr>
                  <th>Показник</th>
                  <th>Норма</th>
                  <th>Спожито</th>
                  <th>Залишилось</th>
                </tr>
              </thead>
              <tbody>
                {["calories", "protein", "fats", "carbs"].map((key) => {
                  const consumed = todayStats[key] || 0;
                  const target = goals[key];
                  const remaining = target - consumed;
                  const percent = (consumed / target) * 100;

                  let status = "normal";
                  if (percent < 95) status = "low"; // менше 95% — недобір
                  else if (percent > 105) status = "over"; // більше 105% — перебір

                  return (
                    <tr key={key} className={`row-${status}`}>
                      <td>
                        {
                          {
                            calories: "Калорії",
                            protein: "Білки",
                            fats: "Жири",
                            carbs: "Вуглеводи",
                          }[key]
                        }
                      </td>
                      <td>{target}</td>
                      <td>{consumed}</td>
                      <td>
                        <strong className="stat-with-icon">
                          {remaining > 0 ? (
                            <>
                              -{remaining}
                              {percent < 95 && (
                                <span
                                  className="custom-tooltip"
                                  data-tooltip="Недобір — спробуйте додати більше"
                                >
                                  <AlertCircle
                                    className="stat-icon warning"
                                    size={18}
                                  />
                                </span>
                              )}
                            </>
                          ) : remaining < 0 ? (
                            <>
                              +{Math.abs(remaining)}
                              {percent > 105 && (
                                <span
                                  className="custom-tooltip"
                                  data-tooltip="Перебір — спробуйте зменшити"
                                >
                                  <AlertCircle
                                    className="stat-icon warning"
                                    size={18}
                                  />
                                </span>
                              )}
                            </>
                          ) : (
                            <>
                              0
                              <span
                                className="custom-tooltip"
                                data-tooltip="Все в межах норми"
                              >
                                <CheckCircle
                                  className="stat-icon normal"
                                  size={18}
                                />
                              </span>
                            </>
                          )}
                        </strong>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Форма вибору дати та типу прийому їжі */}
        <div className="dashboard-controls">
          <label>Оберіть дату:</label>
          <input
            type="date"
            value={date}
            onChange={(e) => {
              const newDate = e.target.value;
              setDate(newDate);
              refreshTodayStats(newDate);
              loadMealsForDate(newDate);
            }}
          />
        </div>

        <div className="dashboard-controls">
          <label>Тип прийому їжі:</label>
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option>Сніданок</option>
            <option>Обід</option>
            <option>Вечеря</option>
            <option>Перекус</option>
          </select>
        </div>

        <div className="dashboard-controls">
          <button className="copy-btn" onClick={copyYesterdayMeal}>
            <Repeat size={18} style={{ marginRight: "8px" }} />
            Копіювати з вчора
          </button>
        </div>

        {/* Фільтр категорій */}
        <div className="category-filter">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={categoryFilter === cat ? "active" : ""}
            >
              {categoryMap[cat] || cat}
            </button>
          ))}
          <button
            type="button"
            className={`add-own-button ${
              categoryFilter === "custom" ? "active" : ""
            }`}
            onClick={() => setShowAddModal(true)}
          >
            <Plus size={18} style={{ marginRight: "6px" }} />
            Додати продукт
          </button>
        </div>

        <div className="dashboard-controls search-bar">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Пошук продукту..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="dashboard-controls">
          <label className="allergen-toggle">
            <input
              type="checkbox"
              checked={showAllergenicFoods}
              onChange={(e) => setShowAllergenicFoods(e.target.checked)}
            />
            Показувати продукти з алергенами
          </label>

          {!showAllergenicFoods && userAllergies.length > 0 && (
            <div className="allergen-warning">
              Сховано продукти з алергенами:{" "}
              {userAllergies.map((a) => allergenMap[a] || a).join(", ")}
            </div>
          )}
        </div>

        {/* Сітка продуктів */}
        <div className="food-grid">
          {allergenFilteredFoods.map((food) => (
            <div
              key={food.id}
              className={`food-card ${
                selected.find((item) => item.id === food.id) ? "selected" : ""
              }`}
              onClick={() => toggleFood(food.id)}
            >
              {food.user_id && (
                <div
                  className="food-actions"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => openEditModal(food)}
                    title="Редагувати"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => handleDeleteFood(food.id)}
                    title="Видалити"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
              <img
                src={
                  food.image
                    ? `http://localhost:5000/images/foods/${food.image}`
                    : `/images/foods/${food.name
                        .toLowerCase()
                        .replace(/ /g, "_")
                        .replace(/%/g, "percent")}.jpg`
                }
                alt={food.name}
                className="food-image"
                onError={(e) => (e.target.style.display = "none")}
              />

              <strong>{productMap[food.name] || food.name}</strong>
              <p>{food.calories} ккал</p>
              <p>
                {food.protein}г Б / {food.fats}г Ж / {food.carbs}г В
              </p>
              {selected.find((item) => item.id === food.id) && (
                <div
                  className="gram-input"
                  onClick={(e) => e.stopPropagation()}
                >
                  <label>
                    {food.category?.toLowerCase() === "drink" ? "мл:" : "г:"}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    value={
                      selected.find((item) => item.id === food.id)?.quantity ||
                      100
                    }
                    onChange={(e) =>
                      handleQuantityChange(
                        food.id,
                        parseInt(e.target.value) || 1
                      )
                    }
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Кнопка збереження */}
        <button
          className="save-btn"
          onClick={handleSave}
          disabled={selected.length === 0}
        >
          Зберегти прийом їжі
        </button>

        {/* Модальне вікно */}
        {showAddModal && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h3>
                {editFoodId ? "Редагувати продукт" : "Додати новий продукт"}
              </h3>

              <label>
                Назва продукту:
                <input
                  type="text"
                  placeholder="Наприклад: Морква"
                  value={newFood.name}
                  onChange={(e) =>
                    setNewFood({ ...newFood, name: e.target.value })
                  }
                />
              </label>

              <label>
                Категорія:
                <select
                  value={newFood.category}
                  onChange={(e) =>
                    setNewFood({ ...newFood, category: e.target.value })
                  }
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {categoryMap[cat]}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Калорії на 100г:
                <input
                  type="number"
                  placeholder="ккал"
                  value={newFood.calories}
                  onChange={(e) =>
                    setNewFood({ ...newFood, calories: e.target.value })
                  }
                />
              </label>

              <label>
                Білки (г):
                <input
                  type="number"
                  placeholder="г"
                  value={newFood.protein}
                  onChange={(e) =>
                    setNewFood({ ...newFood, protein: e.target.value })
                  }
                />
              </label>

              <label>
                Жири (г):
                <input
                  type="number"
                  placeholder="г"
                  value={newFood.fats}
                  onChange={(e) =>
                    setNewFood({ ...newFood, fats: e.target.value })
                  }
                />
              </label>

              <label>
                Вуглеводи (г):
                <input
                  type="number"
                  placeholder="г"
                  value={newFood.carbs}
                  onChange={(e) =>
                    setNewFood({ ...newFood, carbs: e.target.value })
                  }
                />
              </label>

              <label>
                Фото (необов’язково):
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    setNewFood({ ...newFood, imageFile: e.target.files[0] })
                  }
                />
              </label>

              <div className="modal-actions">
                <button onClick={handleAddFood}>
                  {editFoodId ? "Зберегти зміни" : "Додати"}
                </button>
                <button onClick={() => setShowAddModal(false)}>
                  Скасувати
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Відображення прийомів їжі */}
        {mealsByDate.length > 0 && (
          <section className="meal-summary">
            <h3>Прийоми їжі за {date}</h3>
            {mealsByDate.map((meal, idx) => (
              <div key={idx} className="meal-block">
                <div className="meal-header">
                  <h4>{mealTypeReverseMap[meal.type] || meal.type}</h4>
                  <button
                    onClick={() => handleDeleteMeal(meal.id)}
                    className="delete-meal-btn"
                  >
                    Видалити
                  </button>
                </div>

                <ul>
                  {meal.foods.map((food, i) => (
                    <li
                      key={i}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <span style={{ flex: 1 }}>
                        <span className="food-name">
                          {productMap[food.name] || food.name}
                        </span>
                        <span className="food-info">
                          <span className="calories-grams">
                            <span className="calories">
                              {food.calories} ккал
                            </span>
                            <span className="quantity">
                              — {food.quantity} г
                            </span>
                          </span>
                          <span className="macros">
                            ({food.protein}г Б / {food.fats}г Ж / {food.carbs}г
                            В)
                          </span>
                        </span>
                      </span>

                      {editingItemId === food.mealItemId ? (
                        <>
                          <input
                            type="number"
                            min="1"
                            max="1000"
                            value={editedQty[food.mealItemId] || ""}
                            onChange={(e) =>
                              setEditedQty((prev) => ({
                                ...prev,
                                [food.mealItemId]: Number(e.target.value),
                              }))
                            }
                          />
                          <button
                            onClick={() => handleUpdateMealItem(food)}
                            className="icon-btn"
                          >
                            <Save size={18} />
                          </button>
                          <button
                            onClick={() => setEditingItemId(null)}
                            className="icon-btn"
                          >
                            <X size={18} />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            className="icon-btn edit"
                            onClick={() => {
                              setEditingItemId(food.mealItemId);
                              setEditedQty((prev) => ({
                                ...prev,
                                [food.mealItemId]: food.quantity,
                              }));
                            }}
                          >
                            <Pencil size={18} />
                          </button>

                          <button
                            className="icon-btn delete"
                            onClick={() =>
                              handleDeleteMealItem(food.mealItemId)
                            }
                          >
                            <Trash2 size={18} />
                          </button>
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </section>
        )}
      </div>
    </BackgroundWrapper>
  );
}
