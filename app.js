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
  goals: [],
  movements: [],
  activeTab: "summary",
  activeFilter: "all",
  formType: "expense",
  selectedCategory: "",
  analysisHoveredCategory: "",
  receiptDraft: {
    file: null,
    previewUrl: "",
    mode: "",
    existing: null,
    removeExisting: false,
    processing: false,
    selectionToken: 0,
  },
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
  pendingDeleteGoal: "",
  pendingCloseCycle: false,
  sectionSwitcherOpen: false,
  sectionSwitcherCloseTimer: null,
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
  goalReserveNote: $("#goal-reserve-note"),
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
  goalsHeroAvailable: $("#goals-hero-available"),
  goalsHeroCopy: $("#goals-hero-copy"),
  goalsSavedTotal: $("#goals-total-saved"),
  goalsCountInline: $("#goals-count-inline"),
  goalsCount: $("#goals-count"),
  goalsFeedback: $("#goal-feedback"),
  goalList: $("#goal-list"),
  openGoalSheet: $("#open-goal-sheet"),
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
  receiptPanel: $("#receipt-panel"),
  receiptStatus: $("#receipt-status"),
  receiptPreview: $("#receipt-preview"),
  receiptHint: $("#receipt-hint"),
  receiptOpen: $("#receipt-open"),
  receiptReplace: $("#receipt-replace"),
  receiptRemove: $("#receipt-remove"),
  receiptInput: $("#receipt-input"),
  receiptCamera: $("#receipt-camera"),
  receiptGallery: $("#receipt-gallery"),
  receiptPdf: $("#receipt-pdf"),
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
  goalSheet: $("#goal-sheet"),
  goalForm: $("#goal-form"),
  goalSheetTitle: $("#goal-sheet-title"),
  goalId: $("#goal-id"),
  goalName: $("#goal-name"),
  goalTarget: $("#goal-target"),
  saveGoal: $("#save-goal"),
  goalAmountSheet: $("#goal-amount-sheet"),
  goalAmountForm: $("#goal-amount-form"),
  goalAmountSheetTitle: $("#goal-amount-title"),
  goalAmountSheetCopy: $("#goal-amount-copy"),
  goalActionId: $("#goal-action-id"),
  goalActionMode: $("#goal-action-mode"),
  goalAmount: $("#goal-amount"),
  goalAmountNote: $("#goal-amount-note"),
  confirmGoalAmount: $("#confirm-goal-amount"),
  sectionSwitcherShell: $("#section-switcher-shell"),
  sectionSwitcher: $("#section-switcher"),
  sectionSwitcherLabel: $("#section-switcher-label"),
  sectionSwitcherCopy: $("#section-switcher-copy"),
  sectionSwitcherPanel: $("#section-switcher-panel"),
};

const sectionSwitcherItems = [
  { tab: "summary", label: "Resumo", copy: "Ciclo ativo" },
  { tab: "history", label: "Histórico", copy: "Linha do tempo" },
  { tab: "analysis", label: "Análise", copy: "Gastos e receitas" },
  { tab: "insights", label: "Insights", copy: "Leituras do ciclo" },
  { tab: "goals", label: "Metas", copy: "Cofrinhos do ciclo" },
  { tab: "cycles", label: "Ciclos", copy: "Histórico fechado" },
];

init();

function init() {
  bindViewportContext();
  bindEvents();
  renderSectionSwitcherPanel();
  syncSectionSwitcher();
  window.addEventListener("pageshow", () => {
    sanitizeUiState();
  });
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

  if (isDesktop) {
    closeSectionSwitcher();
  } else {
    syncSectionSwitcher();
  }
}

async function bootApp() {
  sanitizeUiState();
  setAuthMode("loading");
  updateAuthShell();

  try {
    const me = await apiRequest("/auth/me");
    state.user = me.user;
    state.authStatus = "authenticated";
    setAuthMode("authenticated");
  } catch (error) {
    state.user = null;
    state.authStatus = "guest";
    setAuthMode("guest");
    updateAuthShell();
    if (error?.code !== "unauthorized") {
      setAuthMessage(authErrorMessage(error));
    }
    return;
  }

  try {
    await loadUserData();
  } catch (error) {
    if (handleUnauthorizedError(error)) return;
    showToast(authErrorMessage(error), "neutral");
  }

  updateAuthShell();
  render();
  closeSheet();
  maybeOfferMigration();
}

function sanitizeUiState() {
  closeSheet();
  closeCategorySheet();
  closeMigrationSheet();
  closeGoalSheet();
  closeGoalAmountSheet();
  closeCycleSheet();
  closeCycleDetailSheet();
  state.analysisHoveredCategory = "";
  state.sectionSwitcherOpen = false;
  clearTimeout(state.sectionSwitcherCloseTimer);
  syncSectionSwitcher();
  resetReceiptDraft();
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

function formatFileSize(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "";
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(bytes >= 10 * 1024 * 1024 ? 0 : 1)} MB`;
  return `${Math.max(Math.round(bytes / 1024), 1)} KB`;
}

function renderReceiptPreview(receipt) {
  if (!receipt) {
    return `<div class="receipt-empty">
      <strong>Sem comprovante</strong>
      <span>Tire uma foto, escolha uma imagem ou anexe um PDF.</span>
    </div>`;
  }

  const isPdf = receipt.kind === "pdf" || receipt.mimeType === "application/pdf";
  const label = escapeHtml(receipt.originalName || receipt.file?.name || "Comprovante");
  const size = receipt.file ? receipt.file.size : Number(receipt.size || 0);
  const sizeLabel = size ? formatFileSize(size) : "";
  const url = resolveReceiptUrl(receipt.previewUrl || receipt.url || "");

  return `
    <div class="receipt-preview ${isPdf ? "pdf" : "image"}">
      <div class="receipt-preview-media">
        ${
          isPdf
            ? `<div class="receipt-pdf-mark" aria-hidden="true">PDF</div>`
            : `<img src="${escapeHtml(url)}" alt="${label}" />`
        }
      </div>
      <div class="receipt-preview-copy">
        <strong>${label}</strong>
        <span>${isPdf ? "Documento PDF" : "Imagem"}${sizeLabel ? ` · ${sizeLabel}` : ""}</span>
      </div>
    </div>`;
}

function openReceiptPicker(mode) {
  if (!elements.receiptInput || state.formType !== "expense") return;
  elements.receiptInput.value = "";
  elements.receiptInput.removeAttribute("capture");

  if (mode === "pdf") {
    elements.receiptInput.accept = "application/pdf,.pdf";
  } else {
    elements.receiptInput.accept = "image/*";
    if (mode === "camera") {
      elements.receiptInput.setAttribute("capture", "environment");
    }
  }

  state.receiptDraft.mode = mode === "pdf" ? "pdf" : "image";
  elements.receiptInput.click();
}

function validateReceiptFile(file, options = {}) {
  if (!file) return "Selecione um arquivo válido.";
  const mimeType = isReceiptMimeAllowed(file);
  if (!mimeType) return "Use uma imagem JPG, JPEG, PNG, WEBP ou um PDF.";

  if (mimeType === "application/pdf") {
    const pdfLimit = 10 * 1024 * 1024;
    if (file.size > pdfLimit) {
      return "O PDF deve ter até 10 MB.";
    }
    return "";
  }

  if (!options.allowLargeImage && file.size > 5 * 1024 * 1024) {
    return "A imagem deve ter até 5 MB.";
  }
  return "";
}

function isReceiptMimeAllowed(file) {
  const mime = String(file?.type || "").toLowerCase();
  if (["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(mime)) return mime;
  const name = String(file?.name || "").toLowerCase();
  if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "image/jpeg";
  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".webp")) return "image/webp";
  if (name.endsWith(".pdf")) return "application/pdf";
  return "";
}

async function compressReceiptImage(file) {
  const source = await loadReceiptImageSource(file);
  const profiles = [
    { maxSide: 1800, quality: 0.82 },
    { maxSide: 1600, quality: 0.76 },
    { maxSide: 1400, quality: 0.7 },
  ];

  try {
    for (let index = 0; index < profiles.length; index += 1) {
      const profile = profiles[index];
      const blob = await renderReceiptImageBlob(source, profile.maxSide, profile.quality);
      if (blob.size <= 5 * 1024 * 1024 || index === profiles.length - 1) {
        const baseName = String(file.name || "comprovante").replace(/\.[^.]+$/, "") || "comprovante";
        return new File([blob], `${baseName}.jpg`, {
          type: "image/jpeg",
          lastModified: Date.now(),
        });
      }
    }
    return file;
  } finally {
    source.close();
  }
}

async function loadReceiptImageSource(file) {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file, {
        resizeWidth: 1800,
        resizeHeight: 1800,
        resizeQuality: "high",
      });
      return {
        width: bitmap.width,
        height: bitmap.height,
        draw(targetContext, width, height) {
          targetContext.drawImage(bitmap, 0, 0, width, height);
        },
        close() {
          bitmap.close();
        },
      };
    } catch {
      try {
        const bitmap = await createImageBitmap(file);
        return {
          width: bitmap.width,
          height: bitmap.height,
          draw(targetContext, width, height) {
            targetContext.drawImage(bitmap, 0, 0, width, height);
          },
          close() {
            bitmap.close();
          },
        };
      } catch {
        // fallback abaixo
      }
    }
  }

  const objectUrl = URL.createObjectURL(file);
  const image = new Image();
  image.decoding = "async";
  image.src = objectUrl;

  try {
    if (image.decode) {
      await image.decode();
    } else {
      await new Promise((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error("image_decode_failed"));
      });
    }
  } finally {
    URL.revokeObjectURL(objectUrl);
  }

  return {
    width: image.naturalWidth || image.width,
    height: image.naturalHeight || image.height,
    draw(targetContext, width, height) {
      targetContext.drawImage(image, 0, 0, width, height);
    },
    close() {},
  };
}

async function renderReceiptImageBlob(source, maxSide, quality) {
  const longestSide = Math.max(source.width, source.height);
  const scale = longestSide > maxSide ? maxSide / longestSide : 1;
  const width = Math.max(1, Math.round(source.width * scale));
  const height = Math.max(1, Math.round(source.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("receipt_canvas_failed");

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  source.draw(context, width, height);

  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob((result) => {
      if (result) resolve(result);
      else reject(new Error("receipt_encode_failed"));
    }, "image/jpeg", quality);
  });

  return blob;
}

async function applyReceiptSelection(file) {
  const mimeType = isReceiptMimeAllowed(file);
  if (!mimeType) {
    const message = "Use uma imagem JPG, JPEG, PNG, WEBP ou um PDF.";
    showToast(message, "neutral");
    if (elements.receiptStatus) elements.receiptStatus.textContent = message;
    return false;
  }

  const selectionToken = (state.receiptDraft.selectionToken || 0) + 1;
  state.receiptDraft.selectionToken = selectionToken;

  if (mimeType === "application/pdf") {
    const validation = validateReceiptFile(file);
    if (validation) {
      showToast(validation, "neutral");
      if (elements.receiptStatus) elements.receiptStatus.textContent = validation;
      return false;
    }

    if (state.receiptDraft.previewUrl) {
      URL.revokeObjectURL(state.receiptDraft.previewUrl);
    }

    state.receiptDraft.file = file;
    state.receiptDraft.previewUrl = URL.createObjectURL(file);
    state.receiptDraft.removeExisting = false;
    state.receiptDraft.mode = "pdf";
    syncReceiptPanel(true);
    return true;
  }

  state.receiptDraft.processing = true;
  syncReceiptPanel(true);

  try {
    const optimized = await compressReceiptImage(file);
    if (state.receiptDraft.selectionToken !== selectionToken) return false;
    const validation = validateReceiptFile(optimized, { allowLargeImage: false });
    if (validation) {
      showToast(validation, "neutral");
      if (elements.receiptStatus) elements.receiptStatus.textContent = validation;
      return false;
    }

    if (state.receiptDraft.previewUrl) {
      URL.revokeObjectURL(state.receiptDraft.previewUrl);
    }

    state.receiptDraft.file = optimized;
    state.receiptDraft.previewUrl = URL.createObjectURL(optimized);
    state.receiptDraft.removeExisting = false;
    state.receiptDraft.mode = "image";
    syncReceiptPanel(true);
    return true;
  } catch (error) {
    if (state.receiptDraft.selectionToken !== selectionToken) return false;
    const message = "Não conseguimos processar a imagem. Tente outra foto.";
    showToast(message, "neutral");
    if (elements.receiptStatus) elements.receiptStatus.textContent = message;
    return false;
  } finally {
    if (state.receiptDraft.selectionToken === selectionToken) {
      state.receiptDraft.processing = false;
      syncReceiptPanel(true);
    }
  }
}

function removeReceiptSelection() {
  if (state.receiptDraft.previewUrl) {
    URL.revokeObjectURL(state.receiptDraft.previewUrl);
  }

  state.receiptDraft.file = null;
  state.receiptDraft.previewUrl = "";
  state.receiptDraft.processing = false;
  state.receiptDraft.selectionToken += 1;

  if (state.receiptDraft.existing) {
    state.receiptDraft.removeExisting = true;
  }

  if (elements.receiptInput) {
    elements.receiptInput.value = "";
  }

  syncReceiptPanel(true);
}

function openCurrentReceipt() {
  const receipt = state.receiptDraft.file
    ? {
        url: state.receiptDraft.previewUrl,
      }
    : state.receiptDraft.existing;
  const url = resolveReceiptUrl(receipt?.url || "");
  if (!url) return;
  window.open(url, "_blank", "noopener,noreferrer");
}

function openCategorySheet() {
  closeGoalSheet();
  closeGoalAmountSheet();
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
  if (state.receiptDraft.processing) {
    showToast("Aguarde a imagem terminar de processar.", "neutral");
    return;
  }
  const isEditing = Boolean(elements.movementId.value);
  const categoryName = elements.category.value || state.selectedCategory;
  const categoryId = getCategoryIdByName(state.formType, categoryName);
  const currentMovement = isEditing ? state.movements.find((item) => item.id === elements.movementId.value) : null;

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

    let receiptError = null;
    const receiptFile = state.formType === "expense" ? state.receiptDraft.file : null;
    const shouldClearReceipt = Boolean(
      currentMovement?.receipt && (movement.type === "income" || (state.receiptDraft.removeExisting && !receiptFile)),
    );

    if (receiptFile) {
      try {
        const formData = new FormData();
        formData.append("file", receiptFile);
        await apiRequest(`/api/movements/${encodeURIComponent(movement.id)}/receipt`, {
          method: "POST",
          body: formData,
        });
      } catch (error) {
        receiptError = error;
      }
    } else if (shouldClearReceipt) {
      try {
        await apiRequest(`/api/movements/${encodeURIComponent(movement.id)}/receipt`, {
          method: "DELETE",
        });
      } catch (error) {
        receiptError = error;
      }
    }

    await loadUserData();
    setHistoryFilter("all");
    render({ pulse: true });
    if (receiptError) {
      elements.receiptStatus.textContent = authErrorMessage(receiptError);
      showToast(authErrorMessage(receiptError), "neutral");
      return;
    }

    closeSheet();
    resetReceiptDraft();
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
      setHistoryFilter("all");
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
  renderGoals(totals);
  renderCycles();
}

function renderSummary(totals, options = {}) {
  const spendRatio = totals.income ? Math.min(totals.expense / totals.income, 1) : 0;
  const degrees = Math.round(spendRatio * 360);
  const percent = Math.round(spendRatio * 100);
  const isEmpty = state.movements.length === 0;
  const currentCycle = state.currentCycle;
  const currentCycleLabel = currentCycle?.label || "Ciclo atual";
  const goalReserved = getGoalSavedTotal();
  const availableBalance = totals.balance - goalReserved;

  elements.summaryPeriod.textContent = currentCycle?.status === "active" ? "Ciclo ativo" : "Ciclo";
  elements.currentCycleLabel.textContent = currentCycleLabel;
  elements.currentCycleCopy.textContent = currentCycle
    ? currentCycle.status === "active"
      ? `Aberto em ${formatDate(currentCycle.startedAt)}. Nenhum lançamento é perdido ao fechar o ciclo.`
      : `Fechado em ${formatDate(currentCycle.closedAt || currentCycle.updatedAt)}.`
    : "Os lançamentos deste ciclo aparecem aqui.";
  elements.balance.textContent = currency.format(availableBalance);
  elements.income.textContent = currency.format(totals.income);
  elements.expense.textContent = currency.format(totals.expense);
  elements.balanceNote.textContent = isEmpty
    ? "Comece com um lançamento e o Pulso desenha o ciclo atual."
    : availableBalance >= 0
      ? "O ciclo ainda respira bem. Dá para seguir com calma."
      : "O ciclo ficou no vermelho. Ainda dá para ajustar cedo.";
  if (elements.goalReserveNote) {
    elements.goalReserveNote.hidden = goalReserved <= 0;
    elements.goalReserveNote.textContent = goalReserved > 0 ? `${currency.format(goalReserved)} guardados em metas neste ciclo.` : "";
  }
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

  elements.historyList.querySelectorAll(".row-actions").forEach((details) => {
    const item = details.closest(".movement-item");
    const syncState = () => item?.classList.toggle("has-actions-open", details.open);
    syncState();
    details.addEventListener("toggle", syncState);
  });
}

function setHistoryFilter(filter) {
  state.activeFilter = filter;
  $$(".filter-pill").forEach((pill) => pill.classList.toggle("active", pill.dataset.filter === filter));
  renderHistory();
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

  const hovered = grouped.find((item) => sameCategory(item.category, state.analysisHoveredCategory)) || null;
  const active = grouped.find((item) => sameCategory(item.category, state.activeAnalysisCategory)) || null;
  const focused = hovered || active || top;
  const movementLabel = state.analysisType === "expense" ? "saídas" : "entradas";
  updateAnalysisFocus(focused, typeTotal);
  elements.categoryBars.innerHTML = grouped.map((item) => renderCategoryRow(item, typeTotal, movementLabel, sameCategory(item.category, state.activeAnalysisCategory))).join("");
  renderPieChart(grouped, typeTotal);
  syncAnalysisVisualState(grouped, typeTotal);
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
      const receiptAction = movement.receipt
        ? `<a class="receipt-chip" href="${escapeHtml(resolveReceiptUrl(movement.receipt.url))}" target="_blank" rel="noopener noreferrer">${movement.receipt.kind === "pdf" ? "PDF" : "Comprovante"}</a>`
        : "";
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
          ${receiptAction ? `<div class="movement-receipt">${receiptAction}</div>` : ""}
          ${actions}
        </div>
      </article>`;
    })
    .join("");
}

function renderCategoryRow(item, total, movementLabel, expanded = false) {
  const share = Math.round((item.total / total) * 100);
  const meta = getCategoryMeta(item.category);
  const movements = expanded ? renderAnalysisMovements(item.category) : "";
  return `<article class="category-row ${expanded ? "expanded" : ""}" data-category="${escapeHtml(item.category)}" style="--category-color:${meta.color}">
    <button class="category-row-toggle" type="button" data-category-toggle="${escapeHtml(item.category)}" aria-expanded="${expanded}">
      <div class="category-meta">
        <span><i>${meta.icon}</i>${capitalize(item.category)}</span>
        <strong>${currency.format(item.total)}</strong>
      </div>
      <div class="bar-track"><div class="bar-fill" style="width:${share}%"></div></div>
      <div class="category-values">
        <span>${share}% das ${movementLabel}</span>
        <span>${item.count} movimento${item.count === 1 ? "" : "s"}</span>
      </div>
    </button>
    ${movements ? `<div class="category-expand" aria-label="Movimentações de ${escapeHtml(item.category)}">${movements}</div>` : ""}
  </article>`;
}

function renderPieChart(grouped, total) {
  if (grouped.length === 1) {
    const item = grouped[0];
    const color = getCategoryColor(item.category, 0);
    const radius = 34;
    const strokeWidth = 18;
    const circumference = (2 * Math.PI * radius).toFixed(3);

    elements.categoryDonut.innerHTML = `<svg viewBox="0 0 120 120" role="img" aria-label="Distribuição por categoria">
      <circle class="pie-track" cx="60" cy="60" r="${radius}" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="${strokeWidth}" />
      <circle class="pie-slice single" cx="60" cy="60" r="${radius}" fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-dasharray="${circumference}" stroke-dashoffset="0" data-category="${escapeHtml(item.category)}" data-index="0" />
    </svg>`;
  } else {
    let startAngle = -90;
    elements.categoryDonut.innerHTML = `<svg viewBox="0 0 120 120" role="img" aria-label="Distribuição por categoria">
      ${grouped
        .map((item, index) => {
          const angle = (item.total / total) * 360;
          const endAngle = startAngle + angle;
          const color = getCategoryColor(item.category, index);
          const path = describeDonutSlice(60, 60, 52, 34, startAngle, endAngle);
          startAngle = endAngle;
          return `<path class="pie-slice" d="${path}" fill="${color}" fill-rule="evenodd" data-category="${item.category}" data-index="${index}" />`;
        })
        .join("")}
    </svg>`;
  }

  bindAnalysisInteractions(grouped, total);
}

function bindAnalysisInteractions(grouped, total) {
  const activateHover = (category, pointerType = "mouse") => {
    if (!category) return;
    if (pointerType && pointerType !== "mouse") return;
    if (sameCategory(state.analysisHoveredCategory, category)) return;
    state.analysisHoveredCategory = category;
    syncAnalysisVisualState(grouped, total);
  };

  const clearHover = (category) => {
    if (category && !sameCategory(state.analysisHoveredCategory, category)) return;
    if (!state.analysisHoveredCategory) return;
    state.analysisHoveredCategory = "";
    syncAnalysisVisualState(grouped, total);
  };

  elements.categoryDonut.querySelectorAll("[data-category]").forEach((slice) => {
    const category = slice.dataset.category || "";
    slice.addEventListener("pointerenter", (event) => activateHover(category, event.pointerType));
    slice.addEventListener("pointerleave", () => clearHover(category));
    slice.addEventListener("click", () => {
      if (!category) return;
      state.activeAnalysisCategory = sameCategory(state.activeAnalysisCategory, category) ? "" : category;
      state.analysisHoveredCategory = "";
      renderAnalysis(getTotals());
    });
  });

  elements.categoryBars.querySelectorAll("[data-category-toggle]").forEach((button) => {
    const category = button.dataset.categoryToggle || "";
    button.addEventListener("pointerenter", (event) => activateHover(category, event.pointerType));
    button.addEventListener("pointerleave", () => clearHover(category));
  });
}

function syncAnalysisVisualState(grouped, total) {
  if (!grouped.length) return;

  const hovered = grouped.find((item) => sameCategory(item.category, state.analysisHoveredCategory)) || null;
  const selected = grouped.find((item) => sameCategory(item.category, state.activeAnalysisCategory)) || null;
  const focus = hovered || selected || grouped[0];
  const focusTotal = typeof total === "number" ? total : grouped.reduce((sum, item) => sum + item.total, 0);
  const share = Math.round((focus.total / focusTotal) * 100);
  const typeLabel = state.analysisType === "expense" ? "saídas" : "entradas";
  const focusCategory = focus.category;

  elements.topCategory.textContent = capitalize(focusCategory);
  elements.topCategoryCopy.textContent = `${share}% das ${typeLabel} em ${periodLabel("analysis").toLowerCase()}. ${currency.format(focus.total)} no total.`;
  elements.donutCenter.textContent = `${share}%`;

  elements.categoryDonut.querySelectorAll("[data-category]").forEach((slice) => {
    slice.classList.toggle("active", sameCategory(slice.dataset.category, focusCategory));
  });

  elements.categoryBars.querySelectorAll(".category-row").forEach((row) => {
    const category = row.dataset.category || "";
    const isSelected = sameCategory(category, state.activeAnalysisCategory);
    const isHovered = sameCategory(category, state.analysisHoveredCategory);
    row.classList.toggle("expanded", isSelected);
    row.classList.toggle("is-hovered", isHovered);
    row.classList.toggle("is-selected", isSelected);
    const toggle = row.querySelector(".category-row-toggle");
    if (toggle) toggle.setAttribute("aria-expanded", String(isSelected));
  });
}

function renderAnalysisMovements(category) {
  const movements = sortMovements(state.movements).filter((movement) => movement.type === state.analysisType && sameCategory(movement.category || getCategoryNameById(movement.categoryId), category));
  if (!movements.length) {
    return `<div class="category-expand-empty">${renderEmptyState("Sem movimentações", "Esta categoria ainda não tem lançamentos neste ciclo.")}</div>`;
  }

  return `<div class="category-expand-list">${renderMovementList(movements, {
    empty: "Sem movimentações",
  })}</div>`;
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
      copy: `${currency.format(top.total)} foram para ${top.category}. �? o melhor ponto para olhar primeiro.`,
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
      badge: "�sltimos 7 dias",
      tone: "alert",
      title: "A semana acelerou",
      copy: `${currency.format(last7 - previous7)} a mais em gastos que a semana anterior.`,
    });
  } else if (last7 > 0) {
    insights.push({
      badge: "�sltimos 7 dias",
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

function getGoalSavedTotal() {
  return state.goals.reduce((sum, goal) => sum + Number(goal.savedAmount || 0), 0);
}

function getAvailableBalance(totals = getTotals(), reserved = getGoalSavedTotal()) {
  return Number(totals.balance || 0) - Number(reserved || 0);
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

function normalizeGoalName(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
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
    goals: "Cofrinhos do ciclo",
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

function getAppBasePath() {
  const pathname = String(window.location?.pathname || "/");
  const segment = pathname.split("/").filter(Boolean)[0] || "";
  return segment.toLowerCase() === "pulso" ? "/pulso" : "";
}

function resolveAppUrl(pathname) {
  if (!pathname) return "";
  if (/^(?:[a-z]+:|\/\/|blob:|data:)/i.test(pathname)) return pathname;

  const basePath = getAppBasePath();
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  if (!basePath) return path;
  if (path === basePath || path.startsWith(`${basePath}/`)) return path;
  return `${basePath}${path}`;
}

function resolveReceiptUrl(url) {
  if (!url) return "";
  if (/^(?:[a-z]+:|\/\/|blob:|data:)/i.test(url)) return url;
  return resolveAppUrl(url);
}

async function apiRequest(url, options = {}) {
  const body = options.body;
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
  const isBlob = typeof Blob !== "undefined" && body instanceof Blob;
  const headers = { ...(options.headers || {}) };
  let requestBody = body;

  if (body && !isFormData && !isBlob && typeof body === "object" && !(body instanceof ArrayBuffer)) {
    headers["Content-Type"] = headers["Content-Type"] || "application/json";
    requestBody = JSON.stringify(body);
  }

  let response;
  try {
    response = await fetch(resolveAppUrl(url), {
      method: options.method || "GET",
      credentials: "include",
      headers,
      body: requestBody,
    });
  } catch (cause) {
    const error = new Error("Não conseguimos conectar ao servidor.");
    error.code = "network_error";
    error.cause = cause;
    throw error;
  }

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

function setAuthMessage(message) {
  elements.authMessage.textContent = message || "";
}

function authErrorMessage(error) {
  if (!error) return "Nao foi possivel continuar.";
  if (error.code === "email_in_use") return "Esse e-mail ja esta em uso.";
  if (error.code === "invalid_credentials") return "E-mail ou senha invalidos.";
  if (error.code === "unauthorized") return "Sua sessao expirou. Entre novamente.";
  if (error.code === "network_error") return "Não conseguimos conectar ao servidor.";
  return error.message || "Nao foi possivel continuar.";
}

function handleUnauthorizedError(error) {
  if (error?.code !== "unauthorized") return false;
  void logout();
  return true;
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
  state.goals = [];
  state.movements = [];
  state.selectedCategory = "";
  state.activeTab = "summary";
  state.activeFilter = "all";
  state.formType = "expense";
  state.analysisType = "expense";
  state.activeAnalysisCategory = "";
  state.analysisHoveredCategory = "";
  state.pendingDeleteCategory = "";
  state.pendingDeleteGoal = "";
  state.pendingCloseCycle = false;
  state.sectionSwitcherOpen = false;
  clearTimeout(state.sectionSwitcherCloseTimer);
  state.authStatus = "guest";
  setAuthMode("guest");
  updateAuthShell();
  setAuthTab("login");
  closeSheet();
  closeCategorySheet();
  closeMigrationSheet();
  closeGoalSheet();
  closeGoalAmountSheet();
  closeCycleSheet();
  closeCycleDetailSheet();
  resetReceiptDraft();
  render();
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

async function loadUserData() {
  const bootstrap = await apiRequest("/api/bootstrap");
  state.user = bootstrap.user || state.user;
  state.currentCycle = normalizeCyclePayload(bootstrap.currentCycle);
  state.cycles = normalizeCyclesPayload(bootstrap.cycles);
  state.goals = normalizeGoalsPayload(bootstrap.goals);
  applyCategoryPayload(bootstrap.categories);
  state.movements = normalizeMovementsPayload(bootstrap.movements);
  state.cycleDetail = null;

  if (!getCategoriesForType(state.formType).includes(state.selectedCategory)) {
    state.selectedCategory = "";
  }

  updateCategoryField();
  syncReceiptPanel();
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
  elements.migrationNote.textContent = "Isso não apaga os dados locais de origem até a importação concluir.";
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

function normalizeCyclePayload(item) {
  if (!item) return null;
  return {
    id: item.id,
    userId: item.userId,
    label: item.label,
    status: item.status,
    startedAt: item.startedAt,
    closedAt: item.closedAt,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    incomeTotal: Number(item.incomeTotal || 0),
    expenseTotal: Number(item.expenseTotal || 0),
    balance: Number(item.balance || 0),
    movementCount: Number(item.movementCount || 0),
  };
}

function normalizeCyclesPayload(items) {
  return Array.isArray(items) ? items.map(normalizeCyclePayload).filter(Boolean) : [];
}

function normalizeGoalsPayload(items) {
  return Array.isArray(items)
    ? items.map((item) => ({
        id: item.id,
        cycleId: item.cycleId,
        name: normalizeGoalName(item.name),
        slug: item.slug,
        targetAmount: Number(item.targetAmount || 0),
        savedAmount: Number(item.savedAmount || 0),
        remainingAmount: Number(item.remainingAmount || 0),
        progress: Number(item.progress || 0),
      }))
    : [];
}

function normalizeMovementsPayload(items) {
  return Array.isArray(items)
    ? items.map((item) => ({
        id: item.id,
        type: item.type,
        amount: Number(item.amount),
        categoryId: item.categoryId,
        category: normalizeCategoryName(item.categoryName || item.category || ""),
        description: item.description,
        date: item.date,
        receipt: item.receipt
          ? {
              storedName: item.receipt.storedName || item.receipt.stored_name || null,
              originalName: item.receipt.originalName || item.receipt.original_name || null,
              mimeType: item.receipt.mimeType || item.receipt.mime_type || null,
              size: Number(item.receipt.size || item.receipt.receiptSize || 0),
              uploadedAt: item.receipt.uploadedAt || item.receipt.uploaded_at || null,
              url: item.receipt.url || "",
              kind: item.receipt.kind || (item.receipt.mimeType === "application/pdf" ? "pdf" : "image"),
            }
          : null,
      }))
    : [];
}

function resetReceiptDraft() {
  if (state.receiptDraft.previewUrl) {
    URL.revokeObjectURL(state.receiptDraft.previewUrl);
  }

  state.receiptDraft.file = null;
  state.receiptDraft.previewUrl = "";
  state.receiptDraft.mode = "";
  state.receiptDraft.existing = null;
  state.receiptDraft.removeExisting = false;
  state.receiptDraft.processing = false;
  state.receiptDraft.selectionToken += 1;

  if (elements.receiptInput) {
    elements.receiptInput.value = "";
  }

  syncReceiptPanel();
}

function syncReceiptPanel() {
  if (!elements.receiptPanel) return;

  const visible = state.formType === "expense";
  elements.receiptPanel.hidden = !visible;
  if (!visible) return;

  const activeReceipt = state.receiptDraft.file
    ? {
        kind: state.receiptDraft.mode === "pdf" || state.receiptDraft.file.type === "application/pdf" ? "pdf" : "image",
        originalName: state.receiptDraft.file.name,
        mimeType: state.receiptDraft.file.type,
        size: state.receiptDraft.file.size,
        previewUrl: state.receiptDraft.previewUrl,
        url: state.receiptDraft.previewUrl,
      }
    : state.receiptDraft.removeExisting
      ? null
      : state.receiptDraft.existing;

  elements.receiptStatus.textContent = state.receiptDraft.processing
    ? "Processando imagem..."
    : activeReceipt
      ? state.receiptDraft.file
        ? "Comprovante pronto para salvar."
        : "Comprovante anexado neste lançamento."
      : state.receiptDraft.removeExisting
        ? "Comprovante marcado para remoção."
        : "Adicione uma imagem ou PDF ao lançamento.";

  elements.receiptPreview.innerHTML = renderReceiptPreview(activeReceipt);

  const hasReceipt = Boolean(activeReceipt);
  elements.receiptOpen.hidden = !hasReceipt;
  elements.receiptReplace.hidden = !hasReceipt && !state.receiptDraft.existing;
  elements.receiptRemove.hidden = !hasReceipt && !state.receiptDraft.existing;
  elements.receiptOpen.disabled = !hasReceipt;
  elements.receiptHint.textContent = hasReceipt
    ? "Você pode abrir, substituir ou remover. Imagens até 5 MB, PDFs até 10 MB."
    : "Imagem até 5 MB, PDF até 10 MB.";
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

  if (elements.sectionSwitcher) {
    elements.sectionSwitcher.addEventListener("click", (event) => {
      event.preventDefault();
      toggleSectionSwitcher();
    });
  }

  document.addEventListener("pointerdown", (event) => {
    if (!state.sectionSwitcherOpen) return;
    if (!elements.sectionSwitcherShell) return;
    if (elements.sectionSwitcherShell.contains(event.target)) return;
    closeSectionSwitcher();
  }, true);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && state.sectionSwitcherOpen) {
      closeSectionSwitcher();
    }
  });

  $$("[data-open-tab]").forEach((button) => {
    button.addEventListener("click", () => setActiveTab(button.dataset.openTab));
  });

  $$(".filter-pill").forEach((button) => {
    button.addEventListener("click", () => {
      setHistoryFilter(button.dataset.filter);
    });
  });

  elements.analysisTypeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      state.analysisType = button.dataset.analysisType;
      state.activeAnalysisCategory = "";
      state.analysisHoveredCategory = "";
      elements.analysisTypeButtons.forEach((item) => item.classList.toggle("active", item === button));
      renderAnalysis(getTotals());
    });
  });

  elements.categoryBars.addEventListener("click", (event) => {
    const button = event.target.closest?.("[data-category-toggle]");
    if (!button || !elements.categoryBars.contains(button)) return;

    const category = button.dataset.categoryToggle || "";
    if (!category) return;
    state.analysisHoveredCategory = "";
    state.activeAnalysisCategory = sameCategory(state.activeAnalysisCategory, category) ? "" : category;
    renderAnalysis(getTotals());
  });

  $("#open-form").addEventListener("click", () => openSheet());
  elements.categorySelect.addEventListener("click", openCategorySheet);
  elements.receiptOpen.addEventListener("click", openCurrentReceipt);
  elements.receiptReplace.addEventListener("click", () => openReceiptPicker(state.receiptDraft.existing?.kind === "pdf" ? "pdf" : "image"));
  elements.receiptRemove.addEventListener("click", () => removeReceiptSelection());
  elements.receiptGallery.addEventListener("click", () => openReceiptPicker("image"));
  elements.receiptPdf.addEventListener("click", () => openReceiptPicker("pdf"));
  elements.receiptInput.addEventListener("change", () => {
    const file = elements.receiptInput.files?.[0] || null;
    if (file) {
      void applyReceiptSelection(file);
    } else {
      resetReceiptDraft();
    }
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

  $$("[data-close-goal-sheet]").forEach((element) => {
    element.addEventListener("click", closeGoalSheet);
  });

  $$("[data-close-goal-amount-sheet]").forEach((element) => {
    element.addEventListener("click", closeGoalAmountSheet);
  });

  $$("[data-close-cycle-sheet]").forEach((element) => {
    element.addEventListener("click", closeCycleSheet);
  });

  $$("[data-close-cycle-detail]").forEach((element) => {
    element.addEventListener("click", closeCycleDetailSheet);
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

  elements.goalTarget.addEventListener("input", () => {
    elements.goalTarget.value = sanitizeMoneyInput(elements.goalTarget.value);
  });
  elements.goalTarget.addEventListener("blur", () => {
    const amount = parseMoney(elements.goalTarget.value);
    elements.goalTarget.value = amount ? formatMoneyInput(amount) : "";
  });
  elements.goalTarget.addEventListener("focus", () => {
    elements.goalTarget.select();
  });

  elements.goalAmount.addEventListener("input", () => {
    elements.goalAmount.value = sanitizeMoneyInput(elements.goalAmount.value);
  });
  elements.goalAmount.addEventListener("blur", () => {
    const amount = parseMoney(elements.goalAmount.value);
    elements.goalAmount.value = amount ? formatMoneyInput(amount) : "";
  });
  elements.goalAmount.addEventListener("focus", () => {
    elements.goalAmount.select();
  });

  elements.form.addEventListener("submit", saveMovement);
  elements.goalForm.addEventListener("submit", saveGoal);
  elements.goalAmountForm.addEventListener("submit", submitGoalAmount);
  elements.saveCategory.addEventListener("click", () => {
    void saveNewCategory();
  });
  elements.newCategoryName.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      void saveNewCategory();
    }
  });

  elements.openGoalSheet.addEventListener("click", () => openGoalSheet());
  elements.openCloseCycle.addEventListener("click", () => openCloseCycleSheet());
  elements.openCloseCycleCta.addEventListener("click", () => openCloseCycleSheet());
  elements.confirmCloseCycle.addEventListener("click", () => {
    void confirmCloseCycle();
  });

  elements.goalList.addEventListener("click", (event) => {
    const saveButton = event.target.closest("[data-goal-save]");
    if (saveButton) {
      const goal = state.goals.find((item) => item.id === saveButton.dataset.goalSave);
      if (goal) openGoalAmountSheet(goal, "save");
      return;
    }

    const removeButton = event.target.closest("[data-goal-remove]");
    if (removeButton) {
      const goal = state.goals.find((item) => item.id === removeButton.dataset.goalRemove);
      if (goal) openGoalAmountSheet(goal, "remove");
      return;
    }

    const editButton = event.target.closest("[data-goal-edit]");
    if (editButton) {
      const goal = state.goals.find((item) => item.id === editButton.dataset.goalEdit);
      if (goal) openGoalSheet(goal);
      return;
    }

    const deleteButton = event.target.closest("[data-goal-delete]");
    if (deleteButton) {
      const goal = state.goals.find((item) => item.id === deleteButton.dataset.goalDelete);
      if (goal) requestGoalDelete(goal);
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
  document.body.dataset.activeTab = tab;
  if (tab !== "analysis") {
    state.analysisHoveredCategory = "";
  }
  $$(".nav-tab").forEach((button) => button.classList.toggle("active", button.dataset.tab === tab));
  $$(".tab-panel").forEach((panel) => panel.classList.toggle("active", panel.id === `tab-${tab}`));
  const panel = $(`#tab-${tab}`);
  elements.screenTitle.textContent = panel.dataset.title;
  elements.screenPeriod.textContent = tab === "history" ? "Linha do tempo" : periodLabel(tab);
  syncSectionSwitcher(tab);
  closeSectionSwitcher();
}

function renderSectionSwitcherPanel() {
  if (!elements.sectionSwitcherPanel) return;

  elements.sectionSwitcherPanel.innerHTML = sectionSwitcherItems
    .map((item) => `
      <button class="section-switcher-option" type="button" data-mobile-tab="${item.tab}">
        <strong>${item.label}</strong>
        <small>${item.copy}</small>
      </button>
    `)
    .join("");

  elements.sectionSwitcherPanel.querySelectorAll("[data-mobile-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      setActiveTab(button.dataset.mobileTab);
    });
  });
}

function syncSectionSwitcher(tab = state.activeTab) {
  if (!elements.sectionSwitcher || !elements.sectionSwitcherPanel) return;

  const current = sectionSwitcherItems.find((item) => item.tab === tab) || sectionSwitcherItems[0];
  elements.sectionSwitcherLabel.textContent = current?.label || "Seção";
  elements.sectionSwitcherCopy.textContent = current?.copy || periodLabel(tab);
  elements.sectionSwitcher.setAttribute("aria-expanded", String(state.sectionSwitcherOpen));
  elements.sectionSwitcherPanel.classList.toggle("open", state.sectionSwitcherOpen);
  elements.sectionSwitcherPanel.setAttribute("aria-hidden", String(!state.sectionSwitcherOpen));
  elements.sectionSwitcherPanel.querySelectorAll("[data-mobile-tab]").forEach((button) => {
    button.classList.toggle("active", button.dataset.mobileTab === tab);
    button.setAttribute("aria-current", button.dataset.mobileTab === tab ? "page" : "false");
  });
}

function openSectionSwitcher() {
  if (!elements.sectionSwitcherPanel) return;
  clearTimeout(state.sectionSwitcherCloseTimer);
  elements.sectionSwitcherPanel.hidden = false;
  state.sectionSwitcherOpen = true;
  syncSectionSwitcher();
}

function closeSectionSwitcher() {
  if (!elements.sectionSwitcherPanel) return;
  clearTimeout(state.sectionSwitcherCloseTimer);
  state.sectionSwitcherOpen = false;
  syncSectionSwitcher();
  state.sectionSwitcherCloseTimer = setTimeout(() => {
    if (!state.sectionSwitcherOpen && elements.sectionSwitcherPanel) {
      elements.sectionSwitcherPanel.hidden = true;
    }
  }, 220);
}

function toggleSectionSwitcher() {
  if (state.sectionSwitcherOpen) closeSectionSwitcher();
  else openSectionSwitcher();
}

function openSheet(movement = null) {
  elements.form.reset();
  elements.date.value = new Date().toISOString().slice(0, 10);
  elements.movementId.value = "";
  elements.formTitle.textContent = "Adicionar rápido";
  resetReceiptDraft();
  setFormType("expense", { preserveCategory: false });

  if (movement) {
    elements.formTitle.textContent = "Editar movimento";
    elements.movementId.value = movement.id;
    elements.amount.value = formatMoneyInput(movement.amount);
    elements.description.value = movement.description;
    elements.date.value = movement.date;
    setFormType(movement.type, { preserveCategory: true });
    selectCategory(movement.category || movement.categoryName || getCategoryNameById(movement.categoryId));
    state.receiptDraft.existing = movement.receipt || null;
    state.receiptDraft.removeExisting = false;
    syncReceiptPanel();
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
  if (type !== "expense") {
    resetReceiptDraft();
  } else {
    syncReceiptPanel();
  }
  updateCategoryField();
}

function selectCategory(category) {
  state.selectedCategory = category;
  updateCategoryField();
  if (elements.categorySheet && elements.categorySheet.classList.contains("open")) {
    renderCategoryList();
  }
}

function openGoalSheet(goal = null) {
  closeSheet();
  closeCategorySheet();
  closeCycleSheet();
  closeCycleDetailSheet();
  state.pendingDeleteGoal = "";
  clearTimeout(requestGoalDelete.timeout);
  if (elements.goalsFeedback) {
    elements.goalsFeedback.textContent = "";
    elements.goalsFeedback.classList.remove("show");
  }
  elements.goalForm.reset();
  elements.goalId.value = "";
  elements.goalSheetTitle.textContent = "Nova meta";
  elements.saveGoal.textContent = "Salvar meta";

  if (goal) {
    elements.goalId.value = goal.id;
    elements.goalSheetTitle.textContent = "Editar meta";
    elements.saveGoal.textContent = "Salvar alterações";
    elements.goalName.value = goal.name;
    elements.goalTarget.value = formatMoneyInput(goal.targetAmount);
  }

  elements.goalSheet.classList.add("open");
  elements.goalSheet.setAttribute("aria-hidden", "false");
  setTimeout(() => elements.goalName.focus(), 120);
}

function closeGoalSheet() {
  elements.goalSheet.classList.remove("open");
  elements.goalSheet.setAttribute("aria-hidden", "true");
}

function openGoalAmountSheet(goal, mode) {
  if (!goal || !mode) return;
  closeSheet();
  closeCategorySheet();
  closeCycleSheet();
  closeCycleDetailSheet();
  state.pendingDeleteGoal = "";
  clearTimeout(requestGoalDelete.timeout);
  if (elements.goalsFeedback) {
    elements.goalsFeedback.textContent = "";
    elements.goalsFeedback.classList.remove("show");
  }
  elements.goalAmountForm.reset();
  elements.goalActionId.value = goal.id;
  elements.goalActionMode.value = mode;
  elements.goalAmountSheetTitle.textContent = mode === "remove" ? "Remover valor" : "Guardar valor";
  elements.goalAmountSheetCopy.textContent = mode === "remove"
    ? `Quanto você quer devolver de ${capitalize(goal.name)}?`
    : `Quanto você quer guardar em ${capitalize(goal.name)}?`;
  elements.goalAmountNote.textContent = mode === "remove"
    ? `Guardado agora: ${currency.format(goal.savedAmount)}.`
    : `Saldo disponível: ${currency.format(getAvailableBalance(getTotals()))}.`;
  elements.confirmGoalAmount.textContent = mode === "remove" ? "Remover valor" : "Guardar valor";
  elements.goalAmount.value = "";
  elements.goalAmountSheet.classList.add("open");
  elements.goalAmountSheet.setAttribute("aria-hidden", "false");
  setTimeout(() => elements.goalAmount.focus(), 120);
}

function closeGoalAmountSheet() {
  elements.goalAmountSheet.classList.remove("open");
  elements.goalAmountSheet.setAttribute("aria-hidden", "true");
}

async function saveGoal(event) {
  event.preventDefault();
  const goalId = elements.goalId.value.trim();
  const payload = {
    name: normalizeGoalName(elements.goalName.value),
    targetAmount: parseMoney(elements.goalTarget.value),
  };

  if (!payload.name || payload.targetAmount <= 0) {
    showGoalFeedback("Informe um nome e um valor alvo válidos.");
    return;
  }

  try {
    if (goalId) {
      await apiRequest(`/api/goals/${encodeURIComponent(goalId)}`, {
        method: "PUT",
        body: payload,
      });
      showToast("Meta atualizada", "success");
    } else {
      await apiRequest("/api/goals", {
        method: "POST",
        body: payload,
      });
      showToast("Meta criada", "success");
    }

    await loadUserData();
    closeGoalSheet();
    render({ pulse: true });
  } catch (error) {
    if (handleUnauthorizedError(error)) return;
    showGoalFeedback(authErrorMessage(error));
    showToast(authErrorMessage(error), "neutral");
  }
}

async function submitGoalAmount(event) {
  event.preventDefault();
  const goalId = elements.goalActionId.value.trim();
  const mode = elements.goalActionMode.value;
  const goal = state.goals.find((item) => item.id === goalId);
  if (!goal || !mode) return;

  const amount = parseMoney(elements.goalAmount.value);
  const available = getAvailableBalance(getTotals());

  if (amount <= 0) {
    showGoalFeedback("Informe um valor válido.");
    return;
  }

  if (mode === "save" && amount > available) {
    showGoalFeedback("Não há saldo disponível suficiente para guardar nessa meta.");
    return;
  }

  if (mode === "remove" && amount > goal.savedAmount) {
    showGoalFeedback("Não há valor suficiente guardado nessa meta.");
    return;
  }

  try {
    await apiRequest(`/api/goals/${encodeURIComponent(goalId)}/${mode}`, {
      method: "POST",
      body: { amount },
    });
    await loadUserData();
    closeGoalAmountSheet();
    render({ pulse: true });
    showToast(mode === "save" ? "Valor guardado na meta" : "Valor devolvido ao saldo", "success");
  } catch (error) {
    if (handleUnauthorizedError(error)) return;
    showGoalFeedback(authErrorMessage(error));
    showToast(authErrorMessage(error), "neutral");
  }
}

function requestGoalDelete(goal) {
  if (!goal) return;

  if (state.pendingDeleteGoal === goal.id) {
    void deleteGoal(goal.id);
    return;
  }

  state.pendingDeleteGoal = goal.id;
  showGoalFeedback(goal.savedAmount > 0
    ? "Toque novamente em Excluir para confirmar. O valor guardado volta ao saldo disponível."
    : "Toque novamente em Excluir para confirmar.");
  showToast("Confirme a exclusão", "neutral");

  clearTimeout(requestGoalDelete.timeout);
  requestGoalDelete.timeout = setTimeout(() => {
    if (state.pendingDeleteGoal === goal.id) {
      state.pendingDeleteGoal = "";
      if (elements.goalsFeedback.textContent) {
        elements.goalsFeedback.textContent = "";
        elements.goalsFeedback.classList.remove("show");
      }
      renderGoals(getTotals());
    }
  }, 4200);
}

async function deleteGoal(goalId) {
  try {
    await apiRequest(`/api/goals/${encodeURIComponent(goalId)}`, { method: "DELETE" });
    state.pendingDeleteGoal = "";
    await loadUserData();
    render({ pulse: true });
    showToast("Meta removida", "neutral");
  } catch (error) {
    if (handleUnauthorizedError(error)) return;
    state.pendingDeleteGoal = "";
    renderGoals(getTotals());
    showGoalFeedback(authErrorMessage(error));
    showToast(authErrorMessage(error), "neutral");
  }
}

function showGoalFeedback(message) {
  if (!elements.goalsFeedback) return;
  elements.goalsFeedback.textContent = message;
  elements.goalsFeedback.classList.remove("show");
  requestAnimationFrame(() => elements.goalsFeedback.classList.add("show"));
}

function renderGoals(totals) {
  const reserved = getGoalSavedTotal();
  const available = getAvailableBalance(totals, reserved);
  const goalCount = state.goals.length;

  if (elements.goalsHeroAvailable) {
    elements.goalsHeroAvailable.textContent = `${currency.format(available)} disponíveis`;
  }
  if (elements.goalsHeroCopy) {
    elements.goalsHeroCopy.textContent = goalCount
      ? `Você já guardou ${currency.format(reserved)} em ${goalCount} meta${goalCount === 1 ? "" : "s"} neste ciclo.`
      : "Separe parte do saldo do ciclo e acompanhe o progresso de cada meta.";
  }
  if (elements.goalsSavedTotal) {
    elements.goalsSavedTotal.textContent = currency.format(reserved);
  }
  if (elements.goalsCountInline) {
    elements.goalsCountInline.textContent = String(goalCount);
  }
  if (elements.goalsCount) {
    elements.goalsCount.textContent = `${goalCount} meta${goalCount === 1 ? "" : "s"}`;
  }

  if (!state.pendingDeleteGoal) {
    elements.goalsFeedback.textContent = "";
    elements.goalsFeedback.classList.remove("show");
  }

  elements.goalList.innerHTML = state.goals.length
    ? state.goals.map((goal) => renderGoalCard(goal, available)).join("")
    : renderEmptyState("Nenhuma meta ainda", "Crie um cofrinho para separar parte do saldo do ciclo.");
}

function renderGoalCard(goal, availableBalance) {
  const progress = goal.targetAmount > 0 ? Math.round((goal.savedAmount / goal.targetAmount) * 100) : 0;
  const fill = Math.min(progress, 100);
  const complete = goal.savedAmount >= goal.targetAmount;
  const pending = state.pendingDeleteGoal === goal.id;

  return `<article class="goal-card ${complete ? "complete" : ""} ${pending ? "pending-delete" : ""}">
    <div class="goal-head">
      <div class="goal-copy">
        <span class="mini-label">Meta</span>
        <strong>${escapeHtml(capitalize(goal.name))}</strong>
        <p>Guardado ${currency.format(goal.savedAmount)} · Alvo ${currency.format(goal.targetAmount)}</p>
      </div>
      <div class="goal-progress-copy">
        <strong>${progress >= 100 ? "100%+" : `${progress}%`}</strong>
        <span>${complete ? "Concluída" : "Em andamento"}</span>
      </div>
    </div>
    <div class="goal-track" aria-hidden="true"><div class="goal-fill" style="width:${fill}%"></div></div>
    <div class="goal-actions">
      <button class="secondary-action compact goal-action" type="button" data-goal-save="${goal.id}" ${availableBalance <= 0 ? "disabled" : ""}>Guardar</button>
      <button class="secondary-action compact goal-action" type="button" data-goal-remove="${goal.id}" ${goal.savedAmount <= 0 ? "disabled" : ""}>Remover</button>
    </div>
    <div class="goal-meta-actions">
      <button class="text-button" type="button" data-goal-edit="${goal.id}">Editar</button>
      <button class="text-button ${pending ? "pending" : ""}" type="button" data-goal-delete="${goal.id}">${pending ? "Confirmar" : "Excluir"}</button>
    </div>
  </article>`;
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
      cycle: normalizeCyclePayload(payload.cycle),
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

function normalizeGoalName(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function normalizeCategoryName(value) {
  return String(value || "").trim().replace(/\s+/g, " ").toLocaleLowerCase("pt-BR");
}

window.state = state;
window.apiRequest = apiRequest;
window.loadUserData = loadUserData;
window.handleUnauthorizedError = handleUnauthorizedError;
window.authErrorMessage = authErrorMessage;
window.setAuthMessage = setAuthMessage;
window.resolveAppUrl = resolveAppUrl;
window.resolveReceiptUrl = resolveReceiptUrl;
window.getAppBasePath = getAppBasePath;
window.openSheet = openSheet;
window.closeSheet = closeSheet;
window.saveMovement = saveMovement;
window.applyReceiptSelection = applyReceiptSelection;
window.removeReceiptSelection = removeReceiptSelection;
window.syncReceiptPanel = syncReceiptPanel;
window.resetReceiptDraft = resetReceiptDraft;
window.showToast = showToast;
window.submitLogin = submitLogin;
window.submitRegister = submitRegister;
window.logout = logout;


