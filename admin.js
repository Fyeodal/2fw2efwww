(() => {
  "use strict";

  const store = window.XMobileStore;
  if (!store) {
    return;
  }

  const SESSION_KEY = store.ADMIN_SESSION_KEY;

  const path = (window.location.pathname || "").toLowerCase();
  const isLoginPage = path.endsWith("/admin-login.html") || path.endsWith("\\admin-login.html") || path.endsWith("admin-login.html");
  const isAdminPage = path.endsWith("/admin.html") || path.endsWith("\\admin.html") || path.endsWith("admin.html");

  const byId = (id) => document.getElementById(id);

  function readSession() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) {
        return null;
      }
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") {
        return null;
      }
      const token = typeof parsed.token === "string" ? parsed.token.trim() : "";
      const expiresAt = Number(parsed.expiresAt || 0);
      if (!token || !Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
        return null;
      }
      return {
        token,
        login: typeof parsed.login === "string" ? parsed.login : "",
        expiresAt
      };
    } catch (error) {
      return null;
    }
  }

  function writeSession(session) {
    if (!session) {
      localStorage.removeItem(SESSION_KEY);
      return;
    }
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }

  function clearSession() {
    writeSession(null);
  }

  function hasSession() {
    const session = readSession();
    if (!session) {
      clearSession();
      return false;
    }
    return true;
  }

  function goTo(url) {
    window.location.href = url;
  }

  function uniqueId(seed, usedSet, fallbackPrefix) {
    const base = store.slugifyId(seed || fallbackPrefix || "item", fallbackPrefix || "item");
    let next = base;
    let index = 2;
    while (usedSet.has(next)) {
      next = `${base}-${index}`;
      index += 1;
    }
    return next;
  }

  function buildCategoryOptions(selectedValue) {
    const categories = store.getCategoryOptions(data);
    return categories.map((item) => {
      const selected = selectedValue === item.value ? " selected" : "";
      return `<option value="${item.value}"${selected}>${item.label}</option>`;
    }).join("");
  }

  function getCategoryLabel(value) {
    const categories = store.getCategoryOptions(data);
    const found = categories.find((item) => item.value === value);
    return found?.label || "Общее";
  }

  function getSubcategoryOptionsByCategory(categoryValue) {
    const safeCategory = String(categoryValue || "other").trim() || "other";
    const labels = new Set();
    (Array.isArray(data.products) ? data.products : []).forEach((item) => {
      if (String(item?.category || "").trim() !== safeCategory) {
        return;
      }
      const label = String(item?.catLabel || "").trim();
      if (label) {
        labels.add(label);
      }
    });
    if (!labels.size) {
      labels.add(getCategoryLabel(safeCategory));
    }
    return Array.from(labels).sort((a, b) => a.localeCompare(b, "ru"));
  }

  function buildSubcategoryOptions(categoryValue, selectedValue) {
    const options = getSubcategoryOptionsByCategory(categoryValue);
    const safeSelected = String(selectedValue || "").trim();
    if (safeSelected && !options.includes(safeSelected)) {
      options.unshift(safeSelected);
    }
    return options
      .map((label) => {
        const selected = safeSelected && safeSelected === label ? " selected" : "";
        return `<option value="${escapeAttr(label)}"${selected}>${escapeAttr(label)}</option>`;
      })
      .join("");
  }

  function buildDeviceOptions(selectedValue) {
    const devices = data.calculator?.devices || [];
    return devices.map((item) => {
      const selected = selectedValue === item.id ? " selected" : "";
      return `<option value="${item.id}"${selected}>${item.label}</option>`;
    }).join("");
  }

  function escapeAttr(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function formatDateTime(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "—";
    }
    return date.toLocaleString("ru-RU");
  }

  function adminAuthHeader() {
    const session = readSession();
    if (!session?.token) {
      return "";
    }
    return `Bearer ${session.token}`;
  }

  async function parseJson(response) {
    const isJson = (response.headers.get("content-type") || "").includes("application/json");
    if (!isJson) {
      return {};
    }
    return response.json();
  }

  async function requestAdminLogin(login, password) {
    const response = await fetch("./api/admin/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ login, password })
    });
    const body = await parseJson(response);
    if (!response.ok) {
      throw new Error(typeof body?.error === "string" ? body.error : "Ошибка авторизации.");
    }
    const session = body?.session;
    if (!session?.token) {
      throw new Error("Сервер не вернул сессию администратора.");
    }
    return session;
  }

  async function validateAdminSession() {
    const header = adminAuthHeader();
    if (!header) {
      return false;
    }
    const response = await fetch("./api/admin/session", {
      headers: {
        Authorization: header
      }
    });
    if (response.ok) {
      return true;
    }
    if (response.status === 401) {
      clearSession();
      return false;
    }
    return true;
  }

  function getStatusMeta(status) {
    return REQUEST_STATUS_META[status] || { label: status || "Неизвестно", className: "is-unknown" };
  }

  if (isLoginPage) {
    const form = byId("adminLoginForm");
    const loginInput = byId("adminLogin");
    const passwordInput = byId("adminPassword");
    const note = byId("adminLoginNote");

    if (hasSession()) {
      validateAdminSession().then((ok) => {
        if (ok) {
          goTo("./admin.html");
        }
      });
    }

    if (form) {
      form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const login = (loginInput?.value || "").trim();
        const password = passwordInput?.value || "";
        const submitButton = form.querySelector('button[type="submit"]');
        if (submitButton) {
          submitButton.disabled = true;
        }

        try {
          const session = await requestAdminLogin(login, password);
          writeSession(session);
          if (note) {
            note.textContent = "Успешный вход. Переход в панель...";
          }
          setTimeout(() => goTo("./admin.html"), 250);
        } catch (error) {
          clearSession();
          if (note) {
            note.textContent = error instanceof Error ? error.message : "Неверный логин или пароль.";
          }
        } finally {
          if (submitButton) {
            submitButton.disabled = false;
          }
        }
      });
    }

    return;
  }

  if (!isAdminPage) {
    return;
  }

  if (!hasSession()) {
    goTo("./admin-login.html");
    return;
  }

  validateAdminSession().then((ok) => {
    if (!ok) {
      goTo("./admin-login.html");
    }
  });

  const feedback = byId("adminFeedback");
  const status = byId("adminStatus");
  const refreshRequestsBtn = byId("refreshRequestsBtn");
  const requestStats = byId("requestStats");
  const requestAdminList = byId("requestAdminList");
  const requestStatusFilter = byId("requestStatusFilter");
  const requestPhoneFilter = byId("requestPhoneFilter");
  const requestDateFromFilter = byId("requestDateFromFilter");
  const requestDateToFilter = byId("requestDateToFilter");
  const resetRequestFiltersBtn = byId("resetRequestFiltersBtn");
  const contentForm = byId("contentForm");
  const contentFields = byId("contentFields");
  const faqAddForm = byId("faqAddForm");
  const faqQuestion = byId("faqQuestion");
  const faqAnswer = byId("faqAnswer");
  const faqList = byId("faqAdminList");
  const productAddForm = byId("productAddForm");
  const productList = byId("productAdminList");
  const addCategory = byId("addProductCategory");
  const addName = byId("addProductName");
  const addLabel = byId("addProductLabel");
  const addPrice = byId("addProductPrice");
  const addStock = byId("addProductStock");
  const categoryAddForm = byId("categoryAddForm");
  const categoryAdminList = byId("categoryAdminList");
  const addCategoryLabel = byId("addCategoryLabel");
  const addCategoryValue = byId("addCategoryValue");
  const deviceAddForm = byId("deviceAddForm");
  const deviceAdminList = byId("deviceAdminList");
  const addDeviceLabel = byId("addDeviceLabel");
  const addDeviceBasePrice = byId("addDeviceBasePrice");
  const modelAddForm = byId("modelAddForm");
  const modelAdminList = byId("modelAdminList");
  const addModelDeviceId = byId("addModelDeviceId");
  const addModelLabel = byId("addModelLabel");
  const addModelPriceDelta = byId("addModelPriceDelta");
  const serviceAddForm = byId("serviceAddForm");
  const serviceAdminList = byId("serviceAdminList");
  const addServiceLabel = byId("addServiceLabel");
  const addServiceBasePrice = byId("addServiceBasePrice");
  const urgencyAddForm = byId("urgencyAddForm");
  const urgencyAdminList = byId("urgencyAdminList");
  const addUrgencyLabel = byId("addUrgencyLabel");
  const addUrgencyMultiplier = byId("addUrgencyMultiplier");
  const logoutBtn = byId("logoutBtn");
  const resetDataButton = byId("resetDataButton");
  const exportDataButton = byId("exportDataButton");
  const importDataInput = byId("importDataInput");
  const saveSeoButton = byId("saveSeoButton");
  const seoFaviconInput = byId("seoFaviconInput");
  const seoFaviconClear = byId("seoFaviconClear");
  const seoFaviconPreview = byId("seoFaviconPreview");
  const saveBotConfigButton = byId("saveBotConfigButton");

  let data = store.getData();
  let applications = [];
  const requestFilters = {
    status: "all",
    phone: "",
    dateFrom: "",
    dateTo: ""
  };

  const REQUEST_STATUS_META = {
    new: { label: "Новая", className: "is-new" },
    in_progress: { label: "В работе", className: "is-progress" },
    postponed: { label: "Отложена", className: "is-postponed" },
    rejected: { label: "Отклонена", className: "is-rejected" },
    done: { label: "Обработана", className: "is-done" }
  };

  function ensureDataShape() {
    data.categories = store.getCategoryOptions(data);
    data.calculator = store.normalizeCalculatorConfig(data.calculator);
  }

  function notify(message, isError = false) {
    if (!feedback) {
      return;
    }
    feedback.textContent = message;
    feedback.classList.toggle("is-error", Boolean(isError));
  }

  function updateStatus() {
    if (!status) {
      return;
    }
    const safeDate = data.updatedAt ? new Date(data.updatedAt) : new Date();
    const text = Number.isNaN(safeDate.getTime())
      ? "Последнее обновление: неизвестно"
      : `Последнее обновление: ${safeDate.toLocaleString("ru-RU")}`;
    status.textContent = text;
  }

  function persist(message) {
    ensureDataShape();
    data = store.saveData(data);
    updateStatus();
    if (message) {
      notify(message);
    }
  }

  function buildContentEditor() {
    if (!contentFields) {
      return;
    }

    contentFields.innerHTML = store.CONTENT_FIELDS.map((field) => {
      const value = data.content[field.key] || "";
      const input = field.type === "textarea"
        ? `<textarea data-content-key="${field.key}" rows="3">${escapeAttr(value)}</textarea>`
        : `<input data-content-key="${field.key}" type="text" value="${escapeAttr(value)}">`;

      return `<label class="admin-field">
  <span>${field.label}</span>
  ${input}
</label>`;
    }).join("");
  }

  function readContentEditor() {
    if (!contentFields) {
      return;
    }

    const nextContent = { ...data.content };
    store.CONTENT_FIELDS.forEach((field) => {
      const node = contentFields.querySelector(`[data-content-key="${field.key}"]`);
      if (!node) {
        return;
      }
      nextContent[field.key] = (node.value || "").trim();
    });
    data.content = nextContent;
  }

  function renderFaqList() {
    if (!faqList) {
      return;
    }

    if (!Array.isArray(data.faq) || !data.faq.length) {
      faqList.innerHTML = `<div class="admin-empty">FAQ пока пуст. Добавьте первый вопрос выше.</div>`;
      return;
    }

    faqList.innerHTML = data.faq.map((item) => {
      return `<div class="admin-item" data-faq-id="${item.id}">
  <div class="admin-item-grid">
    <label>
      Вопрос
      <input type="text" data-field="question" value="${escapeAttr(item.question)}">
    </label>
    <label>
      Ответ
      <input type="text" data-field="answer" value="${escapeAttr(item.answer)}">
    </label>
  </div>
  <div class="admin-item-actions">
    <button class="mini-btn mini-btn--dark" type="button" data-action="save-faq">Сохранить</button>
    <button class="mini-btn" type="button" data-action="delete-faq">Удалить</button>
  </div>
</div>`;
    }).join("");
  }

  function renderProductList() {
    if (!productList) {
      return;
    }

    if (!Array.isArray(data.products) || !data.products.length) {
      productList.innerHTML = `<div class="admin-empty">Товары отсутствуют. Добавьте первый товар выше.</div>`;
      return;
    }

    productList.innerHTML = data.products
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name, "ru"))
      .map((item) => {
        const stockClass = item.stockQty <= 0 ? "stock stock--out" : item.stockQty <= 2 ? "stock stock--low" : "stock";
        return `<div class="admin-item" data-product-id="${item.id}">
  <div class="admin-item-grid admin-item-grid--product">
    <label>
      Название
      <input type="text" data-field="name" value="${escapeAttr(item.name)}">
    </label>
    <label>
      Подкатегория
      <select data-field="catLabel">${buildSubcategoryOptions(item.category, item.catLabel)}</select>
    </label>
    <label>
      Категория
      <select data-field="category">${buildCategoryOptions(item.category)}</select>
    </label>
    <label>
      Цена, ₽
      <input type="number" min="0" step="1" data-field="price" value="${Number(item.price) || 0}">
    </label>
    <label>
      Остаток
      <input type="number" min="0" step="1" data-field="stockQty" value="${Number(item.stockQty) || 0}">
    </label>
    <p class="${stockClass}">${store.stockLabel(item.stockQty)}</p>
  </div>
  <div class="admin-item-actions admin-item-actions--wrap">
    <button class="mini-btn mini-btn--dark" type="button" data-action="save-product">Сохранить</button>
    <button class="mini-btn" type="button" data-action="inc-stock-1">+1</button>
    <button class="mini-btn" type="button" data-action="inc-stock-5">+5</button>
    <button class="mini-btn" type="button" data-action="dec-stock-1">-1</button>
    <button class="mini-btn" type="button" data-action="delete-product">Удалить</button>
  </div>
</div>`;
      })
      .join("");
  }

  function renderCategoryList() {
    if (!categoryAdminList) {
      return;
    }

    const categories = store.getCategoryOptions(data);
    if (!categories.length) {
      categoryAdminList.innerHTML = `<div class="admin-empty">Категории отсутствуют.</div>`;
      return;
    }

    categoryAdminList.innerHTML = categories
      .map((item) => `<div class="admin-item" data-category-id="${item.value}">
  <div class="admin-item-grid">
    <label>
      Название
      <input type="text" data-field="label" value="${escapeAttr(item.label)}">
    </label>
    <label>
      Ключ
      <input type="text" data-field="value" value="${escapeAttr(item.value)}">
    </label>
  </div>
  <div class="admin-item-actions">
    <button class="mini-btn mini-btn--dark" type="button" data-action="save-category">Сохранить</button>
    <button class="mini-btn" type="button" data-action="delete-category">Удалить</button>
  </div>
</div>`)
      .join("");
  }

  function renderCalculatorLists() {
    const calc = data.calculator;
    if (!calc) {
      return;
    }

    if (deviceAdminList) {
      deviceAdminList.innerHTML = calc.devices
        .map((item) => `<div class="admin-item" data-device-id="${item.id}">
  <div class="admin-item-grid">
    <label>
      Название
      <input type="text" data-field="label" value="${escapeAttr(item.label)}">
    </label>
    <label>
      Ключ
      <input type="text" data-field="id" value="${escapeAttr(item.id)}">
    </label>
    <label>
      Базовая цена, ₽
      <input type="number" min="0" step="1" data-field="basePrice" value="${Number(item.basePrice) || 0}">
    </label>
  </div>
  <div class="admin-item-actions">
    <button class="mini-btn mini-btn--dark" type="button" data-action="save-device">Сохранить</button>
    <button class="mini-btn" type="button" data-action="delete-device">Удалить</button>
  </div>
</div>`)
        .join("");
    }

    if (modelAdminList) {
      modelAdminList.innerHTML = calc.models
        .slice()
        .sort((a, b) => a.label.localeCompare(b.label, "ru"))
        .map((item) => `<div class="admin-item" data-model-id="${item.id}">
  <div class="admin-item-grid">
    <label>
      Устройство
      <select data-field="deviceId">${buildDeviceOptions(item.deviceId)}</select>
    </label>
    <label>
      Модель
      <input type="text" data-field="label" value="${escapeAttr(item.label)}">
    </label>
    <label>
      Доплата, ₽
      <input type="number" min="0" step="1" data-field="priceDelta" value="${Number(item.priceDelta) || 0}">
    </label>
  </div>
  <div class="admin-item-actions">
    <button class="mini-btn mini-btn--dark" type="button" data-action="save-model">Сохранить</button>
    <button class="mini-btn" type="button" data-action="delete-model">Удалить</button>
  </div>
</div>`)
        .join("");
    }

    if (serviceAdminList) {
      serviceAdminList.innerHTML = calc.services
        .map((item) => `<div class="admin-item" data-service-id="${item.id}">
  <div class="admin-item-grid">
    <label>
      Название
      <input type="text" data-field="label" value="${escapeAttr(item.label)}">
    </label>
    <label>
      Ключ
      <input type="text" data-field="id" value="${escapeAttr(item.id)}">
    </label>
    <label>
      Цена услуги, ₽
      <input type="number" min="0" step="1" data-field="basePrice" value="${Number(item.basePrice) || 0}">
    </label>
  </div>
  <div class="admin-item-actions">
    <button class="mini-btn mini-btn--dark" type="button" data-action="save-service">Сохранить</button>
    <button class="mini-btn" type="button" data-action="delete-service">Удалить</button>
  </div>
</div>`)
        .join("");
    }

    if (urgencyAdminList) {
      urgencyAdminList.innerHTML = calc.urgencies
        .map((item) => `<div class="admin-item" data-urgency-id="${item.id}">
  <div class="admin-item-grid">
    <label>
      Название
      <input type="text" data-field="label" value="${escapeAttr(item.label)}">
    </label>
    <label>
      Ключ
      <input type="text" data-field="id" value="${escapeAttr(item.id)}">
    </label>
    <label>
      Коэффициент
      <input type="number" min="0.5" max="3" step="0.01" data-field="multiplier" value="${Number(item.multiplier) || 1}">
    </label>
  </div>
  <div class="admin-item-actions">
    <button class="mini-btn mini-btn--dark" type="button" data-action="save-urgency">Сохранить</button>
    <button class="mini-btn" type="button" data-action="delete-urgency">Удалить</button>
  </div>
</div>`)
        .join("");
    }
  }

  function syncAddFormSelects() {
    if (addCategory) {
      addCategory.innerHTML = buildCategoryOptions(addCategory.value);
      if (!addCategory.value) {
        const categories = store.getCategoryOptions(data);
        addCategory.value = categories[0]?.value || "other";
      }
    }

    if (addLabel) {
      const selectedCategory = (addCategory?.value || "other").trim();
      const prevLabel = addLabel.value;
      addLabel.innerHTML = buildSubcategoryOptions(selectedCategory, prevLabel);
      if (!addLabel.value) {
        addLabel.value = addLabel.options[0]?.value || "";
      }
    }

    if (addModelDeviceId) {
      addModelDeviceId.innerHTML = buildDeviceOptions(addModelDeviceId.value);
      if (!addModelDeviceId.value) {
        addModelDeviceId.value = data.calculator?.devices?.[0]?.id || "";
      }
    }
  }

  function buildSeoEditor() {
    const seo = data.seo || {};
    const fields = {
      seoTitle: seo.title || "",
      seoDescription: seo.description || "",
      seoTitleRepair: seo.titleRepair || "",
      seoDescriptionRepair: seo.descriptionRepair || "",
      seoTitleShop: seo.titleShop || "",
      seoDescriptionShop: seo.descriptionShop || "",
      seoYandexVerification: seo.yandexVerification || "",
      seoYandexMetrika: seo.yandexMetrika || "",
      seoGoogleVerification: seo.googleVerification || "",
      seoGoogleAnalytics: seo.googleAnalytics || ""
    };
    for (const [id, value] of Object.entries(fields)) {
      const el = byId(id);
      if (el) {
        el.value = value;
      }
    }
    const indexToggle = byId("seoIndexShop");
    if (indexToggle) {
      indexToggle.checked = seo.indexShop !== false;
    }
    const favicon = seo.favicon || "";
    if (seoFaviconPreview) {
      seoFaviconPreview.hidden = !favicon;
      if (favicon) {
        seoFaviconPreview.src = favicon;
      }
    }
  }

  function readSeoEditor() {
    if (!data.seo) {
      data.seo = {};
    }
    const getString = (id) => (byId(id)?.value || "").trim();
    data.seo.title = getString("seoTitle");
    data.seo.description = getString("seoDescription");
    data.seo.titleRepair = getString("seoTitleRepair");
    data.seo.descriptionRepair = getString("seoDescriptionRepair");
    data.seo.titleShop = getString("seoTitleShop");
    data.seo.descriptionShop = getString("seoDescriptionShop");
    data.seo.yandexVerification = getString("seoYandexVerification");
    data.seo.yandexMetrika = getString("seoYandexMetrika");
    data.seo.googleVerification = getString("seoGoogleVerification");
    data.seo.googleAnalytics = getString("seoGoogleAnalytics");
    data.seo.indexShop = byId("seoIndexShop")?.checked !== false;
  }

  function rebuildAll() {
    ensureDataShape();
    buildContentEditor();
    buildSeoEditor();
    renderFaqList();
    renderCategoryList();
    renderProductList();
    renderCalculatorLists();
    syncAddFormSelects();
    updateStatus();
  }

  function findFaqById(id) {
    return data.faq.find((item) => item.id === id) || null;
  }

  function findProductById(id) {
    return data.products.find((item) => item.id === id) || null;
  }

  function findCalculatorItem(listName, id) {
    const list = data.calculator?.[listName] || [];
    return list.find((item) => item.id === id) || null;
  }

  function initAdminTabs() {
    const container = byId("adminTabs");
    const buttons = Array.from((container || document).querySelectorAll("[data-tab-target]"));
    const panels = Array.from(document.querySelectorAll("[data-tab-panel]"));
    if (!buttons.length || !panels.length) {
      return;
    }

    const key = "xmobile_admin_active_tab_v1";
    const available = new Set(buttons.map((button) => button.dataset.tabTarget));
    const readSavedTab = () => {
      try {
        return localStorage.getItem(key);
      } catch (error) {
        return null;
      }
    };
    const saveTab = (value) => {
      try {
        localStorage.setItem(key, value);
      } catch (error) {
        // no-op
      }
    };

    function applyTab(tabName) {
      const safeTab = available.has(tabName) ? tabName : buttons[0].dataset.tabTarget;
      buttons.forEach((button) => {
        button.classList.toggle("is-active", button.dataset.tabTarget === safeTab);
        button.setAttribute("aria-current", button.dataset.tabTarget === safeTab ? "page" : "false");
      });
      panels.forEach((panel) => {
        const isActive = panel.dataset.tabPanel === safeTab;
        panel.hidden = !isActive;
        panel.style.display = isActive ? "" : "none";
      });
      saveTab(safeTab);
    }

    if (container) {
      container.addEventListener("click", (event) => {
        const button = event.target.closest("[data-tab-target]");
        if (!button) {
          return;
        }
        applyTab(button.dataset.tabTarget);
      });
    } else {
      buttons.forEach((button) => {
        button.addEventListener("click", () => {
          applyTab(button.dataset.tabTarget);
        });
      });
    }

    applyTab(readSavedTab() || buttons[0].dataset.tabTarget);
  }

  function toStartOfDayMs(value) {
    if (!value) {
      return null;
    }
    const date = new Date(`${value}T00:00:00`);
    const time = date.getTime();
    return Number.isNaN(time) ? null : time;
  }

  function toEndOfDayMs(value) {
    if (!value) {
      return null;
    }
    const date = new Date(`${value}T23:59:59.999`);
    const time = date.getTime();
    return Number.isNaN(time) ? null : time;
  }

  function syncRequestFilterState() {
    requestFilters.status = (requestStatusFilter?.value || "all").trim();
    requestFilters.phone = (requestPhoneFilter?.value || "").trim();
    requestFilters.dateFrom = (requestDateFromFilter?.value || "").trim();
    requestFilters.dateTo = (requestDateToFilter?.value || "").trim();
  }

  function getFilteredApplications() {
    const statusFilter = requestFilters.status || "all";
    const phoneFilter = requestFilters.phone.toLowerCase();
    const dateFromMs = toStartOfDayMs(requestFilters.dateFrom);
    const dateToMs = toEndOfDayMs(requestFilters.dateTo);

    return applications.filter((item) => {
      if (statusFilter !== "all" && item.status !== statusFilter) {
        return false;
      }

      if (phoneFilter) {
        const phone = String(item?.client?.phone || "").toLowerCase();
        if (!phone.includes(phoneFilter)) {
          return false;
        }
      }

      if (dateFromMs !== null || dateToMs !== null) {
        const createdMs = new Date(item.createdAt || item.updatedAt || 0).getTime();
        if (Number.isNaN(createdMs)) {
          return false;
        }
        if (dateFromMs !== null && createdMs < dateFromMs) {
          return false;
        }
        if (dateToMs !== null && createdMs > dateToMs) {
          return false;
        }
      }

      return true;
    });
  }

  function updateRequestStats(visibleList = applications) {
    if (!requestStats) {
      return;
    }
    const counts = {
      total: applications.length,
      new: 0,
      in_progress: 0,
      postponed: 0,
      done: 0,
      rejected: 0
    };
    applications.forEach((item) => {
      if (Object.prototype.hasOwnProperty.call(counts, item.status)) {
        counts[item.status] += 1;
      }
    });
    requestStats.textContent = `Показано: ${visibleList.length} из ${counts.total} · Новые: ${counts.new} · В работе: ${counts.in_progress} · Отложено: ${counts.postponed} · Обработано: ${counts.done} · Отклонено: ${counts.rejected}`;
  }

  function renderRequestActions(status) {
    if (status === "new") {
      return `<button class="mini-btn mini-btn--dark" type="button" data-request-action="take">Взять в работу</button>
<button class="mini-btn request-action request-action--postpone" type="button" data-request-action="postpone">Отложить</button>
<button class="mini-btn request-action request-action--reject" type="button" data-request-action="reject">Отклонить</button>`;
    }
    if (status === "in_progress" || status === "postponed") {
      return `<button class="mini-btn mini-btn--dark request-action request-action--done" type="button" data-request-action="done">Заявка обработана</button>
<button class="mini-btn request-action request-action--postpone" type="button" data-request-action="postpone">Отложить на время</button>
<button class="mini-btn request-action request-action--reject" type="button" data-request-action="reject">Отклонить заявку</button>`;
    }
    return `<span class="request-actions__finished">Статус финальный. Действия недоступны.</span>`;
  }

  function renderRequestHistory(history) {
    const list = Array.isArray(history) ? history.slice().reverse() : [];
    if (!list.length) {
      return `<li class="request-history__item">История изменений пока отсутствует.</li>`;
    }
    return list
      .map((item) => {
        const meta = getStatusMeta(item.status);
        const note = (item.note || "").trim();
        return `<li class="request-history__item">
  <span class="request-history__status">${escapeAttr(meta.label)}</span>
  <span class="request-history__time">${escapeAttr(formatDateTime(item.at))}</span>
  ${note ? `<p class="request-history__note">${escapeAttr(note)}</p>` : ""}
</li>`;
      })
      .join("");
  }

  function renderApplications() {
    if (!requestAdminList) {
      return;
    }

    if (!applications.length) {
      updateRequestStats([]);
      requestAdminList.innerHTML = `<div class="admin-empty">Пока нет заявок. Новые заявки появятся здесь автоматически.</div>`;
      return;
    }

    syncRequestFilterState();
    const filtered = getFilteredApplications();
    updateRequestStats(filtered);

    const statusPriority = {
      postponed: 0,
      new: 1,
      in_progress: 2,
      done: 3,
      rejected: 4
    };

    const sorted = filtered.slice().sort((a, b) => {
      const pa = Object.prototype.hasOwnProperty.call(statusPriority, a.status) ? statusPriority[a.status] : 99;
      const pb = Object.prototype.hasOwnProperty.call(statusPriority, b.status) ? statusPriority[b.status] : 99;
      if (pa !== pb) {
        return pa - pb;
      }

      const timeA = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const timeB = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return timeB - timeA;
    });

    if (!sorted.length) {
      requestAdminList.innerHTML = `<div class="admin-empty">По текущим фильтрам заявки не найдены.</div>`;
      return;
    }

    requestAdminList.innerHTML = sorted
      .map((item) => {
        const meta = getStatusMeta(item.status);
        const client = item.client || {};
        const details = item.details || {};
        const calc = details.calculator || {};
        const order = details.order || {};
        const telegramRaw = (details.telegram || client.telegramUsername || "").trim();
        const telegramHandle = telegramRaw.replace(/^@/, "");
        const isValidTelegram = /^[A-Za-z0-9_]{5,32}$/.test(telegramHandle);
        const telegramLink = isValidTelegram ? `https://t.me/${encodeURIComponent(telegramHandle)}` : "";
        const items = Array.isArray(order.items) ? order.items : [];
        const itemsText = items.length
          ? items.map((entry) => `${entry.name} × ${entry.qty}`).join("; ")
          : "—";

        return `<div class="admin-item request-card" data-request-id="${escapeAttr(item.id)}">
  <div class="request-card__head">
    <div>
      <p class="request-card__id">${escapeAttr(item.id)}</p>
      <p class="request-card__time">Создана: ${escapeAttr(formatDateTime(item.createdAt))}</p>
      <p class="request-card__time">Обновлена: ${escapeAttr(formatDateTime(item.updatedAt))}</p>
    </div>
    <span class="request-status ${meta.className}">${escapeAttr(meta.label)}</span>
  </div>
  <div class="request-card__grid">
    <div class="request-card__block">
      <h4>Клиент</h4>
      <p><strong>ФИО:</strong> ${escapeAttr(client.fullName || "—")}</p>
      <p><strong>Телефон:</strong> ${escapeAttr(client.phone || "—")}</p>
      <p><strong>Почта:</strong> ${escapeAttr(client.email || "—")}</p>
      <p><strong>Филиал:</strong> ${escapeAttr(client.branch || "—")}</p>
      <p><strong>Комментарий:</strong> ${escapeAttr(client.comment || "—")}</p>
    </div>
    <div class="request-card__block">
      <h4>Детали заявки</h4>
      <p><strong>Источник:</strong> ${escapeAttr(item.source || "—")}</p>
      <p><strong>Устройство:</strong> ${escapeAttr(calc.device || "—")}</p>
      <p><strong>Модель:</strong> ${escapeAttr(calc.model || "—")}</p>
      <p><strong>Услуга:</strong> ${escapeAttr(calc.service || "—")}</p>
      <p><strong>Срочность:</strong> ${escapeAttr(calc.urgency || "—")}</p>
      <p><strong>Примерная цена:</strong> ${escapeAttr(details.priceRange || "—")}</p>
      <p><strong>Telegram:</strong> ${escapeAttr(telegramRaw || "—")}</p>
      ${telegramLink ? `<p><a class="mini-btn mini-btn--dark" href="${escapeAttr(telegramLink)}" target="_blank" rel="noreferrer">Написать в Telegram</a></p>` : ""}
      <p><strong>Позиции:</strong> ${escapeAttr(itemsText)}</p>
      <p><strong>Сумма:</strong> ${Number(order.totalPrice) ? `${store.formatPrice(order.totalPrice)} ₽` : "—"}</p>
    </div>
  </div>
  <div class="request-actions">
    ${renderRequestActions(item.status)}
  </div>
  <div class="request-history">
    <h4>История статусов</h4>
    <ul>${renderRequestHistory(item.history)}</ul>
  </div>
</div>`;
      })
      .join("");
  }

  async function loadApplications(showSuccess = false) {
    if (!requestAdminList) {
      return;
    }

    requestAdminList.innerHTML = `<div class="admin-empty">Загрузка заявок...</div>`;
    try {
      const authHeader = adminAuthHeader();
      if (!authHeader) {
        clearSession();
        goTo("./admin-login.html");
        return;
      }
      const response = await fetch("./api/applications", {
        headers: {
          Authorization: authHeader
        }
      });
      const body = await parseJson(response);
      if (!response.ok) {
        if (response.status === 401) {
          clearSession();
          goTo("./admin-login.html");
          return;
        }
        throw new Error(typeof body?.error === "string" ? body.error : "Не удалось загрузить заявки.");
      }
      applications = Array.isArray(body.applications) ? body.applications : [];
      renderApplications();
      if (showSuccess) {
        notify("Список заявок обновлён.");
      }
    } catch (error) {
      applications = [];
      updateRequestStats();
      requestAdminList.innerHTML = `<div class="admin-empty">Сервер заявок недоступен. Запустите backend и обновите страницу.</div>`;
      notify(error instanceof Error ? error.message : "Не удалось загрузить заявки.", true);
    }
  }

  async function setApplicationStatus(id, status, note = "") {
    const authHeader = adminAuthHeader();
    if (!authHeader) {
      clearSession();
      goTo("./admin-login.html");
      throw new Error("Сессия администратора истекла.");
    }
    const response = await fetch(`./api/applications/${encodeURIComponent(id)}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader
      },
      body: JSON.stringify({ status, note })
    });
    const body = await parseJson(response);
    if (!response.ok) {
      if (response.status === 401) {
        clearSession();
        goTo("./admin-login.html");
        throw new Error("Сессия администратора истекла.");
      }
      throw new Error(typeof body?.error === "string" ? body.error : "Не удалось изменить статус.");
    }
    return body.application;
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      clearSession();
      goTo("./admin-login.html");
    });
  }

  if (contentForm) {
    contentForm.addEventListener("submit", (event) => {
      event.preventDefault();
      readContentEditor();
      persist("Тексты сайта сохранены.");
    });
  }

  if (faqAddForm) {
    faqAddForm.addEventListener("submit", (event) => {
      event.preventDefault();

      const question = (faqQuestion?.value || "").trim();
      const answer = (faqAnswer?.value || "").trim();
      if (!question || !answer) {
        notify("Заполните вопрос и ответ для FAQ.", true);
        return;
      }

      data.faq.push({
        id: store.makeId("faq"),
        question,
        answer
      });

      faqAddForm.reset();
      persist("Вопрос FAQ добавлен.");
      renderFaqList();
    });
  }

  if (faqList) {
    faqList.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-action]");
      if (!button) {
        return;
      }
      const row = button.closest("[data-faq-id]");
      if (!row) {
        return;
      }
      const id = row.dataset.faqId;
      if (!id) {
        return;
      }

      const action = button.dataset.action;
      const target = findFaqById(id);
      if (!target) {
        return;
      }

      if (action === "delete-faq") {
        data.faq = data.faq.filter((item) => item.id !== id);
        persist("Вопрос FAQ удалён.");
        renderFaqList();
        return;
      }

      if (action === "save-faq") {
        const qInput = row.querySelector('[data-field="question"]');
        const aInput = row.querySelector('[data-field="answer"]');
        const nextQ = (qInput?.value || "").trim();
        const nextA = (aInput?.value || "").trim();

        if (!nextQ || !nextA) {
          notify("В FAQ вопрос и ответ не должны быть пустыми.", true);
          return;
        }

        target.question = nextQ;
        target.answer = nextA;
        persist("Вопрос FAQ обновлён.");
      }
    });
  }

  if (productAddForm) {
    productAddForm.addEventListener("submit", (event) => {
      event.preventDefault();

      const name = (addName?.value || "").trim();
      const catLabel = (addLabel?.value || "").trim();
      const category = (addCategory?.value || "other").trim();
      const price = Math.max(0, Number(addPrice?.value || 0));
      const stockQty = Math.max(0, Math.floor(Number(addStock?.value || 0)));

      if (!name || !catLabel) {
        notify("Укажите название и подкатегорию товара.", true);
        return;
      }

      data.products.push({
        id: store.makeId("product"),
        name,
        catLabel,
        category,
        price,
        stockQty
      });

      productAddForm.reset();
      syncAddFormSelects();
      persist("Товар добавлен.");
      renderProductList();
    });
  }

  if (addCategory) {
    addCategory.addEventListener("change", () => {
      if (!addLabel) {
        return;
      }
      const category = (addCategory.value || "other").trim();
      addLabel.innerHTML = buildSubcategoryOptions(category, "");
      addLabel.value = addLabel.options[0]?.value || "";
    });
  }

  if (productList) {
    productList.addEventListener("change", (event) => {
      const categorySelect = event.target.closest('select[data-field="category"]');
      if (!categorySelect) {
        return;
      }
      const row = categorySelect.closest("[data-product-id]");
      if (!row) {
        return;
      }
      const labelSelect = row.querySelector('select[data-field="catLabel"]');
      if (!labelSelect) {
        return;
      }
      const category = (categorySelect.value || "other").trim();
      labelSelect.innerHTML = buildSubcategoryOptions(category, "");
      labelSelect.value = labelSelect.options[0]?.value || "";
    });

    productList.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-action]");
      if (!button) {
        return;
      }
      const row = button.closest("[data-product-id]");
      if (!row) {
        return;
      }
      const id = row.dataset.productId;
      if (!id) {
        return;
      }
      const product = findProductById(id);
      if (!product) {
        return;
      }

      const action = button.dataset.action;
      if (action === "delete-product") {
        data.products = data.products.filter((item) => item.id !== id);
        persist("Товар удалён.");
        renderProductList();
        return;
      }

      if (action === "inc-stock-1") {
        product.stockQty = Math.max(0, Number(product.stockQty) + 1);
        persist("Остаток увеличен на 1.");
        renderProductList();
        return;
      }

      if (action === "inc-stock-5") {
        product.stockQty = Math.max(0, Number(product.stockQty) + 5);
        persist("Остаток увеличен на 5.");
        renderProductList();
        return;
      }

      if (action === "dec-stock-1") {
        product.stockQty = Math.max(0, Number(product.stockQty) - 1);
        persist("Остаток уменьшен на 1.");
        renderProductList();
        return;
      }

      if (action === "save-product") {
        const nameInput = row.querySelector('[data-field="name"]');
        const labelInput = row.querySelector('[data-field="catLabel"]');
        const categoryInput = row.querySelector('[data-field="category"]');
        const priceInput = row.querySelector('[data-field="price"]');
        const stockInput = row.querySelector('[data-field="stockQty"]');

        const nextName = (nameInput?.value || "").trim();
        const nextLabel = (labelInput?.value || "").trim();
        const nextCategory = (categoryInput?.value || "other").trim();
        const nextPrice = Math.max(0, Number(priceInput?.value || 0));
        const nextStock = Math.max(0, Math.floor(Number(stockInput?.value || 0)));

        if (!nextName || !nextLabel) {
          notify("Название и подкатегория товара обязательны.", true);
          return;
        }

        product.name = nextName;
        product.catLabel = nextLabel;
        product.category = nextCategory;
        product.price = nextPrice;
        product.stockQty = nextStock;

        persist("Товар обновлён.");
        renderProductList();
      }
    });
  }

  if (categoryAddForm) {
    categoryAddForm.addEventListener("submit", (event) => {
      event.preventDefault();

      const label = (addCategoryLabel?.value || "").trim();
      const manualValue = (addCategoryValue?.value || "").trim();
      if (!label) {
        notify("Укажите название категории.", true);
        return;
      }

      const used = new Set(["all", ...store.getCategoryOptions(data).map((item) => item.value)]);
      const value = uniqueId(manualValue || label, used, "category");
      data.categories.push({ value, label });

      categoryAddForm.reset();
      persist("Категория добавлена.");
      renderCategoryList();
      renderProductList();
      syncAddFormSelects();
    });
  }

  if (categoryAdminList) {
    categoryAdminList.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-action]");
      if (!button) {
        return;
      }
      const row = button.closest("[data-category-id]");
      if (!row) {
        return;
      }
      const prevId = row.dataset.categoryId;
      const categories = store.getCategoryOptions(data);
      const target = categories.find((item) => item.value === prevId);
      if (!target) {
        return;
      }

      if (button.dataset.action === "delete-category") {
        if (categories.length <= 1) {
          notify("Нельзя удалить последнюю категорию.", true);
          return;
        }
        const fallback = categories.find((item) => item.value !== prevId) || categories[0];
        data.products.forEach((product) => {
          if (product.category === prevId) {
            product.category = fallback.value;
          }
        });
        data.categories = categories.filter((item) => item.value !== prevId);
        persist("Категория удалена.");
        renderCategoryList();
        renderProductList();
        syncAddFormSelects();
        return;
      }

      if (button.dataset.action === "save-category") {
        const labelInput = row.querySelector('[data-field="label"]');
        const valueInput = row.querySelector('[data-field="value"]');
        const nextLabel = (labelInput?.value || "").trim();
        const requestedValue = (valueInput?.value || "").trim();
        if (!nextLabel) {
          notify("Название категории не может быть пустым.", true);
          return;
        }

        const used = new Set(["all", ...categories.filter((item) => item.value !== prevId).map((item) => item.value)]);
        const nextValue = uniqueId(requestedValue || nextLabel, used, "category");
        data.categories = categories.map((item) => {
          if (item.value !== prevId) {
            return item;
          }
          return { value: nextValue, label: nextLabel };
        });

        if (nextValue !== prevId) {
          data.products.forEach((product) => {
            if (product.category === prevId) {
              product.category = nextValue;
            }
          });
        }

        persist("Категория обновлена.");
        renderCategoryList();
        renderProductList();
        syncAddFormSelects();
      }
    });
  }

  if (deviceAddForm) {
    deviceAddForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const label = (addDeviceLabel?.value || "").trim();
      const basePrice = Math.max(0, Number(addDeviceBasePrice?.value || 0));
      if (!label) {
        notify("Введите название устройства.", true);
        return;
      }

      const used = new Set((data.calculator?.devices || []).map((item) => item.id));
      const id = uniqueId(label, used, "device");
      data.calculator.devices.push({ id, label, basePrice });
      deviceAddForm.reset();
      persist("Устройство добавлено.");
      renderCalculatorLists();
      syncAddFormSelects();
    });
  }

  if (modelAddForm) {
    modelAddForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const deviceId = (addModelDeviceId?.value || "").trim();
      const label = (addModelLabel?.value || "").trim();
      const priceDelta = Math.max(0, Number(addModelPriceDelta?.value || 0));
      if (!deviceId || !label) {
        notify("Для модели нужно выбрать устройство и указать название.", true);
        return;
      }

      const used = new Set((data.calculator?.models || []).map((item) => item.id));
      const id = uniqueId(`${deviceId}-${label}`, used, "model");
      data.calculator.models.push({ id, deviceId, label, priceDelta });
      modelAddForm.reset();
      persist("Модель добавлена.");
      renderCalculatorLists();
      syncAddFormSelects();
    });
  }

  if (serviceAddForm) {
    serviceAddForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const label = (addServiceLabel?.value || "").trim();
      const basePrice = Math.max(0, Number(addServiceBasePrice?.value || 0));
      if (!label) {
        notify("Введите название услуги.", true);
        return;
      }

      const used = new Set((data.calculator?.services || []).map((item) => item.id));
      const id = uniqueId(label, used, "service");
      data.calculator.services.push({ id, label, basePrice });
      serviceAddForm.reset();
      persist("Услуга добавлена.");
      renderCalculatorLists();
    });
  }

  if (urgencyAddForm) {
    urgencyAddForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const label = (addUrgencyLabel?.value || "").trim();
      const multiplier = Number(addUrgencyMultiplier?.value || 1);
      if (!label || !Number.isFinite(multiplier) || multiplier <= 0) {
        notify("Укажите название и корректный коэффициент срочности.", true);
        return;
      }

      const used = new Set((data.calculator?.urgencies || []).map((item) => item.id));
      const id = uniqueId(label, used, "urgency");
      data.calculator.urgencies.push({ id, label, multiplier });
      urgencyAddForm.reset();
      persist("Режим срочности добавлен.");
      renderCalculatorLists();
    });
  }

  if (deviceAdminList) {
    deviceAdminList.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-action]");
      if (!button) {
        return;
      }
      const row = button.closest("[data-device-id]");
      if (!row) {
        return;
      }
      const prevId = row.dataset.deviceId;
      const target = findCalculatorItem("devices", prevId);
      if (!target) {
        return;
      }

      if (button.dataset.action === "delete-device") {
        if ((data.calculator?.devices || []).length <= 1) {
          notify("Нельзя удалить последнее устройство калькулятора.", true);
          return;
        }
        data.calculator.devices = data.calculator.devices.filter((item) => item.id !== prevId);
        data.calculator.models = data.calculator.models.filter((item) => item.deviceId !== prevId);
        persist("Устройство удалено.");
        renderCalculatorLists();
        syncAddFormSelects();
        return;
      }

      if (button.dataset.action === "save-device") {
        const labelInput = row.querySelector('[data-field="label"]');
        const idInput = row.querySelector('[data-field="id"]');
        const priceInput = row.querySelector('[data-field="basePrice"]');
        const nextLabel = (labelInput?.value || "").trim();
        const requestedId = (idInput?.value || "").trim();
        const nextPrice = Math.max(0, Number(priceInput?.value || 0));
        if (!nextLabel) {
          notify("Название устройства не может быть пустым.", true);
          return;
        }

        const used = new Set(data.calculator.devices.filter((item) => item.id !== prevId).map((item) => item.id));
        const nextId = uniqueId(requestedId || nextLabel, used, "device");
        target.label = nextLabel;
        target.basePrice = nextPrice;
        target.id = nextId;

        if (nextId !== prevId) {
          data.calculator.models.forEach((model) => {
            if (model.deviceId === prevId) {
              model.deviceId = nextId;
            }
          });
        }

        persist("Устройство обновлено.");
        renderCalculatorLists();
        syncAddFormSelects();
      }
    });
  }

  if (modelAdminList) {
    modelAdminList.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-action]");
      if (!button) {
        return;
      }
      const row = button.closest("[data-model-id]");
      if (!row) {
        return;
      }
      const id = row.dataset.modelId;
      const target = findCalculatorItem("models", id);
      if (!target) {
        return;
      }

      if (button.dataset.action === "delete-model") {
        data.calculator.models = data.calculator.models.filter((item) => item.id !== id);
        persist("Модель удалена.");
        renderCalculatorLists();
        return;
      }

      if (button.dataset.action === "save-model") {
        const labelInput = row.querySelector('[data-field="label"]');
        const deviceInput = row.querySelector('[data-field="deviceId"]');
        const deltaInput = row.querySelector('[data-field="priceDelta"]');
        const nextLabel = (labelInput?.value || "").trim();
        const nextDevice = (deviceInput?.value || "").trim();
        const nextDelta = Math.max(0, Number(deltaInput?.value || 0));
        if (!nextLabel || !nextDevice) {
          notify("Для модели обязательно устройство и название.", true);
          return;
        }

        target.label = nextLabel;
        target.deviceId = nextDevice;
        target.priceDelta = nextDelta;
        persist("Модель обновлена.");
        renderCalculatorLists();
      }
    });
  }

  if (serviceAdminList) {
    serviceAdminList.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-action]");
      if (!button) {
        return;
      }
      const row = button.closest("[data-service-id]");
      if (!row) {
        return;
      }
      const prevId = row.dataset.serviceId;
      const target = findCalculatorItem("services", prevId);
      if (!target) {
        return;
      }

      if (button.dataset.action === "delete-service") {
        if ((data.calculator?.services || []).length <= 1) {
          notify("Нельзя удалить последнюю услугу калькулятора.", true);
          return;
        }
        data.calculator.services = data.calculator.services.filter((item) => item.id !== prevId);
        persist("Услуга удалена.");
        renderCalculatorLists();
        return;
      }

      if (button.dataset.action === "save-service") {
        const labelInput = row.querySelector('[data-field="label"]');
        const idInput = row.querySelector('[data-field="id"]');
        const priceInput = row.querySelector('[data-field="basePrice"]');
        const nextLabel = (labelInput?.value || "").trim();
        const requestedId = (idInput?.value || "").trim();
        const nextPrice = Math.max(0, Number(priceInput?.value || 0));
        if (!nextLabel) {
          notify("Название услуги не может быть пустым.", true);
          return;
        }

        const used = new Set(data.calculator.services.filter((item) => item.id !== prevId).map((item) => item.id));
        target.id = uniqueId(requestedId || nextLabel, used, "service");
        target.label = nextLabel;
        target.basePrice = nextPrice;
        persist("Услуга обновлена.");
        renderCalculatorLists();
      }
    });
  }

  if (urgencyAdminList) {
    urgencyAdminList.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-action]");
      if (!button) {
        return;
      }
      const row = button.closest("[data-urgency-id]");
      if (!row) {
        return;
      }
      const prevId = row.dataset.urgencyId;
      const target = findCalculatorItem("urgencies", prevId);
      if (!target) {
        return;
      }

      if (button.dataset.action === "delete-urgency") {
        if ((data.calculator?.urgencies || []).length <= 1) {
          notify("Нельзя удалить последний режим срочности.", true);
          return;
        }
        data.calculator.urgencies = data.calculator.urgencies.filter((item) => item.id !== prevId);
        persist("Режим срочности удалён.");
        renderCalculatorLists();
        return;
      }

      if (button.dataset.action === "save-urgency") {
        const labelInput = row.querySelector('[data-field="label"]');
        const idInput = row.querySelector('[data-field="id"]');
        const multiplierInput = row.querySelector('[data-field="multiplier"]');
        const nextLabel = (labelInput?.value || "").trim();
        const requestedId = (idInput?.value || "").trim();
        const nextMultiplier = Number(multiplierInput?.value || 1);
        if (!nextLabel || !Number.isFinite(nextMultiplier) || nextMultiplier <= 0) {
          notify("Заполните название и корректный коэффициент срочности.", true);
          return;
        }

        const used = new Set(data.calculator.urgencies.filter((item) => item.id !== prevId).map((item) => item.id));
        target.id = uniqueId(requestedId || nextLabel, used, "urgency");
        target.label = nextLabel;
        target.multiplier = nextMultiplier;
        persist("Режим срочности обновлён.");
        renderCalculatorLists();
      }
    });
  }

  if (refreshRequestsBtn) {
    refreshRequestsBtn.addEventListener("click", () => {
      loadApplications(true);
    });
  }

  [requestStatusFilter, requestPhoneFilter, requestDateFromFilter, requestDateToFilter].forEach((control) => {
    if (!control) {
      return;
    }
    const eventName = control.tagName === "SELECT" ? "change" : "input";
    control.addEventListener(eventName, () => {
      renderApplications();
    });
  });

  if (resetRequestFiltersBtn) {
    resetRequestFiltersBtn.addEventListener("click", () => {
      if (requestStatusFilter) {
        requestStatusFilter.value = "all";
      }
      if (requestPhoneFilter) {
        requestPhoneFilter.value = "";
      }
      if (requestDateFromFilter) {
        requestDateFromFilter.value = "";
      }
      if (requestDateToFilter) {
        requestDateToFilter.value = "";
      }
      syncRequestFilterState();
      renderApplications();
    });
  }

  if (requestAdminList) {
    requestAdminList.addEventListener("click", async (event) => {
      const button = event.target.closest("button[data-request-action]");
      if (!button) {
        return;
      }
      const row = button.closest("[data-request-id]");
      if (!row) {
        return;
      }

      const requestId = row.dataset.requestId;
      if (!requestId) {
        return;
      }

      const actionMap = {
        take: "in_progress",
        reject: "rejected",
        postpone: "postponed",
        done: "done"
      };
      const nextStatus = actionMap[button.dataset.requestAction];
      if (!nextStatus) {
        return;
      }

      let note = "";
      if (button.dataset.requestAction === "reject") {
        note = window.prompt("Причина отклонения (необязательно):", "") || "";
      } else if (button.dataset.requestAction === "postpone") {
        note = window.prompt("Комментарий по отложенной заявке (необязательно):", "") || "";
      } else if (button.dataset.requestAction === "done") {
        note = window.prompt("Комментарий по выполненной заявке (необязательно):", "") || "";
      }

      button.disabled = true;
      try {
        const updated = await setApplicationStatus(requestId, nextStatus, note);
        applications = applications.map((item) => (item.id === updated.id ? updated : item));
        renderApplications();
        notify(`Статус заявки ${requestId} обновлён.`);
      } catch (error) {
        notify(error instanceof Error ? error.message : "Не удалось обновить статус заявки.", true);
      } finally {
        button.disabled = false;
      }
    });
  }

  if (resetDataButton) {
    resetDataButton.addEventListener("click", () => {
      const confirmed = window.confirm("Сбросить все изменения к базовым значениям?");
      if (!confirmed) {
        return;
      }
      data = store.resetData();
      rebuildAll();
      notify("База сброшена к значениям по умолчанию.");
    });
  }

  if (exportDataButton) {
    exportDataButton.addEventListener("click", () => {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `xmobile-backup-${Date.now()}.json`;
      document.body.append(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      notify("JSON-бэкап выгружен.");
    });
  }

  if (importDataInput) {
    importDataInput.addEventListener("change", async () => {
      const file = importDataInput.files?.[0];
      if (!file) {
        return;
      }
      try {
        const text = await file.text();
        const parsed = JSON.parse(text);
        data = store.saveData(parsed);
        rebuildAll();
        notify("Данные успешно импортированы из JSON.");
      } catch (error) {
        notify("Не удалось импортировать файл. Проверьте JSON-структуру.", true);
      } finally {
        importDataInput.value = "";
      }
    });
  }

  if (saveSeoButton) {
    saveSeoButton.addEventListener("click", async () => {
      readSeoEditor();
      persist("SEO-настройки сохранены.");
      const header = adminAuthHeader();
      if (!header) {
        return;
      }
      try {
        const response = await fetch("./api/admin/seo", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: header
          },
          body: JSON.stringify(data.seo)
        });
        if (!response.ok) {
          notify("SEO сохранено локально, но не удалось сохранить на сервере.", true);
        }
      } catch {
        notify("SEO сохранено локально, но не удалось сохранить на сервере.", true);
      }
    });
  }

  if (seoFaviconInput) {
    seoFaviconInput.addEventListener("change", () => {
      const file = seoFaviconInput.files?.[0];
      if (!file) {
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target.result;
        if (!data.seo) {
          data.seo = {};
        }
        data.seo.favicon = dataUrl;
        if (seoFaviconPreview) {
          seoFaviconPreview.src = dataUrl;
          seoFaviconPreview.hidden = false;
        }
        notify("Иконка загружена. Нажмите «Сохранить SEO-настройки».");
      };
      reader.readAsDataURL(file);
      seoFaviconInput.value = "";
    });
  }

  if (seoFaviconClear) {
    seoFaviconClear.addEventListener("click", () => {
      if (!data.seo) {
        data.seo = {};
      }
      data.seo.favicon = "";
      if (seoFaviconPreview) {
        seoFaviconPreview.src = "";
        seoFaviconPreview.hidden = true;
      }
      notify("Иконка сброшена. Нажмите «Сохранить SEO-настройки».");
    });
  }

  async function loadBotConfig() {
    const header = adminAuthHeader();
    if (!header) return;
    try {
      const response = await fetch("./api/admin/bot-config", { headers: { Authorization: header } });
      if (!response.ok) return;
      const body = await response.json();
      const cfg = body.config || {};
      if (byId("botToken")) byId("botToken").value = cfg.token || "";
      if (byId("botUsername")) byId("botUsername").value = cfg.username || "";
      if (byId("botWebhookSecret")) byId("botWebhookSecret").value = cfg.webhookSecret || "";
      if (byId("botAdminChatIds")) byId("botAdminChatIds").value = cfg.adminChatIds || "";
      if (byId("botManagerChatIds")) byId("botManagerChatIds").value = cfg.managerChatIds || "";
    } catch {
      // silently skip if not admin role
    }
  }

  if (saveBotConfigButton) {
    saveBotConfigButton.addEventListener("click", async () => {
      const header = adminAuthHeader();
      const msgEl = byId("botConfigSaveMsg");
      const setMsg = (text, isError = false) => {
        if (!msgEl) return;
        msgEl.textContent = text;
        msgEl.style.color = isError ? "var(--orange)" : "#22c55e";
      };
      if (!header) {
        setMsg("Нет прав администратора.", true);
        return;
      }
      const payload = {
        token: (byId("botToken")?.value || "").trim(),
        username: (byId("botUsername")?.value || "").trim(),
        webhookSecret: (byId("botWebhookSecret")?.value || "").trim(),
        adminChatIds: (byId("botAdminChatIds")?.value || "").trim(),
        managerChatIds: (byId("botManagerChatIds")?.value || "").trim(),
      };
      saveBotConfigButton.disabled = true;
      saveBotConfigButton.textContent = "Сохранение...";
      setMsg("");
      try {
        const response = await fetch("./api/admin/bot-config", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: header },
          body: JSON.stringify(payload),
        });
        const body = await response.json().catch(() => ({}));
        if (!response.ok) {
          setMsg(body.error || "Не удалось сохранить настройки бота.", true);
          return;
        }
        setMsg("Сохранено. Webhook переподключён.");
      } catch {
        setMsg("Ошибка соединения.", true);
      } finally {
        saveBotConfigButton.disabled = false;
        saveBotConfigButton.textContent = "Сохранить настройки бота";
      }
    });
  }

  // ── YML Import ──────────────────────────────────────────────────────
  function getXmlText(el, tagName) {
    const found = el.getElementsByTagName(tagName);
    return found.length ? found[0].textContent.trim() : "";
  }

  function parseYmlCatalog(xmlText) {
    const parser = new DOMParser();
    // Try XML first, fall back to HTML parser (some feeds have minor issues)
    let doc = parser.parseFromString(xmlText, "text/xml");

    // Detect parse error (cross-browser: check documentElement tag name)
    const rootTag = doc.documentElement ? doc.documentElement.nodeName.toLowerCase() : "";
    if (rootTag === "parsererror" || doc.getElementsByTagName("parsererror").length) {
      // Try as HTML as fallback
      doc = parser.parseFromString(xmlText, "text/html");
    }

    // Build category map: id → {name, parentId}
    const catMap = {};
    const catEls = doc.getElementsByTagName("category");
    for (let i = 0; i < catEls.length; i++) {
      const el = catEls[i];
      const id = el.getAttribute("id");
      if (id) {
        catMap[id] = {
          name: el.textContent.trim(),
          parentId: el.getAttribute("parentId") || null
        };
      }
    }

    // Parse offers
    const rawProducts = [];
    const offerEls = doc.getElementsByTagName("offer");

    for (let i = 0; i < offerEls.length; i++) {
      const el = offerEls[i];
      const name = getXmlText(el, "name");
      if (!name) continue;

      const price = Math.round(parseFloat(getXmlText(el, "price") || "0") || 0);
      const categoryId = getXmlText(el, "categoryId");

      // Stock: try <quantity>, then <param name="quantity">
      let stockQty = 0;
      const qtyText = getXmlText(el, "quantity");
      if (qtyText !== "") {
        stockQty = parseInt(qtyText, 10) || 0;
      } else {
        const params = el.getElementsByTagName("param");
        for (let p = 0; p < params.length; p++) {
          if ((params[p].getAttribute("name") || "").toLowerCase() === "quantity") {
            stockQty = parseInt(params[p].textContent, 10) || 0;
            break;
          }
        }
      }
      if (el.getAttribute("available") === "false") stockQty = 0;

      const catInfo = catMap[categoryId];
      const catLabel = catInfo ? catInfo.name : "Другое";
      const catValue = store.slugifyId(catLabel, "other");
      const offerId = el.getAttribute("id") || String(i);

      rawProducts.push({
        id: "yml-" + offerId,
        name,
        category: catValue,
        catLabel,
        price,
        stockQty
      });
    }

    // Unique categories actually used by products
    const seenCats = new Map();
    rawProducts.forEach((p) => {
      if (!seenCats.has(p.category)) seenCats.set(p.category, p.catLabel);
    });
    const categories = Array.from(seenCats.entries()).map(([value, label]) => ({ value, label }));

    return { categories, products: rawProducts };
  }

  function applyYmlImport(parsed, mode) {
    const { categories: newCats, products: newProds } = parsed;

    if (mode === "replace_all" || mode === "replace_products") {
      data.categories = newCats;
      data.products = newProds;
    } else {
      // merge
      const existingCatValues = new Set((data.categories || []).map((c) => c.value));
      const addedCats = newCats.filter((c) => !existingCatValues.has(c.value));
      data.categories = [...(data.categories || []), ...addedCats];

      const existingById = new Map((data.products || []).map((p, idx) => [p.id, idx]));
      const toAppend = [];
      newProds.forEach((p) => {
        if (existingById.has(p.id)) {
          data.products[existingById.get(p.id)] = p;
        } else {
          toAppend.push(p);
        }
      });
      data.products = [...(data.products || []), ...toAppend];
    }

    persist();
    rebuildAll();
  }

  const ymlImportButton = byId("ymlImportButton");
  if (ymlImportButton) {
    ymlImportButton.addEventListener("click", async () => {
      const msgEl = byId("ymlImportMsg");
      const previewEl = byId("ymlImportPreview");
      const mode = byId("ymlImportMode")?.value || "merge";
      const urlVal = (byId("ymlImportUrl")?.value || "").trim();
      const fileInput = byId("ymlImportFile");

      const setMsg = (text, isError = false) => {
        if (!msgEl) return;
        msgEl.textContent = text;
        msgEl.style.color = isError ? "#ef4444" : "#22c55e";
      };
      const setBusy = (busy, label = "Импортировать каталог") => {
        ymlImportButton.disabled = busy;
        ymlImportButton.textContent = busy ? label : "Импортировать каталог";
      };

      setMsg("");
      if (previewEl) previewEl.hidden = true;

      try {
        let xmlText = "";

        if (fileInput?.files?.length) {
          setBusy(true, "Чтение файла...");
          xmlText = await fileInput.files[0].text();
        } else if (urlVal) {
          const header = adminAuthHeader();
          if (!header) { setMsg("Войдите как admin.", true); return; }
          setBusy(true, "Загрузка YML...");
          const response = await fetch("./api/admin/proxy-yml?url=" + encodeURIComponent(urlVal), {
            headers: { Authorization: header }
          });
          if (!response.ok) {
            let errText = "Ошибка " + response.status;
            try { const b = await response.json(); errText = b.error || errText; } catch {}
            setMsg(errText, true);
            return;
          }
          xmlText = await response.text();
        } else {
          setMsg("Укажите URL или выберите файл.", true);
          return;
        }

        setBusy(true, "Разбор XML...");
        const parsed = parseYmlCatalog(xmlText);

        if (!parsed.products.length) {
          setMsg("Товары не найдены. Проверьте формат файла.", true);
          return;
        }

        setBusy(true, "Сохранение...");
        applyYmlImport(parsed, mode);

        setMsg("Готово: " + parsed.products.length + " товаров, " + parsed.categories.length + " категорий.");
        if (previewEl) {
          previewEl.hidden = false;
          previewEl.innerHTML =
            "<p><strong>Импортировано:</strong> " + parsed.products.length + " товаров в " + parsed.categories.length + " категориях.</p>" +
            "<p><strong>Категории:</strong> " + parsed.categories.map((c) => c.label).join(", ") + "</p>";
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setMsg("Ошибка: " + msg, true);
        console.error("[YML import]", err);
      } finally {
        setBusy(false);
      }
    });
  }

  rebuildAll();
  initAdminTabs();
  loadApplications();
  loadBotConfig();
})();
