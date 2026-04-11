(() => {
  "use strict";

  const store = window.XMobileStore;
  if (!store) {
    return;
  }

  const path = (window.location.pathname || "").toLowerCase();
  const isAdminPage = path.endsWith("/admin.html") || path.endsWith("\\admin.html") || path.endsWith("admin.html");
  if (!isAdminPage) {
    return;
  }

  const SESSION_KEY = store.ADMIN_SESSION_KEY;

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

  const byId = (id) => document.getElementById(id);

  const usersList = byId("adminUsersList");
  const usersSearch = byId("adminUsersSearch");
  const usersTelegramFilter = byId("adminUsersTelegramFilter");
  const usersRefresh = byId("adminUsersRefresh");

  const ordersList = byId("adminOrdersList");
  const ordersSearch = byId("adminOrdersSearch");
  const ordersStatusFilter = byId("adminOrdersStatusFilter");
  const ordersRefresh = byId("adminOrdersRefresh");

  const returnsList = byId("adminReturnsList");
  const returnsSearch = byId("adminReturnsSearch");
  const returnsStatusFilter = byId("adminReturnsStatusFilter");
  const returnsRefresh = byId("adminReturnsRefresh");

  if (!usersList || !ordersList || !returnsList) {
    return;
  }

  const state = {
    adminRole: "manager",
    users: [],
    orders: [],
    returns: []
  };

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function formatDate(value) {
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

  function statusClass(status) {
    const safe = String(status || "unknown");
    return `status-badge status-badge--${safe.replaceAll("_", "-")}`;
  }

  function readAdminSession() {
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
        role: parsed.role === "admin" ? "admin" : "manager",
        expiresAt
      };
    } catch {
      return null;
    }
  }

  function adminAuthHeader() {
    const session = readAdminSession();
    if (!session?.token) {
      return "";
    }
    state.adminRole = session.role;
    return `Bearer ${session.token}`;
  }

  function isStatusAllowedForRole(entityType, status) {
    if (state.adminRole === "admin") {
      return true;
    }
    if (entityType === "order") {
      return !["done", "rejected"].includes(status);
    }
    if (entityType === "return") {
      return !["approved", "done", "rejected"].includes(status);
    }
    return true;
  }

  async function parseBody(response) {
    const isJson = (response.headers.get("content-type") || "").includes("application/json");
    if (!isJson) {
      return {};
    }
    return response.json();
  }

  async function apiRequest(url, options = {}) {
    const header = adminAuthHeader();
    if (!header) {
      throw new Error("Сессия администратора истекла. Обновите страницу и войдите снова.");
    }

    const response = await fetch(url, {
      method: options.method || "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: header
      },
      body: options.body ? JSON.stringify(options.body) : undefined
    });
    const body = await parseBody(response);
    if (!response.ok) {
      throw new Error(typeof body?.error === "string" ? body.error : "Ошибка запроса.");
    }
    return body;
  }

  function telegramLink(link) {
    if (!link) {
      return `<span class="admin-user-link-empty">Telegram не указан</span>`;
    }
    return `<a class="mini-btn mini-btn--dark" href="${escapeHtml(link)}" target="_blank" rel="noreferrer">Написать в Telegram</a>`;
  }

  function userCard(user) {
    const rawTelegram = String(user.telegramUsername || "").trim();
    const telegramUsername = rawTelegram ? (rawTelegram.startsWith("@") ? rawTelegram : `@${rawTelegram}`) : "—";
    const hasTelegram = Boolean(user.telegramDirectLink || rawTelegram);
    const ordersCount = Number(user.stats?.ordersCount || 0);
    const purchasesCount = Number(user.stats?.purchasesCount || 0);
    const requestsCount = Number(user.stats?.requestsCount || 0);
    const returnsCount = Number(user.stats?.returnsCount || 0);

    return `<article class="admin-item admin-user-card" data-user-id="${escapeHtml(user.id)}">
  <div class="admin-user-card__head">
    <div class="admin-user-card__meta">
      <p class="admin-user-card__id">${escapeHtml(user.id)}</p>
      <h3 class="admin-user-card__name">${escapeHtml(user.fullName || "Без имени")}</h3>
    </div>
    <span class="admin-user-pill ${hasTelegram ? "is-linked" : "is-unlinked"}">${hasTelegram ? "Telegram привязан" : "Telegram не привязан"}</span>
  </div>

  <div class="admin-user-grid">
    <div class="admin-user-tile">
      <p class="admin-user-tile__label">Email</p>
      <p class="admin-user-tile__value">${escapeHtml(user.email || "—")}</p>
    </div>
    <div class="admin-user-tile">
      <p class="admin-user-tile__label">Телефон</p>
      <p class="admin-user-tile__value">${escapeHtml(user.phone || "—")}</p>
    </div>
    <div class="admin-user-tile">
      <p class="admin-user-tile__label">Telegram</p>
      <p class="admin-user-tile__value">${escapeHtml(telegramUsername)}</p>
    </div>

    <div class="admin-user-tile">
      <p class="admin-user-tile__label">Регистрация</p>
      <p class="admin-user-tile__value">${escapeHtml(formatDate(user.createdAt))}</p>
    </div>
    <div class="admin-user-tile">
      <p class="admin-user-tile__label">Последняя активность</p>
      <p class="admin-user-tile__value">${escapeHtml(formatDate(user.lastActivityAt))}</p>
    </div>
    <div class="admin-user-tile">
      <p class="admin-user-tile__label">Заказы / покупки</p>
      <p class="admin-user-tile__value">${escapeHtml(ordersCount)} / ${escapeHtml(purchasesCount)}</p>
    </div>

    <div class="admin-user-tile">
      <p class="admin-user-tile__label">Заявки</p>
      <p class="admin-user-tile__value">${escapeHtml(requestsCount)}</p>
    </div>
    <div class="admin-user-tile">
      <p class="admin-user-tile__label">Возвраты</p>
      <p class="admin-user-tile__value">${escapeHtml(returnsCount)}</p>
    </div>
    <div class="admin-user-tile">
      <p class="admin-user-tile__label">Сумма покупок</p>
      <p class="admin-user-tile__value">${escapeHtml(formatMoney(user.stats?.totalSpent || 0))}</p>
    </div>
  </div>

  <div class="admin-item-actions admin-item-actions--wrap">
    ${telegramLink(user.telegramDirectLink)}
    <button class="mini-btn" type="button" data-action="user-details">Открыть историю</button>
    <button class="mini-btn mini-btn--orange" type="button" data-action="user-edit">Редактировать</button>
  </div>
  <div class="admin-user-edit is-hidden">
    <form class="admin-user-edit-form" data-user-edit-form>
      <label class="admin-user-edit-label">
        Телефон
        <input class="admin-user-edit-input" type="tel" name="phone" placeholder="${escapeHtml(user.phone || "")}" value="">
      </label>
      <label class="admin-user-edit-label">
        Email
        <input class="admin-user-edit-input" type="email" name="email" placeholder="${escapeHtml(user.email || "")}" value="">
      </label>
      <label class="admin-user-edit-label">
        Новый пароль
        <div class="field-pw-wrap">
          <input class="admin-user-edit-input" type="password" name="password" placeholder="Оставьте пустым, если не менять" value="">
          <button type="button" class="field-eye-btn" aria-label="Показать пароль">
            <svg class="eye-on" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            <svg class="eye-off" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
          </button>
        </div>
      </label>
      <div class="admin-user-edit-actions">
        <button class="mini-btn mini-btn--orange" type="submit">Сохранить</button>
        <button class="mini-btn" type="button" data-action="user-edit-cancel">Отмена</button>
        <span class="admin-user-edit-msg"></span>
      </div>
    </form>
  </div>
  <div class="admin-user-details is-hidden"></div>
</article>`;
  }

  function orderStatusOptions(current) {
    return Object.entries(ORDER_STATUS_LABELS)
      .filter(([value]) => value === current || isStatusAllowedForRole("order", value))
      .map(([value, label]) => `<option value="${escapeHtml(value)}"${value === current ? " selected" : ""}>${escapeHtml(label)}</option>`)
      .join("");
  }

  function returnStatusOptions(current) {
    return Object.entries(RETURN_STATUS_LABELS)
      .filter(([value]) => value === current || isStatusAllowedForRole("return", value))
      .map(([value, label]) => `<option value="${escapeHtml(value)}"${value === current ? " selected" : ""}>${escapeHtml(label)}</option>`)
      .join("");
  }

  function renderUsers() {
    if (!state.users.length) {
      usersList.innerHTML = `<div class="admin-empty">Пользователи не найдены.</div>`;
      return;
    }
    usersList.innerHTML = state.users.map(userCard).join("");
  }

  function renderOrders() {
    if (!state.orders.length) {
      ordersList.innerHTML = `<div class="admin-empty">Заказы не найдены.</div>`;
      return;
    }
    ordersList.innerHTML = state.orders
      .map((item) => {
        const modeRaw = String(item?.delivery?.mode || "").trim().toLowerCase();
        const isOtherCityDelivery = Boolean(item?.isOtherCityDelivery) || modeRaw === "other_city";
        const deliveryLabel = isOtherCityDelivery ? "В другой город" : "Самовывоз / по городу";
        const recipientCity = isOtherCityDelivery
          ? String(item?.recipientCity || item?.delivery?.city || "").trim() || "—"
          : "—";
        const clientEmail = String(item?.clientEmail || item?.user?.email || "").trim() || "—";

        return `<article class="admin-item admin-order-card" data-order-id="${escapeHtml(item.id)}">
  <div class="admin-order-card__head">
    <div class="admin-order-card__meta">
      <p class="admin-order-card__id">${escapeHtml(item.id)}</p>
      <h3 class="admin-order-card__name">${escapeHtml(item.user?.fullName || "Клиент не указан")}</h3>
    </div>
    <span class="${statusClass(item.status)}">${escapeHtml(ORDER_STATUS_LABELS[item.status] || item.status || "—")}</span>
  </div>

  <div class="admin-order-grid">
    <div class="admin-order-tile">
      <p class="admin-order-tile__label">Клиент</p>
      <p class="admin-order-tile__value">${escapeHtml(item.user?.fullName || "—")}</p>
    </div>
    <div class="admin-order-tile">
      <p class="admin-order-tile__label">Телефон</p>
      <p class="admin-order-tile__value">${escapeHtml(item.user?.phone || "—")}</p>
    </div>
    <div class="admin-order-tile">
      <p class="admin-order-tile__label">Email</p>
      <p class="admin-order-tile__value">${escapeHtml(clientEmail)}</p>
    </div>

    <div class="admin-order-tile">
      <p class="admin-order-tile__label">Город</p>
      <p class="admin-order-tile__value">${escapeHtml(item.city || "—")}</p>
    </div>
    <div class="admin-order-tile">
      <p class="admin-order-tile__label">Доставка</p>
      <p class="admin-order-tile__value">${escapeHtml(deliveryLabel)}</p>
    </div>
    <div class="admin-order-tile">
      <p class="admin-order-tile__label">Город получателя</p>
      <p class="admin-order-tile__value">${escapeHtml(recipientCity)}</p>
    </div>

    <div class="admin-order-tile">
      <p class="admin-order-tile__label">Сумма</p>
      <p class="admin-order-tile__value">${escapeHtml(formatMoney(item.totalPrice))}</p>
    </div>
    <div class="admin-order-tile">
      <p class="admin-order-tile__label">Дата</p>
      <p class="admin-order-tile__value">${escapeHtml(formatDate(item.createdAt))}</p>
    </div>
    <div class="admin-order-tile admin-order-tile--full">
      <p class="admin-order-tile__label">Позиции</p>
      <p class="admin-order-tile__value">${escapeHtml(item.shortItems || "—")}</p>
    </div>
  </div>

  <div class="admin-order-controls">
    <label class="admin-order-control">
      <span>Новый статус</span>
      <select data-field="status">${orderStatusOptions(item.status)}</select>
    </label>
    <label class="admin-order-control admin-order-control--wide">
      <span>Комментарий к изменению</span>
      <input data-field="comment" type="text" placeholder="Комментарий к смене статуса">
    </label>
  </div>

  <div class="admin-item-actions admin-item-actions--wrap">
    ${telegramLink(item.telegramDirectLink)}
    <button class="mini-btn mini-btn--dark" type="button" data-action="save-order-status">Обновить статус</button>
  </div>
</article>`;
      })
      .join("");
  }

  function renderReturns() {
    if (!state.returns.length) {
      returnsList.innerHTML = `<div class="admin-empty">Возвраты не найдены.</div>`;
      return;
    }
    returnsList.innerHTML = state.returns
      .map((item) => `<article class="admin-item" data-return-id="${escapeHtml(item.id)}">
  <div class="admin-item-grid admin-item-grid--product">
    <label>ID<input type="text" value="${escapeHtml(item.id)}" readonly></label>
    <label>Заказ<input type="text" value="${escapeHtml(item.orderId || "—")}" readonly></label>
    <label>Клиент<input type="text" value="${escapeHtml(item.user?.fullName || "—")}" readonly></label>
    <label>Телефон<input type="text" value="${escapeHtml(item.user?.phone || "—")}" readonly></label>
    <label>Статус
      <select data-field="status">${returnStatusOptions(item.status)}</select>
    </label>
    <label>Причина<input type="text" value="${escapeHtml(item.reason || "—")}" readonly></label>
    <label>Дата<input type="text" value="${escapeHtml(formatDate(item.createdAt))}" readonly></label>
    <label>Комментарий
      <input data-field="comment" type="text" placeholder="Комментарий к смене статуса">
    </label>
  </div>
  <div class="admin-item-actions admin-item-actions--wrap">
    ${telegramLink(item.telegramDirectLink)}
    <button class="mini-btn mini-btn--dark" type="button" data-action="save-return-status">Обновить статус</button>
  </div>
</article>`)
      .join("");
  }

  function showUserDetails(container, user) {
    const requests = Array.isArray(user.requests) ? user.requests : [];
    const orders = Array.isArray(user.orders) ? user.orders : [];
    const returns = Array.isArray(user.returns) ? user.returns : [];

    const renderHistory = (history) => {
      const list = Array.isArray(history) ? history : [];
      if (!list.length) {
        return `<p class="admin-empty">История отсутствует.</p>`;
      }
      return `<ul class="history-list">${list
        .map((entry) => `<li><p><strong>${escapeHtml(entry.toStatus || entry.status || "—")}</strong> · ${escapeHtml(formatDate(entry.changedAt || entry.at))}</p><p>${escapeHtml(entry.comment || entry.note || "—")}</p></li>`)
        .join("")}</ul>`;
    };

    container.innerHTML = `
      <div class="admin-user-history">
        <h4>История заказов (${orders.length})</h4>
        ${orders
          .map((item) => `<div class="request-history"><p><strong>${escapeHtml(item.id)}</strong> · ${escapeHtml(formatMoney(item.totalPrice))} · <span class="${statusClass(item.status)}">${escapeHtml(ORDER_STATUS_LABELS[item.status] || item.status)}</span></p>${renderHistory(item.statusHistory)}</div>`)
          .join("") || `<p class="admin-empty">Заказы отсутствуют.</p>`}
        <h4>История заявок (${requests.length})</h4>
        ${requests
          .map((item) => `<div class="request-history"><p><strong>${escapeHtml(item.id)}</strong> · ${escapeHtml(REQUEST_TYPE_LABELS[item.type] || item.type)} · <span class="${statusClass(item.status)}">${escapeHtml(item.statusLabel || item.status)}</span></p>${renderHistory(item.statusHistory)}</div>`)
          .join("") || `<p class="admin-empty">Заявки отсутствуют.</p>`}
        <h4>История возвратов (${returns.length})</h4>
        ${returns
          .map((item) => `<div class="request-history"><p><strong>${escapeHtml(item.id)}</strong> · ${escapeHtml(item.reason || "—")} · <span class="${statusClass(item.status)}">${escapeHtml(item.statusLabel || item.status)}</span></p>${renderHistory(item.statusHistory)}</div>`)
          .join("") || `<p class="admin-empty">Возвраты отсутствуют.</p>`}
      </div>
    `;
  }

  async function loadUsers() {
    usersList.innerHTML = `<div class="admin-empty">Загрузка пользователей...</div>`;
    const query = new URLSearchParams();
    if ((usersSearch?.value || "").trim()) {
      query.set("q", usersSearch.value.trim());
    }
    if ((usersTelegramFilter?.value || "").trim()) {
      query.set("telegram", usersTelegramFilter.value.trim());
    }
    const body = await apiRequest(`./api/admin/users?${query.toString()}`);
    state.users = Array.isArray(body.users) ? body.users : [];
    renderUsers();
  }

  async function loadOrders() {
    ordersList.innerHTML = `<div class="admin-empty">Загрузка заказов...</div>`;
    const query = new URLSearchParams();
    if ((ordersSearch?.value || "").trim()) {
      query.set("q", ordersSearch.value.trim());
    }
    if ((ordersStatusFilter?.value || "").trim()) {
      query.set("status", ordersStatusFilter.value.trim());
    }
    const body = await apiRequest(`./api/admin/orders?${query.toString()}`);
    state.orders = Array.isArray(body.orders) ? body.orders : [];
    renderOrders();
  }

  async function loadReturns() {
    returnsList.innerHTML = `<div class="admin-empty">Загрузка возвратов...</div>`;
    const query = new URLSearchParams();
    if ((returnsSearch?.value || "").trim()) {
      query.set("q", returnsSearch.value.trim());
    }
    if ((returnsStatusFilter?.value || "").trim()) {
      query.set("status", returnsStatusFilter.value.trim());
    }
    const body = await apiRequest(`./api/admin/returns?${query.toString()}`);
    state.returns = Array.isArray(body.returns) ? body.returns : [];
    renderReturns();
  }

  async function bootstrap() {
    try {
      await Promise.all([loadUsers(), loadOrders(), loadReturns()]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Не удалось загрузить расширенные разделы.";
      usersList.innerHTML = `<div class="admin-empty">${escapeHtml(message)}</div>`;
      ordersList.innerHTML = `<div class="admin-empty">${escapeHtml(message)}</div>`;
      returnsList.innerHTML = `<div class="admin-empty">${escapeHtml(message)}</div>`;
    }
  }

  if (usersRefresh) {
    usersRefresh.addEventListener("click", () => loadUsers().catch(() => null));
  }
  if (ordersRefresh) {
    ordersRefresh.addEventListener("click", () => loadOrders().catch(() => null));
  }
  if (returnsRefresh) {
    returnsRefresh.addEventListener("click", () => loadReturns().catch(() => null));
  }

  [usersSearch, usersTelegramFilter].forEach((node) => {
    if (!node) {
      return;
    }
    const eventName = node.tagName === "SELECT" ? "change" : "input";
    node.addEventListener(eventName, () => loadUsers().catch(() => null));
  });

  [ordersSearch, ordersStatusFilter].forEach((node) => {
    if (!node) {
      return;
    }
    const eventName = node.tagName === "SELECT" ? "change" : "input";
    node.addEventListener(eventName, () => loadOrders().catch(() => null));
  });

  [returnsSearch, returnsStatusFilter].forEach((node) => {
    if (!node) {
      return;
    }
    const eventName = node.tagName === "SELECT" ? "change" : "input";
    node.addEventListener(eventName, () => loadReturns().catch(() => null));
  });

  usersList.addEventListener("click", async (event) => {
    // toggle history
    const detailsBtn = event.target.closest("button[data-action='user-details']");
    if (detailsBtn) {
      const card = detailsBtn.closest("[data-user-id]");
      if (!card) return;
      const id = card.dataset.userId;
      const detailsBox = card.querySelector(".admin-user-details");
      if (!detailsBox) return;
      if (!detailsBox.classList.contains("is-hidden")) {
        detailsBox.classList.add("is-hidden");
        detailsBox.innerHTML = "";
        detailsBtn.textContent = "Открыть историю";
        return;
      }
      detailsBox.classList.remove("is-hidden");
      detailsBox.innerHTML = `<div class="admin-empty">Загрузка истории пользователя...</div>`;
      try {
        const body = await apiRequest(`./api/admin/users/${encodeURIComponent(id)}`);
        showUserDetails(detailsBox, body.user || {});
        detailsBtn.textContent = "Скрыть историю";
      } catch (error) {
        detailsBox.innerHTML = `<div class="admin-empty">${escapeHtml(error instanceof Error ? error.message : "Не удалось загрузить карточку пользователя.")}</div>`;
      }
      return;
    }

    // open edit form
    const editBtn = event.target.closest("button[data-action='user-edit']");
    if (editBtn) {
      const card = editBtn.closest("[data-user-id]");
      if (!card) return;
      const editBox = card.querySelector(".admin-user-edit");
      if (!editBox) return;
      const isOpen = !editBox.classList.contains("is-hidden");
      editBox.classList.toggle("is-hidden", isOpen);
      editBtn.textContent = isOpen ? "Редактировать" : "Закрыть";
      return;
    }

    // cancel edit
    const cancelBtn = event.target.closest("button[data-action='user-edit-cancel']");
    if (cancelBtn) {
      const card = cancelBtn.closest("[data-user-id]");
      if (!card) return;
      const editBox = card.querySelector(".admin-user-edit");
      if (editBox) editBox.classList.add("is-hidden");
      const openBtn = card.querySelector("button[data-action='user-edit']");
      if (openBtn) openBtn.textContent = "Редактировать";
    }
  });

  usersList.addEventListener("click", (event) => {
    const eyeBtn = event.target.closest(".field-eye-btn");
    if (!eyeBtn) return;
    const wrap = eyeBtn.closest(".field-pw-wrap");
    if (!wrap) return;
    const input = wrap.querySelector("input");
    if (!input) return;
    const isPassword = input.type === "password";
    input.type = isPassword ? "text" : "password";
    eyeBtn.classList.toggle("is-visible", isPassword);
    eyeBtn.setAttribute("aria-label", isPassword ? "Скрыть пароль" : "Показать пароль");
  });

  usersList.addEventListener("submit", async (event) => {
    const form = event.target.closest("[data-user-edit-form]");
    if (!form) return;
    event.preventDefault();
    const card = form.closest("[data-user-id]");
    if (!card) return;
    const id = card.dataset.userId;
    const msg = form.querySelector(".admin-user-edit-msg");
    const submitBtn = form.querySelector("[type='submit']");

    const phone = form.querySelector("[name='phone']").value.trim();
    const email = form.querySelector("[name='email']").value.trim();
    const password = form.querySelector("[name='password']").value;

    if (!phone && !email && !password) {
      if (msg) { msg.textContent = "Заполните хотя бы одно поле."; msg.style.color = "var(--orange)"; }
      return;
    }

    const payload = {};
    if (phone) payload.phone = phone;
    if (email) payload.email = email;
    if (password) payload.password = password;

    submitBtn.disabled = true;
    if (msg) { msg.textContent = ""; }
    try {
      await apiRequest(`./api/admin/users/${encodeURIComponent(id)}`, { method: "PATCH", body: payload });
      if (msg) { msg.textContent = "Сохранено"; msg.style.color = "#22c55e"; }
      form.querySelector("[name='phone']").value = "";
      form.querySelector("[name='email']").value = "";
      form.querySelector("[name='password']").value = "";
      await loadUsers();
    } catch (error) {
      if (msg) { msg.textContent = error instanceof Error ? error.message : "Ошибка сохранения."; msg.style.color = "var(--orange)"; }
    } finally {
      submitBtn.disabled = false;
    }
  });

  ordersList.addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-action='save-order-status']");
    if (!button) {
      return;
    }
    const card = button.closest("[data-order-id]");
    if (!card) {
      return;
    }
    const id = card.dataset.orderId;
    const status = card.querySelector('[data-field="status"]')?.value || "";
    const comment = (card.querySelector('[data-field="comment"]')?.value || "").trim();
    if (!isStatusAllowedForRole("order", status)) {
      window.alert("Для этого статуса требуется роль admin.");
      return;
    }
    button.disabled = true;
    try {
      await apiRequest(`./api/admin/orders/${encodeURIComponent(id)}/status`, {
        method: "PATCH",
        body: { status, comment }
      });
      await loadOrders();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Не удалось обновить статус заказа.");
    } finally {
      button.disabled = false;
    }
  });

  returnsList.addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-action='save-return-status']");
    if (!button) {
      return;
    }
    const card = button.closest("[data-return-id]");
    if (!card) {
      return;
    }
    const id = card.dataset.returnId;
    const status = card.querySelector('[data-field="status"]')?.value || "";
    const comment = (card.querySelector('[data-field="comment"]')?.value || "").trim();
    if (!isStatusAllowedForRole("return", status)) {
      window.alert("Для этого статуса требуется роль admin.");
      return;
    }
    button.disabled = true;
    try {
      await apiRequest(`./api/admin/returns/${encodeURIComponent(id)}/status`, {
        method: "PATCH",
        body: { status, comment }
      });
      await loadReturns();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Не удалось обновить статус возврата.");
    } finally {
      button.disabled = false;
    }
  });

  bootstrap();
})();
