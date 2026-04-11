(() => {
  "use strict";

  const STORAGE_KEY = "xmobile_site_data_v1";
  const CART_KEY = "xmobile_cart_v1";
  const ADMIN_SESSION_KEY = "xmobile_admin_session_v1";
  const USER_SESSION_KEY = "xmobile_user_session_v1";

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

  const SHOP_CATEGORY_DEFAULTS = [
    { value: "display", label: "Дисплеи" },
    { value: "flex", label: "Шлейфы" },
    { value: "jcid", label: "JCID" },
    { value: "cable", label: "Кабели/зарядки" },
    { value: "iphone", label: "iPhone (общее)" },
    { value: "other", label: "Другое" }
  ];

  const IPHONE_MODEL_DEFAULTS = [
    { id: "iphone-8", label: "iPhone 8", priceDelta: 0 },
    { id: "iphone-8-plus", label: "iPhone 8 Plus", priceDelta: 100 },
    { id: "iphone-x", label: "iPhone X", priceDelta: 220 },
    { id: "iphone-xr", label: "iPhone XR", priceDelta: 260 },
    { id: "iphone-xs", label: "iPhone XS", priceDelta: 320 },
    { id: "iphone-xs-max", label: "iPhone XS Max", priceDelta: 420 },
    { id: "iphone-11", label: "iPhone 11", priceDelta: 500 },
    { id: "iphone-11-pro", label: "iPhone 11 Pro", priceDelta: 600 },
    { id: "iphone-11-pro-max", label: "iPhone 11 Pro Max", priceDelta: 720 },
    { id: "iphone-se-2020", label: "iPhone SE (2020)", priceDelta: 180 },
    { id: "iphone-12-mini", label: "iPhone 12 mini", priceDelta: 760 },
    { id: "iphone-12", label: "iPhone 12", priceDelta: 860 },
    { id: "iphone-12-pro", label: "iPhone 12 Pro", priceDelta: 980 },
    { id: "iphone-12-pro-max", label: "iPhone 12 Pro Max", priceDelta: 1120 },
    { id: "iphone-13-mini", label: "iPhone 13 mini", priceDelta: 980 },
    { id: "iphone-13", label: "iPhone 13", priceDelta: 1080 },
    { id: "iphone-13-pro", label: "iPhone 13 Pro", priceDelta: 1260 },
    { id: "iphone-13-pro-max", label: "iPhone 13 Pro Max", priceDelta: 1420 },
    { id: "iphone-se-2022", label: "iPhone SE (2022)", priceDelta: 280 },
    { id: "iphone-14", label: "iPhone 14", priceDelta: 1260 },
    { id: "iphone-14-plus", label: "iPhone 14 Plus", priceDelta: 1400 },
    { id: "iphone-14-pro", label: "iPhone 14 Pro", priceDelta: 1580 },
    { id: "iphone-14-pro-max", label: "iPhone 14 Pro Max", priceDelta: 1720 },
    { id: "iphone-15", label: "iPhone 15", priceDelta: 1540 },
    { id: "iphone-15-plus", label: "iPhone 15 Plus", priceDelta: 1700 },
    { id: "iphone-15-pro", label: "iPhone 15 Pro", priceDelta: 1920 },
    { id: "iphone-15-pro-max", label: "iPhone 15 Pro Max", priceDelta: 2160 },
    { id: "iphone-16", label: "iPhone 16", priceDelta: 1860 },
    { id: "iphone-16-plus", label: "iPhone 16 Plus", priceDelta: 2020 },
    { id: "iphone-16-pro", label: "iPhone 16 Pro", priceDelta: 2320 },
    { id: "iphone-16-pro-max", label: "iPhone 16 Pro Max", priceDelta: 2560 }
  ];

  const CALCULATOR_DEFAULT = {
    devices: [
      { id: "iphone", label: "iPhone", basePrice: 2500 },
      { id: "ipad", label: "iPad", basePrice: 3200 },
      { id: "macbook", label: "MacBook", basePrice: 5000 },
      { id: "watch", label: "Apple Watch", basePrice: 2800 },
      { id: "airpods", label: "AirPods", basePrice: 2200 }
    ],
    models: [
      ...IPHONE_MODEL_DEFAULTS.map((item) => ({ ...item, deviceId: "iphone" })),
      { id: "ipad-9", deviceId: "ipad", label: "iPad 9", priceDelta: 0 },
      { id: "ipad-pro-11", deviceId: "ipad", label: "iPad Pro 11", priceDelta: 1100 },
      { id: "macbook-air-m1", deviceId: "macbook", label: "MacBook Air M1", priceDelta: 0 },
      { id: "macbook-pro-14", deviceId: "macbook", label: "MacBook Pro 14", priceDelta: 1900 },
      { id: "watch-se", deviceId: "watch", label: "Apple Watch SE", priceDelta: 0 },
      { id: "watch-ultra", deviceId: "watch", label: "Apple Watch Ultra", priceDelta: 800 },
      { id: "airpods-2", deviceId: "airpods", label: "AirPods 2", priceDelta: 0 },
      { id: "airpods-pro-2", deviceId: "airpods", label: "AirPods Pro 2", priceDelta: 600 }
    ],
    services: [
      { id: "battery", label: "Замена аккумулятора", basePrice: 2200 },
      { id: "display", label: "Замена дисплея", basePrice: 4500 },
      { id: "charging", label: "Замена разъёма питания", basePrice: 2600 },
      { id: "water", label: "После попадания жидкости", basePrice: 4000 },
      { id: "board", label: "Сложный ремонт платы", basePrice: 7800 },
      { id: "software", label: "Программный ремонт", basePrice: 1900 },
      { id: "unlock", label: "Разблокировка", basePrice: 2300 }
    ],
    urgencies: [
      { id: "normal", label: "Стандарт", multiplier: 1 },
      { id: "fast", label: "Срочно", multiplier: 1.25 }
    ]
  };

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
    categories: SHOP_CATEGORY_DEFAULTS.map((item) => ({ ...item })),
    calculator: {
      devices: CALCULATOR_DEFAULT.devices.map((item) => ({ ...item })),
      models: CALCULATOR_DEFAULT.models.map((item) => ({ ...item })),
      services: CALCULATOR_DEFAULT.services.map((item) => ({ ...item })),
      urgencies: CALCULATOR_DEFAULT.urgencies.map((item) => ({ ...item }))
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
    seo: {
      title: "",
      description: "",
      titleRepair: "",
      descriptionRepair: "",
      titleShop: "",
      descriptionShop: "",
      indexShop: true,
      favicon: "",
      yandexVerification: "",
      yandexMetrika: "",
      googleVerification: "",
      googleAnalytics: ""
    },
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

  function slugifyId(value, fallback = "item") {
    const ascii = String(value || "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9а-яё]+/gi, "-")
      .replace(/^-+|-+$/g, "");
    return ascii || fallback;
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

  function categoryDefaults() {
    return clone(SHOP_CATEGORY_DEFAULTS);
  }

  function calculatorDefaults() {
    return clone(CALCULATOR_DEFAULT);
  }

  function normalizeSeo(raw) {
    const d = clone(DEFAULT_DATA.seo);
    if (!raw || typeof raw !== "object") {
      return d;
    }
    return {
      title: typeof raw.title === "string" ? raw.title : d.title,
      description: typeof raw.description === "string" ? raw.description : d.description,
      titleRepair: typeof raw.titleRepair === "string" ? raw.titleRepair : d.titleRepair,
      descriptionRepair: typeof raw.descriptionRepair === "string" ? raw.descriptionRepair : d.descriptionRepair,
      titleShop: typeof raw.titleShop === "string" ? raw.titleShop : d.titleShop,
      descriptionShop: typeof raw.descriptionShop === "string" ? raw.descriptionShop : d.descriptionShop,
      indexShop: typeof raw.indexShop === "boolean" ? raw.indexShop : d.indexShop,
      favicon: typeof raw.favicon === "string" ? raw.favicon : d.favicon,
      yandexVerification: typeof raw.yandexVerification === "string" ? raw.yandexVerification : d.yandexVerification,
      yandexMetrika: typeof raw.yandexMetrika === "string" ? raw.yandexMetrika : d.yandexMetrika,
      googleVerification: typeof raw.googleVerification === "string" ? raw.googleVerification : d.googleVerification,
      googleAnalytics: typeof raw.googleAnalytics === "string" ? raw.googleAnalytics : d.googleAnalytics
    };
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

  function normalizeCategoryItem(item, index) {
    const label = normalizeText(item?.label);
    if (!label) {
      return null;
    }
    return {
      value: slugifyId(normalizeText(item?.value, label), `category-${index + 1}`),
      label
    };
  }

  function normalizeCalculatorEntity(item, index, type) {
    if (!item || typeof item !== "object") {
      return null;
    }

    if (type === "device") {
      const label = normalizeText(item.label);
      if (!label) {
        return null;
      }
      return {
        id: slugifyId(normalizeText(item.id, label), `device-${index + 1}`),
        label,
        basePrice: Math.max(0, Number(item.basePrice) || 0)
      };
    }

    if (type === "model") {
      const label = normalizeText(item.label);
      const deviceId = slugifyId(normalizeText(item.deviceId), "");
      if (!label || !deviceId) {
        return null;
      }
      return {
        id: slugifyId(normalizeText(item.id, `${deviceId}-${label}`), `model-${index + 1}`),
        deviceId,
        label,
        priceDelta: Math.max(0, Number(item.priceDelta) || 0)
      };
    }

    if (type === "service") {
      const label = normalizeText(item.label);
      if (!label) {
        return null;
      }
      return {
        id: slugifyId(normalizeText(item.id, label), `service-${index + 1}`),
        label,
        basePrice: Math.max(0, Number(item.basePrice) || 0)
      };
    }

    if (type === "urgency") {
      const label = normalizeText(item.label);
      if (!label) {
        return null;
      }
      const rawMultiplier = Number(item.multiplier);
      const multiplier = Number.isFinite(rawMultiplier) && rawMultiplier > 0 ? rawMultiplier : 1;
      return {
        id: slugifyId(normalizeText(item.id, label), `urgency-${index + 1}`),
        label,
        multiplier
      };
    }

    return null;
  }

  function ensureIphoneModelCatalog(models) {
    const list = Array.isArray(models) ? models : [];
    const iphoneMap = new Map();
    const requiredLabelSet = new Set(IPHONE_MODEL_DEFAULTS.map((item) => item.label.toLowerCase()));
    const others = [];
    const extraIphone = [];

    list.forEach((item) => {
      if (item?.deviceId === "iphone") {
        const key = normalizeText(item.label).toLowerCase();
        if (key) {
          iphoneMap.set(key, item);
          if (!requiredLabelSet.has(key)) {
            extraIphone.push({
              ...item,
              deviceId: "iphone",
              label: normalizeText(item.label, item.id || "iPhone"),
              priceDelta: Math.max(0, Number(item.priceDelta) || 0)
            });
          }
        }
        return;
      }
      others.push(item);
    });

    const iphoneCatalog = IPHONE_MODEL_DEFAULTS.map((model) => {
      const existing = iphoneMap.get(model.label.toLowerCase());
      if (!existing) {
        return { ...model, deviceId: "iphone" };
      }
      return {
        ...existing,
        id: existing.id || model.id,
        deviceId: "iphone",
        label: model.label,
        priceDelta: Math.max(0, Number(existing.priceDelta) || 0)
      };
    });

    return [...iphoneCatalog, ...extraIphone, ...others];
  }

  function normalizeCalculatorConfig(calculator) {
    const defaults = calculatorDefaults();
    if (!calculator || typeof calculator !== "object") {
      return defaults;
    }

    const devices = Array.isArray(calculator.devices)
      ? calculator.devices.map((item, index) => normalizeCalculatorEntity(item, index, "device")).filter(Boolean)
      : [];
    const services = Array.isArray(calculator.services)
      ? calculator.services.map((item, index) => normalizeCalculatorEntity(item, index, "service")).filter(Boolean)
      : [];
    const urgencies = Array.isArray(calculator.urgencies)
      ? calculator.urgencies.map((item, index) => normalizeCalculatorEntity(item, index, "urgency")).filter(Boolean)
      : [];
    const models = Array.isArray(calculator.models)
      ? calculator.models.map((item, index) => normalizeCalculatorEntity(item, index, "model")).filter(Boolean)
      : [];

    const finalDevices = devices.length ? devices : defaults.devices;
    const finalServices = services.length ? services : defaults.services;
    const finalUrgencies = urgencies.length ? urgencies : defaults.urgencies;
    const deviceIdSet = new Set(finalDevices.map((item) => item.id));
    const filteredModels = models.filter((item) => deviceIdSet.has(item.deviceId));
    const finalModelsBase = filteredModels.length ? filteredModels : defaults.models;
    const finalModels = deviceIdSet.has("iphone")
      ? ensureIphoneModelCatalog(finalModelsBase.filter((item) => deviceIdSet.has(item.deviceId)))
      : finalModelsBase.filter((item) => deviceIdSet.has(item.deviceId));

    return {
      devices: finalDevices,
      services: finalServices,
      urgencies: finalUrgencies,
      models: finalModels
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
    const categories = Array.isArray(rawData.categories)
      ? rawData.categories.map((item, index) => normalizeCategoryItem(item, index)).filter(Boolean)
      : [];
    const calculator = normalizeCalculatorConfig(rawData.calculator);
    const seo = normalizeSeo(rawData.seo);

    return {
      content,
      categories: categories.length ? categories : categoryDefaults(),
      calculator,
      faq: faq.length ? faq : faqDefaults(),
      products: products.length ? products : productDefaults(),
      seo,
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

  async function readJsonResponse(response) {
    const isJson = (response.headers.get("content-type") || "").includes("application/json");
    if (isJson) {
      return response.json();
    }
    return {};
  }

  function readUserSession() {
    const raw = readStorage(USER_SESSION_KEY);
    if (!raw || typeof raw !== "object") {
      return null;
    }
    const token = normalizeText(raw.token);
    const expiresAt = Number(raw.expiresAt || 0);
    if (!token || !Number.isFinite(expiresAt)) {
      return null;
    }
    if (expiresAt <= Date.now()) {
      return null;
    }
    return {
      token,
      expiresAt
    };
  }

  async function submitApplication(payload) {
    const headers = {
      "Content-Type": "application/json"
    };
    const session = readUserSession();
    if (session?.token) {
      headers.Authorization = `Bearer ${session.token}`;
    }

    const response = await fetch("./api/applications", {
      method: "POST",
      headers,
      body: JSON.stringify(payload)
    });
    const body = await readJsonResponse(response);
    if (!response.ok) {
      const message = typeof body?.error === "string" ? body.error : "Не удалось отправить заявку.";
      throw new Error(message);
    }
    return body.application;
  }

  function selectedText(select) {
    if (!select) {
      return "";
    }
    return select.options[select.selectedIndex]?.textContent?.trim() || "";
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

  function getCategoryOptions(data) {
    const list = Array.isArray(data?.categories) && data.categories.length
      ? data.categories
      : categoryDefaults();

    const normalized = list
      .map((item, index) => normalizeCategoryItem(item, index))
      .filter(Boolean);

    return normalized.length ? normalized : categoryDefaults();
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

  function applySeo(seo) {
    if (!seo) {
      return;
    }
    const path = window.location.pathname;
    const isShop = path.includes("shop");
    const isRepair = !isShop && !path.includes("account") && !path.includes("admin") && !path.includes("privacy") && !path.includes("return") && !path.includes("about");

    const title = (isShop && seo.titleShop) || (isRepair && seo.titleRepair) || seo.title;
    if (title) {
      document.title = title;
    }

    const desc = (isShop && seo.descriptionShop) || (isRepair && seo.descriptionRepair) || seo.description;
    if (desc) {
      let metaDesc = document.querySelector('meta[name="description"]');
      if (!metaDesc) {
        metaDesc = document.createElement("meta");
        metaDesc.name = "description";
        document.head.appendChild(metaDesc);
      }
      metaDesc.content = desc;
    }

    if (isShop && !seo.indexShop) {
      let metaRobots = document.querySelector('meta[name="robots"]');
      if (!metaRobots) {
        metaRobots = document.createElement("meta");
        metaRobots.name = "robots";
        document.head.appendChild(metaRobots);
      }
      metaRobots.content = "noindex, nofollow";
    }

    if (seo.favicon) {
      let link = document.querySelector('link[rel="icon"]');
      if (!link) {
        link = document.createElement("link");
        link.rel = "icon";
        document.head.appendChild(link);
      }
      link.href = seo.favicon;
    }

    if (seo.yandexVerification && !document.querySelector('meta[name="yandex-verification"]')) {
      const meta = document.createElement("meta");
      meta.name = "yandex-verification";
      meta.content = seo.yandexVerification;
      document.head.appendChild(meta);
    }

    if (seo.googleVerification && !document.querySelector('meta[name="google-site-verification"]')) {
      const meta = document.createElement("meta");
      meta.name = "google-site-verification";
      meta.content = seo.googleVerification;
      document.head.appendChild(meta);
    }

    if (seo.yandexMetrika && !document.getElementById("xm-ym-script")) {
      const script = document.createElement("script");
      script.id = "xm-ym-script";
      script.textContent = seo.yandexMetrika;
      document.head.appendChild(script);
    }

    if (seo.googleAnalytics && !document.getElementById("xm-ga-script")) {
      const script = document.createElement("script");
      script.id = "xm-ga-script";
      script.textContent = seo.googleAnalytics;
      document.head.appendChild(script);
    }
  }

  function initReveal() {
    const revealItems = document.querySelectorAll(".reveal");
    if (!revealItems.length) {
      return;
    }

    if (!("IntersectionObserver" in window)) {
      revealItems.forEach((item) => item.classList.add("is-visible"));
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

  function initCalculator(allData) {
    const deviceSelect = document.getElementById("deviceSelect");
    const modelSelect = document.getElementById("modelSelect");
    const serviceSelect = document.getElementById("serviceSelect");
    const urgencySelect = document.getElementById("urgencySelect");
    const calcButton = document.getElementById("calcButton");
    const calcResult = document.getElementById("calcResult");
    const priceRangeInput = document.getElementById("priceRangeInput");

    if (!deviceSelect || !modelSelect || !serviceSelect || !urgencySelect || !calcButton || !calcResult) {
      return;
    }

    const calcConfig = normalizeCalculatorConfig(allData?.calculator);
    const devices = calcConfig.devices;
    const services = calcConfig.services;
    const urgencies = calcConfig.urgencies;
    const models = calcConfig.models;

    const setOptions = (select, list, labelBuilder) => {
      select.innerHTML = list
        .map((item) => `<option value="${escapeHtml(item.id)}">${escapeHtml(labelBuilder(item))}</option>`)
        .join("");
    };

    setOptions(deviceSelect, devices, (item) => item.label);
    setOptions(serviceSelect, services, (item) => item.label);
    setOptions(urgencySelect, urgencies, (item) => item.label);

    function syncModels() {
      const deviceId = deviceSelect.value;
      const deviceModels = models.filter((item) => item.deviceId === deviceId);
      const options = [
        `<option value="" selected>${deviceModels.length ? "Выберите модель" : "Модели скоро добавим"}</option>`,
        ...deviceModels.map((item) => {
          const label = item.priceDelta > 0 ? `${item.label} (+${formatPrice(item.priceDelta)} ₽)` : item.label;
          return `<option value="${escapeHtml(item.id)}">${escapeHtml(label)}</option>`;
        })
      ];
      modelSelect.innerHTML = options.join("");
      modelSelect.value = "";
    }

    syncModels();
    deviceSelect.addEventListener("change", syncModels);

    calcButton.addEventListener("click", () => {
      const device = devices.find((item) => item.id === deviceSelect.value) || devices[0];
      const service = services.find((item) => item.id === serviceSelect.value) || services[0];
      const urgency = urgencies.find((item) => item.id === urgencySelect.value) || urgencies[0];
      const selectedModelId = modelSelect.value;
      if (!selectedModelId) {
        calcResult.textContent = "Выберите модель устройства.";
        if (priceRangeInput) {
          priceRangeInput.value = "";
        }
        modelSelect.focus();
        return;
      }

      const model = models.find((item) => item.id === selectedModelId) || null;
      if (!model) {
        calcResult.textContent = "Модель не найдена. Выберите модель из списка.";
        if (priceRangeInput) {
          priceRangeInput.value = "";
        }
        modelSelect.focus();
        return;
      }

      const base = (device?.basePrice || 0) + (service?.basePrice || 0) + (model?.priceDelta || 0);
      const urgencyFactor = urgency?.multiplier || 1;
      const final = Math.round(base * urgencyFactor);

      const min = Math.round(final * 0.9);
      const max = Math.round(final * 1.15);

      const modelHint = model?.label ? ` (${model.label})` : "";
      const label = `Примерная стоимость${modelHint}: ${formatPrice(min)} - ${formatPrice(max)} ₽`;
      calcResult.textContent = label;
      if (priceRangeInput) {
        priceRangeInput.value = label;
      }
    });
  }

  function initEyeToggles() {
    document.querySelectorAll(".field-eye-btn").forEach((btn) => {
      const targetId = btn.dataset.target;
      const input = targetId
        ? document.getElementById(targetId)
        : btn.closest(".field-pw-wrap")?.querySelector("input");
      if (!input) {
        return;
      }
      btn.addEventListener("click", () => {
        const isPassword = input.type === "password";
        input.type = isPassword ? "text" : "password";
        btn.classList.toggle("is-visible", isPassword);
        btn.setAttribute("aria-label", isPassword ? "Скрыть пароль" : "Показать пароль");
      });
    });
  }

  function initRequestForm() {
    const form = document.getElementById("requestForm");
    const note = document.getElementById("formNote");
    const fullNameInput = document.getElementById("clientFullName");
    const phoneInput = document.getElementById("clientPhone");
    const telegramInput = document.getElementById("clientTelegram");
    const emailInput = document.getElementById("clientEmail");
    const branchInput = document.getElementById("clientBranch");
    const commentInput = document.getElementById("clientComment");
    const deviceSelect = document.getElementById("deviceSelect");
    const modelSelect = document.getElementById("modelSelect");
    const serviceSelect = document.getElementById("serviceSelect");
    const urgencySelect = document.getElementById("urgencySelect");
    const priceRangeInput = document.getElementById("priceRangeInput");
    const createAccountToggle = document.getElementById("createAccountToggle");
    const reqAccountFields = document.getElementById("reqAccountFields");
    const reqPasswordInput = document.getElementById("reqPassword");
    if (!form || !note) {
      return;
    }

    const reqAccountBlock = document.getElementById("reqAccountBlock");

    function showLoggedInBlock() {
      if (!reqAccountBlock) {
        return;
      }
      reqAccountBlock.innerHTML = `<div class="req-account-logged"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg><span>Вы авторизованы — заявка привязана к вашему кабинету. <a href="/account.html">Открыть кабинет</a></span></div>`;
    }

    let accountMode = "register"; // "register" | "login"

    function switchToLoginMode() {
      accountMode = "login";
      const info = reqAccountBlock?.querySelector(".req-account-info");
      if (info) {
        const strong = info.querySelector("strong");
        const span = info.querySelector("span");
        if (strong) strong.textContent = "Войти в кабинет";
        if (span) span.textContent = "Введите пароль от вашего аккаунта";
      }
      const toggleLabel = reqAccountBlock?.querySelector(".toggle-switch");
      if (toggleLabel) toggleLabel.title = "Войти / Не входить";
      const pwLabel = document.querySelector('label[for="reqPassword"]');
      if (pwLabel) pwLabel.textContent = "Пароль для входа";
      if (reqPasswordInput) {
        reqPasswordInput.placeholder = "Ваш пароль";
        reqPasswordInput.value = "";
        reqPasswordInput.required = true;
      }
      const agreeRow = document.getElementById("reqAgree")?.closest(".agree-label");
      if (agreeRow) {
        agreeRow.hidden = true;
      }
      if (reqAccountFields) {
        reqAccountFields.classList.remove("is-hidden");
      }
      if (createAccountToggle) {
        createAccountToggle.checked = true;
      }
      reqPasswordInput?.focus();
    }

    function updateAccountBlock() {
      const checked = createAccountToggle?.checked;
      if (!reqAccountFields) {
        return;
      }
      reqAccountFields.classList.toggle("is-hidden", !checked);
      if (reqPasswordInput) {
        reqPasswordInput.required = Boolean(checked);
      }
    }

    if (createAccountToggle) {
      if (readUserSession()?.token) {
        showLoggedInBlock();
      } else {
        updateAccountBlock();
        createAccountToggle.addEventListener("change", updateAccountBlock);
      }
    }

    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      const fullName = (fullNameInput?.value || "").trim();
      const phone = (phoneInput?.value || "").trim();
      const telegramRaw = (telegramInput?.value || "").trim();
      const email = (emailInput?.value || "").trim();
      const branch = (branchInput?.value || "").trim();
      const comment = (commentInput?.value || "").trim();
      const modelId = (modelSelect?.value || "").trim();

      if (!fullName || !phone || !email || !branch) {
        note.textContent = "Заполните ФИО, телефон, почту и филиал.";
        return;
      }
      if (!modelId) {
        note.textContent = "Выберите модель устройства.";
        modelSelect?.focus();
        return;
      }
      if (telegramRaw && !/^@?[A-Za-z0-9_]{5,32}$/.test(telegramRaw)) {
        note.textContent = "Укажите Telegram username в формате @username.";
        telegramInput?.focus();
        return;
      }
      const telegram = telegramRaw ? (telegramRaw.startsWith("@") ? telegramRaw : `@${telegramRaw}`) : "";

      const wantsAccount = createAccountToggle?.checked && !readUserSession()?.token;
      if (wantsAccount) {
        const pwd = reqPasswordInput?.value || "";
        if (!pwd) {
          note.textContent = accountMode === "login"
            ? "Введите пароль для входа."
            : "Введите пароль для личного кабинета.";
          reqPasswordInput?.focus();
          return;
        }
        if (accountMode === "register") {
          if (pwd.length < 8 || !/[a-zA-Zа-яА-Я]/.test(pwd) || !/\d/.test(pwd)) {
            note.textContent = "Пароль должен содержать минимум 8 символов, включая буквы и цифры.";
            reqPasswordInput?.focus();
            return;
          }
          const agreed = document.getElementById("reqAgree")?.checked;
          if (!agreed) {
            note.textContent = "Примите Политику конфиденциальности, чтобы создать кабинет.";
            return;
          }
        }
      }

      const submitButton = form.querySelector('button[type="submit"]');
      if (submitButton) {
        submitButton.disabled = true;
      }
      note.textContent = "Отправляем заявку…";

      try {
        if (wantsAccount) {
          const pwd = reqPasswordInput?.value || "";
          try {
            if (accountMode === "login") {
              const loginRes = await fetch("./api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ login: email || phone, password: pwd })
              });
              const loginBody = await loginRes.json().catch(() => ({}));
              if (loginRes.ok && loginBody?.session) {
                try {
                  localStorage.setItem(USER_SESSION_KEY, JSON.stringify(loginBody.session));
                } catch {}
                showLoggedInBlock();
                note.textContent = "Вход выполнен! Отправляем заявку…";
              } else {
                note.textContent = loginBody?.error || "Неверный пароль. Попробуйте ещё раз.";
                reqPasswordInput?.focus();
                return;
              }
            } else {
              const regRes = await fetch("./api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ fullName, email, phone, password: pwd })
              });
              const regBody = await regRes.json().catch(() => ({}));
              if (regRes.ok && regBody.session) {
                try {
                  localStorage.setItem(USER_SESSION_KEY, JSON.stringify(regBody.session));
                } catch {}
                showLoggedInBlock();
                note.textContent = "Кабинет создан! Отправляем заявку…";
              } else {
                const errMsg = regBody?.error || "";
                if (regRes.status === 409 || errMsg.toLowerCase().includes("уже")) {
                  switchToLoginMode();
                  note.textContent = "Этот email уже зарегистрирован — введите пароль для входа.";
                  return;
                }
                note.textContent = `Не удалось создать кабинет: ${errMsg || "ошибка"}. Заявка всё равно будет отправлена.`;
              }
            }
          } catch {
            if (accountMode === "login") {
              note.textContent = "Ошибка входа. Попробуйте ещё раз.";
              return;
            }
            note.textContent = "Ошибка создания кабинета. Заявка всё равно будет отправлена.";
          }
        }

        const application = await submitApplication({
          source: "repair_form",
          client: { fullName, phone, email, branch, comment },
          details: {
            telegram,
            calculator: {
              device: selectedText(deviceSelect),
              model: selectedText(modelSelect),
              service: selectedText(serviceSelect),
              urgency: selectedText(urgencySelect)
            },
            priceRange: (priceRangeInput?.value || "").trim()
          }
        });

        const cabinetHint = wantsAccount
          ? ` Следите за статусом в <a href="/account.html">личном кабинете</a>.`
          : "";
        note.innerHTML = `Заявка ${application?.id || ""} отправлена. Менеджер свяжется с вами в ближайшее время.${cabinetHint}`;
        form.reset();
      } catch (error) {
        note.textContent = error instanceof Error ? error.message : "Ошибка отправки. Повторите попытку.";
      } finally {
        if (submitButton) {
          submitButton.disabled = false;
        }
      }
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
    const chipsHost = document.querySelector(".filter-chips");
    const dynamicCategoryList = document.getElementById("dynamicCategoryList");

    const cartItems = document.getElementById("cartItems");
    const cartEmpty = document.getElementById("cartEmpty");
    const cartBadge = document.getElementById("cartBadge");
    const cartTotal = document.getElementById("cartTotal");
    const buyButton = document.getElementById("buyButton");
    const checkoutForm = document.getElementById("checkoutForm");
    const checkoutNote = document.getElementById("checkoutNote");
    const checkoutName = document.getElementById("checkoutName");
    const checkoutPhone = document.getElementById("checkoutPhone");
    const checkoutEmail = document.getElementById("checkoutEmail");
    const checkoutTelegram = document.getElementById("checkoutTelegram");
    const checkoutBranch = document.getElementById("checkoutBranch");
    const checkoutDeliveryMode = document.getElementById("checkoutDeliveryMode");
    const checkoutDeliveryCityWrap = document.getElementById("checkoutDeliveryCityWrap");
    const checkoutDeliveryCity = document.getElementById("checkoutDeliveryCity");
    const checkoutComment = document.getElementById("checkoutComment");

    let products = allData.products.map((item, index) => normalizeProductItem(item, index)).filter(Boolean);
    const categoryOptions = getCategoryOptions(allData);
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

    function getCategoryButtons() {
      return [
        ...document.querySelectorAll(".category-filter[data-filter]"),
        ...document.querySelectorAll(".chip[data-filter]")
      ];
    }

    function renderCategoryChips() {
      if (!chipsHost) {
        return;
      }
      const chips = [
        { value: "all", label: "Все" },
        ...categoryOptions
      ];
      chipsHost.innerHTML = chips
        .map((item) => `<button class="chip" type="button" data-filter="${escapeHtml(item.value)}">${escapeHtml(item.label)}</button>`)
        .join("");
    }

    function renderSidebarCategories() {
      if (!dynamicCategoryList) {
        return;
      }
      const buttons = [
        { value: "all", label: "Все категории" },
        ...categoryOptions
      ];
      dynamicCategoryList.innerHTML = buttons
        .map((item) => `<li><button class="category-filter" type="button" data-filter="${escapeHtml(item.value)}">${escapeHtml(item.label)}</button></li>`)
        .join("");
    }

    function bindCategoryButtons() {
      getCategoryButtons().forEach((button) => {
        if (button.dataset.boundCategoryClick === "1") {
          return;
        }
        button.dataset.boundCategoryClick = "1";
        button.addEventListener("click", () => {
          state.category = button.dataset.filter || "all";
          renderGrid();
        });
      });
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
      getCategoryButtons().forEach((button) => {
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

    function syncCheckoutDeliveryFields() {
      const mode = (checkoutDeliveryMode?.value || "local").trim();
      const needOtherCity = mode === "other_city";
      if (checkoutDeliveryCityWrap) {
        checkoutDeliveryCityWrap.classList.toggle("is-hidden", !needOtherCity);
      }
      if (checkoutDeliveryCity) {
        checkoutDeliveryCity.required = needOtherCity;
        if (!needOtherCity) {
          checkoutDeliveryCity.value = "";
        }
      }
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

    renderSidebarCategories();
    renderCategoryChips();
    bindCategoryButtons();
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
      syncCheckoutDeliveryFields();
      if (checkoutDeliveryMode) {
        checkoutDeliveryMode.addEventListener("change", syncCheckoutDeliveryFields);
      }

      checkoutForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const fullName = (checkoutName?.value || "").trim();
        const phone = (checkoutPhone?.value || "").trim();
        const email = (checkoutEmail?.value || "").trim();
        const branch = (checkoutBranch?.value || "").trim();
        const telegram = (checkoutTelegram?.value || "").trim();
        const deliveryMode = (checkoutDeliveryMode?.value || "local").trim();
        const deliveryCity = (checkoutDeliveryCity?.value || "").trim();
        const comment = (checkoutComment?.value || "").trim();

        if (!fullName) {
          setCheckoutMessage("Укажите ФИО.");
          return;
        }
        if (!phone) {
          setCheckoutMessage("Укажите телефон.");
          return;
        }
        if (!email) {
          setCheckoutMessage("Укажите почту.");
          return;
        }
        if (!branch) {
          setCheckoutMessage("Выберите филиал.");
          return;
        }
        if (deliveryMode === "other_city" && !deliveryCity) {
          setCheckoutMessage("Укажите город доставки.");
          checkoutDeliveryCity?.focus();
          return;
        }

        const entries = getCartEntries();
        const totalQty = entries.reduce((acc, item) => acc + item.qty, 0);
        const totalPrice = entries.reduce((acc, item) => acc + item.qty * item.product.price, 0);

        const submitButton = checkoutForm.querySelector('button[type="submit"]');
        if (submitButton) {
          submitButton.disabled = true;
        }

        try {
          const application = await submitApplication({
            source: entries.length ? "shop_checkout" : "shop_request",
            client: {
              fullName,
              phone,
              email,
              branch,
              comment
            },
            details: {
              telegram,
              delivery: {
                mode: deliveryMode === "other_city" ? "other_city" : "local",
                city: deliveryMode === "other_city" ? deliveryCity : ""
              },
              order: {
                totalQty,
                totalPrice,
                items: entries.map((entry) => ({
                  id: entry.product.id,
                  name: entry.product.name,
                  qty: entry.qty,
                  unitPrice: entry.product.price
                }))
              }
            }
          });

          if (entries.length) {
            Object.keys(cart).forEach((key) => {
              delete cart[key];
            });
            saveCart(cart);
            renderCart();
          }

          checkoutForm.reset();
          syncCheckoutDeliveryFields();
          setCheckoutMessage(`Заявка ${application?.id || ""} отправлена. Мы свяжемся с вами для подтверждения.`);
        } catch (error) {
          setCheckoutMessage(error instanceof Error ? error.message : "Не удалось отправить заявку.");
        } finally {
          if (submitButton) {
            submitButton.disabled = false;
          }
        }
      });
    }
  }

  window.XMobileStore = {
    STORAGE_KEY,
    CART_KEY,
    ADMIN_SESSION_KEY,
    USER_SESSION_KEY,
    CONTENT_FIELDS: clone(CONTENT_FIELDS),
    SHOP_CATEGORY_DEFAULTS: clone(SHOP_CATEGORY_DEFAULTS),
    CALCULATOR_DEFAULT: clone(CALCULATOR_DEFAULT),
    DEFAULT_DATA: clone(DEFAULT_DATA),
    getData,
    saveData,
    resetData,
    getCategoryOptions,
    normalizeProductItem,
    normalizeFaqItem,
    normalizeCategoryItem,
    normalizeCalculatorConfig,
    submitApplication,
    stockState,
    stockLabel,
    formatPrice,
    makeId,
    slugifyId,
    initEyeToggles,
    applySeo
  };

  function initMobileNav() {
    const burger = document.getElementById("navBurger");
    if (!burger) {
      return;
    }
    const navEl = document.querySelector(".topbar .nav");
    if (!navEl) {
      return;
    }

    const navLinks = Array.from(navEl.querySelectorAll("a"))
      .map((a) => {
        const active = a.classList.contains("is-active") ? " is-active" : "";
        return `<a href="${escapeHtml(a.getAttribute("href") || "")}" class="${active.trim()}">${escapeHtml(a.textContent.trim())}</a>`;
      })
      .join("");

    const overlay = document.createElement("div");
    overlay.className = "nav-drawer__overlay";

    const drawer = document.createElement("div");
    drawer.className = "nav-drawer";
    drawer.setAttribute("aria-hidden", "true");
    drawer.innerHTML = `
      <div class="nav-drawer__accent"></div>
      <div class="nav-drawer__head">
        <a href="./index.html"><img class="logo__img" src="./assets/logo-xmobile.svg" alt="X Mobile" style="height:32px"></a>
        <button class="nav-drawer__close" aria-label="Закрыть меню">
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
            <path d="M1 1l11 11M12 1L1 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </button>
      </div>
      <div class="nav-drawer__body">
        <nav class="nav-drawer__nav">${navLinks}</nav>
      </div>
      <div class="nav-drawer__footer">
        <a class="btn btn--orange" href="./index.html#calculator">Заявка на ремонт</a>
        <a class="btn btn--cabinet" href="./account.html">Личный кабинет</a>
      </div>`;

    document.body.appendChild(overlay);
    document.body.appendChild(drawer);

    const closeDrawer = () => {
      drawer.classList.remove("is-open");
      overlay.classList.remove("is-open");
      burger.classList.remove("is-open");
      burger.setAttribute("aria-expanded", "false");
      drawer.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
    };

    const openDrawer = () => {
      drawer.classList.add("is-open");
      overlay.classList.add("is-open");
      burger.classList.add("is-open");
      burger.setAttribute("aria-expanded", "true");
      drawer.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
    };

    burger.addEventListener("click", () => {
      drawer.classList.contains("is-open") ? closeDrawer() : openDrawer();
    });

    drawer.querySelector(".nav-drawer__close").addEventListener("click", closeDrawer);
    overlay.addEventListener("click", closeDrawer);
    drawer.querySelectorAll(".nav-drawer__nav a").forEach((a) => {
      a.addEventListener("click", closeDrawer);
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        closeDrawer();
      }
    });
  }

  const initialData = getData();
  applySeo(initialData.seo);
  applyContent(initialData.content);
  applyFaq(initialData.faq);
  initReveal();
  initHeroMotion();
  initCalculator(initialData);
  initRequestForm();
  initShop(initialData);
  initEyeToggles();
  initMobileNav();

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
