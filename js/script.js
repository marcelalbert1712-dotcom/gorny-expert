/**
 * Горный экперт — Основной скрипт
 * ================================
 * Содержит: theme manager, i18n, data loader, animations, form handler, charts
 */

(function() {
  'use strict';

  // ============================================
  // 1. THEME MANAGER (dark-theme skill)
  // ============================================
  const ThemeManager = {
    init() {
      const saved = localStorage.getItem('theme');
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const theme = saved || (prefersDark ? 'dark' : 'light');
      this.set(theme);

      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!localStorage.getItem('theme')) {
          this.set(e.matches ? 'dark' : 'light');
        }
      });

      const btn = document.getElementById('themeToggle');
      if (btn) {
        btn.addEventListener('click', () => this.toggle());
      }
    },

    set(theme) {
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem('theme', theme);
      this.updateIcon(theme);
    },

    toggle() {
      const current = document.documentElement.getAttribute('data-theme') || 'dark';
      this.set(current === 'dark' ? 'light' : 'dark');
    },

    updateIcon(theme) {
      const btn = document.getElementById('themeToggle');
      if (btn) {
        const t = window.TRANSLATIONS;
        const lang = I18nManager?.currentLang || 'ru';
        btn.textContent = theme === 'dark'
          ? (t?.[lang]?.common?.theme_dark || '🌙')
          : (t?.[lang]?.common?.theme_light || '☀️');
      }
    }
  };

  // ============================================
  // 2. I18N MANAGER (multilanguage skill)
  // ============================================
  const I18nManager = {
    currentLang: 'ru',

    init() {
      try {
        console.log('🌐 I18nManager.init: starting');
        this.currentLang = localStorage.getItem('lang') || 'ru';
        console.log('🌐 I18nManager.init: currentLang =', this.currentLang);
        this.apply(this.currentLang);

        const langBtns = document.querySelectorAll('[data-lang]');
        console.log('🌐 I18nManager.init: found', langBtns.length, 'lang buttons');
        if (!langBtns.length) {
          console.warn('⚠ No [data-lang] buttons found');
        }
        langBtns.forEach(btn => {
          btn.addEventListener('click', (e) => {
            if (!btn.dataset.lang) return;
            this.apply(btn.dataset.lang);
          });
        });
      } catch (err) {
        console.error('I18nManager init error:', err);
      }
    },

    apply(lang) {
      console.log('🌐 I18nManager.apply:', lang);
      this.currentLang = lang;
      localStorage.setItem('lang', lang);
      document.documentElement.lang = lang;
      document.documentElement.setAttribute('data-lang', lang);

      const t = window.TRANSLATIONS?.[lang];
      console.log('🌐 window.TRANSLATIONS exists:', !!window.TRANSLATIONS, '| lang data exists:', !!t);
      if (!t) {
        console.warn('🌐 Translations not found for:', lang, 'window.TRANSLATIONS keys:', Object.keys(window.TRANSLATIONS || {}));
        return;
      }

      // Translate data-i18n elements
      document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        const keys = key.split('.');
        let value = t;
        for (const k of keys) {
          value = value?.[k];
        }
        if (typeof value === 'string' || typeof value === 'number') {
          el.textContent = value;
        }
      });

      // Translate placeholders
      document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        const keys = key.split('.');
        let value = t;
        for (const k of keys) {
          value = value?.[k];
        }
        if (typeof value === 'string') {
          el.placeholder = value;
        }
      });

      // Update lang buttons
      document.querySelectorAll('[data-lang]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.lang === lang);
      });

      // Update theme icon text
      ThemeManager.updateIcon(document.documentElement.getAttribute('data-theme') || 'dark');

      // Update page info text if it had dynamic content
      this.updateDynamicContent(lang);
    },

    updateDynamicContent(lang) {
      // Re-render data-loaded content with new language
      const page = document.body.dataset.page || this.detectPage();
      if (window.appDataLoaded) {
        if (page === 'index') renderArticles();
        if (page === 'resorts') renderResorts();
        if (page === 'weather') renderWeather();
        if (page === 'calendar') renderCalendar();
        if (page === 'tips') renderTips();
      }
    },

    detectPage() {
      const path = window.location.pathname.split('/').pop() || 'index.html';
      if (path === 'index.html' || path === '' || path === '/') return 'index';
      return path.replace('.html', '');
    },

    t(key) {
      const keys = key.split('.');
      let value = window.TRANSLATIONS?.[this.currentLang];
      for (const k of keys) {
        value = value?.[k];
      }
      return typeof value === 'string' ? value : key;
    }
  };

  // ============================================
  // 3. DATA LOADER
  // ============================================
  const DATA = {
    resorts: { russia: [], world: [] },
    articles: [],
    weather: {},
    calendar: { events: [] },
    summerSkiing: [],
    trends: [],
    loaded: false
  };

  async function loadData() {
    try {
      // Load both JSON files
      const [dataResp, articlesResp] = await Promise.all([
        fetch('content/data.json'),
        fetch('content/articles.json')
      ]);

      if (!dataResp.ok || !articlesResp.ok) {
        throw new Error('Failed to load data files');
      }

      const dataJson = await dataResp.json();
      const articlesJson = await articlesResp.json();

      // Populate DATA
      DATA.resorts = dataJson.resorts || { russia: [], world: [] };
      DATA.weather = dataJson.weather_forecast || {};
      DATA.calendar = dataJson.calendar || { events: [] };
      DATA.summerSkiing = dataJson.weather_forecast?.summer_skiing || [];
      DATA.trends = dataJson.analysis?.trends_2025_2026 || [];
      DATA.articles = articlesJson.articles || [];
      DATA.categories = articlesJson.categories || [];
      DATA.analysis = dataJson.analysis || {};
      DATA.loaded = true;
      window.appDataLoaded = true;

      return true;
    } catch (err) {
      console.error('Error loading data:', err);
      document.querySelectorAll('[data-loading]').forEach(el => {
        el.textContent = I18nManager.t('common.error');
      });
      return false;
    }
  }

  // ============================================
  // 4. ARTICLE RENDERER (Home page)
  // ============================================
  function renderArticles() {
    const grid = document.getElementById('articleGrid');
    if (!grid) return;

    const articles = DATA.articles;
    const lang = I18nManager.currentLang;
    const isRu = lang === 'ru';
    const perPage = 6;
    let currentPage = 1;

    function getCategoryName(slug) {
      const cat = DATA.categories.find(c => c.slug === slug);
      return cat ? (isRu ? cat.name : cat.name_en) : slug;
    }

    function renderPage(page) {
      grid.innerHTML = '';
      const start = (page - 1) * perPage;
      const end = start + perPage;
      const pageItems = articles.slice(start, end);

      if (pageItems.length === 0) {
        grid.innerHTML = `<div class="no-articles-message">${I18nManager.t('home.no_articles')}</div>`;
        return;
      }

      pageItems.forEach((article, idx) => {
        const isFeatured = article.featured && page === 1 && idx === 0;
        const card = document.createElement('article');
        card.className = `article-card animate-on-scroll ${isFeatured ? 'article-featured' : ''}`;

        const title = isRu ? article.title : (article.title_en || article.title);
        const excerpt = isRu ? article.excerpt : (article.excerpt_en || article.excerpt);
        const author = isRu ? article.author : (article.author_en || article.author);
        const readTime = isRu ? article.readTime : (article.readTime_en || article.readTime);
        const catName = getCategoryName(article.category);
        const imgAlt = `${title} — фото курорта`;
        const date = new Date(article.date).toLocaleDateString(isRu ? 'ru-RU' : 'en-US', {
          day: 'numeric', month: 'long', year: 'numeric'
        });

        card.style.cursor = 'pointer';
        card.addEventListener('click', () => {
          window.location.href = `article.html?slug=${article.slug}`;
        });
        card.innerHTML = `
          <img class="article-card-image" src="${article.image}" alt="${imgAlt}" loading="lazy">
          <div class="article-card-body">
            <span class="article-card-category">${catName}</span>
            <h3>${title}</h3>
            <p>${excerpt}</p>
            <div class="article-card-meta">
              <span>${author} · ${date}</span>
              <span>${readTime}</span>
            </div>
          </div>
        `;
        grid.appendChild(card);
      });
    }

    function updatePagination() {
      const totalPages = Math.ceil(articles.length / perPage);
      const prevBtn = document.getElementById('prevPage');
      const nextBtn = document.getElementById('nextPage');
      const infoEl = document.getElementById('pageInfo');

      if (prevBtn) {
        prevBtn.disabled = currentPage <= 1;
        prevBtn.onclick = () => { if (currentPage > 1) { currentPage--; renderPage(currentPage); updatePagination(); }};
      }
      if (nextBtn) {
        nextBtn.disabled = currentPage >= totalPages;
        nextBtn.onclick = () => { if (currentPage < totalPages) { currentPage++; renderPage(currentPage); updatePagination(); }};
      }
      if (infoEl) {
        infoEl.textContent = `${I18nManager.t('home.page')} ${currentPage} ${I18nManager.t('home.of')} ${totalPages}`;
      }
    }

    // Initial render
    renderPage(1);
    updatePagination();

    // Re-run animations
    initScrollAnimations();
  }

  // ============================================
  // 5. RESORT RENDERER
  // ============================================
  function renderResorts() {
    const russianContainer = document.getElementById('russianResorts');
    const worldContainer = document.getElementById('worldResorts');
    if (!russianContainer && !worldContainer) return;

    const lang = I18nManager.currentLang;
    const isRu = lang === 'ru';

    function createResortCard(resort) {
      const price = resort.skipass.adult_1day;
      let currency = resort.skipass.currency || '₽';
      let currencyLabel = I18nManager.t('resorts.currency_rub');

      if (currency === 'CHF') currencyLabel = I18nManager.t('resorts.currency_chf');
      else if (currency === '€') currencyLabel = I18nManager.t('resorts.currency_eur');
      else if (currency === 'BGN') currencyLabel = I18nManager.t('resorts.currency_bgn');

      const seasonText = `${I18nManager.t('resorts.open')}: ${resort.season.open}, ${I18nManager.t('resorts.close')}: ${resort.season.close}`;
      const altText = `${resort.name} — горнолыжный курорт, высота ${resort.altitude.min}-${resort.altitude.max} м`;

      // Generate a placeholder gradient for each resort
      const gradients = [
        'linear-gradient(135deg, #0f172a, #1e293b)',
        'linear-gradient(135deg, #0f172a, #0f3460)',
        'linear-gradient(135deg, #1a1a2e, #16213e)',
        'linear-gradient(135deg, #0b1121, #1a2332)',
      ];
      const gradient = gradients[resort.id?.length % gradients.length];

      const prosList = (resort.pros || []).map(p => `<li>${p}</li>`).join('');
      const consList = (resort.cons || []).map(c => `<li>${c}</li>`).join('');

      // Events
      const eventsList = (resort.events || []).map(e =>
        `<div style="font-size:0.8rem;color:var(--text-muted);padding:2px 0;">• ${e.date}: ${e.name}</div>`
      ).join('');

      const card = document.createElement('div');
      card.className = 'resort-card animate-on-scroll';
      card.innerHTML = `
        <div class="resort-card-header" style="background: ${gradient};">
          <div class="rating-badge">★ ${resort.rating}</div>
          <h3>${resort.name}</h3>
          <div class="region">${resort.country} — ${resort.region}</div>
        </div>
        <div class="resort-card-body">
          <div class="resort-stats">
            <div class="resort-stat">
              <div class="resort-stat-value">${resort.altitude.min}-${resort.altitude.max} ${I18nManager.t('resorts.m')}</div>
              <div class="resort-stat-label">${I18nManager.t('resorts.altitude')}</div>
            </div>
            <div class="resort-stat">
              <div class="resort-stat-value">${resort.total_slopes_km} ${I18nManager.t('resorts.km')}</div>
              <div class="resort-stat-label">${I18nManager.t('resorts.slopes')}</div>
            </div>
          </div>
          <div class="resort-season">
            <strong>${I18nManager.t('resorts.season')}:</strong> ${seasonText}
          </div>
          <div class="resort-pros-cons">
            <div class="resort-pros">
              <h4>${I18nManager.t('resorts.pros')}</h4>
              <ul>${prosList}</ul>
            </div>
            <div class="resort-cons">
              <h4>${I18nManager.t('resorts.cons')}</h4>
              <ul>${consList}</ul>
            </div>
          </div>
          ${eventsList ? `<div style="margin-top:12px;"><strong style="font-size:0.85rem;color:var(--text-secondary);">${I18nManager.t('resorts.events_at')}:</strong>${eventsList}</div>` : ''}
        </div>
        <div class="resort-card-footer">
          <div class="resort-price">${price} <small>${currencyLabel}</small></div>
          <span style="font-size:0.75rem;color:var(--text-muted);">${I18nManager.t('resorts.skipass')}</span>
        </div>
      `;
      return card;
    }

    // Render Russian resorts
    if (russianContainer) {
      russianContainer.innerHTML = '';
      DATA.resorts.russia.forEach(resort => {
        russianContainer.appendChild(createResortCard(resort));
      });
    }

    // Render World resorts
    if (worldContainer) {
      worldContainer.innerHTML = '';
      DATA.resorts.world.forEach(resort => {
        worldContainer.appendChild(createResortCard(resort));
      });
    }

    // Draw price chart
    drawPriceChart();

    // Init animations
    initScrollAnimations();
  }

  // ============================================
  // 6. WEATHER RENDERER
  // ============================================
  function renderWeather() {
    const weatherBody = document.getElementById('weatherTableBody');
    const summerBody = document.getElementById('summerTableBody');
    if (!weatherBody && !summerBody) return;

    const lang = I18nManager.currentLang;
    const isRu = lang === 'ru';

    // Weather table for Russian resorts
    if (weatherBody) {
      weatherBody.innerHTML = '';
      DATA.resorts.russia.forEach(resort => {
        const w = resort.weather;
        if (!w) return;

        function tempCell(val) {
          const cls = val > 0 ? 'temp-positive' : 'temp-negative';
          return `<span class="${cls}">${val > 0 ? '+' : ''}${val}°C</span>`;
        }

        const row = document.createElement('tr');
        row.innerHTML = `
          <td><strong>${resort.name}</strong></td>
          <td>${tempCell(w.january?.temp_day)} / ${tempCell(w.january?.temp_night)}<br><small style="color:var(--text-muted)">❄ ${w.january?.snow_days} ${isRu ? 'дней' : 'days'}</small></td>
          <td>${tempCell(w.february?.temp_day)} / ${tempCell(w.february?.temp_night)}<br><small style="color:var(--text-muted)">❄ ${w.february?.snow_days} ${isRu ? 'дней' : 'days'}</small></td>
          <td>${tempCell(w.march?.temp_day)} / ${tempCell(w.march?.temp_night)}<br><small style="color:var(--text-muted)">❄ ${w.march?.snow_days} ${isRu ? 'дней' : 'days'}</small></td>
        `;
        weatherBody.appendChild(row);
      });
    }

    // Summer skiing table
    if (summerBody) {
      summerBody.innerHTML = '';
      (DATA.summerSkiing || []).forEach(item => {
        const row = document.createElement('tr');
        const statusClass = item.status?.includes('открыт') || item.status?.includes('open')
          ? 'temp-positive' : 'temp-negative';
        row.innerHTML = `
          <td><strong>${item.resort}</strong></td>
          <td class="${statusClass}">${item.status}</td>
          <td>${item.temp}</td>
          <td style="font-size:0.85rem;color:var(--text-secondary)">${item.conditions}</td>
        `;
        summerBody.appendChild(row);
      });
    }

    drawPriceChart();
    initScrollAnimations();
  }

  // ============================================
  // 7. PRICE CHART (using Chart.js)
  // ============================================
  let priceChartInstance = null;

  function drawPriceChart() {
    const canvas = document.getElementById('priceChart');
    if (!canvas || typeof Chart === 'undefined') return;

    // Destroy existing chart
    if (priceChartInstance) {
      priceChartInstance.destroy();
      priceChartInstance = null;
    }

    const lang = I18nManager.currentLang;
    const isRu = lang === 'ru';

    // Collect all resorts with prices
    const allResorts = [
      ...DATA.resorts.russia.map(r => ({
        name: r.name,
        price: r.skipass.adult_1day,
        currency: '₽',
        color: '#38bdf8'
      })),
      ...DATA.resorts.world.map(r => ({
        name: r.name,
        price: r.skipass.adult_1day,
        currency: r.skipass.currency || '€',
        color: '#818cf8'
      }))
    ];

    const ctx = canvas.getContext('2d');

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

    priceChartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: allResorts.map(r => r.name),
        datasets: [{
          label: isRu ? 'Цена за 1 день' : 'Price per day',
          data: allResorts.map(r => r.price),
          backgroundColor: allResorts.map(r => r.color + (isDark ? '99' : 'CC')),
          borderColor: allResorts.map(r => r.color),
          borderWidth: 2,
          borderRadius: 4,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        aspectRatio: 2,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const resort = allResorts[ctx.dataIndex];
                return `${ctx.parsed.y} ${resort.currency}/${isRu ? 'день' : 'day'}`;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)' },
            ticks: {
              color: isDark ? '#94a3b8' : '#475569',
              callback: (val) => val + (isRu ? ' ₽' : '')
            }
          },
          x: {
            grid: { display: false },
            ticks: {
              color: isDark ? '#94a3b8' : '#475569',
              maxRotation: 45,
              font: { size: 10 }
            }
          }
        }
      }
    });
  }

  // ============================================
  // 8. CALENDAR RENDERER
  // ============================================
  function renderCalendar() {
    const tbody = document.getElementById('eventsTableBody');
    const filterContainer = document.getElementById('calendarFilters');
    if (!tbody || !filterContainer) return;

    const events = DATA.calendar.events || [];
    const lang = I18nManager.currentLang;
    const isRu = lang === 'ru';

    // Month abbreviations for filtering
    const monthMap = {
      'ноябрь': 'ноя', 'декабрь': 'дек', 'январь': 'янв', 'февраль': 'фев',
      'март': 'мар', 'апрель': 'апр',
      'november': 'nov', 'december': 'dec', 'january': 'jan', 'february': 'feb',
      'march': 'mar', 'april': 'apr'
    };

    function getMonthKey(dateStr) {
      const s = dateStr.toLowerCase();
      for (const [month, key] of Object.entries(monthMap)) {
        if (s.includes(month)) return key;
      }
      // Check for month names in Russian
      const ruMonths = ['ноябрь', 'декабрь', 'январь', 'февраль', 'март', 'апрель'];
      for (const m of ruMonths) {
        if (s.includes(m)) return m.substring(0, 3);
      }
      return 'other';
    }

    // Unique months for filters
    const months = [...new Set(events.map(e => getMonthKey(e.date)))];

    // Build filter buttons (keep "All" button)
    filterContainer.innerHTML = `<button class="filter-btn active" data-filter="all">${I18nManager.t('calendar.all_months')}</button>`;
    months.forEach(m => {
      if (m === 'other') return;
      const btn = document.createElement('button');
      btn.className = 'filter-btn';
      btn.dataset.filter = m;
      btn.textContent = m.charAt(0).toUpperCase() + m.slice(1);
      filterContainer.appendChild(btn);
    });

    function renderEvents(filter) {
      tbody.innerHTML = '';
      const filtered = filter === 'all'
        ? events
        : events.filter(e => getMonthKey(e.date) === filter);

      if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" style="text-align:center;padding:2rem;color:var(--text-muted);">${I18nManager.t('calendar.no_events')}</td></tr>`;
        return;
      }

      filtered.forEach(ev => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td style="white-space:nowrap;font-weight:600;">${ev.date}</td>
          <td>${ev.event}</td>
          <td>${ev.resort || '—'}</td>
        `;
        tbody.appendChild(row);
      });
    }

    // Filter click handlers
    filterContainer.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        filterContainer.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderEvents(btn.dataset.filter);
      });
    });

    // Initial render
    renderEvents('all');
    initScrollAnimations();
  }

  // ============================================
  // 9. TIPS RENDERER
  // ============================================
  function renderTips() {
    const grid = document.getElementById('tipsGrid');
    if (!grid) return;

    const lang = I18nManager.currentLang;
    const isRu = lang === 'ru';

    // Filter articles with category "tips"
    const tips = DATA.articles.filter(a => a.category === 'tips');

    grid.innerHTML = '';
    if (tips.length === 0) {
      grid.innerHTML = `<div class="no-articles-message">${I18nManager.t('home.no_articles')}</div>`;
      return;
    }

    tips.forEach(article => {
      const title = isRu ? article.title : (article.title_en || article.title);
      const excerpt = isRu ? article.excerpt : (article.excerpt_en || article.excerpt);
      const author = isRu ? article.author : (article.author_en || article.author);
      const readTime = isRu ? article.readTime : (article.readTime_en || article.readTime);
      const imgAlt = `${title} — советы эксперта`;
      const date = new Date(article.date).toLocaleDateString(isRu ? 'ru-RU' : 'en-US', {
        day: 'numeric', month: 'long', year: 'numeric'
      });

      const card = document.createElement('div');
      card.className = 'tip-card animate-on-scroll';
      card.style.cursor = 'pointer';
      card.addEventListener('click', () => {
        window.location.href = `article.html?slug=${article.slug}`;
      });
      card.innerHTML = `
        <img class="tip-card-image" src="${article.image}" alt="${imgAlt}" loading="lazy">
        <div class="tip-card-body">
          <h3>${title}</h3>
          <p class="tip-excerpt">${excerpt}</p>
          <div class="tip-meta">
            <span>👤 ${author}</span>
            <span>📄 ${readTime}</span>
            <span>📅 ${date}</span>
          </div>
        </div>
      `;
      grid.appendChild(card);
    });

    initScrollAnimations();
  }

  // ============================================
  // 10. SCROLL ANIMATIONS (animation-studio skill)
  // ============================================
  function initScrollAnimations() {
    // Animate on scroll (fade + slide up), plus hero fade-in
    const animElements = document.querySelectorAll('.animate-on-scroll:not(.initialized), .animate-fade-in:not(.initialized)');
    if (animElements.length === 0) return;

    // Show hero fade-in content immediately (it's in the first viewport)
    const heroFade = document.getElementById('heroContent');
    if (heroFade && !heroFade.classList.contains('visible')) {
      heroFade.classList.add('visible');
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          entry.target.classList.add('initialized');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

    animElements.forEach(el => {
      el.classList.add('initialized');
      observer.observe(el);
    });

    // Stagger containers
    const staggerContainers = document.querySelectorAll('.stagger-container:not(.stagger-init)');
    if (staggerContainers.length > 0) {
      const staggerObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            entry.target.classList.add('stagger-init');
            staggerObserver.unobserve(entry.target);
          }
        });
      }, { threshold: 0.1 });

      staggerContainers.forEach(el => {
        el.classList.add('stagger-init');
        staggerObserver.observe(el);
      });
    }
  }

  // ============================================
  // 11. FORM HANDLER → Telegram Bot API
  // ============================================
  function initForm() {
    const form = document.getElementById('subscribeForm');
    if (!form) return;

    const nameInput = document.getElementById('formName');
    const emailInput = document.getElementById('formEmail');
    const nameError = document.getElementById('nameError');
    const emailError = document.getElementById('emailError');
    const submitBtn = document.getElementById('formSubmit');
    const successEl = document.getElementById('formSuccess');

    const TELEGRAM_BOT_TOKEN = 'TELEGRAM_BOT_TOKEN_PLACEHOLDER';
    const TELEGRAM_CHAT_ID = 'TELEGRAM_CHAT_ID_PLACEHOLDER';

    function validateEmail(email) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    function setError(el, show) {
      el.classList.toggle('visible', show);
    }

    function resetErrors() {
      setError(nameError, false);
      setError(emailError, false);
      nameInput.classList.remove('error');
      emailInput.classList.remove('error');
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      resetErrors();

      let valid = true;

      if (!nameInput.value.trim()) {
        setError(nameError, true);
        nameInput.classList.add('error');
        valid = false;
      }

      if (!emailInput.value.trim() || !validateEmail(emailInput.value.trim())) {
        setError(emailError, true);
        emailInput.classList.add('error');
        valid = false;
      }

      if (!valid) return;

      const originalText = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.textContent = I18nManager.t('contacts.submitting');

      try {
        const name = nameInput.value.trim();
        const email = emailInput.value.trim();
        const resort = document.getElementById('formResort')?.value || 'all';

        console.log('[Telegram] Starting form submission...');
        console.log('[Telegram] Token:', TELEGRAM_BOT_TOKEN ? TELEGRAM_BOT_TOKEN.substring(0, 10) + '...' : 'MISSING');
        console.log('[Telegram] Chat ID:', TELEGRAM_CHAT_ID);
        console.log('[Telegram] Name:', name);
        console.log('[Telegram] Email:', email);
        console.log('[Telegram] Resort:', resort);

        const resortNames = {
          ru: {
            all: 'Все курорты',
            'krasnaya-polyana': 'Красная Поляна',
            sheregesh: 'Шерегеш',
            elbrus: 'Эльбрус',
            dombai: 'Домбай',
            arkhyz: 'Архыз',
            alps: 'Альпы (зарубежные)'
          },
          en: {
            all: 'All Resorts',
            'krasnaya-polyana': 'Krasnaya Polyana',
            sheregesh: 'Sheregesh',
            elbrus: 'Elbrus',
            dombai: 'Dombay',
            arkhyz: 'Arkhyz',
            alps: 'Alps'
          }
        };

        const lang = I18nManager.currentLang === 'ru' ? 'ru' : 'en';
        const resortLabel = resortNames[lang][resort] || resort;

        const text = `📬 <b>Новая подписка</b>

👤 <b>Имя:</b> ${name}
📧 <b>Email:</b> ${email}
🏔 <b>Курорт:</b> ${resortLabel}
🕐 <b>Дата:</b> ${new Date().toLocaleString(lang === 'ru' ? 'ru-RU' : 'en-US')}`;

        const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
        console.log('[Telegram] URL:', url.replace(TELEGRAM_BOT_TOKEN, 'BOT_TOKEN_HIDDEN'));
        console.log('[Telegram] Request body:', JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: text.substring(0, 50) + '...',
          parse_mode: 'HTML'
        }));

        const resp = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: TELEGRAM_CHAT_ID,
            text: text,
            parse_mode: 'HTML'
          })
        });

        console.log('[Telegram] Response status:', resp.status, resp.statusText);

        if (!resp.ok) {
          const errData = await resp.json();
          console.error('[Telegram] Error response:', errData);
          throw new Error(errData.description || `HTTP ${resp.status}`);
        }

        const respData = await resp.json();
        console.log('[Telegram] Success! Response:', respData);
        console.log('[Telegram] Message sent to chat:', respData.result?.chat?.id);

        form.style.display = 'none';
        successEl.classList.add('visible');
      } catch (err) {
        console.error('[Telegram] Send failed:', err.message);
        console.error('[Telegram] Full error:', err);
        console.error('[Telegram] Error name:', err.name);
        alert(I18nManager.currentLang === 'ru'
          ? 'Ошибка отправки. Подробности в консоли (F12).'
          : 'Send failed. See console (F12) for details.');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
      }
    });

    emailInput.addEventListener('blur', () => {
      if (emailInput.value.trim() && !validateEmail(emailInput.value.trim())) {
        setError(emailError, true);
        emailInput.classList.add('error');
      } else {
        setError(emailError, false);
        emailInput.classList.remove('error');
      }
    });

    nameInput.addEventListener('input', () => {
      setError(nameError, false);
      nameInput.classList.remove('error');
    });
    emailInput.addEventListener('input', () => {
      setError(emailError, false);
      emailInput.classList.remove('error');
    });
  }

  // ============================================
  // 12. MOBILE MENU
  // ============================================
  function initMobileMenu() {
    const btn = document.getElementById('mobileMenuBtn');
    const nav = document.getElementById('mainNav');
    if (!btn || !nav) return;

    btn.addEventListener('click', () => {
      nav.classList.toggle('open');
      btn.textContent = nav.classList.contains('open') ? '✕' : '☰';
    });

    // Close on link click
    nav.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        nav.classList.remove('open');
        btn.textContent = '☰';
      });
    });

    // Close on click outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.header')) {
        nav.classList.remove('open');
        btn.textContent = '☰';
      }
    });
  }

  // ============================================
  // 13. PAGE DISPATCHER
  // ============================================
  async function init() {
    // Initialize theme
    ThemeManager.init();

    // Initialize i18n
    I18nManager.init();

    // Initialize mobile menu
    initMobileMenu();

    // Initialize scroll animations for static content
    initScrollAnimations();

    // Initialize form if on contacts page
    initForm();

    // Load data from JSON files
    const dataLoaded = await loadData();

    // Detect current page (even if data loading failed)
    const page = I18nManager.detectPage();

    // Render page-specific content
    switch (page) {
      case 'index':
        renderArticles();
        break;
      case 'resorts':
        renderResorts();
        break;
      case 'weather':
        renderWeather();
        break;
      case 'calendar':
        renderCalendar();
        break;
      case 'tips':
        renderTips();
        break;
      case 'contacts':
        // Contacts page is mostly static, just init animations
        initScrollAnimations();
        break;
      default:
        // If unknown page, try to match
        if (document.getElementById('articleGrid')) renderArticles();
        if (document.getElementById('russianResorts')) renderResorts();
        if (document.getElementById('weatherTableBody')) renderWeather();
        if (document.getElementById('eventsTableBody')) renderCalendar();
        if (document.getElementById('tipsGrid')) renderTips();
    }

    console.log(`🏔 Горный эксперт: страница "${page}" загружена, данных: ${DATA.articles.length} статей, ${DATA.resorts.russia.length + DATA.resorts.world.length} курортов`);
  }

  // ============================================
  // 14. START
  // ============================================
  // Run when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
