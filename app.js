const STORAGE_KEY = "pulso.movements.v1";

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

const categoriesByType = {
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
  movements: loadMovements(),
  activeTab: "summary",
  activeFilter: "all",
  formType: "expense",
  selectedCategory: "alimentação",
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const dateFormatter = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" });
const monthFormatter = new Intl.DateTimeFormat("pt-BR", { month: "long" });

const elements = {
  screenTitle: $("#screen-title"),
  screenPeriod: $("#screen-period"),
  summaryPeriod: $("#summary-period"),
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
  saveToast: $("#save-toast"),
  sheet: $("#movement-sheet"),
  form: $("#movement-form"),
  formTitle: $("#form-title"),
  movementId: $("#movement-id"),
  amount: $("#amount"),
  category: $("#category"),
  categoryContext: $("#category-context"),
  categoryPicker: $("#category-picker"),
  description: $("#description"),
  date: $("#date"),
};

init();

function init() {
  renderCategoryPicker();
  bindEvents();
  registerServiceWorker();
  render();
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

function bindEvents() {
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

  $("#open-form").addEventListener("click", () => openSheet());

  $$("[data-close-sheet]").forEach((element) => {
    element.addEventListener("click", closeSheet);
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

  $("#reset-demo").addEventListener("click", () => {
    state.movements = demoMovements.map((movement) => ({ ...movement, id: crypto.randomUUID() }));
    persist();
    render({ pulse: true });
  });
}

function renderCategoryPicker(preferredCategory = state.selectedCategory) {
  const categories = categoriesByType[state.formType];
  const nextCategory = categories.includes(preferredCategory) ? preferredCategory : categories[0];

  elements.categoryContext.textContent = state.formType === "income" ? "para entrada" : "para saída";
  elements.categoryPicker.classList.remove("switching");
  void elements.categoryPicker.offsetWidth;
  elements.categoryPicker.classList.add("switching");
  elements.categoryPicker.innerHTML = categories
    .map((category) => {
      const meta = getCategoryMeta(category);
      return `<button class="category-option" type="button" role="option" data-category="${category}" style="--category-color:${meta.color}" aria-selected="false">
        <span>${meta.icon}</span>
        ${capitalize(category)}
      </button>`;
    })
    .join("");
  elements.categoryPicker.querySelectorAll("[data-category]").forEach((button) => {
    button.addEventListener("click", () => selectCategory(button.dataset.category));
  });
  selectCategory(nextCategory);
}

function setActiveTab(tab) {
  state.activeTab = tab;
  $$(".nav-tab").forEach((button) => button.classList.toggle("active", button.dataset.tab === tab));
  $$(".tab-panel").forEach((panel) => panel.classList.toggle("active", panel.id === `tab-${tab}`));
  const panel = $(`#tab-${tab}`);
  elements.screenTitle.textContent = panel.dataset.title;
  elements.screenPeriod.textContent = tab === "history" ? "Linha do tempo" : periodLabel(tab);
}

function openSheet(movement = null) {
  elements.form.reset();
  elements.date.value = new Date().toISOString().slice(0, 10);
  elements.movementId.value = "";
  elements.formTitle.textContent = "Adicionar rápido";
  setFormType("expense");
  renderCategoryPicker("alimentação");

  if (movement) {
    elements.formTitle.textContent = "Editar movimento";
    elements.movementId.value = movement.id;
    elements.amount.value = formatMoneyInput(movement.amount);
    elements.description.value = movement.description;
    elements.date.value = movement.date;
    setFormType(movement.type);
    renderCategoryPicker(movement.category);
  }

  elements.sheet.classList.add("open");
  elements.sheet.setAttribute("aria-hidden", "false");
  setTimeout(() => elements.amount.focus(), 120);
}

function closeSheet() {
  elements.sheet.classList.remove("open");
  elements.sheet.setAttribute("aria-hidden", "true");
}

function setFormType(type) {
  state.formType = type;
  $$(".toggle-option").forEach((button) => button.classList.toggle("active", button.dataset.type === type));
  renderCategoryPicker();
}

function selectCategory(category) {
  state.selectedCategory = category;
  elements.category.value = category;
  elements.categoryPicker.querySelectorAll("[data-category]").forEach((button) => {
    const active = button.dataset.category === category;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", String(active));
  });
}

function saveMovement(event) {
  event.preventDefault();
  const isEditing = Boolean(elements.movementId.value);

  const movement = {
    id: elements.movementId.value || crypto.randomUUID(),
    type: state.formType,
    amount: parseMoney(elements.amount.value),
    category: elements.category.value || state.selectedCategory,
    description: elements.description.value.trim(),
    date: elements.date.value,
  };

  if (!movement.amount || movement.amount <= 0 || !movement.description || !movement.date) {
    return;
  }

  const existingIndex = state.movements.findIndex((item) => item.id === movement.id);
  if (existingIndex >= 0) {
    state.movements[existingIndex] = movement;
  } else {
    state.movements.unshift(movement);
  }

  persist();
  closeSheet();
  render({ pulse: true });
  showToast(isEditing ? "Movimentação atualizada" : movement.type === "income" ? "Entrada salva" : "Saída salva", "success");
}

function deleteMovement(id, element) {
  if (element) {
    element.classList.add("removing");
  }
  setTimeout(() => {
    state.movements = state.movements.filter((movement) => movement.id !== id);
    persist();
    render({ pulse: true });
    showToast("Movimentação excluída", "neutral");
  }, element ? 180 : 0);
}

function render(options = {}) {
  const totals = getTotals();
  renderSummary(totals, options);
  renderHistory();
  renderAnalysis(totals);
  renderInsights(totals);
}

function renderSummary(totals, options = {}) {
  const spendRatio = totals.income ? Math.min(totals.expense / totals.income, 1) : 0;
  const degrees = Math.round(spendRatio * 360);
  const percent = Math.round(spendRatio * 100);
  const isEmpty = state.movements.length === 0;

  elements.summaryPeriod.textContent = periodLabel("summary").toLowerCase();
  elements.balance.textContent = currency.format(totals.balance);
  elements.income.textContent = currency.format(totals.income);
  elements.expense.textContent = currency.format(totals.expense);
  elements.balanceNote.textContent = isEmpty
    ? "Comece com um gasto pequeno. O Pulso cuida do desenho."
    : totals.balance >= 0
      ? "Você ainda está respirando bem neste mês."
      : "O mês virou para o vermelho. Dá para corrigir cedo.";
  elements.behaviorRing.style.background = `conic-gradient(var(--cyan) ${degrees}deg, rgba(255,255,255,.08) ${degrees}deg)`;
  elements.behaviorPercent.textContent = `${percent}%`;

  if (isEmpty) {
    elements.behaviorTitle.textContent = "Pronto para começar";
    elements.behaviorCopy.textContent = "Um registro já revela o primeiro sinal.";
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
    empty: "Seu resumo fica vivo assim que você adiciona a primeira movimentação.",
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
    empty: "Nada neste filtro. Toque no + para registrar uma movimentação.",
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
  const grouped = groupExpensesByCategory();
  const top = grouped[0];
  const expenseCount = state.movements.filter((movement) => movement.type === "expense").length;

  elements.analysisPeriod.textContent = `Análise de ${monthFormatter.format(new Date())}`;
  elements.analysisTotal.textContent = `${currency.format(totals.expense)} em saídas`;
  elements.analysisCount.textContent = `${expenseCount} movimento${expenseCount === 1 ? "" : "s"}`;

  if (!top) {
    elements.topCategory.textContent = "Sem gastos ainda";
    elements.topCategoryCopy.textContent = "Registre uma saída para o Pulso desenhar a distribuição.";
    elements.categoryBars.innerHTML = renderEmptyState("Análise limpa", "Suas categorias aparecem aqui com cor, peso e proporção.");
    elements.categoryDonut.style.background = "conic-gradient(rgba(255,255,255,.08) 0 360deg)";
    elements.donutCenter.textContent = "0%";
    return;
  }

  const topShare = Math.round((top.total / totals.expense) * 100);
  elements.topCategory.textContent = capitalize(top.category);
  elements.topCategoryCopy.textContent = `${topShare}% das saídas em ${periodLabel("analysis").toLowerCase()}. ${currency.format(top.total)} no total.`;
  elements.donutCenter.textContent = `${topShare}%`;
  elements.categoryBars.innerHTML = grouped.map((item) => renderCategoryRow(item, totals.expense)).join("");
  elements.categoryDonut.style.background = buildDonutGradient(grouped, totals.expense);
}

function renderInsights(totals) {
  const insights = buildInsights(totals);
  const [lead, ...rest] = insights;
  elements.insightHeadline.textContent = lead?.title || "Seu padrão aparece aqui.";
  elements.insightSubtitle.textContent = lead?.copy || "Adicione algumas movimentações para gerar leituras úteis.";
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
      const meta = getCategoryMeta(movement.category);
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
          <span>${capitalize(movement.category)} · ${formatDate(movement.date)}</span>
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
      title: `${capitalize(top.category)} está puxando o mês`,
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
  const map = new Map();
  state.movements
    .filter((movement) => movement.type === "expense")
    .forEach((movement) => {
      const current = map.get(movement.category) || { category: movement.category, total: 0, count: 0 };
      current.total += movement.amount;
      current.count += 1;
      map.set(movement.category, current);
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

function loadMovements() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return demoMovements;

  try {
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : demoMovements;
  } catch {
    return demoMovements;
  }
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.movements));
}

function periodLabel(tab) {
  const month = monthFormatter.format(new Date());
  const labels = {
    summary: `Este mês · ${capitalize(month)}`,
    analysis: `${capitalize(month)} · últimos 30 dias`,
    insights: "Este mês · últimos 7 dias",
  };
  return labels[tab] || `Este mês · ${capitalize(month)}`;
}

function formatDate(date) {
  return dateFormatter.format(new Date(`${date}T12:00:00`)).replace(".", "");
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
