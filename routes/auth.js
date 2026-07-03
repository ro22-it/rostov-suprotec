const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database');

const router = express.Router();

// Регистрация
router.post('/register', (req, res) => {
  const { email, password, name, phone } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email и пароль обязательны' });
  }

  const existing = db.get('SELECT id FROM users WHERE email = ?', [email]);
  if (existing) {
    return res.status(400).json({ error: 'Пользователь с таким email уже существует' });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);
  const result = db.run(
    'INSERT INTO users (email, password, name, phone) VALUES (?, ?, ?, ?)',
    [email, hashedPassword, name, phone]
  );

  const token = jwt.sign(
    { id: result.lastInsertRowid, email, role: 'customer' },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.json({ 
    token, 
    user: { 
      id: result.lastInsertRowid, 
      email, 
      name, 
      phone,
      role: 'customer',
      bonus_points: 0
    } 
  });
});

// Вход
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  const user = db.get('SELECT * FROM users WHERE email = ?', [email]);
  if (!user) {
    return res.status(401).json({ error: 'Неверный email или пароль' });
  }

  const isValid = bcrypt.compareSync(password, user.password);
  if (!isValid) {
    return res.status(401).json({ error: 'Неверный email или пароль' });
  }

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      role: user.role,
      bonus_points: user.bonus_points
    }
  });
});

// Получение профиля
router.get('/profile', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Не авторизован' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = db.get('SELECT id, email, name, phone, role, bonus_points FROM users WHERE id = ?', [decoded.id]);
    if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
    res.json(user);
  } catch (e) {
    res.status(401).json({ error: 'Неверный токен' });
  }
});

module.exports = router;