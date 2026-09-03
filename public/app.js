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

const goalAccentThemes = {
  cyan: {
    label: "Ciano",
    color: "#2ee7ff",
    soft: "rgba(46, 231, 255, 0.18)",
    faint: "rgba(46, 231, 255, 0.07)",
    glow: "rgba(46, 231, 255, 0.2)",
    border: "rgba(46, 231, 255, 0.28)",
    progress: "linear-gradient(90deg, #2ee7ff, #e7fcff)",
  },
  green: {
    label: "Verde",
    color: "#5dffb1",
    soft: "rgba(93, 255, 177, 0.18)",
    faint: "rgba(93, 255, 177, 0.07)",
    glow: "rgba(93, 255, 177, 0.2)",
    border: "rgba(93, 255, 177, 0.28)",
    progress: "linear-gradient(90deg, #5dffb1, #d5ffe7)",
  },
  purple: {
    label: "Roxo",
    color: "#b59dff",
    soft: "rgba(181, 157, 255, 0.18)",
    faint: "rgba(181, 157, 255, 0.07)",
    glow: "rgba(181, 157, 255, 0.2)",
    border: "rgba(181, 157, 255, 0.28)",
    progress: "linear-gradient(90deg, #b59dff, #f0e8ff)",
  },
  pink: {
    label: "Rosa",
    color: "#ff8fd2",
    soft: "rgba(255, 143, 210, 0.18)",
    faint: "rgba(255, 143, 210, 0.07)",
    glow: "rgba(255, 143, 210, 0.2)",
    border: "rgba(255, 143, 210, 0.28)",
    progress: "linear-gradient(90deg, #ff8fd2, #fff0f7)",
  },
  amber: {
    label: "Âmbar",
    color: "#ffd166",
    soft: "rgba(255, 209, 102, 0.18)",
    faint: "rgba(255, 209, 102, 0.07)",
    glow: "rgba(255, 209, 102, 0.2)",
    border: "rgba(255, 209, 102, 0.28)",
    progress: "linear-gradient(90deg, #ffd166, #fff3cf)",
  },
  blue: {
    label: "Azul",
    color: "#7aa7ff",
    soft: "rgba(122, 167, 255, 0.18)",
    faint: "rgba(122, 167, 255, 0.07)",
    glow: "rgba(122, 167, 255, 0.2)",
    border: "rgba(122, 167, 255, 0.28)",
    progress: "linear-gradient(90deg, #7aa7ff, #e5eeff)",
  },
  coral: {
    label: "Coral",
    color: "#ff8b72",
    soft: "rgba(255, 139, 114, 0.18)",
    faint: "rgba(255, 139, 114, 0.07)",
    glow: "rgba(255, 139, 114, 0.2)",
    border: "rgba(255, 139, 114, 0.28)",
    progress: "linear-gradient(90deg, #ff8b72, #ffe7e1)",
  },
  neutral: {
    label: "Neutro",
    color: "#8aa1b8",
    soft: "rgba(138, 161, 184, 0.18)",
    faint: "rgba(138, 161, 184, 0.07)",
    glow: "rgba(138, 161, 184, 0.15)",
    border: "rgba(138, 161, 184, 0.24)",
    progress: "linear-gradient(90deg, #8aa1b8, #dce6ef)",
  },
};

const goalAccentOrder = ["cyan", "green", "purple", "pink", "amber", "blue", "coral", "neutral"];
const defaultGoalAccent = "cyan";

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
  commitments: [],
  movements: [],
  activeTab: "summary",
  activeFilter: "all",
  formType: "expense",
  selectedCategory: "",
  analysisHoveredCategory: "",
  commitmentType: "payable",
  pendingDeleteCommitment: "",
  pendingLaunchCommitment: "",
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
  goalAccent: defaultGoalAccent,
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
  commitmentsHeroTitle: $("#commitments-hero-title"),
  commitmentsHeroCopy: $("#commitments-hero-copy"),
  commitmentsPendingPayable: $("#commitments-pending-payable"),
  commitmentsPendingReceivable: $("#commitments-pending-receivable"),
  commitmentsDoneTotal: $("#commitments-done-total"),
  commitmentsCount: $("#commitments-count"),
  commitmentsPendingCount: $("#commitments-pending-count"),
  commitmentsDoneCount: $("#commitments-done-count"),
  commitmentsFeedback: $("#commitment-feedback"),
  commitmentBoard: $("#commitment-board"),
  commitmentPendingList: $("#commitment-pending-list"),
  commitmentDoneList: $("#commitment-done-list"),
  openCommitmentSheet: $("#open-commitment-sheet"),
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
  goalAccent: $("#goal-accent"),
  goalAccentOptions: $("#goal-accent-options"),
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
  commitmentSheet: $("#commitment-sheet"),
  commitmentForm: $("#commitment-form"),
  commitmentSheetTitle: $("#commitment-sheet-title"),
  commitmentId: $("#commitment-id"),
  commitmentDescription: $("#commitment-description"),
  commitmentAmount: $("#commitment-amount"),
  commitmentDueDate: $("#commitment-due-date"),
  saveCommitment: $("#save-commitment"),
  commitmentTypeButtons: $$("#commitment-sheet [data-commitment-type]"),
  sectionSwitcherShell: $("#section-switcher-shell"),
  sectionSwitcher: $("#section-switcher"),
  sectionSwitcherMark: $("#section-switcher-mark"),
  sectionSwitcherLabel: $("#section-switcher-label"),
  sectionSwitcherCopy: $("#section-switcher-copy"),
  sectionSwitcherPanel: $("#section-switcher-panel"),
};

const sectionSwitcherItems = [
  { tab: "summary", label: "Resumo", copy: "Ciclo ativo" },
  { tab: "history", label: "Histórico", copy: "Linha do tempo" },
  { tab: "analysis", label: "Análise", copy: "Gastos e receitas" },
  { tab: "commitments", label: "Contas", copy: "Planejamento do mês" },
  { tab: "insights", label: "Insights", copy: "Leituras do ciclo" },
  { tab: "goals", label: "Metas", copy: "Cofrinhos persistentes" },
  { tab: "cycles", label: "Ciclos", copy: "Histórico fechado" },
];

init();

function init() {
  bindViewportContext();
  bindEvents();
  renderGoalAccentOptions(defaultGoalAccent);
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
  clearAuthMessage();
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
    if (error?.code !== "unauthorized" && error?.code !== "network_error" && error?.code !== "request_failed") {
      setAuthMessage(authErrorMessage(error));
    } else {
      clearAuthMessage();
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
  closeCommitmentSheet();
  closeCycleSheet();
  closeCycleDetailSheet();
  state.analysisHoveredCategory = "";
  state.pendingDeleteCommitment = "";
  state.pendingLaunchCommitment = "";
  state.sectionSwitcherOpen = false;
  clearTimeout(state.sectionSwitcherCloseTimer);
  syncSectionSwitcher();
  resetReceiptDraft();
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  if (location.protocol === "file:") return;

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").then((registration) => {
      registration.update().catch(() => {});
    }).catch(() => {
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
    const icon = elements.logoutButton.querySelector("svg");
    if (icon) {
      icon.replaceChildren(
        createSvgElement("path", { d: "M10 17l5-5-5-5" }),
        createSvgElement("path", { d: "M15 12H4" }),
        createSvgElement("path", { d: "M20 4v16" }),
      );
    }
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

function formatFileSize(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "";
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(bytes >= 10 * 1024 * 1024 ? 0 : 1)} MB`;
  return `${Math.max(Math.round(bytes / 1024), 1)} KB`;
}

function renderReceiptPreview(receipt) {
  if (!receipt) {
    return createElement("div", { className: "receipt-empty" }, [
      createElement("strong", { text: "Sem comprovante" }),
      createElement("span", { text: "Tire uma foto, escolha uma imagem ou anexe um PDF." }),
    ]);
  }

  const isPdf = receipt.kind === "pdf" || receipt.mimeType === "application/pdf";
  const labelText = receipt.originalName || receipt.file?.name || "Comprovante";
  const size = receipt.file ? receipt.file.size : Number(receipt.size || 0);
  const sizeLabel = size ? formatFileSize(size) : "";
  const url = safeReceiptUrl(receipt.previewUrl || receipt.url || "");

  return createElement("div", { className: `receipt-preview ${isPdf ? "pdf" : "image"}` }, [
    createElement("div", { className: "receipt-preview-media" }, [
      isPdf
        ? createElement("div", { className: "receipt-pdf-mark", text: "PDF", attrs: { "aria-hidden": "true" } })
        : createElement("img", { attrs: { src: url, alt: labelText } }),
    ]),
    createElement("div", { className: "receipt-preview-copy" }, [
      createElement("strong", { text: labelText }),
      createElement("span", { text: `${isPdf ? "Documento PDF" : "Imagem"}${sizeLabel ? ` - ${sizeLabel}` : ""}` }),
    ]),
  ]);
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
  const url = safeReceiptUrl(receipt?.url || "");
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
  const fragment = document.createDocumentFragment();

  for (const category of categories) {
    const selected = category === state.selectedCategory;
    const custom = isCustomCategory(state.formType, category);
    const removable = canDeleteCategory(category);
    const item = createElement("div", {
      className: `category-list-item ${selected ? "active" : ""} ${custom ? "custom" : ""}`,
      role: "option",
      aria: { selected },
    });

    const mainAction = createElement("button", { className: "category-main-action", attrs: { type: "button" } }, [
      createElement("span", { text: capitalize(category) }),
    ]);
    mainAction.dataset.category = category;
    if (selected) {
      mainAction.appendChild(createElement("strong", { text: "Selecionada" }));
    }
    item.appendChild(mainAction);

    if (custom || removable) {
      const manage = createElement("div", { className: "category-manage-actions" });
      if (custom) {
        const rename = createElement("button", { attrs: { type: "button" }, text: "Editar" });
        rename.dataset.renameCategory = category;
        rename.setAttribute("aria-label", `Renomear ${category}`);
        manage.appendChild(rename);
      }
      if (removable) {
        const remove = createElement("button", { attrs: { type: "button" }, text: "Excluir" });
        remove.dataset.deleteCategory = category;
        remove.setAttribute("aria-label", `Excluir ${category}`);
        manage.appendChild(remove);
      }
      item.appendChild(manage);
    }

    fragment.appendChild(item);
  }

  const createButton = createElement("button", { className: "category-list-item create", attrs: { type: "button" } }, [
    createElement("span", { text: "Criar nova categoria" }),
    createElement("strong", { text: "+" }),
  ]);
  createButton.dataset.createCategory = "true";
  fragment.appendChild(createButton);

  elements.categoryList.replaceChildren(fragment);

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

  elements.categoryList.querySelector("[data-create-category]")?.addEventListener("click", () => {
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
        elements.categoryError.textContent = "Não foi possível localizar esta categoria.";
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
  renderCommitments(totals);
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
  const availableBalance = totals.balance;

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
    elements.goalReserveNote.textContent = goalReserved > 0 ? `${currency.format(goalReserved)} guardados em metas.` : "";
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

  elements.recentList.replaceChildren(renderMovementList(sortMovements(state.movements).slice(0, 4), {
    empty: "Seu ciclo atual fica vivo assim que você adiciona a primeira movimentação.",
  }));
  elements.quickInsights.replaceChildren(...buildInsights(totals).slice(0, 2).map(renderInsightCard));
  if (options.pulse) {
    elements.balance.closest(".balance-card").classList.remove("balance-updated");
    requestAnimationFrame(() => elements.balance.closest(".balance-card").classList.add("balance-updated"));
  }
}

function renderHistory() {
  const filtered = sortMovements(state.movements).filter((movement) => {
    return state.activeFilter === "all" || movement.type === state.activeFilter;
  });

  elements.historyList.replaceChildren(renderMovementList(filtered, {
    withActions: true,
    empty: "Nenhum lançamento neste filtro do ciclo atual.",
  }));
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
    elements.categoryBars.replaceChildren(renderEmptyState("Análise limpa", "As categorias aparecem aqui com peso, proporção e leitura rápida."));
    elements.categoryDonut.replaceChildren();
    elements.donutCenter.textContent = "0%";
    return;
  }
  const hovered = grouped.find((item) => sameCategory(item.category, state.analysisHoveredCategory)) || null;
  const active = grouped.find((item) => sameCategory(item.category, state.activeAnalysisCategory)) || null;
  const focused = hovered || active || top;
  const movementLabel = state.analysisType === "expense" ? "saídas" : "entradas";
  updateAnalysisFocus(focused, typeTotal);
  elements.categoryBars.replaceChildren(...grouped.map((item) => renderCategoryRow(item, typeTotal, movementLabel, sameCategory(item.category, state.activeAnalysisCategory))));
  renderPieChart(grouped, typeTotal);
  syncAnalysisVisualState(grouped, typeTotal);
}

function renderInsights(totals) {
  const insights = buildInsights(totals);
  const [lead, ...rest] = insights;
  elements.insightHeadline.textContent = lead?.title || "Seu padrão aparece aqui.";
  elements.insightSubtitle.textContent = lead?.copy || "Adicione algumas movimentações para gerar leituras úteis neste ciclo.";
  elements.insightsList.replaceChildren(...(rest.length
    ? rest.map(renderInsightCard)
    : [renderEmptyState("Sem sinais extras", "Com mais registros, o Pulso compara ritmo, pequenos gastos e categorias.")]) );
}

function renderMovementList(movements, options = {}) {
  const fragment = document.createDocumentFragment();
  if (!movements.length) {
    fragment.appendChild(renderEmptyState("Tudo calmo", options.empty || "O primeiro registro já muda a leitura."));
    return fragment;
  }

  for (const movement of movements) {
    const movementType = movement.type === "income" ? "income" : "expense";
    const signal = movementType === "income" ? "+" : "-";
    const categoryName = movement.category || getCategoryNameById(movement.categoryId);
    const meta = getCategoryMeta(categoryName);
    const categoryColor = safeCssColor(meta.color);
    const article = createElement("article", { className: `movement-item ${movementType}`, style: { "--category-color": categoryColor } });

    article.appendChild(createElement("div", { className: "movement-icon", text: meta.icon }));

    article.appendChild(createElement("div", { className: "movement-main" }, [
      createElement("strong", { text: movement.description }),
      createElement("span", { text: `${capitalize(categoryName)} - ${formatDate(movement.date)}` }),
    ]));

    const side = createElement("div", { className: "movement-side" });
    side.appendChild(createElement("span", { className: "movement-value", text: `${signal}${currency.format(movement.amount)}` }));

    const receiptUrl = movement.receipt ? safeReceiptUrl(movement.receipt.url) : "";
    if (receiptUrl) {
      const receiptLink = createElement("a", { className: "receipt-chip", text: movement.receipt.kind === "pdf" ? "PDF" : "Comprovante", attrs: { target: "_blank", rel: "noopener noreferrer" } });
      receiptLink.href = receiptUrl;
      side.appendChild(createElement("div", { className: "movement-receipt" }, [receiptLink]));
    }

    if (options.withActions) {
      const details = createElement("details", { className: "row-actions" });
      const summary = createElement("summary", { attrs: { "aria-label": `Ações de ${movement.description}` } }, [
        createElement("span"),
        createElement("span"),
        createElement("span"),
      ]);
      details.appendChild(summary);
      const menu = createElement("div", { className: "action-menu", attrs: { "aria-label": "Ações da movimentação" } });
      const edit = createElement("button", { className: "row-action edit", attrs: { type: "button" }, text: "Editar" });
      edit.dataset.edit = movement.id;
      edit.setAttribute("aria-label", `Editar ${movement.description}`);
      const del = createElement("button", { className: "row-action delete", attrs: { type: "button" }, text: "Excluir" });
      del.dataset.delete = movement.id;
      del.setAttribute("aria-label", `Excluir ${movement.description}`);
      menu.append(edit, del);
      details.appendChild(menu);
      side.appendChild(details);
    }

    article.appendChild(side);
    fragment.appendChild(article);
  }

  return fragment;
}
function renderCategoryRow(item, total, movementLabel, expanded = false) {
  const share = clampPercent(Math.round((item.total / total) * 100));
  const meta = getCategoryMeta(item.category);
  const categoryColor = safeCssColor(meta.color);
  const article = createElement("article", {
    className: `category-row ${expanded ? "expanded" : ""}`,
    dataset: { category: item.category },
    style: { "--category-color": categoryColor },
  });

  const button = createElement("button", { className: "category-row-toggle", attrs: { type: "button" } });
  button.dataset.categoryToggle = item.category;
  button.setAttribute("aria-expanded", String(expanded));
  button.appendChild(createElement("div", { className: "category-meta" }, [
    createElement("span", {}, [createElement("i", { text: meta.icon }), createElement("span", { text: capitalize(item.category) })]),
    createElement("strong", { text: currency.format(item.total) }),
  ]));
  button.appendChild(createElement("div", { className: "bar-track" }, [
    createElement("div", { className: "bar-fill", style: { width: `${share}%` } }),
  ]));
  button.appendChild(createElement("div", { className: "category-values" }, [
    createElement("span", { text: `${share}% das ${movementLabel}` }),
    createElement("span", { text: `${item.count} movimento${item.count === 1 ? "" : "s"}` }),
  ]));
  article.appendChild(button);

  if (expanded) {
    const expand = createElement("div", { className: "category-expand" });
    expand.setAttribute("aria-label", `Movimentações de ${item.category}`);
    expand.appendChild(renderAnalysisMovements(item.category));
    article.appendChild(expand);
  }

  return article;
}
function renderPieChart(grouped, total) {
  const svg = createSvgElement("svg", { viewBox: "0 0 120 120", role: "img", "aria-label": "Distribuição por categoria" });

  if (grouped.length === 1) {
    const item = grouped[0];
    const color = safeCssColor(getCategoryColor(item.category, 0), "#2ee7ff");
    const radius = 34;
    const strokeWidth = 18;
    const circumference = (2 * Math.PI * radius).toFixed(3);
    svg.appendChild(createSvgElement("circle", { class: "pie-track", cx: "60", cy: "60", r: String(radius), fill: "none", stroke: "rgba(255,255,255,0.08)", "stroke-width": String(strokeWidth) }));
    svg.appendChild(createSvgElement("circle", { class: "pie-slice single", cx: "60", cy: "60", r: String(radius), fill: "none", stroke: color, "stroke-width": String(strokeWidth), "stroke-dasharray": circumference, "stroke-dashoffset": "0" }));
    const slice = svg.lastElementChild;
    slice.dataset.category = item.category;
    slice.dataset.index = "0";
  } else {
    let startAngle = -90;
    grouped.forEach((item, index) => {
      const angle = (item.total / total) * 360;
      const endAngle = startAngle + angle;
      const color = safeCssColor(getCategoryColor(item.category, index), "#2ee7ff");
      const path = describeDonutSlice(60, 60, 52, 34, startAngle, endAngle);
      startAngle = endAngle;
      const slice = createSvgElement("path", { class: "pie-slice", d: path, fill: color, "fill-rule": "evenodd" });
      slice.dataset.category = item.category;
      slice.dataset.index = String(index);
      svg.appendChild(slice);
    });
  }

  elements.categoryDonut.replaceChildren(svg);
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
  const wrapper = createElement("div", { className: movements.length ? "category-expand-list" : "category-expand-empty" });
  if (!movements.length) {
    wrapper.appendChild(renderEmptyState("Sem movimentações", "Esta categoria ainda não tem lançamentos neste ciclo."));
    return wrapper;
  }

  wrapper.appendChild(renderMovementList(movements, { empty: "Sem movimentações" }));
  return wrapper;
}
function updateAnalysisFocus(item, total) {
  const share = Math.round((item.total / total) * 100);
  const typeLabel = state.analysisType === "expense" ? "saídas" : "entradas";
  elements.topCategory.textContent = capitalize(item.category);
  elements.topCategoryCopy.textContent = `${share}% das ${typeLabel} em ${periodLabel("analysis").toLowerCase()}. ${currency.format(item.total)} no total.`;
  elements.donutCenter.textContent = `${share}%`;
}

function renderInsightCard(insight) {
  const tone = safeClassToken(insight?.tone, ["impact", "alert", "good", "soft"], "soft");
  return createElement("article", { className: `insight-card ${tone}` }, [
    createElement("span", { className: "insight-badge", text: insight?.badge || "" }),
    createElement("strong", { text: insight?.title || "" }),
    createElement("p", { text: insight?.copy || "" }),
  ]);
}
function renderEmptyState(title, copy) {
  return createElement("div", { className: "empty-state" }, [
    createElement("span", { attrs: { "aria-hidden": "true" } }),
    createElement("strong", { text: title }),
    createElement("p", { text: copy }),
  ]);
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

function getGoalSavedTotal() {
  return state.goals.reduce((sum, goal) => sum + Number(goal.savedAmount || 0), 0);
}

function getAvailableBalance(totals = getTotals()) {
  return Number(totals.balance || 0);
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
    const slice = `${safeCssColor(getCategoryMeta(item.category).color)} ${start}deg ${end}deg`;
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
    commitments: "Contas do mês",
    insights: "Leituras do ciclo",
    goals: "Cofrinhos persistentes",
    cycles: "Histórico de ciclos",
  };
  return labels[tab] || "Ciclo ativo";
}

function formatDate(date) {
  const parsed = new Date(`${date}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return "—";
  return dateFormatter.format(parsed).replace(".", "");
}

function formatOptionalDate(date) {
  return date ? formatDate(date) : "Sem data";
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

function formatLocalDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function todayLocal() {
  return formatLocalDate(new Date());
}

function offsetDate(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return formatLocalDate(date);
}

function getCategoryMeta(category) {
  return categoryMeta[category] || categoryMeta.outros;
}

function categoryIcon(category) {
  return getCategoryMeta(category).icon;
}

function capitalize(value) {
  const text = toSafeString(value);
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function toSafeString(value) {
  return value === null || value === undefined ? "" : String(value);
}

function escapeHtml(value) {
  return toSafeString(value).replace(/[&<>"']/g, (char) => {
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    }[char];
  });
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/`/g, "&#096;");
}

function appendChildren(node, children = []) {
  for (const child of children.flat(Infinity)) {
    if (child === null || child === undefined || child === false) continue;
    if (typeof child === "string" || typeof child === "number") {
      node.appendChild(document.createTextNode(String(child)));
      continue;
    }
    node.appendChild(child);
  }
  return node;
}

function createElement(tagName, options = {}, children = []) {
  const element = document.createElement(tagName);
  if (options.className) element.className = options.className;
  if (options.text !== undefined) element.textContent = options.text;
  if (options.role) element.setAttribute("role", options.role);
  if (options.aria) {
    for (const [key, value] of Object.entries(options.aria)) {
      element.setAttribute(`aria-${key}`, String(value));
    }
  }
  if (options.attrs) {
    for (const [key, value] of Object.entries(options.attrs)) {
      if (value === null || value === undefined) continue;
      element.setAttribute(key, String(value));
    }
  }
  if (options.dataset) {
    for (const [key, value] of Object.entries(options.dataset)) {
      if (value === null || value === undefined) continue;
      element.dataset[key] = String(value);
    }
  }
  if (options.style) {
    for (const [key, value] of Object.entries(options.style)) {
      if (value === null || value === undefined || value === "") continue;
      element.style.setProperty(key, String(value));
    }
  }
  appendChildren(element, children);
  return element;
}

function createSvgElement(tagName, attrs = {}) {
  const element = document.createElementNS("http://www.w3.org/2000/svg", tagName);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === null || value === undefined || value === "") continue;
    element.setAttribute(key, String(value));
  }
  return element;
}

function safeClassToken(value, allowed, fallback = "") {
  const text = toSafeString(value);
  return allowed.includes(text) ? text : fallback;
}

function clampPercent(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.min(Math.max(number, 0), 100);
}

function safeCssColor(value, fallback = "#8aa1b8") {
  const text = toSafeString(value).trim();
  if (/^#[0-9a-f]{3,8}$/i.test(text)) return text;
  if (/^rgba?\(\s*(?:\d{1,3}\s*,\s*){2}\d{1,3}(?:\s*,\s*(?:0|1|0?\.\d+))?\s*\)$/i.test(text)) return text;
  return fallback;
}

function safeReceiptUrl(url) {
  const resolved = resolveReceiptUrl(url);
  if (!resolved) return "";
  if (/^(?:javascript|data|vbscript):/i.test(resolved)) return "";
  if (/^(?:blob:|https?:\/\/|\/(?!\/)|\.\/|\.\.\/)/i.test(resolved)) return resolved;
  return "";
}

function resolveAppUrl(pathname) {
  if (!pathname) return "";
  if (/^(?:[a-z]+:|\/\/|blob:|data:)/i.test(pathname)) return pathname;
  return pathname.startsWith("/") ? pathname : `/${pathname}`;
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

function clearAuthMessage() {
  setAuthMessage("");
}

function authErrorMessage(error) {
  if (!error) return "Não foi possível continuar.";
  if (error.code === "email_in_use") return "Esse e-mail já está em uso.";
  if (error.code === "registration_failed") return "Não foi possível criar a conta com esses dados.";
  if (error.code === "invalid_auth_request") return "Revise o e-mail e a senha para continuar.";
  if (error.code === "invalid_credentials") return "E-mail ou senha inválidos.";
  if (error.code === "unauthorized") return "Sua sessão expirou. Entre novamente.";
  if (error.code === "too_many_requests") return "Muitas tentativas. Aguarde um pouco e tente novamente.";
  if (error.code === "payload_too_large") return "Os dados enviados são grandes demais.";
  if (error.code === "invalid_json") return "Não foi possível processar esses dados.";
  if (error.code === "network_error") return "Não conseguimos conectar ao servidor.";
  if (error.code === "insufficient_balance") return "Saldo insuficiente para concluir esta conta.";
  if (error.code === "invalid_category") return "Revise o nome da categoria.";
  if (error.code === "category_exists") return "Essa categoria já existe para este tipo.";
  if (error.code === "category_not_found") return "Categoria não encontrada.";
  if (error.code === "category_protected") return "Essa categoria não pode ser alterada.";
  if (error.code === "category_in_use") return "Há lançamentos utilizando esta categoria.";
  if (error.code === "category_type_mismatch") return "Categoria incompatível com esse tipo de lançamento.";
  if (error.code === "invalid_movement") return "Revise os campos da movimentação.";
  if (error.code === "invalid_movement_date") return "Use uma data válida para o lançamento.";
  if (error.code === "movement_not_found") return "Movimentação não encontrada.";
  if (error.code === "cycle_closed") return "Este ciclo está fechado e não aceita alterações.";
  if (error.code === "invalid_goal") return "Revise os campos da meta.";
  if (error.code === "invalid_goal_amount") return "Digite um valor válido para a meta.";
  if (error.code === "goal_exists") return "Essa meta já existe.";
  if (error.code === "goal_not_found") return "Meta não encontrada.";
  if (error.code === "goal_target_too_low") return "O alvo não pode ficar abaixo do valor já guardado.";
  if (error.code === "goal_insufficient_saved") return "Não há valor suficiente guardado nessa meta.";
  if (error.code === "invalid_commitment") return "Revise os campos do compromisso.";
  if (error.code === "invalid_commitment_due_date") return "Use uma data de vencimento válida.";
  if (error.code === "commitment_exists") return "Esse compromisso já existe.";
  if (error.code === "commitment_not_found") return "Compromisso não encontrado.";
  if (error.code === "receipt_not_allowed") return "Comprovante só pode ser anexado em saídas.";
  if (error.code === "receipt_not_found") return "Comprovante não encontrado.";
  if (error.code === "invalid_receipt_type") return "Envie uma imagem JPG, PNG, WEBP ou um PDF.";
  if (error.code === "receipt_too_large") return "O arquivo do comprovante excede o limite permitido.";
  return error.message || "Não foi possível continuar.";
}

function handleUnauthorizedError(error) {
  if (error?.code !== "unauthorized") return false;
  void logout();
  return true;
}

async function submitRegister(event) {
  event.preventDefault();
  const email = elements.registerEmail.value.trim();
  const password = elements.registerPassword.value;
  if (!email || !password) {
    clearAuthMessage();
    return;
  }

  try {
    setAuthMessage("Criando sua conta...");
    await apiRequest("/auth/register", {
      method: "POST",
      body: {
        email,
        password,
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
  state.commitments = [];
  state.movements = [];
  state.selectedCategory = "";
  state.activeTab = "summary";
  state.activeFilter = "all";
  state.formType = "expense";
  state.analysisType = "expense";
  state.activeAnalysisCategory = "";
  state.analysisHoveredCategory = "";
  state.commitmentType = "payable";
  state.pendingDeleteCommitment = "";
  state.pendingLaunchCommitment = "";
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
  const email = elements.loginEmail.value.trim();
  const password = elements.loginPassword.value;
  if (!email || !password) {
    clearAuthMessage();
    return;
  }

  try {
    setAuthMessage("Entrando...");
    await apiRequest("/auth/login", {
      method: "POST",
      body: {
        email,
        password,
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
  state.commitments = normalizeCommitmentsPayload(bootstrap.commitments);
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

function normalizeGoalAccent(value, fallback = "") {
  const key = String(value || "").trim().toLowerCase();
  if (goalAccentThemes[key]) return key;
  return fallback;
}

function getGoalAccentTheme(accent) {
  const key = normalizeGoalAccent(accent, "neutral") || "neutral";
  return goalAccentThemes[key] || goalAccentThemes.neutral;
}

function pickGoalAccentSeed(value) {
  const normalized = String(value || "").trim().toLowerCase();
  let hash = 0;
  for (let index = 0; index < normalized.length; index += 1) {
    hash = (hash * 31 + normalized.charCodeAt(index)) >>> 0;
  }
  return goalAccentOrder[hash % goalAccentOrder.length] || defaultGoalAccent;
}

function resolveGoalAccent(goal) {
  return normalizeGoalAccent(goal?.accent, "") || pickGoalAccentSeed(goal?.slug || goal?.name || goal?.id || defaultGoalAccent);
}

function renderGoalAccentOptions(selectedAccent = defaultGoalAccent) {
  if (!elements.goalAccentOptions) return;
  const selected = normalizeGoalAccent(selectedAccent, defaultGoalAccent) || defaultGoalAccent;
  const fragment = document.createDocumentFragment();

  for (const key of goalAccentOrder) {
    const theme = goalAccentThemes[key];
    const active = key === selected;
    const style = {
      "--goal-accent": theme.color,
      "--goal-accent-soft": theme.soft,
      "--goal-accent-faint": theme.faint,
      "--goal-accent-glow": theme.glow,
      "--goal-accent-border": theme.border,
    };
    const button = createElement("button", {
      className: `goal-accent-option ${active ? "active" : ""}`,
      attrs: { type: "button" },
      aria: { pressed: active ? "true" : "false" },
      dataset: { goalAccent: key },
      style,
    });
    button.append(
      createElement("span", { className: "goal-accent-swatch", attrs: { "aria-hidden": "true" } }),
      createElement("span", { className: "goal-accent-label", text: theme.label }),
    );
    fragment.appendChild(button);
  }

  elements.goalAccentOptions.replaceChildren(fragment);
}
function setGoalAccent(accent) {
  const key = normalizeGoalAccent(accent, defaultGoalAccent) || defaultGoalAccent;
  state.goalAccent = key;
  if (elements.goalAccent) {
    elements.goalAccent.value = key;
  }
  if (elements.goalAccentOptions) {
    elements.goalAccentOptions.querySelectorAll(".goal-accent-option").forEach((button) => {
      const active = button.dataset.goalAccent === key;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
  }
}

function normalizeGoalsPayload(items) {
  return Array.isArray(items)
    ? items.map((item) => ({
        id: item.id,
        name: normalizeGoalName(item.name),
        slug: item.slug,
        accent: normalizeGoalAccent(item.accent, ""),
        targetAmount: Number(item.targetAmount || 0),
        savedAmount: Number(item.savedAmount || 0),
        remainingAmount: Number(item.remainingAmount || 0),
        progress: Number(item.progress || 0),
      }))
    : [];
}

function normalizeCommitmentPayload(item) {
  if (!item) return null;
  return {
    id: item.id,
    cycleId: item.cycleId,
    type: item.type === "receivable" ? "receivable" : "payable",
    description: String(item.description || "").trim(),
    amount: Number(item.amount || 0),
    status: item.status === "done" ? "done" : "pending",
    dueDate: item.dueDate || item.due_date || "",
    completedAt: item.completedAt || item.completed_at || null,
    convertedMovementId: item.convertedMovementId || item.converted_movement_id || null,
    convertedAt: item.convertedAt || item.converted_at || null,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

function normalizeCommitmentsPayload(items) {
  return Array.isArray(items) ? items.map(normalizeCommitmentPayload).filter(Boolean) : [];
}

function applyCommitmentsResponse(result) {
  if (!result || typeof result !== "object") return;
  if (result.currentCycle) {
    state.currentCycle = normalizeCyclePayload(result.currentCycle);
  }
  if (Array.isArray(result.commitments)) {
    state.commitments = normalizeCommitmentsPayload(result.commitments);
  }
  if (Array.isArray(result.movements)) {
    state.movements = normalizeMovementsPayload(result.movements);
  }
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

  elements.receiptPreview.replaceChildren(renderReceiptPreview(activeReceipt));

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

  [elements.loginEmail, elements.loginPassword, elements.registerEmail, elements.registerPassword].forEach((input) => {
    input?.addEventListener("input", clearAuthMessage);
    input?.addEventListener("focus", clearAuthMessage);
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

  if (elements.commitmentBoard) {
    elements.commitmentBoard.addEventListener("click", (event) => {
      const editButton = event.target.closest("[data-commitment-edit]");
      if (editButton) {
        const commitment = state.commitments.find((item) => item.id === editButton.dataset.commitmentEdit);
        if (commitment) openCommitmentSheet(commitment);
        return;
      }

      const toggleButton = event.target.closest("[data-commitment-toggle]");
      if (toggleButton) {
        const commitment = state.commitments.find((item) => item.id === toggleButton.dataset.commitmentToggle);
        if (commitment) {
          void toggleCommitmentStatus(commitment);
        }
        return;
      }

      const launchButton = event.target.closest("[data-commitment-launch]");
      if (launchButton) {
        const commitment = state.commitments.find((item) => item.id === launchButton.dataset.commitmentLaunch);
        if (commitment) {
          requestCommitmentLaunch(commitment);
        }
        return;
      }

      const deleteButton = event.target.closest("[data-commitment-delete]");
      if (deleteButton) {
        const commitment = state.commitments.find((item) => item.id === deleteButton.dataset.commitmentDelete);
        if (commitment) {
          requestCommitmentDelete(commitment);
        }
      }
    });
  }

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

  $$("[data-close-commitment-sheet]").forEach((element) => {
    element.addEventListener("click", closeCommitmentSheet);
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

  if (elements.goalAccentOptions) {
    elements.goalAccentOptions.addEventListener("click", (event) => {
      const button = event.target.closest("[data-goal-accent]");
      if (!button) return;
      setGoalAccent(button.dataset.goalAccent);
    });
  }

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
  elements.commitmentForm.addEventListener("submit", saveCommitment);
  elements.saveCategory.addEventListener("click", () => {
    void saveNewCategory();
  });
  elements.openCommitmentSheet.addEventListener("click", () => openCommitmentSheet());
  elements.commitmentTypeButtons.forEach((button) => {
    button.addEventListener("click", () => setCommitmentType(button.dataset.commitmentType));
  });
  elements.commitmentDescription.addEventListener("input", () => {
    elements.commitmentDescription.value = elements.commitmentDescription.value.replace(/\s+/g, " ").trimStart();
  });
  elements.commitmentAmount.addEventListener("input", () => {
    elements.commitmentAmount.value = sanitizeMoneyInput(elements.commitmentAmount.value);
  });
  elements.commitmentAmount.addEventListener("blur", () => {
    const amount = parseMoney(elements.commitmentAmount.value);
    elements.commitmentAmount.value = amount ? formatMoneyInput(amount) : "";
  });
  elements.commitmentAmount.addEventListener("focus", () => {
    elements.commitmentAmount.select();
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

  const fragment = document.createDocumentFragment();
  for (const item of sectionSwitcherItems) {
    const button = createElement("button", {
      className: "section-switcher-option",
      attrs: { type: "button" },
      dataset: { mobileTab: item.tab },
    });
    button.appendChild(createElement("span", { className: "section-switcher-option-mark", attrs: { "aria-hidden": "true" } }, [
      createSectionSwitcherIcon(item.tab),
    ]));
    button.appendChild(createElement("span", { className: "section-switcher-option-copy" }, [
      createElement("strong", { text: item.label }),
      createElement("small", { text: item.copy }),
    ]));
    fragment.appendChild(button);
  }
  elements.sectionSwitcherPanel.replaceChildren(fragment);

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
  if (elements.sectionSwitcherMark) {
    elements.sectionSwitcherMark.replaceChildren(createSectionSwitcherIcon(tab));
  }
  elements.sectionSwitcher.setAttribute("aria-expanded", String(state.sectionSwitcherOpen));
  elements.sectionSwitcherPanel.classList.toggle("open", state.sectionSwitcherOpen);
  elements.sectionSwitcherPanel.setAttribute("aria-hidden", String(!state.sectionSwitcherOpen));
  elements.sectionSwitcherPanel.querySelectorAll("[data-mobile-tab]").forEach((button) => {
    button.classList.toggle("active", button.dataset.mobileTab === tab);
    button.setAttribute("aria-current", button.dataset.mobileTab === tab ? "page" : "false");
  });
}

function createSectionSwitcherIcon(tab) {
  const icons = {
    summary: [
      createSvgElement("path", { d: "M4 11.2 12 5l8 6.2" }),
      createSvgElement("path", { d: "M6.5 10.6V19h11V10.6" }),
      createSvgElement("path", { d: "M10 19v-4h4v4" }),
    ],
    history: [
      createSvgElement("path", { d: "M8 6h12" }),
      createSvgElement("path", { d: "M8 12h12" }),
      createSvgElement("path", { d: "M8 18h12" }),
      createSvgElement("path", { d: "M4 6h.01" }),
      createSvgElement("path", { d: "M4 12h.01" }),
      createSvgElement("path", { d: "M4 18h.01" }),
    ],
    analysis: [
      createSvgElement("path", { d: "M4 19V5" }),
      createSvgElement("path", { d: "M4 19h16" }),
      createSvgElement("path", { d: "M8 16v-4" }),
      createSvgElement("path", { d: "M12 16V8" }),
      createSvgElement("path", { d: "M16 16v-6" }),
    ],
    commitments: [
      createSvgElement("path", { d: "M8 6h11" }),
      createSvgElement("path", { d: "M8 12h11" }),
      createSvgElement("path", { d: "M8 18h11" }),
      createSvgElement("path", { d: "M4 6h.01" }),
      createSvgElement("path", { d: "M4 12h.01" }),
      createSvgElement("path", { d: "M4 18h.01" }),
    ],
    insights: [
      createSvgElement("path", { d: "M12 3v3" }),
      createSvgElement("path", { d: "M18.4 5.6 16.3 7.7" }),
      createSvgElement("path", { d: "M21 12h-3" }),
      createSvgElement("path", { d: "M6 12H3" }),
      createSvgElement("path", { d: "M7.7 7.7 5.6 5.6" }),
      createSvgElement("path", { d: "M9 18h6" }),
      createSvgElement("path", { d: "M10 21h4" }),
      createSvgElement("path", { d: "M8 14a4 4 0 1 1 8 0c0 1.5-.8 2.3-1.6 3H9.6C8.8 16.3 8 15.5 8 14Z" }),
    ],
    goals: [
      createSvgElement("path", { d: "M12 2v3" }),
      createSvgElement("path", { d: "M12 19v3" }),
      createSvgElement("path", { d: "M4.9 4.9 7 7" }),
      createSvgElement("path", { d: "M17 17l2.1 2.1" }),
      createSvgElement("path", { d: "M2 12h3" }),
      createSvgElement("path", { d: "M19 12h3" }),
      createSvgElement("circle", { cx: "12", cy: "12", r: "5" }),
    ],
    cycles: [
      createSvgElement("path", { d: "M3 12a9 9 0 1 0 3-6.7" }),
      createSvgElement("path", { d: "M3 4v6h6" }),
      createSvgElement("path", { d: "M12 8v5l3 2" }),
    ],
  };
  const svg = createSvgElement("svg", { viewBox: "0 0 24 24", "aria-hidden": "true" });
  svg.append(...(icons[tab] || icons.summary));
  return svg;
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
  elements.date.value = todayLocal();
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
  setGoalAccent(defaultGoalAccent);

  if (goal) {
    elements.goalId.value = goal.id;
    elements.goalSheetTitle.textContent = "Editar meta";
    elements.saveGoal.textContent = "Salvar alterações";
    elements.goalName.value = goal.name;
    elements.goalTarget.value = formatMoneyInput(goal.targetAmount);
    setGoalAccent(goal.accent || "neutral");
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

function openCommitmentSheet(commitment = null) {
  closeSheet();
  closeCategorySheet();
  closeGoalSheet();
  closeGoalAmountSheet();
  closeCycleSheet();
  closeCycleDetailSheet();
  state.pendingDeleteCommitment = "";
  state.pendingLaunchCommitment = "";
  if (elements.commitmentsFeedback) {
    elements.commitmentsFeedback.textContent = "";
    elements.commitmentsFeedback.classList.remove("show");
  }
  elements.commitmentForm.reset();
  elements.commitmentId.value = "";
  elements.commitmentSheetTitle.textContent = "Novo compromisso";
  elements.saveCommitment.textContent = "Salvar compromisso";
  setCommitmentType(commitment?.type || "payable");

  if (commitment) {
    elements.commitmentId.value = commitment.id;
    elements.commitmentSheetTitle.textContent = "Editar compromisso";
    elements.saveCommitment.textContent = "Salvar alterações";
    elements.commitmentDescription.value = commitment.description;
    elements.commitmentAmount.value = formatMoneyInput(commitment.amount);
    elements.commitmentDueDate.value = commitment.dueDate || "";
    setCommitmentType(commitment.type);
  } else {
    elements.commitmentAmount.value = "";
    elements.commitmentDescription.value = "";
    elements.commitmentDueDate.value = "";
  }

  elements.commitmentSheet.classList.add("open");
  elements.commitmentSheet.setAttribute("aria-hidden", "false");
  setTimeout(() => elements.commitmentDescription.focus(), 120);
}

function closeCommitmentSheet() {
  elements.commitmentSheet.classList.remove("open");
  elements.commitmentSheet.setAttribute("aria-hidden", "true");
}

function setCommitmentType(type) {
  state.commitmentType = type === "receivable" ? "receivable" : "payable";
  elements.commitmentTypeButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.commitmentType === state.commitmentType);
  });
}

function showCommitmentFeedback(message) {
  if (!elements.commitmentsFeedback) return;
  elements.commitmentsFeedback.textContent = message;
  elements.commitmentsFeedback.classList.remove("show");
  requestAnimationFrame(() => elements.commitmentsFeedback.classList.add("show"));
}

async function saveCommitment(event) {
  event.preventDefault();

  const commitmentId = elements.commitmentId.value.trim();
  const description = String(elements.commitmentDescription.value || "").trim().replace(/\s+/g, " ");
  const amount = parseMoney(elements.commitmentAmount.value);
  const dueDate = String(elements.commitmentDueDate.value || "").trim();

  if (!description || !Number.isFinite(amount) || amount <= 0) {
    showCommitmentFeedback("Informe uma descrição e um valor válidos.");
    return;
  }

  if (dueDate && Number.isNaN(new Date(`${dueDate}T12:00:00`).getTime())) {
    showCommitmentFeedback("Escolha uma data válida.");
    return;
  }

  const payload = {
    type: state.commitmentType,
    description,
    amount,
    dueDate: dueDate || null,
  };

  try {
    if (commitmentId) {
      const result = await apiRequest(`/api/commitments/${encodeURIComponent(commitmentId)}`, {
        method: "PUT",
        body: payload,
      });
      applyCommitmentsResponse(result);
    } else {
      const result = await apiRequest("/api/commitments", {
        method: "POST",
        body: payload,
      });
      applyCommitmentsResponse(result);
    }

    state.pendingDeleteCommitment = "";
    closeCommitmentSheet();
    render({ pulse: true });
    showToast(commitmentId ? "Compromisso atualizado" : "Compromisso criado", "success");
  } catch (error) {
    if (handleUnauthorizedError(error)) return;
    showCommitmentFeedback(authErrorMessage(error));
    showToast(authErrorMessage(error), "neutral");
  }
}

async function toggleCommitmentStatus(commitment) {
  if (!commitment) return;

  try {
    const endpoint = commitment.status === "done" ? "reopen" : "complete";
    const result = await apiRequest(`/api/commitments/${encodeURIComponent(commitment.id)}/${endpoint}`, {
      method: "POST",
    });
    applyCommitmentsResponse(result);
    state.pendingDeleteCommitment = "";
    state.pendingLaunchCommitment = "";
    render({ pulse: true });
    if (commitment.status === "done") {
      showCommitmentFeedback("Conta reaberta. O lançamento automático foi revertido.");
      showToast("Conta reaberta e lançamento revertido", "neutral");
      return;
    }

    const impactMessage = commitment.type === "receivable"
      ? "Conta concluída e valor adicionado ao saldo."
      : "Conta concluída e valor descontado do saldo.";
    showCommitmentFeedback(impactMessage);
    showToast(result?.created === false ? "Conta já estava lançada" : impactMessage, "success");
  } catch (error) {
    if (handleUnauthorizedError(error)) return;
    showCommitmentFeedback(authErrorMessage(error));
    showToast(authErrorMessage(error), "neutral");
  }
}

function requestCommitmentDelete(commitment) {
  if (!commitment) return;

  if (state.pendingDeleteCommitment === commitment.id) {
    void deleteCommitment(commitment.id);
    return;
  }

  state.pendingDeleteCommitment = commitment.id;
  state.pendingLaunchCommitment = "";
  showCommitmentFeedback(commitment.convertedMovementId
    ? "Toque novamente em Excluir para confirmar. O lançamento já criado no histórico continua intacto."
    : "Toque novamente em Excluir para confirmar.");
  showToast("Confirme a exclusão", "neutral");

  clearTimeout(requestCommitmentDelete.timeout);
  requestCommitmentDelete.timeout = setTimeout(() => {
    if (state.pendingDeleteCommitment === commitment.id) {
      state.pendingDeleteCommitment = "";
      if (elements.commitmentsFeedback?.textContent) {
        elements.commitmentsFeedback.textContent = "";
        elements.commitmentsFeedback.classList.remove("show");
      }
      renderCommitments();
    }
  }, 4200);
}

function requestCommitmentLaunch(commitment) {
  if (!commitment || commitment.convertedMovementId) return;

  if (state.pendingLaunchCommitment === commitment.id) {
    void launchCommitmentToHistory(commitment);
    return;
  }

  state.pendingLaunchCommitment = commitment.id;
  state.pendingDeleteCommitment = "";
  showCommitmentFeedback("Toque novamente em Lançar no histórico para confirmar. Isso cria a movimentação real uma única vez.");
  showToast("Confirme o lançamento", "neutral");

  clearTimeout(requestCommitmentLaunch.timeout);
  requestCommitmentLaunch.timeout = setTimeout(() => {
    if (state.pendingLaunchCommitment === commitment.id) {
      state.pendingLaunchCommitment = "";
      if (elements.commitmentsFeedback?.textContent) {
        elements.commitmentsFeedback.textContent = "";
        elements.commitmentsFeedback.classList.remove("show");
      }
      renderCommitments();
    }
  }, 4200);
}

async function deleteCommitment(commitmentId) {
  try {
    const result = await apiRequest(`/api/commitments/${encodeURIComponent(commitmentId)}`, { method: "DELETE" });
    applyCommitmentsResponse(result);
    state.pendingDeleteCommitment = "";
    render({ pulse: true });
    showToast("Compromisso removido", "neutral");
  } catch (error) {
    if (handleUnauthorizedError(error)) return;
    state.pendingDeleteCommitment = "";
    renderCommitments();
    showCommitmentFeedback(authErrorMessage(error));
    showToast(authErrorMessage(error), "neutral");
  }
}

async function launchCommitmentToHistory(commitment) {
  if (!commitment) return;

  try {
    const result = await apiRequest(`/api/commitments/${encodeURIComponent(commitment.id)}/convert-to-movement`, {
      method: "POST",
    });
    applyCommitmentsResponse(result);
    state.pendingDeleteCommitment = "";
    state.pendingLaunchCommitment = "";
    render({ pulse: true });
    const impactMessage = commitment.type === "receivable"
      ? "Conta concluída e valor adicionado ao saldo."
      : "Conta concluída e valor descontado do saldo.";
    showCommitmentFeedback(impactMessage);
    showToast(result?.created === false ? "Conta já estava lançada" : impactMessage, "success");
  } catch (error) {
    if (handleUnauthorizedError(error)) return;
    showCommitmentFeedback(authErrorMessage(error));
    showToast(authErrorMessage(error), "neutral");
  }
}

async function saveGoal(event) {
  event.preventDefault();
  const goalId = elements.goalId.value.trim();
  const payload = {
    name: normalizeGoalName(elements.goalName.value),
    targetAmount: parseMoney(elements.goalTarget.value),
    accent: normalizeGoalAccent(state.goalAccent || elements.goalAccent?.value, defaultGoalAccent) || defaultGoalAccent,
    theme: normalizeGoalAccent(state.goalAccent || elements.goalAccent?.value, defaultGoalAccent) || defaultGoalAccent,
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

function getCommitmentTotals() {
  return state.commitments.reduce(
    (totals, commitment) => {
      const amount = Number(commitment.amount || 0);
      if (commitment.status === "done") {
        totals.doneTotal += amount;
        totals.doneCount += 1;
      } else {
        totals.pendingCount += 1;
        if (commitment.type === "payable") {
          totals.pendingPayable += amount;
        } else {
          totals.pendingReceivable += amount;
        }
      }
      return totals;
    },
    {
      pendingPayable: 0,
      pendingReceivable: 0,
      doneTotal: 0,
      pendingCount: 0,
      doneCount: 0,
    },
  );
}

function sortCommitments(items) {
  return [...items].sort((a, b) => {
    const aPriority = a.status === "pending" ? 0 : 1;
    const bPriority = b.status === "pending" ? 0 : 1;
    if (aPriority !== bPriority) return aPriority - bPriority;
    const aDate = a.dueDate || a.completedAt || a.createdAt || "";
    const bDate = b.dueDate || b.completedAt || b.createdAt || "";
    if (aDate !== bDate) return aDate.localeCompare(bDate);
    return String(a.createdAt || "").localeCompare(String(b.createdAt || ""));
  });
}

function renderCommitments() {
  if (!elements.commitmentPendingList || !elements.commitmentDoneList) return;

  const summary = getCommitmentTotals();
  const pending = sortCommitments(state.commitments.filter((item) => item.status === "pending"));
  const done = sortCommitments(state.commitments.filter((item) => item.status === "done"));
  const totalCount = state.commitments.length;
  const pendingBuckets = groupPendingCommitments(pending);

  if (elements.commitmentsHeroTitle) {
    elements.commitmentsHeroTitle.textContent = totalCount
      ? "O planejamento do mês já tomou forma"
      : "Sem itens planejados por enquanto";
  }

  if (elements.commitmentsHeroCopy) {
    elements.commitmentsHeroCopy.textContent = totalCount
      ? `Você acompanha ${pending.length} item${pending.length === 1 ? "" : "s"} planejado${pending.length === 1 ? "" : "s"} e ${done.length} realizado${done.length === 1 ? "" : "s"} neste ciclo. Planejado não mexe no saldo nem no histórico até virar movimento real.`
      : "Registre o que precisa pagar ou receber e acompanhe o mês como um planejamento financeiro claro.";
  }

  if (elements.commitmentsPendingPayable) {
    elements.commitmentsPendingPayable.textContent = currency.format(summary.pendingPayable);
  }
  if (elements.commitmentsPendingReceivable) {
    elements.commitmentsPendingReceivable.textContent = currency.format(summary.pendingReceivable);
  }
  if (elements.commitmentsDoneTotal) {
    elements.commitmentsDoneTotal.textContent = currency.format(summary.doneTotal);
  }
  if (elements.commitmentsCount) {
    elements.commitmentsCount.textContent = `${totalCount} item${totalCount === 1 ? "" : "s"}`;
  }
  if (elements.commitmentsPendingCount) {
    elements.commitmentsPendingCount.textContent = `${pending.length} planejado${pending.length === 1 ? "" : "s"}`;
  }
  if (elements.commitmentsDoneCount) {
    elements.commitmentsDoneCount.textContent = `${done.length} realizado${done.length === 1 ? "" : "s"}`;
  }

  if (!state.pendingDeleteCommitment && !state.pendingLaunchCommitment && elements.commitmentsFeedback) {
    elements.commitmentsFeedback.textContent = "";
    elements.commitmentsFeedback.classList.remove("show");
  }

  elements.commitmentPendingList.replaceChildren(
    pending.length
      ? renderCommitmentSections(pendingBuckets)
      : renderEmptyState("Nada pendente", "Os compromissos a pagar e a receber aparecem aqui antes de virar movimento."),
  );
  elements.commitmentDoneList.replaceChildren(
    ...(done.length
      ? done.map((item) => renderCommitmentCard(item))
      : [renderEmptyState("Nada concluído", "Quando você conclui um compromisso, ele muda de lado e pode ser lançado no histórico.")]),
  );
}

function renderCommitmentSections(buckets) {
  const sections = [
    { key: "overdue", title: "Atrasados", copy: "Já passaram do vencimento." },
    { key: "today", title: "Vencendo hoje", copy: "Itens para resolver ainda hoje." },
    { key: "week", title: "Próximos 7 dias", copy: "Planejamento de curto prazo." },
    { key: "later", title: "Mais à frente", copy: "Compromissos já com data definida." },
    { key: "nodate", title: "Sem vencimento", copy: "Planejado, mas ainda sem data." },
  ];
  const fragment = document.createDocumentFragment();

  for (const section of sections) {
    const items = buckets[section.key] || [];
    if (!items.length) continue;
    const group = createElement("section", { className: "commitment-group" });
    const header = createElement("header", { className: "commitment-group-header" });
    header.appendChild(createElement("div", {}, [
      createElement("strong", { text: section.title }),
      createElement("p", { text: section.copy }),
    ]));
    header.appendChild(createElement("span", { text: `${items.length} item${items.length === 1 ? "" : "s"}` }));
    group.appendChild(header);

    const list = createElement("div", { className: "commitment-group-list" });
    for (const item of items) {
      list.appendChild(renderCommitmentCard(item));
    }
    group.appendChild(list);
    fragment.appendChild(group);
  }

  return fragment;
}
function renderCommitmentCard(commitment) {
  const commitmentType = commitment.type === "receivable" ? "receivable" : "payable";
  const commitmentStatus = commitment.status === "done" ? "done" : "pending";
  const isPending = commitmentStatus === "pending";
  const isLaunched = Boolean(commitment.convertedMovementId);
  const typeLabel = commitmentType === "receivable" ? "A receber" : "A pagar";
  const statusLabel = isPending ? "Planejado" : "Realizado";
  const dueState = getCommitmentDueState(commitment);
  const pendingDelete = state.pendingDeleteCommitment === commitment.id;
  const pendingLaunch = state.pendingLaunchCommitment === commitment.id;
  const canLaunch = commitmentStatus === "done" && !isLaunched;
  const launchLabel = pendingLaunch ? "Confirmar lançamento" : "Lançar no histórico";
  const dueBadge = dueState.label || "Sem vencimento";
  const dueClassName = safeClassToken(dueState.className, ["no-date", "overdue", "due-today", "due-soon", "future"], "");
  const dueBadgeTone = safeClassToken(dueState.badgeTone, ["muted", "danger", "warning", "info"], "muted");
  const card = createElement("article", { className: `commitment-card ${commitmentType} ${commitmentStatus} ${isLaunched ? "launched" : ""} ${pendingDelete ? "pending-delete" : ""}${dueClassName ? ` ${dueClassName}` : ""}` });

  const head = createElement("div", { className: "commitment-head" });
  const copy = createElement("div", { className: "commitment-copy" });
  const badges = createElement("div", { className: "commitment-badges" }, [
    createElement("span", { className: "commitment-badge type", text: typeLabel }),
    createElement("span", { className: `commitment-badge status ${isPending ? "pending" : "done"}`, text: statusLabel }),
    createElement("span", { className: `commitment-badge due ${dueBadgeTone}`, text: dueBadge }),
  ]);
  if (isLaunched) badges.appendChild(createElement("span", { className: "commitment-badge launch", text: "Lançado" }));
  copy.appendChild(badges);
  copy.appendChild(createElement("strong", { text: commitment.description }));
  copy.appendChild(createElement("p", { text: `${commitmentType === "receivable" ? "Valor a entrar" : "Valor a sair"} ${currency.format(commitment.amount)}${commitment.dueDate ? ` - ${formatOptionalDate(commitment.dueDate)}` : " - Sem vencimento"}` }));
  head.appendChild(copy);
  head.appendChild(createElement("div", { className: "commitment-value" }, [
    createElement("strong", { text: currency.format(commitment.amount) }),
    createElement("span", { text: commitmentType === "receivable" ? "Entrada prevista" : "Saída prevista" }),
  ]));
  card.appendChild(head);
  card.appendChild(createElement("div", { className: "commitment-meta" }, [
    createElement("span", { text: commitment.dueDate ? `Prazo ${formatOptionalDate(commitment.dueDate)}` : "Sem data definida" }),
    createElement("span", { text: isLaunched ? "Já virou movimento real" : "Ainda não entrou no histórico" }),
  ]));

  const actions = createElement("div", { className: "commitment-actions" });
  const edit = createElement("button", { className: "secondary-action compact commitment-action", attrs: { type: "button" }, text: "Editar" });
  edit.dataset.commitmentEdit = commitment.id;
  const toggle = createElement("button", { className: "secondary-action compact commitment-action", attrs: { type: "button" }, text: isPending ? "Concluir e lançar" : "Reabrir" });
  toggle.dataset.commitmentToggle = commitment.id;
  actions.append(edit, toggle);
  if (canLaunch) {
    const launch = createElement("button", { className: `secondary-action compact commitment-action ${pendingLaunch ? "pending-confirm" : ""}`, attrs: { type: "button" }, text: launchLabel });
    launch.dataset.commitmentLaunch = commitment.id;
    actions.appendChild(launch);
  }
  card.appendChild(actions);

  const metaActions = createElement("div", { className: "commitment-meta-actions" });
  const del = createElement("button", { className: `text-button ${pendingDelete ? "pending" : ""}`, attrs: { type: "button" }, text: pendingDelete ? "Confirmar" : "Excluir" });
  del.dataset.commitmentDelete = commitment.id;
  metaActions.appendChild(del);
  card.appendChild(metaActions);

  return card;
}
function getCommitmentDueState(commitment) {
  if (!commitment?.dueDate) {
    return { label: "Sem vencimento", className: "no-date", badgeTone: "muted" };
  }

  const due = new Date(`${commitment.dueDate}T12:00:00`);
  if (Number.isNaN(due.getTime())) {
    return { label: "Data inválida", className: "no-date", badgeTone: "muted" };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDay = new Date(due);
  dueDay.setHours(0, 0, 0, 0);
  const diffDays = Math.round((dueDay.getTime() - today.getTime()) / 86400000);

  if (diffDays < 0) {
    return { label: "Atrasado", className: "overdue", badgeTone: "danger" };
  }
  if (diffDays === 0) {
    return { label: "Vence hoje", className: "due-today", badgeTone: "warning" };
  }
  if (diffDays <= 7) {
    return { label: `Em ${diffDays} dia${diffDays === 1 ? "" : "s"}`, className: "due-soon", badgeTone: "info" };
  }
  return { label: formatOptionalDate(commitment.dueDate), className: "future", badgeTone: "muted" };
}

function groupPendingCommitments(items) {
  const buckets = {
    overdue: [],
    today: [],
    week: [],
    later: [],
    nodate: [],
  };

  [...items]
    .sort((a, b) => {
      const aDate = a.dueDate || "9999-12-31";
      const bDate = b.dueDate || "9999-12-31";
      if (aDate !== bDate) return aDate.localeCompare(bDate);
      return String(a.createdAt || "").localeCompare(String(b.createdAt || ""));
    })
    .forEach((commitment) => {
      const stateInfo = getCommitmentDueState(commitment);
      if (stateInfo.className === "overdue") buckets.overdue.push(commitment);
      else if (stateInfo.className === "due-today") buckets.today.push(commitment);
      else if (stateInfo.className === "due-soon") buckets.week.push(commitment);
      else if (stateInfo.className === "future") buckets.later.push(commitment);
      else buckets.nodate.push(commitment);
    });

  return buckets;
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
      ? `Você já guardou ${currency.format(reserved)} em ${goalCount} meta${goalCount === 1 ? "" : "s"}.`
      : "Separe parte do saldo e acompanhe o progresso de cada meta.";
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

  elements.goalList.replaceChildren(
    ...(state.goals.length
      ? state.goals.map((goal) => renderGoalCard(goal, available))
      : [renderEmptyState("Nenhuma meta ainda", "Crie um cofrinho para separar parte do saldo.")]),
  );
}

function renderGoalCard(goal, availableBalance) {
  const progress = goal.targetAmount > 0 ? Math.round((goal.savedAmount / goal.targetAmount) * 100) : 0;
  const fill = clampPercent(progress);
  const complete = goal.savedAmount >= goal.targetAmount;
  const pending = state.pendingDeleteGoal === goal.id;
  const accentKey = resolveGoalAccent(goal);
  const accent = getGoalAccentTheme(accentKey);
  const style = {
    "--goal-accent": accent.color,
    "--goal-accent-soft": accent.soft,
    "--goal-accent-faint": accent.faint,
    "--goal-accent-glow": accent.glow,
    "--goal-accent-border": accent.border,
    "--goal-accent-progress": accent.progress,
  };
  const card = createElement("article", {
    className: `goal-card ${complete ? "complete" : ""} ${pending ? "pending-delete" : ""}`,
    dataset: { goalAccent: accentKey },
    style,
  });

  const head = createElement("div", { className: "goal-head" });
  head.appendChild(createElement("div", { className: "goal-copy" }, [
    createElement("span", { className: "mini-label goal-accent-pill", text: "Meta" }),
    createElement("strong", { text: capitalize(goal.name) }),
    createElement("p", { text: `Guardado ${currency.format(goal.savedAmount)} - Alvo ${currency.format(goal.targetAmount)}` }),
  ]));
  head.appendChild(createElement("div", { className: "goal-progress-copy" }, [
    createElement("strong", { text: progress >= 100 ? "100%+" : `${progress}%` }),
    createElement("span", { text: complete ? "Concluída" : "Em andamento" }),
  ]));
  card.appendChild(head);

  const track = createElement("div", { className: "goal-track", attrs: { "aria-hidden": "true" } });
  track.appendChild(createElement("div", { className: "goal-fill", style: { width: `${fill}%` } }));
  card.appendChild(track);

  const actions = createElement("div", { className: "goal-actions" });
  const save = createElement("button", { className: "secondary-action compact goal-action", attrs: { type: "button" }, text: "Guardar" });
  save.dataset.goalSave = goal.id;
  save.disabled = availableBalance <= 0;
  const remove = createElement("button", { className: "secondary-action compact goal-action", attrs: { type: "button" }, text: "Remover" });
  remove.dataset.goalRemove = goal.id;
  remove.disabled = goal.savedAmount <= 0;
  actions.append(save, remove);
  card.appendChild(actions);

  const metaActions = createElement("div", { className: "goal-meta-actions" });
  const edit = createElement("button", { className: "text-button", attrs: { type: "button" }, text: "Editar" });
  edit.dataset.goalEdit = goal.id;
  const del = createElement("button", { className: `text-button ${pending ? "pending" : ""}`, attrs: { type: "button" }, text: pending ? "Confirmar" : "Excluir" });
  del.dataset.goalDelete = goal.id;
  metaActions.append(edit, del);
  card.appendChild(metaActions);

  return card;
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
  elements.cycleList.replaceChildren(
    ...(closedCycles.length
      ? closedCycles.map(renderCycleCard)
      : [renderEmptyState("Nenhum ciclo fechado", "Quando você fechar o ciclo atual, ele aparece aqui em modo somente leitura.")]),
  );
  elements.cycleList.querySelectorAll("[data-open-cycle]").forEach((button) => {
    button.addEventListener("click", () => {
      void openCycleDetail(button.dataset.openCycle);
    });
  });
}

function renderCycleCard(cycle) {
  const balanceTone = cycle.balance >= 0 ? "good" : "alert";
  const period = formatCyclePeriod(cycle);
  const card = createElement("article", { className: `cycle-card closed ${balanceTone}` });

  const copy = createElement("div");
  copy.appendChild(createElement("span", { className: "mini-label", text: cycle.status === "active" ? "Ativo" : "Fechado" }));
  copy.appendChild(createElement("strong", { text: cycle.label || "Ciclo" }));
  copy.appendChild(createElement("p", { text: `${period} · ${cycle.movementCount} movimento${cycle.movementCount === 1 ? "" : "s"}` }));
  card.appendChild(copy);

  const side = createElement("div", { className: "cycle-card-side" });
  side.appendChild(createElement("strong", { text: currency.format(cycle.balance) }));
  const button = createElement("button", { className: "text-button", attrs: { type: "button" }, text: "Abrir" });
  button.dataset.openCycle = cycle.id;
  side.appendChild(button);
  card.appendChild(side);

  return card;
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
  elements.cycleDetailList.replaceChildren(renderMovementList(movements, {
    empty: "Este ciclo não tem lançamentos.",
  }));
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


