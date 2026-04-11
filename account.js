(() => {
  "use strict";

  const store = window.XMobileStore;
  if (!store) {
    return;
  }

  const SESSION_KEY = store.USER_SESSION_KEY || "xmobile_user_session_v1";

  const REQUEST_STATUS_LABELS = {
    new: "Новая",
    in_progress: "В работе",
    postponed: "Отложена",
    done: "Обработана",
    rejected: "Отклонена"
  };

  const ORDER_STATUS_LABELS = {
    new: "Новый",
    in_progress: "В работе",
    postponed: "Отложен",
    ready: "Готов",
    done: "Завершен",
    rejected: "Отменен"
  };

  const RETURN_STATUS_LABELS = {
    new: "Новая",
    in_review: "На рассмотрении",
    approved: "Одобрена",
    done: "Завершена",
    rejected: "Отклонена"
  };

  const REQUEST_TYPE_LABELS = {
    repair: "Ремонт",
    parts_purchase: "Покупка деталей",
    return: "Возврат"
  };

  const state = {
    user: null,
    orders: [],
    requests: [],
    returns: [],
    authTab: "login",
    accountTab: "orders"
  };

  const byId = (id) => document.getElementById(id);

  const authBox = byId("accountAuth");
  const layoutBox = byId("accountLayout");
  const authNote = byId("authNote");
  const profileNote = byId("profileNote");

  const loginForm = byId("loginForm");
  const registerForm = byId("registerForm");
  const profileForm = byId("profileForm");
  const passwordForm = byId("passwordForm");
  const returnForm = byId("returnForm");

  const ordersList = byId("ordersList");
  const requestsList = byId("requestsList");
  const returnsList = byId("returnsList");

  const entityModal = byId("entityModal");
  const entityModalTitle = byId("entityModalTitle");
  const entityModalBody = byId("entityModalBody");

  function escapeHtml(value) {
    return String(value || "")
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

  function formatMoney(value) {
    const num = Number(value || 0);
    if (!Number.isFinite(num)) {
      return "0 ₽";
    }
    return `${new Intl.NumberFormat("ru-RU").format(Math.round(num))} ₽`;
  }

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
      return { token, expiresAt };
    } catch {
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

  function authHeader() {
    const session = readSession();
    if (!session?.token) {
      return "";
    }
    return `Bearer ${session.token}`;
  }

  async function parseBody(response) {
    const isJson = (response.headers.get("content-type") || "").includes("application/json");
    if (!isJson) {
      return {};
    }
    return response.json();
  }

  async function apiRequest(url, options = {}) {
    const method = options.method || "GET";
    const useAuth = options.auth !== false;
    const headers = {
      "Content-Type": "application/json"
    };
    if (useAuth) {
      const header = authHeader();
      if (header) {
        headers.Authorization = header;
      }
    }

    const response = await fetch(url, {
      method,
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined
    });
    const body = await parseBody(response);
    if (!response.ok) {
      const message = typeof body?.error === "string" ? body.error : "Ошибка запроса.";
      const error = new Error(message);
      error.status = response.status;
      throw error;
    }
    return body;
  }

  function setAuthNote(text, isError = false) {
    if (!authNote) {
      return;
    }
    authNote.textContent = text;
    authNote.classList.toggle("is-error", Boolean(isError));
  }

  function setProfileNote(text, isError = false) {
    if (!profileNote) {
      return;
    }
    profileNote.textContent = text;
    profileNote.classList.toggle("is-error", Boolean(isError));
  }

  function setAuthTab(tabName) {
    state.authTab = tabName === "register" ? "register" : "login";
    if (authBox) {
      authBox.classList.toggle("is-register", state.authTab === "register");
    }
    document.querySelectorAll("[data-auth-tab]").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.authTab === state.authTab);
      button.classList.toggle("mini-btn--dark", button.dataset.authTab === state.authTab);
    });
    document.querySelectorAll("[data-auth-side]").forEach((node) => {
      node.classList.toggle("is-hidden", node.dataset.authSide !== state.authTab);
    });
    if (loginForm) {
      loginForm.classList.toggle("is-hidden", state.authTab !== "login");
    }
    if (registerForm) {
      registerForm.classList.toggle("is-hidden", state.authTab !== "register");
    }
  }

  function setAccountTab(tabName) {
    state.accountTab = tabName;
    document.querySelectorAll(".account-tab[data-account-panel]").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.accountPanel === tabName);
    });
    document.querySelectorAll("[data-account-jump]").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.accountJump === tabName);
    });
    document.querySelectorAll(".account-panel[data-account-content]").forEach((panel) => {
      panel.classList.toggle("is-hidden", panel.dataset.accountContent !== tabName);
    });
  }

  function showAuth() {
    if (authBox) {
      authBox.classList.remove("is-hidden");
    }
    if (layoutBox) {
      layoutBox.classList.add("is-hidden");
    }
  }

  function showCabinet() {
    if (authBox) {
      authBox.classList.add("is-hidden");
    }
    if (layoutBox) {
      layoutBox.classList.remove("is-hidden");
    }
  }

  function statusClass(status) {
    const safe = String(status || "unknown");
    return `status-badge status-badge--${safe.replaceAll("_", "-")}`;
  }

  function requestTypeLabel(type) {
    return REQUEST_TYPE_LABELS[type] || type || "—";
  }

  function requestStatusLabel(status) {
    return REQUEST_STATUS_LABELS[status] || status || "—";
  }

  function orderStatusLabel(status) {
    return ORDER_STATUS_LABELS[status] || status || "—";
  }

  function returnStatusLabel(status) {
    return RETURN_STATUS_LABELS[status] || status || "—";
  }

  function filteredOrders() {
    const query = (byId("ordersSearch")?.value || "").trim().toLowerCase();
    const status = (byId("ordersStatusFilter")?.value || "").trim();
    return state.orders.filter((item) => {
      if (status && item.status !== status) {
        return false;
      }
      if (!query) {
        return true;
      }
      const haystack = `${item.id} ${item.status} ${item.city || ""} ${(item.items || []).map((entry) => entry.name).join(" ")}`.toLowerCase();
      return haystack.includes(query);
    });
  }

  function filteredRequests() {
    const query = (byId("requestsSearch")?.value || "").trim().toLowerCase();
    const type = (byId("requestsTypeFilter")?.value || "").trim();
    const status = (byId("requestsStatusFilter")?.value || "").trim();
    return state.requests.filter((item) => {
      if (type && item.type !== type) {
        return false;
      }
      if (status && item.status !== status) {
        return false;
      }
      if (!query) {
        return true;
      }
      const haystack = `${item.id} ${item.type} ${item.status} ${item.client?.fullName || ""} ${item.client?.phone || ""}`.toLowerCase();
      return haystack.includes(query);
    });
  }

  function renderOrders() {
    if (!ordersList) {
      return;
    }
    const list = filteredOrders();
    if (!list.length) {
      ordersList.innerHTML = `<div class="admin-empty">Заказов пока нет.</div>`;
      return;
    }
    ordersList.innerHTML = list
      .map(
        (item) => `<article class="account-item">
  <div class="account-item__head">
    <p class="account-item__id">${escapeHtml(item.id)}</p>
    <span class="${statusClass(item.status)}">${escapeHtml(orderStatusLabel(item.status))}</span>
  </div>
  <p><strong>Дата:</strong> ${escapeHtml(formatDateTime(item.createdAt))}</p>
  <p><strong>Сумма:</strong> ${escapeHtml(formatMoney(item.totalPrice))}</p>
  <p><strong>Город:</strong> ${escapeHtml(item.city || "—")}</p>
  <p><strong>Кратко:</strong> ${escapeHtml(item.shortItems || "—")}</p>
  <button class="mini-btn mini-btn--dark" type="button" data-open-entity="order" data-entity-id="${escapeHtml(item.id)}">Подробнее</button>
</article>`
      )
      .join("");
  }

  function renderRequests() {
    if (!requestsList) {
      return;
    }
    const list = filteredRequests();
    if (!list.length) {
      requestsList.innerHTML = `<div class="admin-empty">Заявок пока нет.</div>`;
      return;
    }
    requestsList.innerHTML = list
      .map(
        (item) => `<article class="account-item">
  <div class="account-item__head">
    <p class="account-item__id">${escapeHtml(item.id)}</p>
    <span class="${statusClass(item.status)}">${escapeHtml(requestStatusLabel(item.status))}</span>
  </div>
  <p><strong>Тип:</strong> ${escapeHtml(requestTypeLabel(item.type))}</p>
  <p><strong>Дата:</strong> ${escapeHtml(formatDateTime(item.createdAt))}</p>
  <p><strong>Комментарий менеджера:</strong> ${escapeHtml(item.managerComment || "—")}</p>
  <button class="mini-btn mini-btn--dark" type="button" data-open-entity="request" data-entity-id="${escapeHtml(item.id)}">Подробнее</button>
</article>`
      )
      .join("");
  }

  function renderReturns() {
    if (!returnsList) {
      return;
    }
    if (!state.returns.length) {
      returnsList.innerHTML = `<div class="admin-empty">Заявок на возврат пока нет.</div>`;
      return;
    }
    returnsList.innerHTML = state.returns
      .map(
        (item) => `<article class="account-item">
  <div class="account-item__head">
    <p class="account-item__id">${escapeHtml(item.id)}</p>
    <span class="${statusClass(item.status)}">${escapeHtml(returnStatusLabel(item.status))}</span>
  </div>
  <p><strong>Заказ:</strong> ${escapeHtml(item.orderId || "—")}</p>
  <p><strong>Причина:</strong> ${escapeHtml(item.reason || "—")}</p>
  <p><strong>Дата:</strong> ${escapeHtml(formatDateTime(item.createdAt))}</p>
  <button class="mini-btn mini-btn--dark" type="button" data-open-entity="return" data-entity-id="${escapeHtml(item.id)}">Подробнее</button>
</article>`
      )
      .join("");
  }

  function renderOrderSelect() {
    const select = byId("returnOrderId");
    if (!select) {
      return;
    }
    const options = state.orders.length
      ? state.orders.map((item) => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.id)} — ${escapeHtml(formatMoney(item.totalPrice))}</option>`)
      : [`<option value="">Нет доступных заказов</option>`];
    select.innerHTML = options.join("");
  }

  function renderTelegramStatus() {
    const status = byId("telegramStatusText");
    const unlinkButton = byId("unlinkTelegramButton");
    if (!status || !state.user) {
      return;
    }
    status.textContent = state.user.telegramLinked
      ? `Статус: привязан (${state.user.telegramUsername || "без username"})`
      : "Статус: не привязан";
    if (unlinkButton) {
      unlinkButton.disabled = !state.user.telegramLinked;
    }
  }

  function renderProfileForm() {
    if (!state.user) {
      return;
    }
    const fullName = byId("profileFullName");
    const email = byId("profileEmail");
    const phone = byId("profilePhone");
    const city = byId("profileCity");
    const tg = byId("profileTelegramUsername");
    if (fullName) {
      fullName.value = state.user.fullName || "";
    }
    if (email) {
      email.value = state.user.email || "";
    }
    if (phone) {
      phone.value = state.user.phone || "";
    }
    if (city) {
      city.value = state.user.city || "";
    }
    if (tg) {
      tg.value = state.user.telegramUsername || "";
    }
    renderTelegramStatus();
  }

  function renderOverview() {
    const ordersCountNode = byId("overviewOrdersCount");
    const ordersMetaNode = byId("overviewOrdersMeta");
    const requestsCountNode = byId("overviewRequestsCount");
    const requestsMetaNode = byId("overviewRequestsMeta");
    const returnsCountNode = byId("overviewReturnsCount");
    const returnsMetaNode = byId("overviewReturnsMeta");
    const telegramValueNode = byId("overviewTelegramValue");
    const telegramMetaNode = byId("overviewTelegramMeta");

    const ordersCount = state.orders.length;
    const totalSpent = state.orders.reduce((sum, item) => sum + (Number(item.totalPrice) || 0), 0);
    const activeRequests = state.requests.filter((item) => ["new", "in_progress", "postponed"].includes(item.status)).length;
    const openReturns = state.returns.filter((item) => ["new", "in_review"].includes(item.status)).length;
    const telegramLinked = Boolean(state.user?.telegramLinked);
    const telegramName = state.user?.telegramUsername || (state.user?.telegram?.username ? `@${state.user.telegram.username}` : "");

    if (ordersCountNode) {
      ordersCountNode.textContent = String(ordersCount);
    }
    if (ordersMetaNode) {
      ordersMetaNode.textContent = `На сумму ${formatMoney(totalSpent)}`;
    }
    if (requestsCountNode) {
      requestsCountNode.textContent = String(state.requests.length);
    }
    if (requestsMetaNode) {
      requestsMetaNode.textContent = `Активных: ${activeRequests}`;
    }
    if (returnsCountNode) {
      returnsCountNode.textContent = String(state.returns.length);
    }
    if (returnsMetaNode) {
      returnsMetaNode.textContent = `Открытых: ${openReturns}`;
    }
    if (telegramValueNode) {
      telegramValueNode.textContent = telegramLinked ? (telegramName || "Привязан") : "Не привязан";
    }
    if (telegramMetaNode) {
      telegramMetaNode.textContent = telegramLinked
        ? "Уведомления приходят в Telegram"
        : "Привяжите Telegram в настройках";
    }
  }

  function renderHistory(history, labelGetter) {
    const list = Array.isArray(history) ? history : [];
    if (!list.length) {
      return `<p>История статусов пока отсутствует.</p>`;
    }
    return `<ul class="history-list">${list
      .map((entry) => `<li>
  <p><strong>${escapeHtml(labelGetter(entry.toStatus || entry.status))}</strong> · ${escapeHtml(formatDateTime(entry.changedAt || entry.at))}</p>
  <p>Кто изменил: ${escapeHtml(entry.changedByName || entry.by || "—")} (${escapeHtml(entry.changedByRole || "—")})</p>
  <p>Город: ${escapeHtml(entry.city || "—")}</p>
  <p>Комментарий: ${escapeHtml(entry.comment || entry.note || "—")}</p>
</li>`)
      .join("")}</ul>`;
  }

  function openEntityModal(kind, id) {
    let title = "";
    let html = "";
    if (kind === "order") {
      const item = state.orders.find((entry) => entry.id === id);
      if (!item) {
        return;
      }
      title = `Заказ ${item.id}`;
      html = `
        <p><strong>Статус:</strong> ${escapeHtml(orderStatusLabel(item.status))}</p>
        <p><strong>Дата создания:</strong> ${escapeHtml(formatDateTime(item.createdAt))}</p>
        <p><strong>Сумма:</strong> ${escapeHtml(formatMoney(item.totalPrice))}</p>
        <p><strong>Город:</strong> ${escapeHtml(item.city || "—")}</p>
        <p><strong>Позиции:</strong></p>
        <ul>${(item.items || []).map((entry) => `<li>${escapeHtml(entry.name)} × ${escapeHtml(entry.qty)} (${escapeHtml(formatMoney(entry.unitPrice || 0))})</li>`).join("")}</ul>
        <h4>История статусов</h4>
        ${renderHistory(item.statusHistory, orderStatusLabel)}
      `;
    } else if (kind === "request") {
      const item = state.requests.find((entry) => entry.id === id);
      if (!item) {
        return;
      }
      title = `Заявка ${item.id}`;
      html = `
        <p><strong>Тип:</strong> ${escapeHtml(requestTypeLabel(item.type))}</p>
        <p><strong>Статус:</strong> ${escapeHtml(requestStatusLabel(item.status))}</p>
        <p><strong>Дата создания:</strong> ${escapeHtml(formatDateTime(item.createdAt))}</p>
        <p><strong>Комментарий менеджера:</strong> ${escapeHtml(item.managerComment || "—")}</p>
        <p><strong>Филиал:</strong> ${escapeHtml(item.client?.branch || "—")}</p>
        <p><strong>Комментарий клиента:</strong> ${escapeHtml(item.client?.comment || "—")}</p>
        <h4>История статусов</h4>
        ${renderHistory(item.statusHistory, requestStatusLabel)}
      `;
    } else if (kind === "return") {
      const item = state.returns.find((entry) => entry.id === id);
      if (!item) {
        return;
      }
      title = `Возврат ${item.id}`;
      html = `
        <p><strong>Статус:</strong> ${escapeHtml(returnStatusLabel(item.status))}</p>
        <p><strong>Заказ:</strong> ${escapeHtml(item.orderId || "—")}</p>
        <p><strong>Причина:</strong> ${escapeHtml(item.reason || "—")}</p>
        <p><strong>Описание:</strong> ${escapeHtml(item.description || "—")}</p>
        <p><strong>Дата создания:</strong> ${escapeHtml(formatDateTime(item.createdAt))}</p>
        <h4>История статусов</h4>
        ${renderHistory(item.statusHistory, returnStatusLabel)}
      `;
    } else {
      return;
    }

    if (entityModalTitle) {
      entityModalTitle.textContent = title;
    }
    if (entityModalBody) {
      entityModalBody.innerHTML = html;
    }
    if (entityModal) {
      entityModal.classList.remove("is-hidden");
    }
  }

  function closeEntityModal() {
    if (entityModal) {
      entityModal.classList.add("is-hidden");
    }
  }

  function renderAll() {
    renderOverview();
    renderOrders();
    renderRequests();
    renderReturns();
    renderOrderSelect();
    renderProfileForm();
  }

  async function loadCabinetData() {
    const [sessionBody, ordersBody, requestsBody, returnsBody] = await Promise.all([
      apiRequest("./api/auth/session"),
      apiRequest("./api/me/orders"),
      apiRequest("./api/me/requests"),
      apiRequest("./api/me/returns")
    ]);
    state.user = sessionBody.user || null;
    state.orders = Array.isArray(ordersBody.orders) ? ordersBody.orders : [];
    state.requests = Array.isArray(requestsBody.requests) ? requestsBody.requests : [];
    state.returns = Array.isArray(returnsBody.returns) ? returnsBody.returns : [];
    renderAll();
  }

  async function bootstrapSession() {
    const session = readSession();
    if (!session) {
      showAuth();
      return;
    }
    try {
      await loadCabinetData();
      showCabinet();
      setProfileNote("Данные личного кабинета обновлены.");
    } catch (error) {
      writeSession(null);
      state.user = null;
      showAuth();
      setAuthNote(error instanceof Error ? error.message : "Сессия устарела. Войдите снова.", true);
    }
  }

  function readFilesAsDataUrls(files) {
    const list = Array.from(files || []).slice(0, 3);
    return Promise.all(
      list.map(
        (file) =>
          new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              resolve({
                name: file.name,
                type: file.type,
                size: file.size,
                dataUrl: typeof reader.result === "string" ? reader.result : ""
              });
            };
            reader.onerror = () => reject(new Error("Не удалось прочитать файл."));
            reader.readAsDataURL(file);
          })
      )
    );
  }

  async function onLoginSubmit(event) {
    event.preventDefault();
    const login = (byId("loginValue")?.value || "").trim();
    const password = byId("loginPassword")?.value || "";
    try {
      const body = await apiRequest("./api/auth/login", {
        method: "POST",
        auth: false,
        body: { login, password }
      });
      writeSession(body.session);
      await loadCabinetData();
      showCabinet();
      setAuthNote("Вход выполнен успешно.");
    } catch (error) {
      setAuthNote(error instanceof Error ? error.message : "Не удалось войти.", true);
    }
  }

  async function onRegisterSubmit(event) {
    event.preventDefault();
    const fullName = (byId("registerName")?.value || "").trim();
    const email = (byId("registerEmail")?.value || "").trim();
    const phone = (byId("registerPhone")?.value || "").trim();
    const password = byId("registerPassword")?.value || "";
    if (password.length < 8 || !/[a-zA-Zа-яА-Я]/.test(password) || !/\d/.test(password)) {
      setAuthNote("Пароль должен содержать минимум 8 символов, включая буквы и цифры.", true);
      return;
    }
    if (!byId("registerAgree")?.checked) {
      setAuthNote("Примите Политику конфиденциальности, чтобы создать аккаунт.", true);
      return;
    }
    try {
      const body = await apiRequest("./api/auth/register", {
        method: "POST",
        auth: false,
        body: { fullName, email, phone, password }
      });
      writeSession(body.session);
      await loadCabinetData();
      showCabinet();
      setAuthNote("Аккаунт создан и авторизован.");
    } catch (error) {
      setAuthNote(error instanceof Error ? error.message : "Не удалось зарегистрироваться.", true);
    }
  }

  async function onLogout() {
    try {
      await apiRequest("./api/auth/logout", { method: "POST" });
    } catch {
      // ignore
    }
    writeSession(null);
    state.user = null;
    showAuth();
    setAuthTab("login");
    setAuthNote("Вы вышли из аккаунта.");
  }

  async function onProfileSubmit(event) {
    event.preventDefault();
    const payload = {
      fullName: (byId("profileFullName")?.value || "").trim(),
      email: (byId("profileEmail")?.value || "").trim(),
      phone: (byId("profilePhone")?.value || "").trim(),
      city: (byId("profileCity")?.value || "").trim(),
      telegramUsername: (byId("profileTelegramUsername")?.value || "").trim()
    };
    try {
      const body = await apiRequest("./api/me/profile", {
        method: "PATCH",
        body: payload
      });
      state.user = body.user || state.user;
      renderProfileForm();
      setProfileNote("Профиль обновлен.");
    } catch (error) {
      setProfileNote(error instanceof Error ? error.message : "Не удалось обновить профиль.", true);
    }
  }

  async function onPasswordSubmit(event) {
    event.preventDefault();
    const currentPassword = byId("currentPassword")?.value || "";
    const newPassword = byId("newPassword")?.value || "";
    if (newPassword.length < 8 || !/[a-zA-Zа-яА-Я]/.test(newPassword) || !/\d/.test(newPassword)) {
      setProfileNote("Пароль должен содержать минимум 8 символов, включая буквы и цифры.", true);
      return;
    }
    try {
      await apiRequest("./api/me/change-password", {
        method: "POST",
        body: { currentPassword, newPassword }
      });
      if (passwordForm) {
        passwordForm.reset();
      }
      setProfileNote("Пароль успешно изменен.");
    } catch (error) {
      setProfileNote(error instanceof Error ? error.message : "Не удалось изменить пароль.", true);
    }
  }

  async function onGenerateTelegramCode() {
    try {
      const body = await apiRequest("./api/me/telegram/link-code", {
        method: "POST",
        body: {}
      });
      const box = byId("telegramLinkBox");
      const codeNode = byId("telegramBindCode");
      const linkNode = byId("telegramBindLink");
      if (codeNode) {
        codeNode.textContent = body?.link?.code || "";
      }
      if (linkNode) {
        linkNode.href = body?.link?.deepLink || "#";
        linkNode.textContent = body?.link?.deepLink || "Скопируйте код и отправьте боту /start link_КОД";
      }
      if (box) {
        box.classList.remove("is-hidden");
      }
      setProfileNote("Код привязки Telegram создан.");
    } catch (error) {
      setProfileNote(error instanceof Error ? error.message : "Не удалось сгенерировать код привязки.", true);
    }
  }

  async function onUnlinkTelegram() {
    try {
      await apiRequest("./api/me/telegram/unlink", {
        method: "POST",
        body: {}
      });
      await loadCabinetData();
      setProfileNote("Telegram отвязан от аккаунта.");
    } catch (error) {
      setProfileNote(error instanceof Error ? error.message : "Не удалось отвязать Telegram.", true);
    }
  }

  async function onReturnSubmit(event) {
    event.preventDefault();
    const orderId = (byId("returnOrderId")?.value || "").trim();
    const reason = (byId("returnReason")?.value || "").trim();
    const description = (byId("returnDescription")?.value || "").trim();
    const filesInput = byId("returnFiles");
    const note = byId("returnNote");

    try {
      const attachments = await readFilesAsDataUrls(filesInput?.files || []);
      await apiRequest("./api/me/returns", {
        method: "POST",
        body: {
          orderId,
          reason,
          description,
          attachments
        }
      });
      if (returnForm) {
        returnForm.reset();
      }
      await loadCabinetData();
      if (note) {
        note.textContent = "Заявка на возврат отправлена.";
      }
      setAccountTab("returns");
    } catch (error) {
      if (note) {
        note.textContent = error instanceof Error ? error.message : "Не удалось отправить заявку на возврат.";
      }
    }
  }

  function bindEvents() {
    document.querySelectorAll("[data-auth-tab]").forEach((button) => {
      button.addEventListener("click", () => {
        setAuthTab(button.dataset.authTab || "login");
      });
    });

    document.querySelectorAll(".account-tab[data-account-panel]").forEach((button) => {
      button.addEventListener("click", () => setAccountTab(button.dataset.accountPanel || "orders"));
    });

    document.querySelectorAll("[data-account-jump]").forEach((button) => {
      button.addEventListener("click", () => setAccountTab(button.dataset.accountJump || "orders"));
    });

    if (loginForm) {
      loginForm.addEventListener("submit", onLoginSubmit);
    }
    if (registerForm) {
      registerForm.addEventListener("submit", onRegisterSubmit);
    }

    const logoutButton = byId("logoutButton");
    if (logoutButton) {
      logoutButton.addEventListener("click", onLogout);
    }

    if (profileForm) {
      profileForm.addEventListener("submit", onProfileSubmit);
    }
    if (passwordForm) {
      passwordForm.addEventListener("submit", onPasswordSubmit);
    }

    const generateTelegramLinkButton = byId("generateTelegramLinkButton");
    if (generateTelegramLinkButton) {
      generateTelegramLinkButton.addEventListener("click", onGenerateTelegramCode);
    }

    const unlinkTelegramButton = byId("unlinkTelegramButton");
    if (unlinkTelegramButton) {
      unlinkTelegramButton.addEventListener("click", onUnlinkTelegram);
    }

    if (returnForm) {
      returnForm.addEventListener("submit", onReturnSubmit);
    }

    const toggleReturnFormButton = byId("toggleReturnFormButton");
    if (toggleReturnFormButton && returnForm) {
      toggleReturnFormButton.addEventListener("click", () => {
        returnForm.classList.toggle("is-hidden");
      });
    }

    [byId("ordersSearch"), byId("ordersStatusFilter")].forEach((control) => {
      if (control) {
        control.addEventListener(control.tagName === "SELECT" ? "change" : "input", renderOrders);
      }
    });

    [byId("requestsSearch"), byId("requestsTypeFilter"), byId("requestsStatusFilter")].forEach((control) => {
      if (control) {
        control.addEventListener(control.tagName === "SELECT" ? "change" : "input", renderRequests);
      }
    });

    document.addEventListener("click", (event) => {
      const openButton = event.target.closest("[data-open-entity]");
      if (openButton) {
        openEntityModal(openButton.dataset.openEntity, openButton.dataset.entityId);
      }

      const closeButton = event.target.closest("[data-modal-close]");
      if (closeButton) {
        closeEntityModal();
      }
    });
  }

  bindEvents();
  setAuthTab("login");
  setAccountTab("orders");
  bootstrapSession();
  if (typeof window.XMobileStore?.initEyeToggles === "function") {
    window.XMobileStore.initEyeToggles();
  }
})();
