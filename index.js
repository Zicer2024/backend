import express from 'express';
import dotenv from 'dotenv';
import sqlite3 from 'sqlite3';

dotenv.config();

const app = express();
const port = process.env.PORT || 3456;

const db = new sqlite3.Database('./database.db', (err) => {
  if (err) {
    console.error('Error connecting to SQLite:', err.message);
  } else {
    console.log('Connected to SQLite database.');
  }
});

app.get("/", (req, res) => {
  db.all(`SELECT * FROM test`, [], (err, rows) => {
    if (err) {
      console.error("Error retrieving data:", err.message);
      res.status(500).send("Failed to retrieve data.");
    } else {
      res.json(rows);
    }
  });
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
