// Загрузка товаров с сервера
async function loadProducts() {
  try {
    const res = await fetch('/api/products');
    const products = await res.json();
    renderProducts(products);
  } catch (err) {
    console.error('Ошибка загрузки товаров:', err);
  }
}

function renderProducts(products) {
  const grid = document.getElementById('productsGrid');
  if (!grid) return;

  grid.innerHTML = products.map(p => `
    <div class="product-card-new" data-category="${p.category}">
      <a href="product.html?id=${p.id}" style="text-decoration: none; color: inherit;">
        <div class="product-image-new">
          ${p.badge ? `<div class="product-badge">${p.badge}</div>` : ''}
          ${p.image ? `<img src="${p.image}" alt="${p.name}">` : '📦'}
        </div>
        <div class="product-info-new">
          <div class="product-category-new">${getCategoryName(p.category)}</div>
          <div class="product-name-new">${p.name}</div>
          <div class="product-specs">${truncateText(p.description, 80)}</div>
          <div class="product-footer-new">
            <div class="product-price-new">${p.price.toLocaleString('ru')} ₽</div>
            <span class="btn-more">Подробнее →</span>
          </div>
        </div>
      </a>
      <button class="btn-add-cart" onclick="event.stopPropagation(); addToCart(${p.id}, '${p.name}', ${p.price}, '${p.image || ''}')">В корзину</button>
    </div>
  `).join('');
}

function truncateText(text, maxLength) {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

function getCategoryName(cat) {
  const names = {
    engine: 'Для двигателя',
    fuel: 'Для топлива',
    trans: 'Для трансмиссии',
    oil: 'Масла',
    care: 'Автохимия',
    other: 'Прочее'
  };
  return names[cat] || cat;
}

// Корзина
let cart = JSON.parse(localStorage.getItem('suprotec_cart') || '[]');

function addToCart(id, name, price, image) {
  const existing = cart.find(i => i.id === id);
  if (existing) {
    existing.qty++;
  } else {
    cart.push({ id, name, price, image, qty: 1 });
  }
  saveCart();
  updateCartUI();
  flashCart();
}

function changeQty(id, delta) {
  const item = cart.find(i => i.id === id);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) {
    cart = cart.filter(i => i.id !== id);
  }
  saveCart();
  updateCartUI();
  renderCartItems();
}

function removeFromCart(id) {
  cart = cart.filter(i => i.id !== id);
  saveCart();
  updateCartUI();
  renderCartItems();
}

function saveCart() {
  localStorage.setItem('suprotec_cart', JSON.stringify(cart));
}

function updateCartUI() {
  const count = cart.reduce((s, i) => s + i.qty, 0);
  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);

  const countEl = document.getElementById('cartCount');
  const sumEl = document.getElementById('cartSum');

  if (countEl) countEl.textContent = count;
  if (sumEl) sumEl.textContent = total.toLocaleString('ru') + ' ₽';
}

function flashCart() {
  const btn = document.querySelector('.cart-btn-large');
  if (!btn) return;
  btn.style.transform = 'scale(1.05)';
  setTimeout(() => btn.style.transform = '', 200);
}

function renderCartItems() {
  const container = document.getElementById('cartItems');
  const totalEl = document.getElementById('cartTotal');
  if (!container) return;

  if (cart.length === 0) {
    container.innerHTML = '<div class="cart-empty">Корзина пуста</div>';
    totalEl.textContent = '0 ₽';
    return;
  }

  container.innerHTML = cart.map(i => `
    <div class="cart-item-new">
      <div class="cart-item-img">
        ${i.image ? `<img src="${i.image}" alt="${i.name}">` : '📦'}
      </div>
      <div class="cart-item-details">
        <div class="cart-item-name">${i.name}</div>
        <div class="cart-item-price">${i.price.toLocaleString('ru')} ₽</div>
        <div class="cart-item-controls">
          <button class="qty-btn" onclick="changeQty(${i.id}, -1)">−</button>
          <span>${i.qty} шт.</span>
          <button class="qty-btn" onclick="changeQty(${i.id}, 1)">+</button>
          <button class="remove-btn" onclick="removeFromCart(${i.id})">🗑</button>
        </div>
      </div>
    </div>
  `).join('');

  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
  totalEl.textContent = total.toLocaleString('ru') + ' ₽';
}

// Фильтры
document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const filter = btn.dataset.filter;
    const cards = document.querySelectorAll('.product-card-new');
    cards.forEach(card => {
      if (filter === 'all' || card.dataset.category === filter) {
        card.style.display = 'flex';
      } else {
        card.style.display = 'none';
      }
    });
  });
});

// Модалка корзины
const cartBtn = document.getElementById('cartBtn');
const cartModal = document.getElementById('cartModal');
const closeCart = document.getElementById('closeCart');
const checkoutBtn = document.getElementById('checkoutBtn');

if (cartBtn) {
  cartBtn.addEventListener('click', () => {
    renderCartItems();
    cartModal.classList.add('active');
  });
}
if (closeCart) closeCart.addEventListener('click', () => cartModal.classList.remove('active'));
if (cartModal) cartModal.addEventListener('click', e => {
  if (e.target === cartModal) cartModal.classList.remove('active');
});
if (checkoutBtn) checkoutBtn.addEventListener('click', () => {
  if (cart.length === 0) {
    alert('Корзина пуста');
    return;
  }
  window.location.href = 'checkout.html';
});

// Поиск
const searchInput = document.getElementById('searchInput');
if (searchInput) {
  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    const cards = document.querySelectorAll('.product-card-new');
    cards.forEach(card => {
      const name = card.querySelector('.product-name-new').textContent.toLowerCase();
      card.style.display = name.includes(query) ? 'flex' : 'none';
    });
  });
}

// Проверка авторизации
function checkAuth() {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const userAction = document.getElementById('userAction');

  if (token && userAction) {
    userAction.innerHTML = `
      <div class="action-icon">👤</div>
      <div class="action-text">
        <div class="action-label">${user.name || 'Кабинет'}</div>
        <div class="action-sub">${user.email}</div>
      </div>
    `;
    userAction.href = user.role === 'admin' ? 'admin.html' : 'account.html';
  }
}

// Мобильное меню
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const mainNav = document.getElementById('mainNav');
const mobileNavClose = document.getElementById('mobileNavClose');
const navOverlay = document.getElementById('navOverlay');

if (mobileMenuBtn && mainNav) {
  mobileMenuBtn.addEventListener('click', () => {
    mainNav.classList.add('active');
    navOverlay.classList.add('active');
    mobileNavClose.style.display = 'block';
    document.body.style.overflow = 'hidden';
  });

  mobileNavClose.addEventListener('click', closeMobileMenu);
  navOverlay.addEventListener('click', closeMobileMenu);

  // Закрытие при клике на ссылку
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
      if (window.innerWidth <= 968) {
        closeMobileMenu();
      }
    });
  });

  function closeMobileMenu() {
    mainNav.classList.remove('active');
    navOverlay.classList.remove('active');
    document.body.style.overflow = '';
  }
}

// Показать/скрыть кнопку бургера в зависимости от ширины экрана
function checkMobileMenu() {
  if (window.innerWidth <= 968) {
    mobileMenuBtn.style.display = 'flex';
  } else {
    mobileMenuBtn.style.display = 'none';
    mainNav.classList.remove('active');
    navOverlay.classList.remove('active');
    document.body.style.overflow = '';
  }
}

window.addEventListener('resize', checkMobileMenu);
checkMobileMenu();

// Оптимизация для iOS safe area
if ('ontouchstart' in window) {
  document.documentElement.style.setProperty('--sat', 'env(safe-area-inset-top)');
  document.documentElement.style.setProperty('--sab', 'env(safe-area-inset-bottom)');
}

// Ленивая загрузка изображений (если добавим фото товаров)
if ('IntersectionObserver' in window) {
  const imageObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        if (img.dataset.src) {
          img.src = img.dataset.src;
          img.removeAttribute('data-src');
          imageObserver.unobserve(img);
        }
      }
    });
  });

  document.querySelectorAll('img[data-src]').forEach(img => {
    imageObserver.observe(img);
  });
}

// Оптимизация scroll performance
let ticking = false;
window.addEventListener('scroll', () => {
  if (!ticking) {
    window.requestAnimationFrame(() => {
      ticking = false;
    });
    ticking = true;
  }
});

// Инициализация
loadProducts();
updateCartUI();
checkAuth();