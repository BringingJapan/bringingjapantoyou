(() => {
  const menuButton = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.site-nav');
  if (menuButton && nav) {
    menuButton.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      menuButton.setAttribute('aria-expanded', String(open));
    });
  }

  const key = 'bj2u-cart';
  const readCart = () => {
    try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
  };
  const writeCart = (cart) => localStorage.setItem(key, JSON.stringify(cart));

  const drawer = document.querySelector('[data-cart-drawer]');
  const backdrop = document.querySelector('[data-cart-backdrop]');
  const itemsEl = document.querySelector('[data-cart-items]');
  const totalEl = document.querySelector('[data-cart-total]');

  const openCart = () => {
    if (!drawer) return;
    drawer.classList.add('open');
    drawer.setAttribute('aria-hidden', 'false');
    backdrop?.classList.add('open');
  };
  const closeCart = () => {
    drawer?.classList.remove('open');
    drawer?.setAttribute('aria-hidden', 'true');
    backdrop?.classList.remove('open');
  };

  const renderCart = () => {
    const cart = readCart();
    document.querySelectorAll('[data-cart-count]').forEach(el => el.textContent = String(cart.length));
    if (!itemsEl || !totalEl) return;
    if (!cart.length) {
      itemsEl.innerHTML = '<p class="empty-cart">Your bag is empty.</p>';
      totalEl.textContent = '$0.00';
      return;
    }
    itemsEl.innerHTML = cart.map((item, index) =>
      '<div class="cart-line"><div><strong>' + item.name + '</strong><span>$' + Number(item.price).toFixed(2) + '</span></div><button type="button" data-remove-index="' + index + '">Remove</button></div>'
    ).join('');
    totalEl.textContent = '$' + cart.reduce((sum, item) => sum + Number(item.price), 0).toFixed(2);
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
      cart.push({ name: button.dataset.name, price: Number(button.dataset.price) });
      writeCart(cart);
      renderCart();
      openCart();
    });
  });
  document.querySelectorAll('[data-cart-open]').forEach(button => button.addEventListener('click', openCart));
  document.querySelectorAll('[data-cart-close]').forEach(button => button.addEventListener('click', closeCart));
  backdrop?.addEventListener('click', closeCart);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeCart(); });
  renderCart();

  const cards = [...document.querySelectorAll('[data-product-card]')];
  const search = document.querySelector('[data-product-search]');
  const filters = [...document.querySelectorAll('[data-filter]')];
  const resultCount = document.querySelector('[data-result-count]');
  const noResults = document.querySelector('[data-no-results]');
  let activeFilter = new URLSearchParams(location.search).get('category') || 'all';

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
})();