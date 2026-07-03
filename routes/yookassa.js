const express = require('express');
const crypto = require('crypto');
const db = require('../database');

const router = express.Router();

// Настройки ЮKassa
const YOOKASSA_SHOP_ID = process.env.YOOKASSA_SHOP_ID;
const YOOKASSA_SECRET_KEY = process.env.YOOKASSA_SECRET_KEY;
const YOOKASSA_BASE_URL = 'https://api.yookassa.ru/v3';

// Базовая авторизация
function getAuthHeader() {
  const credentials = Buffer.from(`${YOOKASSA_SHOP_ID}:${YOOKASSA_SECRET_KEY}`).toString('base64');
  return `Basic ${credentials}`;
}

// Создание платежа
router.post('/create', async (req, res) => {
  const { order_id, amount, description } = req.body;

  try {
    const idempotenceKey = crypto.randomUUID();
    
    const response = await fetch(`${YOOKASSA_BASE_URL}/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotence-Key': idempotenceKey,
        'Authorization': getAuthHeader()
      },
      body: JSON.stringify({
        amount: {
          value: Number(amount).toFixed(2),
          currency: 'RUB'
        },
        confirmation: {
          type: 'redirect',
          return_url: process.env.YOOKASSA_RETURN_URL || 'http://localhost:5500/checkout.html?success=true'
        },
        capture: true,
        description: description || `Заказ #${order_id}`,
        metadata: {
          order_id: order_id
        }
      })
    });

    const payment = await response.json();

    if (!response.ok) {
      console.error('ЮKassa ошибка:', payment);
      return res.status(response.status).json({ 
        error: 'Ошибка создания платежа', 
        details: payment.description || payment 
      });
    }

    // Сохраняем ID платежа в заказе
    db.run('UPDATE orders SET yookassa_payment_id = ? WHERE id = ?', [payment.id, order_id]);

    res.json({ 
      payment_url: payment.confirmation.confirmation_url,
      payment_id: payment.id
    });
  } catch (e) {
    console.error('Ошибка создания платежа:', e);
    res.status(500).json({ error: 'Ошибка создания платежа', details: e.message });
  }
});

// Webhook от ЮKassa
router.post('/webhook', express.json(), async (req, res) => {
  const event = req.body;

  console.log('Webhook от ЮKassa:', event.event);

  if (event.event === 'payment.succeeded') {
    const paymentId = event.object.id;
    const order = db.get('SELECT * FROM orders WHERE yookassa_payment_id = ?', [paymentId]);

    if (order) {
      db.run('UPDATE orders SET status = ? WHERE id = ?', ['paid', order.id]);
      console.log(`✅ Заказ #${order.id} оплачен`);
    } else {
      console.log('⚠️ Заказ не найден для платежа:', paymentId);
    }
  }

  res.json({ success: true });
});

// Проверка статуса платежа (для отладки)
router.get('/check/:paymentId', async (req, res) => {
  try {
    const response = await fetch(`${YOOKASSA_BASE_URL}/payments/${req.params.paymentId}`, {
      headers: {
        'Authorization': getAuthHeader()
      }
    });

    const payment = await response.json();
    res.json(payment);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;