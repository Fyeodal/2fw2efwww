(() => {
  "use strict";

  const STORAGE_KEY = "xmobile_site_data_v1";
  const CART_KEY = "xmobile_cart_v1";
  const ADMIN_SESSION_KEY = "xmobile_admin_session_v1";

  const CONTENT_FIELDS = [
    { key: "hero_city", label: "Города (Hero)", type: "text" },
    { key: "hero_title", label: "Заголовок (Hero)", type: "textarea" },
    { key: "hero_text", label: "Подзаголовок (Hero)", type: "textarea" },
    { key: "hero_btn_services", label: "Кнопка Hero 1", type: "text" },
    { key: "hero_btn_branches", label: "Кнопка Hero 2", type: "text" },
    { key: "devices_title", label: "Заголовок блока техники", type: "text" },
    { key: "services_title", label: "Заголовок блока услуг", type: "text" },
    { key: "calculator_title", label: "Заголовок калькулятора", type: "text" },
    { key: "faq_title", label: "Заголовок FAQ", type: "text" },
    { key: "contacts_title", label: "Заголовок контактов", type: "text" },
    { key: "shop_title", label: "Заголовок магазина", type: "text" },
    { key: "shop_text", label: "Описание магазина", type: "textarea" },
    { key: "footer_brand_text", label: "Текст о компании (футер)", type: "textarea" },
    { key: "footer_meta", label: "ИНН / ОГРНИП (футер)", type: "textarea" },
    { key: "footer_address", label: "Адрес (футер)", type: "textarea" },
    { key: "footer_phone", label: "Телефон (футер)", type: "text" },
    { key: "footer_telegram", label: "Telegram (футер)", type: "text" },
    { key: "footer_email", label: "Email (футер)", type: "text" },
    { key: "footer_copyright", label: "Нижняя строка футера", type: "text" }
  ];

  const CATEGORY_OPTIONS = [
    { value: "display", label: "Дисплеи" },
    { value: "flex", label: "Шлейфы" },
    { value: "jcid", label: "JCID" },
    { value: "cable", label: "Кабели/зарядки" },
    { value: "iphone", label: "iPhone (общее)" },
    { value: "other", label: "Другое" }
  ];

  const DEFAULT_DATA = {
    content: {
      hero_city: "Саратов · Энгельс",
      hero_title: "Ремонт Apple-техники, которому доверяют каждый день.",
      hero_text: "Быстрая диагностика, честная стоимость и аккуратный ремонт iPhone, iPad, MacBook, Apple Watch и AirPods.",
      hero_btn_services: "Смотреть услуги",
      hero_btn_branches: "Все филиалы",
      devices_title: "Какие устройства ремонтируем",
      services_title: "Каталог услуг",
      calculator_title: "Примерная стоимость ремонта",
      faq_title: "FAQ",
      contacts_title: "Адреса и контакты",
      shop_title: "Магазин запчастей и аксессуаров",
      shop_text: "Отдельная вкладка магазина с удобным поиском и фильтрами. Основа структуры повторяет текущий каталог: iPhone, JCID, кабели, зарядные устройства и смежные разделы.",
      footer_brand_text: "Ремонт телефонов и продажа запчастей для Apple",
      footer_meta: "ИНН 6452912974785\nОГРНИП 32164510003354",
      footer_address: "Российская Федерация, г. Саратов, ул. Большая Казачья, 35",
      footer_phone: "+7 (927) 226-4321",
      footer_telegram: "@xm64ru",
      footer_email: "info@xm64.ru",
      footer_copyright: "© 2026 Икс Мобайл - Ремонт и Запчасти для Apple в Саратове"
    },
    faq: [
      {
        id: "faq-1",
        question: "Какие услуги доступны сейчас?",
        answer: "Разблокировка, программный ремонт, замена аккумулятора, сложный ремонт материнских плат, замена шлейфов, ремонт после попадания жидкости и замена разъёмов питания."
      },
      {
        id: "faq-2",
        question: "Какие устройства вы ремонтируете?",
        answer: "Основной фокус на технике Apple: iPhone, iPad, MacBook, Apple Watch и AirPods. По другим брендам можно уточнить по телефону."
      },
      {
        id: "faq-3",
        question: "Как понять точную стоимость ремонта?",
        answer: "На сайте можно получить примерную цену через калькулятор. Точная стоимость называется после диагностики устройства."
      },
      {
        id: "faq-4",
        question: "Есть ли у вас магазин запчастей?",
        answer: "Да, есть отдельный каталог с фильтрами, корзиной и оформлением заказа."
      },
      {
        id: "faq-5",
        question: "Где находятся филиалы и какой график?",
        answer: "Саратов: Б. Казачья, 35 и Московская, 100 (ежедневно 10:00-19:00). Энгельс: Тельмана, 6 (пн-пт 11:00-18:30)."
      },
      {
        id: "faq-6",
        question: "Как быстрее всего связаться?",
        answer: "Общий номер: +7 (927) 226-4321, Telegram: @xm64ru, email: info@xm64.ru."
      }
    ],
    products: [
      {
        id: "product-1",
        name: "Дисплей iPhone X копия HARD OLED GX",
        catLabel: "Дисплеи iPhone",
        category: "display",
        price: 2050,
        stockQty: 8
      },
      {
        id: "product-2",
        name: "Дисплей iPhone XS копия HARD OLED GX",
        catLabel: "Дисплеи iPhone",
        category: "display",
        price: 2050,
        stockQty: 7
      },
      {
        id: "product-3",
        name: "Дисплей iPhone 15 Pro Max копия INCELL RJ",
        catLabel: "Дисплеи iPhone 15 Pro Max",
        category: "display",
        price: 2950,
        stockQty: 0
      },
      {
        id: "product-4",
        name: "Дисплей iPhone 14 Pro Max копия SOFT OLED DD",
        catLabel: "Дисплеи iPhone 14 Pro Max",
        category: "display",
        price: 11000,
        stockQty: 0
      },
      {
        id: "product-5",
        name: "Дисплей iPhone 13 mini копия HARD OLED DD",
        catLabel: "Дисплеи iPhone 13 mini",
        category: "display",
        price: 5150,
        stockQty: 0
      },
      {
        id: "product-6",
        name: "Дисплей iPhone 12 / 12 Pro копия HARD OLED GX",
        catLabel: "Дисплеи iPhone 12 / 12 Pro",
        category: "display",
        price: 3100,
        stockQty: 0
      },
      {
        id: "product-7",
        name: "Дисплей iPhone 15 копия INCELL RJ",
        catLabel: "Дисплеи iPhone 15",
        category: "display",
        price: 2650,
        stockQty: 1
      },
      {
        id: "product-8",
        name: "Дисплей iPhone 14 оригинал снятый с разбора (царапины)",
        catLabel: "Дисплеи iPhone 14",
        category: "display",
        price: 6250,
        stockQty: 2
      },
      {
        id: "product-9",
        name: "Шлейф JCID iPhone 16 Pro Max для восстановления Face ID",
        catLabel: "JCID / Face ID",
        category: "jcid",
        price: 2800,
        stockQty: 1
      },
      {
        id: "product-10",
        name: "Шлейф JCID iPhone 16 Pro для восстановления Face ID",
        catLabel: "JCID / Face ID",
        category: "jcid",
        price: 2800,
        stockQty: 1
      },
      {
        id: "product-11",
        name: "Шлейф iPhone 15 с разъемом зарядки оригинал с разбора",
        catLabel: "Нижний шлейф",
        category: "flex",
        price: 2000,
        stockQty: 9
      },
      {
        id: "product-12",
        name: "Шлейф iPhone 15 Pro с разъемом зарядки с разбора",
        catLabel: "Нижний шлейф",
        category: "flex",
        price: 2200,
        stockQty: 8
      },
      {
        id: "product-13",
        name: "Шлейф iPhone 16 Pro Max с разъемом зарядки с разбора",
        catLabel: "Нижний шлейф",
        category: "flex",
        price: 3500,
        stockQty: 5
      },
      {
        id: "product-14",
        name: "Шлейф iPhone 16 с разъемом зарядки с разбора",
        catLabel: "Нижний шлейф",
        category: "flex",
        price: 2400,
        stockQty: 5
      },
      {
        id: "product-15",
        name: "Шлейф iPhone 16 Pro с разъемом зарядки с разбора",
        catLabel: "Нижний шлейф",
        category: "flex",
        price: 3100,
        stockQty: 5
      },
      {
        id: "product-16",
        name: "Шлейф iPhone 7 Plus с разъемом зарядки оригинал",
        catLabel: "Нижний шлейф",
        category: "flex",
        price: 364,
        stockQty: 6
      },
      {
        id: "product-17",
        name: "Шлейф iPhone SE 2020 с разъемом зарядки оригинал",
        catLabel: "Нижний шлейф",
        category: "flex",
        price: 550,
        stockQty: 6
      },
      {
        id: "product-18",
        name: "Шлейф iPhone 13 Pro/13 Pro Max антенна NFC + Bluetooth + микрофон",
        catLabel: "Шлейфы iPhone",
        category: "flex",
        price: 650,
        stockQty: 7
      },
      {
        id: "product-19",
        name: "Кабель Apple USB-C (60W / 1м), оригинал в упаковке (A2795)",
        catLabel: "Кабели / Apple",
        category: "cable",
        price: 1000,
        stockQty: 10
      },
      {
        id: "product-20",
        name: "Кабель USB Type-C 6.5A Realme (SuperDart Charge), оригинал",
        catLabel: "Кабели / Type-C",
        category: "cable",
        price: 400,
        stockQty: 6
      }
    ],
    updatedAt: ""
  };

  const clone = (value) => JSON.parse(JSON.stringify(value));

  function normalizeText(value, fallback = "") {
    if (typeof value !== "string") {
      return fallback;
    }
    return value.trim();
  }

  function makeId(prefix) {
    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function formatPrice(value) {
    const number = Number(value) || 0;
    return number.toLocaleString("ru-RU");
  }

  function stockState(qty) {
    const safeQty = Math.max(0, Number(qty) || 0);
    if (safeQty <= 0) {
      return "out";
    }
    if (safeQty <= 2) {
      return "low";
    }
    return "in";
  }

  function stockLabel(qty) {
    const safeQty = Math.max(0, Number(qty) || 0);
    if (safeQty <= 0) {
      return "Нет в наличии";
    }
    return `${safeQty} в наличии`;
  }

  function contentDefaults() {
    return clone(DEFAULT_DATA.content);
  }

  function faqDefaults() {
    return clone(DEFAULT_DATA.faq);
  }

  function productDefaults() {
    return clone(DEFAULT_DATA.products);
  }

  function normalizeFaqItem(item, index) {
    const question = normalizeText(item?.question);
    const answer = normalizeText(item?.answer);
    if (!question || !answer) {
      return null;
    }
    return {
      id: normalizeText(item?.id, `faq-${index + 1}`),
      question,
      answer
    };
  }

  function normalizeProductItem(item, index) {
    const name = normalizeText(item?.name);
    const category = normalizeText(item?.category, "other").toLowerCase();
    const catLabel = normalizeText(item?.catLabel, "Категория");
    const price = Math.max(0, Number(item?.price) || 0);
    const stockQty = Math.max(0, Math.floor(Number(item?.stockQty) || 0));

    if (!name) {
      return null;
    }

    return {
      id: normalizeText(item?.id, `product-${index + 1}`),
      name,
      catLabel,
      category,
      price,
      stockQty
    };
  }

  function normalizeContentMap(content) {
    const normalized = contentDefaults();
    if (!content || typeof content !== "object") {
      return normalized;
    }
    for (const key of Object.keys(normalized)) {
      const value = normalizeText(content[key], normalized[key]);
      if (value) {
        normalized[key] = value;
      }
    }
    return normalized;
  }

  function normalizeData(rawData) {
    const fallback = clone(DEFAULT_DATA);
    if (!rawData || typeof rawData !== "object") {
      fallback.updatedAt = new Date().toISOString();
      return fallback;
    }

    const content = normalizeContentMap(rawData.content);
    const faq = Array.isArray(rawData.faq)
      ? rawData.faq.map(normalizeFaqItem).filter(Boolean)
      : [];
    const products = Array.isArray(rawData.products)
      ? rawData.products.map(normalizeProductItem).filter(Boolean)
      : [];

    return {
      content,
      faq: faq.length ? faq : faqDefaults(),
      products: products.length ? products : productDefaults(),
      updatedAt: normalizeText(rawData.updatedAt, new Date().toISOString())
    };
  }

  function readStorage(key) {
    try {
      const value = localStorage.getItem(key);
      if (!value) {
        return null;
      }
      return JSON.parse(value);
    } catch (error) {
      return null;
    }
  }

  function writeStorage(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      return false;
    }
  }

  function getData() {
    const parsed = readStorage(STORAGE_KEY);
    const normalized = normalizeData(parsed);
    if (!parsed) {
      writeStorage(STORAGE_KEY, normalized);
    }
    return normalized;
  }

  function saveData(nextData) {
    const normalized = normalizeData(nextData);
    normalized.updatedAt = new Date().toISOString();
    writeStorage(STORAGE_KEY, normalized);
    return normalized;
  }

  function resetData() {
    const fresh = clone(DEFAULT_DATA);
    fresh.updatedAt = new Date().toISOString();
    writeStorage(STORAGE_KEY, fresh);
    return fresh;
  }

  function getContentBindingMap() {
    return {
      hero_city: [".hero__city"],
      hero_title: [".hero__left h1"],
      hero_text: [".hero__text"],
      hero_btn_services: [".hero__actions .btn--orange"],
      hero_btn_branches: [".hero__actions .btn--light"],
      devices_title: ["#devices .section-head h2"],
      services_title: ["#services .section-head h2"],
      calculator_title: ["#calculator .section-head h2"],
      faq_title: ["#faq .section-head h2"],
      contacts_title: ["#contacts .section-head h2"],
      shop_title: [".shop-hero__title"],
      shop_text: [".shop-hero__text"],
      footer_copyright: [".footer-site__bottom > p"]
    };
  }

  function toHtmlWithBreaks(text) {
    return escapeHtml(text).replaceAll("\n", "<br>");
  }

  function applyFooterData(content) {
    const brandParagraphs = document.querySelectorAll(".footer-col--brand p");
    if (brandParagraphs.length >= 3) {
      brandParagraphs[0].textContent = content.footer_brand_text;
      brandParagraphs[1].innerHTML = toHtmlWithBreaks(content.footer_meta);
      brandParagraphs[2].textContent = content.footer_address;
    }

    const footerColumns = document.querySelectorAll(".footer-col");
    const contactsColumn = footerColumns[1];
    if (contactsColumn) {
      const phoneLink = contactsColumn.querySelector('a[href^="tel:"]');
      const telegramLink = contactsColumn.querySelector('a[href*="t.me"]');
      const emailLink = contactsColumn.querySelector('a[href^="mailto:"]');

      if (phoneLink) {
        phoneLink.textContent = content.footer_phone;
        phoneLink.setAttribute("href", `tel:${content.footer_phone.replace(/[^\d+]/g, "")}`);
      }
      if (telegramLink) {
        telegramLink.textContent = `Telegram: ${content.footer_telegram}`;
        const handle = content.footer_telegram.replace(/^@/, "");
        telegramLink.setAttribute("href", `https://t.me/${handle}`);
      }
      if (emailLink) {
        emailLink.textContent = `Email: ${content.footer_email}`;
        emailLink.setAttribute("href", `mailto:${content.footer_email}`);
      }
    }
  }

  function applyContent(content) {
    const bindings = getContentBindingMap();
    for (const [key, selectors] of Object.entries(bindings)) {
      const value = content[key];
      if (typeof value !== "string") {
        continue;
      }
      selectors.forEach((selector) => {
        document.querySelectorAll(selector).forEach((node) => {
          node.textContent = value;
        });
      });
    }
    applyFooterData(content);
  }

  function applyFaq(faq) {
    const list = document.querySelector(".faq-list");
    if (!list) {
      return;
    }
    if (!faq.length) {
      list.innerHTML = "";
      return;
    }
    list.innerHTML = faq
      .map((item, index) => {
        const openAttr = index === 0 ? " open" : "";
        return `<details class="faq-item card"${openAttr}>
  <summary>${escapeHtml(item.question)}</summary>
  <p>${escapeHtml(item.answer)}</p>
</details>`;
      })
      .join("");
  }

  function initReveal() {
    const revealItems = document.querySelectorAll(".reveal");
    if (!revealItems.length) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.16 }
    );

    revealItems.forEach((item) => observer.observe(item));
  }

  function initHeroMotion() {
    const hero = document.querySelector(".hero");
    const wrap = document.querySelector(".iphone-wrap");
    if (!hero || !wrap) {
      return;
    }

    hero.addEventListener("pointermove", (event) => {
      const rect = hero.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      const tx = Math.max(-16, Math.min(16, x * 24));
      const ty = Math.max(-16, Math.min(16, y * 20));
      wrap.style.transform = `translate(${tx}px, ${ty}px)`;
    });

    hero.addEventListener("pointerleave", () => {
      wrap.style.transform = "translate(0, 0)";
    });
  }

  function initCalculator() {
    const deviceSelect = document.getElementById("deviceSelect");
    const serviceSelect = document.getElementById("serviceSelect");
    const urgencySelect = document.getElementById("urgencySelect");
    const calcButton = document.getElementById("calcButton");
    const calcResult = document.getElementById("calcResult");
    const priceRangeInput = document.getElementById("priceRangeInput");

    if (!deviceSelect || !serviceSelect || !urgencySelect || !calcButton || !calcResult) {
      return;
    }

    const deviceBase = {
      iphone: 2500,
      ipad: 3200,
      macbook: 5000,
      watch: 2800,
      airpods: 2200
    };

    const serviceBase = {
      battery: 2200,
      display: 4500,
      charging: 2600,
      water: 4000,
      board: 7800,
      software: 1900,
      unlock: 2300
    };

    calcButton.addEventListener("click", () => {
      const device = deviceSelect.value;
      const service = serviceSelect.value;
      const urgency = urgencySelect.value;

      const base = (deviceBase[device] || 2400) + (serviceBase[service] || 2200);
      const urgencyFactor = urgency === "fast" ? 1.25 : 1;
      const final = Math.round(base * urgencyFactor);

      const min = Math.round(final * 0.9);
      const max = Math.round(final * 1.15);

      const label = `Примерная стоимость: ${formatPrice(min)} - ${formatPrice(max)} ₽`;
      calcResult.textContent = label;
      if (priceRangeInput) {
        priceRangeInput.value = label;
      }
    });
  }

  function initRequestForm() {
    const form = document.getElementById("requestForm");
    const note = document.getElementById("formNote");
    if (!form || !note) {
      return;
    }

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      note.textContent = "Заявка отправлена. Менеджер свяжется с вами в ближайшее время.";
      form.reset();
    });
  }

  function parseCart() {
    const parsed = readStorage(CART_KEY);
    if (!parsed || typeof parsed !== "object") {
      return {};
    }
    const result = {};
    for (const [id, qty] of Object.entries(parsed)) {
      const safeQty = Math.max(0, Math.floor(Number(qty) || 0));
      if (safeQty > 0) {
        result[id] = safeQty;
      }
    }
    return result;
  }

  function saveCart(cart) {
    writeStorage(CART_KEY, cart);
  }

  function categoryMatches(product, filter) {
    if (!filter || filter === "all") {
      return true;
    }
    if (product.category === filter) {
      return true;
    }
    if (filter === "iphone") {
      return ["iphone", "display", "flex"].includes(product.category);
    }
    return false;
  }

  function stockMatches(product, filter) {
    if (filter === "all") {
      return true;
    }
    const state = stockState(product.stockQty);
    if (filter === "in") {
      return product.stockQty > 0;
    }
    if (filter === "low") {
      return state === "low";
    }
    if (filter === "out") {
      return state === "out";
    }
    return true;
  }

  function renderProductsCard(product) {
    const stock = stockState(product.stockQty);
    const outOfStock = stock === "out";
    const stockClass = stock === "low" ? "stock stock--low" : stock === "out" ? "stock stock--out" : "stock";
    const buttonClass = outOfStock ? "mini-btn mini-btn--request add-cart-btn" : "mini-btn mini-btn--dark add-cart-btn";
    const buttonLabel = outOfStock ? "Запросить" : "В корзину";

    return `<article class="product-card" data-product data-id="${escapeHtml(product.id)}" data-category="${escapeHtml(product.category)}" data-stock="${stock}" data-price="${product.price}" data-name="${escapeHtml(product.name)}">
  <p class="product-cat">${escapeHtml(product.catLabel)}</p>
  <div class="product-top">
    <h3 class="product-name">${escapeHtml(product.name)}</h3>
  </div>
  <p class="product-price">${formatPrice(product.price)} ₽</p>
  <p class="${stockClass}">${escapeHtml(stockLabel(product.stockQty))}</p>
  <div class="product-actions">
    <button class="${buttonClass}" type="button">${buttonLabel}</button>
  </div>
</article>`;
  }

  function initShop(allData) {
    const grid = document.getElementById("productsGrid");
    if (!grid) {
      return;
    }

    const count = document.getElementById("productsCount");
    const searchInput = document.getElementById("shopSearch");
    const stockFilter = document.getElementById("stockFilter");
    const sortSelect = document.getElementById("sortSelect");
    const categoryButtons = [
      ...document.querySelectorAll(".category-filter[data-filter]"),
      ...document.querySelectorAll(".chip[data-filter]")
    ];

    const cartItems = document.getElementById("cartItems");
    const cartEmpty = document.getElementById("cartEmpty");
    const cartBadge = document.getElementById("cartBadge");
    const cartTotal = document.getElementById("cartTotal");
    const buyButton = document.getElementById("buyButton");
    const checkoutForm = document.getElementById("checkoutForm");
    const checkoutNote = document.getElementById("checkoutNote");
    const checkoutName = document.getElementById("checkoutName");
    const checkoutPhone = document.getElementById("checkoutPhone");

    let products = allData.products.map((item, index) => normalizeProductItem(item, index)).filter(Boolean);
    const cart = parseCart();

    const state = {
      category: "all",
      search: "",
      stock: "all",
      sort: "default"
    };

    function getById(id) {
      return products.find((item) => item.id === id) || null;
    }

    function sanitizeCartWithStock() {
      Object.keys(cart).forEach((id) => {
        const product = getById(id);
        if (!product || product.stockQty <= 0) {
          delete cart[id];
          return;
        }
        cart[id] = Math.max(1, Math.min(cart[id], product.stockQty));
      });
      saveCart(cart);
    }

    function filteredProducts() {
      const query = state.search.trim().toLowerCase();
      const list = products.filter((product) => {
        if (!categoryMatches(product, state.category)) {
          return false;
        }
        if (!stockMatches(product, state.stock)) {
          return false;
        }
        if (query) {
          const haystack = `${product.name} ${product.catLabel}`.toLowerCase();
          return haystack.includes(query);
        }
        return true;
      });

      if (state.sort === "price-asc") {
        list.sort((a, b) => a.price - b.price);
      } else if (state.sort === "price-desc") {
        list.sort((a, b) => b.price - a.price);
      } else if (state.sort === "name") {
        list.sort((a, b) => a.name.localeCompare(b.name, "ru"));
      }
      return list;
    }

    function updateCategoryButtons() {
      categoryButtons.forEach((button) => {
        const selected = button.dataset.filter === state.category;
        button.classList.toggle("is-active", selected);
      });
    }

    function renderGrid() {
      const list = filteredProducts();
      if (!list.length) {
        grid.innerHTML = `<article class="product-card">
  <h3 class="product-name">Ничего не найдено</h3>
  <p class="product-cat">Измените фильтры или поисковый запрос.</p>
</article>`;
      } else {
        grid.innerHTML = list.map(renderProductsCard).join("");
      }
      if (count) {
        count.textContent = `Найдено: ${list.length}`;
      }
      updateCategoryButtons();
    }

    function getCartEntries() {
      return Object.entries(cart)
        .map(([id, qty]) => {
          const product = getById(id);
          if (!product) {
            return null;
          }
          return { product, qty };
        })
        .filter(Boolean);
    }

    function renderCart() {
      if (!cartItems || !cartEmpty || !cartBadge || !cartTotal || !buyButton) {
        return;
      }

      sanitizeCartWithStock();
      const entries = getCartEntries();
      const totalQty = entries.reduce((acc, item) => acc + item.qty, 0);
      const totalPrice = entries.reduce((acc, item) => acc + item.qty * item.product.price, 0);

      cartBadge.textContent = `${totalQty} шт`;
      cartTotal.textContent = `${formatPrice(totalPrice)} ₽`;
      cartEmpty.style.display = entries.length ? "none" : "block";
      buyButton.disabled = entries.length === 0;

      if (!entries.length) {
        cartItems.innerHTML = "";
        return;
      }

      cartItems.innerHTML = entries
        .map(
          (entry) => `<div class="cart-item" data-id="${escapeHtml(entry.product.id)}">
  <div>
    <p class="cart-item__name">${escapeHtml(entry.product.name)}</p>
    <p class="cart-item__meta">${formatPrice(entry.product.price)} ₽ за шт.</p>
  </div>
  <div class="qty-control">
    <button class="qty-btn" type="button" data-action="minus">-</button>
    <input class="qty-input" type="number" min="1" value="${entry.qty}">
    <button class="qty-btn" type="button" data-action="plus">+</button>
  </div>
  <button class="cart-remove" type="button">Удалить</button>
</div>`
        )
        .join("");
    }

    function setCheckoutMessage(message) {
      if (!checkoutNote) {
        return;
      }
      checkoutNote.textContent = message;
    }

    function openCheckout() {
      if (!checkoutForm) {
        return;
      }
      checkoutForm.classList.remove("is-hidden");
    }

    function addToCart(productId) {
      const product = getById(productId);
      if (!product) {
        return;
      }
      if (product.stockQty <= 0) {
        openCheckout();
        setCheckoutMessage("Товар отсутствует на складе. Оставьте контакты, и мы оформим запрос.");
        return;
      }

      const currentQty = cart[product.id] || 0;
      if (currentQty >= product.stockQty) {
        setCheckoutMessage("Нельзя добавить больше: достигнут остаток на складе.");
        return;
      }
      cart[product.id] = currentQty + 1;
      saveCart(cart);
      renderCart();
      setCheckoutMessage("Товар добавлен в корзину.");
    }

    function updateCartQty(productId, nextQty) {
      const product = getById(productId);
      if (!product) {
        delete cart[productId];
        return;
      }
      const safeQty = Math.floor(Number(nextQty) || 0);
      if (safeQty <= 0) {
        delete cart[productId];
      } else {
        cart[productId] = Math.max(1, Math.min(safeQty, product.stockQty));
      }
      saveCart(cart);
      renderCart();
    }

    renderGrid();
    renderCart();

    if (searchInput) {
      searchInput.addEventListener("input", () => {
        state.search = searchInput.value;
        renderGrid();
      });
    }

    if (stockFilter) {
      stockFilter.addEventListener("change", () => {
        state.stock = stockFilter.value;
        renderGrid();
      });
    }

    if (sortSelect) {
      sortSelect.addEventListener("change", () => {
        state.sort = sortSelect.value;
        renderGrid();
      });
    }

    categoryButtons.forEach((button) => {
      button.addEventListener("click", () => {
        state.category = button.dataset.filter || "all";
        renderGrid();
      });
    });

    grid.addEventListener("click", (event) => {
      const button = event.target.closest(".add-cart-btn");
      if (!button) {
        return;
      }
      const card = button.closest("[data-id]");
      if (!card) {
        return;
      }
      const id = card.dataset.id;
      if (!id) {
        return;
      }
      addToCart(id);
      renderGrid();
    });

    if (cartItems) {
      cartItems.addEventListener("click", (event) => {
        const target = event.target;
        const row = target.closest(".cart-item");
        if (!row) {
          return;
        }
        const id = row.dataset.id;
        if (!id) {
          return;
        }

        if (target.classList.contains("cart-remove")) {
          delete cart[id];
          saveCart(cart);
          renderCart();
          return;
        }

        if (target.classList.contains("qty-btn")) {
          const action = target.dataset.action;
          const currentQty = cart[id] || 1;
          const nextQty = action === "minus" ? currentQty - 1 : currentQty + 1;
          updateCartQty(id, nextQty);
        }
      });

      cartItems.addEventListener("change", (event) => {
        const input = event.target.closest(".qty-input");
        if (!input) {
          return;
        }
        const row = input.closest(".cart-item");
        if (!row) {
          return;
        }
        const id = row.dataset.id;
        if (!id) {
          return;
        }
        updateCartQty(id, input.value);
      });
    }

    if (buyButton) {
      buyButton.addEventListener("click", () => {
        openCheckout();
        setCheckoutMessage("Заполните форму, и мы свяжемся для подтверждения заказа.");
      });
    }

    if (checkoutForm) {
      checkoutForm.addEventListener("submit", (event) => {
        event.preventDefault();

        if (checkoutName && !checkoutName.value.trim()) {
          setCheckoutMessage("Укажите имя.");
          return;
        }
        if (checkoutPhone && !checkoutPhone.value.trim()) {
          setCheckoutMessage("Укажите телефон.");
          return;
        }

        const entries = getCartEntries();
        if (entries.length) {
          Object.keys(cart).forEach((key) => {
            delete cart[key];
          });
          saveCart(cart);
          renderCart();
          checkoutForm.reset();
          setCheckoutMessage("Заказ отправлен. Мы свяжемся с вами для подтверждения.");
          return;
        }

        checkoutForm.reset();
        setCheckoutMessage("Заявка отправлена. Мы уточним сроки поставки и свяжемся с вами.");
      });
    }
  }

  window.XMobileStore = {
    STORAGE_KEY,
    CART_KEY,
    ADMIN_SESSION_KEY,
    CONTENT_FIELDS: clone(CONTENT_FIELDS),
    CATEGORY_OPTIONS: clone(CATEGORY_OPTIONS),
    DEFAULT_DATA: clone(DEFAULT_DATA),
    getData,
    saveData,
    resetData,
    normalizeProductItem,
    normalizeFaqItem,
    stockState,
    stockLabel,
    formatPrice,
    makeId
  };

  const initialData = getData();
  applyContent(initialData.content);
  applyFaq(initialData.faq);
  initReveal();
  initHeroMotion();
  initCalculator();
  initRequestForm();
  initShop(initialData);

  window.addEventListener("storage", (event) => {
    if (event.key !== STORAGE_KEY) {
      return;
    }
    const fresh = getData();
    applyContent(fresh.content);
    applyFaq(fresh.faq);
    if (document.getElementById("productsGrid")) {
      window.location.reload();
    }
  });
})();
