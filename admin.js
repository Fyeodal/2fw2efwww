(() => {
  "use strict";

  const store = window.XMobileStore;
  if (!store) {
    return;
  }

  const SESSION_KEY = store.ADMIN_SESSION_KEY;
  const ADMIN_LOGIN = "admin";
  const ADMIN_PASSWORD = "xmobile2026";

  const path = (window.location.pathname || "").toLowerCase();
  const isLoginPage = path.endsWith("/admin-login.html") || path.endsWith("\\admin-login.html") || path.endsWith("admin-login.html");
  const isAdminPage = path.endsWith("/admin.html") || path.endsWith("\\admin.html") || path.endsWith("admin.html");

  const byId = (id) => document.getElementById(id);

  function setSession(isActive) {
    if (isActive) {
      localStorage.setItem(SESSION_KEY, "1");
      return;
    }
    localStorage.removeItem(SESSION_KEY);
  }

  function hasSession() {
    return localStorage.getItem(SESSION_KEY) === "1";
  }

  function goTo(url) {
    window.location.href = url;
  }

  function buildCategoryOptions(selectedValue) {
    return store.CATEGORY_OPTIONS.map((item) => {
      const selected = selectedValue === item.value ? " selected" : "";
      return `<option value="${item.value}"${selected}>${item.label}</option>`;
    }).join("");
  }

  function escapeAttr(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  if (isLoginPage) {
    const form = byId("adminLoginForm");
    const loginInput = byId("adminLogin");
    const passwordInput = byId("adminPassword");
    const note = byId("adminLoginNote");

    if (hasSession()) {
      goTo("./admin.html");
      return;
    }

    if (form) {
      form.addEventListener("submit", (event) => {
        event.preventDefault();

        const login = (loginInput?.value || "").trim();
        const password = passwordInput?.value || "";

        if (login === ADMIN_LOGIN && password === ADMIN_PASSWORD) {
          setSession(true);
          if (note) {
            note.textContent = "Успешный вход. Переход в панель...";
          }
          setTimeout(() => goTo("./admin.html"), 250);
          return;
        }

        if (note) {
          note.textContent = "Неверный логин или пароль.";
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

  const feedback = byId("adminFeedback");
  const status = byId("adminStatus");
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
  const logoutBtn = byId("logoutBtn");
  const resetDataButton = byId("resetDataButton");
  const exportDataButton = byId("exportDataButton");
  const importDataInput = byId("importDataInput");

  let data = store.getData();

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
      <input type="text" data-field="catLabel" value="${escapeAttr(item.catLabel)}">
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

  function rebuildAll() {
    buildContentEditor();
    renderFaqList();
    renderProductList();
    updateStatus();
  }

  function findFaqById(id) {
    return data.faq.find((item) => item.id === id) || null;
  }

  function findProductById(id) {
    return data.products.find((item) => item.id === id) || null;
  }

  if (addCategory) {
    addCategory.innerHTML = buildCategoryOptions("display");
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      setSession(false);
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
      if (addCategory) {
        addCategory.value = "display";
      }
      persist("Товар добавлен.");
      renderProductList();
    });
  }

  if (productList) {
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

  rebuildAll();
})();
