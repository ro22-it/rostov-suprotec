require('dotenv').config();
const express = require('express');
const path = require('path');
const database = require('./database');

const app = express();

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes
app.use('/api/products', require('./routes/products'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/yookassa', require('./routes/yookassa'));

// Главная страница
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Запуск сервера
const PORT = process.env.PORT || 5500;

database.init().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Сервер запущен на http://localhost:${PORT}`);
    console.log(`📦 База данных: suprotec.db`);
    console.log(`👤 Админка: http://localhost:${PORT}/admin.html`);
    console.log(`📧 Логин админа: admin@suprotec-rostov.ru`);
  });
}).catch(err => {
  console.error('❌ Ошибка инициализации БД:', err);
});