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

  const active = grouped.find((item) => sameCategory(item.category, state.activeAnalysisCategory)) || null;
  const focused = active || top;
  const movementLabel = state.analysisType === "expense" ? "saídas" : "entradas";
  updateAnalysisFocus(focused, typeTotal);
  elements.categoryBars.innerHTML = grouped.map((item) => renderCategoryRow(item, typeTotal, movementLabel, sameCategory(item.category, state.activeAnalysisCategory))).join("");
  renderPieChart(grouped, typeTotal, focused.category);
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
  return `<article class="category-row ${expanded ? "expanded" : ""}" style="--category-color:${meta.color}">
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

function renderPieChart(grouped, total, focusedCategory = "") {
  let startAngle = -90;
  elements.categoryDonut.innerHTML = `<svg viewBox="0 0 120 120" role="img" aria-label="Distribuição por categoria">
    ${grouped
      .map((item, index) => {
        const angle = (item.total / total) * 360;
        const endAngle = startAngle + angle;
        const selected = sameCategory(item.category, focusedCategory);
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
      state.activeAnalysisCategory = sameCategory(state.activeAnalysisCategory, item.category) ? "" : item.category;
      renderAnalysis(getTotals());
    };
    slice.addEventListener("pointerenter", activate);
    slice.addEventListener("click", activate);
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


