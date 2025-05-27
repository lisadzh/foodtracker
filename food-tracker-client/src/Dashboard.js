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
} from "lucide-react";

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

  // Мапінг назв прийомів їжі
  const mealTypeMap = useMemo(
    () => ({
      Сніданок: "Breakfast",
      Обід: "Lunch",
      Вечеря: "Dinner",
      Перекус: "Snack",
    }),
    []
  );

  // Зворотній мапінг для відображення назв українською
  const mealTypeReverseMap = useMemo(
    () => ({
      breakfast: "Сніданок",
      lunch: "Обід",
      dinner: "Вечеря",
      snack: "Перекус",
    }),
    []
  );

  // Категорії продуктів з перекладом
  const categoryMap = {
    All: "Усі",
    Vegetable: "Овочі",
    Fruit: "Фрукти",
    Grain: "Злаки",
    Meat: "М'ясо",
    Dairy: "Молочне",
    Drink: "Напої",
    Soup: "Страви",
    Sweet: "Солодке",
  };

  // Словник перекладу назв продуктів
  const productMap = {
    Tomato: "Помідор",
    Cucumber: "Огірок",
    Carrot: "Морква",
    Broccoli: "Броколі",
    Cabbage: "Капуста",
    Zucchini: "Кабачок",
    "Bell Pepper": "Болгарський перець",
    Eggplant: "Баклажан",
    Spinach: "Шпинат",
    Beetroot: "Буряк",
    "Green Beans": "Зелена квасоля",
    "Corn (boiled)": "Кукурудза (варена)",
    "Pickled Cucumbers": "Мариновані огірки",
    Onion: "Цибуля",
    Garlic: "Часник",
    Banana: "Банан",
    Apple: "Яблуко",
    Orange: "Апельсин",
    Pear: "Груша",
    Grapes: "Виноград",
    Watermelon: "Кавун",
    Melon: "Диня",
    Kiwi: "Ківі",
    Mango: "Манго",
    Pineapple: "Ананас",
    Blueberries: "Чорниця",
    Strawberries: "Полуниця",
    Avocado: "Авокадо",
    Pomegranate: "Гранат",
    Figs: "Інжир",
    "Bread (white)": "Білий хліб",
    "Bread (whole grain)": "Цільнозерновий хліб",
    "Rye Bread": "Житній хліб",
    "Pasta (boiled)": "Макарони варені",
    "Boiled Rice": "Рис варений",
    "Buckwheat (boiled)": "Гречка варена",
    Oatmeal: "Вівсянка",
    "Barley Porridge": "Ячна каша",
    "Millet Porridge": "Пшоняна каша",
    Cornflakes: "Кукурудзяні пластівці",
    Granola: "Гранола",
    Croissant: "Круасан",
    Muffin: "Маффін",
    "Fried Chicken Breast": "Куряча грудка смажена",
    "Grilled Pork Chop": "Свинина гриль",
    "Boiled Beef with Vegetables": "Яловичина з овочами",
    "Fried Fish Fillet": "Рибне філе смажене",
    "Baked Salmon with Lemon": "Запечений лосось",
    "Tuna Salad with Corn": "Салат з тунцем",
    "Stewed Liver with Onion": "Печінка тушкована",
    Ham: "Шинка",
    Sausage: "Ковбаса",
    Egg: "Яйце",
    "Boiled Egg": "Яйце варене",
    Milk: "Молоко",
    Cheese: "Сир",
    "Cottage Cheese": "Творог",
    Yogurt: "Йогурт",
    "Greek Yogurt": "Грецький йогурт",
    "Sour Cream 15%": "Сметана 15%",
    "Processed Cheese": "Плавлений сир",
    Water: "Вода",
    Tea: "Чай",
    Coffee: "Кава",
    "Juice (orange)": "Сік апельсиновий",
    "Coca-Cola": "Кока-Кола",
    Milkshake: "Молочний коктейль",
    Smoothie: "Смузі",
    "Protein Shake": "Протеїновий коктейль",
    Kvass: "Квас",
    "Mashed Potato": "Пюре картопляне",
    "Fried Potato": "Картопля смажена",
    "Baked Potato with Cheese": "Картопля з сиром",
    "Buckwheat with Gravy": "Гречка з підливою",
    "Rice with Chicken": "Рис з куркою",
    "Fried Rice with Vegetables": "Рис з овочами",
    "Macaroni with Cheese": "Макарони з сиром",
    "Pelmeni with Sour Cream": "Пельмені зі сметаною",
    "Chicken Cutlet with Buckwheat": "Котлета з гречкою",
    "Chicken Soup": "Курячий суп",
    Borscht: "Борщ",
    "Lentil Soup": "Суп з сочевиці",
    "Stuffed Cabbage Rolls": "Голубці",
    "Vegetable Stew": "Овочеве рагу",
    Chocolate: "Шоколад",
    Candy: "Цукерка",
    Cookie: "Печиво",
    "Cheesecakes with Raisins": "Сирники з родзинками",
    "Syrniki with Sour Cream": "Сирники зі сметаною",
    "Pancakes with Jam": "Млинці з варенням",
    Jam: "Варення",
    Honey: "Мед",
  };

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
    axios
      .get("http://localhost:5000/api/foods")
      .then((res) => setFoods(res.data))
      .catch((err) => console.error("Помилка завантаження продуктів:", err));
  }, []);

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
      : foods.filter((food) => food.category === categoryFilter.toLowerCase());

  const searchedFoods = filteredFoods.filter((food) =>
    (productMap[food.name] || food.name)
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
  );

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

        {/* Сітка продуктів */}
        <div className="food-grid">
          {searchedFoods.map((food) => (
            <div
              key={food.id}
              className={`food-card ${
                selected.find((item) => item.id === food.id) ? "selected" : ""
              }`}
              onClick={() => toggleFood(food.id)}
            >
              <img
                src={`/images/foods/${food.name
                  .toLowerCase()
                  .replace(/ /g, "_")
                  .replace(/%/g, "percent")}.jpg`}
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
                  <label>г:</label>
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
                          <button onClick={() => handleUpdateMealItem(food)}>
                            💾
                          </button>
                          <button onClick={() => setEditingItemId(null)}>
                            ✖
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
