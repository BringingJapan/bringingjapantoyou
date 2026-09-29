(() => {
  const root = document.documentElement;
  const themeKey = 'bj2u-theme';
  const cartKey = 'bj2u-cart';
  const savedKey = 'bj2u-saved';
  const retiredNames = new Set(['Collector Mystery Box', 'Japanese Ceramic Cup']);
  const retiredSavedIds = new Set(['mystery', 'ceramic']);

  const safeParse = (key, fallback = []) => {
    try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }
    catch { return fallback; }
  };

  const toastStack = document.createElement('div');
  toastStack.className = 'toast-stack';
  document.body.appendChild(toastStack);
  const toast = message => {
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = message;
    toastStack.appendChild(el);
    setTimeout(() => el.remove(), 2600);
  };

  const setTheme = theme => {
    if (theme === 'night') root.dataset.theme = 'night';
    else delete root.dataset.theme;
    localStorage.setItem(themeKey, theme);
    document.querySelectorAll('[data-theme-toggle]').forEach(btn => {
      btn.setAttribute('aria-label', theme === 'night' ? 'Switch to day mode' : 'Switch to night mode');
      if (btn.classList.contains('utility-button')) btn.innerHTML = theme === 'night' ? '☀ <span>Day</span>' : '◐ <span>Night</span>';
    });
  };
  setTheme(localStorage.getItem(themeKey) || 'day');

  const menuButton = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.site-nav');
  if (menuButton && nav) {
    const utilities = document.createElement('div');
    utilities.className = 'nav-utilities';
    utilities.innerHTML = '<button class="utility-button" type="button" data-theme-toggle></button><button class="utility-button" type="button" data-saved-open>♡ <span>Saved</span> <b class="count" data-saved-count>0</b></button>';
    const cartButton = nav.querySelector('[data-cart-open]');
    nav.insertBefore(utilities, cartButton || null);
    menuButton.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      menuButton.setAttribute('aria-expanded', String(open));
    });
  }

  document.addEventListener('click', event => {
    const themeButton = event.target.closest('[data-theme-toggle]');
    if (themeButton) {
      const next = root.dataset.theme === 'night' ? 'day' : 'night';
      setTheme(next);
      toast(next === 'night' ? 'Tokyo night mode on.' : 'Day mode on.');
    }
  });
  setTheme(localStorage.getItem(themeKey) || 'day');

  const header = document.querySelector('.site-header');
  const updateHeader = () => header?.classList.toggle('is-scrolled', window.scrollY > 10);
  updateHeader();
  window.addEventListener('scroll', updateHeader, { passive: true });

  const normalizePrice = value => {
    if (value === null || value === undefined || value === '') return null;
    const price = Number(value);
    return Number.isFinite(price) ? price : null;
  };

  const normalizeCart = items => {
    const map = new Map();
    (Array.isArray(items) ? items : []).forEach(item => {
      if (!item || !item.name || retiredNames.has(String(item.name))) return;
      const name = String(item.name);
      const qty = Math.max(1, Number(item.qty) || 1);
      const price = normalizePrice(item.price);
      const existing = map.get(name);
      if (existing) {
        existing.qty += qty;
        if (price !== null) existing.price = price;
      } else map.set(name, { name, qty, price });
    });
    return [...map.values()];
  };
  const readCart = () => normalizeCart(safeParse(cartKey));
  const writeCart = cart => localStorage.setItem(cartKey, JSON.stringify(normalizeCart(cart)));

  const drawer = document.querySelector('[data-cart-drawer]');
  const backdrop = document.querySelector('[data-cart-backdrop]');
  const itemsEl = document.querySelector('[data-cart-items]');
  const totalEl = document.querySelector('[data-cart-total]');
  const inquiryButton = document.querySelector('[data-cart-inquiry]');

  const openOverlay = element => {
    if (!element) return;
    element.classList.add('open');
    element.setAttribute('aria-hidden', 'false');
    backdrop?.classList.add('open');
    document.body.style.overflow = 'hidden';
  };
  const closeOverlays = () => {
    drawer?.classList.remove('open');
    drawer?.setAttribute('aria-hidden', 'true');
    document.querySelector('.saved-drawer')?.classList.remove('open');
    backdrop?.classList.remove('open');
    document.body.style.overflow = '';
  };

  const renderCart = () => {
    const cart = readCart();
    writeCart(cart);
    const itemCount = cart.reduce((sum, item) => sum + item.qty, 0);
    document.querySelectorAll('[data-cart-count]').forEach(el => el.textContent = String(itemCount));
    if (!itemsEl) return;

    if (!cart.length) {
      itemsEl.innerHTML = '<div class="empty-cart"><strong>No items on your inquiry list.</strong><p>Add confirmed inventory here if you want to ask about launch availability.</p></div>';
      if (totalEl) totalEl.textContent = 'Pricing pending';
      if (inquiryButton) inquiryButton.disabled = true;
      return;
    }

    itemsEl.innerHTML = cart.map((item, index) =>
      '<div class="cart-line">' +
        '<div class="cart-line-main"><strong>' + item.name + '</strong><span class="cart-item-price">' + (item.price !== null ? "$" + item.price.toFixed(2) + ' each' : 'Price pending') + '</span></div>' +
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

    const pricedSubtotal = cart.reduce((sum,item) => sum + (item.price !== null ? item.price * item.qty : 0), 0);
    const hasPending = cart.some(item => item.price === null);
    if (totalEl) totalEl.textContent = hasPending
      ? (pricedSubtotal > 0 ? '

    itemsEl.querySelectorAll('[data-qty-index]').forEach(btn => btn.addEventListener('click', () => {
      const next = readCart();
      const index = Number(btn.dataset.qtyIndex);
      const delta = Number(btn.dataset.delta);
      if (!next[index]) return;
      next[index].qty += delta;
      if (next[index].qty <= 0) next.splice(index, 1);
      writeCart(next);
      renderCart();
    }));

    itemsEl.querySelectorAll('[data-remove-index]').forEach(btn => btn.addEventListener('click', () => {
      const next = readCart();
      next.splice(Number(btn.dataset.removeIndex), 1);
      writeCart(next);
      renderCart();
    }));
  };

  document.querySelectorAll('[data-add-cart]').forEach(button => button.addEventListener('click', () => {
    const cart = readCart();
    const name = String(button.dataset.name || '');
    if (!name) return;
    const price = normalizePrice(button.dataset.price);
    const match = cart.find(item => item.name === name);
    if (match) {
      match.qty += 1;
      if (price !== null) match.price = price;
    } else cart.push({ name, qty: 1, price });
    writeCart(cart);
    renderCart();
    openOverlay(drawer);
    toast('Added to your availability inquiry.');
  }));

  document.querySelectorAll('[data-cart-open]').forEach(button => button.addEventListener('click', () => openOverlay(drawer)));
  document.querySelectorAll('[data-cart-close]').forEach(button => button.addEventListener('click', closeOverlays));
  backdrop?.addEventListener('click', closeOverlays);
  document.addEventListener('keydown', event => { if (event.key === 'Escape') closeOverlays(); });

  inquiryButton?.addEventListener('click', () => {
    const cart = readCart();
    if (!cart.length) return;
    const lines = ['Hi Bringing Japan 2 U,', '', 'I’m interested in availability for:', ''];
    cart.forEach(item => lines.push('- ' + item.qty + ' × ' + item.name + (item.price !== null ? ' — 
    location.href = 'mailto:bringingjapantoyou@gmail.com?subject=' + encodeURIComponent('Inventory Availability Inquiry') + '&body=' + encodeURIComponent(lines.join('\n'));
  });
  renderCart();

  const savedDrawer = document.createElement('aside');
  savedDrawer.className = 'saved-drawer';
  savedDrawer.setAttribute('aria-hidden', 'true');
  savedDrawer.innerHTML = '<div class="saved-head"><div><small>COLLECTOR SHORTLIST</small><strong>Saved finds</strong></div><button type="button" data-saved-close aria-label="Close saved finds">×</button></div><div class="saved-items" data-saved-items></div><div class="saved-foot">Saved locally in this browser. Pricing will appear only when finalized.</div>';
  document.body.appendChild(savedDrawer);

  const normalizeSaved = items => (Array.isArray(items) ? items : [])
    .filter(item => item && item.id && item.name && !retiredSavedIds.has(String(item.id)))
    .map(item => {
      const id = String(item.id);
      return { id, name:String(item.name), url:item.url || 'shop.html', image:item.image || '', price:id === 'stellar10' ? 5 : normalizePrice(item.price) };
    });
  const readSaved = () => normalizeSaved(safeParse(savedKey));
  const writeSaved = items => localStorage.setItem(savedKey, JSON.stringify(normalizeSaved(items)));

  const renderSaved = () => {
    const saved = readSaved();
    writeSaved(saved);
    document.querySelectorAll('[data-saved-count]').forEach(el => el.textContent = String(saved.length));
    document.querySelectorAll('[data-save-item]').forEach(btn => {
      const isSaved = saved.some(item => item.id === btn.dataset.id);
      btn.classList.toggle('is-saved', isSaved);
      if (btn.classList.contains('save-fab')) btn.textContent = isSaved ? '♥' : '♡';
      else if (btn.classList.contains('large-save')) btn.textContent = isSaved ? '♥ Saved find' : '♡ Save this find';
      else if (btn.classList.contains('dossier-save')) btn.textContent = isSaved ? '♥ Saved find' : '♡ Save find';
      else if (btn.matches('.stock-actions [data-save-item]')) btn.textContent = isSaved ? '♥' : '♡';
      btn.setAttribute('aria-pressed', String(isSaved));
    });

    const container = savedDrawer.querySelector('[data-saved-items]');
    if (!saved.length) {
      container.innerHTML = '<div class="empty-cart"><strong>No saved finds yet.</strong><p>Save confirmed inventory and it will stay here in this browser.</p></div>';
      return;
    }
    container.innerHTML = saved.map(item =>
      '<div class="saved-line">' +
        '<div class="saved-thumb">' + (item.image ? '<img src="' + item.image + '" alt="">' : 'BJ2U') + '</div>' +
        '<div><strong>' + item.name + '</strong><span>' + (item.price !== null ? '
        '<div class="saved-line-actions"><a href="' + item.url + '">View →</a><button type="button" data-remove-saved="' + item.id + '">Remove</button></div>' +
      '</div>'
    ).join('');
    container.querySelectorAll('[data-remove-saved]').forEach(btn => btn.addEventListener('click', () => {
      writeSaved(readSaved().filter(item => item.id !== btn.dataset.removeSaved));
      renderSaved();
    }));
  };

  document.addEventListener('click', event => {
    const saveButton = event.target.closest('[data-save-item]');
    if (saveButton) {
      const saved = readSaved();
      const id = saveButton.dataset.id;
      const existing = saved.findIndex(item => item.id === id);
      if (existing >= 0) {
        saved.splice(existing, 1);
        toast('Removed from saved finds.');
      } else {
        saved.push({ id, name:saveButton.dataset.name || 'Saved find', url:saveButton.dataset.url || 'shop.html', image:saveButton.dataset.image || '', price:normalizePrice(saveButton.dataset.price) });
        toast('Saved to your collector shortlist.');
      }
      writeSaved(saved);
      renderSaved();
    }
    if (event.target.closest('[data-saved-open]')) {
      closeOverlays();
      openOverlay(savedDrawer);
    }
    if (event.target.closest('[data-saved-close]')) closeOverlays();
  });
  renderSaved();

  const cards = [...document.querySelectorAll('[data-product-card]')];
  const grid = document.querySelector('[data-product-grid]');
  const search = document.querySelector('[data-product-search]');
  const filters = [...document.querySelectorAll('[data-filter]')];
  const sort = document.querySelector('[data-sort-products]');
  const resultCount = document.querySelector('[data-result-count]');
  const noResults = document.querySelector('[data-no-results]');
  let activeFilter = new URLSearchParams(location.search).get('category') || 'all';
  const validFilters = new Set(['all', ...filters.map(btn => btn.dataset.filter)]);
  if (!validFilters.has(activeFilter)) activeFilter = 'all';

  const sortCards = () => {
    if (!grid || !sort) return;
    const mode = sort.value;
    const ordered = [...cards].sort((a,b) => mode === 'name'
      ? String(a.dataset.name).localeCompare(String(b.dataset.name))
      : cards.indexOf(a) - cards.indexOf(b));
    ordered.forEach(card => grid.appendChild(card));
  };

  const applyFilters = () => {
    const query = (search?.value || '').trim().toLowerCase();
    let visible = 0;
    cards.forEach(card => {
      const categories = (card.dataset.category || '').split(' ');
      const searchable = (card.dataset.search || '').toLowerCase();
      const show = (activeFilter === 'all' || categories.includes(activeFilter)) && (!query || searchable.includes(query));
      card.hidden = !show;
      if (show) visible++;
    });
    if (resultCount) resultCount.textContent = visible + (visible === 1 ? ' confirmed item' : ' confirmed items');
    if (noResults) noResults.hidden = visible !== 0;
    filters.forEach(btn => btn.classList.toggle('active', btn.dataset.filter === activeFilter));
  };

  filters.forEach(btn => btn.addEventListener('click', () => {
    activeFilter = btn.dataset.filter;
    history.replaceState({}, '', activeFilter === 'all' ? 'shop.html' : 'shop.html?category=' + encodeURIComponent(activeFilter));
    applyFilters();
  }));
  search?.addEventListener('input', applyFilters);
  sort?.addEventListener('change', sortCards);
  document.querySelectorAll('[data-view]').forEach(btn => btn.addEventListener('click', () => {
    document.querySelectorAll('[data-view]').forEach(item => item.classList.toggle('active', item === btn));
    grid?.classList.toggle('list-view', btn.dataset.view === 'list');
  }));
  if (cards.length) { sortCards(); applyFilters(); }

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
      const lines = ['Hi Bringing Japan 2 U,','','I would like to request a Japan find:','','Product: ' + product,'Series / brand: ' + String(form.get('series') || ''),'Budget: ' + String(form.get('budget') || ''),'Country: ' + String(form.get('country') || ''),'Name: ' + String(form.get('name') || ''),'','Details:',String(form.get('details') || ''),'','I understand this is a sourcing request, not a confirmed order.'];
      location.href = 'mailto:bringingjapantoyou@gmail.com?subject=' + encodeURIComponent('Japan Find Request — ' + product) + '&body=' + encodeURIComponent(lines.join('\n'));
    });
  }

  if (!document.querySelector('.mobile-dock')) {
    const dock = document.createElement('nav');
    dock.className = 'mobile-dock';
    dock.setAttribute('aria-label', 'Mobile quick navigation');
    dock.innerHTML = '<a href="index.html"><b>⌂</b><span>Home</span></a><a href="shop.html"><b>⌕</b><span>Inventory</span></a><button type="button" data-saved-open><b>♡</b><span>Saved</span></button><button type="button" data-cart-open><b>?</b><span>Inquiry</span></button>';
    document.body.appendChild(dock);
    dock.querySelector('[data-saved-open]').addEventListener('click', () => { closeOverlays(); openOverlay(savedDrawer); });
    dock.querySelector('[data-cart-open]').addEventListener('click', () => openOverlay(drawer));
  }

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduceMotion && 'IntersectionObserver' in window) {
    const revealTargets = [...document.querySelectorAll('main > section, .radar-card, .product-card, .tool-card, .inventory-slot, .stock-card')];
    revealTargets.forEach(el => el.classList.add('reveal-ready'));
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    }), { threshold:.07, rootMargin:'0px 0px -20px 0px' });
    revealTargets.forEach(el => observer.observe(el));
  }
})(); + item.price.toFixed(2) + ' each' : 'Price pending') + '</span></div>' +
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

    if (totalEl) totalEl.textContent = 'Pricing pending';
    if (inquiryButton) inquiryButton.disabled = false;

    itemsEl.querySelectorAll('[data-qty-index]').forEach(btn => btn.addEventListener('click', () => {
      const next = readCart();
      const index = Number(btn.dataset.qtyIndex);
      const delta = Number(btn.dataset.delta);
      if (!next[index]) return;
      next[index].qty += delta;
      if (next[index].qty <= 0) next.splice(index, 1);
      writeCart(next);
      renderCart();
    }));

    itemsEl.querySelectorAll('[data-remove-index]').forEach(btn => btn.addEventListener('click', () => {
      const next = readCart();
      next.splice(Number(btn.dataset.removeIndex), 1);
      writeCart(next);
      renderCart();
    }));
  };

  document.querySelectorAll('[data-add-cart]').forEach(button => button.addEventListener('click', () => {
    const cart = readCart();
    const name = String(button.dataset.name || '');
    if (!name) return;
    const match = cart.find(item => item.name === name);
    if (match) match.qty += 1;
    else cart.push({ name, qty: 1 });
    writeCart(cart);
    renderCart();
    openOverlay(drawer);
    toast('Added to your availability inquiry.');
  }));

  document.querySelectorAll('[data-cart-open]').forEach(button => button.addEventListener('click', () => openOverlay(drawer)));
  document.querySelectorAll('[data-cart-close]').forEach(button => button.addEventListener('click', closeOverlays));
  backdrop?.addEventListener('click', closeOverlays);
  document.addEventListener('keydown', event => { if (event.key === 'Escape') closeOverlays(); });

  inquiryButton?.addEventListener('click', () => {
    const cart = readCart();
    if (!cart.length) return;
    const lines = ['Hi Bringing Japan 2 U,', '', 'I’m interested in availability for:', ''];
    cart.forEach(item => lines.push('- ' + item.qty + ' × ' + item.name));
    lines.push('', 'I understand pricing and checkout are not live yet. Please let me know when details are available.');
    location.href = 'mailto:bringingjapantoyou@gmail.com?subject=' + encodeURIComponent('Inventory Availability Inquiry') + '&body=' + encodeURIComponent(lines.join('\n'));
  });
  renderCart();

  const savedDrawer = document.createElement('aside');
  savedDrawer.className = 'saved-drawer';
  savedDrawer.setAttribute('aria-hidden', 'true');
  savedDrawer.innerHTML = '<div class="saved-head"><div><small>COLLECTOR SHORTLIST</small><strong>Saved finds</strong></div><button type="button" data-saved-close aria-label="Close saved finds">×</button></div><div class="saved-items" data-saved-items></div><div class="saved-foot">Saved locally in this browser. Pricing will appear only when finalized.</div>';
  document.body.appendChild(savedDrawer);

  const normalizeSaved = items => (Array.isArray(items) ? items : [])
    .filter(item => item && item.id && item.name && !retiredSavedIds.has(String(item.id)))
    .map(item => ({ id:String(item.id), name:String(item.name), url:item.url || 'shop.html', image:item.image || '' }));
  const readSaved = () => normalizeSaved(safeParse(savedKey));
  const writeSaved = items => localStorage.setItem(savedKey, JSON.stringify(normalizeSaved(items)));

  const renderSaved = () => {
    const saved = readSaved();
    writeSaved(saved);
    document.querySelectorAll('[data-saved-count]').forEach(el => el.textContent = String(saved.length));
    document.querySelectorAll('[data-save-item]').forEach(btn => {
      const isSaved = saved.some(item => item.id === btn.dataset.id);
      btn.classList.toggle('is-saved', isSaved);
      if (btn.classList.contains('save-fab')) btn.textContent = isSaved ? '♥' : '♡';
      else if (btn.classList.contains('large-save')) btn.textContent = isSaved ? '♥ Saved find' : '♡ Save this find';
      else if (btn.classList.contains('dossier-save')) btn.textContent = isSaved ? '♥ Saved find' : '♡ Save find';
      btn.setAttribute('aria-pressed', String(isSaved));
    });

    const container = savedDrawer.querySelector('[data-saved-items]');
    if (!saved.length) {
      container.innerHTML = '<div class="empty-cart"><strong>No saved finds yet.</strong><p>Save confirmed inventory and it will stay here in this browser.</p></div>';
      return;
    }
    container.innerHTML = saved.map(item =>
      '<div class="saved-line">' +
        '<div class="saved-thumb">' + (item.image ? '<img src="' + item.image + '" alt="">' : 'BJ2U') + '</div>' +
        '<div><strong>' + item.name + '</strong><span>Price pending</span></div>' +
        '<div class="saved-line-actions"><a href="' + item.url + '">View →</a><button type="button" data-remove-saved="' + item.id + '">Remove</button></div>' +
      '</div>'
    ).join('');
    container.querySelectorAll('[data-remove-saved]').forEach(btn => btn.addEventListener('click', () => {
      writeSaved(readSaved().filter(item => item.id !== btn.dataset.removeSaved));
      renderSaved();
    }));
  };

  document.addEventListener('click', event => {
    const saveButton = event.target.closest('[data-save-item]');
    if (saveButton) {
      const saved = readSaved();
      const id = saveButton.dataset.id;
      const existing = saved.findIndex(item => item.id === id);
      if (existing >= 0) {
        saved.splice(existing, 1);
        toast('Removed from saved finds.');
      } else {
        saved.push({ id, name:saveButton.dataset.name || 'Saved find', url:saveButton.dataset.url || 'shop.html', image:saveButton.dataset.image || '' });
        toast('Saved to your collector shortlist.');
      }
      writeSaved(saved);
      renderSaved();
    }
    if (event.target.closest('[data-saved-open]')) {
      closeOverlays();
      openOverlay(savedDrawer);
    }
    if (event.target.closest('[data-saved-close]')) closeOverlays();
  });
  renderSaved();

  const cards = [...document.querySelectorAll('[data-product-card]')];
  const grid = document.querySelector('[data-product-grid]');
  const search = document.querySelector('[data-product-search]');
  const filters = [...document.querySelectorAll('[data-filter]')];
  const sort = document.querySelector('[data-sort-products]');
  const resultCount = document.querySelector('[data-result-count]');
  const noResults = document.querySelector('[data-no-results]');
  let activeFilter = new URLSearchParams(location.search).get('category') || 'all';
  const validFilters = new Set(['all', ...filters.map(btn => btn.dataset.filter)]);
  if (!validFilters.has(activeFilter)) activeFilter = 'all';

  const sortCards = () => {
    if (!grid || !sort) return;
    const mode = sort.value;
    const ordered = [...cards].sort((a,b) => mode === 'name'
      ? String(a.dataset.name).localeCompare(String(b.dataset.name))
      : cards.indexOf(a) - cards.indexOf(b));
    ordered.forEach(card => grid.appendChild(card));
  };

  const applyFilters = () => {
    const query = (search?.value || '').trim().toLowerCase();
    let visible = 0;
    cards.forEach(card => {
      const categories = (card.dataset.category || '').split(' ');
      const searchable = (card.dataset.search || '').toLowerCase();
      const show = (activeFilter === 'all' || categories.includes(activeFilter)) && (!query || searchable.includes(query));
      card.hidden = !show;
      if (show) visible++;
    });
    if (resultCount) resultCount.textContent = visible + (visible === 1 ? ' confirmed item' : ' confirmed items');
    if (noResults) noResults.hidden = visible !== 0;
    filters.forEach(btn => btn.classList.toggle('active', btn.dataset.filter === activeFilter));
  };

  filters.forEach(btn => btn.addEventListener('click', () => {
    activeFilter = btn.dataset.filter;
    history.replaceState({}, '', activeFilter === 'all' ? 'shop.html' : 'shop.html?category=' + encodeURIComponent(activeFilter));
    applyFilters();
  }));
  search?.addEventListener('input', applyFilters);
  sort?.addEventListener('change', sortCards);
  document.querySelectorAll('[data-view]').forEach(btn => btn.addEventListener('click', () => {
    document.querySelectorAll('[data-view]').forEach(item => item.classList.toggle('active', item === btn));
    grid?.classList.toggle('list-view', btn.dataset.view === 'list');
  }));
  if (cards.length) { sortCards(); applyFilters(); }

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
      const lines = ['Hi Bringing Japan 2 U,','','I would like to request a Japan find:','','Product: ' + product,'Series / brand: ' + String(form.get('series') || ''),'Budget: ' + String(form.get('budget') || ''),'Country: ' + String(form.get('country') || ''),'Name: ' + String(form.get('name') || ''),'','Details:',String(form.get('details') || ''),'','I understand this is a sourcing request, not a confirmed order.'];
      location.href = 'mailto:bringingjapantoyou@gmail.com?subject=' + encodeURIComponent('Japan Find Request — ' + product) + '&body=' + encodeURIComponent(lines.join('\n'));
    });
  }

  if (!document.querySelector('.mobile-dock')) {
    const dock = document.createElement('nav');
    dock.className = 'mobile-dock';
    dock.setAttribute('aria-label', 'Mobile quick navigation');
    dock.innerHTML = '<a href="index.html"><b>⌂</b><span>Home</span></a><a href="shop.html"><b>⌕</b><span>Inventory</span></a><button type="button" data-saved-open><b>♡</b><span>Saved</span></button><button type="button" data-cart-open><b>?</b><span>Inquiry</span></button>';
    document.body.appendChild(dock);
    dock.querySelector('[data-saved-open]').addEventListener('click', () => { closeOverlays(); openOverlay(savedDrawer); });
    dock.querySelector('[data-cart-open]').addEventListener('click', () => openOverlay(drawer));
  }

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduceMotion && 'IntersectionObserver' in window) {
    const revealTargets = [...document.querySelectorAll('main > section, .radar-card, .product-card, .tool-card, .inventory-slot')];
    revealTargets.forEach(el => el.classList.add('reveal-ready'));
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    }), { threshold:.07, rootMargin:'0px 0px -20px 0px' });
    revealTargets.forEach(el => observer.observe(el));
  }
})(); + pricedSubtotal.toFixed(2) + ' + pending' : 'Pricing pending')
      : '

    itemsEl.querySelectorAll('[data-qty-index]').forEach(btn => btn.addEventListener('click', () => {
      const next = readCart();
      const index = Number(btn.dataset.qtyIndex);
      const delta = Number(btn.dataset.delta);
      if (!next[index]) return;
      next[index].qty += delta;
      if (next[index].qty <= 0) next.splice(index, 1);
      writeCart(next);
      renderCart();
    }));

    itemsEl.querySelectorAll('[data-remove-index]').forEach(btn => btn.addEventListener('click', () => {
      const next = readCart();
      next.splice(Number(btn.dataset.removeIndex), 1);
      writeCart(next);
      renderCart();
    }));
  };

  document.querySelectorAll('[data-add-cart]').forEach(button => button.addEventListener('click', () => {
    const cart = readCart();
    const name = String(button.dataset.name || '');
    if (!name) return;
    const match = cart.find(item => item.name === name);
    if (match) match.qty += 1;
    else cart.push({ name, qty: 1 });
    writeCart(cart);
    renderCart();
    openOverlay(drawer);
    toast('Added to your availability inquiry.');
  }));

  document.querySelectorAll('[data-cart-open]').forEach(button => button.addEventListener('click', () => openOverlay(drawer)));
  document.querySelectorAll('[data-cart-close]').forEach(button => button.addEventListener('click', closeOverlays));
  backdrop?.addEventListener('click', closeOverlays);
  document.addEventListener('keydown', event => { if (event.key === 'Escape') closeOverlays(); });

  inquiryButton?.addEventListener('click', () => {
    const cart = readCart();
    if (!cart.length) return;
    const lines = ['Hi Bringing Japan 2 U,', '', 'I’m interested in availability for:', ''];
    cart.forEach(item => lines.push('- ' + item.qty + ' × ' + item.name));
    lines.push('', 'I understand pricing and checkout are not live yet. Please let me know when details are available.');
    location.href = 'mailto:bringingjapantoyou@gmail.com?subject=' + encodeURIComponent('Inventory Availability Inquiry') + '&body=' + encodeURIComponent(lines.join('\n'));
  });
  renderCart();

  const savedDrawer = document.createElement('aside');
  savedDrawer.className = 'saved-drawer';
  savedDrawer.setAttribute('aria-hidden', 'true');
  savedDrawer.innerHTML = '<div class="saved-head"><div><small>COLLECTOR SHORTLIST</small><strong>Saved finds</strong></div><button type="button" data-saved-close aria-label="Close saved finds">×</button></div><div class="saved-items" data-saved-items></div><div class="saved-foot">Saved locally in this browser. Pricing will appear only when finalized.</div>';
  document.body.appendChild(savedDrawer);

  const normalizeSaved = items => (Array.isArray(items) ? items : [])
    .filter(item => item && item.id && item.name && !retiredSavedIds.has(String(item.id)))
    .map(item => ({ id:String(item.id), name:String(item.name), url:item.url || 'shop.html', image:item.image || '' }));
  const readSaved = () => normalizeSaved(safeParse(savedKey));
  const writeSaved = items => localStorage.setItem(savedKey, JSON.stringify(normalizeSaved(items)));

  const renderSaved = () => {
    const saved = readSaved();
    writeSaved(saved);
    document.querySelectorAll('[data-saved-count]').forEach(el => el.textContent = String(saved.length));
    document.querySelectorAll('[data-save-item]').forEach(btn => {
      const isSaved = saved.some(item => item.id === btn.dataset.id);
      btn.classList.toggle('is-saved', isSaved);
      if (btn.classList.contains('save-fab')) btn.textContent = isSaved ? '♥' : '♡';
      else if (btn.classList.contains('large-save')) btn.textContent = isSaved ? '♥ Saved find' : '♡ Save this find';
      else if (btn.classList.contains('dossier-save')) btn.textContent = isSaved ? '♥ Saved find' : '♡ Save find';
      btn.setAttribute('aria-pressed', String(isSaved));
    });

    const container = savedDrawer.querySelector('[data-saved-items]');
    if (!saved.length) {
      container.innerHTML = '<div class="empty-cart"><strong>No saved finds yet.</strong><p>Save confirmed inventory and it will stay here in this browser.</p></div>';
      return;
    }
    container.innerHTML = saved.map(item =>
      '<div class="saved-line">' +
        '<div class="saved-thumb">' + (item.image ? '<img src="' + item.image + '" alt="">' : 'BJ2U') + '</div>' +
        '<div><strong>' + item.name + '</strong><span>Price pending</span></div>' +
        '<div class="saved-line-actions"><a href="' + item.url + '">View →</a><button type="button" data-remove-saved="' + item.id + '">Remove</button></div>' +
      '</div>'
    ).join('');
    container.querySelectorAll('[data-remove-saved]').forEach(btn => btn.addEventListener('click', () => {
      writeSaved(readSaved().filter(item => item.id !== btn.dataset.removeSaved));
      renderSaved();
    }));
  };

  document.addEventListener('click', event => {
    const saveButton = event.target.closest('[data-save-item]');
    if (saveButton) {
      const saved = readSaved();
      const id = saveButton.dataset.id;
      const existing = saved.findIndex(item => item.id === id);
      if (existing >= 0) {
        saved.splice(existing, 1);
        toast('Removed from saved finds.');
      } else {
        saved.push({ id, name:saveButton.dataset.name || 'Saved find', url:saveButton.dataset.url || 'shop.html', image:saveButton.dataset.image || '' });
        toast('Saved to your collector shortlist.');
      }
      writeSaved(saved);
      renderSaved();
    }
    if (event.target.closest('[data-saved-open]')) {
      closeOverlays();
      openOverlay(savedDrawer);
    }
    if (event.target.closest('[data-saved-close]')) closeOverlays();
  });
  renderSaved();

  const cards = [...document.querySelectorAll('[data-product-card]')];
  const grid = document.querySelector('[data-product-grid]');
  const search = document.querySelector('[data-product-search]');
  const filters = [...document.querySelectorAll('[data-filter]')];
  const sort = document.querySelector('[data-sort-products]');
  const resultCount = document.querySelector('[data-result-count]');
  const noResults = document.querySelector('[data-no-results]');
  let activeFilter = new URLSearchParams(location.search).get('category') || 'all';
  const validFilters = new Set(['all', ...filters.map(btn => btn.dataset.filter)]);
  if (!validFilters.has(activeFilter)) activeFilter = 'all';

  const sortCards = () => {
    if (!grid || !sort) return;
    const mode = sort.value;
    const ordered = [...cards].sort((a,b) => mode === 'name'
      ? String(a.dataset.name).localeCompare(String(b.dataset.name))
      : cards.indexOf(a) - cards.indexOf(b));
    ordered.forEach(card => grid.appendChild(card));
  };

  const applyFilters = () => {
    const query = (search?.value || '').trim().toLowerCase();
    let visible = 0;
    cards.forEach(card => {
      const categories = (card.dataset.category || '').split(' ');
      const searchable = (card.dataset.search || '').toLowerCase();
      const show = (activeFilter === 'all' || categories.includes(activeFilter)) && (!query || searchable.includes(query));
      card.hidden = !show;
      if (show) visible++;
    });
    if (resultCount) resultCount.textContent = visible + (visible === 1 ? ' confirmed item' : ' confirmed items');
    if (noResults) noResults.hidden = visible !== 0;
    filters.forEach(btn => btn.classList.toggle('active', btn.dataset.filter === activeFilter));
  };

  filters.forEach(btn => btn.addEventListener('click', () => {
    activeFilter = btn.dataset.filter;
    history.replaceState({}, '', activeFilter === 'all' ? 'shop.html' : 'shop.html?category=' + encodeURIComponent(activeFilter));
    applyFilters();
  }));
  search?.addEventListener('input', applyFilters);
  sort?.addEventListener('change', sortCards);
  document.querySelectorAll('[data-view]').forEach(btn => btn.addEventListener('click', () => {
    document.querySelectorAll('[data-view]').forEach(item => item.classList.toggle('active', item === btn));
    grid?.classList.toggle('list-view', btn.dataset.view === 'list');
  }));
  if (cards.length) { sortCards(); applyFilters(); }

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
      const lines = ['Hi Bringing Japan 2 U,','','I would like to request a Japan find:','','Product: ' + product,'Series / brand: ' + String(form.get('series') || ''),'Budget: ' + String(form.get('budget') || ''),'Country: ' + String(form.get('country') || ''),'Name: ' + String(form.get('name') || ''),'','Details:',String(form.get('details') || ''),'','I understand this is a sourcing request, not a confirmed order.'];
      location.href = 'mailto:bringingjapantoyou@gmail.com?subject=' + encodeURIComponent('Japan Find Request — ' + product) + '&body=' + encodeURIComponent(lines.join('\n'));
    });
  }

  if (!document.querySelector('.mobile-dock')) {
    const dock = document.createElement('nav');
    dock.className = 'mobile-dock';
    dock.setAttribute('aria-label', 'Mobile quick navigation');
    dock.innerHTML = '<a href="index.html"><b>⌂</b><span>Home</span></a><a href="shop.html"><b>⌕</b><span>Inventory</span></a><button type="button" data-saved-open><b>♡</b><span>Saved</span></button><button type="button" data-cart-open><b>?</b><span>Inquiry</span></button>';
    document.body.appendChild(dock);
    dock.querySelector('[data-saved-open]').addEventListener('click', () => { closeOverlays(); openOverlay(savedDrawer); });
    dock.querySelector('[data-cart-open]').addEventListener('click', () => openOverlay(drawer));
  }

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduceMotion && 'IntersectionObserver' in window) {
    const revealTargets = [...document.querySelectorAll('main > section, .radar-card, .product-card, .tool-card, .inventory-slot')];
    revealTargets.forEach(el => el.classList.add('reveal-ready'));
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    }), { threshold:.07, rootMargin:'0px 0px -20px 0px' });
    revealTargets.forEach(el => observer.observe(el));
  }
})(); + item.price.toFixed(2) + ' each' : 'Price pending') + '</span></div>' +
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

    if (totalEl) totalEl.textContent = 'Pricing pending';
    if (inquiryButton) inquiryButton.disabled = false;

    itemsEl.querySelectorAll('[data-qty-index]').forEach(btn => btn.addEventListener('click', () => {
      const next = readCart();
      const index = Number(btn.dataset.qtyIndex);
      const delta = Number(btn.dataset.delta);
      if (!next[index]) return;
      next[index].qty += delta;
      if (next[index].qty <= 0) next.splice(index, 1);
      writeCart(next);
      renderCart();
    }));

    itemsEl.querySelectorAll('[data-remove-index]').forEach(btn => btn.addEventListener('click', () => {
      const next = readCart();
      next.splice(Number(btn.dataset.removeIndex), 1);
      writeCart(next);
      renderCart();
    }));
  };

  document.querySelectorAll('[data-add-cart]').forEach(button => button.addEventListener('click', () => {
    const cart = readCart();
    const name = String(button.dataset.name || '');
    if (!name) return;
    const match = cart.find(item => item.name === name);
    if (match) match.qty += 1;
    else cart.push({ name, qty: 1 });
    writeCart(cart);
    renderCart();
    openOverlay(drawer);
    toast('Added to your availability inquiry.');
  }));

  document.querySelectorAll('[data-cart-open]').forEach(button => button.addEventListener('click', () => openOverlay(drawer)));
  document.querySelectorAll('[data-cart-close]').forEach(button => button.addEventListener('click', closeOverlays));
  backdrop?.addEventListener('click', closeOverlays);
  document.addEventListener('keydown', event => { if (event.key === 'Escape') closeOverlays(); });

  inquiryButton?.addEventListener('click', () => {
    const cart = readCart();
    if (!cart.length) return;
    const lines = ['Hi Bringing Japan 2 U,', '', 'I’m interested in availability for:', ''];
    cart.forEach(item => lines.push('- ' + item.qty + ' × ' + item.name));
    lines.push('', 'I understand pricing and checkout are not live yet. Please let me know when details are available.');
    location.href = 'mailto:bringingjapantoyou@gmail.com?subject=' + encodeURIComponent('Inventory Availability Inquiry') + '&body=' + encodeURIComponent(lines.join('\n'));
  });
  renderCart();

  const savedDrawer = document.createElement('aside');
  savedDrawer.className = 'saved-drawer';
  savedDrawer.setAttribute('aria-hidden', 'true');
  savedDrawer.innerHTML = '<div class="saved-head"><div><small>COLLECTOR SHORTLIST</small><strong>Saved finds</strong></div><button type="button" data-saved-close aria-label="Close saved finds">×</button></div><div class="saved-items" data-saved-items></div><div class="saved-foot">Saved locally in this browser. Pricing will appear only when finalized.</div>';
  document.body.appendChild(savedDrawer);

  const normalizeSaved = items => (Array.isArray(items) ? items : [])
    .filter(item => item && item.id && item.name && !retiredSavedIds.has(String(item.id)))
    .map(item => ({ id:String(item.id), name:String(item.name), url:item.url || 'shop.html', image:item.image || '' }));
  const readSaved = () => normalizeSaved(safeParse(savedKey));
  const writeSaved = items => localStorage.setItem(savedKey, JSON.stringify(normalizeSaved(items)));

  const renderSaved = () => {
    const saved = readSaved();
    writeSaved(saved);
    document.querySelectorAll('[data-saved-count]').forEach(el => el.textContent = String(saved.length));
    document.querySelectorAll('[data-save-item]').forEach(btn => {
      const isSaved = saved.some(item => item.id === btn.dataset.id);
      btn.classList.toggle('is-saved', isSaved);
      if (btn.classList.contains('save-fab')) btn.textContent = isSaved ? '♥' : '♡';
      else if (btn.classList.contains('large-save')) btn.textContent = isSaved ? '♥ Saved find' : '♡ Save this find';
      else if (btn.classList.contains('dossier-save')) btn.textContent = isSaved ? '♥ Saved find' : '♡ Save find';
      btn.setAttribute('aria-pressed', String(isSaved));
    });

    const container = savedDrawer.querySelector('[data-saved-items]');
    if (!saved.length) {
      container.innerHTML = '<div class="empty-cart"><strong>No saved finds yet.</strong><p>Save confirmed inventory and it will stay here in this browser.</p></div>';
      return;
    }
    container.innerHTML = saved.map(item =>
      '<div class="saved-line">' +
        '<div class="saved-thumb">' + (item.image ? '<img src="' + item.image + '" alt="">' : 'BJ2U') + '</div>' +
        '<div><strong>' + item.name + '</strong><span>Price pending</span></div>' +
        '<div class="saved-line-actions"><a href="' + item.url + '">View →</a><button type="button" data-remove-saved="' + item.id + '">Remove</button></div>' +
      '</div>'
    ).join('');
    container.querySelectorAll('[data-remove-saved]').forEach(btn => btn.addEventListener('click', () => {
      writeSaved(readSaved().filter(item => item.id !== btn.dataset.removeSaved));
      renderSaved();
    }));
  };

  document.addEventListener('click', event => {
    const saveButton = event.target.closest('[data-save-item]');
    if (saveButton) {
      const saved = readSaved();
      const id = saveButton.dataset.id;
      const existing = saved.findIndex(item => item.id === id);
      if (existing >= 0) {
        saved.splice(existing, 1);
        toast('Removed from saved finds.');
      } else {
        saved.push({ id, name:saveButton.dataset.name || 'Saved find', url:saveButton.dataset.url || 'shop.html', image:saveButton.dataset.image || '' });
        toast('Saved to your collector shortlist.');
      }
      writeSaved(saved);
      renderSaved();
    }
    if (event.target.closest('[data-saved-open]')) {
      closeOverlays();
      openOverlay(savedDrawer);
    }
    if (event.target.closest('[data-saved-close]')) closeOverlays();
  });
  renderSaved();

  const cards = [...document.querySelectorAll('[data-product-card]')];
  const grid = document.querySelector('[data-product-grid]');
  const search = document.querySelector('[data-product-search]');
  const filters = [...document.querySelectorAll('[data-filter]')];
  const sort = document.querySelector('[data-sort-products]');
  const resultCount = document.querySelector('[data-result-count]');
  const noResults = document.querySelector('[data-no-results]');
  let activeFilter = new URLSearchParams(location.search).get('category') || 'all';
  const validFilters = new Set(['all', ...filters.map(btn => btn.dataset.filter)]);
  if (!validFilters.has(activeFilter)) activeFilter = 'all';

  const sortCards = () => {
    if (!grid || !sort) return;
    const mode = sort.value;
    const ordered = [...cards].sort((a,b) => mode === 'name'
      ? String(a.dataset.name).localeCompare(String(b.dataset.name))
      : cards.indexOf(a) - cards.indexOf(b));
    ordered.forEach(card => grid.appendChild(card));
  };

  const applyFilters = () => {
    const query = (search?.value || '').trim().toLowerCase();
    let visible = 0;
    cards.forEach(card => {
      const categories = (card.dataset.category || '').split(' ');
      const searchable = (card.dataset.search || '').toLowerCase();
      const show = (activeFilter === 'all' || categories.includes(activeFilter)) && (!query || searchable.includes(query));
      card.hidden = !show;
      if (show) visible++;
    });
    if (resultCount) resultCount.textContent = visible + (visible === 1 ? ' confirmed item' : ' confirmed items');
    if (noResults) noResults.hidden = visible !== 0;
    filters.forEach(btn => btn.classList.toggle('active', btn.dataset.filter === activeFilter));
  };

  filters.forEach(btn => btn.addEventListener('click', () => {
    activeFilter = btn.dataset.filter;
    history.replaceState({}, '', activeFilter === 'all' ? 'shop.html' : 'shop.html?category=' + encodeURIComponent(activeFilter));
    applyFilters();
  }));
  search?.addEventListener('input', applyFilters);
  sort?.addEventListener('change', sortCards);
  document.querySelectorAll('[data-view]').forEach(btn => btn.addEventListener('click', () => {
    document.querySelectorAll('[data-view]').forEach(item => item.classList.toggle('active', item === btn));
    grid?.classList.toggle('list-view', btn.dataset.view === 'list');
  }));
  if (cards.length) { sortCards(); applyFilters(); }

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
      const lines = ['Hi Bringing Japan 2 U,','','I would like to request a Japan find:','','Product: ' + product,'Series / brand: ' + String(form.get('series') || ''),'Budget: ' + String(form.get('budget') || ''),'Country: ' + String(form.get('country') || ''),'Name: ' + String(form.get('name') || ''),'','Details:',String(form.get('details') || ''),'','I understand this is a sourcing request, not a confirmed order.'];
      location.href = 'mailto:bringingjapantoyou@gmail.com?subject=' + encodeURIComponent('Japan Find Request — ' + product) + '&body=' + encodeURIComponent(lines.join('\n'));
    });
  }

  if (!document.querySelector('.mobile-dock')) {
    const dock = document.createElement('nav');
    dock.className = 'mobile-dock';
    dock.setAttribute('aria-label', 'Mobile quick navigation');
    dock.innerHTML = '<a href="index.html"><b>⌂</b><span>Home</span></a><a href="shop.html"><b>⌕</b><span>Inventory</span></a><button type="button" data-saved-open><b>♡</b><span>Saved</span></button><button type="button" data-cart-open><b>?</b><span>Inquiry</span></button>';
    document.body.appendChild(dock);
    dock.querySelector('[data-saved-open]').addEventListener('click', () => { closeOverlays(); openOverlay(savedDrawer); });
    dock.querySelector('[data-cart-open]').addEventListener('click', () => openOverlay(drawer));
  }

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduceMotion && 'IntersectionObserver' in window) {
    const revealTargets = [...document.querySelectorAll('main > section, .radar-card, .product-card, .tool-card, .inventory-slot')];
    revealTargets.forEach(el => el.classList.add('reveal-ready'));
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    }), { threshold:.07, rootMargin:'0px 0px -20px 0px' });
    revealTargets.forEach(el => observer.observe(el));
  }
})(); + pricedSubtotal.toFixed(2);
    if (inquiryButton) inquiryButton.disabled = false;

    itemsEl.querySelectorAll('[data-qty-index]').forEach(btn => btn.addEventListener('click', () => {
      const next = readCart();
      const index = Number(btn.dataset.qtyIndex);
      const delta = Number(btn.dataset.delta);
      if (!next[index]) return;
      next[index].qty += delta;
      if (next[index].qty <= 0) next.splice(index, 1);
      writeCart(next);
      renderCart();
    }));

    itemsEl.querySelectorAll('[data-remove-index]').forEach(btn => btn.addEventListener('click', () => {
      const next = readCart();
      next.splice(Number(btn.dataset.removeIndex), 1);
      writeCart(next);
      renderCart();
    }));
  };

  document.querySelectorAll('[data-add-cart]').forEach(button => button.addEventListener('click', () => {
    const cart = readCart();
    const name = String(button.dataset.name || '');
    if (!name) return;
    const match = cart.find(item => item.name === name);
    if (match) match.qty += 1;
    else cart.push({ name, qty: 1 });
    writeCart(cart);
    renderCart();
    openOverlay(drawer);
    toast('Added to your availability inquiry.');
  }));

  document.querySelectorAll('[data-cart-open]').forEach(button => button.addEventListener('click', () => openOverlay(drawer)));
  document.querySelectorAll('[data-cart-close]').forEach(button => button.addEventListener('click', closeOverlays));
  backdrop?.addEventListener('click', closeOverlays);
  document.addEventListener('keydown', event => { if (event.key === 'Escape') closeOverlays(); });

  inquiryButton?.addEventListener('click', () => {
    const cart = readCart();
    if (!cart.length) return;
    const lines = ['Hi Bringing Japan 2 U,', '', 'I’m interested in availability for:', ''];
    cart.forEach(item => lines.push('- ' + item.qty + ' × ' + item.name));
    lines.push('', 'I understand pricing and checkout are not live yet. Please let me know when details are available.');
    location.href = 'mailto:bringingjapantoyou@gmail.com?subject=' + encodeURIComponent('Inventory Availability Inquiry') + '&body=' + encodeURIComponent(lines.join('\n'));
  });
  renderCart();

  const savedDrawer = document.createElement('aside');
  savedDrawer.className = 'saved-drawer';
  savedDrawer.setAttribute('aria-hidden', 'true');
  savedDrawer.innerHTML = '<div class="saved-head"><div><small>COLLECTOR SHORTLIST</small><strong>Saved finds</strong></div><button type="button" data-saved-close aria-label="Close saved finds">×</button></div><div class="saved-items" data-saved-items></div><div class="saved-foot">Saved locally in this browser. Pricing will appear only when finalized.</div>';
  document.body.appendChild(savedDrawer);

  const normalizeSaved = items => (Array.isArray(items) ? items : [])
    .filter(item => item && item.id && item.name && !retiredSavedIds.has(String(item.id)))
    .map(item => ({ id:String(item.id), name:String(item.name), url:item.url || 'shop.html', image:item.image || '' }));
  const readSaved = () => normalizeSaved(safeParse(savedKey));
  const writeSaved = items => localStorage.setItem(savedKey, JSON.stringify(normalizeSaved(items)));

  const renderSaved = () => {
    const saved = readSaved();
    writeSaved(saved);
    document.querySelectorAll('[data-saved-count]').forEach(el => el.textContent = String(saved.length));
    document.querySelectorAll('[data-save-item]').forEach(btn => {
      const isSaved = saved.some(item => item.id === btn.dataset.id);
      btn.classList.toggle('is-saved', isSaved);
      if (btn.classList.contains('save-fab')) btn.textContent = isSaved ? '♥' : '♡';
      else if (btn.classList.contains('large-save')) btn.textContent = isSaved ? '♥ Saved find' : '♡ Save this find';
      else if (btn.classList.contains('dossier-save')) btn.textContent = isSaved ? '♥ Saved find' : '♡ Save find';
      btn.setAttribute('aria-pressed', String(isSaved));
    });

    const container = savedDrawer.querySelector('[data-saved-items]');
    if (!saved.length) {
      container.innerHTML = '<div class="empty-cart"><strong>No saved finds yet.</strong><p>Save confirmed inventory and it will stay here in this browser.</p></div>';
      return;
    }
    container.innerHTML = saved.map(item =>
      '<div class="saved-line">' +
        '<div class="saved-thumb">' + (item.image ? '<img src="' + item.image + '" alt="">' : 'BJ2U') + '</div>' +
        '<div><strong>' + item.name + '</strong><span>Price pending</span></div>' +
        '<div class="saved-line-actions"><a href="' + item.url + '">View →</a><button type="button" data-remove-saved="' + item.id + '">Remove</button></div>' +
      '</div>'
    ).join('');
    container.querySelectorAll('[data-remove-saved]').forEach(btn => btn.addEventListener('click', () => {
      writeSaved(readSaved().filter(item => item.id !== btn.dataset.removeSaved));
      renderSaved();
    }));
  };

  document.addEventListener('click', event => {
    const saveButton = event.target.closest('[data-save-item]');
    if (saveButton) {
      const saved = readSaved();
      const id = saveButton.dataset.id;
      const existing = saved.findIndex(item => item.id === id);
      if (existing >= 0) {
        saved.splice(existing, 1);
        toast('Removed from saved finds.');
      } else {
        saved.push({ id, name:saveButton.dataset.name || 'Saved find', url:saveButton.dataset.url || 'shop.html', image:saveButton.dataset.image || '' });
        toast('Saved to your collector shortlist.');
      }
      writeSaved(saved);
      renderSaved();
    }
    if (event.target.closest('[data-saved-open]')) {
      closeOverlays();
      openOverlay(savedDrawer);
    }
    if (event.target.closest('[data-saved-close]')) closeOverlays();
  });
  renderSaved();

  const cards = [...document.querySelectorAll('[data-product-card]')];
  const grid = document.querySelector('[data-product-grid]');
  const search = document.querySelector('[data-product-search]');
  const filters = [...document.querySelectorAll('[data-filter]')];
  const sort = document.querySelector('[data-sort-products]');
  const resultCount = document.querySelector('[data-result-count]');
  const noResults = document.querySelector('[data-no-results]');
  let activeFilter = new URLSearchParams(location.search).get('category') || 'all';
  const validFilters = new Set(['all', ...filters.map(btn => btn.dataset.filter)]);
  if (!validFilters.has(activeFilter)) activeFilter = 'all';

  const sortCards = () => {
    if (!grid || !sort) return;
    const mode = sort.value;
    const ordered = [...cards].sort((a,b) => mode === 'name'
      ? String(a.dataset.name).localeCompare(String(b.dataset.name))
      : cards.indexOf(a) - cards.indexOf(b));
    ordered.forEach(card => grid.appendChild(card));
  };

  const applyFilters = () => {
    const query = (search?.value || '').trim().toLowerCase();
    let visible = 0;
    cards.forEach(card => {
      const categories = (card.dataset.category || '').split(' ');
      const searchable = (card.dataset.search || '').toLowerCase();
      const show = (activeFilter === 'all' || categories.includes(activeFilter)) && (!query || searchable.includes(query));
      card.hidden = !show;
      if (show) visible++;
    });
    if (resultCount) resultCount.textContent = visible + (visible === 1 ? ' confirmed item' : ' confirmed items');
    if (noResults) noResults.hidden = visible !== 0;
    filters.forEach(btn => btn.classList.toggle('active', btn.dataset.filter === activeFilter));
  };

  filters.forEach(btn => btn.addEventListener('click', () => {
    activeFilter = btn.dataset.filter;
    history.replaceState({}, '', activeFilter === 'all' ? 'shop.html' : 'shop.html?category=' + encodeURIComponent(activeFilter));
    applyFilters();
  }));
  search?.addEventListener('input', applyFilters);
  sort?.addEventListener('change', sortCards);
  document.querySelectorAll('[data-view]').forEach(btn => btn.addEventListener('click', () => {
    document.querySelectorAll('[data-view]').forEach(item => item.classList.toggle('active', item === btn));
    grid?.classList.toggle('list-view', btn.dataset.view === 'list');
  }));
  if (cards.length) { sortCards(); applyFilters(); }

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
      const lines = ['Hi Bringing Japan 2 U,','','I would like to request a Japan find:','','Product: ' + product,'Series / brand: ' + String(form.get('series') || ''),'Budget: ' + String(form.get('budget') || ''),'Country: ' + String(form.get('country') || ''),'Name: ' + String(form.get('name') || ''),'','Details:',String(form.get('details') || ''),'','I understand this is a sourcing request, not a confirmed order.'];
      location.href = 'mailto:bringingjapantoyou@gmail.com?subject=' + encodeURIComponent('Japan Find Request — ' + product) + '&body=' + encodeURIComponent(lines.join('\n'));
    });
  }

  if (!document.querySelector('.mobile-dock')) {
    const dock = document.createElement('nav');
    dock.className = 'mobile-dock';
    dock.setAttribute('aria-label', 'Mobile quick navigation');
    dock.innerHTML = '<a href="index.html"><b>⌂</b><span>Home</span></a><a href="shop.html"><b>⌕</b><span>Inventory</span></a><button type="button" data-saved-open><b>♡</b><span>Saved</span></button><button type="button" data-cart-open><b>?</b><span>Inquiry</span></button>';
    document.body.appendChild(dock);
    dock.querySelector('[data-saved-open]').addEventListener('click', () => { closeOverlays(); openOverlay(savedDrawer); });
    dock.querySelector('[data-cart-open]').addEventListener('click', () => openOverlay(drawer));
  }

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduceMotion && 'IntersectionObserver' in window) {
    const revealTargets = [...document.querySelectorAll('main > section, .radar-card, .product-card, .tool-card, .inventory-slot')];
    revealTargets.forEach(el => el.classList.add('reveal-ready'));
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    }), { threshold:.07, rootMargin:'0px 0px -20px 0px' });
    revealTargets.forEach(el => observer.observe(el));
  }
})(); + item.price.toFixed(2) + ' each' : 'Price pending') + '</span></div>' +
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

    if (totalEl) totalEl.textContent = 'Pricing pending';
    if (inquiryButton) inquiryButton.disabled = false;

    itemsEl.querySelectorAll('[data-qty-index]').forEach(btn => btn.addEventListener('click', () => {
      const next = readCart();
      const index = Number(btn.dataset.qtyIndex);
      const delta = Number(btn.dataset.delta);
      if (!next[index]) return;
      next[index].qty += delta;
      if (next[index].qty <= 0) next.splice(index, 1);
      writeCart(next);
      renderCart();
    }));

    itemsEl.querySelectorAll('[data-remove-index]').forEach(btn => btn.addEventListener('click', () => {
      const next = readCart();
      next.splice(Number(btn.dataset.removeIndex), 1);
      writeCart(next);
      renderCart();
    }));
  };

  document.querySelectorAll('[data-add-cart]').forEach(button => button.addEventListener('click', () => {
    const cart = readCart();
    const name = String(button.dataset.name || '');
    if (!name) return;
    const match = cart.find(item => item.name === name);
    if (match) match.qty += 1;
    else cart.push({ name, qty: 1 });
    writeCart(cart);
    renderCart();
    openOverlay(drawer);
    toast('Added to your availability inquiry.');
  }));

  document.querySelectorAll('[data-cart-open]').forEach(button => button.addEventListener('click', () => openOverlay(drawer)));
  document.querySelectorAll('[data-cart-close]').forEach(button => button.addEventListener('click', closeOverlays));
  backdrop?.addEventListener('click', closeOverlays);
  document.addEventListener('keydown', event => { if (event.key === 'Escape') closeOverlays(); });

  inquiryButton?.addEventListener('click', () => {
    const cart = readCart();
    if (!cart.length) return;
    const lines = ['Hi Bringing Japan 2 U,', '', 'I’m interested in availability for:', ''];
    cart.forEach(item => lines.push('- ' + item.qty + ' × ' + item.name));
    lines.push('', 'I understand pricing and checkout are not live yet. Please let me know when details are available.');
    location.href = 'mailto:bringingjapantoyou@gmail.com?subject=' + encodeURIComponent('Inventory Availability Inquiry') + '&body=' + encodeURIComponent(lines.join('\n'));
  });
  renderCart();

  const savedDrawer = document.createElement('aside');
  savedDrawer.className = 'saved-drawer';
  savedDrawer.setAttribute('aria-hidden', 'true');
  savedDrawer.innerHTML = '<div class="saved-head"><div><small>COLLECTOR SHORTLIST</small><strong>Saved finds</strong></div><button type="button" data-saved-close aria-label="Close saved finds">×</button></div><div class="saved-items" data-saved-items></div><div class="saved-foot">Saved locally in this browser. Pricing will appear only when finalized.</div>';
  document.body.appendChild(savedDrawer);

  const normalizeSaved = items => (Array.isArray(items) ? items : [])
    .filter(item => item && item.id && item.name && !retiredSavedIds.has(String(item.id)))
    .map(item => ({ id:String(item.id), name:String(item.name), url:item.url || 'shop.html', image:item.image || '' }));
  const readSaved = () => normalizeSaved(safeParse(savedKey));
  const writeSaved = items => localStorage.setItem(savedKey, JSON.stringify(normalizeSaved(items)));

  const renderSaved = () => {
    const saved = readSaved();
    writeSaved(saved);
    document.querySelectorAll('[data-saved-count]').forEach(el => el.textContent = String(saved.length));
    document.querySelectorAll('[data-save-item]').forEach(btn => {
      const isSaved = saved.some(item => item.id === btn.dataset.id);
      btn.classList.toggle('is-saved', isSaved);
      if (btn.classList.contains('save-fab')) btn.textContent = isSaved ? '♥' : '♡';
      else if (btn.classList.contains('large-save')) btn.textContent = isSaved ? '♥ Saved find' : '♡ Save this find';
      else if (btn.classList.contains('dossier-save')) btn.textContent = isSaved ? '♥ Saved find' : '♡ Save find';
      btn.setAttribute('aria-pressed', String(isSaved));
    });

    const container = savedDrawer.querySelector('[data-saved-items]');
    if (!saved.length) {
      container.innerHTML = '<div class="empty-cart"><strong>No saved finds yet.</strong><p>Save confirmed inventory and it will stay here in this browser.</p></div>';
      return;
    }
    container.innerHTML = saved.map(item =>
      '<div class="saved-line">' +
        '<div class="saved-thumb">' + (item.image ? '<img src="' + item.image + '" alt="">' : 'BJ2U') + '</div>' +
        '<div><strong>' + item.name + '</strong><span>Price pending</span></div>' +
        '<div class="saved-line-actions"><a href="' + item.url + '">View →</a><button type="button" data-remove-saved="' + item.id + '">Remove</button></div>' +
      '</div>'
    ).join('');
    container.querySelectorAll('[data-remove-saved]').forEach(btn => btn.addEventListener('click', () => {
      writeSaved(readSaved().filter(item => item.id !== btn.dataset.removeSaved));
      renderSaved();
    }));
  };

  document.addEventListener('click', event => {
    const saveButton = event.target.closest('[data-save-item]');
    if (saveButton) {
      const saved = readSaved();
      const id = saveButton.dataset.id;
      const existing = saved.findIndex(item => item.id === id);
      if (existing >= 0) {
        saved.splice(existing, 1);
        toast('Removed from saved finds.');
      } else {
        saved.push({ id, name:saveButton.dataset.name || 'Saved find', url:saveButton.dataset.url || 'shop.html', image:saveButton.dataset.image || '' });
        toast('Saved to your collector shortlist.');
      }
      writeSaved(saved);
      renderSaved();
    }
    if (event.target.closest('[data-saved-open]')) {
      closeOverlays();
      openOverlay(savedDrawer);
    }
    if (event.target.closest('[data-saved-close]')) closeOverlays();
  });
  renderSaved();

  const cards = [...document.querySelectorAll('[data-product-card]')];
  const grid = document.querySelector('[data-product-grid]');
  const search = document.querySelector('[data-product-search]');
  const filters = [...document.querySelectorAll('[data-filter]')];
  const sort = document.querySelector('[data-sort-products]');
  const resultCount = document.querySelector('[data-result-count]');
  const noResults = document.querySelector('[data-no-results]');
  let activeFilter = new URLSearchParams(location.search).get('category') || 'all';
  const validFilters = new Set(['all', ...filters.map(btn => btn.dataset.filter)]);
  if (!validFilters.has(activeFilter)) activeFilter = 'all';

  const sortCards = () => {
    if (!grid || !sort) return;
    const mode = sort.value;
    const ordered = [...cards].sort((a,b) => mode === 'name'
      ? String(a.dataset.name).localeCompare(String(b.dataset.name))
      : cards.indexOf(a) - cards.indexOf(b));
    ordered.forEach(card => grid.appendChild(card));
  };

  const applyFilters = () => {
    const query = (search?.value || '').trim().toLowerCase();
    let visible = 0;
    cards.forEach(card => {
      const categories = (card.dataset.category || '').split(' ');
      const searchable = (card.dataset.search || '').toLowerCase();
      const show = (activeFilter === 'all' || categories.includes(activeFilter)) && (!query || searchable.includes(query));
      card.hidden = !show;
      if (show) visible++;
    });
    if (resultCount) resultCount.textContent = visible + (visible === 1 ? ' confirmed item' : ' confirmed items');
    if (noResults) noResults.hidden = visible !== 0;
    filters.forEach(btn => btn.classList.toggle('active', btn.dataset.filter === activeFilter));
  };

  filters.forEach(btn => btn.addEventListener('click', () => {
    activeFilter = btn.dataset.filter;
    history.replaceState({}, '', activeFilter === 'all' ? 'shop.html' : 'shop.html?category=' + encodeURIComponent(activeFilter));
    applyFilters();
  }));
  search?.addEventListener('input', applyFilters);
  sort?.addEventListener('change', sortCards);
  document.querySelectorAll('[data-view]').forEach(btn => btn.addEventListener('click', () => {
    document.querySelectorAll('[data-view]').forEach(item => item.classList.toggle('active', item === btn));
    grid?.classList.toggle('list-view', btn.dataset.view === 'list');
  }));
  if (cards.length) { sortCards(); applyFilters(); }

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
      const lines = ['Hi Bringing Japan 2 U,','','I would like to request a Japan find:','','Product: ' + product,'Series / brand: ' + String(form.get('series') || ''),'Budget: ' + String(form.get('budget') || ''),'Country: ' + String(form.get('country') || ''),'Name: ' + String(form.get('name') || ''),'','Details:',String(form.get('details') || ''),'','I understand this is a sourcing request, not a confirmed order.'];
      location.href = 'mailto:bringingjapantoyou@gmail.com?subject=' + encodeURIComponent('Japan Find Request — ' + product) + '&body=' + encodeURIComponent(lines.join('\n'));
    });
  }

  if (!document.querySelector('.mobile-dock')) {
    const dock = document.createElement('nav');
    dock.className = 'mobile-dock';
    dock.setAttribute('aria-label', 'Mobile quick navigation');
    dock.innerHTML = '<a href="index.html"><b>⌂</b><span>Home</span></a><a href="shop.html"><b>⌕</b><span>Inventory</span></a><button type="button" data-saved-open><b>♡</b><span>Saved</span></button><button type="button" data-cart-open><b>?</b><span>Inquiry</span></button>';
    document.body.appendChild(dock);
    dock.querySelector('[data-saved-open]').addEventListener('click', () => { closeOverlays(); openOverlay(savedDrawer); });
    dock.querySelector('[data-cart-open]').addEventListener('click', () => openOverlay(drawer));
  }

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduceMotion && 'IntersectionObserver' in window) {
    const revealTargets = [...document.querySelectorAll('main > section, .radar-card, .product-card, .tool-card, .inventory-slot')];
    revealTargets.forEach(el => el.classList.add('reveal-ready'));
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    }), { threshold:.07, rootMargin:'0px 0px -20px 0px' });
    revealTargets.forEach(el => observer.observe(el));
  }
})(); + item.price.toFixed(2) + ' each' : ' — price pending')));
    lines.push('', 'Please let me know current availability and next steps.');
    location.href = 'mailto:bringingjapantoyou@gmail.com?subject=' + encodeURIComponent('Inventory Availability Inquiry') + '&body=' + encodeURIComponent(lines.join('\n'));
  });
  renderCart();

  const savedDrawer = document.createElement('aside');
  savedDrawer.className = 'saved-drawer';
  savedDrawer.setAttribute('aria-hidden', 'true');
  savedDrawer.innerHTML = '<div class="saved-head"><div><small>COLLECTOR SHORTLIST</small><strong>Saved finds</strong></div><button type="button" data-saved-close aria-label="Close saved finds">×</button></div><div class="saved-items" data-saved-items></div><div class="saved-foot">Saved locally in this browser. Pricing will appear only when finalized.</div>';
  document.body.appendChild(savedDrawer);

  const normalizeSaved = items => (Array.isArray(items) ? items : [])
    .filter(item => item && item.id && item.name && !retiredSavedIds.has(String(item.id)))
    .map(item => ({ id:String(item.id), name:String(item.name), url:item.url || 'shop.html', image:item.image || '' }));
  const readSaved = () => normalizeSaved(safeParse(savedKey));
  const writeSaved = items => localStorage.setItem(savedKey, JSON.stringify(normalizeSaved(items)));

  const renderSaved = () => {
    const saved = readSaved();
    writeSaved(saved);
    document.querySelectorAll('[data-saved-count]').forEach(el => el.textContent = String(saved.length));
    document.querySelectorAll('[data-save-item]').forEach(btn => {
      const isSaved = saved.some(item => item.id === btn.dataset.id);
      btn.classList.toggle('is-saved', isSaved);
      if (btn.classList.contains('save-fab')) btn.textContent = isSaved ? '♥' : '♡';
      else if (btn.classList.contains('large-save')) btn.textContent = isSaved ? '♥ Saved find' : '♡ Save this find';
      else if (btn.classList.contains('dossier-save')) btn.textContent = isSaved ? '♥ Saved find' : '♡ Save find';
      btn.setAttribute('aria-pressed', String(isSaved));
    });

    const container = savedDrawer.querySelector('[data-saved-items]');
    if (!saved.length) {
      container.innerHTML = '<div class="empty-cart"><strong>No saved finds yet.</strong><p>Save confirmed inventory and it will stay here in this browser.</p></div>';
      return;
    }
    container.innerHTML = saved.map(item =>
      '<div class="saved-line">' +
        '<div class="saved-thumb">' + (item.image ? '<img src="' + item.image + '" alt="">' : 'BJ2U') + '</div>' +
        '<div><strong>' + item.name + '</strong><span>Price pending</span></div>' +
        '<div class="saved-line-actions"><a href="' + item.url + '">View →</a><button type="button" data-remove-saved="' + item.id + '">Remove</button></div>' +
      '</div>'
    ).join('');
    container.querySelectorAll('[data-remove-saved]').forEach(btn => btn.addEventListener('click', () => {
      writeSaved(readSaved().filter(item => item.id !== btn.dataset.removeSaved));
      renderSaved();
    }));
  };

  document.addEventListener('click', event => {
    const saveButton = event.target.closest('[data-save-item]');
    if (saveButton) {
      const saved = readSaved();
      const id = saveButton.dataset.id;
      const existing = saved.findIndex(item => item.id === id);
      if (existing >= 0) {
        saved.splice(existing, 1);
        toast('Removed from saved finds.');
      } else {
        saved.push({ id, name:saveButton.dataset.name || 'Saved find', url:saveButton.dataset.url || 'shop.html', image:saveButton.dataset.image || '' });
        toast('Saved to your collector shortlist.');
      }
      writeSaved(saved);
      renderSaved();
    }
    if (event.target.closest('[data-saved-open]')) {
      closeOverlays();
      openOverlay(savedDrawer);
    }
    if (event.target.closest('[data-saved-close]')) closeOverlays();
  });
  renderSaved();

  const cards = [...document.querySelectorAll('[data-product-card]')];
  const grid = document.querySelector('[data-product-grid]');
  const search = document.querySelector('[data-product-search]');
  const filters = [...document.querySelectorAll('[data-filter]')];
  const sort = document.querySelector('[data-sort-products]');
  const resultCount = document.querySelector('[data-result-count]');
  const noResults = document.querySelector('[data-no-results]');
  let activeFilter = new URLSearchParams(location.search).get('category') || 'all';
  const validFilters = new Set(['all', ...filters.map(btn => btn.dataset.filter)]);
  if (!validFilters.has(activeFilter)) activeFilter = 'all';

  const sortCards = () => {
    if (!grid || !sort) return;
    const mode = sort.value;
    const ordered = [...cards].sort((a,b) => mode === 'name'
      ? String(a.dataset.name).localeCompare(String(b.dataset.name))
      : cards.indexOf(a) - cards.indexOf(b));
    ordered.forEach(card => grid.appendChild(card));
  };

  const applyFilters = () => {
    const query = (search?.value || '').trim().toLowerCase();
    let visible = 0;
    cards.forEach(card => {
      const categories = (card.dataset.category || '').split(' ');
      const searchable = (card.dataset.search || '').toLowerCase();
      const show = (activeFilter === 'all' || categories.includes(activeFilter)) && (!query || searchable.includes(query));
      card.hidden = !show;
      if (show) visible++;
    });
    if (resultCount) resultCount.textContent = visible + (visible === 1 ? ' confirmed item' : ' confirmed items');
    if (noResults) noResults.hidden = visible !== 0;
    filters.forEach(btn => btn.classList.toggle('active', btn.dataset.filter === activeFilter));
  };

  filters.forEach(btn => btn.addEventListener('click', () => {
    activeFilter = btn.dataset.filter;
    history.replaceState({}, '', activeFilter === 'all' ? 'shop.html' : 'shop.html?category=' + encodeURIComponent(activeFilter));
    applyFilters();
  }));
  search?.addEventListener('input', applyFilters);
  sort?.addEventListener('change', sortCards);
  document.querySelectorAll('[data-view]').forEach(btn => btn.addEventListener('click', () => {
    document.querySelectorAll('[data-view]').forEach(item => item.classList.toggle('active', item === btn));
    grid?.classList.toggle('list-view', btn.dataset.view === 'list');
  }));
  if (cards.length) { sortCards(); applyFilters(); }

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
      const lines = ['Hi Bringing Japan 2 U,','','I would like to request a Japan find:','','Product: ' + product,'Series / brand: ' + String(form.get('series') || ''),'Budget: ' + String(form.get('budget') || ''),'Country: ' + String(form.get('country') || ''),'Name: ' + String(form.get('name') || ''),'','Details:',String(form.get('details') || ''),'','I understand this is a sourcing request, not a confirmed order.'];
      location.href = 'mailto:bringingjapantoyou@gmail.com?subject=' + encodeURIComponent('Japan Find Request — ' + product) + '&body=' + encodeURIComponent(lines.join('\n'));
    });
  }

  if (!document.querySelector('.mobile-dock')) {
    const dock = document.createElement('nav');
    dock.className = 'mobile-dock';
    dock.setAttribute('aria-label', 'Mobile quick navigation');
    dock.innerHTML = '<a href="index.html"><b>⌂</b><span>Home</span></a><a href="shop.html"><b>⌕</b><span>Inventory</span></a><button type="button" data-saved-open><b>♡</b><span>Saved</span></button><button type="button" data-cart-open><b>?</b><span>Inquiry</span></button>';
    document.body.appendChild(dock);
    dock.querySelector('[data-saved-open]').addEventListener('click', () => { closeOverlays(); openOverlay(savedDrawer); });
    dock.querySelector('[data-cart-open]').addEventListener('click', () => openOverlay(drawer));
  }

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduceMotion && 'IntersectionObserver' in window) {
    const revealTargets = [...document.querySelectorAll('main > section, .radar-card, .product-card, .tool-card, .inventory-slot')];
    revealTargets.forEach(el => el.classList.add('reveal-ready'));
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    }), { threshold:.07, rootMargin:'0px 0px -20px 0px' });
    revealTargets.forEach(el => observer.observe(el));
  }
})(); + item.price.toFixed(2) + ' each' : 'Price pending') + '</span></div>' +
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

    if (totalEl) totalEl.textContent = 'Pricing pending';
    if (inquiryButton) inquiryButton.disabled = false;

    itemsEl.querySelectorAll('[data-qty-index]').forEach(btn => btn.addEventListener('click', () => {
      const next = readCart();
      const index = Number(btn.dataset.qtyIndex);
      const delta = Number(btn.dataset.delta);
      if (!next[index]) return;
      next[index].qty += delta;
      if (next[index].qty <= 0) next.splice(index, 1);
      writeCart(next);
      renderCart();
    }));

    itemsEl.querySelectorAll('[data-remove-index]').forEach(btn => btn.addEventListener('click', () => {
      const next = readCart();
      next.splice(Number(btn.dataset.removeIndex), 1);
      writeCart(next);
      renderCart();
    }));
  };

  document.querySelectorAll('[data-add-cart]').forEach(button => button.addEventListener('click', () => {
    const cart = readCart();
    const name = String(button.dataset.name || '');
    if (!name) return;
    const match = cart.find(item => item.name === name);
    if (match) match.qty += 1;
    else cart.push({ name, qty: 1 });
    writeCart(cart);
    renderCart();
    openOverlay(drawer);
    toast('Added to your availability inquiry.');
  }));

  document.querySelectorAll('[data-cart-open]').forEach(button => button.addEventListener('click', () => openOverlay(drawer)));
  document.querySelectorAll('[data-cart-close]').forEach(button => button.addEventListener('click', closeOverlays));
  backdrop?.addEventListener('click', closeOverlays);
  document.addEventListener('keydown', event => { if (event.key === 'Escape') closeOverlays(); });

  inquiryButton?.addEventListener('click', () => {
    const cart = readCart();
    if (!cart.length) return;
    const lines = ['Hi Bringing Japan 2 U,', '', 'I’m interested in availability for:', ''];
    cart.forEach(item => lines.push('- ' + item.qty + ' × ' + item.name));
    lines.push('', 'I understand pricing and checkout are not live yet. Please let me know when details are available.');
    location.href = 'mailto:bringingjapantoyou@gmail.com?subject=' + encodeURIComponent('Inventory Availability Inquiry') + '&body=' + encodeURIComponent(lines.join('\n'));
  });
  renderCart();

  const savedDrawer = document.createElement('aside');
  savedDrawer.className = 'saved-drawer';
  savedDrawer.setAttribute('aria-hidden', 'true');
  savedDrawer.innerHTML = '<div class="saved-head"><div><small>COLLECTOR SHORTLIST</small><strong>Saved finds</strong></div><button type="button" data-saved-close aria-label="Close saved finds">×</button></div><div class="saved-items" data-saved-items></div><div class="saved-foot">Saved locally in this browser. Pricing will appear only when finalized.</div>';
  document.body.appendChild(savedDrawer);

  const normalizeSaved = items => (Array.isArray(items) ? items : [])
    .filter(item => item && item.id && item.name && !retiredSavedIds.has(String(item.id)))
    .map(item => ({ id:String(item.id), name:String(item.name), url:item.url || 'shop.html', image:item.image || '' }));
  const readSaved = () => normalizeSaved(safeParse(savedKey));
  const writeSaved = items => localStorage.setItem(savedKey, JSON.stringify(normalizeSaved(items)));

  const renderSaved = () => {
    const saved = readSaved();
    writeSaved(saved);
    document.querySelectorAll('[data-saved-count]').forEach(el => el.textContent = String(saved.length));
    document.querySelectorAll('[data-save-item]').forEach(btn => {
      const isSaved = saved.some(item => item.id === btn.dataset.id);
      btn.classList.toggle('is-saved', isSaved);
      if (btn.classList.contains('save-fab')) btn.textContent = isSaved ? '♥' : '♡';
      else if (btn.classList.contains('large-save')) btn.textContent = isSaved ? '♥ Saved find' : '♡ Save this find';
      else if (btn.classList.contains('dossier-save')) btn.textContent = isSaved ? '♥ Saved find' : '♡ Save find';
      btn.setAttribute('aria-pressed', String(isSaved));
    });

    const container = savedDrawer.querySelector('[data-saved-items]');
    if (!saved.length) {
      container.innerHTML = '<div class="empty-cart"><strong>No saved finds yet.</strong><p>Save confirmed inventory and it will stay here in this browser.</p></div>';
      return;
    }
    container.innerHTML = saved.map(item =>
      '<div class="saved-line">' +
        '<div class="saved-thumb">' + (item.image ? '<img src="' + item.image + '" alt="">' : 'BJ2U') + '</div>' +
        '<div><strong>' + item.name + '</strong><span>Price pending</span></div>' +
        '<div class="saved-line-actions"><a href="' + item.url + '">View →</a><button type="button" data-remove-saved="' + item.id + '">Remove</button></div>' +
      '</div>'
    ).join('');
    container.querySelectorAll('[data-remove-saved]').forEach(btn => btn.addEventListener('click', () => {
      writeSaved(readSaved().filter(item => item.id !== btn.dataset.removeSaved));
      renderSaved();
    }));
  };

  document.addEventListener('click', event => {
    const saveButton = event.target.closest('[data-save-item]');
    if (saveButton) {
      const saved = readSaved();
      const id = saveButton.dataset.id;
      const existing = saved.findIndex(item => item.id === id);
      if (existing >= 0) {
        saved.splice(existing, 1);
        toast('Removed from saved finds.');
      } else {
        saved.push({ id, name:saveButton.dataset.name || 'Saved find', url:saveButton.dataset.url || 'shop.html', image:saveButton.dataset.image || '' });
        toast('Saved to your collector shortlist.');
      }
      writeSaved(saved);
      renderSaved();
    }
    if (event.target.closest('[data-saved-open]')) {
      closeOverlays();
      openOverlay(savedDrawer);
    }
    if (event.target.closest('[data-saved-close]')) closeOverlays();
  });
  renderSaved();

  const cards = [...document.querySelectorAll('[data-product-card]')];
  const grid = document.querySelector('[data-product-grid]');
  const search = document.querySelector('[data-product-search]');
  const filters = [...document.querySelectorAll('[data-filter]')];
  const sort = document.querySelector('[data-sort-products]');
  const resultCount = document.querySelector('[data-result-count]');
  const noResults = document.querySelector('[data-no-results]');
  let activeFilter = new URLSearchParams(location.search).get('category') || 'all';
  const validFilters = new Set(['all', ...filters.map(btn => btn.dataset.filter)]);
  if (!validFilters.has(activeFilter)) activeFilter = 'all';

  const sortCards = () => {
    if (!grid || !sort) return;
    const mode = sort.value;
    const ordered = [...cards].sort((a,b) => mode === 'name'
      ? String(a.dataset.name).localeCompare(String(b.dataset.name))
      : cards.indexOf(a) - cards.indexOf(b));
    ordered.forEach(card => grid.appendChild(card));
  };

  const applyFilters = () => {
    const query = (search?.value || '').trim().toLowerCase();
    let visible = 0;
    cards.forEach(card => {
      const categories = (card.dataset.category || '').split(' ');
      const searchable = (card.dataset.search || '').toLowerCase();
      const show = (activeFilter === 'all' || categories.includes(activeFilter)) && (!query || searchable.includes(query));
      card.hidden = !show;
      if (show) visible++;
    });
    if (resultCount) resultCount.textContent = visible + (visible === 1 ? ' confirmed item' : ' confirmed items');
    if (noResults) noResults.hidden = visible !== 0;
    filters.forEach(btn => btn.classList.toggle('active', btn.dataset.filter === activeFilter));
  };

  filters.forEach(btn => btn.addEventListener('click', () => {
    activeFilter = btn.dataset.filter;
    history.replaceState({}, '', activeFilter === 'all' ? 'shop.html' : 'shop.html?category=' + encodeURIComponent(activeFilter));
    applyFilters();
  }));
  search?.addEventListener('input', applyFilters);
  sort?.addEventListener('change', sortCards);
  document.querySelectorAll('[data-view]').forEach(btn => btn.addEventListener('click', () => {
    document.querySelectorAll('[data-view]').forEach(item => item.classList.toggle('active', item === btn));
    grid?.classList.toggle('list-view', btn.dataset.view === 'list');
  }));
  if (cards.length) { sortCards(); applyFilters(); }

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
      const lines = ['Hi Bringing Japan 2 U,','','I would like to request a Japan find:','','Product: ' + product,'Series / brand: ' + String(form.get('series') || ''),'Budget: ' + String(form.get('budget') || ''),'Country: ' + String(form.get('country') || ''),'Name: ' + String(form.get('name') || ''),'','Details:',String(form.get('details') || ''),'','I understand this is a sourcing request, not a confirmed order.'];
      location.href = 'mailto:bringingjapantoyou@gmail.com?subject=' + encodeURIComponent('Japan Find Request — ' + product) + '&body=' + encodeURIComponent(lines.join('\n'));
    });
  }

  if (!document.querySelector('.mobile-dock')) {
    const dock = document.createElement('nav');
    dock.className = 'mobile-dock';
    dock.setAttribute('aria-label', 'Mobile quick navigation');
    dock.innerHTML = '<a href="index.html"><b>⌂</b><span>Home</span></a><a href="shop.html"><b>⌕</b><span>Inventory</span></a><button type="button" data-saved-open><b>♡</b><span>Saved</span></button><button type="button" data-cart-open><b>?</b><span>Inquiry</span></button>';
    document.body.appendChild(dock);
    dock.querySelector('[data-saved-open]').addEventListener('click', () => { closeOverlays(); openOverlay(savedDrawer); });
    dock.querySelector('[data-cart-open]').addEventListener('click', () => openOverlay(drawer));
  }

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduceMotion && 'IntersectionObserver' in window) {
    const revealTargets = [...document.querySelectorAll('main > section, .radar-card, .product-card, .tool-card, .inventory-slot')];
    revealTargets.forEach(el => el.classList.add('reveal-ready'));
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    }), { threshold:.07, rootMargin:'0px 0px -20px 0px' });
    revealTargets.forEach(el => observer.observe(el));
  }
})(); + pricedSubtotal.toFixed(2) + ' + pending' : 'Pricing pending')
      : '

    itemsEl.querySelectorAll('[data-qty-index]').forEach(btn => btn.addEventListener('click', () => {
      const next = readCart();
      const index = Number(btn.dataset.qtyIndex);
      const delta = Number(btn.dataset.delta);
      if (!next[index]) return;
      next[index].qty += delta;
      if (next[index].qty <= 0) next.splice(index, 1);
      writeCart(next);
      renderCart();
    }));

    itemsEl.querySelectorAll('[data-remove-index]').forEach(btn => btn.addEventListener('click', () => {
      const next = readCart();
      next.splice(Number(btn.dataset.removeIndex), 1);
      writeCart(next);
      renderCart();
    }));
  };

  document.querySelectorAll('[data-add-cart]').forEach(button => button.addEventListener('click', () => {
    const cart = readCart();
    const name = String(button.dataset.name || '');
    if (!name) return;
    const match = cart.find(item => item.name === name);
    if (match) match.qty += 1;
    else cart.push({ name, qty: 1 });
    writeCart(cart);
    renderCart();
    openOverlay(drawer);
    toast('Added to your availability inquiry.');
  }));

  document.querySelectorAll('[data-cart-open]').forEach(button => button.addEventListener('click', () => openOverlay(drawer)));
  document.querySelectorAll('[data-cart-close]').forEach(button => button.addEventListener('click', closeOverlays));
  backdrop?.addEventListener('click', closeOverlays);
  document.addEventListener('keydown', event => { if (event.key === 'Escape') closeOverlays(); });

  inquiryButton?.addEventListener('click', () => {
    const cart = readCart();
    if (!cart.length) return;
    const lines = ['Hi Bringing Japan 2 U,', '', 'I’m interested in availability for:', ''];
    cart.forEach(item => lines.push('- ' + item.qty + ' × ' + item.name));
    lines.push('', 'I understand pricing and checkout are not live yet. Please let me know when details are available.');
    location.href = 'mailto:bringingjapantoyou@gmail.com?subject=' + encodeURIComponent('Inventory Availability Inquiry') + '&body=' + encodeURIComponent(lines.join('\n'));
  });
  renderCart();

  const savedDrawer = document.createElement('aside');
  savedDrawer.className = 'saved-drawer';
  savedDrawer.setAttribute('aria-hidden', 'true');
  savedDrawer.innerHTML = '<div class="saved-head"><div><small>COLLECTOR SHORTLIST</small><strong>Saved finds</strong></div><button type="button" data-saved-close aria-label="Close saved finds">×</button></div><div class="saved-items" data-saved-items></div><div class="saved-foot">Saved locally in this browser. Pricing will appear only when finalized.</div>';
  document.body.appendChild(savedDrawer);

  const normalizeSaved = items => (Array.isArray(items) ? items : [])
    .filter(item => item && item.id && item.name && !retiredSavedIds.has(String(item.id)))
    .map(item => ({ id:String(item.id), name:String(item.name), url:item.url || 'shop.html', image:item.image || '' }));
  const readSaved = () => normalizeSaved(safeParse(savedKey));
  const writeSaved = items => localStorage.setItem(savedKey, JSON.stringify(normalizeSaved(items)));

  const renderSaved = () => {
    const saved = readSaved();
    writeSaved(saved);
    document.querySelectorAll('[data-saved-count]').forEach(el => el.textContent = String(saved.length));
    document.querySelectorAll('[data-save-item]').forEach(btn => {
      const isSaved = saved.some(item => item.id === btn.dataset.id);
      btn.classList.toggle('is-saved', isSaved);
      if (btn.classList.contains('save-fab')) btn.textContent = isSaved ? '♥' : '♡';
      else if (btn.classList.contains('large-save')) btn.textContent = isSaved ? '♥ Saved find' : '♡ Save this find';
      else if (btn.classList.contains('dossier-save')) btn.textContent = isSaved ? '♥ Saved find' : '♡ Save find';
      btn.setAttribute('aria-pressed', String(isSaved));
    });

    const container = savedDrawer.querySelector('[data-saved-items]');
    if (!saved.length) {
      container.innerHTML = '<div class="empty-cart"><strong>No saved finds yet.</strong><p>Save confirmed inventory and it will stay here in this browser.</p></div>';
      return;
    }
    container.innerHTML = saved.map(item =>
      '<div class="saved-line">' +
        '<div class="saved-thumb">' + (item.image ? '<img src="' + item.image + '" alt="">' : 'BJ2U') + '</div>' +
        '<div><strong>' + item.name + '</strong><span>Price pending</span></div>' +
        '<div class="saved-line-actions"><a href="' + item.url + '">View →</a><button type="button" data-remove-saved="' + item.id + '">Remove</button></div>' +
      '</div>'
    ).join('');
    container.querySelectorAll('[data-remove-saved]').forEach(btn => btn.addEventListener('click', () => {
      writeSaved(readSaved().filter(item => item.id !== btn.dataset.removeSaved));
      renderSaved();
    }));
  };

  document.addEventListener('click', event => {
    const saveButton = event.target.closest('[data-save-item]');
    if (saveButton) {
      const saved = readSaved();
      const id = saveButton.dataset.id;
      const existing = saved.findIndex(item => item.id === id);
      if (existing >= 0) {
        saved.splice(existing, 1);
        toast('Removed from saved finds.');
      } else {
        saved.push({ id, name:saveButton.dataset.name || 'Saved find', url:saveButton.dataset.url || 'shop.html', image:saveButton.dataset.image || '' });
        toast('Saved to your collector shortlist.');
      }
      writeSaved(saved);
      renderSaved();
    }
    if (event.target.closest('[data-saved-open]')) {
      closeOverlays();
      openOverlay(savedDrawer);
    }
    if (event.target.closest('[data-saved-close]')) closeOverlays();
  });
  renderSaved();

  const cards = [...document.querySelectorAll('[data-product-card]')];
  const grid = document.querySelector('[data-product-grid]');
  const search = document.querySelector('[data-product-search]');
  const filters = [...document.querySelectorAll('[data-filter]')];
  const sort = document.querySelector('[data-sort-products]');
  const resultCount = document.querySelector('[data-result-count]');
  const noResults = document.querySelector('[data-no-results]');
  let activeFilter = new URLSearchParams(location.search).get('category') || 'all';
  const validFilters = new Set(['all', ...filters.map(btn => btn.dataset.filter)]);
  if (!validFilters.has(activeFilter)) activeFilter = 'all';

  const sortCards = () => {
    if (!grid || !sort) return;
    const mode = sort.value;
    const ordered = [...cards].sort((a,b) => mode === 'name'
      ? String(a.dataset.name).localeCompare(String(b.dataset.name))
      : cards.indexOf(a) - cards.indexOf(b));
    ordered.forEach(card => grid.appendChild(card));
  };

  const applyFilters = () => {
    const query = (search?.value || '').trim().toLowerCase();
    let visible = 0;
    cards.forEach(card => {
      const categories = (card.dataset.category || '').split(' ');
      const searchable = (card.dataset.search || '').toLowerCase();
      const show = (activeFilter === 'all' || categories.includes(activeFilter)) && (!query || searchable.includes(query));
      card.hidden = !show;
      if (show) visible++;
    });
    if (resultCount) resultCount.textContent = visible + (visible === 1 ? ' confirmed item' : ' confirmed items');
    if (noResults) noResults.hidden = visible !== 0;
    filters.forEach(btn => btn.classList.toggle('active', btn.dataset.filter === activeFilter));
  };

  filters.forEach(btn => btn.addEventListener('click', () => {
    activeFilter = btn.dataset.filter;
    history.replaceState({}, '', activeFilter === 'all' ? 'shop.html' : 'shop.html?category=' + encodeURIComponent(activeFilter));
    applyFilters();
  }));
  search?.addEventListener('input', applyFilters);
  sort?.addEventListener('change', sortCards);
  document.querySelectorAll('[data-view]').forEach(btn => btn.addEventListener('click', () => {
    document.querySelectorAll('[data-view]').forEach(item => item.classList.toggle('active', item === btn));
    grid?.classList.toggle('list-view', btn.dataset.view === 'list');
  }));
  if (cards.length) { sortCards(); applyFilters(); }

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
      const lines = ['Hi Bringing Japan 2 U,','','I would like to request a Japan find:','','Product: ' + product,'Series / brand: ' + String(form.get('series') || ''),'Budget: ' + String(form.get('budget') || ''),'Country: ' + String(form.get('country') || ''),'Name: ' + String(form.get('name') || ''),'','Details:',String(form.get('details') || ''),'','I understand this is a sourcing request, not a confirmed order.'];
      location.href = 'mailto:bringingjapantoyou@gmail.com?subject=' + encodeURIComponent('Japan Find Request — ' + product) + '&body=' + encodeURIComponent(lines.join('\n'));
    });
  }

  if (!document.querySelector('.mobile-dock')) {
    const dock = document.createElement('nav');
    dock.className = 'mobile-dock';
    dock.setAttribute('aria-label', 'Mobile quick navigation');
    dock.innerHTML = '<a href="index.html"><b>⌂</b><span>Home</span></a><a href="shop.html"><b>⌕</b><span>Inventory</span></a><button type="button" data-saved-open><b>♡</b><span>Saved</span></button><button type="button" data-cart-open><b>?</b><span>Inquiry</span></button>';
    document.body.appendChild(dock);
    dock.querySelector('[data-saved-open]').addEventListener('click', () => { closeOverlays(); openOverlay(savedDrawer); });
    dock.querySelector('[data-cart-open]').addEventListener('click', () => openOverlay(drawer));
  }

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduceMotion && 'IntersectionObserver' in window) {
    const revealTargets = [...document.querySelectorAll('main > section, .radar-card, .product-card, .tool-card, .inventory-slot')];
    revealTargets.forEach(el => el.classList.add('reveal-ready'));
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    }), { threshold:.07, rootMargin:'0px 0px -20px 0px' });
    revealTargets.forEach(el => observer.observe(el));
  }
})(); + item.price.toFixed(2) + ' each' : 'Price pending') + '</span></div>' +
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

    if (totalEl) totalEl.textContent = 'Pricing pending';
    if (inquiryButton) inquiryButton.disabled = false;

    itemsEl.querySelectorAll('[data-qty-index]').forEach(btn => btn.addEventListener('click', () => {
      const next = readCart();
      const index = Number(btn.dataset.qtyIndex);
      const delta = Number(btn.dataset.delta);
      if (!next[index]) return;
      next[index].qty += delta;
      if (next[index].qty <= 0) next.splice(index, 1);
      writeCart(next);
      renderCart();
    }));

    itemsEl.querySelectorAll('[data-remove-index]').forEach(btn => btn.addEventListener('click', () => {
      const next = readCart();
      next.splice(Number(btn.dataset.removeIndex), 1);
      writeCart(next);
      renderCart();
    }));
  };

  document.querySelectorAll('[data-add-cart]').forEach(button => button.addEventListener('click', () => {
    const cart = readCart();
    const name = String(button.dataset.name || '');
    if (!name) return;
    const match = cart.find(item => item.name === name);
    if (match) match.qty += 1;
    else cart.push({ name, qty: 1 });
    writeCart(cart);
    renderCart();
    openOverlay(drawer);
    toast('Added to your availability inquiry.');
  }));

  document.querySelectorAll('[data-cart-open]').forEach(button => button.addEventListener('click', () => openOverlay(drawer)));
  document.querySelectorAll('[data-cart-close]').forEach(button => button.addEventListener('click', closeOverlays));
  backdrop?.addEventListener('click', closeOverlays);
  document.addEventListener('keydown', event => { if (event.key === 'Escape') closeOverlays(); });

  inquiryButton?.addEventListener('click', () => {
    const cart = readCart();
    if (!cart.length) return;
    const lines = ['Hi Bringing Japan 2 U,', '', 'I’m interested in availability for:', ''];
    cart.forEach(item => lines.push('- ' + item.qty + ' × ' + item.name));
    lines.push('', 'I understand pricing and checkout are not live yet. Please let me know when details are available.');
    location.href = 'mailto:bringingjapantoyou@gmail.com?subject=' + encodeURIComponent('Inventory Availability Inquiry') + '&body=' + encodeURIComponent(lines.join('\n'));
  });
  renderCart();

  const savedDrawer = document.createElement('aside');
  savedDrawer.className = 'saved-drawer';
  savedDrawer.setAttribute('aria-hidden', 'true');
  savedDrawer.innerHTML = '<div class="saved-head"><div><small>COLLECTOR SHORTLIST</small><strong>Saved finds</strong></div><button type="button" data-saved-close aria-label="Close saved finds">×</button></div><div class="saved-items" data-saved-items></div><div class="saved-foot">Saved locally in this browser. Pricing will appear only when finalized.</div>';
  document.body.appendChild(savedDrawer);

  const normalizeSaved = items => (Array.isArray(items) ? items : [])
    .filter(item => item && item.id && item.name && !retiredSavedIds.has(String(item.id)))
    .map(item => ({ id:String(item.id), name:String(item.name), url:item.url || 'shop.html', image:item.image || '' }));
  const readSaved = () => normalizeSaved(safeParse(savedKey));
  const writeSaved = items => localStorage.setItem(savedKey, JSON.stringify(normalizeSaved(items)));

  const renderSaved = () => {
    const saved = readSaved();
    writeSaved(saved);
    document.querySelectorAll('[data-saved-count]').forEach(el => el.textContent = String(saved.length));
    document.querySelectorAll('[data-save-item]').forEach(btn => {
      const isSaved = saved.some(item => item.id === btn.dataset.id);
      btn.classList.toggle('is-saved', isSaved);
      if (btn.classList.contains('save-fab')) btn.textContent = isSaved ? '♥' : '♡';
      else if (btn.classList.contains('large-save')) btn.textContent = isSaved ? '♥ Saved find' : '♡ Save this find';
      else if (btn.classList.contains('dossier-save')) btn.textContent = isSaved ? '♥ Saved find' : '♡ Save find';
      btn.setAttribute('aria-pressed', String(isSaved));
    });

    const container = savedDrawer.querySelector('[data-saved-items]');
    if (!saved.length) {
      container.innerHTML = '<div class="empty-cart"><strong>No saved finds yet.</strong><p>Save confirmed inventory and it will stay here in this browser.</p></div>';
      return;
    }
    container.innerHTML = saved.map(item =>
      '<div class="saved-line">' +
        '<div class="saved-thumb">' + (item.image ? '<img src="' + item.image + '" alt="">' : 'BJ2U') + '</div>' +
        '<div><strong>' + item.name + '</strong><span>Price pending</span></div>' +
        '<div class="saved-line-actions"><a href="' + item.url + '">View →</a><button type="button" data-remove-saved="' + item.id + '">Remove</button></div>' +
      '</div>'
    ).join('');
    container.querySelectorAll('[data-remove-saved]').forEach(btn => btn.addEventListener('click', () => {
      writeSaved(readSaved().filter(item => item.id !== btn.dataset.removeSaved));
      renderSaved();
    }));
  };

  document.addEventListener('click', event => {
    const saveButton = event.target.closest('[data-save-item]');
    if (saveButton) {
      const saved = readSaved();
      const id = saveButton.dataset.id;
      const existing = saved.findIndex(item => item.id === id);
      if (existing >= 0) {
        saved.splice(existing, 1);
        toast('Removed from saved finds.');
      } else {
        saved.push({ id, name:saveButton.dataset.name || 'Saved find', url:saveButton.dataset.url || 'shop.html', image:saveButton.dataset.image || '' });
        toast('Saved to your collector shortlist.');
      }
      writeSaved(saved);
      renderSaved();
    }
    if (event.target.closest('[data-saved-open]')) {
      closeOverlays();
      openOverlay(savedDrawer);
    }
    if (event.target.closest('[data-saved-close]')) closeOverlays();
  });
  renderSaved();

  const cards = [...document.querySelectorAll('[data-product-card]')];
  const grid = document.querySelector('[data-product-grid]');
  const search = document.querySelector('[data-product-search]');
  const filters = [...document.querySelectorAll('[data-filter]')];
  const sort = document.querySelector('[data-sort-products]');
  const resultCount = document.querySelector('[data-result-count]');
  const noResults = document.querySelector('[data-no-results]');
  let activeFilter = new URLSearchParams(location.search).get('category') || 'all';
  const validFilters = new Set(['all', ...filters.map(btn => btn.dataset.filter)]);
  if (!validFilters.has(activeFilter)) activeFilter = 'all';

  const sortCards = () => {
    if (!grid || !sort) return;
    const mode = sort.value;
    const ordered = [...cards].sort((a,b) => mode === 'name'
      ? String(a.dataset.name).localeCompare(String(b.dataset.name))
      : cards.indexOf(a) - cards.indexOf(b));
    ordered.forEach(card => grid.appendChild(card));
  };

  const applyFilters = () => {
    const query = (search?.value || '').trim().toLowerCase();
    let visible = 0;
    cards.forEach(card => {
      const categories = (card.dataset.category || '').split(' ');
      const searchable = (card.dataset.search || '').toLowerCase();
      const show = (activeFilter === 'all' || categories.includes(activeFilter)) && (!query || searchable.includes(query));
      card.hidden = !show;
      if (show) visible++;
    });
    if (resultCount) resultCount.textContent = visible + (visible === 1 ? ' confirmed item' : ' confirmed items');
    if (noResults) noResults.hidden = visible !== 0;
    filters.forEach(btn => btn.classList.toggle('active', btn.dataset.filter === activeFilter));
  };

  filters.forEach(btn => btn.addEventListener('click', () => {
    activeFilter = btn.dataset.filter;
    history.replaceState({}, '', activeFilter === 'all' ? 'shop.html' : 'shop.html?category=' + encodeURIComponent(activeFilter));
    applyFilters();
  }));
  search?.addEventListener('input', applyFilters);
  sort?.addEventListener('change', sortCards);
  document.querySelectorAll('[data-view]').forEach(btn => btn.addEventListener('click', () => {
    document.querySelectorAll('[data-view]').forEach(item => item.classList.toggle('active', item === btn));
    grid?.classList.toggle('list-view', btn.dataset.view === 'list');
  }));
  if (cards.length) { sortCards(); applyFilters(); }

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
      const lines = ['Hi Bringing Japan 2 U,','','I would like to request a Japan find:','','Product: ' + product,'Series / brand: ' + String(form.get('series') || ''),'Budget: ' + String(form.get('budget') || ''),'Country: ' + String(form.get('country') || ''),'Name: ' + String(form.get('name') || ''),'','Details:',String(form.get('details') || ''),'','I understand this is a sourcing request, not a confirmed order.'];
      location.href = 'mailto:bringingjapantoyou@gmail.com?subject=' + encodeURIComponent('Japan Find Request — ' + product) + '&body=' + encodeURIComponent(lines.join('\n'));
    });
  }

  if (!document.querySelector('.mobile-dock')) {
    const dock = document.createElement('nav');
    dock.className = 'mobile-dock';
    dock.setAttribute('aria-label', 'Mobile quick navigation');
    dock.innerHTML = '<a href="index.html"><b>⌂</b><span>Home</span></a><a href="shop.html"><b>⌕</b><span>Inventory</span></a><button type="button" data-saved-open><b>♡</b><span>Saved</span></button><button type="button" data-cart-open><b>?</b><span>Inquiry</span></button>';
    document.body.appendChild(dock);
    dock.querySelector('[data-saved-open]').addEventListener('click', () => { closeOverlays(); openOverlay(savedDrawer); });
    dock.querySelector('[data-cart-open]').addEventListener('click', () => openOverlay(drawer));
  }

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduceMotion && 'IntersectionObserver' in window) {
    const revealTargets = [...document.querySelectorAll('main > section, .radar-card, .product-card, .tool-card, .inventory-slot')];
    revealTargets.forEach(el => el.classList.add('reveal-ready'));
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    }), { threshold:.07, rootMargin:'0px 0px -20px 0px' });
    revealTargets.forEach(el => observer.observe(el));
  }
})(); + pricedSubtotal.toFixed(2);
    if (inquiryButton) inquiryButton.disabled = false;

    itemsEl.querySelectorAll('[data-qty-index]').forEach(btn => btn.addEventListener('click', () => {
      const next = readCart();
      const index = Number(btn.dataset.qtyIndex);
      const delta = Number(btn.dataset.delta);
      if (!next[index]) return;
      next[index].qty += delta;
      if (next[index].qty <= 0) next.splice(index, 1);
      writeCart(next);
      renderCart();
    }));

    itemsEl.querySelectorAll('[data-remove-index]').forEach(btn => btn.addEventListener('click', () => {
      const next = readCart();
      next.splice(Number(btn.dataset.removeIndex), 1);
      writeCart(next);
      renderCart();
    }));
  };

  document.querySelectorAll('[data-add-cart]').forEach(button => button.addEventListener('click', () => {
    const cart = readCart();
    const name = String(button.dataset.name || '');
    if (!name) return;
    const match = cart.find(item => item.name === name);
    if (match) match.qty += 1;
    else cart.push({ name, qty: 1 });
    writeCart(cart);
    renderCart();
    openOverlay(drawer);
    toast('Added to your availability inquiry.');
  }));

  document.querySelectorAll('[data-cart-open]').forEach(button => button.addEventListener('click', () => openOverlay(drawer)));
  document.querySelectorAll('[data-cart-close]').forEach(button => button.addEventListener('click', closeOverlays));
  backdrop?.addEventListener('click', closeOverlays);
  document.addEventListener('keydown', event => { if (event.key === 'Escape') closeOverlays(); });

  inquiryButton?.addEventListener('click', () => {
    const cart = readCart();
    if (!cart.length) return;
    const lines = ['Hi Bringing Japan 2 U,', '', 'I’m interested in availability for:', ''];
    cart.forEach(item => lines.push('- ' + item.qty + ' × ' + item.name));
    lines.push('', 'I understand pricing and checkout are not live yet. Please let me know when details are available.');
    location.href = 'mailto:bringingjapantoyou@gmail.com?subject=' + encodeURIComponent('Inventory Availability Inquiry') + '&body=' + encodeURIComponent(lines.join('\n'));
  });
  renderCart();

  const savedDrawer = document.createElement('aside');
  savedDrawer.className = 'saved-drawer';
  savedDrawer.setAttribute('aria-hidden', 'true');
  savedDrawer.innerHTML = '<div class="saved-head"><div><small>COLLECTOR SHORTLIST</small><strong>Saved finds</strong></div><button type="button" data-saved-close aria-label="Close saved finds">×</button></div><div class="saved-items" data-saved-items></div><div class="saved-foot">Saved locally in this browser. Pricing will appear only when finalized.</div>';
  document.body.appendChild(savedDrawer);

  const normalizeSaved = items => (Array.isArray(items) ? items : [])
    .filter(item => item && item.id && item.name && !retiredSavedIds.has(String(item.id)))
    .map(item => ({ id:String(item.id), name:String(item.name), url:item.url || 'shop.html', image:item.image || '' }));
  const readSaved = () => normalizeSaved(safeParse(savedKey));
  const writeSaved = items => localStorage.setItem(savedKey, JSON.stringify(normalizeSaved(items)));

  const renderSaved = () => {
    const saved = readSaved();
    writeSaved(saved);
    document.querySelectorAll('[data-saved-count]').forEach(el => el.textContent = String(saved.length));
    document.querySelectorAll('[data-save-item]').forEach(btn => {
      const isSaved = saved.some(item => item.id === btn.dataset.id);
      btn.classList.toggle('is-saved', isSaved);
      if (btn.classList.contains('save-fab')) btn.textContent = isSaved ? '♥' : '♡';
      else if (btn.classList.contains('large-save')) btn.textContent = isSaved ? '♥ Saved find' : '♡ Save this find';
      else if (btn.classList.contains('dossier-save')) btn.textContent = isSaved ? '♥ Saved find' : '♡ Save find';
      btn.setAttribute('aria-pressed', String(isSaved));
    });

    const container = savedDrawer.querySelector('[data-saved-items]');
    if (!saved.length) {
      container.innerHTML = '<div class="empty-cart"><strong>No saved finds yet.</strong><p>Save confirmed inventory and it will stay here in this browser.</p></div>';
      return;
    }
    container.innerHTML = saved.map(item =>
      '<div class="saved-line">' +
        '<div class="saved-thumb">' + (item.image ? '<img src="' + item.image + '" alt="">' : 'BJ2U') + '</div>' +
        '<div><strong>' + item.name + '</strong><span>Price pending</span></div>' +
        '<div class="saved-line-actions"><a href="' + item.url + '">View →</a><button type="button" data-remove-saved="' + item.id + '">Remove</button></div>' +
      '</div>'
    ).join('');
    container.querySelectorAll('[data-remove-saved]').forEach(btn => btn.addEventListener('click', () => {
      writeSaved(readSaved().filter(item => item.id !== btn.dataset.removeSaved));
      renderSaved();
    }));
  };

  document.addEventListener('click', event => {
    const saveButton = event.target.closest('[data-save-item]');
    if (saveButton) {
      const saved = readSaved();
      const id = saveButton.dataset.id;
      const existing = saved.findIndex(item => item.id === id);
      if (existing >= 0) {
        saved.splice(existing, 1);
        toast('Removed from saved finds.');
      } else {
        saved.push({ id, name:saveButton.dataset.name || 'Saved find', url:saveButton.dataset.url || 'shop.html', image:saveButton.dataset.image || '' });
        toast('Saved to your collector shortlist.');
      }
      writeSaved(saved);
      renderSaved();
    }
    if (event.target.closest('[data-saved-open]')) {
      closeOverlays();
      openOverlay(savedDrawer);
    }
    if (event.target.closest('[data-saved-close]')) closeOverlays();
  });
  renderSaved();

  const cards = [...document.querySelectorAll('[data-product-card]')];
  const grid = document.querySelector('[data-product-grid]');
  const search = document.querySelector('[data-product-search]');
  const filters = [...document.querySelectorAll('[data-filter]')];
  const sort = document.querySelector('[data-sort-products]');
  const resultCount = document.querySelector('[data-result-count]');
  const noResults = document.querySelector('[data-no-results]');
  let activeFilter = new URLSearchParams(location.search).get('category') || 'all';
  const validFilters = new Set(['all', ...filters.map(btn => btn.dataset.filter)]);
  if (!validFilters.has(activeFilter)) activeFilter = 'all';

  const sortCards = () => {
    if (!grid || !sort) return;
    const mode = sort.value;
    const ordered = [...cards].sort((a,b) => mode === 'name'
      ? String(a.dataset.name).localeCompare(String(b.dataset.name))
      : cards.indexOf(a) - cards.indexOf(b));
    ordered.forEach(card => grid.appendChild(card));
  };

  const applyFilters = () => {
    const query = (search?.value || '').trim().toLowerCase();
    let visible = 0;
    cards.forEach(card => {
      const categories = (card.dataset.category || '').split(' ');
      const searchable = (card.dataset.search || '').toLowerCase();
      const show = (activeFilter === 'all' || categories.includes(activeFilter)) && (!query || searchable.includes(query));
      card.hidden = !show;
      if (show) visible++;
    });
    if (resultCount) resultCount.textContent = visible + (visible === 1 ? ' confirmed item' : ' confirmed items');
    if (noResults) noResults.hidden = visible !== 0;
    filters.forEach(btn => btn.classList.toggle('active', btn.dataset.filter === activeFilter));
  };

  filters.forEach(btn => btn.addEventListener('click', () => {
    activeFilter = btn.dataset.filter;
    history.replaceState({}, '', activeFilter === 'all' ? 'shop.html' : 'shop.html?category=' + encodeURIComponent(activeFilter));
    applyFilters();
  }));
  search?.addEventListener('input', applyFilters);
  sort?.addEventListener('change', sortCards);
  document.querySelectorAll('[data-view]').forEach(btn => btn.addEventListener('click', () => {
    document.querySelectorAll('[data-view]').forEach(item => item.classList.toggle('active', item === btn));
    grid?.classList.toggle('list-view', btn.dataset.view === 'list');
  }));
  if (cards.length) { sortCards(); applyFilters(); }

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
      const lines = ['Hi Bringing Japan 2 U,','','I would like to request a Japan find:','','Product: ' + product,'Series / brand: ' + String(form.get('series') || ''),'Budget: ' + String(form.get('budget') || ''),'Country: ' + String(form.get('country') || ''),'Name: ' + String(form.get('name') || ''),'','Details:',String(form.get('details') || ''),'','I understand this is a sourcing request, not a confirmed order.'];
      location.href = 'mailto:bringingjapantoyou@gmail.com?subject=' + encodeURIComponent('Japan Find Request — ' + product) + '&body=' + encodeURIComponent(lines.join('\n'));
    });
  }

  if (!document.querySelector('.mobile-dock')) {
    const dock = document.createElement('nav');
    dock.className = 'mobile-dock';
    dock.setAttribute('aria-label', 'Mobile quick navigation');
    dock.innerHTML = '<a href="index.html"><b>⌂</b><span>Home</span></a><a href="shop.html"><b>⌕</b><span>Inventory</span></a><button type="button" data-saved-open><b>♡</b><span>Saved</span></button><button type="button" data-cart-open><b>?</b><span>Inquiry</span></button>';
    document.body.appendChild(dock);
    dock.querySelector('[data-saved-open]').addEventListener('click', () => { closeOverlays(); openOverlay(savedDrawer); });
    dock.querySelector('[data-cart-open]').addEventListener('click', () => openOverlay(drawer));
  }

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduceMotion && 'IntersectionObserver' in window) {
    const revealTargets = [...document.querySelectorAll('main > section, .radar-card, .product-card, .tool-card, .inventory-slot')];
    revealTargets.forEach(el => el.classList.add('reveal-ready'));
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    }), { threshold:.07, rootMargin:'0px 0px -20px 0px' });
    revealTargets.forEach(el => observer.observe(el));
  }
})(); + item.price.toFixed(2) + ' each' : 'Price pending') + '</span></div>' +
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

    if (totalEl) totalEl.textContent = 'Pricing pending';
    if (inquiryButton) inquiryButton.disabled = false;

    itemsEl.querySelectorAll('[data-qty-index]').forEach(btn => btn.addEventListener('click', () => {
      const next = readCart();
      const index = Number(btn.dataset.qtyIndex);
      const delta = Number(btn.dataset.delta);
      if (!next[index]) return;
      next[index].qty += delta;
      if (next[index].qty <= 0) next.splice(index, 1);
      writeCart(next);
      renderCart();
    }));

    itemsEl.querySelectorAll('[data-remove-index]').forEach(btn => btn.addEventListener('click', () => {
      const next = readCart();
      next.splice(Number(btn.dataset.removeIndex), 1);
      writeCart(next);
      renderCart();
    }));
  };

  document.querySelectorAll('[data-add-cart]').forEach(button => button.addEventListener('click', () => {
    const cart = readCart();
    const name = String(button.dataset.name || '');
    if (!name) return;
    const match = cart.find(item => item.name === name);
    if (match) match.qty += 1;
    else cart.push({ name, qty: 1 });
    writeCart(cart);
    renderCart();
    openOverlay(drawer);
    toast('Added to your availability inquiry.');
  }));

  document.querySelectorAll('[data-cart-open]').forEach(button => button.addEventListener('click', () => openOverlay(drawer)));
  document.querySelectorAll('[data-cart-close]').forEach(button => button.addEventListener('click', closeOverlays));
  backdrop?.addEventListener('click', closeOverlays);
  document.addEventListener('keydown', event => { if (event.key === 'Escape') closeOverlays(); });

  inquiryButton?.addEventListener('click', () => {
    const cart = readCart();
    if (!cart.length) return;
    const lines = ['Hi Bringing Japan 2 U,', '', 'I’m interested in availability for:', ''];
    cart.forEach(item => lines.push('- ' + item.qty + ' × ' + item.name));
    lines.push('', 'I understand pricing and checkout are not live yet. Please let me know when details are available.');
    location.href = 'mailto:bringingjapantoyou@gmail.com?subject=' + encodeURIComponent('Inventory Availability Inquiry') + '&body=' + encodeURIComponent(lines.join('\n'));
  });
  renderCart();

  const savedDrawer = document.createElement('aside');
  savedDrawer.className = 'saved-drawer';
  savedDrawer.setAttribute('aria-hidden', 'true');
  savedDrawer.innerHTML = '<div class="saved-head"><div><small>COLLECTOR SHORTLIST</small><strong>Saved finds</strong></div><button type="button" data-saved-close aria-label="Close saved finds">×</button></div><div class="saved-items" data-saved-items></div><div class="saved-foot">Saved locally in this browser. Pricing will appear only when finalized.</div>';
  document.body.appendChild(savedDrawer);

  const normalizeSaved = items => (Array.isArray(items) ? items : [])
    .filter(item => item && item.id && item.name && !retiredSavedIds.has(String(item.id)))
    .map(item => ({ id:String(item.id), name:String(item.name), url:item.url || 'shop.html', image:item.image || '' }));
  const readSaved = () => normalizeSaved(safeParse(savedKey));
  const writeSaved = items => localStorage.setItem(savedKey, JSON.stringify(normalizeSaved(items)));

  const renderSaved = () => {
    const saved = readSaved();
    writeSaved(saved);
    document.querySelectorAll('[data-saved-count]').forEach(el => el.textContent = String(saved.length));
    document.querySelectorAll('[data-save-item]').forEach(btn => {
      const isSaved = saved.some(item => item.id === btn.dataset.id);
      btn.classList.toggle('is-saved', isSaved);
      if (btn.classList.contains('save-fab')) btn.textContent = isSaved ? '♥' : '♡';
      else if (btn.classList.contains('large-save')) btn.textContent = isSaved ? '♥ Saved find' : '♡ Save this find';
      else if (btn.classList.contains('dossier-save')) btn.textContent = isSaved ? '♥ Saved find' : '♡ Save find';
      btn.setAttribute('aria-pressed', String(isSaved));
    });

    const container = savedDrawer.querySelector('[data-saved-items]');
    if (!saved.length) {
      container.innerHTML = '<div class="empty-cart"><strong>No saved finds yet.</strong><p>Save confirmed inventory and it will stay here in this browser.</p></div>';
      return;
    }
    container.innerHTML = saved.map(item =>
      '<div class="saved-line">' +
        '<div class="saved-thumb">' + (item.image ? '<img src="' + item.image + '" alt="">' : 'BJ2U') + '</div>' +
        '<div><strong>' + item.name + '</strong><span>Price pending</span></div>' +
        '<div class="saved-line-actions"><a href="' + item.url + '">View →</a><button type="button" data-remove-saved="' + item.id + '">Remove</button></div>' +
      '</div>'
    ).join('');
    container.querySelectorAll('[data-remove-saved]').forEach(btn => btn.addEventListener('click', () => {
      writeSaved(readSaved().filter(item => item.id !== btn.dataset.removeSaved));
      renderSaved();
    }));
  };

  document.addEventListener('click', event => {
    const saveButton = event.target.closest('[data-save-item]');
    if (saveButton) {
      const saved = readSaved();
      const id = saveButton.dataset.id;
      const existing = saved.findIndex(item => item.id === id);
      if (existing >= 0) {
        saved.splice(existing, 1);
        toast('Removed from saved finds.');
      } else {
        saved.push({ id, name:saveButton.dataset.name || 'Saved find', url:saveButton.dataset.url || 'shop.html', image:saveButton.dataset.image || '' });
        toast('Saved to your collector shortlist.');
      }
      writeSaved(saved);
      renderSaved();
    }
    if (event.target.closest('[data-saved-open]')) {
      closeOverlays();
      openOverlay(savedDrawer);
    }
    if (event.target.closest('[data-saved-close]')) closeOverlays();
  });
  renderSaved();

  const cards = [...document.querySelectorAll('[data-product-card]')];
  const grid = document.querySelector('[data-product-grid]');
  const search = document.querySelector('[data-product-search]');
  const filters = [...document.querySelectorAll('[data-filter]')];
  const sort = document.querySelector('[data-sort-products]');
  const resultCount = document.querySelector('[data-result-count]');
  const noResults = document.querySelector('[data-no-results]');
  let activeFilter = new URLSearchParams(location.search).get('category') || 'all';
  const validFilters = new Set(['all', ...filters.map(btn => btn.dataset.filter)]);
  if (!validFilters.has(activeFilter)) activeFilter = 'all';

  const sortCards = () => {
    if (!grid || !sort) return;
    const mode = sort.value;
    const ordered = [...cards].sort((a,b) => mode === 'name'
      ? String(a.dataset.name).localeCompare(String(b.dataset.name))
      : cards.indexOf(a) - cards.indexOf(b));
    ordered.forEach(card => grid.appendChild(card));
  };

  const applyFilters = () => {
    const query = (search?.value || '').trim().toLowerCase();
    let visible = 0;
    cards.forEach(card => {
      const categories = (card.dataset.category || '').split(' ');
      const searchable = (card.dataset.search || '').toLowerCase();
      const show = (activeFilter === 'all' || categories.includes(activeFilter)) && (!query || searchable.includes(query));
      card.hidden = !show;
      if (show) visible++;
    });
    if (resultCount) resultCount.textContent = visible + (visible === 1 ? ' confirmed item' : ' confirmed items');
    if (noResults) noResults.hidden = visible !== 0;
    filters.forEach(btn => btn.classList.toggle('active', btn.dataset.filter === activeFilter));
  };

  filters.forEach(btn => btn.addEventListener('click', () => {
    activeFilter = btn.dataset.filter;
    history.replaceState({}, '', activeFilter === 'all' ? 'shop.html' : 'shop.html?category=' + encodeURIComponent(activeFilter));
    applyFilters();
  }));
  search?.addEventListener('input', applyFilters);
  sort?.addEventListener('change', sortCards);
  document.querySelectorAll('[data-view]').forEach(btn => btn.addEventListener('click', () => {
    document.querySelectorAll('[data-view]').forEach(item => item.classList.toggle('active', item === btn));
    grid?.classList.toggle('list-view', btn.dataset.view === 'list');
  }));
  if (cards.length) { sortCards(); applyFilters(); }

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
      const lines = ['Hi Bringing Japan 2 U,','','I would like to request a Japan find:','','Product: ' + product,'Series / brand: ' + String(form.get('series') || ''),'Budget: ' + String(form.get('budget') || ''),'Country: ' + String(form.get('country') || ''),'Name: ' + String(form.get('name') || ''),'','Details:',String(form.get('details') || ''),'','I understand this is a sourcing request, not a confirmed order.'];
      location.href = 'mailto:bringingjapantoyou@gmail.com?subject=' + encodeURIComponent('Japan Find Request — ' + product) + '&body=' + encodeURIComponent(lines.join('\n'));
    });
  }

  if (!document.querySelector('.mobile-dock')) {
    const dock = document.createElement('nav');
    dock.className = 'mobile-dock';
    dock.setAttribute('aria-label', 'Mobile quick navigation');
    dock.innerHTML = '<a href="index.html"><b>⌂</b><span>Home</span></a><a href="shop.html"><b>⌕</b><span>Inventory</span></a><button type="button" data-saved-open><b>♡</b><span>Saved</span></button><button type="button" data-cart-open><b>?</b><span>Inquiry</span></button>';
    document.body.appendChild(dock);
    dock.querySelector('[data-saved-open]').addEventListener('click', () => { closeOverlays(); openOverlay(savedDrawer); });
    dock.querySelector('[data-cart-open]').addEventListener('click', () => openOverlay(drawer));
  }

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduceMotion && 'IntersectionObserver' in window) {
    const revealTargets = [...document.querySelectorAll('main > section, .radar-card, .product-card, .tool-card, .inventory-slot')];
    revealTargets.forEach(el => el.classList.add('reveal-ready'));
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    }), { threshold:.07, rootMargin:'0px 0px -20px 0px' });
    revealTargets.forEach(el => observer.observe(el));
  }
})(); + item.price.toFixed(2) : 'Price pending') + '</span></div>' +
        '<div class="saved-line-actions"><a href="' + item.url + '">View →</a><button type="button" data-remove-saved="' + item.id + '">Remove</button></div>' +
      '</div>'
    ).join('');
    container.querySelectorAll('[data-remove-saved]').forEach(btn => btn.addEventListener('click', () => {
      writeSaved(readSaved().filter(item => item.id !== btn.dataset.removeSaved));
      renderSaved();
    }));
  };

  document.addEventListener('click', event => {
    const saveButton = event.target.closest('[data-save-item]');
    if (saveButton) {
      const saved = readSaved();
      const id = saveButton.dataset.id;
      const existing = saved.findIndex(item => item.id === id);
      if (existing >= 0) {
        saved.splice(existing, 1);
        toast('Removed from saved finds.');
      } else {
        saved.push({ id, name:saveButton.dataset.name || 'Saved find', url:saveButton.dataset.url || 'shop.html', image:saveButton.dataset.image || '' });
        toast('Saved to your collector shortlist.');
      }
      writeSaved(saved);
      renderSaved();
    }
    if (event.target.closest('[data-saved-open]')) {
      closeOverlays();
      openOverlay(savedDrawer);
    }
    if (event.target.closest('[data-saved-close]')) closeOverlays();
  });
  renderSaved();

  const cards = [...document.querySelectorAll('[data-product-card]')];
  const grid = document.querySelector('[data-product-grid]');
  const search = document.querySelector('[data-product-search]');
  const filters = [...document.querySelectorAll('[data-filter]')];
  const sort = document.querySelector('[data-sort-products]');
  const resultCount = document.querySelector('[data-result-count]');
  const noResults = document.querySelector('[data-no-results]');
  let activeFilter = new URLSearchParams(location.search).get('category') || 'all';
  const validFilters = new Set(['all', ...filters.map(btn => btn.dataset.filter)]);
  if (!validFilters.has(activeFilter)) activeFilter = 'all';

  const sortCards = () => {
    if (!grid || !sort) return;
    const mode = sort.value;
    const ordered = [...cards].sort((a,b) => mode === 'name'
      ? String(a.dataset.name).localeCompare(String(b.dataset.name))
      : cards.indexOf(a) - cards.indexOf(b));
    ordered.forEach(card => grid.appendChild(card));
  };

  const applyFilters = () => {
    const query = (search?.value || '').trim().toLowerCase();
    let visible = 0;
    cards.forEach(card => {
      const categories = (card.dataset.category || '').split(' ');
      const searchable = (card.dataset.search || '').toLowerCase();
      const show = (activeFilter === 'all' || categories.includes(activeFilter)) && (!query || searchable.includes(query));
      card.hidden = !show;
      if (show) visible++;
    });
    if (resultCount) resultCount.textContent = visible + (visible === 1 ? ' confirmed item' : ' confirmed items');
    if (noResults) noResults.hidden = visible !== 0;
    filters.forEach(btn => btn.classList.toggle('active', btn.dataset.filter === activeFilter));
  };

  filters.forEach(btn => btn.addEventListener('click', () => {
    activeFilter = btn.dataset.filter;
    history.replaceState({}, '', activeFilter === 'all' ? 'shop.html' : 'shop.html?category=' + encodeURIComponent(activeFilter));
    applyFilters();
  }));
  search?.addEventListener('input', applyFilters);
  sort?.addEventListener('change', sortCards);
  document.querySelectorAll('[data-view]').forEach(btn => btn.addEventListener('click', () => {
    document.querySelectorAll('[data-view]').forEach(item => item.classList.toggle('active', item === btn));
    grid?.classList.toggle('list-view', btn.dataset.view === 'list');
  }));
  if (cards.length) { sortCards(); applyFilters(); }

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
      const lines = ['Hi Bringing Japan 2 U,','','I would like to request a Japan find:','','Product: ' + product,'Series / brand: ' + String(form.get('series') || ''),'Budget: ' + String(form.get('budget') || ''),'Country: ' + String(form.get('country') || ''),'Name: ' + String(form.get('name') || ''),'','Details:',String(form.get('details') || ''),'','I understand this is a sourcing request, not a confirmed order.'];
      location.href = 'mailto:bringingjapantoyou@gmail.com?subject=' + encodeURIComponent('Japan Find Request — ' + product) + '&body=' + encodeURIComponent(lines.join('\n'));
    });
  }

  if (!document.querySelector('.mobile-dock')) {
    const dock = document.createElement('nav');
    dock.className = 'mobile-dock';
    dock.setAttribute('aria-label', 'Mobile quick navigation');
    dock.innerHTML = '<a href="index.html"><b>⌂</b><span>Home</span></a><a href="shop.html"><b>⌕</b><span>Inventory</span></a><button type="button" data-saved-open><b>♡</b><span>Saved</span></button><button type="button" data-cart-open><b>?</b><span>Inquiry</span></button>';
    document.body.appendChild(dock);
    dock.querySelector('[data-saved-open]').addEventListener('click', () => { closeOverlays(); openOverlay(savedDrawer); });
    dock.querySelector('[data-cart-open]').addEventListener('click', () => openOverlay(drawer));
  }

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduceMotion && 'IntersectionObserver' in window) {
    const revealTargets = [...document.querySelectorAll('main > section, .radar-card, .product-card, .tool-card, .inventory-slot')];
    revealTargets.forEach(el => el.classList.add('reveal-ready'));
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    }), { threshold:.07, rootMargin:'0px 0px -20px 0px' });
    revealTargets.forEach(el => observer.observe(el));
  }
})(); + item.price.toFixed(2) + ' each' : 'Price pending') + '</span></div>' +
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

    if (totalEl) totalEl.textContent = 'Pricing pending';
    if (inquiryButton) inquiryButton.disabled = false;

    itemsEl.querySelectorAll('[data-qty-index]').forEach(btn => btn.addEventListener('click', () => {
      const next = readCart();
      const index = Number(btn.dataset.qtyIndex);
      const delta = Number(btn.dataset.delta);
      if (!next[index]) return;
      next[index].qty += delta;
      if (next[index].qty <= 0) next.splice(index, 1);
      writeCart(next);
      renderCart();
    }));

    itemsEl.querySelectorAll('[data-remove-index]').forEach(btn => btn.addEventListener('click', () => {
      const next = readCart();
      next.splice(Number(btn.dataset.removeIndex), 1);
      writeCart(next);
      renderCart();
    }));
  };

  document.querySelectorAll('[data-add-cart]').forEach(button => button.addEventListener('click', () => {
    const cart = readCart();
    const name = String(button.dataset.name || '');
    if (!name) return;
    const match = cart.find(item => item.name === name);
    if (match) match.qty += 1;
    else cart.push({ name, qty: 1 });
    writeCart(cart);
    renderCart();
    openOverlay(drawer);
    toast('Added to your availability inquiry.');
  }));

  document.querySelectorAll('[data-cart-open]').forEach(button => button.addEventListener('click', () => openOverlay(drawer)));
  document.querySelectorAll('[data-cart-close]').forEach(button => button.addEventListener('click', closeOverlays));
  backdrop?.addEventListener('click', closeOverlays);
  document.addEventListener('keydown', event => { if (event.key === 'Escape') closeOverlays(); });

  inquiryButton?.addEventListener('click', () => {
    const cart = readCart();
    if (!cart.length) return;
    const lines = ['Hi Bringing Japan 2 U,', '', 'I’m interested in availability for:', ''];
    cart.forEach(item => lines.push('- ' + item.qty + ' × ' + item.name));
    lines.push('', 'I understand pricing and checkout are not live yet. Please let me know when details are available.');
    location.href = 'mailto:bringingjapantoyou@gmail.com?subject=' + encodeURIComponent('Inventory Availability Inquiry') + '&body=' + encodeURIComponent(lines.join('\n'));
  });
  renderCart();

  const savedDrawer = document.createElement('aside');
  savedDrawer.className = 'saved-drawer';
  savedDrawer.setAttribute('aria-hidden', 'true');
  savedDrawer.innerHTML = '<div class="saved-head"><div><small>COLLECTOR SHORTLIST</small><strong>Saved finds</strong></div><button type="button" data-saved-close aria-label="Close saved finds">×</button></div><div class="saved-items" data-saved-items></div><div class="saved-foot">Saved locally in this browser. Pricing will appear only when finalized.</div>';
  document.body.appendChild(savedDrawer);

  const normalizeSaved = items => (Array.isArray(items) ? items : [])
    .filter(item => item && item.id && item.name && !retiredSavedIds.has(String(item.id)))
    .map(item => ({ id:String(item.id), name:String(item.name), url:item.url || 'shop.html', image:item.image || '' }));
  const readSaved = () => normalizeSaved(safeParse(savedKey));
  const writeSaved = items => localStorage.setItem(savedKey, JSON.stringify(normalizeSaved(items)));

  const renderSaved = () => {
    const saved = readSaved();
    writeSaved(saved);
    document.querySelectorAll('[data-saved-count]').forEach(el => el.textContent = String(saved.length));
    document.querySelectorAll('[data-save-item]').forEach(btn => {
      const isSaved = saved.some(item => item.id === btn.dataset.id);
      btn.classList.toggle('is-saved', isSaved);
      if (btn.classList.contains('save-fab')) btn.textContent = isSaved ? '♥' : '♡';
      else if (btn.classList.contains('large-save')) btn.textContent = isSaved ? '♥ Saved find' : '♡ Save this find';
      else if (btn.classList.contains('dossier-save')) btn.textContent = isSaved ? '♥ Saved find' : '♡ Save find';
      btn.setAttribute('aria-pressed', String(isSaved));
    });

    const container = savedDrawer.querySelector('[data-saved-items]');
    if (!saved.length) {
      container.innerHTML = '<div class="empty-cart"><strong>No saved finds yet.</strong><p>Save confirmed inventory and it will stay here in this browser.</p></div>';
      return;
    }
    container.innerHTML = saved.map(item =>
      '<div class="saved-line">' +
        '<div class="saved-thumb">' + (item.image ? '<img src="' + item.image + '" alt="">' : 'BJ2U') + '</div>' +
        '<div><strong>' + item.name + '</strong><span>Price pending</span></div>' +
        '<div class="saved-line-actions"><a href="' + item.url + '">View →</a><button type="button" data-remove-saved="' + item.id + '">Remove</button></div>' +
      '</div>'
    ).join('');
    container.querySelectorAll('[data-remove-saved]').forEach(btn => btn.addEventListener('click', () => {
      writeSaved(readSaved().filter(item => item.id !== btn.dataset.removeSaved));
      renderSaved();
    }));
  };

  document.addEventListener('click', event => {
    const saveButton = event.target.closest('[data-save-item]');
    if (saveButton) {
      const saved = readSaved();
      const id = saveButton.dataset.id;
      const existing = saved.findIndex(item => item.id === id);
      if (existing >= 0) {
        saved.splice(existing, 1);
        toast('Removed from saved finds.');
      } else {
        saved.push({ id, name:saveButton.dataset.name || 'Saved find', url:saveButton.dataset.url || 'shop.html', image:saveButton.dataset.image || '' });
        toast('Saved to your collector shortlist.');
      }
      writeSaved(saved);
      renderSaved();
    }
    if (event.target.closest('[data-saved-open]')) {
      closeOverlays();
      openOverlay(savedDrawer);
    }
    if (event.target.closest('[data-saved-close]')) closeOverlays();
  });
  renderSaved();

  const cards = [...document.querySelectorAll('[data-product-card]')];
  const grid = document.querySelector('[data-product-grid]');
  const search = document.querySelector('[data-product-search]');
  const filters = [...document.querySelectorAll('[data-filter]')];
  const sort = document.querySelector('[data-sort-products]');
  const resultCount = document.querySelector('[data-result-count]');
  const noResults = document.querySelector('[data-no-results]');
  let activeFilter = new URLSearchParams(location.search).get('category') || 'all';
  const validFilters = new Set(['all', ...filters.map(btn => btn.dataset.filter)]);
  if (!validFilters.has(activeFilter)) activeFilter = 'all';

  const sortCards = () => {
    if (!grid || !sort) return;
    const mode = sort.value;
    const ordered = [...cards].sort((a,b) => mode === 'name'
      ? String(a.dataset.name).localeCompare(String(b.dataset.name))
      : cards.indexOf(a) - cards.indexOf(b));
    ordered.forEach(card => grid.appendChild(card));
  };

  const applyFilters = () => {
    const query = (search?.value || '').trim().toLowerCase();
    let visible = 0;
    cards.forEach(card => {
      const categories = (card.dataset.category || '').split(' ');
      const searchable = (card.dataset.search || '').toLowerCase();
      const show = (activeFilter === 'all' || categories.includes(activeFilter)) && (!query || searchable.includes(query));
      card.hidden = !show;
      if (show) visible++;
    });
    if (resultCount) resultCount.textContent = visible + (visible === 1 ? ' confirmed item' : ' confirmed items');
    if (noResults) noResults.hidden = visible !== 0;
    filters.forEach(btn => btn.classList.toggle('active', btn.dataset.filter === activeFilter));
  };

  filters.forEach(btn => btn.addEventListener('click', () => {
    activeFilter = btn.dataset.filter;
    history.replaceState({}, '', activeFilter === 'all' ? 'shop.html' : 'shop.html?category=' + encodeURIComponent(activeFilter));
    applyFilters();
  }));
  search?.addEventListener('input', applyFilters);
  sort?.addEventListener('change', sortCards);
  document.querySelectorAll('[data-view]').forEach(btn => btn.addEventListener('click', () => {
    document.querySelectorAll('[data-view]').forEach(item => item.classList.toggle('active', item === btn));
    grid?.classList.toggle('list-view', btn.dataset.view === 'list');
  }));
  if (cards.length) { sortCards(); applyFilters(); }

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
      const lines = ['Hi Bringing Japan 2 U,','','I would like to request a Japan find:','','Product: ' + product,'Series / brand: ' + String(form.get('series') || ''),'Budget: ' + String(form.get('budget') || ''),'Country: ' + String(form.get('country') || ''),'Name: ' + String(form.get('name') || ''),'','Details:',String(form.get('details') || ''),'','I understand this is a sourcing request, not a confirmed order.'];
      location.href = 'mailto:bringingjapantoyou@gmail.com?subject=' + encodeURIComponent('Japan Find Request — ' + product) + '&body=' + encodeURIComponent(lines.join('\n'));
    });
  }

  if (!document.querySelector('.mobile-dock')) {
    const dock = document.createElement('nav');
    dock.className = 'mobile-dock';
    dock.setAttribute('aria-label', 'Mobile quick navigation');
    dock.innerHTML = '<a href="index.html"><b>⌂</b><span>Home</span></a><a href="shop.html"><b>⌕</b><span>Inventory</span></a><button type="button" data-saved-open><b>♡</b><span>Saved</span></button><button type="button" data-cart-open><b>?</b><span>Inquiry</span></button>';
    document.body.appendChild(dock);
    dock.querySelector('[data-saved-open]').addEventListener('click', () => { closeOverlays(); openOverlay(savedDrawer); });
    dock.querySelector('[data-cart-open]').addEventListener('click', () => openOverlay(drawer));
  }

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduceMotion && 'IntersectionObserver' in window) {
    const revealTargets = [...document.querySelectorAll('main > section, .radar-card, .product-card, .tool-card, .inventory-slot')];
    revealTargets.forEach(el => el.classList.add('reveal-ready'));
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    }), { threshold:.07, rootMargin:'0px 0px -20px 0px' });
    revealTargets.forEach(el => observer.observe(el));
  }
})(); + pricedSubtotal.toFixed(2) + ' + pending' : 'Pricing pending')
      : '

    itemsEl.querySelectorAll('[data-qty-index]').forEach(btn => btn.addEventListener('click', () => {
      const next = readCart();
      const index = Number(btn.dataset.qtyIndex);
      const delta = Number(btn.dataset.delta);
      if (!next[index]) return;
      next[index].qty += delta;
      if (next[index].qty <= 0) next.splice(index, 1);
      writeCart(next);
      renderCart();
    }));

    itemsEl.querySelectorAll('[data-remove-index]').forEach(btn => btn.addEventListener('click', () => {
      const next = readCart();
      next.splice(Number(btn.dataset.removeIndex), 1);
      writeCart(next);
      renderCart();
    }));
  };

  document.querySelectorAll('[data-add-cart]').forEach(button => button.addEventListener('click', () => {
    const cart = readCart();
    const name = String(button.dataset.name || '');
    if (!name) return;
    const match = cart.find(item => item.name === name);
    if (match) match.qty += 1;
    else cart.push({ name, qty: 1 });
    writeCart(cart);
    renderCart();
    openOverlay(drawer);
    toast('Added to your availability inquiry.');
  }));

  document.querySelectorAll('[data-cart-open]').forEach(button => button.addEventListener('click', () => openOverlay(drawer)));
  document.querySelectorAll('[data-cart-close]').forEach(button => button.addEventListener('click', closeOverlays));
  backdrop?.addEventListener('click', closeOverlays);
  document.addEventListener('keydown', event => { if (event.key === 'Escape') closeOverlays(); });

  inquiryButton?.addEventListener('click', () => {
    const cart = readCart();
    if (!cart.length) return;
    const lines = ['Hi Bringing Japan 2 U,', '', 'I’m interested in availability for:', ''];
    cart.forEach(item => lines.push('- ' + item.qty + ' × ' + item.name));
    lines.push('', 'I understand pricing and checkout are not live yet. Please let me know when details are available.');
    location.href = 'mailto:bringingjapantoyou@gmail.com?subject=' + encodeURIComponent('Inventory Availability Inquiry') + '&body=' + encodeURIComponent(lines.join('\n'));
  });
  renderCart();

  const savedDrawer = document.createElement('aside');
  savedDrawer.className = 'saved-drawer';
  savedDrawer.setAttribute('aria-hidden', 'true');
  savedDrawer.innerHTML = '<div class="saved-head"><div><small>COLLECTOR SHORTLIST</small><strong>Saved finds</strong></div><button type="button" data-saved-close aria-label="Close saved finds">×</button></div><div class="saved-items" data-saved-items></div><div class="saved-foot">Saved locally in this browser. Pricing will appear only when finalized.</div>';
  document.body.appendChild(savedDrawer);

  const normalizeSaved = items => (Array.isArray(items) ? items : [])
    .filter(item => item && item.id && item.name && !retiredSavedIds.has(String(item.id)))
    .map(item => ({ id:String(item.id), name:String(item.name), url:item.url || 'shop.html', image:item.image || '' }));
  const readSaved = () => normalizeSaved(safeParse(savedKey));
  const writeSaved = items => localStorage.setItem(savedKey, JSON.stringify(normalizeSaved(items)));

  const renderSaved = () => {
    const saved = readSaved();
    writeSaved(saved);
    document.querySelectorAll('[data-saved-count]').forEach(el => el.textContent = String(saved.length));
    document.querySelectorAll('[data-save-item]').forEach(btn => {
      const isSaved = saved.some(item => item.id === btn.dataset.id);
      btn.classList.toggle('is-saved', isSaved);
      if (btn.classList.contains('save-fab')) btn.textContent = isSaved ? '♥' : '♡';
      else if (btn.classList.contains('large-save')) btn.textContent = isSaved ? '♥ Saved find' : '♡ Save this find';
      else if (btn.classList.contains('dossier-save')) btn.textContent = isSaved ? '♥ Saved find' : '♡ Save find';
      btn.setAttribute('aria-pressed', String(isSaved));
    });

    const container = savedDrawer.querySelector('[data-saved-items]');
    if (!saved.length) {
      container.innerHTML = '<div class="empty-cart"><strong>No saved finds yet.</strong><p>Save confirmed inventory and it will stay here in this browser.</p></div>';
      return;
    }
    container.innerHTML = saved.map(item =>
      '<div class="saved-line">' +
        '<div class="saved-thumb">' + (item.image ? '<img src="' + item.image + '" alt="">' : 'BJ2U') + '</div>' +
        '<div><strong>' + item.name + '</strong><span>Price pending</span></div>' +
        '<div class="saved-line-actions"><a href="' + item.url + '">View →</a><button type="button" data-remove-saved="' + item.id + '">Remove</button></div>' +
      '</div>'
    ).join('');
    container.querySelectorAll('[data-remove-saved]').forEach(btn => btn.addEventListener('click', () => {
      writeSaved(readSaved().filter(item => item.id !== btn.dataset.removeSaved));
      renderSaved();
    }));
  };

  document.addEventListener('click', event => {
    const saveButton = event.target.closest('[data-save-item]');
    if (saveButton) {
      const saved = readSaved();
      const id = saveButton.dataset.id;
      const existing = saved.findIndex(item => item.id === id);
      if (existing >= 0) {
        saved.splice(existing, 1);
        toast('Removed from saved finds.');
      } else {
        saved.push({ id, name:saveButton.dataset.name || 'Saved find', url:saveButton.dataset.url || 'shop.html', image:saveButton.dataset.image || '' });
        toast('Saved to your collector shortlist.');
      }
      writeSaved(saved);
      renderSaved();
    }
    if (event.target.closest('[data-saved-open]')) {
      closeOverlays();
      openOverlay(savedDrawer);
    }
    if (event.target.closest('[data-saved-close]')) closeOverlays();
  });
  renderSaved();

  const cards = [...document.querySelectorAll('[data-product-card]')];
  const grid = document.querySelector('[data-product-grid]');
  const search = document.querySelector('[data-product-search]');
  const filters = [...document.querySelectorAll('[data-filter]')];
  const sort = document.querySelector('[data-sort-products]');
  const resultCount = document.querySelector('[data-result-count]');
  const noResults = document.querySelector('[data-no-results]');
  let activeFilter = new URLSearchParams(location.search).get('category') || 'all';
  const validFilters = new Set(['all', ...filters.map(btn => btn.dataset.filter)]);
  if (!validFilters.has(activeFilter)) activeFilter = 'all';

  const sortCards = () => {
    if (!grid || !sort) return;
    const mode = sort.value;
    const ordered = [...cards].sort((a,b) => mode === 'name'
      ? String(a.dataset.name).localeCompare(String(b.dataset.name))
      : cards.indexOf(a) - cards.indexOf(b));
    ordered.forEach(card => grid.appendChild(card));
  };

  const applyFilters = () => {
    const query = (search?.value || '').trim().toLowerCase();
    let visible = 0;
    cards.forEach(card => {
      const categories = (card.dataset.category || '').split(' ');
      const searchable = (card.dataset.search || '').toLowerCase();
      const show = (activeFilter === 'all' || categories.includes(activeFilter)) && (!query || searchable.includes(query));
      card.hidden = !show;
      if (show) visible++;
    });
    if (resultCount) resultCount.textContent = visible + (visible === 1 ? ' confirmed item' : ' confirmed items');
    if (noResults) noResults.hidden = visible !== 0;
    filters.forEach(btn => btn.classList.toggle('active', btn.dataset.filter === activeFilter));
  };

  filters.forEach(btn => btn.addEventListener('click', () => {
    activeFilter = btn.dataset.filter;
    history.replaceState({}, '', activeFilter === 'all' ? 'shop.html' : 'shop.html?category=' + encodeURIComponent(activeFilter));
    applyFilters();
  }));
  search?.addEventListener('input', applyFilters);
  sort?.addEventListener('change', sortCards);
  document.querySelectorAll('[data-view]').forEach(btn => btn.addEventListener('click', () => {
    document.querySelectorAll('[data-view]').forEach(item => item.classList.toggle('active', item === btn));
    grid?.classList.toggle('list-view', btn.dataset.view === 'list');
  }));
  if (cards.length) { sortCards(); applyFilters(); }

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
      const lines = ['Hi Bringing Japan 2 U,','','I would like to request a Japan find:','','Product: ' + product,'Series / brand: ' + String(form.get('series') || ''),'Budget: ' + String(form.get('budget') || ''),'Country: ' + String(form.get('country') || ''),'Name: ' + String(form.get('name') || ''),'','Details:',String(form.get('details') || ''),'','I understand this is a sourcing request, not a confirmed order.'];
      location.href = 'mailto:bringingjapantoyou@gmail.com?subject=' + encodeURIComponent('Japan Find Request — ' + product) + '&body=' + encodeURIComponent(lines.join('\n'));
    });
  }

  if (!document.querySelector('.mobile-dock')) {
    const dock = document.createElement('nav');
    dock.className = 'mobile-dock';
    dock.setAttribute('aria-label', 'Mobile quick navigation');
    dock.innerHTML = '<a href="index.html"><b>⌂</b><span>Home</span></a><a href="shop.html"><b>⌕</b><span>Inventory</span></a><button type="button" data-saved-open><b>♡</b><span>Saved</span></button><button type="button" data-cart-open><b>?</b><span>Inquiry</span></button>';
    document.body.appendChild(dock);
    dock.querySelector('[data-saved-open]').addEventListener('click', () => { closeOverlays(); openOverlay(savedDrawer); });
    dock.querySelector('[data-cart-open]').addEventListener('click', () => openOverlay(drawer));
  }

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduceMotion && 'IntersectionObserver' in window) {
    const revealTargets = [...document.querySelectorAll('main > section, .radar-card, .product-card, .tool-card, .inventory-slot')];
    revealTargets.forEach(el => el.classList.add('reveal-ready'));
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    }), { threshold:.07, rootMargin:'0px 0px -20px 0px' });
    revealTargets.forEach(el => observer.observe(el));
  }
})(); + item.price.toFixed(2) + ' each' : 'Price pending') + '</span></div>' +
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

    if (totalEl) totalEl.textContent = 'Pricing pending';
    if (inquiryButton) inquiryButton.disabled = false;

    itemsEl.querySelectorAll('[data-qty-index]').forEach(btn => btn.addEventListener('click', () => {
      const next = readCart();
      const index = Number(btn.dataset.qtyIndex);
      const delta = Number(btn.dataset.delta);
      if (!next[index]) return;
      next[index].qty += delta;
      if (next[index].qty <= 0) next.splice(index, 1);
      writeCart(next);
      renderCart();
    }));

    itemsEl.querySelectorAll('[data-remove-index]').forEach(btn => btn.addEventListener('click', () => {
      const next = readCart();
      next.splice(Number(btn.dataset.removeIndex), 1);
      writeCart(next);
      renderCart();
    }));
  };

  document.querySelectorAll('[data-add-cart]').forEach(button => button.addEventListener('click', () => {
    const cart = readCart();
    const name = String(button.dataset.name || '');
    if (!name) return;
    const match = cart.find(item => item.name === name);
    if (match) match.qty += 1;
    else cart.push({ name, qty: 1 });
    writeCart(cart);
    renderCart();
    openOverlay(drawer);
    toast('Added to your availability inquiry.');
  }));

  document.querySelectorAll('[data-cart-open]').forEach(button => button.addEventListener('click', () => openOverlay(drawer)));
  document.querySelectorAll('[data-cart-close]').forEach(button => button.addEventListener('click', closeOverlays));
  backdrop?.addEventListener('click', closeOverlays);
  document.addEventListener('keydown', event => { if (event.key === 'Escape') closeOverlays(); });

  inquiryButton?.addEventListener('click', () => {
    const cart = readCart();
    if (!cart.length) return;
    const lines = ['Hi Bringing Japan 2 U,', '', 'I’m interested in availability for:', ''];
    cart.forEach(item => lines.push('- ' + item.qty + ' × ' + item.name));
    lines.push('', 'I understand pricing and checkout are not live yet. Please let me know when details are available.');
    location.href = 'mailto:bringingjapantoyou@gmail.com?subject=' + encodeURIComponent('Inventory Availability Inquiry') + '&body=' + encodeURIComponent(lines.join('\n'));
  });
  renderCart();

  const savedDrawer = document.createElement('aside');
  savedDrawer.className = 'saved-drawer';
  savedDrawer.setAttribute('aria-hidden', 'true');
  savedDrawer.innerHTML = '<div class="saved-head"><div><small>COLLECTOR SHORTLIST</small><strong>Saved finds</strong></div><button type="button" data-saved-close aria-label="Close saved finds">×</button></div><div class="saved-items" data-saved-items></div><div class="saved-foot">Saved locally in this browser. Pricing will appear only when finalized.</div>';
  document.body.appendChild(savedDrawer);

  const normalizeSaved = items => (Array.isArray(items) ? items : [])
    .filter(item => item && item.id && item.name && !retiredSavedIds.has(String(item.id)))
    .map(item => ({ id:String(item.id), name:String(item.name), url:item.url || 'shop.html', image:item.image || '' }));
  const readSaved = () => normalizeSaved(safeParse(savedKey));
  const writeSaved = items => localStorage.setItem(savedKey, JSON.stringify(normalizeSaved(items)));

  const renderSaved = () => {
    const saved = readSaved();
    writeSaved(saved);
    document.querySelectorAll('[data-saved-count]').forEach(el => el.textContent = String(saved.length));
    document.querySelectorAll('[data-save-item]').forEach(btn => {
      const isSaved = saved.some(item => item.id === btn.dataset.id);
      btn.classList.toggle('is-saved', isSaved);
      if (btn.classList.contains('save-fab')) btn.textContent = isSaved ? '♥' : '♡';
      else if (btn.classList.contains('large-save')) btn.textContent = isSaved ? '♥ Saved find' : '♡ Save this find';
      else if (btn.classList.contains('dossier-save')) btn.textContent = isSaved ? '♥ Saved find' : '♡ Save find';
      btn.setAttribute('aria-pressed', String(isSaved));
    });

    const container = savedDrawer.querySelector('[data-saved-items]');
    if (!saved.length) {
      container.innerHTML = '<div class="empty-cart"><strong>No saved finds yet.</strong><p>Save confirmed inventory and it will stay here in this browser.</p></div>';
      return;
    }
    container.innerHTML = saved.map(item =>
      '<div class="saved-line">' +
        '<div class="saved-thumb">' + (item.image ? '<img src="' + item.image + '" alt="">' : 'BJ2U') + '</div>' +
        '<div><strong>' + item.name + '</strong><span>Price pending</span></div>' +
        '<div class="saved-line-actions"><a href="' + item.url + '">View →</a><button type="button" data-remove-saved="' + item.id + '">Remove</button></div>' +
      '</div>'
    ).join('');
    container.querySelectorAll('[data-remove-saved]').forEach(btn => btn.addEventListener('click', () => {
      writeSaved(readSaved().filter(item => item.id !== btn.dataset.removeSaved));
      renderSaved();
    }));
  };

  document.addEventListener('click', event => {
    const saveButton = event.target.closest('[data-save-item]');
    if (saveButton) {
      const saved = readSaved();
      const id = saveButton.dataset.id;
      const existing = saved.findIndex(item => item.id === id);
      if (existing >= 0) {
        saved.splice(existing, 1);
        toast('Removed from saved finds.');
      } else {
        saved.push({ id, name:saveButton.dataset.name || 'Saved find', url:saveButton.dataset.url || 'shop.html', image:saveButton.dataset.image || '' });
        toast('Saved to your collector shortlist.');
      }
      writeSaved(saved);
      renderSaved();
    }
    if (event.target.closest('[data-saved-open]')) {
      closeOverlays();
      openOverlay(savedDrawer);
    }
    if (event.target.closest('[data-saved-close]')) closeOverlays();
  });
  renderSaved();

  const cards = [...document.querySelectorAll('[data-product-card]')];
  const grid = document.querySelector('[data-product-grid]');
  const search = document.querySelector('[data-product-search]');
  const filters = [...document.querySelectorAll('[data-filter]')];
  const sort = document.querySelector('[data-sort-products]');
  const resultCount = document.querySelector('[data-result-count]');
  const noResults = document.querySelector('[data-no-results]');
  let activeFilter = new URLSearchParams(location.search).get('category') || 'all';
  const validFilters = new Set(['all', ...filters.map(btn => btn.dataset.filter)]);
  if (!validFilters.has(activeFilter)) activeFilter = 'all';

  const sortCards = () => {
    if (!grid || !sort) return;
    const mode = sort.value;
    const ordered = [...cards].sort((a,b) => mode === 'name'
      ? String(a.dataset.name).localeCompare(String(b.dataset.name))
      : cards.indexOf(a) - cards.indexOf(b));
    ordered.forEach(card => grid.appendChild(card));
  };

  const applyFilters = () => {
    const query = (search?.value || '').trim().toLowerCase();
    let visible = 0;
    cards.forEach(card => {
      const categories = (card.dataset.category || '').split(' ');
      const searchable = (card.dataset.search || '').toLowerCase();
      const show = (activeFilter === 'all' || categories.includes(activeFilter)) && (!query || searchable.includes(query));
      card.hidden = !show;
      if (show) visible++;
    });
    if (resultCount) resultCount.textContent = visible + (visible === 1 ? ' confirmed item' : ' confirmed items');
    if (noResults) noResults.hidden = visible !== 0;
    filters.forEach(btn => btn.classList.toggle('active', btn.dataset.filter === activeFilter));
  };

  filters.forEach(btn => btn.addEventListener('click', () => {
    activeFilter = btn.dataset.filter;
    history.replaceState({}, '', activeFilter === 'all' ? 'shop.html' : 'shop.html?category=' + encodeURIComponent(activeFilter));
    applyFilters();
  }));
  search?.addEventListener('input', applyFilters);
  sort?.addEventListener('change', sortCards);
  document.querySelectorAll('[data-view]').forEach(btn => btn.addEventListener('click', () => {
    document.querySelectorAll('[data-view]').forEach(item => item.classList.toggle('active', item === btn));
    grid?.classList.toggle('list-view', btn.dataset.view === 'list');
  }));
  if (cards.length) { sortCards(); applyFilters(); }

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
      const lines = ['Hi Bringing Japan 2 U,','','I would like to request a Japan find:','','Product: ' + product,'Series / brand: ' + String(form.get('series') || ''),'Budget: ' + String(form.get('budget') || ''),'Country: ' + String(form.get('country') || ''),'Name: ' + String(form.get('name') || ''),'','Details:',String(form.get('details') || ''),'','I understand this is a sourcing request, not a confirmed order.'];
      location.href = 'mailto:bringingjapantoyou@gmail.com?subject=' + encodeURIComponent('Japan Find Request — ' + product) + '&body=' + encodeURIComponent(lines.join('\n'));
    });
  }

  if (!document.querySelector('.mobile-dock')) {
    const dock = document.createElement('nav');
    dock.className = 'mobile-dock';
    dock.setAttribute('aria-label', 'Mobile quick navigation');
    dock.innerHTML = '<a href="index.html"><b>⌂</b><span>Home</span></a><a href="shop.html"><b>⌕</b><span>Inventory</span></a><button type="button" data-saved-open><b>♡</b><span>Saved</span></button><button type="button" data-cart-open><b>?</b><span>Inquiry</span></button>';
    document.body.appendChild(dock);
    dock.querySelector('[data-saved-open]').addEventListener('click', () => { closeOverlays(); openOverlay(savedDrawer); });
    dock.querySelector('[data-cart-open]').addEventListener('click', () => openOverlay(drawer));
  }

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduceMotion && 'IntersectionObserver' in window) {
    const revealTargets = [...document.querySelectorAll('main > section, .radar-card, .product-card, .tool-card, .inventory-slot')];
    revealTargets.forEach(el => el.classList.add('reveal-ready'));
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    }), { threshold:.07, rootMargin:'0px 0px -20px 0px' });
    revealTargets.forEach(el => observer.observe(el));
  }
})(); + pricedSubtotal.toFixed(2);
    if (inquiryButton) inquiryButton.disabled = false;

    itemsEl.querySelectorAll('[data-qty-index]').forEach(btn => btn.addEventListener('click', () => {
      const next = readCart();
      const index = Number(btn.dataset.qtyIndex);
      const delta = Number(btn.dataset.delta);
      if (!next[index]) return;
      next[index].qty += delta;
      if (next[index].qty <= 0) next.splice(index, 1);
      writeCart(next);
      renderCart();
    }));

    itemsEl.querySelectorAll('[data-remove-index]').forEach(btn => btn.addEventListener('click', () => {
      const next = readCart();
      next.splice(Number(btn.dataset.removeIndex), 1);
      writeCart(next);
      renderCart();
    }));
  };

  document.querySelectorAll('[data-add-cart]').forEach(button => button.addEventListener('click', () => {
    const cart = readCart();
    const name = String(button.dataset.name || '');
    if (!name) return;
    const match = cart.find(item => item.name === name);
    if (match) match.qty += 1;
    else cart.push({ name, qty: 1 });
    writeCart(cart);
    renderCart();
    openOverlay(drawer);
    toast('Added to your availability inquiry.');
  }));

  document.querySelectorAll('[data-cart-open]').forEach(button => button.addEventListener('click', () => openOverlay(drawer)));
  document.querySelectorAll('[data-cart-close]').forEach(button => button.addEventListener('click', closeOverlays));
  backdrop?.addEventListener('click', closeOverlays);
  document.addEventListener('keydown', event => { if (event.key === 'Escape') closeOverlays(); });

  inquiryButton?.addEventListener('click', () => {
    const cart = readCart();
    if (!cart.length) return;
    const lines = ['Hi Bringing Japan 2 U,', '', 'I’m interested in availability for:', ''];
    cart.forEach(item => lines.push('- ' + item.qty + ' × ' + item.name));
    lines.push('', 'I understand pricing and checkout are not live yet. Please let me know when details are available.');
    location.href = 'mailto:bringingjapantoyou@gmail.com?subject=' + encodeURIComponent('Inventory Availability Inquiry') + '&body=' + encodeURIComponent(lines.join('\n'));
  });
  renderCart();

  const savedDrawer = document.createElement('aside');
  savedDrawer.className = 'saved-drawer';
  savedDrawer.setAttribute('aria-hidden', 'true');
  savedDrawer.innerHTML = '<div class="saved-head"><div><small>COLLECTOR SHORTLIST</small><strong>Saved finds</strong></div><button type="button" data-saved-close aria-label="Close saved finds">×</button></div><div class="saved-items" data-saved-items></div><div class="saved-foot">Saved locally in this browser. Pricing will appear only when finalized.</div>';
  document.body.appendChild(savedDrawer);

  const normalizeSaved = items => (Array.isArray(items) ? items : [])
    .filter(item => item && item.id && item.name && !retiredSavedIds.has(String(item.id)))
    .map(item => ({ id:String(item.id), name:String(item.name), url:item.url || 'shop.html', image:item.image || '' }));
  const readSaved = () => normalizeSaved(safeParse(savedKey));
  const writeSaved = items => localStorage.setItem(savedKey, JSON.stringify(normalizeSaved(items)));

  const renderSaved = () => {
    const saved = readSaved();
    writeSaved(saved);
    document.querySelectorAll('[data-saved-count]').forEach(el => el.textContent = String(saved.length));
    document.querySelectorAll('[data-save-item]').forEach(btn => {
      const isSaved = saved.some(item => item.id === btn.dataset.id);
      btn.classList.toggle('is-saved', isSaved);
      if (btn.classList.contains('save-fab')) btn.textContent = isSaved ? '♥' : '♡';
      else if (btn.classList.contains('large-save')) btn.textContent = isSaved ? '♥ Saved find' : '♡ Save this find';
      else if (btn.classList.contains('dossier-save')) btn.textContent = isSaved ? '♥ Saved find' : '♡ Save find';
      btn.setAttribute('aria-pressed', String(isSaved));
    });

    const container = savedDrawer.querySelector('[data-saved-items]');
    if (!saved.length) {
      container.innerHTML = '<div class="empty-cart"><strong>No saved finds yet.</strong><p>Save confirmed inventory and it will stay here in this browser.</p></div>';
      return;
    }
    container.innerHTML = saved.map(item =>
      '<div class="saved-line">' +
        '<div class="saved-thumb">' + (item.image ? '<img src="' + item.image + '" alt="">' : 'BJ2U') + '</div>' +
        '<div><strong>' + item.name + '</strong><span>Price pending</span></div>' +
        '<div class="saved-line-actions"><a href="' + item.url + '">View →</a><button type="button" data-remove-saved="' + item.id + '">Remove</button></div>' +
      '</div>'
    ).join('');
    container.querySelectorAll('[data-remove-saved]').forEach(btn => btn.addEventListener('click', () => {
      writeSaved(readSaved().filter(item => item.id !== btn.dataset.removeSaved));
      renderSaved();
    }));
  };

  document.addEventListener('click', event => {
    const saveButton = event.target.closest('[data-save-item]');
    if (saveButton) {
      const saved = readSaved();
      const id = saveButton.dataset.id;
      const existing = saved.findIndex(item => item.id === id);
      if (existing >= 0) {
        saved.splice(existing, 1);
        toast('Removed from saved finds.');
      } else {
        saved.push({ id, name:saveButton.dataset.name || 'Saved find', url:saveButton.dataset.url || 'shop.html', image:saveButton.dataset.image || '' });
        toast('Saved to your collector shortlist.');
      }
      writeSaved(saved);
      renderSaved();
    }
    if (event.target.closest('[data-saved-open]')) {
      closeOverlays();
      openOverlay(savedDrawer);
    }
    if (event.target.closest('[data-saved-close]')) closeOverlays();
  });
  renderSaved();

  const cards = [...document.querySelectorAll('[data-product-card]')];
  const grid = document.querySelector('[data-product-grid]');
  const search = document.querySelector('[data-product-search]');
  const filters = [...document.querySelectorAll('[data-filter]')];
  const sort = document.querySelector('[data-sort-products]');
  const resultCount = document.querySelector('[data-result-count]');
  const noResults = document.querySelector('[data-no-results]');
  let activeFilter = new URLSearchParams(location.search).get('category') || 'all';
  const validFilters = new Set(['all', ...filters.map(btn => btn.dataset.filter)]);
  if (!validFilters.has(activeFilter)) activeFilter = 'all';

  const sortCards = () => {
    if (!grid || !sort) return;
    const mode = sort.value;
    const ordered = [...cards].sort((a,b) => mode === 'name'
      ? String(a.dataset.name).localeCompare(String(b.dataset.name))
      : cards.indexOf(a) - cards.indexOf(b));
    ordered.forEach(card => grid.appendChild(card));
  };

  const applyFilters = () => {
    const query = (search?.value || '').trim().toLowerCase();
    let visible = 0;
    cards.forEach(card => {
      const categories = (card.dataset.category || '').split(' ');
      const searchable = (card.dataset.search || '').toLowerCase();
      const show = (activeFilter === 'all' || categories.includes(activeFilter)) && (!query || searchable.includes(query));
      card.hidden = !show;
      if (show) visible++;
    });
    if (resultCount) resultCount.textContent = visible + (visible === 1 ? ' confirmed item' : ' confirmed items');
    if (noResults) noResults.hidden = visible !== 0;
    filters.forEach(btn => btn.classList.toggle('active', btn.dataset.filter === activeFilter));
  };

  filters.forEach(btn => btn.addEventListener('click', () => {
    activeFilter = btn.dataset.filter;
    history.replaceState({}, '', activeFilter === 'all' ? 'shop.html' : 'shop.html?category=' + encodeURIComponent(activeFilter));
    applyFilters();
  }));
  search?.addEventListener('input', applyFilters);
  sort?.addEventListener('change', sortCards);
  document.querySelectorAll('[data-view]').forEach(btn => btn.addEventListener('click', () => {
    document.querySelectorAll('[data-view]').forEach(item => item.classList.toggle('active', item === btn));
    grid?.classList.toggle('list-view', btn.dataset.view === 'list');
  }));
  if (cards.length) { sortCards(); applyFilters(); }

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
      const lines = ['Hi Bringing Japan 2 U,','','I would like to request a Japan find:','','Product: ' + product,'Series / brand: ' + String(form.get('series') || ''),'Budget: ' + String(form.get('budget') || ''),'Country: ' + String(form.get('country') || ''),'Name: ' + String(form.get('name') || ''),'','Details:',String(form.get('details') || ''),'','I understand this is a sourcing request, not a confirmed order.'];
      location.href = 'mailto:bringingjapantoyou@gmail.com?subject=' + encodeURIComponent('Japan Find Request — ' + product) + '&body=' + encodeURIComponent(lines.join('\n'));
    });
  }

  if (!document.querySelector('.mobile-dock')) {
    const dock = document.createElement('nav');
    dock.className = 'mobile-dock';
    dock.setAttribute('aria-label', 'Mobile quick navigation');
    dock.innerHTML = '<a href="index.html"><b>⌂</b><span>Home</span></a><a href="shop.html"><b>⌕</b><span>Inventory</span></a><button type="button" data-saved-open><b>♡</b><span>Saved</span></button><button type="button" data-cart-open><b>?</b><span>Inquiry</span></button>';
    document.body.appendChild(dock);
    dock.querySelector('[data-saved-open]').addEventListener('click', () => { closeOverlays(); openOverlay(savedDrawer); });
    dock.querySelector('[data-cart-open]').addEventListener('click', () => openOverlay(drawer));
  }

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduceMotion && 'IntersectionObserver' in window) {
    const revealTargets = [...document.querySelectorAll('main > section, .radar-card, .product-card, .tool-card, .inventory-slot')];
    revealTargets.forEach(el => el.classList.add('reveal-ready'));
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    }), { threshold:.07, rootMargin:'0px 0px -20px 0px' });
    revealTargets.forEach(el => observer.observe(el));
  }
})(); + item.price.toFixed(2) + ' each' : 'Price pending') + '</span></div>' +
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

    if (totalEl) totalEl.textContent = 'Pricing pending';
    if (inquiryButton) inquiryButton.disabled = false;

    itemsEl.querySelectorAll('[data-qty-index]').forEach(btn => btn.addEventListener('click', () => {
      const next = readCart();
      const index = Number(btn.dataset.qtyIndex);
      const delta = Number(btn.dataset.delta);
      if (!next[index]) return;
      next[index].qty += delta;
      if (next[index].qty <= 0) next.splice(index, 1);
      writeCart(next);
      renderCart();
    }));

    itemsEl.querySelectorAll('[data-remove-index]').forEach(btn => btn.addEventListener('click', () => {
      const next = readCart();
      next.splice(Number(btn.dataset.removeIndex), 1);
      writeCart(next);
      renderCart();
    }));
  };

  document.querySelectorAll('[data-add-cart]').forEach(button => button.addEventListener('click', () => {
    const cart = readCart();
    const name = String(button.dataset.name || '');
    if (!name) return;
    const match = cart.find(item => item.name === name);
    if (match) match.qty += 1;
    else cart.push({ name, qty: 1 });
    writeCart(cart);
    renderCart();
    openOverlay(drawer);
    toast('Added to your availability inquiry.');
  }));

  document.querySelectorAll('[data-cart-open]').forEach(button => button.addEventListener('click', () => openOverlay(drawer)));
  document.querySelectorAll('[data-cart-close]').forEach(button => button.addEventListener('click', closeOverlays));
  backdrop?.addEventListener('click', closeOverlays);
  document.addEventListener('keydown', event => { if (event.key === 'Escape') closeOverlays(); });

  inquiryButton?.addEventListener('click', () => {
    const cart = readCart();
    if (!cart.length) return;
    const lines = ['Hi Bringing Japan 2 U,', '', 'I’m interested in availability for:', ''];
    cart.forEach(item => lines.push('- ' + item.qty + ' × ' + item.name));
    lines.push('', 'I understand pricing and checkout are not live yet. Please let me know when details are available.');
    location.href = 'mailto:bringingjapantoyou@gmail.com?subject=' + encodeURIComponent('Inventory Availability Inquiry') + '&body=' + encodeURIComponent(lines.join('\n'));
  });
  renderCart();

  const savedDrawer = document.createElement('aside');
  savedDrawer.className = 'saved-drawer';
  savedDrawer.setAttribute('aria-hidden', 'true');
  savedDrawer.innerHTML = '<div class="saved-head"><div><small>COLLECTOR SHORTLIST</small><strong>Saved finds</strong></div><button type="button" data-saved-close aria-label="Close saved finds">×</button></div><div class="saved-items" data-saved-items></div><div class="saved-foot">Saved locally in this browser. Pricing will appear only when finalized.</div>';
  document.body.appendChild(savedDrawer);

  const normalizeSaved = items => (Array.isArray(items) ? items : [])
    .filter(item => item && item.id && item.name && !retiredSavedIds.has(String(item.id)))
    .map(item => ({ id:String(item.id), name:String(item.name), url:item.url || 'shop.html', image:item.image || '' }));
  const readSaved = () => normalizeSaved(safeParse(savedKey));
  const writeSaved = items => localStorage.setItem(savedKey, JSON.stringify(normalizeSaved(items)));

  const renderSaved = () => {
    const saved = readSaved();
    writeSaved(saved);
    document.querySelectorAll('[data-saved-count]').forEach(el => el.textContent = String(saved.length));
    document.querySelectorAll('[data-save-item]').forEach(btn => {
      const isSaved = saved.some(item => item.id === btn.dataset.id);
      btn.classList.toggle('is-saved', isSaved);
      if (btn.classList.contains('save-fab')) btn.textContent = isSaved ? '♥' : '♡';
      else if (btn.classList.contains('large-save')) btn.textContent = isSaved ? '♥ Saved find' : '♡ Save this find';
      else if (btn.classList.contains('dossier-save')) btn.textContent = isSaved ? '♥ Saved find' : '♡ Save find';
      btn.setAttribute('aria-pressed', String(isSaved));
    });

    const container = savedDrawer.querySelector('[data-saved-items]');
    if (!saved.length) {
      container.innerHTML = '<div class="empty-cart"><strong>No saved finds yet.</strong><p>Save confirmed inventory and it will stay here in this browser.</p></div>';
      return;
    }
    container.innerHTML = saved.map(item =>
      '<div class="saved-line">' +
        '<div class="saved-thumb">' + (item.image ? '<img src="' + item.image + '" alt="">' : 'BJ2U') + '</div>' +
        '<div><strong>' + item.name + '</strong><span>Price pending</span></div>' +
        '<div class="saved-line-actions"><a href="' + item.url + '">View →</a><button type="button" data-remove-saved="' + item.id + '">Remove</button></div>' +
      '</div>'
    ).join('');
    container.querySelectorAll('[data-remove-saved]').forEach(btn => btn.addEventListener('click', () => {
      writeSaved(readSaved().filter(item => item.id !== btn.dataset.removeSaved));
      renderSaved();
    }));
  };

  document.addEventListener('click', event => {
    const saveButton = event.target.closest('[data-save-item]');
    if (saveButton) {
      const saved = readSaved();
      const id = saveButton.dataset.id;
      const existing = saved.findIndex(item => item.id === id);
      if (existing >= 0) {
        saved.splice(existing, 1);
        toast('Removed from saved finds.');
      } else {
        saved.push({ id, name:saveButton.dataset.name || 'Saved find', url:saveButton.dataset.url || 'shop.html', image:saveButton.dataset.image || '' });
        toast('Saved to your collector shortlist.');
      }
      writeSaved(saved);
      renderSaved();
    }
    if (event.target.closest('[data-saved-open]')) {
      closeOverlays();
      openOverlay(savedDrawer);
    }
    if (event.target.closest('[data-saved-close]')) closeOverlays();
  });
  renderSaved();

  const cards = [...document.querySelectorAll('[data-product-card]')];
  const grid = document.querySelector('[data-product-grid]');
  const search = document.querySelector('[data-product-search]');
  const filters = [...document.querySelectorAll('[data-filter]')];
  const sort = document.querySelector('[data-sort-products]');
  const resultCount = document.querySelector('[data-result-count]');
  const noResults = document.querySelector('[data-no-results]');
  let activeFilter = new URLSearchParams(location.search).get('category') || 'all';
  const validFilters = new Set(['all', ...filters.map(btn => btn.dataset.filter)]);
  if (!validFilters.has(activeFilter)) activeFilter = 'all';

  const sortCards = () => {
    if (!grid || !sort) return;
    const mode = sort.value;
    const ordered = [...cards].sort((a,b) => mode === 'name'
      ? String(a.dataset.name).localeCompare(String(b.dataset.name))
      : cards.indexOf(a) - cards.indexOf(b));
    ordered.forEach(card => grid.appendChild(card));
  };

  const applyFilters = () => {
    const query = (search?.value || '').trim().toLowerCase();
    let visible = 0;
    cards.forEach(card => {
      const categories = (card.dataset.category || '').split(' ');
      const searchable = (card.dataset.search || '').toLowerCase();
      const show = (activeFilter === 'all' || categories.includes(activeFilter)) && (!query || searchable.includes(query));
      card.hidden = !show;
      if (show) visible++;
    });
    if (resultCount) resultCount.textContent = visible + (visible === 1 ? ' confirmed item' : ' confirmed items');
    if (noResults) noResults.hidden = visible !== 0;
    filters.forEach(btn => btn.classList.toggle('active', btn.dataset.filter === activeFilter));
  };

  filters.forEach(btn => btn.addEventListener('click', () => {
    activeFilter = btn.dataset.filter;
    history.replaceState({}, '', activeFilter === 'all' ? 'shop.html' : 'shop.html?category=' + encodeURIComponent(activeFilter));
    applyFilters();
  }));
  search?.addEventListener('input', applyFilters);
  sort?.addEventListener('change', sortCards);
  document.querySelectorAll('[data-view]').forEach(btn => btn.addEventListener('click', () => {
    document.querySelectorAll('[data-view]').forEach(item => item.classList.toggle('active', item === btn));
    grid?.classList.toggle('list-view', btn.dataset.view === 'list');
  }));
  if (cards.length) { sortCards(); applyFilters(); }

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
      const lines = ['Hi Bringing Japan 2 U,','','I would like to request a Japan find:','','Product: ' + product,'Series / brand: ' + String(form.get('series') || ''),'Budget: ' + String(form.get('budget') || ''),'Country: ' + String(form.get('country') || ''),'Name: ' + String(form.get('name') || ''),'','Details:',String(form.get('details') || ''),'','I understand this is a sourcing request, not a confirmed order.'];
      location.href = 'mailto:bringingjapantoyou@gmail.com?subject=' + encodeURIComponent('Japan Find Request — ' + product) + '&body=' + encodeURIComponent(lines.join('\n'));
    });
  }

  if (!document.querySelector('.mobile-dock')) {
    const dock = document.createElement('nav');
    dock.className = 'mobile-dock';
    dock.setAttribute('aria-label', 'Mobile quick navigation');
    dock.innerHTML = '<a href="index.html"><b>⌂</b><span>Home</span></a><a href="shop.html"><b>⌕</b><span>Inventory</span></a><button type="button" data-saved-open><b>♡</b><span>Saved</span></button><button type="button" data-cart-open><b>?</b><span>Inquiry</span></button>';
    document.body.appendChild(dock);
    dock.querySelector('[data-saved-open]').addEventListener('click', () => { closeOverlays(); openOverlay(savedDrawer); });
    dock.querySelector('[data-cart-open]').addEventListener('click', () => openOverlay(drawer));
  }

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduceMotion && 'IntersectionObserver' in window) {
    const revealTargets = [...document.querySelectorAll('main > section, .radar-card, .product-card, .tool-card, .inventory-slot')];
    revealTargets.forEach(el => el.classList.add('reveal-ready'));
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    }), { threshold:.07, rootMargin:'0px 0px -20px 0px' });
    revealTargets.forEach(el => observer.observe(el));
  }
})(); + item.price.toFixed(2) + ' each' : ' — price pending')));
    lines.push('', 'Please let me know current availability and next steps.');
    location.href = 'mailto:bringingjapantoyou@gmail.com?subject=' + encodeURIComponent('Inventory Availability Inquiry') + '&body=' + encodeURIComponent(lines.join('\n'));
  });
  renderCart();

  const savedDrawer = document.createElement('aside');
  savedDrawer.className = 'saved-drawer';
  savedDrawer.setAttribute('aria-hidden', 'true');
  savedDrawer.innerHTML = '<div class="saved-head"><div><small>COLLECTOR SHORTLIST</small><strong>Saved finds</strong></div><button type="button" data-saved-close aria-label="Close saved finds">×</button></div><div class="saved-items" data-saved-items></div><div class="saved-foot">Saved locally in this browser. Pricing will appear only when finalized.</div>';
  document.body.appendChild(savedDrawer);

  const normalizeSaved = items => (Array.isArray(items) ? items : [])
    .filter(item => item && item.id && item.name && !retiredSavedIds.has(String(item.id)))
    .map(item => ({ id:String(item.id), name:String(item.name), url:item.url || 'shop.html', image:item.image || '' }));
  const readSaved = () => normalizeSaved(safeParse(savedKey));
  const writeSaved = items => localStorage.setItem(savedKey, JSON.stringify(normalizeSaved(items)));

  const renderSaved = () => {
    const saved = readSaved();
    writeSaved(saved);
    document.querySelectorAll('[data-saved-count]').forEach(el => el.textContent = String(saved.length));
    document.querySelectorAll('[data-save-item]').forEach(btn => {
      const isSaved = saved.some(item => item.id === btn.dataset.id);
      btn.classList.toggle('is-saved', isSaved);
      if (btn.classList.contains('save-fab')) btn.textContent = isSaved ? '♥' : '♡';
      else if (btn.classList.contains('large-save')) btn.textContent = isSaved ? '♥ Saved find' : '♡ Save this find';
      else if (btn.classList.contains('dossier-save')) btn.textContent = isSaved ? '♥ Saved find' : '♡ Save find';
      btn.setAttribute('aria-pressed', String(isSaved));
    });

    const container = savedDrawer.querySelector('[data-saved-items]');
    if (!saved.length) {
      container.innerHTML = '<div class="empty-cart"><strong>No saved finds yet.</strong><p>Save confirmed inventory and it will stay here in this browser.</p></div>';
      return;
    }
    container.innerHTML = saved.map(item =>
      '<div class="saved-line">' +
        '<div class="saved-thumb">' + (item.image ? '<img src="' + item.image + '" alt="">' : 'BJ2U') + '</div>' +
        '<div><strong>' + item.name + '</strong><span>Price pending</span></div>' +
        '<div class="saved-line-actions"><a href="' + item.url + '">View →</a><button type="button" data-remove-saved="' + item.id + '">Remove</button></div>' +
      '</div>'
    ).join('');
    container.querySelectorAll('[data-remove-saved]').forEach(btn => btn.addEventListener('click', () => {
      writeSaved(readSaved().filter(item => item.id !== btn.dataset.removeSaved));
      renderSaved();
    }));
  };

  document.addEventListener('click', event => {
    const saveButton = event.target.closest('[data-save-item]');
    if (saveButton) {
      const saved = readSaved();
      const id = saveButton.dataset.id;
      const existing = saved.findIndex(item => item.id === id);
      if (existing >= 0) {
        saved.splice(existing, 1);
        toast('Removed from saved finds.');
      } else {
        saved.push({ id, name:saveButton.dataset.name || 'Saved find', url:saveButton.dataset.url || 'shop.html', image:saveButton.dataset.image || '' });
        toast('Saved to your collector shortlist.');
      }
      writeSaved(saved);
      renderSaved();
    }
    if (event.target.closest('[data-saved-open]')) {
      closeOverlays();
      openOverlay(savedDrawer);
    }
    if (event.target.closest('[data-saved-close]')) closeOverlays();
  });
  renderSaved();

  const cards = [...document.querySelectorAll('[data-product-card]')];
  const grid = document.querySelector('[data-product-grid]');
  const search = document.querySelector('[data-product-search]');
  const filters = [...document.querySelectorAll('[data-filter]')];
  const sort = document.querySelector('[data-sort-products]');
  const resultCount = document.querySelector('[data-result-count]');
  const noResults = document.querySelector('[data-no-results]');
  let activeFilter = new URLSearchParams(location.search).get('category') || 'all';
  const validFilters = new Set(['all', ...filters.map(btn => btn.dataset.filter)]);
  if (!validFilters.has(activeFilter)) activeFilter = 'all';

  const sortCards = () => {
    if (!grid || !sort) return;
    const mode = sort.value;
    const ordered = [...cards].sort((a,b) => mode === 'name'
      ? String(a.dataset.name).localeCompare(String(b.dataset.name))
      : cards.indexOf(a) - cards.indexOf(b));
    ordered.forEach(card => grid.appendChild(card));
  };

  const applyFilters = () => {
    const query = (search?.value || '').trim().toLowerCase();
    let visible = 0;
    cards.forEach(card => {
      const categories = (card.dataset.category || '').split(' ');
      const searchable = (card.dataset.search || '').toLowerCase();
      const show = (activeFilter === 'all' || categories.includes(activeFilter)) && (!query || searchable.includes(query));
      card.hidden = !show;
      if (show) visible++;
    });
    if (resultCount) resultCount.textContent = visible + (visible === 1 ? ' confirmed item' : ' confirmed items');
    if (noResults) noResults.hidden = visible !== 0;
    filters.forEach(btn => btn.classList.toggle('active', btn.dataset.filter === activeFilter));
  };

  filters.forEach(btn => btn.addEventListener('click', () => {
    activeFilter = btn.dataset.filter;
    history.replaceState({}, '', activeFilter === 'all' ? 'shop.html' : 'shop.html?category=' + encodeURIComponent(activeFilter));
    applyFilters();
  }));
  search?.addEventListener('input', applyFilters);
  sort?.addEventListener('change', sortCards);
  document.querySelectorAll('[data-view]').forEach(btn => btn.addEventListener('click', () => {
    document.querySelectorAll('[data-view]').forEach(item => item.classList.toggle('active', item === btn));
    grid?.classList.toggle('list-view', btn.dataset.view === 'list');
  }));
  if (cards.length) { sortCards(); applyFilters(); }

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
      const lines = ['Hi Bringing Japan 2 U,','','I would like to request a Japan find:','','Product: ' + product,'Series / brand: ' + String(form.get('series') || ''),'Budget: ' + String(form.get('budget') || ''),'Country: ' + String(form.get('country') || ''),'Name: ' + String(form.get('name') || ''),'','Details:',String(form.get('details') || ''),'','I understand this is a sourcing request, not a confirmed order.'];
      location.href = 'mailto:bringingjapantoyou@gmail.com?subject=' + encodeURIComponent('Japan Find Request — ' + product) + '&body=' + encodeURIComponent(lines.join('\n'));
    });
  }

  if (!document.querySelector('.mobile-dock')) {
    const dock = document.createElement('nav');
    dock.className = 'mobile-dock';
    dock.setAttribute('aria-label', 'Mobile quick navigation');
    dock.innerHTML = '<a href="index.html"><b>⌂</b><span>Home</span></a><a href="shop.html"><b>⌕</b><span>Inventory</span></a><button type="button" data-saved-open><b>♡</b><span>Saved</span></button><button type="button" data-cart-open><b>?</b><span>Inquiry</span></button>';
    document.body.appendChild(dock);
    dock.querySelector('[data-saved-open]').addEventListener('click', () => { closeOverlays(); openOverlay(savedDrawer); });
    dock.querySelector('[data-cart-open]').addEventListener('click', () => openOverlay(drawer));
  }

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduceMotion && 'IntersectionObserver' in window) {
    const revealTargets = [...document.querySelectorAll('main > section, .radar-card, .product-card, .tool-card, .inventory-slot')];
    revealTargets.forEach(el => el.classList.add('reveal-ready'));
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    }), { threshold:.07, rootMargin:'0px 0px -20px 0px' });
    revealTargets.forEach(el => observer.observe(el));
  }
})(); + item.price.toFixed(2) + ' each' : 'Price pending') + '</span></div>' +
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

    if (totalEl) totalEl.textContent = 'Pricing pending';
    if (inquiryButton) inquiryButton.disabled = false;

    itemsEl.querySelectorAll('[data-qty-index]').forEach(btn => btn.addEventListener('click', () => {
      const next = readCart();
      const index = Number(btn.dataset.qtyIndex);
      const delta = Number(btn.dataset.delta);
      if (!next[index]) return;
      next[index].qty += delta;
      if (next[index].qty <= 0) next.splice(index, 1);
      writeCart(next);
      renderCart();
    }));

    itemsEl.querySelectorAll('[data-remove-index]').forEach(btn => btn.addEventListener('click', () => {
      const next = readCart();
      next.splice(Number(btn.dataset.removeIndex), 1);
      writeCart(next);
      renderCart();
    }));
  };

  document.querySelectorAll('[data-add-cart]').forEach(button => button.addEventListener('click', () => {
    const cart = readCart();
    const name = String(button.dataset.name || '');
    if (!name) return;
    const match = cart.find(item => item.name === name);
    if (match) match.qty += 1;
    else cart.push({ name, qty: 1 });
    writeCart(cart);
    renderCart();
    openOverlay(drawer);
    toast('Added to your availability inquiry.');
  }));

  document.querySelectorAll('[data-cart-open]').forEach(button => button.addEventListener('click', () => openOverlay(drawer)));
  document.querySelectorAll('[data-cart-close]').forEach(button => button.addEventListener('click', closeOverlays));
  backdrop?.addEventListener('click', closeOverlays);
  document.addEventListener('keydown', event => { if (event.key === 'Escape') closeOverlays(); });

  inquiryButton?.addEventListener('click', () => {
    const cart = readCart();
    if (!cart.length) return;
    const lines = ['Hi Bringing Japan 2 U,', '', 'I’m interested in availability for:', ''];
    cart.forEach(item => lines.push('- ' + item.qty + ' × ' + item.name));
    lines.push('', 'I understand pricing and checkout are not live yet. Please let me know when details are available.');
    location.href = 'mailto:bringingjapantoyou@gmail.com?subject=' + encodeURIComponent('Inventory Availability Inquiry') + '&body=' + encodeURIComponent(lines.join('\n'));
  });
  renderCart();

  const savedDrawer = document.createElement('aside');
  savedDrawer.className = 'saved-drawer';
  savedDrawer.setAttribute('aria-hidden', 'true');
  savedDrawer.innerHTML = '<div class="saved-head"><div><small>COLLECTOR SHORTLIST</small><strong>Saved finds</strong></div><button type="button" data-saved-close aria-label="Close saved finds">×</button></div><div class="saved-items" data-saved-items></div><div class="saved-foot">Saved locally in this browser. Pricing will appear only when finalized.</div>';
  document.body.appendChild(savedDrawer);

  const normalizeSaved = items => (Array.isArray(items) ? items : [])
    .filter(item => item && item.id && item.name && !retiredSavedIds.has(String(item.id)))
    .map(item => ({ id:String(item.id), name:String(item.name), url:item.url || 'shop.html', image:item.image || '' }));
  const readSaved = () => normalizeSaved(safeParse(savedKey));
  const writeSaved = items => localStorage.setItem(savedKey, JSON.stringify(normalizeSaved(items)));

  const renderSaved = () => {
    const saved = readSaved();
    writeSaved(saved);
    document.querySelectorAll('[data-saved-count]').forEach(el => el.textContent = String(saved.length));
    document.querySelectorAll('[data-save-item]').forEach(btn => {
      const isSaved = saved.some(item => item.id === btn.dataset.id);
      btn.classList.toggle('is-saved', isSaved);
      if (btn.classList.contains('save-fab')) btn.textContent = isSaved ? '♥' : '♡';
      else if (btn.classList.contains('large-save')) btn.textContent = isSaved ? '♥ Saved find' : '♡ Save this find';
      else if (btn.classList.contains('dossier-save')) btn.textContent = isSaved ? '♥ Saved find' : '♡ Save find';
      btn.setAttribute('aria-pressed', String(isSaved));
    });

    const container = savedDrawer.querySelector('[data-saved-items]');
    if (!saved.length) {
      container.innerHTML = '<div class="empty-cart"><strong>No saved finds yet.</strong><p>Save confirmed inventory and it will stay here in this browser.</p></div>';
      return;
    }
    container.innerHTML = saved.map(item =>
      '<div class="saved-line">' +
        '<div class="saved-thumb">' + (item.image ? '<img src="' + item.image + '" alt="">' : 'BJ2U') + '</div>' +
        '<div><strong>' + item.name + '</strong><span>Price pending</span></div>' +
        '<div class="saved-line-actions"><a href="' + item.url + '">View →</a><button type="button" data-remove-saved="' + item.id + '">Remove</button></div>' +
      '</div>'
    ).join('');
    container.querySelectorAll('[data-remove-saved]').forEach(btn => btn.addEventListener('click', () => {
      writeSaved(readSaved().filter(item => item.id !== btn.dataset.removeSaved));
      renderSaved();
    }));
  };

  document.addEventListener('click', event => {
    const saveButton = event.target.closest('[data-save-item]');
    if (saveButton) {
      const saved = readSaved();
      const id = saveButton.dataset.id;
      const existing = saved.findIndex(item => item.id === id);
      if (existing >= 0) {
        saved.splice(existing, 1);
        toast('Removed from saved finds.');
      } else {
        saved.push({ id, name:saveButton.dataset.name || 'Saved find', url:saveButton.dataset.url || 'shop.html', image:saveButton.dataset.image || '' });
        toast('Saved to your collector shortlist.');
      }
      writeSaved(saved);
      renderSaved();
    }
    if (event.target.closest('[data-saved-open]')) {
      closeOverlays();
      openOverlay(savedDrawer);
    }
    if (event.target.closest('[data-saved-close]')) closeOverlays();
  });
  renderSaved();

  const cards = [...document.querySelectorAll('[data-product-card]')];
  const grid = document.querySelector('[data-product-grid]');
  const search = document.querySelector('[data-product-search]');
  const filters = [...document.querySelectorAll('[data-filter]')];
  const sort = document.querySelector('[data-sort-products]');
  const resultCount = document.querySelector('[data-result-count]');
  const noResults = document.querySelector('[data-no-results]');
  let activeFilter = new URLSearchParams(location.search).get('category') || 'all';
  const validFilters = new Set(['all', ...filters.map(btn => btn.dataset.filter)]);
  if (!validFilters.has(activeFilter)) activeFilter = 'all';

  const sortCards = () => {
    if (!grid || !sort) return;
    const mode = sort.value;
    const ordered = [...cards].sort((a,b) => mode === 'name'
      ? String(a.dataset.name).localeCompare(String(b.dataset.name))
      : cards.indexOf(a) - cards.indexOf(b));
    ordered.forEach(card => grid.appendChild(card));
  };

  const applyFilters = () => {
    const query = (search?.value || '').trim().toLowerCase();
    let visible = 0;
    cards.forEach(card => {
      const categories = (card.dataset.category || '').split(' ');
      const searchable = (card.dataset.search || '').toLowerCase();
      const show = (activeFilter === 'all' || categories.includes(activeFilter)) && (!query || searchable.includes(query));
      card.hidden = !show;
      if (show) visible++;
    });
    if (resultCount) resultCount.textContent = visible + (visible === 1 ? ' confirmed item' : ' confirmed items');
    if (noResults) noResults.hidden = visible !== 0;
    filters.forEach(btn => btn.classList.toggle('active', btn.dataset.filter === activeFilter));
  };

  filters.forEach(btn => btn.addEventListener('click', () => {
    activeFilter = btn.dataset.filter;
    history.replaceState({}, '', activeFilter === 'all' ? 'shop.html' : 'shop.html?category=' + encodeURIComponent(activeFilter));
    applyFilters();
  }));
  search?.addEventListener('input', applyFilters);
  sort?.addEventListener('change', sortCards);
  document.querySelectorAll('[data-view]').forEach(btn => btn.addEventListener('click', () => {
    document.querySelectorAll('[data-view]').forEach(item => item.classList.toggle('active', item === btn));
    grid?.classList.toggle('list-view', btn.dataset.view === 'list');
  }));
  if (cards.length) { sortCards(); applyFilters(); }

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
      const lines = ['Hi Bringing Japan 2 U,','','I would like to request a Japan find:','','Product: ' + product,'Series / brand: ' + String(form.get('series') || ''),'Budget: ' + String(form.get('budget') || ''),'Country: ' + String(form.get('country') || ''),'Name: ' + String(form.get('name') || ''),'','Details:',String(form.get('details') || ''),'','I understand this is a sourcing request, not a confirmed order.'];
      location.href = 'mailto:bringingjapantoyou@gmail.com?subject=' + encodeURIComponent('Japan Find Request — ' + product) + '&body=' + encodeURIComponent(lines.join('\n'));
    });
  }

  if (!document.querySelector('.mobile-dock')) {
    const dock = document.createElement('nav');
    dock.className = 'mobile-dock';
    dock.setAttribute('aria-label', 'Mobile quick navigation');
    dock.innerHTML = '<a href="index.html"><b>⌂</b><span>Home</span></a><a href="shop.html"><b>⌕</b><span>Inventory</span></a><button type="button" data-saved-open><b>♡</b><span>Saved</span></button><button type="button" data-cart-open><b>?</b><span>Inquiry</span></button>';
    document.body.appendChild(dock);
    dock.querySelector('[data-saved-open]').addEventListener('click', () => { closeOverlays(); openOverlay(savedDrawer); });
    dock.querySelector('[data-cart-open]').addEventListener('click', () => openOverlay(drawer));
  }

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduceMotion && 'IntersectionObserver' in window) {
    const revealTargets = [...document.querySelectorAll('main > section, .radar-card, .product-card, .tool-card, .inventory-slot')];
    revealTargets.forEach(el => el.classList.add('reveal-ready'));
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    }), { threshold:.07, rootMargin:'0px 0px -20px 0px' });
    revealTargets.forEach(el => observer.observe(el));
  }
})(); + pricedSubtotal.toFixed(2) + ' + pending' : 'Pricing pending')
      : '

    itemsEl.querySelectorAll('[data-qty-index]').forEach(btn => btn.addEventListener('click', () => {
      const next = readCart();
      const index = Number(btn.dataset.qtyIndex);
      const delta = Number(btn.dataset.delta);
      if (!next[index]) return;
      next[index].qty += delta;
      if (next[index].qty <= 0) next.splice(index, 1);
      writeCart(next);
      renderCart();
    }));

    itemsEl.querySelectorAll('[data-remove-index]').forEach(btn => btn.addEventListener('click', () => {
      const next = readCart();
      next.splice(Number(btn.dataset.removeIndex), 1);
      writeCart(next);
      renderCart();
    }));
  };

  document.querySelectorAll('[data-add-cart]').forEach(button => button.addEventListener('click', () => {
    const cart = readCart();
    const name = String(button.dataset.name || '');
    if (!name) return;
    const match = cart.find(item => item.name === name);
    if (match) match.qty += 1;
    else cart.push({ name, qty: 1 });
    writeCart(cart);
    renderCart();
    openOverlay(drawer);
    toast('Added to your availability inquiry.');
  }));

  document.querySelectorAll('[data-cart-open]').forEach(button => button.addEventListener('click', () => openOverlay(drawer)));
  document.querySelectorAll('[data-cart-close]').forEach(button => button.addEventListener('click', closeOverlays));
  backdrop?.addEventListener('click', closeOverlays);
  document.addEventListener('keydown', event => { if (event.key === 'Escape') closeOverlays(); });

  inquiryButton?.addEventListener('click', () => {
    const cart = readCart();
    if (!cart.length) return;
    const lines = ['Hi Bringing Japan 2 U,', '', 'I’m interested in availability for:', ''];
    cart.forEach(item => lines.push('- ' + item.qty + ' × ' + item.name));
    lines.push('', 'I understand pricing and checkout are not live yet. Please let me know when details are available.');
    location.href = 'mailto:bringingjapantoyou@gmail.com?subject=' + encodeURIComponent('Inventory Availability Inquiry') + '&body=' + encodeURIComponent(lines.join('\n'));
  });
  renderCart();

  const savedDrawer = document.createElement('aside');
  savedDrawer.className = 'saved-drawer';
  savedDrawer.setAttribute('aria-hidden', 'true');
  savedDrawer.innerHTML = '<div class="saved-head"><div><small>COLLECTOR SHORTLIST</small><strong>Saved finds</strong></div><button type="button" data-saved-close aria-label="Close saved finds">×</button></div><div class="saved-items" data-saved-items></div><div class="saved-foot">Saved locally in this browser. Pricing will appear only when finalized.</div>';
  document.body.appendChild(savedDrawer);

  const normalizeSaved = items => (Array.isArray(items) ? items : [])
    .filter(item => item && item.id && item.name && !retiredSavedIds.has(String(item.id)))
    .map(item => ({ id:String(item.id), name:String(item.name), url:item.url || 'shop.html', image:item.image || '' }));
  const readSaved = () => normalizeSaved(safeParse(savedKey));
  const writeSaved = items => localStorage.setItem(savedKey, JSON.stringify(normalizeSaved(items)));

  const renderSaved = () => {
    const saved = readSaved();
    writeSaved(saved);
    document.querySelectorAll('[data-saved-count]').forEach(el => el.textContent = String(saved.length));
    document.querySelectorAll('[data-save-item]').forEach(btn => {
      const isSaved = saved.some(item => item.id === btn.dataset.id);
      btn.classList.toggle('is-saved', isSaved);
      if (btn.classList.contains('save-fab')) btn.textContent = isSaved ? '♥' : '♡';
      else if (btn.classList.contains('large-save')) btn.textContent = isSaved ? '♥ Saved find' : '♡ Save this find';
      else if (btn.classList.contains('dossier-save')) btn.textContent = isSaved ? '♥ Saved find' : '♡ Save find';
      btn.setAttribute('aria-pressed', String(isSaved));
    });

    const container = savedDrawer.querySelector('[data-saved-items]');
    if (!saved.length) {
      container.innerHTML = '<div class="empty-cart"><strong>No saved finds yet.</strong><p>Save confirmed inventory and it will stay here in this browser.</p></div>';
      return;
    }
    container.innerHTML = saved.map(item =>
      '<div class="saved-line">' +
        '<div class="saved-thumb">' + (item.image ? '<img src="' + item.image + '" alt="">' : 'BJ2U') + '</div>' +
        '<div><strong>' + item.name + '</strong><span>Price pending</span></div>' +
        '<div class="saved-line-actions"><a href="' + item.url + '">View →</a><button type="button" data-remove-saved="' + item.id + '">Remove</button></div>' +
      '</div>'
    ).join('');
    container.querySelectorAll('[data-remove-saved]').forEach(btn => btn.addEventListener('click', () => {
      writeSaved(readSaved().filter(item => item.id !== btn.dataset.removeSaved));
      renderSaved();
    }));
  };

  document.addEventListener('click', event => {
    const saveButton = event.target.closest('[data-save-item]');
    if (saveButton) {
      const saved = readSaved();
      const id = saveButton.dataset.id;
      const existing = saved.findIndex(item => item.id === id);
      if (existing >= 0) {
        saved.splice(existing, 1);
        toast('Removed from saved finds.');
      } else {
        saved.push({ id, name:saveButton.dataset.name || 'Saved find', url:saveButton.dataset.url || 'shop.html', image:saveButton.dataset.image || '' });
        toast('Saved to your collector shortlist.');
      }
      writeSaved(saved);
      renderSaved();
    }
    if (event.target.closest('[data-saved-open]')) {
      closeOverlays();
      openOverlay(savedDrawer);
    }
    if (event.target.closest('[data-saved-close]')) closeOverlays();
  });
  renderSaved();

  const cards = [...document.querySelectorAll('[data-product-card]')];
  const grid = document.querySelector('[data-product-grid]');
  const search = document.querySelector('[data-product-search]');
  const filters = [...document.querySelectorAll('[data-filter]')];
  const sort = document.querySelector('[data-sort-products]');
  const resultCount = document.querySelector('[data-result-count]');
  const noResults = document.querySelector('[data-no-results]');
  let activeFilter = new URLSearchParams(location.search).get('category') || 'all';
  const validFilters = new Set(['all', ...filters.map(btn => btn.dataset.filter)]);
  if (!validFilters.has(activeFilter)) activeFilter = 'all';

  const sortCards = () => {
    if (!grid || !sort) return;
    const mode = sort.value;
    const ordered = [...cards].sort((a,b) => mode === 'name'
      ? String(a.dataset.name).localeCompare(String(b.dataset.name))
      : cards.indexOf(a) - cards.indexOf(b));
    ordered.forEach(card => grid.appendChild(card));
  };

  const applyFilters = () => {
    const query = (search?.value || '').trim().toLowerCase();
    let visible = 0;
    cards.forEach(card => {
      const categories = (card.dataset.category || '').split(' ');
      const searchable = (card.dataset.search || '').toLowerCase();
      const show = (activeFilter === 'all' || categories.includes(activeFilter)) && (!query || searchable.includes(query));
      card.hidden = !show;
      if (show) visible++;
    });
    if (resultCount) resultCount.textContent = visible + (visible === 1 ? ' confirmed item' : ' confirmed items');
    if (noResults) noResults.hidden = visible !== 0;
    filters.forEach(btn => btn.classList.toggle('active', btn.dataset.filter === activeFilter));
  };

  filters.forEach(btn => btn.addEventListener('click', () => {
    activeFilter = btn.dataset.filter;
    history.replaceState({}, '', activeFilter === 'all' ? 'shop.html' : 'shop.html?category=' + encodeURIComponent(activeFilter));
    applyFilters();
  }));
  search?.addEventListener('input', applyFilters);
  sort?.addEventListener('change', sortCards);
  document.querySelectorAll('[data-view]').forEach(btn => btn.addEventListener('click', () => {
    document.querySelectorAll('[data-view]').forEach(item => item.classList.toggle('active', item === btn));
    grid?.classList.toggle('list-view', btn.dataset.view === 'list');
  }));
  if (cards.length) { sortCards(); applyFilters(); }

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
      const lines = ['Hi Bringing Japan 2 U,','','I would like to request a Japan find:','','Product: ' + product,'Series / brand: ' + String(form.get('series') || ''),'Budget: ' + String(form.get('budget') || ''),'Country: ' + String(form.get('country') || ''),'Name: ' + String(form.get('name') || ''),'','Details:',String(form.get('details') || ''),'','I understand this is a sourcing request, not a confirmed order.'];
      location.href = 'mailto:bringingjapantoyou@gmail.com?subject=' + encodeURIComponent('Japan Find Request — ' + product) + '&body=' + encodeURIComponent(lines.join('\n'));
    });
  }

  if (!document.querySelector('.mobile-dock')) {
    const dock = document.createElement('nav');
    dock.className = 'mobile-dock';
    dock.setAttribute('aria-label', 'Mobile quick navigation');
    dock.innerHTML = '<a href="index.html"><b>⌂</b><span>Home</span></a><a href="shop.html"><b>⌕</b><span>Inventory</span></a><button type="button" data-saved-open><b>♡</b><span>Saved</span></button><button type="button" data-cart-open><b>?</b><span>Inquiry</span></button>';
    document.body.appendChild(dock);
    dock.querySelector('[data-saved-open]').addEventListener('click', () => { closeOverlays(); openOverlay(savedDrawer); });
    dock.querySelector('[data-cart-open]').addEventListener('click', () => openOverlay(drawer));
  }

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduceMotion && 'IntersectionObserver' in window) {
    const revealTargets = [...document.querySelectorAll('main > section, .radar-card, .product-card, .tool-card, .inventory-slot')];
    revealTargets.forEach(el => el.classList.add('reveal-ready'));
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    }), { threshold:.07, rootMargin:'0px 0px -20px 0px' });
    revealTargets.forEach(el => observer.observe(el));
  }
})(); + item.price.toFixed(2) + ' each' : 'Price pending') + '</span></div>' +
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

    if (totalEl) totalEl.textContent = 'Pricing pending';
    if (inquiryButton) inquiryButton.disabled = false;

    itemsEl.querySelectorAll('[data-qty-index]').forEach(btn => btn.addEventListener('click', () => {
      const next = readCart();
      const index = Number(btn.dataset.qtyIndex);
      const delta = Number(btn.dataset.delta);
      if (!next[index]) return;
      next[index].qty += delta;
      if (next[index].qty <= 0) next.splice(index, 1);
      writeCart(next);
      renderCart();
    }));

    itemsEl.querySelectorAll('[data-remove-index]').forEach(btn => btn.addEventListener('click', () => {
      const next = readCart();
      next.splice(Number(btn.dataset.removeIndex), 1);
      writeCart(next);
      renderCart();
    }));
  };

  document.querySelectorAll('[data-add-cart]').forEach(button => button.addEventListener('click', () => {
    const cart = readCart();
    const name = String(button.dataset.name || '');
    if (!name) return;
    const match = cart.find(item => item.name === name);
    if (match) match.qty += 1;
    else cart.push({ name, qty: 1 });
    writeCart(cart);
    renderCart();
    openOverlay(drawer);
    toast('Added to your availability inquiry.');
  }));

  document.querySelectorAll('[data-cart-open]').forEach(button => button.addEventListener('click', () => openOverlay(drawer)));
  document.querySelectorAll('[data-cart-close]').forEach(button => button.addEventListener('click', closeOverlays));
  backdrop?.addEventListener('click', closeOverlays);
  document.addEventListener('keydown', event => { if (event.key === 'Escape') closeOverlays(); });

  inquiryButton?.addEventListener('click', () => {
    const cart = readCart();
    if (!cart.length) return;
    const lines = ['Hi Bringing Japan 2 U,', '', 'I’m interested in availability for:', ''];
    cart.forEach(item => lines.push('- ' + item.qty + ' × ' + item.name));
    lines.push('', 'I understand pricing and checkout are not live yet. Please let me know when details are available.');
    location.href = 'mailto:bringingjapantoyou@gmail.com?subject=' + encodeURIComponent('Inventory Availability Inquiry') + '&body=' + encodeURIComponent(lines.join('\n'));
  });
  renderCart();

  const savedDrawer = document.createElement('aside');
  savedDrawer.className = 'saved-drawer';
  savedDrawer.setAttribute('aria-hidden', 'true');
  savedDrawer.innerHTML = '<div class="saved-head"><div><small>COLLECTOR SHORTLIST</small><strong>Saved finds</strong></div><button type="button" data-saved-close aria-label="Close saved finds">×</button></div><div class="saved-items" data-saved-items></div><div class="saved-foot">Saved locally in this browser. Pricing will appear only when finalized.</div>';
  document.body.appendChild(savedDrawer);

  const normalizeSaved = items => (Array.isArray(items) ? items : [])
    .filter(item => item && item.id && item.name && !retiredSavedIds.has(String(item.id)))
    .map(item => ({ id:String(item.id), name:String(item.name), url:item.url || 'shop.html', image:item.image || '' }));
  const readSaved = () => normalizeSaved(safeParse(savedKey));
  const writeSaved = items => localStorage.setItem(savedKey, JSON.stringify(normalizeSaved(items)));

  const renderSaved = () => {
    const saved = readSaved();
    writeSaved(saved);
    document.querySelectorAll('[data-saved-count]').forEach(el => el.textContent = String(saved.length));
    document.querySelectorAll('[data-save-item]').forEach(btn => {
      const isSaved = saved.some(item => item.id === btn.dataset.id);
      btn.classList.toggle('is-saved', isSaved);
      if (btn.classList.contains('save-fab')) btn.textContent = isSaved ? '♥' : '♡';
      else if (btn.classList.contains('large-save')) btn.textContent = isSaved ? '♥ Saved find' : '♡ Save this find';
      else if (btn.classList.contains('dossier-save')) btn.textContent = isSaved ? '♥ Saved find' : '♡ Save find';
      btn.setAttribute('aria-pressed', String(isSaved));
    });

    const container = savedDrawer.querySelector('[data-saved-items]');
    if (!saved.length) {
      container.innerHTML = '<div class="empty-cart"><strong>No saved finds yet.</strong><p>Save confirmed inventory and it will stay here in this browser.</p></div>';
      return;
    }
    container.innerHTML = saved.map(item =>
      '<div class="saved-line">' +
        '<div class="saved-thumb">' + (item.image ? '<img src="' + item.image + '" alt="">' : 'BJ2U') + '</div>' +
        '<div><strong>' + item.name + '</strong><span>Price pending</span></div>' +
        '<div class="saved-line-actions"><a href="' + item.url + '">View →</a><button type="button" data-remove-saved="' + item.id + '">Remove</button></div>' +
      '</div>'
    ).join('');
    container.querySelectorAll('[data-remove-saved]').forEach(btn => btn.addEventListener('click', () => {
      writeSaved(readSaved().filter(item => item.id !== btn.dataset.removeSaved));
      renderSaved();
    }));
  };

  document.addEventListener('click', event => {
    const saveButton = event.target.closest('[data-save-item]');
    if (saveButton) {
      const saved = readSaved();
      const id = saveButton.dataset.id;
      const existing = saved.findIndex(item => item.id === id);
      if (existing >= 0) {
        saved.splice(existing, 1);
        toast('Removed from saved finds.');
      } else {
        saved.push({ id, name:saveButton.dataset.name || 'Saved find', url:saveButton.dataset.url || 'shop.html', image:saveButton.dataset.image || '' });
        toast('Saved to your collector shortlist.');
      }
      writeSaved(saved);
      renderSaved();
    }
    if (event.target.closest('[data-saved-open]')) {
      closeOverlays();
      openOverlay(savedDrawer);
    }
    if (event.target.closest('[data-saved-close]')) closeOverlays();
  });
  renderSaved();

  const cards = [...document.querySelectorAll('[data-product-card]')];
  const grid = document.querySelector('[data-product-grid]');
  const search = document.querySelector('[data-product-search]');
  const filters = [...document.querySelectorAll('[data-filter]')];
  const sort = document.querySelector('[data-sort-products]');
  const resultCount = document.querySelector('[data-result-count]');
  const noResults = document.querySelector('[data-no-results]');
  let activeFilter = new URLSearchParams(location.search).get('category') || 'all';
  const validFilters = new Set(['all', ...filters.map(btn => btn.dataset.filter)]);
  if (!validFilters.has(activeFilter)) activeFilter = 'all';

  const sortCards = () => {
    if (!grid || !sort) return;
    const mode = sort.value;
    const ordered = [...cards].sort((a,b) => mode === 'name'
      ? String(a.dataset.name).localeCompare(String(b.dataset.name))
      : cards.indexOf(a) - cards.indexOf(b));
    ordered.forEach(card => grid.appendChild(card));
  };

  const applyFilters = () => {
    const query = (search?.value || '').trim().toLowerCase();
    let visible = 0;
    cards.forEach(card => {
      const categories = (card.dataset.category || '').split(' ');
      const searchable = (card.dataset.search || '').toLowerCase();
      const show = (activeFilter === 'all' || categories.includes(activeFilter)) && (!query || searchable.includes(query));
      card.hidden = !show;
      if (show) visible++;
    });
    if (resultCount) resultCount.textContent = visible + (visible === 1 ? ' confirmed item' : ' confirmed items');
    if (noResults) noResults.hidden = visible !== 0;
    filters.forEach(btn => btn.classList.toggle('active', btn.dataset.filter === activeFilter));
  };

  filters.forEach(btn => btn.addEventListener('click', () => {
    activeFilter = btn.dataset.filter;
    history.replaceState({}, '', activeFilter === 'all' ? 'shop.html' : 'shop.html?category=' + encodeURIComponent(activeFilter));
    applyFilters();
  }));
  search?.addEventListener('input', applyFilters);
  sort?.addEventListener('change', sortCards);
  document.querySelectorAll('[data-view]').forEach(btn => btn.addEventListener('click', () => {
    document.querySelectorAll('[data-view]').forEach(item => item.classList.toggle('active', item === btn));
    grid?.classList.toggle('list-view', btn.dataset.view === 'list');
  }));
  if (cards.length) { sortCards(); applyFilters(); }

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
      const lines = ['Hi Bringing Japan 2 U,','','I would like to request a Japan find:','','Product: ' + product,'Series / brand: ' + String(form.get('series') || ''),'Budget: ' + String(form.get('budget') || ''),'Country: ' + String(form.get('country') || ''),'Name: ' + String(form.get('name') || ''),'','Details:',String(form.get('details') || ''),'','I understand this is a sourcing request, not a confirmed order.'];
      location.href = 'mailto:bringingjapantoyou@gmail.com?subject=' + encodeURIComponent('Japan Find Request — ' + product) + '&body=' + encodeURIComponent(lines.join('\n'));
    });
  }

  if (!document.querySelector('.mobile-dock')) {
    const dock = document.createElement('nav');
    dock.className = 'mobile-dock';
    dock.setAttribute('aria-label', 'Mobile quick navigation');
    dock.innerHTML = '<a href="index.html"><b>⌂</b><span>Home</span></a><a href="shop.html"><b>⌕</b><span>Inventory</span></a><button type="button" data-saved-open><b>♡</b><span>Saved</span></button><button type="button" data-cart-open><b>?</b><span>Inquiry</span></button>';
    document.body.appendChild(dock);
    dock.querySelector('[data-saved-open]').addEventListener('click', () => { closeOverlays(); openOverlay(savedDrawer); });
    dock.querySelector('[data-cart-open]').addEventListener('click', () => openOverlay(drawer));
  }

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduceMotion && 'IntersectionObserver' in window) {
    const revealTargets = [...document.querySelectorAll('main > section, .radar-card, .product-card, .tool-card, .inventory-slot')];
    revealTargets.forEach(el => el.classList.add('reveal-ready'));
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    }), { threshold:.07, rootMargin:'0px 0px -20px 0px' });
    revealTargets.forEach(el => observer.observe(el));
  }
})(); + pricedSubtotal.toFixed(2);
    if (inquiryButton) inquiryButton.disabled = false;

    itemsEl.querySelectorAll('[data-qty-index]').forEach(btn => btn.addEventListener('click', () => {
      const next = readCart();
      const index = Number(btn.dataset.qtyIndex);
      const delta = Number(btn.dataset.delta);
      if (!next[index]) return;
      next[index].qty += delta;
      if (next[index].qty <= 0) next.splice(index, 1);
      writeCart(next);
      renderCart();
    }));

    itemsEl.querySelectorAll('[data-remove-index]').forEach(btn => btn.addEventListener('click', () => {
      const next = readCart();
      next.splice(Number(btn.dataset.removeIndex), 1);
      writeCart(next);
      renderCart();
    }));
  };

  document.querySelectorAll('[data-add-cart]').forEach(button => button.addEventListener('click', () => {
    const cart = readCart();
    const name = String(button.dataset.name || '');
    if (!name) return;
    const match = cart.find(item => item.name === name);
    if (match) match.qty += 1;
    else cart.push({ name, qty: 1 });
    writeCart(cart);
    renderCart();
    openOverlay(drawer);
    toast('Added to your availability inquiry.');
  }));

  document.querySelectorAll('[data-cart-open]').forEach(button => button.addEventListener('click', () => openOverlay(drawer)));
  document.querySelectorAll('[data-cart-close]').forEach(button => button.addEventListener('click', closeOverlays));
  backdrop?.addEventListener('click', closeOverlays);
  document.addEventListener('keydown', event => { if (event.key === 'Escape') closeOverlays(); });

  inquiryButton?.addEventListener('click', () => {
    const cart = readCart();
    if (!cart.length) return;
    const lines = ['Hi Bringing Japan 2 U,', '', 'I’m interested in availability for:', ''];
    cart.forEach(item => lines.push('- ' + item.qty + ' × ' + item.name));
    lines.push('', 'I understand pricing and checkout are not live yet. Please let me know when details are available.');
    location.href = 'mailto:bringingjapantoyou@gmail.com?subject=' + encodeURIComponent('Inventory Availability Inquiry') + '&body=' + encodeURIComponent(lines.join('\n'));
  });
  renderCart();

  const savedDrawer = document.createElement('aside');
  savedDrawer.className = 'saved-drawer';
  savedDrawer.setAttribute('aria-hidden', 'true');
  savedDrawer.innerHTML = '<div class="saved-head"><div><small>COLLECTOR SHORTLIST</small><strong>Saved finds</strong></div><button type="button" data-saved-close aria-label="Close saved finds">×</button></div><div class="saved-items" data-saved-items></div><div class="saved-foot">Saved locally in this browser. Pricing will appear only when finalized.</div>';
  document.body.appendChild(savedDrawer);

  const normalizeSaved = items => (Array.isArray(items) ? items : [])
    .filter(item => item && item.id && item.name && !retiredSavedIds.has(String(item.id)))
    .map(item => ({ id:String(item.id), name:String(item.name), url:item.url || 'shop.html', image:item.image || '' }));
  const readSaved = () => normalizeSaved(safeParse(savedKey));
  const writeSaved = items => localStorage.setItem(savedKey, JSON.stringify(normalizeSaved(items)));

  const renderSaved = () => {
    const saved = readSaved();
    writeSaved(saved);
    document.querySelectorAll('[data-saved-count]').forEach(el => el.textContent = String(saved.length));
    document.querySelectorAll('[data-save-item]').forEach(btn => {
      const isSaved = saved.some(item => item.id === btn.dataset.id);
      btn.classList.toggle('is-saved', isSaved);
      if (btn.classList.contains('save-fab')) btn.textContent = isSaved ? '♥' : '♡';
      else if (btn.classList.contains('large-save')) btn.textContent = isSaved ? '♥ Saved find' : '♡ Save this find';
      else if (btn.classList.contains('dossier-save')) btn.textContent = isSaved ? '♥ Saved find' : '♡ Save find';
      btn.setAttribute('aria-pressed', String(isSaved));
    });

    const container = savedDrawer.querySelector('[data-saved-items]');
    if (!saved.length) {
      container.innerHTML = '<div class="empty-cart"><strong>No saved finds yet.</strong><p>Save confirmed inventory and it will stay here in this browser.</p></div>';
      return;
    }
    container.innerHTML = saved.map(item =>
      '<div class="saved-line">' +
        '<div class="saved-thumb">' + (item.image ? '<img src="' + item.image + '" alt="">' : 'BJ2U') + '</div>' +
        '<div><strong>' + item.name + '</strong><span>Price pending</span></div>' +
        '<div class="saved-line-actions"><a href="' + item.url + '">View →</a><button type="button" data-remove-saved="' + item.id + '">Remove</button></div>' +
      '</div>'
    ).join('');
    container.querySelectorAll('[data-remove-saved]').forEach(btn => btn.addEventListener('click', () => {
      writeSaved(readSaved().filter(item => item.id !== btn.dataset.removeSaved));
      renderSaved();
    }));
  };

  document.addEventListener('click', event => {
    const saveButton = event.target.closest('[data-save-item]');
    if (saveButton) {
      const saved = readSaved();
      const id = saveButton.dataset.id;
      const existing = saved.findIndex(item => item.id === id);
      if (existing >= 0) {
        saved.splice(existing, 1);
        toast('Removed from saved finds.');
      } else {
        saved.push({ id, name:saveButton.dataset.name || 'Saved find', url:saveButton.dataset.url || 'shop.html', image:saveButton.dataset.image || '' });
        toast('Saved to your collector shortlist.');
      }
      writeSaved(saved);
      renderSaved();
    }
    if (event.target.closest('[data-saved-open]')) {
      closeOverlays();
      openOverlay(savedDrawer);
    }
    if (event.target.closest('[data-saved-close]')) closeOverlays();
  });
  renderSaved();

  const cards = [...document.querySelectorAll('[data-product-card]')];
  const grid = document.querySelector('[data-product-grid]');
  const search = document.querySelector('[data-product-search]');
  const filters = [...document.querySelectorAll('[data-filter]')];
  const sort = document.querySelector('[data-sort-products]');
  const resultCount = document.querySelector('[data-result-count]');
  const noResults = document.querySelector('[data-no-results]');
  let activeFilter = new URLSearchParams(location.search).get('category') || 'all';
  const validFilters = new Set(['all', ...filters.map(btn => btn.dataset.filter)]);
  if (!validFilters.has(activeFilter)) activeFilter = 'all';

  const sortCards = () => {
    if (!grid || !sort) return;
    const mode = sort.value;
    const ordered = [...cards].sort((a,b) => mode === 'name'
      ? String(a.dataset.name).localeCompare(String(b.dataset.name))
      : cards.indexOf(a) - cards.indexOf(b));
    ordered.forEach(card => grid.appendChild(card));
  };

  const applyFilters = () => {
    const query = (search?.value || '').trim().toLowerCase();
    let visible = 0;
    cards.forEach(card => {
      const categories = (card.dataset.category || '').split(' ');
      const searchable = (card.dataset.search || '').toLowerCase();
      const show = (activeFilter === 'all' || categories.includes(activeFilter)) && (!query || searchable.includes(query));
      card.hidden = !show;
      if (show) visible++;
    });
    if (resultCount) resultCount.textContent = visible + (visible === 1 ? ' confirmed item' : ' confirmed items');
    if (noResults) noResults.hidden = visible !== 0;
    filters.forEach(btn => btn.classList.toggle('active', btn.dataset.filter === activeFilter));
  };

  filters.forEach(btn => btn.addEventListener('click', () => {
    activeFilter = btn.dataset.filter;
    history.replaceState({}, '', activeFilter === 'all' ? 'shop.html' : 'shop.html?category=' + encodeURIComponent(activeFilter));
    applyFilters();
  }));
  search?.addEventListener('input', applyFilters);
  sort?.addEventListener('change', sortCards);
  document.querySelectorAll('[data-view]').forEach(btn => btn.addEventListener('click', () => {
    document.querySelectorAll('[data-view]').forEach(item => item.classList.toggle('active', item === btn));
    grid?.classList.toggle('list-view', btn.dataset.view === 'list');
  }));
  if (cards.length) { sortCards(); applyFilters(); }

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
      const lines = ['Hi Bringing Japan 2 U,','','I would like to request a Japan find:','','Product: ' + product,'Series / brand: ' + String(form.get('series') || ''),'Budget: ' + String(form.get('budget') || ''),'Country: ' + String(form.get('country') || ''),'Name: ' + String(form.get('name') || ''),'','Details:',String(form.get('details') || ''),'','I understand this is a sourcing request, not a confirmed order.'];
      location.href = 'mailto:bringingjapantoyou@gmail.com?subject=' + encodeURIComponent('Japan Find Request — ' + product) + '&body=' + encodeURIComponent(lines.join('\n'));
    });
  }

  if (!document.querySelector('.mobile-dock')) {
    const dock = document.createElement('nav');
    dock.className = 'mobile-dock';
    dock.setAttribute('aria-label', 'Mobile quick navigation');
    dock.innerHTML = '<a href="index.html"><b>⌂</b><span>Home</span></a><a href="shop.html"><b>⌕</b><span>Inventory</span></a><button type="button" data-saved-open><b>♡</b><span>Saved</span></button><button type="button" data-cart-open><b>?</b><span>Inquiry</span></button>';
    document.body.appendChild(dock);
    dock.querySelector('[data-saved-open]').addEventListener('click', () => { closeOverlays(); openOverlay(savedDrawer); });
    dock.querySelector('[data-cart-open]').addEventListener('click', () => openOverlay(drawer));
  }

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduceMotion && 'IntersectionObserver' in window) {
    const revealTargets = [...document.querySelectorAll('main > section, .radar-card, .product-card, .tool-card, .inventory-slot')];
    revealTargets.forEach(el => el.classList.add('reveal-ready'));
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    }), { threshold:.07, rootMargin:'0px 0px -20px 0px' });
    revealTargets.forEach(el => observer.observe(el));
  }
})(); + item.price.toFixed(2) + ' each' : 'Price pending') + '</span></div>' +
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

    if (totalEl) totalEl.textContent = 'Pricing pending';
    if (inquiryButton) inquiryButton.disabled = false;

    itemsEl.querySelectorAll('[data-qty-index]').forEach(btn => btn.addEventListener('click', () => {
      const next = readCart();
      const index = Number(btn.dataset.qtyIndex);
      const delta = Number(btn.dataset.delta);
      if (!next[index]) return;
      next[index].qty += delta;
      if (next[index].qty <= 0) next.splice(index, 1);
      writeCart(next);
      renderCart();
    }));

    itemsEl.querySelectorAll('[data-remove-index]').forEach(btn => btn.addEventListener('click', () => {
      const next = readCart();
      next.splice(Number(btn.dataset.removeIndex), 1);
      writeCart(next);
      renderCart();
    }));
  };

  document.querySelectorAll('[data-add-cart]').forEach(button => button.addEventListener('click', () => {
    const cart = readCart();
    const name = String(button.dataset.name || '');
    if (!name) return;
    const match = cart.find(item => item.name === name);
    if (match) match.qty += 1;
    else cart.push({ name, qty: 1 });
    writeCart(cart);
    renderCart();
    openOverlay(drawer);
    toast('Added to your availability inquiry.');
  }));

  document.querySelectorAll('[data-cart-open]').forEach(button => button.addEventListener('click', () => openOverlay(drawer)));
  document.querySelectorAll('[data-cart-close]').forEach(button => button.addEventListener('click', closeOverlays));
  backdrop?.addEventListener('click', closeOverlays);
  document.addEventListener('keydown', event => { if (event.key === 'Escape') closeOverlays(); });

  inquiryButton?.addEventListener('click', () => {
    const cart = readCart();
    if (!cart.length) return;
    const lines = ['Hi Bringing Japan 2 U,', '', 'I’m interested in availability for:', ''];
    cart.forEach(item => lines.push('- ' + item.qty + ' × ' + item.name));
    lines.push('', 'I understand pricing and checkout are not live yet. Please let me know when details are available.');
    location.href = 'mailto:bringingjapantoyou@gmail.com?subject=' + encodeURIComponent('Inventory Availability Inquiry') + '&body=' + encodeURIComponent(lines.join('\n'));
  });
  renderCart();

  const savedDrawer = document.createElement('aside');
  savedDrawer.className = 'saved-drawer';
  savedDrawer.setAttribute('aria-hidden', 'true');
  savedDrawer.innerHTML = '<div class="saved-head"><div><small>COLLECTOR SHORTLIST</small><strong>Saved finds</strong></div><button type="button" data-saved-close aria-label="Close saved finds">×</button></div><div class="saved-items" data-saved-items></div><div class="saved-foot">Saved locally in this browser. Pricing will appear only when finalized.</div>';
  document.body.appendChild(savedDrawer);

  const normalizeSaved = items => (Array.isArray(items) ? items : [])
    .filter(item => item && item.id && item.name && !retiredSavedIds.has(String(item.id)))
    .map(item => ({ id:String(item.id), name:String(item.name), url:item.url || 'shop.html', image:item.image || '' }));
  const readSaved = () => normalizeSaved(safeParse(savedKey));
  const writeSaved = items => localStorage.setItem(savedKey, JSON.stringify(normalizeSaved(items)));

  const renderSaved = () => {
    const saved = readSaved();
    writeSaved(saved);
    document.querySelectorAll('[data-saved-count]').forEach(el => el.textContent = String(saved.length));
    document.querySelectorAll('[data-save-item]').forEach(btn => {
      const isSaved = saved.some(item => item.id === btn.dataset.id);
      btn.classList.toggle('is-saved', isSaved);
      if (btn.classList.contains('save-fab')) btn.textContent = isSaved ? '♥' : '♡';
      else if (btn.classList.contains('large-save')) btn.textContent = isSaved ? '♥ Saved find' : '♡ Save this find';
      else if (btn.classList.contains('dossier-save')) btn.textContent = isSaved ? '♥ Saved find' : '♡ Save find';
      btn.setAttribute('aria-pressed', String(isSaved));
    });

    const container = savedDrawer.querySelector('[data-saved-items]');
    if (!saved.length) {
      container.innerHTML = '<div class="empty-cart"><strong>No saved finds yet.</strong><p>Save confirmed inventory and it will stay here in this browser.</p></div>';
      return;
    }
    container.innerHTML = saved.map(item =>
      '<div class="saved-line">' +
        '<div class="saved-thumb">' + (item.image ? '<img src="' + item.image + '" alt="">' : 'BJ2U') + '</div>' +
        '<div><strong>' + item.name + '</strong><span>Price pending</span></div>' +
        '<div class="saved-line-actions"><a href="' + item.url + '">View →</a><button type="button" data-remove-saved="' + item.id + '">Remove</button></div>' +
      '</div>'
    ).join('');
    container.querySelectorAll('[data-remove-saved]').forEach(btn => btn.addEventListener('click', () => {
      writeSaved(readSaved().filter(item => item.id !== btn.dataset.removeSaved));
      renderSaved();
    }));
  };

  document.addEventListener('click', event => {
    const saveButton = event.target.closest('[data-save-item]');
    if (saveButton) {
      const saved = readSaved();
      const id = saveButton.dataset.id;
      const existing = saved.findIndex(item => item.id === id);
      if (existing >= 0) {
        saved.splice(existing, 1);
        toast('Removed from saved finds.');
      } else {
        saved.push({ id, name:saveButton.dataset.name || 'Saved find', url:saveButton.dataset.url || 'shop.html', image:saveButton.dataset.image || '' });
        toast('Saved to your collector shortlist.');
      }
      writeSaved(saved);
      renderSaved();
    }
    if (event.target.closest('[data-saved-open]')) {
      closeOverlays();
      openOverlay(savedDrawer);
    }
    if (event.target.closest('[data-saved-close]')) closeOverlays();
  });
  renderSaved();

  const cards = [...document.querySelectorAll('[data-product-card]')];
  const grid = document.querySelector('[data-product-grid]');
  const search = document.querySelector('[data-product-search]');
  const filters = [...document.querySelectorAll('[data-filter]')];
  const sort = document.querySelector('[data-sort-products]');
  const resultCount = document.querySelector('[data-result-count]');
  const noResults = document.querySelector('[data-no-results]');
  let activeFilter = new URLSearchParams(location.search).get('category') || 'all';
  const validFilters = new Set(['all', ...filters.map(btn => btn.dataset.filter)]);
  if (!validFilters.has(activeFilter)) activeFilter = 'all';

  const sortCards = () => {
    if (!grid || !sort) return;
    const mode = sort.value;
    const ordered = [...cards].sort((a,b) => mode === 'name'
      ? String(a.dataset.name).localeCompare(String(b.dataset.name))
      : cards.indexOf(a) - cards.indexOf(b));
    ordered.forEach(card => grid.appendChild(card));
  };

  const applyFilters = () => {
    const query = (search?.value || '').trim().toLowerCase();
    let visible = 0;
    cards.forEach(card => {
      const categories = (card.dataset.category || '').split(' ');
      const searchable = (card.dataset.search || '').toLowerCase();
      const show = (activeFilter === 'all' || categories.includes(activeFilter)) && (!query || searchable.includes(query));
      card.hidden = !show;
      if (show) visible++;
    });
    if (resultCount) resultCount.textContent = visible + (visible === 1 ? ' confirmed item' : ' confirmed items');
    if (noResults) noResults.hidden = visible !== 0;
    filters.forEach(btn => btn.classList.toggle('active', btn.dataset.filter === activeFilter));
  };

  filters.forEach(btn => btn.addEventListener('click', () => {
    activeFilter = btn.dataset.filter;
    history.replaceState({}, '', activeFilter === 'all' ? 'shop.html' : 'shop.html?category=' + encodeURIComponent(activeFilter));
    applyFilters();
  }));
  search?.addEventListener('input', applyFilters);
  sort?.addEventListener('change', sortCards);
  document.querySelectorAll('[data-view]').forEach(btn => btn.addEventListener('click', () => {
    document.querySelectorAll('[data-view]').forEach(item => item.classList.toggle('active', item === btn));
    grid?.classList.toggle('list-view', btn.dataset.view === 'list');
  }));
  if (cards.length) { sortCards(); applyFilters(); }

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
      const lines = ['Hi Bringing Japan 2 U,','','I would like to request a Japan find:','','Product: ' + product,'Series / brand: ' + String(form.get('series') || ''),'Budget: ' + String(form.get('budget') || ''),'Country: ' + String(form.get('country') || ''),'Name: ' + String(form.get('name') || ''),'','Details:',String(form.get('details') || ''),'','I understand this is a sourcing request, not a confirmed order.'];
      location.href = 'mailto:bringingjapantoyou@gmail.com?subject=' + encodeURIComponent('Japan Find Request — ' + product) + '&body=' + encodeURIComponent(lines.join('\n'));
    });
  }

  if (!document.querySelector('.mobile-dock')) {
    const dock = document.createElement('nav');
    dock.className = 'mobile-dock';
    dock.setAttribute('aria-label', 'Mobile quick navigation');
    dock.innerHTML = '<a href="index.html"><b>⌂</b><span>Home</span></a><a href="shop.html"><b>⌕</b><span>Inventory</span></a><button type="button" data-saved-open><b>♡</b><span>Saved</span></button><button type="button" data-cart-open><b>?</b><span>Inquiry</span></button>';
    document.body.appendChild(dock);
    dock.querySelector('[data-saved-open]').addEventListener('click', () => { closeOverlays(); openOverlay(savedDrawer); });
    dock.querySelector('[data-cart-open]').addEventListener('click', () => openOverlay(drawer));
  }

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduceMotion && 'IntersectionObserver' in window) {
    const revealTargets = [...document.querySelectorAll('main > section, .radar-card, .product-card, .tool-card, .inventory-slot')];
    revealTargets.forEach(el => el.classList.add('reveal-ready'));
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    }), { threshold:.07, rootMargin:'0px 0px -20px 0px' });
    revealTargets.forEach(el => observer.observe(el));
  }
})();