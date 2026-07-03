const express = require('express');
const jwt = require('jsonwebtoken');
const db = require('../database');
const TelegramBot = require('node-telegram-bot-api');

const router = express.Router();

// Отправка уведомления в Telegram
function sendTelegramNotification(order) {
  if (!process.env.TELEGRAM_BOT_TOKEN || !order) {
    console.log('⚠️ Telegram токен не настроен или заказ пустой');
    return;
  }

  try {
    const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN);
    const items = JSON.parse(order.items);
    const itemsText = items.map(i => `- ${i.name} x${i.qty} = ${i.price * i.qty} ₽`).join('\n');
    
    const message = `🛒 Новый заказ #${order.id}

👤 Клиент: ${order.customer_name}
📞 Телефон: ${order.customer_phone}
📧 Email: ${order.customer_email || 'не указан'}

🚚 Доставка: ${order.delivery_type}
📍 Адрес: ${order.delivery_address || 'самовывоз'}
💳 Оплата: ${order.payment_method}

💰 Сумма: ${order.total} ₽

Товары:
${itemsText}`;

    bot.sendMessage(process.env.TELEGRAM_CHAT_ID, message)
      .then(() => console.log('✅ Уведомление отправлено в Telegram'))
      .catch(err => console.error('❌ Ошибка отправки в Telegram:', err));
  } catch (err) {
    console.error('❌ Ошибка создания уведомления:', err);
  }
}

// Создать заказ
router.post('/', (req, res) => {
  try {
    const { customer_name, customer_phone, customer_email, delivery_type, delivery_address, payment_method, items, total, user_id } = req.body;

    console.log('📦 Создание заказа:', { customer_name, total, items_count: items.length });

    // Валидация
    if (!customer_name || !customer_phone || !delivery_type || !payment_method || !items || !total) {
      return res.status(400).json({ error: 'Не все обязательные поля заполнены' });
    }

    if (items.length === 0) {
      return res.status(400).json({ error: 'Корзина пуста' });
    }

    // Проверка: наличные только для самовывоза
    if (payment_method === 'cash' && delivery_type !== 'pickup') {
      return res.status(400).json({ 
        error: 'Оплата наличными доступна только при самовывозе' 
      });
    }

    // Преобразуем items в JSON
    const itemsJson = JSON.stringify(items);

    // Сначала получаем ID следующего заказа
    const maxId = db.get('SELECT MAX(id) as maxId FROM orders');
    const newId = (maxId?.maxId || 0) + 1;

    // Создаём заказ
    db.run(
      `INSERT INTO orders (id, user_id, customer_name, customer_phone, customer_email, delivery_type, delivery_address, payment_method, total, items)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [newId, user_id || null, customer_name, customer_phone, customer_email || '', delivery_type, delivery_address || '', payment_method, total, itemsJson]
    );

    console.log(`✅ Заказ #${newId} создан`);

    // Получаем заказ для уведомления
    const order = db.get('SELECT * FROM orders WHERE id = ?', [newId]);
    
    // Отправляем уведомление в Telegram
    if (order) {
      sendTelegramNotification(order);
    } else {
      console.log('⚠️ Заказ не найден для уведомления');
    }

    res.json({ id: newId });
  } catch (err) {
    console.error('❌ Ошибка создания заказа:', err);
    res.status(500).json({ error: 'Ошибка создания заказа', details: err.message });
  }
});

// Получить заказы пользователя
router.get('/my', (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Не авторизован' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const orders = db.all('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC', [decoded.id]);
    res.json(orders);
  } catch (e) {
    console.error('Ошибка получения заказов:', e);
    res.status(401).json({ error: 'Неверный токен' });
  }
});

// Получить все заказы (админ)
router.get('/', (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Не авторизован' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'admin') return res.status(403).json({ error: 'Доступ запрещён' });

    const orders = db.all('SELECT * FROM orders ORDER BY created_at DESC');
    res.json(orders);
  } catch (e) {
    console.error('Ошибка получения заказов:', e);
    res.status(401).json({ error: 'Неверный токен' });
  }
});

// Обновить статус заказа (админ)
router.put('/:id/status', (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Не авторизован' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'admin') return res.status(403).json({ error: 'Доступ запрещён' });

    const { status } = req.body;
    db.run('UPDATE orders SET status = ? WHERE id = ?', [status, req.params.id]);
    res.json({ success: true });
  } catch (e) {
    console.error('Ошибка обновления статуса:', e);
    res.status(401).json({ error: 'Неверный токен' });
  }
});

module.exports = router;