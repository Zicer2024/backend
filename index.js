import express from 'express';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 3456;

app.get('/', (req, res) => {
  res.send('Hello, Zicer 2024!');
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
