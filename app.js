(() => {
  const menuButton = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.site-nav');
  if (menuButton && nav) {
    menuButton.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      menuButton.setAttribute('aria-expanded', String(open));
    });
  }

  const header = document.querySelector('.site-header');
  const updateHeader = () => header?.classList.toggle('is-scrolled', window.scrollY > 10);
  updateHeader();
  window.addEventListener('scroll', updateHeader, { passive: true });

  const key = 'bj2u-cart';
  const normalizeCart = (items) => {
    const map = new Map();
    (Array.isArray(items) ? items : []).forEach(item => {
      if (!item || !item.name) return;
      const price = Number(item.price) || 0;
      const qty = Math.max(1, Number(item.qty) || 1);
      const id = item.name + '|' + price;
      const existing = map.get(id);
      if (existing) existing.qty += qty;
      else map.set(id, { name: String(item.name), price, qty });
    });
    return [...map.values()];
  };
  const readCart = () => {
    try { return normalizeCart(JSON.parse(localStorage.getItem(key) || '[]')); }
    catch { return []; }
  };
  const writeCart = cart => localStorage.setItem(key, JSON.stringify(normalizeCart(cart)));

  const drawer = document.querySelector('[data-cart-drawer]');
  const backdrop = document.querySelector('[data-cart-backdrop]');
  const itemsEl = document.querySelector('[data-cart-items]');
  const totalEl = document.querySelector('[data-cart-total]');

  const openCart = () => {
    if (!drawer) return;
    drawer.classList.add('open');
    drawer.setAttribute('aria-hidden', 'false');
    backdrop?.classList.add('open');
    document.body.style.overflow = 'hidden';
  };
  const closeCart = () => {
    drawer?.classList.remove('open');
    drawer?.setAttribute('aria-hidden', 'true');
    backdrop?.classList.remove('open');
    document.body.style.overflow = '';
  };

  const renderCart = () => {
    const cart = readCart();
    const itemCount = cart.reduce((sum, item) => sum + item.qty, 0);
    document.querySelectorAll('[data-cart-count]').forEach(el => el.textContent = String(itemCount));
    if (!itemsEl || !totalEl) return;

    if (!cart.length) {
      itemsEl.innerHTML = '<p class="empty-cart">Your bag is empty.</p>';
      totalEl.textContent = '$0.00';
      return;
    }

    itemsEl.innerHTML = cart.map((item, index) =>
      '<div class="cart-line">' +
        '<div class="cart-line-main"><strong>' + item.name + '</strong><span class="cart-item-price">$' + item.price.toFixed(2) + ' each</span></div>' +
        '<div class="cart-line-actions">' +
          '<div class="qty-control" aria-label="Quantity controls">' +
            '<button type="button" aria-label="Decrease quantity" data-qty-index="' + index + '" data-delta="-1">−</button>' +
            '<span>' + item.qty + '</span>' +
            '<button type="button" aria-label="Increase quantity" data-qty-index="' + index + '" data-delta="1">+</button>' +
          '</div>' +
          '<button class="cart-remove" type="button" data-remove-index="' + index + '">Remove</button>' +
        '</div>' +
      '</div>'
    ).join('');

    totalEl.textContent = '$' + cart.reduce((sum, item) => sum + (item.price * item.qty), 0).toFixed(2);

    itemsEl.querySelectorAll('[data-qty-index]').forEach(btn => {
      btn.addEventListener('click', () => {
        const next = readCart();
        const index = Number(btn.dataset.qtyIndex);
        const delta = Number(btn.dataset.delta);
        if (!next[index]) return;
        next[index].qty += delta;
        if (next[index].qty <= 0) next.splice(index, 1);
        writeCart(next);
        renderCart();
      });
    });

    itemsEl.querySelectorAll('[data-remove-index]').forEach(btn => {
      btn.addEventListener('click', () => {
        const next = readCart();
        next.splice(Number(btn.dataset.removeIndex), 1);
        writeCart(next);
        renderCart();
      });
    });
  };

  document.querySelectorAll('[data-add-cart]').forEach(button => {
    button.addEventListener('click', () => {
      const cart = readCart();
      const name = String(button.dataset.name || '');
      const price = Number(button.dataset.price) || 0;
      const match = cart.find(item => item.name === name && item.price === price);
      if (match) match.qty += 1;
      else cart.push({ name, price, qty: 1 });
      writeCart(cart);
      renderCart();
      openCart();
    });
  });

  document.querySelectorAll('[data-cart-open]').forEach(button => button.addEventListener('click', openCart));
  document.querySelectorAll('[data-cart-close]').forEach(button => button.addEventListener('click', closeCart));
  backdrop?.addEventListener('click', closeCart);
  document.addEventListener('keydown', event => { if (event.key === 'Escape') closeCart(); });
  renderCart();

  const cards = [...document.querySelectorAll('[data-product-card]')];
  const search = document.querySelector('[data-product-search]');
  const filters = [...document.querySelectorAll('[data-filter]')];
  const resultCount = document.querySelector('[data-result-count]');
  const noResults = document.querySelector('[data-no-results]');
  let activeFilter = new URLSearchParams(location.search).get('category') || 'all';

  const validFilters = new Set(['all', ...filters.map(btn => btn.dataset.filter)]);
  if (!validFilters.has(activeFilter)) activeFilter = 'all';

  const applyFilters = () => {
    const query = (search?.value || '').trim().toLowerCase();
    let visible = 0;
    cards.forEach(card => {
      const categories = (card.dataset.category || '').split(' ');
      const searchable = (card.dataset.search || '').toLowerCase();
      const matchesFilter = activeFilter === 'all' || categories.includes(activeFilter);
      const matchesSearch = !query || searchable.includes(query);
      const show = matchesFilter && matchesSearch;
      card.hidden = !show;
      if (show) visible++;
    });
    if (resultCount) resultCount.textContent = visible + (visible === 1 ? ' product' : ' products');
    if (noResults) noResults.hidden = visible !== 0;
    filters.forEach(btn => btn.classList.toggle('active', btn.dataset.filter === activeFilter));
  };

  filters.forEach(btn => btn.addEventListener('click', () => {
    activeFilter = btn.dataset.filter;
    history.replaceState({}, '', activeFilter === 'all' ? 'shop.html' : 'shop.html?category=' + encodeURIComponent(activeFilter));
    applyFilters();
  }));
  search?.addEventListener('input', applyFilters);
  if (cards.length) applyFilters();

  const requestForm = document.querySelector('[data-request-form]');
  if (requestForm) {
    const requestParam = new URLSearchParams(location.search).get('request');
    const productInput = requestForm.elements.product;
    if (requestParam && productInput) productInput.value = requestParam;

    requestForm.addEventListener('submit', event => {
      event.preventDefault();
      const form = new FormData(requestForm);
      const product = String(form.get('product') || '').trim();
      if (!product) return;
      const lines = [
        'Hi Bringing Japan 2 U,',
        '',
        'I would like to request a Japan find:',
        '',
        'Product: ' + product,
        'Series / brand: ' + String(form.get('series') || ''),
        'Budget: ' + String(form.get('budget') || ''),
        'Country: ' + String(form.get('country') || ''),
        'Name: ' + String(form.get('name') || ''),
        '',
        'Details:',
        String(form.get('details') || ''),
        '',
        'I understand this is a sourcing request, not a confirmed order.'
      ];
      const subject = 'Japan Find Request — ' + product;
      const href = 'mailto:bringingjapantoyou@gmail.com?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(lines.join('\n'));
      const status = document.querySelector('[data-form-status]');
      if (status) status.textContent = 'Opening your email app with the request filled in…';
      location.href = href;
    });
  }

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduceMotion && 'IntersectionObserver' in window) {
    const revealTargets = [...document.querySelectorAll('main > section, .product-card, .values-grid > div')];
    revealTargets.forEach(el => el.classList.add('reveal-ready'));
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -20px 0px' });
    revealTargets.forEach(el => observer.observe(el));
  }
})();