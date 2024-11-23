import express from "express";
import sqlite3 from "sqlite3";

const app = express();
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
        reject("Failed to execute query.");
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

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
