const express = require('express');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const db = require('../database');

const router = express.Router();

// Настройка загрузки файлов
const storage = multer.diskStorage({
  destination: path.join(__dirname, '../uploads'),
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// Middleware для проверки админа
const adminAuth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Не авторизован' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'admin') return res.status(403).json({ error: 'Доступ запрещён' });
    req.adminId = decoded.id;
    next();
  } catch (e) {
    res.status(401).json({ error: 'Неверный токен' });
  }
};

// Получить все товары (публично)
router.get('/', (req, res) => {
  const products = db.all('SELECT * FROM products WHERE is_active = 1 ORDER BY created_at DESC');
  res.json(products);
});

// Получить товар по ID
router.get('/:id', (req, res) => {
  const product = db.get('SELECT * FROM products WHERE id = ?', [req.params.id]);
  if (!product) return res.status(404).json({ error: 'Товар не найден' });
  res.json(product);
});

// Создать товар (админ)
router.post('/', adminAuth, upload.single('image'), (req, res) => {
  const { name, description, price, category, stock, badge } = req.body;
  const image = req.file ? `/uploads/${req.file.filename}` : null;

  const result = db.run(
    `INSERT INTO products (name, description, price, category, stock, image, badge)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [name, description, parseInt(price), category, parseInt(stock), image, badge]
  );

  res.json({ id: result.lastInsertRowid });
});

// Обновить товар (админ)
router.put('/:id', adminAuth, upload.single('image'), (req, res) => {
  const { name, description, price, category, stock, badge, is_active } = req.body;
  const image = req.file ? `/uploads/${req.file.filename}` : undefined;

  if (image) {
    db.run(
      `UPDATE products SET name=?, description=?, price=?, category=?, stock=?, image=?, badge=?, is_active=?
       WHERE id=?`,
      [name, description, parseInt(price), category, parseInt(stock), image, badge, parseInt(is_active), req.params.id]
    );
  } else {
    db.run(
      `UPDATE products SET name=?, description=?, price=?, category=?, stock=?, badge=?, is_active=?
       WHERE id=?`,
      [name, description, parseInt(price), category, parseInt(stock), badge, parseInt(is_active), req.params.id]
    );
  }

  res.json({ success: true });
});

// Удалить товар (админ)
router.delete('/:id', adminAuth, (req, res) => {
  db.run('DELETE FROM products WHERE id = ?', [req.params.id]);
  res.json({ success: true });
});

module.exports = router;