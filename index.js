import express from "express";
import sqlite3 from "sqlite3";
import bcrypt from "bcrypt";

const app = express();
app.use(express.json());
const port = process.env.PORT || 3456;
const dbName = process.env.DB || "database.db";

const db = new sqlite3.Database(dbName, (err) => {
  if (err) {
    console.error("Failed to connect to the database:", err.message);
  } else {
    console.log("Connected to SQLite database.");
  }
});

const queryDatabase = async (query, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) {
        console.error("Database error:", err.message);
        reject(new Error(err.message));
      } else {
        resolve(rows);
      }
    });
  });
};

app.get("/data/:table", async (req, res) => {
  const tableName = req.params.table;
  try {
    const rows = await queryDatabase(`SELECT * FROM "${tableName}"`);
    res.json(rows);
  } catch (err) {
    res.status(500).send(err);
  }
});

app.post("/register", async (req, res) => {
  const { username, password, email, name } = req.body;
  if (!username || !password || !email || !name) {
    return res.status(400).json({
      success: false,
      message: "Missing required fields.",
    });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    await queryDatabase(
      "INSERT INTO users (username, password, email, name) VALUES (?, ?, ?, ?)",
      [username, hashedPassword, email, name]
    );
    res.status(201).json({
      success: true,
      message: "User registered successfully.",
    });
  } catch (err) {
    if (err.message && err.message.includes("UNIQUE constraint failed")) {
      res.status(400).json({
        success: false,
        message: "Username or email already exists.",
      });
    } else {
      console.error("Error during registration:", err.message);
      res.status(500).json({
        success: false,
        message: "Failed to register user.",
      });
    }
  }
});

app.post("/login", async (req, res) => {
  const { usernameOrEmail, password } = req.body;
  if (!usernameOrEmail || !password) {
    return res.status(400).json({
      success: false,
      message: "Missing required fields.",
    });
  }

  try {
    const users = await queryDatabase(
      "SELECT * FROM users WHERE username = ? OR email = ?",
      [usernameOrEmail, usernameOrEmail]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid username or password.",
      });
    }

    const user = users[0];
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (passwordMatch) {
      res.status(200).json({
        success: true,
        message: "Login successful.",
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          name: user.name,
        },
      });
    } else {
      res.status(401).json({
        success: false,
        message: "Invalid username or password.",
      });
    }
  } catch (err) {
    console.error("Error during login:", err.message);
    res.status(500).json({
      success: false,
      message: "Failed to log in.",
    });
  }
});

const getSortedColumnValues = async (tableName, columnName, res) => {
  try {
    const rows = await queryDatabase(`SELECT * FROM ${tableName}`);
    res.json(rows.map((row) => row[columnName]).sort());
  } catch (err) {
    res.status(500).send(err);
  }
};

app.get("/categories", async (req, res) => {
  await getSortedColumnValues("kategorije", "ime", res);
});

app.get("/eventTypes", async (req, res) => {
  await getSortedColumnValues("tipovi_dogadaja", "ime", res);
});

app.get("/organizers", async (req, res) => {
  await getSortedColumnValues("organizatori", "ime", res);
});

app.get("/ageGroups", async (req, res) => {
  await getSortedColumnValues("dobne_skupine", "ime", res);
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
