const express = require("express");
const cors = require("cors");
const mysql = require("mysql2");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const multer = require("multer");
const path = require("path");
const fs = require("fs");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = path.join(__dirname, "public", "images", "foods");
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const unique = Date.now() + "-" + file.originalname.replace(/\s/g, "_");
    cb(null, unique);
  },
});

const upload = multer({ storage });
const app = express();

app.use("/images", express.static(path.join(__dirname, "public", "images")));
app.use(cors());
app.use(express.json());

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

function isAdmin(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Unauthorized" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
}

// REGISTER endpoint
app.post("/api/register", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ message: "All fields are required" });

  const hashedPassword = await bcrypt.hash(password, 10);

  db.query(
    "INSERT INTO users (email, password_hash) VALUES (?, ?)",
    [email, hashedPassword],
    (err, result) => {
      if (err) {
        if (err.code === "ER_DUP_ENTRY") {
          return res.status(400).json({ message: "User already exists" });
        }
        return res.status(500).json({ message: "Server error" });
      }

      res.status(201).json({ message: "User registered successfully" });
    }
  );
});

// LOGIN endpoint
app.post("/api/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ message: "All fields are required" });

  db.query(
    "SELECT * FROM users WHERE email = ?",
    [email],
    async (err, results) => {
      if (err) return res.status(500).json({ message: "Server error" });
      if (results.length === 0)
        return res.status(401).json({ message: "User not found" });

      const user = results[0];
      const match = await bcrypt.compare(password, user.password_hash);

      if (!match)
        return res.status(401).json({ message: "Incorrect password" });

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role || "user" },
        process.env.JWT_SECRET,
        { expiresIn: "1h" }
      );

      res.json({ message: "Login successful", token });
    }
  );
});

app.post("/api/profile", (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Unauthorized" });

  let userId;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    userId = decoded.id;
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }

  let { height, weight, age, gender, activity, goal, allergies } = req.body;
  if (typeof allergies !== "string") allergies = "";

  const query = `
    INSERT INTO profiles (user_id, height, weight, age, gender, activity, goal, allergies)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      height = VALUES(height),
      weight = VALUES(weight),
      age = VALUES(age),
      gender = VALUES(gender),
      activity = VALUES(activity),
      goal = VALUES(goal),
      allergies = VALUES(allergies)
  `;

  db.query(
    query,
    [userId, height, weight, age, gender, activity, goal, allergies],
    (err, result) => {
      if (err) return res.status(500).json({ message: "Server error" });
      res.json({ message: "Профіль успішно збережено!" });
    }
  );
});

app.get("/api/profile", (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Unauthorized" });

  let userId;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    userId = decoded.id;
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }

  db.query(
    "SELECT * FROM profiles WHERE user_id = ?",
    [userId],
    (err, results) => {
      if (err) return res.status(500).json({ message: "Server error" });
      res.json(results[0] || null);
    }
  );
});

app.get("/api/calories", (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Unauthorized" });

  let userId;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    userId = decoded.id;
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }

  db.query(
    "SELECT * FROM profiles WHERE user_id = ?",
    [userId],
    (err, results) => {
      if (err) return res.status(500).json({ message: "Server error" });
      const profile = results[0];
      if (!profile)
        return res.status(404).json({ message: "Profile not found" });

      const { height, weight, age, gender, activity, goal } = profile;

      let s = gender === "Male" ? 5 : -161;
      let bmr = 10 * weight + 6.25 * height - 5 * age + s;

      const activityFactor =
        {
          Low: 1.2,
          Medium: 1.55,
          High: 1.725,
        }[activity] || 1.2;

      let tdee = bmr * activityFactor;

      if (goal === "Lose") tdee *= 0.85;
      else if (goal === "Gain") tdee *= 1.15;

      const calories = Math.round(tdee);
      const protein = Math.round(weight * 1.8);
      const fats = Math.round(weight * 1);
      const carbs = Math.round((calories - (protein * 4 + fats * 9)) / 4);

      res.json({ calories, protein, fats, carbs });
    }
  );
});

// Отримати список всіх доступних продуктів
app.get("/api/foods", (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];

  let userId = null;
  try {
    userId = jwt.verify(token, process.env.JWT_SECRET).id;
  } catch {}

  const query = `
    SELECT * FROM foods
    WHERE is_custom = 0 OR user_id = ?
  `;
  db.query(query, [userId], (err, results) => {
    if (err) return res.status(500).json({ message: "DB error" });
    res.json(results);
  });
});

app.post("/api/foods", upload.single("image"), (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Unauthorized" });

  let userId;
  try {
    userId = jwt.verify(token, process.env.JWT_SECRET).id;
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }

  const { name, category, calories, protein, fats, carbs, allergens } =
    req.body;
  const image = req.file ? req.file.filename : null;

  if (!name || !category || calories == null) {
    return res.status(400).json({ message: "Missing fields" });
  }

  const query = `
    INSERT INTO foods (name, category, calories, protein, fats, carbs, is_custom, user_id, image, allergens)
    VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?)
  `;

  db.query(
    query,
    [name, category, calories, protein, fats, carbs, userId, image, allergens],
    (err) => {
      if (err) return res.status(500).json({ message: "Insert failed" });
      res.json({ message: "Продукт додано" });
    }
  );
});

// ОБНОВЛЕННЯ ПРОДУКТУ
app.put("/api/foods/:id", upload.single("image"), (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Unauthorized" });

  let userId;
  try {
    userId = jwt.verify(token, process.env.JWT_SECRET).id;
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }

  const { name, category, calories, protein, fats, carbs, allergens } =
    req.body;
  const image = req.file ? req.file.filename : null;
  const foodId = req.params.id;

  // Проверка доступа: пользователь должен быть владельцем
  db.query(
    "SELECT * FROM foods WHERE id = ? AND user_id = ?",
    [foodId, userId],
    (err, results) => {
      if (err) return res.status(500).json({ message: "DB error" });
      if (results.length === 0)
        return res.status(403).json({ message: "Access denied" });

      const fields = [
        "name",
        "category",
        "calories",
        "protein",
        "fats",
        "carbs",
        "allergens",
      ];
      const updates = fields.map((f) => `${f} = ?`).join(", ");
      const values = [
        name,
        category,
        calories,
        protein,
        fats,
        carbs,
        allergens,
      ];

      let sql = `UPDATE foods SET ${updates}`;
      if (image) {
        sql += ", image = ?";
        values.push(image);
      }

      sql += " WHERE id = ? AND user_id = ?";
      values.push(foodId, userId);

      db.query(sql, values, (err2) => {
        if (err2) return res.status(500).json({ message: "Update error" });
        res.json({ message: "Продукт оновлено" });
      });
    }
  );
});

// ВИДАЛЕННЯ ПРОДУКТУ
app.delete("/api/foods/:id", (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Unauthorized" });

  let userId;
  try {
    userId = jwt.verify(token, process.env.JWT_SECRET).id;
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }

  const foodId = req.params.id;

  db.query(
    "DELETE FROM foods WHERE id = ? AND user_id = ?",
    [foodId, userId],
    (err, result) => {
      if (err) return res.status(500).json({ message: "DB error" });
      if (result.affectedRows === 0)
        return res.status(403).json({ message: "Access denied" });

      res.json({ message: "Продукт видалено" });
    }
  );
});

// Адмін: додати новий продукт для всіх користувачів
app.post("/api/admin/foods", upload.single("image"), (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Unauthorized" });

  let isAdmin;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    isAdmin = decoded.role === "admin";
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }

  if (!isAdmin) return res.status(403).json({ message: "Access denied" });

  const { name, category, calories, protein, fats, carbs, allergens } =
    req.body;
  const image = req.file ? req.file.filename : null;

  db.query(
    `INSERT INTO foods (name, category, calories, protein, fats, carbs, is_custom, user_id, image, allergens)
     VALUES (?, ?, ?, ?, ?, ?, 0, NULL, ?, ?)`,
    [name, category, calories, protein, fats, carbs, image, allergens],
    (err) => {
      if (err) return res.status(500).json({ message: "Insert failed" });
      res.json({ message: "Продукт додано" });
    }
  );
});

// Адмін: редагування продукту
app.put("/api/admin/foods/:id", upload.single("image"), (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Unauthorized" });

  let isAdmin;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    isAdmin = decoded.role === "admin";
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }

  if (!isAdmin) return res.status(403).json({ message: "Access denied" });

  const foodId = req.params.id;
  const { name, category, calories, protein, fats, carbs, allergens } =
    req.body;

  const allergensString = Array.isArray(allergens)
    ? allergens.join(",")
    : allergens;

  const image = req.file ? req.file.filename : null;

  console.log("Обновление продукта админом:", {
    name,
    category,
    calories,
    protein,
    fats,
    carbs,
    allergens,
  });

  const fields = ["name", "category", "calories", "protein", "fats", "carbs"];
  const values = [name, category, calories, protein, fats, carbs];
  if (image) {
    fields.push("image");
    values.push(image);
  }
  fields.push("allergens");
  values.push(allergensString);

  const query = `
    UPDATE foods SET ${fields.map((f) => `${f} = ?`).join(", ")}
    WHERE id = ?
  `;
  values.push(foodId);

  db.query(query, values, (err) => {
    if (err) return res.status(500).json({ message: "Update failed" });
    res.json({ message: "Оновлено" });
  });
});

// Адмін: видалення продукту
app.delete("/api/admin/foods/:id", (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Unauthorized" });

  let isAdmin;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    isAdmin = decoded.role === "admin";
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }

  if (!isAdmin) return res.status(403).json({ message: "Access denied" });

  const foodId = req.params.id;

  db.query("DELETE FROM foods WHERE id = ?", [foodId], (err, result) => {
    if (err) return res.status(500).json({ message: "DB error" });
    res.json({ message: "Deleted" });
  });
});

// Зберегти новий прийом їжі (дата, тип, список продуктів)
app.post("/api/meals", (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];

  console.log("Отримано прийом їжі:", req.body);

  if (!token) return res.status(401).json({ message: "Unauthorized" });

  let userId;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    userId = decoded.id;
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }

  const { date, type, foods } = req.body;

  if (!date || !type || !Array.isArray(foods) || foods.length === 0) {
    return res.status(400).json({ message: "Invalid meal data" });
  }

  // 1. Додаємо прийом їжі в таблицю meals
  db.query(
    "INSERT INTO meals (user_id, date, type) VALUES (?, ?, ?)",
    [userId, date, type],
    (err, result) => {
      if (err) return res.status(500).json({ message: "Error saving meal" });

      const mealId = result.insertId;

      // 2. Формуємо масив для вставки у meal_items
      const values = foods.map((item) => [
        mealId,
        item.foodId,
        item.quantity,
        item.calories,
        item.protein,
        item.fats,
        item.carbs,
      ]);

      db.query(
        `INSERT INTO meal_items 
         (meal_id, food_id, quantity, calories, protein, fats, carbs) 
         VALUES ?`,
        [values],
        (err2) => {
          if (err2) {
            console.error("Insert error:", err2);
            return res.status(500).json({ message: "Error saving meal items" });
          }

          res.json({ message: "Meal saved successfully" });
        }
      );
    }
  );
});

//  Отримати всі прийоми їжі користувача за обрану дату
app.get("/api/meals", (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];

  // proverka
  console.log(">>> TOKEN:", token);
  console.log(">>> JWT_SECRET:", process.env.JWT_SECRET);

  if (!token) return res.status(401).json({ message: "Unauthorized" });

  let userId;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    userId = decoded.id;
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }

  const { date } = req.query;
  if (!date) return res.status(400).json({ message: "Date is required" });

  // Витягуємо всі прийоми їжі разом з продуктами
  const query = `
    SELECT 
    m.id as id,        
    m.type,
    f.id as food_id,
    f.name,
    mi.id as meal_item_id,
    mi.quantity,
    mi.calories,
    mi.protein,
    mi.fats,
    mi.carbs
    FROM meals m
    JOIN meal_items mi ON mi.meal_id = m.id
    JOIN foods f ON f.id = mi.food_id
    WHERE m.user_id = ? AND m.date = ?
    ORDER BY m.type
  `;

  db.query(query, [userId, date], (err, results) => {
    if (err) return res.status(500).json({ message: "Server error" });

    // Групуємо по типу прийому їжі (сніданок, обід тощо)
    const grouped = {};
    results.forEach((row) => {
      if (!grouped[row.type]) grouped[row.type] = [];
      grouped[row.type].push({
        mealItemId: row.meal_item_id, // тут
        name: row.name,
        quantity: row.quantity,
        calories: row.calories,
        protein: row.protein,
        fats: row.fats,
        carbs: row.carbs,
      });
    });

    // Формуємо масив { type, foods }
    const mealTypeReverseMap = {
      Breakfast: "Сніданок",
      Lunch: "Обід",
      Dinner: "Вечеря",
      Snack: "Перекус",
    };

    const response = Object.entries(grouped).map(([type, foods]) => {
      const firstMeal = results.find((r) => r.type === type);
      return {
        id: firstMeal?.id, //  id
        type: mealTypeReverseMap[type] || type,
        foods,
      };
    });

    res.json(response);
  });
});

// Видалити прийом їжі
app.delete("/api/meals/:id", (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Unauthorized" });

  let userId;
  try {
    userId = jwt.verify(token, process.env.JWT_SECRET).id;
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }

  const mealId = req.params.id;

  // 1. Видалити продукти з meal_items
  db.query("DELETE FROM meal_items WHERE meal_id = ?", [mealId], (err) => {
    if (err) {
      console.error("Error deleting meal_items:", err);
      return res.status(500).json({ message: "Error deleting meal_items" });
    }

    // 2. Видалити сам meal
    db.query(
      "DELETE FROM meals WHERE id = ? AND user_id = ?",
      [mealId, userId],
      (err2) => {
        if (err2) {
          console.error("Error deleting meal:", err2);
          return res.status(500).json({ message: "Error deleting meal" });
        }

        res.json({ message: "Meal deleted successfully" });
      }
    );
  });
});

// Отримати всі продукти, які користувач з'їв сьогодні, підсумкові калорії та БЖВ
app.get("/api/meals/summary", (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Unauthorized" });

  let userId;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    userId = decoded.id;
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }

  const date = req.query.date || new Date().toISOString().slice(0, 10);

  const query = `
    SELECT mi.calories, mi.protein, mi.fats, mi.carbs
    FROM meals m
    JOIN meal_items mi ON mi.meal_id = m.id
    WHERE m.user_id = ? AND m.date = ?
`;

  db.query(query, [userId, date], (err, results) => {
    if (err) return res.status(500).json({ message: "Server error" });

    const totals = results.reduce(
      (acc, food) => {
        acc.calories += food.calories;
        acc.protein += food.protein;
        acc.fats += food.fats;
        acc.carbs += food.carbs;
        return acc;
      },
      { calories: 0, protein: 0, fats: 0, carbs: 0 }
    );

    res.json(totals);
  });
});

// Видалити окремий продукт із прийому їжі
app.delete("/api/meal-items/:id", (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Unauthorized" });

  let userId;
  try {
    userId = jwt.verify(token, process.env.JWT_SECRET).id;
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }

  const itemId = req.params.id;

  // Перевіряємо, що item належить користувачу
  const checkQuery = `
    SELECT mi.id
    FROM meal_items mi
    JOIN meals m ON mi.meal_id = m.id
    WHERE mi.id = ? AND m.user_id = ?
  `;

  db.query(checkQuery, [itemId, userId], (err, results) => {
    if (err) return res.status(500).json({ message: "DB error" });
    if (results.length === 0)
      return res.status(403).json({ message: "Access denied" });

    db.query("DELETE FROM meal_items WHERE id = ?", [itemId], (err2) => {
      if (err2) return res.status(500).json({ message: "Delete error" });
      res.json({ message: "Item deleted" });
    });
  });
});

// Оновити кількість грамів у meal_items
app.put("/api/meal-items/:id", (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Unauthorized" });

  let userId;
  try {
    userId = jwt.verify(token, process.env.JWT_SECRET).id;
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }

  const itemId = req.params.id;
  const { quantity } = req.body;

  // 1. Перевірка доступу до meal item
  const checkQuery = `
    SELECT mi.id, f.calories, f.protein, f.fats, f.carbs
    FROM meal_items mi
    JOIN meals m ON mi.meal_id = m.id
    JOIN foods f ON mi.food_id = f.id
    WHERE mi.id = ? AND m.user_id = ?
  `;

  db.query(checkQuery, [itemId, userId], (err, results) => {
    if (err) return res.status(500).json({ message: "DB error" });
    if (results.length === 0)
      return res.status(403).json({ message: "Access denied" });

    const food = results[0];

    // 2. Перерахунок
    const newCalories = Math.round((food.calories / 100) * quantity);
    const newProtein = Math.round((food.protein / 100) * quantity);
    const newFats = Math.round((food.fats / 100) * quantity);
    const newCarbs = Math.round((food.carbs / 100) * quantity);

    // 3. Оновлення
    const updateQuery = `
      UPDATE meal_items
      SET quantity = ?, calories = ?, protein = ?, fats = ?, carbs = ?
      WHERE id = ?
    `;
    db.query(
      updateQuery,
      [quantity, newCalories, newProtein, newFats, newCarbs, itemId],
      (err2) => {
        if (err2) return res.status(500).json({ message: "Update error" });
        res.json({ message: "Meal item updated" });
      }
    );
  });
});

//  Отримання статистики харчування + рекомендації
app.get("/api/statistics", (req, res) => {
  //  Перевірка токена авторизації
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Unauthorized" });

  let userId;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    userId = decoded.id;
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }

  //  Отримуємо параметри дати з URL
  const { from, to } = req.query;
  if (!from || !to)
    return res.status(400).json({ message: "Invalid date range" });

  //  Розрахунок цілей користувача (калорії, БЖВ)
  const getGoals = new Promise((resolve, reject) => {
    db.query(
      "SELECT * FROM profiles WHERE user_id = ?",
      [userId],
      (err, results) => {
        if (err) return reject(err);
        const profile = results[0];
        if (!profile) return reject(new Error("Profile not found"));

        //  Розрахунок BMR, TDEE та норм по білках, жирах, вуглеводах
        const { weight, height, age, gender, activity, goal } = profile;
        const s = gender === "Male" ? 5 : -161;
        const bmr = 10 * weight + 6.25 * height - 5 * age + s;
        const activityFactor =
          {
            Low: 1.2,
            Medium: 1.55,
            High: 1.725,
          }[activity] || 1.2;

        let tdee = bmr * activityFactor;
        if (goal === "Lose") tdee *= 0.85;
        else if (goal === "Gain") tdee *= 1.15;

        const calories = Math.round(tdee);
        const protein = Math.round(weight * 1.8);
        const fats = Math.round(weight * 1);
        const carbs = Math.round((calories - (protein * 4 + fats * 9)) / 4);

        resolve({ calories, protein, fats, carbs });
      }
    );
  });

  //  Отримання з’їдених калорій і БЖВ за кожен день
  const getStats = new Promise((resolve, reject) => {
    const query = `
      SELECT m.date, 
             SUM(mi.calories) AS calories, 
             SUM(mi.protein) AS protein, 
             SUM(mi.fats) AS fats, 
             SUM(mi.carbs) AS carbs
      FROM meals m
      JOIN meal_items mi ON mi.meal_id = m.id
      WHERE m.user_id = ? AND m.date BETWEEN ? AND ?
      GROUP BY m.date
      ORDER BY m.date
    `;
    db.query(query, [userId, from, to], (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });

  //  Аналіз даних та формування рекомендацій
  Promise.all([getGoals, getStats])
    .then(([goals, stats]) => {
      const recommendations = [];
      let lowProteinDays = 0;
      let highProteinDays = 0;
      let lowFatDays = 0;
      let highFatDays = 0;
      let lowCarbDays = 0;
      let highCarbDays = 0;
      let lowCalorieDays = 0;
      let highCalorieDays = 0;

      const dataWithAnalysis = stats.map((day) => {
        const { date, calories, protein, fats, carbs } = day;

        //  Визначаємо відхилення від норми
        if (protein > goals.protein * 1.1) highProteinDays++;
        if (fats < goals.fats * 0.9) lowFatDays++;
        if (fats > goals.fats * 1.1) highFatDays++;
        if (carbs < goals.carbs * 0.9) lowCarbDays++;
        if (calories < goals.calories * 0.9) lowCalorieDays++;
        if (calories > goals.calories * 1.1) highCalorieDays++;

        return {
          date,
          calories: Number(calories),
          protein: Number(protein),
          fats: Number(fats),
          carbs: Number(carbs),
          goals,
        };
      });

      // Формування текстових рекомендацій на основі статистики ( мин. 3 дня)

      if (lowProteinDays >= 3) {
        recommendations.push(
          `Протягом ${lowProteinDays} днів Ви споживали недостатньо білків. Спробуйте додати більше яєць, курки, сиру або бобових.`
        );
      }

      if (highProteinDays >= 3) {
        recommendations.push(
          `У ${highProteinDays} випадках білкове споживання перевищувало норму. Зверніть увагу на баланс білків у раціоні.`
        );
      }

      if (lowFatDays >= 3) {
        recommendations.push(
          `Недостатнє споживання жирів у ${lowFatDays} днях. Додайте до раціону корисні жири: авокадо, горіхи, оливкова олія.`
        );
      }

      if (highFatDays >= 3) {
        recommendations.push(
          `Протягом ${highFatDays} днів Ви споживали занадто багато жирів. Намагайтесь обмежити жирні соуси та смажені страви.`
        );
      }

      if (lowCarbDays >= 3) {
        recommendations.push(
          `У ${lowCarbDays} днях спостерігалося знижене споживання вуглеводів. Включіть більше овочів, цільнозернових продуктів або фруктів.`
        );
      }

      if (highCarbDays >= 3) {
        recommendations.push(
          `Надлишок вуглеводів у ${highCarbDays} днях. Спробуйте зменшити споживання хліба, солодощів або макаронів.`
        );
      }

      if (lowCalorieDays >= 3) {
        recommendations.push(
          `Загальна калорійність була занадто низькою протягом ${lowCalorieDays} днів. Це може призводити до втрати енергії.`
        );
      }

      if (highCalorieDays >= 3) {
        recommendations.push(
          `Протягом ${highCalorieDays} днів Ви перевищили добову норму калорій. Контролюйте порції та уникайте зайвих перекусів.`
        );
      }

      //  Відправляємо відповідь
      res.json({ data: dataWithAnalysis, recommendations, goals });
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ message: "Error generating statistics" });
    });
});

// Зберегти або оновити вагу
app.post("/api/weight", (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Unauthorized" });

  let userId;
  try {
    userId = jwt.verify(token, process.env.JWT_SECRET).id;
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }

  const { date, weight } = req.body;
  if (!date || !weight)
    return res.status(400).json({ message: "Missing data" });

  const query = `
    INSERT INTO weight_logs (user_id, date, weight)
    VALUES (?, ?, ?)
    ON DUPLICATE KEY UPDATE weight = VALUES(weight)
  `;

  db.query(query, [userId, date, weight], (err) => {
    if (err) return res.status(500).json({ message: "DB error" });
    res.json({ message: "Weight saved" });
  });
});

//  Отримати історію ваги
app.get("/api/weight", (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Unauthorized" });

  let userId;
  try {
    userId = jwt.verify(token, process.env.JWT_SECRET).id;
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }

  const { from, to } = req.query;
  if (!from || !to) return res.status(400).json({ message: "Invalid range" });

  db.query(
    "SELECT date, weight FROM weight_logs WHERE user_id = ? AND date BETWEEN ? AND ? ORDER BY date",
    [userId, from, to],
    (err, results) => {
      if (err) return res.status(500).json({ message: "DB error" });
      res.json(results);
    }
  );
});

// оновлення ваги
app.put("/api/weight", (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Unauthorized" });

  let userId;
  try {
    userId = jwt.verify(token, process.env.JWT_SECRET).id;
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }

  const { date, weight } = req.body;
  if (!date || !weight)
    return res.status(400).json({ message: "Missing data" });

  const query = `UPDATE weight_logs SET weight = ? WHERE user_id = ? AND date = ?`;
  db.query(query, [weight, userId, date], (err) => {
    if (err) return res.status(500).json({ message: "DB error" });
    res.json({ message: "Weight updated" });
  });
});

// видалення ваги
app.delete("/api/weight", (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Unauthorized" });

  let userId;
  try {
    userId = jwt.verify(token, process.env.JWT_SECRET).id;
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }

  const { date } = req.query;
  if (!date) return res.status(400).json({ message: "Missing date" });

  console.log(">>> DELETE weight request", { userId, date: req.query.date });

  console.log(">>> DELETE weight", { userId, date });

  db.query(
    "DELETE FROM weight_logs WHERE user_id = ? AND DATE(date) = ?",
    [userId, date],
    (err, result) => {
      if (err) {
        console.error("DELETE weight error:", err);
        return res.status(500).json({ message: "DB error" });
      }

      console.log("Rows affected:", result.affectedRows); // тут
      res.json({ message: "Weight deleted" });
    }
  );
});

// Адм. переглянути всіх користувачів
app.get("/api/admin/users", isAdmin, (req, res) => {
  db.query("SELECT id, email, role, created_at FROM users", (err, results) => {
    if (err) return res.status(500).json({ message: "DB error" });
    res.json(results);
  });
});

// Адм. видалити користувача
app.delete("/api/admin/users/:id", isAdmin, (req, res) => {
  const userId = req.params.id;
  db.query("DELETE FROM users WHERE id = ?", [userId], (err) => {
    if (err) return res.status(500).json({ message: "Delete error" });
    res.json({ message: "User deleted" });
  });
});

app.post("/api/feedback", (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Unauthorized" });

  let userId;
  try {
    userId = jwt.verify(token, process.env.JWT_SECRET).id;
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }

  const { message } = req.body;
  if (!message) return res.status(400).json({ message: "Empty message" });

  db.query(
    "INSERT INTO feedback (user_id, message) VALUES (?, ?)",
    [userId, message],
    (err) => {
      if (err) return res.status(500).json({ message: "DB error" });
      res.json({ message: "Feedback saved" });
    }
  );
});

// Только для админов: отримати список усіх користувачів
app.get("/api/admin/users", (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Unauthorized" });

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }

  if (decoded.role !== "admin") {
    return res.status(403).json({ message: "Access denied" });
  }

  db.query(
    "SELECT id, email, role, created_at FROM users ORDER BY created_at DESC",
    (err, results) => {
      if (err) return res.status(500).json({ message: "DB error" });
      res.json(results);
    }
  );
});

// Змінити роль користувача
app.put("/api/admin/users/:id/role", (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Unauthorized" });

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }

  if (decoded.role !== "admin") {
    return res.status(403).json({ message: "Access denied" });
  }

  const userId = req.params.id;
  const { role } = req.body;

  if (!["user", "admin"].includes(role)) {
    return res.status(400).json({ message: "Invalid role" });
  }

  db.query(
    "UPDATE users SET role = ? WHERE id = ?",
    [role, userId],
    (err, result) => {
      if (err) return res.status(500).json({ message: "DB error" });
      res.json({ message: "Role updated" });
    }
  );
});

// Отримати всі фідбеки (тільки для адмінів)
app.get("/api/admin/feedbacks", isAdmin, (req, res) => {
  db.query(
    `SELECT feedback.id, feedback.message, feedback.created_at, feedback.is_read, users.email
     FROM feedback
     JOIN users ON feedback.user_id = users.id
     ORDER BY feedback.created_at DESC`,
    (err, results) => {
      if (err) return res.status(500).json({ message: "DB error" });
      res.json(results);
    }
  );
});

// Видалити відгук (тільки для адміна)
app.delete("/api/admin/feedbacks/:id", isAdmin, (req, res) => {
  const feedbackId = req.params.id;
  db.query("DELETE FROM feedback WHERE id = ?", [feedbackId], (err) => {
    if (err) return res.status(500).json({ message: "DB error" });
    res.json({ message: "Feedback deleted" });
  });
});

// відмітити прочитане (адмін)
app.put("/api/admin/feedback/:id/read", isAdmin, (req, res) => {
  const feedbackId = req.params.id;
  db.query(
    "UPDATE feedback SET is_read = true WHERE id = ?",
    [feedbackId],
    (err) => {
      if (err) return res.status(500).json({ message: "DB error" });
      res.json({ message: "Позначено як прочитане" });
    }
  );
});

// Відповісти на відгук (тільки для адміна)
app.put("/api/admin/feedbacks/:id/reply", isAdmin, (req, res) => {
  const { reply } = req.body;
  const feedbackId = req.params.id;

  if (!reply)
    return res
      .status(400)
      .json({ message: "Відповідь не може бути порожньою" });

  const query = `
    UPDATE feedback
    SET reply = ?, replied_at = NOW(), is_read = 1
    WHERE id = ?
  `;

  db.query(query, [reply, feedbackId], (err) => {
    if (err) return res.status(500).json({ message: "DB error" });
    res.json({ message: "Відповідь надіслано" });
  });
});

// Отримати всі відгуки поточного користувача
app.get("/api/my-feedbacks", (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Unauthorized" });

  let userId;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    userId = decoded.id;
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }

  const query = `
    SELECT id, message, created_at, reply, replied_at, is_read
    FROM feedback
    WHERE user_id = ?
    ORDER BY created_at DESC
  `;

  db.query(query, [userId], (err, results) => {
    if (err) {
      console.error("DB error:", err);
      return res.status(500).json({ message: "DB error" });
    }
    res.json(results);
  });
});

app.delete("/api/my-feedbacks/:id", (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Unauthorized" });

  let userId;
  try {
    userId = jwt.verify(token, process.env.JWT_SECRET).id;
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }

  const feedbackId = req.params.id;

  // Видаляємо лише, якщо належить користувачу і ще без відповіді
  db.query(
    "DELETE FROM feedback WHERE id = ? AND user_id = ? AND reply IS NULL",
    [feedbackId, userId],
    (err, result) => {
      if (err) return res.status(500).json({ message: "DB error" });
      if (result.affectedRows === 0)
        return res.status(403).json({ message: "Неможливо видалити" });
      res.json({ message: "Відгук видалено" });
    }
  );
});

app.listen(process.env.PORT, () => {
  console.log(`Server is running on port ${process.env.PORT}`);
});
