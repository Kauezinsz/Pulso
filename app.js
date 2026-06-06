const STORAGE_KEY = "pulso.movements.v1";
const CATEGORY_STORAGE_KEY = "pulso.categories.v1";
const MIGRATION_FLAG_KEY = "pulso.migration.v1";
const SKIPPED_MIGRATION_KEY = "pulso.migration.skip.v1";

const categoryMeta = {
  salário: { icon: "S", color: "#5dffb1" },
  freelance: { icon: "F", color: "#2ee7ff" },
  venda: { icon: "V", color: "#ffd166" },
  alimentação: { icon: "A", color: "#2ee7ff" },
  transporte: { icon: "T", color: "#7aa7ff" },
  moradia: { icon: "M", color: "#5dffb1" },
  contas: { icon: "C", color: "#ffd166" },
  lazer: { icon: "L", color: "#ff8fd2" },
  saúde: { icon: "+", color: "#ff6f91" },
  compras: { icon: "K", color: "#9dffea" },
  trabalho: { icon: "T", color: "#f4fbff" },
  outros: { icon: "O", color: "#8aa1b8" },
};

const defaultCategoriesByType = {
  income: ["salário", "freelance", "venda", "outros"],
  expense: ["alimentação", "transporte", "moradia", "contas", "lazer", "saúde", "compras", "trabalho", "outros"],
};

const demoMovements = [
  { id: crypto.randomUUID(), type: "income", amount: 5200, category: "salário", description: "Salário", date: offsetDate(-8) },
  { id: crypto.randomUUID(), type: "expense", amount: 42.9, category: "alimentação", description: "Café e almoço", date: offsetDate(-1) },
  { id: crypto.randomUUID(), type: "expense", amount: 19.8, category: "transporte", description: "Corrida curta", date: offsetDate(-1) },
  { id: crypto.randomUUID(), type: "expense", amount: 320, category: "contas", description: "Internet", date: offsetDate(-2) },
  { id: crypto.randomUUID(), type: "expense", amount: 86.4, category: "lazer", description: "Cinema", date: offsetDate(-4) },
  { id: crypto.randomUUID(), type: "expense", amount: 214.3, category: "compras", description: "Itens de casa", date: offsetDate(-5) },
  { id: crypto.randomUUID(), type: "income", amount: 740, category: "freelance", description: "Projeto extra", date: offsetDate(-6) },
  { id: crypto.randomUUID(), type: "expense", amount: 37.5, category: "alimentação", description: "Padaria", date: offsetDate(-7) },
];

const state = {
  authStatus: "loading",
  user: null,
  currentCycle: null,
  cycles: [],
  cycleDetail: null,
  movements: [],
  activeTab: "summary",
  activeFilter: "all",
  formType: "expense",
  selectedCategory: "",
  categories: cloneDefaultCategories(),
  categoryRecords: {
    income: [],
    expense: [],
  },
  categoryEditorMode: "create",
  editingCategory: "",
  analysisType: "expense",
  activeAnalysisCategory: "",
  pendingDeleteCategory: "",
  pendingCloseCycle: false,
  authMode: "login",
  migrationVisible: false,
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const dateFormatter = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" });

const elements = {
  authScreen: $("#auth-screen"),
  authMessage: $("#auth-message"),
  authTabs: $$(".auth-tab"),
  loginForm: $("#login-form"),
  registerForm: $("#register-form"),
  loginEmail: $("#login-email"),
  loginPassword: $("#login-password"),
  registerEmail: $("#register-email"),
  registerPassword: $("#register-password"),
  screenTitle: $("#screen-title"),
  screenPeriod: $("#screen-period"),
  summaryPeriod: $("#summary-period"),
  currentCycleLabel: $("#current-cycle-label"),
  currentCycleCopy: $("#current-cycle-copy"),
  openCloseCycle: $("#open-close-cycle"),
  balance: $("#current-balance"),
  balanceNote: $("#balance-note"),
  income: $("#total-income"),
  expense: $("#total-expense"),
  behaviorTitle: $("#behavior-title"),
  behaviorCopy: $("#behavior-copy"),
  behaviorRing: $("#behavior-ring"),
  behaviorPercent: $("#behavior-percent"),
  recentList: $("#recent-list"),
  historyList: $("#history-list"),
  quickInsights: $("#quick-insights"),
  insightsList: $("#insights-list"),
  insightHeadline: $("#insight-headline"),
  insightSubtitle: $("#insight-subtitle"),
  topCategory: $("#top-category"),
  topCategoryCopy: $("#top-category-copy"),
  analysisPeriod: $("#analysis-period"),
  analysisTotal: $("#analysis-total"),
  analysisCount: $("#analysis-count"),
  categoryBars: $("#category-bars"),
  categoryDonut: $("#category-donut"),
  donutCenter: $("#donut-center"),
  analysisTypeButtons: $$(".analysis-type"),
  saveToast: $("#save-toast"),
  sheet: $("#movement-sheet"),
  form: $("#movement-form"),
  formTitle: $("#form-title"),
  movementId: $("#movement-id"),
  amount: $("#amount"),
  category: $("#category"),
  categoryContext: $("#category-context"),
  categorySelect: $("#category-select"),
  categorySelectLabel: $("#category-select-label"),
  categorySheet: $("#category-sheet"),
  categorySheetContext: $("#category-sheet-context"),
  categoryList: $("#category-list"),
  categoryFeedback: $("#category-feedback"),
  newCategoryPanel: $("#new-category-panel"),
  categoryEditorTitle: $("#category-editor-title"),
  newCategoryName: $("#new-category-name"),
  saveCategory: $("#save-category"),
  categoryError: $("#category-error"),
  logoutButton: $("#reset-demo"),
  description: $("#description"),
  date: $("#date"),
  migrationSheet: $("#migration-sheet"),
  migrationCopy: $("#migration-copy"),
  migrationNote: $("#migration-note"),
  importLocalData: $("#import-local-data"),
  skipLocalData: $("#skip-local-data"),
  cycleTabCurrentLabel: $("#cycles-current-label"),
  cycleTabCurrentCopy: $("#cycles-current-copy"),
  openCloseCycleCta: $("#open-close-cycle-cta"),
  cycleList: $("#cycle-list"),
  closedCyclesCount: $("#closed-cycles-count"),
  cycleCloseSheet: $("#cycle-close-sheet"),
  cycleCloseCopy: $("#cycle-close-copy"),
  cycleCloseNote: $("#cycle-close-note"),
  confirmCloseCycle: $("#confirm-close-cycle"),
  cycleDetailSheet: $("#cycle-detail-sheet"),
  cycleDetailTitle: $("#cycle-detail-title"),
  cycleDetailPeriod: $("#cycle-detail-period"),
  cycleDetailBalance: $("#cycle-detail-balance"),
  cycleDetailCount: $("#cycle-detail-count"),
  cycleDetailIncome: $("#cycle-detail-income"),
  cycleDetailExpense: $("#cycle-detail-expense"),
  cycleDetailList: $("#cycle-detail-list"),
};

init();

function init() {
  bindViewportContext();
  bindEvents();
  registerServiceWorker();
  bootApp();
}

function bindViewportContext() {
  const standaloneQuery = window.matchMedia("(display-mode: standalone)");
  const hoverQuery = window.matchMedia("(hover: hover) and (pointer: fine)");

  const update = () => syncViewportContext();
  window.addEventListener("resize", update, { passive: true });
  window.addEventListener("orientationchange", update, { passive: true });

  if (typeof standaloneQuery.addEventListener === "function") {
    standaloneQuery.addEventListener("change", update);
  } else if (typeof standaloneQuery.addListener === "function") {
    standaloneQuery.addListener(update);
  }

  if (typeof hoverQuery.addEventListener === "function") {
    hoverQuery.addEventListener("change", update);
  } else if (typeof hoverQuery.addListener === "function") {
    hoverQuery.addListener(update);
  }

  syncViewportContext();
}

function syncViewportContext() {
  if (!document.body) return;

  const width = window.innerWidth;
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  const isDesktop = width >= 1180;
  const isTablet = width >= 860 && width < 1180;
  const isMobile = width < 860;
  const hasHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  document.body.classList.toggle("is-pwa", isStandalone);
  document.body.classList.toggle("is-browser", !isStandalone);
  document.body.classList.toggle("is-mobile", isMobile);
  document.body.classList.toggle("is-tablet", isTablet);
  document.body.classList.toggle("is-desktop", isDesktop);
  document.body.classList.toggle("has-hover", hasHover);
  document.body.dataset.context = isStandalone ? "pwa" : "browser";
  document.body.dataset.viewport = isDesktop ? "desktop" : isTablet ? "tablet" : "mobile";
}

async function bootApp() {
  setAuthMode("loading");
  updateAuthShell();

  try {
    const me = await apiRequest("/auth/me");
    state.user = me.user;
    state.authStatus = "authenticated";
    setAuthMode("authenticated");
    await loadUserData();
    updateAuthShell();
    render();
    maybeOfferMigration();
  } catch {
    state.user = null;
    state.authStatus = "guest";
    setAuthMode("guest");
    updateAuthShell();
  }
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  if (location.protocol === "file:") return;

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {
      // O app continua funcionando normalmente sem cache offline.
    });
  });
}

function setAuthMode(mode) {
  state.authMode = mode;
  document.body.dataset.auth = mode;
}

function updateAuthShell() {
  if (state.authStatus === "authenticated") {
    elements.logoutButton.hidden = false;
    elements.logoutButton.setAttribute("aria-label", `Sair da conta${state.user?.email ? ` (${state.user.email})` : ""}`);
    elements.logoutButton.title = state.user?.email ? `Sair de ${state.user.email}` : "Sair da conta";
    elements.logoutButton.querySelector("svg").innerHTML = '<path d="M10 17l5-5-5-5"></path><path d="M15 12H4"></path><path d="M20 4v16"></path>';
  } else {
    elements.logoutButton.hidden = true;
  }
}

function setAuthTab(tab) {
  state.authMode = tab;
  elements.authTabs.forEach((button) => button.classList.toggle("active", button.dataset.authTab === tab));
  elements.loginForm.hidden = tab !== "login";
  elements.registerForm.hidden = tab !== "register";
  elements.loginForm.classList.toggle("active", tab === "login");
  elements.registerForm.classList.toggle("active", tab === "register");
  elements.authMessage.textContent = "";
}

async function submitLogin(event) {
  event.preventDefault();
  try {
    setAuthMessage("Entrando...");
    await apiRequest("/auth/login", {
      method: "POST",
      body: {
        email: elements.loginEmail.value,
        password: elements.loginPassword.value,
      },
    });
    await bootApp();
    setAuthMessage("");
  } catch (error) {
    setAuthMessage(authErrorMessage(error));
  }
}

async function submitRegister(event) {
  event.preventDefault();
  try {
    setAuthMessage("Criando sua conta...");
    await apiRequest("/auth/register", {
      method: "POST",
      body: {
        email: elements.registerEmail.value,
        password: elements.registerPassword.value,
      },
    });
    await bootApp();
    setAuthMessage("");
  } catch (error) {
    setAuthMessage(authErrorMessage(error));
  }
}

async function logout() {
  try {
    await apiRequest("/auth/logout", { method: "POST" });
  } catch {
    // logout local continua
  }

  state.user = null;
  state.currentCycle = null;
  state.cycles = [];
  state.cycleDetail = null;
  state.movements = [];
  state.categories = cloneDefaultCategories();
  state.categoryRecords = { income: [], expense: [] };
  state.selectedCategory = "";
  state.authStatus = "guest";
  state.pendingCloseCycle = false;
  setAuthMode("guest");
  updateAuthShell();
  setAuthTab("login");
  closeCycleSheet();
  closeCycleDetailSheet();
  render();
}

function setAuthMessage(message) {
  elements.authMessage.textContent = message;
}

function getAppBasePath() {
  const { pathname } = window.location;
  return pathname.startsWith("/pulso") ? "/pulso" : "";
}

function resolveAppUrl(path) {
  if (!path || !path.startsWith("/")) return path;
  const basePath = getAppBasePath();
  if (!basePath) return path;
  if (path === basePath || path.startsWith(`${basePath}/`)) return path;
  return `${basePath}${path}`;
}

function authErrorMessage(error) {
  if (!error) return "Nao foi possivel continuar.";
  if (error.code === "email_in_use") return "Esse e-mail ja esta em uso.";
  if (error.code === "invalid_credentials") return "E-mail ou senha invalidos.";
  if (error.code === "unauthorized") return "Sua sessao expirou. Entre novamente.";
  return error.message || "Nao foi possivel continuar.";
}

function handleUnauthorizedError(error) {
  if (error?.code !== "unauthorized") return false;
  void logout();
  return true;
}

async function apiRequest(url, options = {}) {
  const response = await fetch(resolveAppUrl(url), {
    method: options.method || "GET",
    credentials: "include",
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json") ? await response.json() : await response.text();
  if (!response.ok) {
    const error = new Error(payload?.message || payload?.error || response.statusText || "Request failed");
    error.code = payload?.error || "request_failed";
    error.status = response.status;
    throw error;
  }
  return payload;
}

async function loadUserData() {
  const bootstrap = await apiRequest("/api/bootstrap");
  state.user = bootstrap.user;
  state.currentCycle = bootstrap.currentCycle || null;
  state.cycles = Array.isArray(bootstrap.cycles) ? bootstrap.cycles : [];
  state.cycleDetail = null;
  applyCategoryPayload(bootstrap.categories);
  state.movements = normalizeMovementsPayload(bootstrap.movements);
  if (!getCategoriesForType(state.formType).includes(state.selectedCategory)) {
    state.selectedCategory = "";
  }
  updateCategoryField();
}

function hasLegacyLocalData() {
  try {
    const movements = localStorage.getItem(STORAGE_KEY);
    const categories = localStorage.getItem(CATEGORY_STORAGE_KEY);
    return Boolean((movements && movements !== "[]") || (categories && categories !== "{}"));
  } catch {
    return false;
  }
}

function getLegacySnapshot() {
  try {
    const movements = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    const categories = JSON.parse(localStorage.getItem(CATEGORY_STORAGE_KEY) || "{}");
    return {
      movements: Array.isArray(movements) ? movements : [],
      categories: {
        income: Array.isArray(categories.income) ? categories.income : [],
        expense: Array.isArray(categories.expense) ? categories.expense : [],
      },
    };
  } catch {
    return { movements: [], categories: { income: [], expense: [] } };
  }
}

function maybeOfferMigration() {
  if (state.authStatus !== "authenticated") return;
  if (!hasLegacyLocalData()) return;

  const skipped = localStorage.getItem(SKIPPED_MIGRATION_KEY);
  const imported = localStorage.getItem(MIGRATION_FLAG_KEY);
  if (imported || skipped === state.user?.email) return;

  state.migrationVisible = true;
  elements.migrationCopy.textContent = "Encontramos dados salvos neste aparelho. Deseja importar para sua conta?";
  elements.migrationNote.textContent = "Isso não apaga os dados locais de origem até a importacao concluir.";
  elements.migrationSheet.classList.add("open");
  elements.migrationSheet.setAttribute("aria-hidden", "false");
}

function dismissMigrationPrompt() {
  state.migrationVisible = false;
  if (state.user?.email) {
    localStorage.setItem(SKIPPED_MIGRATION_KEY, state.user.email);
  }
  closeMigrationSheet();
}

function closeMigrationSheet() {
  elements.migrationSheet.classList.remove("open");
  elements.migrationSheet.setAttribute("aria-hidden", "true");
}

function openCloseCycleSheet() {
  const currentCycle = state.currentCycle;
  if (!currentCycle) return;

  const totals = getTotals();
  elements.cycleCloseCopy.textContent = `Você vai encerrar ${formatCycleTitle(currentCycle)}. Entradas ${currency.format(totals.income)}, saídas ${currency.format(totals.expense)} e saldo ${currency.format(totals.balance)} seguem salvos no histórico.`;
  elements.cycleCloseNote.textContent = "Nenhum lançamento é apagado. Um novo ciclo vazio será aberto em seguida.";
  elements.cycleCloseSheet.classList.add("open");
  elements.cycleCloseSheet.setAttribute("aria-hidden", "false");
}

function closeCycleSheet() {
  elements.cycleCloseSheet.classList.remove("open");
  elements.cycleCloseSheet.setAttribute("aria-hidden", "true");
}

async function confirmCloseCycle() {
  if (state.pendingCloseCycle) return;

  try {
    state.pendingCloseCycle = true;
    elements.confirmCloseCycle.disabled = true;
    elements.confirmCloseCycle.textContent = "Fechando...";
    const result = await apiRequest("/api/cycles/close", { method: "POST" });
    await loadUserData();
    render({ pulse: true });
    closeCycleSheet();
    setActiveTab("summary");
    showToast(result?.closedCycle ? "Ciclo fechado e novo ciclo aberto" : "Ciclo fechado", "success");
  } catch (error) {
    if (!handleUnauthorizedError(error)) {
      showToast(authErrorMessage(error), "neutral");
    }
  } finally {
    state.pendingCloseCycle = false;
    elements.confirmCloseCycle.disabled = false;
    elements.confirmCloseCycle.textContent = "Fechar agora";
  }
}

function renderCycles() {
  const closedCycles = state.cycles.filter((cycle) => cycle.status === "closed");
  const activeCycle = state.currentCycle;

  elements.cycleTabCurrentLabel.textContent = activeCycle ? formatCycleTitle(activeCycle) : "Ciclo atual";
  elements.cycleTabCurrentCopy.textContent = activeCycle
    ? `Aberto em ${formatDate(activeCycle.startedAt)}. ${currency.format(getTotals().balance)} de saldo no ciclo ativo.`
    : "Feche o ciclo atual quando quiser virar o período.";

  elements.closedCyclesCount.textContent = `${closedCycles.length} ciclo${closedCycles.length === 1 ? "" : "s"}`;
  elements.cycleList.innerHTML = closedCycles.length
    ? closedCycles.map(renderCycleCard).join("")
    : renderEmptyState("Nenhum ciclo fechado", "Quando você fechar o ciclo atual, ele aparece aqui em modo somente leitura.");

  elements.cycleList.querySelectorAll("[data-open-cycle]").forEach((button) => {
    button.addEventListener("click", () => {
      void openCycleDetail(button.dataset.openCycle);
    });
  });
}

function renderCycleCard(cycle) {
  const balanceTone = cycle.balance >= 0 ? "good" : "alert";
  const period = formatCyclePeriod(cycle);
  return `<article class="cycle-card closed ${balanceTone}">
    <div>
      <span class="mini-label">${cycle.status === "active" ? "Ativo" : "Fechado"}</span>
      <strong>${escapeHtml(cycle.label || "Ciclo")}</strong>
      <p>${escapeHtml(period)} · ${cycle.movementCount} movimento${cycle.movementCount === 1 ? "" : "s"}</p>
    </div>
    <div class="cycle-card-side">
      <strong>${currency.format(cycle.balance)}</strong>
      <button class="text-button" type="button" data-open-cycle="${cycle.id}">Abrir</button>
    </div>
  </article>`;
}

async function openCycleDetail(cycleId) {
  try {
    const payload = await apiRequest(`/api/cycles/${encodeURIComponent(cycleId)}`);
    state.cycleDetail = {
      cycle: payload.cycle,
      movements: normalizeMovementsPayload(payload.movements),
    };
    renderCycleDetail();
    elements.cycleDetailSheet.classList.add("open");
    elements.cycleDetailSheet.setAttribute("aria-hidden", "false");
  } catch (error) {
    if (!handleUnauthorizedError(error)) {
      showToast(authErrorMessage(error), "neutral");
    }
  }
}

function closeCycleDetailSheet() {
  elements.cycleDetailSheet.classList.remove("open");
  elements.cycleDetailSheet.setAttribute("aria-hidden", "true");
}

function renderCycleDetail() {
  const detail = state.cycleDetail;
  if (!detail) return;

  const cycle = detail.cycle;
  const movements = detail.movements;
  elements.cycleDetailTitle.textContent = formatCycleTitle(cycle);
  elements.cycleDetailPeriod.textContent = formatCyclePeriod(cycle);
  elements.cycleDetailBalance.textContent = currency.format(cycle.balance);
  elements.cycleDetailCount.textContent = String(cycle.movementCount || movements.length);
  elements.cycleDetailIncome.textContent = currency.format(cycle.incomeTotal || 0);
  elements.cycleDetailExpense.textContent = currency.format(cycle.expenseTotal || 0);
  elements.cycleDetailList.innerHTML = renderMovementList(movements, {
    empty: "Este ciclo não tem lançamentos.",
  });
}

async function importLocalData() {
  const snapshot = getLegacySnapshot();
  if (!snapshot.movements.length && !snapshot.categories.income.length && !snapshot.categories.expense.length) {
    dismissMigrationPrompt();
    return;
  }

  try {
    elements.importLocalData.disabled = true;
    elements.importLocalData.textContent = "Importando...";
    const result = await apiRequest("/api/import/local", {
      method: "POST",
      body: snapshot,
    });

    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(CATEGORY_STORAGE_KEY);
    localStorage.setItem(MIGRATION_FLAG_KEY, state.user?.email || "1");
    localStorage.removeItem(SKIPPED_MIGRATION_KEY);

    await loadUserData();
    render({ pulse: true });
    showToast(`Dados importados (${result.importedMovements} lançamentos)`, "success");
    dismissMigrationPrompt();
  } catch (error) {
    if (handleUnauthorizedError(error)) return;
    showToast(authErrorMessage(error), "neutral");
  } finally {
    elements.importLocalData.disabled = false;
    elements.importLocalData.textContent = "Importar agora";
  }
}

function applyCategoryPayload(payload) {
  const income = Array.isArray(payload?.income) ? payload.income : [];
  const expense = Array.isArray(payload?.expense) ? payload.expense : [];
  state.categoryRecords = {
    income: income.map(normalizeCategoryRecord),
    expense: expense.map(normalizeCategoryRecord),
  };
  state.categories = {
    income: state.categoryRecords.income.map((item) => item.name),
    expense: state.categoryRecords.expense.map((item) => item.name),
  };
}

function normalizeCategoryRecord(item) {
  return {
    id: item.id,
    type: item.type,
    name: normalizeCategoryName(item.name),
    slug: item.slug,
    isDefault: Boolean(item.isDefault),
  };
}

function normalizeMovementsPayload(items) {
  return Array.isArray(items)
    ? items.map((item) => ({
        id: item.id,
        type: item.type,
        amount: Number(item.amount),
        categoryId: item.categoryId,
        category: normalizeCategoryName(item.categoryName || ""),
        description: item.description,
        date: item.date,
      }))
    : [];
}

function bindEvents() {
  elements.authTabs.forEach((button) => {
    button.addEventListener("click", () => setAuthTab(button.dataset.authTab));
  });

  elements.loginForm.addEventListener("submit", (event) => {
    void submitLogin(event);
  });

  elements.registerForm.addEventListener("submit", (event) => {
    void submitRegister(event);
  });

  $$(".nav-tab").forEach((button) => {
    button.addEventListener("click", () => setActiveTab(button.dataset.tab));
  });

  $$("[data-open-tab]").forEach((button) => {
    button.addEventListener("click", () => setActiveTab(button.dataset.openTab));
  });

  $$(".filter-pill").forEach((button) => {
    button.addEventListener("click", () => {
      state.activeFilter = button.dataset.filter;
      $$(".filter-pill").forEach((pill) => pill.classList.toggle("active", pill === button));
      renderHistory();
    });
  });

  elements.analysisTypeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      state.analysisType = button.dataset.analysisType;
      state.activeAnalysisCategory = "";
      elements.analysisTypeButtons.forEach((item) => item.classList.toggle("active", item === button));
      renderAnalysis(getTotals());
    });
  });

  $("#open-form").addEventListener("click", () => openSheet());
  elements.categorySelect.addEventListener("click", openCategorySheet);
  elements.openCloseCycle.addEventListener("click", openCloseCycleSheet);
  elements.openCloseCycleCta.addEventListener("click", openCloseCycleSheet);
  elements.confirmCloseCycle.addEventListener("click", () => {
    void confirmCloseCycle();
  });

  $$("[data-close-cycle-sheet]").forEach((element) => {
    element.addEventListener("click", closeCycleSheet);
  });

  $$("[data-close-cycle-detail]").forEach((element) => {
    element.addEventListener("click", closeCycleDetailSheet);
  });

  $$("[data-close-sheet]").forEach((element) => {
    element.addEventListener("click", closeSheet);
  });

  $$("[data-close-category-sheet]").forEach((element) => {
    element.addEventListener("click", closeCategorySheet);
  });

  $$("[data-close-migration-sheet]").forEach((element) => {
    element.addEventListener("click", dismissMigrationPrompt);
  });

  $$(".toggle-option").forEach((button) => {
    button.addEventListener("click", () => setFormType(button.dataset.type));
  });

  elements.amount.addEventListener("input", () => {
    elements.amount.value = sanitizeMoneyInput(elements.amount.value);
  });
  elements.amount.addEventListener("blur", () => {
    const amount = parseMoney(elements.amount.value);
    elements.amount.value = amount ? formatMoneyInput(amount) : "";
  });
  elements.amount.addEventListener("focus", () => {
    elements.amount.select();
  });

  elements.form.addEventListener("submit", saveMovement);
  elements.saveCategory.addEventListener("click", () => {
    void saveNewCategory();
  });
  elements.newCategoryName.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      void saveNewCategory();
    }
  });

  elements.logoutButton.addEventListener("click", () => {
    void logout();
  });

  elements.importLocalData.addEventListener("click", () => {
    void importLocalData();
  });

  elements.skipLocalData.addEventListener("click", () => {
    dismissMigrationPrompt();
  });
}

function updateCategoryField() {
  elements.categoryContext.textContent = state.formType === "income" ? "para entrada" : "para saída";
  elements.category.value = state.selectedCategory;
  elements.categorySelect.classList.toggle("has-value", Boolean(state.selectedCategory));
  elements.categorySelectLabel.textContent = state.selectedCategory ? capitalize(state.selectedCategory) : "Escolher categoria";
}

function setActiveTab(tab) {
  state.activeTab = tab;
  $$(".nav-tab").forEach((button) => button.classList.toggle("active", button.dataset.tab === tab));
  $$(".tab-panel").forEach((panel) => panel.classList.toggle("active", panel.id === `tab-${tab}`));
  const panel = $(`#tab-${tab}`);
  elements.screenTitle.textContent = panel.dataset.title;
  elements.screenPeriod.textContent = periodLabel(tab);
}

function openSheet(movement = null) {
  elements.form.reset();
  elements.date.value = new Date().toISOString().slice(0, 10);
  elements.movementId.value = "";
  elements.formTitle.textContent = "Adicionar rápido";
  setFormType("expense", { preserveCategory: false });

  if (movement) {
    elements.formTitle.textContent = "Editar movimento";
    elements.movementId.value = movement.id;
    elements.amount.value = formatMoneyInput(movement.amount);
    elements.description.value = movement.description;
    elements.date.value = movement.date;
    setFormType(movement.type, { preserveCategory: true });
    selectCategory(movement.category);
  }

  elements.sheet.classList.add("open");
  elements.sheet.setAttribute("aria-hidden", "false");
  setTimeout(() => elements.amount.focus(), 120);
}

function closeSheet() {
  elements.sheet.classList.remove("open");
  elements.sheet.setAttribute("aria-hidden", "true");
}

function setFormType(type, options = {}) {
  state.formType = type;
  $$(".toggle-option").forEach((button) => button.classList.toggle("active", button.dataset.type === type));
  const currentIsValid = getCategoriesForType(type).includes(state.selectedCategory);
  if (!options.preserveCategory || !currentIsValid) {
    state.selectedCategory = "";
  }
  updateCategoryField();
}

function selectCategory(category) {
  state.selectedCategory = category;
  updateCategoryField();
  renderCategoryList();
}

function openCategorySheet() {
  elements.categorySheet.classList.add("open");
  elements.categorySheet.setAttribute("aria-hidden", "false");
  closeCategoryEditor();
  elements.categoryError.textContent = "";
  elements.categoryFeedback.textContent = "";
  elements.newCategoryName.value = "";
  renderCategoryList();
}

function closeCategorySheet() {
  elements.categorySheet.classList.remove("open");
  elements.categorySheet.setAttribute("aria-hidden", "true");
}

function renderCategoryList() {
  const categories = getCategoriesForType(state.formType);
  elements.categorySheetContext.textContent = state.formType === "income" ? "Entrada" : "Saída";
  elements.categoryList.innerHTML = `${categories
    .map((category) => {
      const selected = category === state.selectedCategory;
      const custom = isCustomCategory(state.formType, category);
      const removable = canDeleteCategory(category);
      return `<div class="category-list-item ${selected ? "active" : ""} ${custom ? "custom" : ""}" role="option" aria-selected="${selected}">
        <button class="category-main-action" type="button" data-category="${category}">
          <span>${capitalize(category)}</span>
          ${selected ? "<strong>Selecionada</strong>" : ""}
        </button>
        ${
          custom || removable
            ? `<div class="category-manage-actions">
                ${custom ? `<button type="button" data-rename-category="${category}" aria-label="Renomear ${escapeHtml(category)}">Editar</button>` : ""}
                ${removable ? `<button type="button" data-delete-category="${category}" aria-label="Excluir ${escapeHtml(category)}">Excluir</button>` : ""}
              </div>`
            : ""
        }
      </div>`;
    })
    .join("")}
    <button class="category-list-item create" type="button" data-create-category>
      <span>Criar nova categoria</span>
      <strong>+</strong>
    </button>`;

  elements.categoryList.querySelectorAll("[data-category]").forEach((button) => {
    button.addEventListener("click", () => {
      selectCategory(button.dataset.category);
      closeCategorySheet();
    });
  });

  elements.categoryList.querySelectorAll("[data-rename-category]").forEach((button) => {
    button.addEventListener("click", () => openCategoryEditor("rename", button.dataset.renameCategory));
  });

  elements.categoryList.querySelectorAll("[data-delete-category]").forEach((button) => {
    button.addEventListener("click", () => confirmDeleteCategory(button.dataset.deleteCategory));
  });

  elements.categoryList.querySelector("[data-create-category]").addEventListener("click", () => {
    openCategoryEditor("create");
  });
}

async function saveNewCategory() {
  const category = normalizeCategoryName(elements.newCategoryName.value);
  const categories = getCategoriesForType(state.formType);
  const isRename = state.categoryEditorMode === "rename";
  const originalCategory = state.editingCategory;

  if (!category) {
    elements.categoryError.textContent = "Digite um nome curto para a categoria.";
    return;
  }

  if (categories.some((item) => sameCategory(item, category) && !sameCategory(item, originalCategory))) {
    elements.categoryError.textContent = "Essa categoria já existe para este tipo.";
    return;
  }

  try {
    if (isRename) {
      const categoryId = getCategoryIdByName(state.formType, originalCategory);
      if (!categoryId) {
        elements.categoryError.textContent = "Nao foi possivel localizar esta categoria.";
        return;
      }

      await apiRequest(`/api/categories/${encodeURIComponent(categoryId)}`, {
        method: "PUT",
        body: { name: category },
      });
    } else {
      await apiRequest("/api/categories", {
        method: "POST",
        body: {
          type: state.formType,
          name: category,
        },
      });
    }

    await loadUserData();
    selectCategory(category);
    showToast(isRename ? "Categoria renomeada" : "Categoria criada", "success");
    closeCategoryEditor();
    render();
  } catch (error) {
    if (!handleUnauthorizedError(error)) {
      elements.categoryError.textContent = authErrorMessage(error);
    }
  }
}

function openCategoryEditor(mode, category = "") {
  state.categoryEditorMode = mode;
  state.editingCategory = category;
  elements.newCategoryPanel.hidden = false;
  elements.categoryEditorTitle.textContent = mode === "rename" ? "Renomear categoria" : "Nova categoria";
  elements.saveCategory.textContent = mode === "rename" ? "Salvar alteração" : "Salvar categoria";
  elements.categoryError.textContent = "";
  elements.newCategoryName.value = mode === "rename" ? capitalize(category) : "";
  setTimeout(() => {
    elements.newCategoryName.focus();
    elements.newCategoryName.select();
  }, 80);
}

function closeCategoryEditor() {
  state.categoryEditorMode = "create";
  state.editingCategory = "";
  elements.newCategoryPanel.hidden = true;
  elements.categoryEditorTitle.textContent = "Nova categoria";
  elements.saveCategory.textContent = "Salvar categoria";
  elements.categoryError.textContent = "";
  elements.newCategoryName.value = "";
}

function confirmDeleteCategory(category) {
  if (!canDeleteCategory(category)) {
    showCategoryFeedback("Outros é a categoria de segurança e não pode ser excluída.");
    return;
  }

  const affected = state.movements.filter((movement) => movement.type === state.formType && sameCategory(movement.category, category)).length;
  if (affected > 0) {
    showCategoryFeedback("Há lançamentos utilizando esta categoria. Para excluí-la, altere ou remova esses lançamentos primeiro.");
    showToast("Há lançamentos utilizando esta categoria.", "neutral");
    state.pendingDeleteCategory = "";
    return;
  }

  if (state.pendingDeleteCategory === category) {
    deleteCategory(category);
    return;
  }

  state.pendingDeleteCategory = category;
  showCategoryFeedback("Toque novamente em Excluir para confirmar.");
  showToast("Confirme a exclusão", "neutral");
  clearTimeout(confirmDeleteCategory.timeout);
  confirmDeleteCategory.timeout = setTimeout(() => {
    if (state.pendingDeleteCategory === category) {
      state.pendingDeleteCategory = "";
      elements.categoryFeedback.textContent = "";
    }
  }, 4200);
}

async function deleteCategory(category) {
  if (!canDeleteCategory(category)) return;

  const affected = state.movements.some((movement) => movement.type === state.formType && sameCategory(movement.category, category));
  if (affected) {
    showCategoryFeedback("Há lançamentos utilizando esta categoria. Para excluí-la, altere ou remova esses lançamentos primeiro.");
    showToast("Há lançamentos utilizando esta categoria.", "neutral");
    return;
  }

  const categoryId = getCategoryIdByName(state.formType, category);
  if (!categoryId) return;

  try {
    await apiRequest(`/api/categories/${encodeURIComponent(categoryId)}`, { method: "DELETE" });
    await loadUserData();
    if (sameCategory(state.selectedCategory, category)) {
      selectCategory("outros");
    }
    state.pendingDeleteCategory = "";
    closeCategoryEditor();
    render();
    showToast("Categoria removida", "neutral");
  } catch (error) {
    if (handleUnauthorizedError(error)) return;
    if (error.code === "category_in_use") {
      state.pendingDeleteCategory = "";
      showCategoryFeedback("Há lançamentos utilizando esta categoria. Para excluí-la, altere ou remova esses lançamentos primeiro.");
      showToast("Há lançamentos utilizando esta categoria.", "neutral");
      return;
    }
    showCategoryFeedback(authErrorMessage(error));
  }
}

function showCategoryFeedback(message) {
  elements.categoryFeedback.textContent = message;
  elements.categoryFeedback.classList.remove("show");
  requestAnimationFrame(() => elements.categoryFeedback.classList.add("show"));
}

async function saveMovement(event) {
  event.preventDefault();
  const isEditing = Boolean(elements.movementId.value);
  const categoryName = elements.category.value || state.selectedCategory;
  const categoryId = getCategoryIdByName(state.formType, categoryName);

  const movement = {
    id: elements.movementId.value || crypto.randomUUID(),
    type: state.formType,
    amount: parseMoney(elements.amount.value),
    category: categoryName,
    categoryId,
    description: elements.description.value.trim(),
    date: elements.date.value,
  };

  if (!movement.amount || movement.amount <= 0 || !movement.description || !movement.date) {
    return;
  }

  if (!movement.category || !movement.categoryId) {
    showToast("Escolha uma categoria", "neutral");
    openCategorySheet();
    return;
  }

  try {
    if (isEditing) {
      await apiRequest(`/api/movements/${encodeURIComponent(movement.id)}`, {
        method: "PUT",
        body: movement,
      });
    } else {
      await apiRequest("/api/movements", {
        method: "POST",
        body: movement,
      });
    }

    await loadUserData();
    closeSheet();
    render({ pulse: true });
    showToast(isEditing ? "Movimentação atualizada" : movement.type === "income" ? "Entrada salva" : "Saída salva", "success");
  } catch (error) {
    if (handleUnauthorizedError(error)) return;
    showToast(authErrorMessage(error), "neutral");
  }
}

async function deleteMovement(id, element) {
  if (element) {
    element.classList.add("removing");
  }
  setTimeout(async () => {
    try {
      await apiRequest(`/api/movements/${encodeURIComponent(id)}`, { method: "DELETE" });
      await loadUserData();
      render({ pulse: true });
      showToast("Movimentação excluída", "neutral");
    } catch (error) {
      if (handleUnauthorizedError(error)) return;
      showToast(authErrorMessage(error), "neutral");
    }
  }, element ? 180 : 0);
}

function render(options = {}) {
  const totals = getTotals();
  renderSummary(totals, options);
  renderHistory();
  renderAnalysis(totals);
  renderInsights(totals);
  renderCycles();
}

function renderSummary(totals, options = {}) {
  const spendRatio = totals.income ? Math.min(totals.expense / totals.income, 1) : 0;
  const degrees = Math.round(spendRatio * 360);
  const percent = Math.round(spendRatio * 100);
  const isEmpty = state.movements.length === 0;
  const currentCycle = state.currentCycle;
  const currentCycleLabel = currentCycle?.label || "Ciclo atual";

  elements.summaryPeriod.textContent = currentCycle?.status === "active" ? "Ciclo ativo" : "Ciclo";
  elements.currentCycleLabel.textContent = currentCycleLabel;
  elements.currentCycleCopy.textContent = currentCycle
    ? currentCycle.status === "active"
      ? `Aberto em ${formatDate(currentCycle.startedAt)}. Nenhum lançamento é perdido ao fechar o ciclo.`
      : `Fechado em ${formatDate(currentCycle.closedAt || currentCycle.updatedAt)}.`
    : "Os lançamentos deste ciclo aparecem aqui.";
  elements.balance.textContent = currency.format(totals.balance);
  elements.income.textContent = currency.format(totals.income);
  elements.expense.textContent = currency.format(totals.expense);
  elements.balanceNote.textContent = isEmpty
    ? "Comece com um lançamento e o Pulso desenha o ciclo atual."
    : totals.balance >= 0
      ? "O ciclo ainda respira bem. Dá para seguir com calma."
      : "O ciclo ficou no vermelho. Ainda dá para ajustar cedo.";
  elements.behaviorRing.style.background = `conic-gradient(var(--cyan) ${degrees}deg, rgba(255,255,255,.08) ${degrees}deg)`;
  elements.behaviorPercent.textContent = `${percent}%`;

  if (isEmpty) {
    elements.behaviorTitle.textContent = "Pronto para começar";
    elements.behaviorCopy.textContent = "Um registro já deixa o ciclo vivo.";
  } else if (percent < 45) {
    elements.behaviorTitle.textContent = "Leve";
    elements.behaviorCopy.textContent = "As saídas ainda ocupam pouco espaço.";
  } else if (percent < 80) {
    elements.behaviorTitle.textContent = "Atento";
    elements.behaviorCopy.textContent = "O ritmo está saudável, mas pede presença.";
  } else {
    elements.behaviorTitle.textContent = "Apertado";
    elements.behaviorCopy.textContent = "As saídas estão perto das entradas.";
  }

  elements.recentList.innerHTML = renderMovementList(sortMovements(state.movements).slice(0, 4), {
    empty: "Seu ciclo atual fica vivo assim que você adiciona a primeira movimentação.",
  });
  elements.quickInsights.innerHTML = buildInsights(totals).slice(0, 2).map(renderInsightCard).join("");

  if (options.pulse) {
    elements.balance.closest(".balance-card").classList.remove("balance-updated");
    requestAnimationFrame(() => elements.balance.closest(".balance-card").classList.add("balance-updated"));
  }
}

function renderHistory() {
  const filtered = sortMovements(state.movements).filter((movement) => {
    return state.activeFilter === "all" || movement.type === state.activeFilter;
  });

  elements.historyList.innerHTML = renderMovementList(filtered, {
    withActions: true,
    empty: "Nenhum lançamento neste filtro do ciclo atual.",
  });

  elements.historyList.querySelectorAll("[data-edit]").forEach((button) => {
    button.addEventListener("click", () => {
      const movement = state.movements.find((item) => item.id === button.dataset.edit);
      if (movement) {
        showToast("Editando movimentação", "neutral");
        openSheet(movement);
      }
    });
  });

  elements.historyList.querySelectorAll("[data-delete]").forEach((button) => {
    button.addEventListener("click", () => deleteMovement(button.dataset.delete, button.closest(".movement-item")));
  });
}

function renderAnalysis(totals) {
  const grouped = groupMovementsByCategory(state.analysisType);
  const top = grouped[0];
  const typeTotal = grouped.reduce((sum, item) => sum + item.total, 0);
  const movementCount = state.movements.filter((movement) => movement.type === state.analysisType).length;
  const typeLabel = state.analysisType === "expense" ? "saídas" : "entradas";
  const typeTitle = state.analysisType === "expense" ? "Gastos" : "Receitas";

  elements.analysisPeriod.textContent = state.currentCycle?.status === "active" ? "Ciclo ativo" : "Ciclo fechado";
  elements.analysisTotal.textContent = `${currency.format(typeTotal)} em ${typeLabel}`;
  elements.analysisCount.textContent = `${movementCount} movimento${movementCount === 1 ? "" : "s"}`;

  if (!top) {
    elements.topCategory.textContent = state.analysisType === "expense" ? "Sem gastos ainda" : "Sem receitas ainda";
    elements.topCategoryCopy.textContent = `Registre ${state.analysisType === "expense" ? "uma saída" : "uma entrada"} para o Pulso desenhar o ciclo.`;
    elements.categoryBars.innerHTML = renderEmptyState("Análise limpa", "As categorias aparecem aqui com peso, proporção e leitura rápida.");
    elements.categoryDonut.innerHTML = "";
    elements.donutCenter.textContent = "0%";
    return;
  }

  const active = grouped.find((item) => item.category === state.activeAnalysisCategory) || top;
  state.activeAnalysisCategory = active.category;
  updateAnalysisFocus(active, typeTotal);
  elements.categoryBars.innerHTML = grouped.map((item) => renderCategoryRow(item, typeTotal)).join("");
  renderPieChart(grouped, typeTotal);
}

function renderInsights(totals) {
  const insights = buildInsights(totals);
  const [lead, ...rest] = insights;
  elements.insightHeadline.textContent = lead?.title || "Seu padrão aparece aqui.";
  elements.insightSubtitle.textContent = lead?.copy || "Adicione algumas movimentações para gerar leituras úteis neste ciclo.";
  elements.insightsList.innerHTML = rest.length
    ? rest.map(renderInsightCard).join("")
    : renderEmptyState("Sem sinais extras", "Com mais registros, o Pulso compara ritmo, pequenos gastos e categorias.");
}

function renderMovementList(movements, options = {}) {
  if (!movements.length) {
    return renderEmptyState("Tudo calmo", options.empty || "O primeiro registro já muda a leitura.");
  }

  return movements
    .map((movement) => {
      const signal = movement.type === "income" ? "+" : "-";
      const categoryName = movement.category || getCategoryNameById(movement.categoryId);
      const meta = getCategoryMeta(categoryName);
      const actions = options.withActions
        ? `<details class="row-actions">
            <summary aria-label="Ações de ${escapeHtml(movement.description)}">
              <span></span><span></span><span></span>
            </summary>
            <div class="action-menu" aria-label="Ações da movimentação">
              <button class="row-action edit" type="button" data-edit="${movement.id}" aria-label="Editar ${escapeHtml(movement.description)}">Editar</button>
              <button class="row-action delete" type="button" data-delete="${movement.id}" aria-label="Excluir ${escapeHtml(movement.description)}">Excluir</button>
            </div>
          </details>`
        : "";

      return `<article class="movement-item ${movement.type}" style="--category-color:${meta.color}">
        <div class="movement-icon">${meta.icon}</div>
        <div class="movement-main">
          <strong>${escapeHtml(movement.description)}</strong>
          <span>${capitalize(categoryName)} · ${formatDate(movement.date)}</span>
        </div>
        <div class="movement-side">
          <span class="movement-value">${signal}${currency.format(movement.amount)}</span>
          ${actions}
        </div>
      </article>`;
    })
    .join("");
}

function renderCategoryRow(item, total) {
  const share = Math.round((item.total / total) * 100);
  const meta = getCategoryMeta(item.category);
  return `<article class="category-row" style="--category-color:${meta.color}">
    <div class="category-meta">
      <span><i>${meta.icon}</i>${capitalize(item.category)}</span>
      <strong>${currency.format(item.total)}</strong>
    </div>
    <div class="bar-track"><div class="bar-fill" style="width:${share}%"></div></div>
    <div class="category-values">
      <span>${share}% das saídas</span>
      <span>${item.count} movimento${item.count === 1 ? "" : "s"}</span>
    </div>
  </article>`;
}

function renderPieChart(grouped, total) {
  let startAngle = -90;
  elements.categoryDonut.innerHTML = `<svg viewBox="0 0 120 120" role="img" aria-label="Distribuição por categoria">
    ${grouped
      .map((item, index) => {
        const angle = (item.total / total) * 360;
        const endAngle = startAngle + angle;
        const selected = item.category === state.activeAnalysisCategory;
        const color = getCategoryColor(item.category, index);
        const path = describeDonutSlice(60, 60, 52, 34, startAngle, endAngle);
        startAngle = endAngle;
        return `<path class="pie-slice ${selected ? "active" : ""}" d="${path}" fill="${color}" fill-rule="evenodd" data-category="${item.category}" data-index="${index}" />`;
      })
      .join("")}
  </svg>`;

  elements.categoryDonut.querySelectorAll("[data-category]").forEach((slice) => {
    const activate = () => {
      const item = grouped.find((entry) => entry.category === slice.dataset.category);
      if (!item) return;
      state.activeAnalysisCategory = item.category;
      updateAnalysisFocus(item, total);
      elements.categoryDonut.querySelectorAll(".pie-slice").forEach((entry) => entry.classList.toggle("active", entry === slice));
    };
    slice.addEventListener("pointerenter", activate);
    slice.addEventListener("click", activate);
    slice.addEventListener("touchstart", activate, { passive: true });
  });
}

function updateAnalysisFocus(item, total) {
  const share = Math.round((item.total / total) * 100);
  const typeLabel = state.analysisType === "expense" ? "saídas" : "entradas";
  elements.topCategory.textContent = capitalize(item.category);
  elements.topCategoryCopy.textContent = `${share}% das ${typeLabel} em ${periodLabel("analysis").toLowerCase()}. ${currency.format(item.total)} no total.`;
  elements.donutCenter.textContent = `${share}%`;
}

function renderInsightCard(insight) {
  return `<article class="insight-card ${insight.tone}">
    <span class="insight-badge">${insight.badge}</span>
    <strong>${insight.title}</strong>
    <p>${insight.copy}</p>
  </article>`;
}

function renderEmptyState(title, copy) {
  return `<div class="empty-state">
    <span></span>
    <strong>${title}</strong>
    <p>${copy}</p>
  </div>`;
}

function buildInsights(totals) {
  const grouped = groupExpensesByCategory();
  const top = grouped[0];
  const smallExpenses = state.movements.filter((movement) => movement.type === "expense" && movement.amount <= 50);
  const smallTotal = smallExpenses.reduce((sum, movement) => sum + movement.amount, 0);
  const last7 = sumByPeriod(7);
  const previous7 = sumByPeriod(14, 7);
  const insights = [];

  if (top) {
    insights.push({
      badge: "Maior impacto",
      tone: "impact",
      title: `${capitalize(top.category)} está puxando o ciclo`,
      copy: `${currency.format(top.total)} foram para ${top.category}. É o melhor ponto para olhar primeiro.`,
    });
  }

  if (totals.expense > totals.income && totals.income > 0) {
    insights.push({
      badge: "Atenção",
      tone: "alert",
      title: "Saiu mais do que entrou",
      copy: `As saídas passaram as entradas em ${currency.format(totals.expense - totals.income)}.`,
    });
  } else if (totals.income > 0) {
    insights.push({
      badge: "Bom sinal",
      tone: "good",
      title: "Ainda existe margem",
      copy: `${currency.format(totals.balance)} seguem preservados depois das saídas registradas.`,
    });
  }

  if (smallExpenses.length) {
    insights.push({
      badge: "Pequenos gastos",
      tone: "soft",
      title: "O detalhe já aparece",
      copy: `${smallExpenses.length} gastos de até R$ 50 somam ${currency.format(smallTotal)}.`,
    });
  }

  if (last7 > previous7 && previous7 > 0) {
    insights.push({
      badge: "Últimos 7 dias",
      tone: "alert",
      title: "A semana acelerou",
      copy: `${currency.format(last7 - previous7)} a mais em gastos que a semana anterior.`,
    });
  } else if (last7 > 0) {
    insights.push({
      badge: "Últimos 7 dias",
      tone: "soft",
      title: "Ritmo recente mapeado",
      copy: `Suas saídas recentes somaram ${currency.format(last7)}.`,
    });
  }

  if (!insights.length) {
    insights.push({
      badge: "Primeiro passo",
      tone: "soft",
      title: "Comece com um registro",
      copy: "O Pulso fica útil assim que você adiciona uma entrada ou saída.",
    });
  }

  return insights;
}

function showToast(message, tone = "success") {
  elements.saveToast.textContent = message;
  elements.saveToast.dataset.tone = tone;
  elements.saveToast.classList.remove("show");
  requestAnimationFrame(() => elements.saveToast.classList.add("show"));
  clearTimeout(showToast.timeout);
  showToast.timeout = setTimeout(() => elements.saveToast.classList.remove("show"), 1800);
}

function sanitizeMoneyInput(value) {
  return value
    .replace(/[^\d,.]/g, "")
    .replace(/(,.*),/g, "$1")
    .replace(/(\..*)\./g, "$1");
}

function parseMoney(value) {
  if (typeof value === "number") return value;
  const raw = String(value).trim();
  const normalized = raw.includes(",")
    ? raw.replace(/\./g, "").replace(",", ".").replace(/[^\d.]/g, "")
    : raw.replace(/[^\d.]/g, "");
  return Number(normalized) || 0;
}

function formatMoneyInput(value) {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function getTotals() {
  return state.movements.reduce(
    (totals, movement) => {
      totals[movement.type] += movement.amount;
      totals.balance = totals.income - totals.expense;
      return totals;
    },
    { income: 0, expense: 0, balance: 0 },
  );
}

function groupExpensesByCategory() {
  return groupMovementsByCategory("expense");
}

function groupMovementsByCategory(type) {
  const map = new Map();
  state.movements
    .filter((movement) => movement.type === type)
    .forEach((movement) => {
      const category = movement.category || getCategoryNameById(movement.categoryId);
      const current = map.get(category) || { category, total: 0, count: 0 };
      current.total += movement.amount;
      current.count += 1;
      map.set(category, current);
    });

  return [...map.values()].sort((a, b) => b.total - a.total);
}

function buildDonutGradient(grouped, total) {
  let start = 0;
  const slices = grouped.map((item) => {
    const degrees = total ? (item.total / total) * 360 : 0;
    const end = start + degrees;
    const slice = `${getCategoryMeta(item.category).color} ${start}deg ${end}deg`;
    start = end;
    return slice;
  });
  return `conic-gradient(${slices.join(", ")})`;
}

function describeDonutSlice(cx, cy, outerRadius, innerRadius, startAngle, endAngle) {
  const angle = endAngle - startAngle;
  const gap = angle > 12 ? 1.6 : angle > 4 ? 0.7 : 0;
  const start = startAngle + gap / 2;
  const end = endAngle - gap / 2;

  if (angle >= 359.9) {
    return [
      `M ${cx} ${cy - outerRadius}`,
      `A ${outerRadius} ${outerRadius} 0 1 1 ${cx - 0.01} ${cy - outerRadius}`,
      `A ${outerRadius} ${outerRadius} 0 1 1 ${cx} ${cy - outerRadius}`,
      `M ${cx} ${cy - innerRadius}`,
      `A ${innerRadius} ${innerRadius} 0 1 0 ${cx - 0.01} ${cy - innerRadius}`,
      `A ${innerRadius} ${innerRadius} 0 1 0 ${cx} ${cy - innerRadius}`,
      "Z",
    ].join(" ");
  }

  const outerStart = polarToCartesian(cx, cy, outerRadius, start);
  const outerEnd = polarToCartesian(cx, cy, outerRadius, end);
  const innerEnd = polarToCartesian(cx, cy, innerRadius, end);
  const innerStart = polarToCartesian(cx, cy, innerRadius, start);
  const largeArcFlag = end - start > 180 ? "1" : "0";

  return [
    "M", outerStart.x, outerStart.y,
    "A", outerRadius, outerRadius, 0, largeArcFlag, 1, outerEnd.x, outerEnd.y,
    "L", innerEnd.x, innerEnd.y,
    "A", innerRadius, innerRadius, 0, largeArcFlag, 0, innerStart.x, innerStart.y,
    "Z",
  ].join(" ");
}

function polarToCartesian(cx, cy, radius, angle) {
  const radians = (angle * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(radians),
    y: cy + radius * Math.sin(radians),
  };
}

function getCategoryColor(category, index = 0) {
  const fallback = ["#2ee7ff", "#5dffb1", "#ffd166", "#ff6f91", "#7aa7ff", "#9dffea", "#f4fbff", "#8aa1b8"];
  const meta = categoryMeta[category];
  return meta?.color || fallback[index % fallback.length];
}

function sumByPeriod(daysBack, startOffset = 0) {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  end.setDate(end.getDate() - startOffset);

  const start = new Date(end);
  start.setDate(start.getDate() - daysBack);
  start.setHours(0, 0, 0, 0);

  return state.movements
    .filter((movement) => movement.type === "expense")
    .filter((movement) => {
      const date = new Date(`${movement.date}T12:00:00`);
      return date >= start && date <= end;
    })
    .reduce((sum, movement) => sum + movement.amount, 0);
}

function sortMovements(movements) {
  return [...movements].sort((a, b) => new Date(`${b.date}T12:00:00`) - new Date(`${a.date}T12:00:00`));
}

function getCategoriesForType(type) {
  return state.categories[type] || defaultCategoriesByType[type];
}

function canDeleteCategory(category) {
  return !sameCategory(category, "outros");
}

function isDefaultCategory(type, category) {
  return getCategoryRecord(type, category)?.isDefault || false;
}

function isCustomCategory(type, category) {
  return Boolean(getCategoryRecord(type, category) && !getCategoryRecord(type, category).isDefault);
}

function cloneDefaultCategories() {
  return {
    income: [...defaultCategoriesByType.income],
    expense: [...defaultCategoriesByType.expense],
  };
}

function normalizeCategoryName(value) {
  return String(value || "").trim().replace(/\s+/g, " ").toLocaleLowerCase("pt-BR");
}

function sameCategory(left, right) {
  return String(left || "").toLocaleLowerCase("pt-BR") === String(right || "").toLocaleLowerCase("pt-BR");
}

function getCategoryRecord(type, categoryName) {
  return (state.categoryRecords[type] || []).find((item) => sameCategory(item.name, categoryName));
}

function getCategoryNameById(categoryId) {
  for (const type of ["income", "expense"]) {
    const record = (state.categoryRecords[type] || []).find((item) => item.id === categoryId);
    if (record) return record.name;
  }
  return "outros";
}

function getCategoryIdByName(type, categoryName) {
  return getCategoryRecord(type, categoryName)?.id || "";
}

function periodLabel(tab) {
  const labels = {
    summary: "Ciclo ativo",
    history: "Lançamentos do ciclo",
    analysis: "Ciclo ativo",
    insights: "Leituras do ciclo",
    cycles: "Histórico de ciclos",
  };
  return labels[tab] || "Ciclo ativo";
}

function formatDate(date) {
  const parsed = new Date(`${date}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return "—";
  return dateFormatter.format(parsed).replace(".", "");
}

function formatCycleTitle(cycle) {
  if (!cycle) return "Ciclo atual";
  return cycle.status === "closed" && cycle.label ? cycle.label : "Ciclo atual";
}

function formatCyclePeriod(cycle) {
  if (!cycle) return "Ciclo atual";
  const started = formatDate(cycle.startedAt);
  if (cycle.status === "closed" && cycle.closedAt) {
    const ended = formatDate(cycle.closedAt);
    if (started === "—" || ended === "—") return "Ciclo fechado";
    return `${started} - ${ended}`;
  }
  if (started === "—") return "Ciclo atual";
  return `Aberto em ${formatDate(cycle.startedAt)}`;
}

function offsetDate(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function getCategoryMeta(category) {
  return categoryMeta[category] || categoryMeta.outros;
}

function categoryIcon(category) {
  return getCategoryMeta(category).icon;
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (char) => {
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    }[char];
  });
}
