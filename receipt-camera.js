(() => {
  const DB_NAME = "pulso-movement-drafts";
  const DB_VERSION = 1;
  const STORE_NAME = "drafts";
  const SESSION_PREFIX = "pulso.movement.draft.";

  const state = {
    db: null,
    dbReady: null,
    cameraStream: null,
    cameraOpen: false,
    restoreTimer: null,
    saveTimer: null,
    restoring: false,
    lastRestoredKey: "",
  };

  const $ = (selector, root = document) => root.querySelector(selector);

  function movementSheet() {
    return $("#movement-sheet");
  }

  function movementForm() {
    return $("#movement-form");
  }

  function receiptInput() {
    return $("#receipt-input");
  }

  function cameraSheet() {
    return $("#receipt-camera-sheet");
  }

  function cameraVideo() {
    return $("#receipt-camera-video");
  }

  function cameraCaptureButton() {
    return $("#receipt-camera-capture");
  }

  function openFormButton() {
    return $("#open-form");
  }

  function authReady() {
    return Boolean(window.state && window.state.user && window.state.authStatus === "authenticated");
  }

  function userKey() {
    const user = window.state?.user;
    return String(user?.id || user?.email || "");
  }

  function draftKey() {
    return `${SESSION_PREFIX}${userKey()}`;
  }

  function isOpen(sheet) {
    return Boolean(sheet && sheet.classList.contains("open"));
  }

  function currentType() {
    return window.state?.formType || $(".type-toggle .toggle-option.active")?.dataset.type || "expense";
  }

  function currentCategory() {
    return $("#category")?.value || window.state?.selectedCategory || "";
  }

  function fieldValue(selector) {
    return String($(selector)?.value || "");
  }

  function buildSnapshot() {
    return {
      type: currentType(),
      movementId: fieldValue("#movement-id"),
      amount: fieldValue("#amount"),
      category: currentCategory(),
      description: fieldValue("#description"),
      date: fieldValue("#date"),
      open: isOpen(movementSheet()),
      updatedAt: Date.now(),
      receiptMeta: captureReceiptMeta(),
    };
  }

  function captureReceiptMeta(file = null) {
    const source = file || receiptInput()?.files?.[0] || window.state?.receiptDraft?.file || null;
    if (!source) return null;
    return {
      name: source.name || "comprovante",
      type: source.type || "application/octet-stream",
      size: Number(source.size || 0),
      lastModified: Number(source.lastModified || Date.now()),
    };
  }

  async function openDatabase() {
    if (state.db) return state.db;
    if (!("indexedDB" in window)) return null;

    state.dbReady = state.dbReady || new Promise((resolve) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: "key" });
        }
      };
      request.onsuccess = () => {
        state.db = request.result;
        resolve(state.db);
      };
      request.onerror = () => resolve(null);
    });

    return state.dbReady;
  }

  async function dbGet(key) {
    const db = await openDatabase();
    if (!db) return null;
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => resolve(null);
    });
  }

  async function dbPut(record) {
    const db = await openDatabase();
    if (!db) return false;
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).put(record);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  }

  async function dbDelete(key) {
    const db = await openDatabase();
    if (!db) return false;
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).delete(key);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  }

  function updateSessionSnapshot(snapshot) {
    try {
      sessionStorage.setItem(draftKey(), JSON.stringify(snapshot));
    } catch {
      // sessionStorage pode estar indisponível; o IDB cobre o fluxo principal.
    }
  }

  function readSessionSnapshot() {
    try {
      const raw = sessionStorage.getItem(draftKey());
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function syncTypeUI(type) {
    const buttons = $$(".type-toggle .toggle-option");
    buttons.forEach((button) => button.classList.toggle("active", button.dataset.type === type));
    if (window.state) {
      window.state.formType = type;
    }
  }

  function syncCategoryUI(category) {
    const label = $("#category-select-label");
    const hidden = $("#category");
    if (hidden) hidden.value = category || "";
    if (label) label.textContent = category ? capitalize(category) : "Escolher categoria";
    if (window.state) {
      window.state.selectedCategory = category || "";
    }
  }

  function fillForm(snapshot) {
    if (!snapshot) return;
    syncTypeUI(snapshot.type || "expense");
    const movementId = $("#movement-id");
    const amount = $("#amount");
    const description = $("#description");
    const date = $("#date");

    if (movementId) movementId.value = snapshot.movementId || "";
    if (amount) amount.value = snapshot.amount || "";
    if (description) description.value = snapshot.description || "";
    if (date) date.value = snapshot.date || "";
    syncCategoryUI(snapshot.category || "");
  }

  async function saveDraft(fileOverride) {
    if (!authReady()) return;
    const snapshot = buildSnapshot();
    const file = fileOverride || receiptInput()?.files?.[0] || window.state?.receiptDraft?.file || null;
    const record = {
      key: draftKey(),
      userKey: userKey(),
      snapshot,
      receiptFile: file || null,
      receiptMeta: captureReceiptMeta(file),
      updatedAt: Date.now(),
    };

    updateSessionSnapshot(snapshot);
    await dbPut(record);
  }

  async function clearDraft() {
    if (!userKey()) return;
    try {
      sessionStorage.removeItem(draftKey());
    } catch {
      // ignore
    }
    await dbDelete(draftKey());
  }

  function scheduleSave(fileOverride) {
    clearTimeout(state.saveTimer);
    state.saveTimer = setTimeout(() => {
      saveDraft(fileOverride).catch(() => {});
    }, 140);
  }

  function stopCameraStream() {
    if (!state.cameraStream) return;
    state.cameraStream.getTracks().forEach((track) => track.stop());
    state.cameraStream = null;
  }

  async function openCameraSheet() {
    if (!navigator.mediaDevices?.getUserMedia) {
      const input = receiptInput();
      if (input) {
        input.value = "";
        input.removeAttribute("capture");
        input.accept = "image/*";
        input.setAttribute("capture", "environment");
        input.click();
      }
      return;
    }

    const sheet = cameraSheet();
    const video = cameraVideo();
    if (!sheet || !video) return;

    await saveDraft().catch(() => {});
    state.cameraOpen = true;
    sheet.classList.add("open");
    sheet.setAttribute("aria-hidden", "false");

    try {
      stopCameraStream();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });
      state.cameraStream = stream;
      video.srcObject = stream;
      await video.play().catch(() => {});
      $("#receipt-camera-state").textContent = "Câmera ativa";
    } catch (error) {
      $("#receipt-camera-state").textContent = "Não foi possível abrir a câmera";
      closeCameraSheet();
      const input = receiptInput();
      if (input) {
        input.value = "";
        input.removeAttribute("capture");
        input.accept = "image/*";
        input.setAttribute("capture", "environment");
        input.click();
      }
      if (typeof window.showToast === "function") {
        window.showToast("Não conseguimos abrir a câmera. Use escolher imagem.", "neutral");
      }
      return;
    }
  }

  function closeCameraSheet() {
    const sheet = cameraSheet();
    if (!sheet) return;
    state.cameraOpen = false;
    stopCameraStream();
    sheet.classList.remove("open");
    sheet.setAttribute("aria-hidden", "true");
    const video = cameraVideo();
    if (video) {
      video.pause?.();
      video.srcObject = null;
      video.removeAttribute("src");
    }
    const status = $("#receipt-camera-state");
    if (status) status.textContent = "Câmera traseira preferencial";
  }

  async function captureCameraFrame() {
    const video = cameraVideo();
    if (!video || !video.videoWidth || !video.videoHeight) {
      if (typeof window.showToast === "function") {
        window.showToast("A câmera ainda não está pronta.", "neutral");
      }
      return;
    }

    const longestSide = Math.max(video.videoWidth, video.videoHeight);
    const targetMax = Math.min(longestSide, 1800);
    const scale = targetMax / longestSide;
    const width = Math.max(1, Math.round(video.videoWidth * scale));
    const height = Math.max(1, Math.round(video.videoHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return;

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.drawImage(video, 0, 0, width, height);

    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob((result) => {
        if (result) resolve(result);
        else reject(new Error("camera_encode_failed"));
      }, "image/jpeg", 0.84);
    });

    const file = new File([blob], `comprovante-${Date.now()}.jpg`, {
      type: "image/jpeg",
      lastModified: Date.now(),
    });

    const input = receiptInput();
    if (!input) return;

    const transfer = new DataTransfer();
    transfer.items.add(file);
    input.files = transfer.files;
    input.dispatchEvent(new Event("change", { bubbles: true }));
    closeCameraSheet();
    saveDraft(file).catch(() => {});
  }

  function restoreFileFromRecord(record) {
    if (!record?.receiptFile || !receiptInput()) return;
    const input = receiptInput();
    const meta = record.receiptMeta || record.snapshot?.receiptMeta || {};
    const file = record.receiptFile instanceof File
      ? record.receiptFile
      : new File([record.receiptFile], meta.name || "comprovante", {
          type: meta.type || record.receiptFile.type || "application/octet-stream",
          lastModified: meta.lastModified || Date.now(),
        });
    const transfer = new DataTransfer();
    transfer.items.add(file);
    input.value = "";
    input.files = transfer.files;
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }

  async function restoreDraftIfNeeded() {
    if (!authReady()) return;
    const key = userKey();
    if (!key || state.lastRestoredKey === key || state.restoring) return;
    state.restoring = true;
    try {
      const record = (await dbGet(draftKey())) || readSessionSnapshot();
      if (!record) return;

      const snapshot = record.snapshot || record;
      if (!snapshot) return;

      if (!isOpen(movementSheet()) && openFormButton()) {
        openFormButton().click();
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      } else {
        await new Promise((resolve) => requestAnimationFrame(resolve));
      }

      fillForm(snapshot);
      if (record.receiptFile) {
        restoreFileFromRecord(record);
      }

      state.lastRestoredKey = key;
      if (typeof window.syncReceiptPanel === "function") {
        window.syncReceiptPanel(true);
      }
    } finally {
      state.restoring = false;
    }
  }

  function patchGlobalFunction(name, wrapper) {
    const original = window[name];
    if (typeof original !== "function") return false;
    window[name] = wrapper(original);
    return true;
  }

  function capitalize(value) {
    const text = String(value || "");
    return text ? text.charAt(0).toUpperCase() + text.slice(1) : text;
  }

  function attachListeners() {
    const form = movementForm();
    const receipt = receiptInput();
    const camera = $("#receipt-camera");
    const gallery = $("#receipt-gallery");
    const pdf = $("#receipt-pdf");
    const replace = $("#receipt-replace");
    const remove = $("#receipt-remove");
    const closeButtons = $$("[data-close-sheet], [data-close-receipt-camera]");

    if (form) {
      form.addEventListener("input", () => scheduleSave(), true);
      form.addEventListener("change", () => scheduleSave(), true);
      form.addEventListener("click", (event) => {
        if (event.target.closest("#category-select, .toggle-option")) {
          scheduleSave();
        }
      }, true);
    }

    if (receipt) {
      receipt.addEventListener("change", (event) => {
        const file = event.target.files?.[0] || null;
        if (file) {
          saveDraft(file).catch(() => {});
        } else {
          scheduleSave();
        }
      }, true);
    }

    if (camera) {
      camera.addEventListener("click", async (event) => {
        event.preventDefault();
        event.stopImmediatePropagation();
        await openCameraSheet();
      }, true);
    }

    if (gallery) {
      gallery.addEventListener("click", () => scheduleSave(), true);
    }

    if (pdf) {
      pdf.addEventListener("click", () => scheduleSave(), true);
    }

    if (replace) {
      replace.addEventListener("click", () => scheduleSave(), true);
    }

    if (remove) {
      remove.addEventListener("click", () => scheduleSave(), true);
    }

    closeButtons.forEach((button) => {
      button.addEventListener("click", () => {
        if (button.hasAttribute("data-close-receipt-camera")) {
          closeCameraSheet();
          return;
        }
        clearDraft().catch(() => {});
      }, true);
    });

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        saveDraft().catch(() => {});
      } else {
        restoreDraftIfNeeded().catch(() => {});
      }
    });

    window.addEventListener("pagehide", () => {
      saveDraft().catch(() => {});
      closeCameraSheet();
    });

    window.addEventListener("beforeunload", () => {
      saveDraft().catch(() => {});
    });

    if (typeof window.closeSheet === "function") {
      patchGlobalFunction("closeSheet", (original) => function patchedCloseSheet(...args) {
        const result = original.apply(this, args);
        clearDraft().catch(() => {});
        return result;
      });
    }

    if (typeof window.saveMovement === "function") {
      patchGlobalFunction("saveMovement", (original) => async function patchedSaveMovement(...args) {
        const result = await original.apply(this, args);
        const sheet = movementSheet();
        if (!sheet || !sheet.classList.contains("open")) {
          clearDraft().catch(() => {});
        }
        return result;
      });
    }

    if (typeof window.applyReceiptSelection === "function") {
      patchGlobalFunction("applyReceiptSelection", (original) => async function patchedApplyReceiptSelection(...args) {
        const result = await original.apply(this, args);
        if (result) {
          scheduleSave();
        }
        return result;
      });
    }

    if (typeof window.removeReceiptSelection === "function") {
      patchGlobalFunction("removeReceiptSelection", (original) => function patchedRemoveReceiptSelection(...args) {
        const result = original.apply(this, args);
        scheduleSave();
        return result;
      });
    }
  }

  function watchForAuthAndRestore() {
    clearInterval(state.restoreTimer);
    state.restoreTimer = setInterval(() => {
      if (!authReady()) return;
      restoreDraftIfNeeded().catch(() => {});
      if (state.lastRestoredKey === userKey()) {
        clearInterval(state.restoreTimer);
      }
    }, 500);
  }

  function boot() {
    if (!movementSheet() || !movementForm() || !receiptInput() || !cameraSheet()) {
      requestAnimationFrame(boot);
      return;
    }

    attachListeners();
    watchForAuthAndRestore();

    if (authReady()) {
      restoreDraftIfNeeded().catch(() => {});
    }
  }

  window.addEventListener("load", boot);

  document.addEventListener("click", (event) => {
    const captureButton = event.target.closest("#receipt-camera-capture");
    if (captureButton) {
      event.preventDefault();
      captureCameraFrame().catch(() => {
        if (typeof window.showToast === "function") {
          window.showToast("Não conseguimos capturar a foto agora.", "neutral");
        }
      });
      return;
    }

    const closeCamera = event.target.closest("[data-close-receipt-camera]");
    if (closeCamera) {
      closeCameraSheet();
    }
  }, true);
})();
