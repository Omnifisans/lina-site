(() => {
  "use strict";

  // =========================================================
  // Configuration
  // =========================================================

  const SUPABASE_URL = "https://dalipumytxktfrtqhxxm.supabase.co";
  const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_re7xSQ02x55-CTUDSbIpYQ_1qX8tRqN";
  const LINA_USER_ID = "984948c4-d839-4cc7-9635-8868c7ddc6a7";
  const STORAGE_BUCKET = "product-images";
  const MAX_IMAGE_SIZE = 50 * 1024 * 1024;
  const FALLBACK_IMAGE = "nezhno-art.jpg";

  const CATEGORY_META = {
    banner: "Баннеры",
    stickers: "Стикеры",
    model: "Модели",
  };

  if (!window.supabase?.createClient) {
    console.error("[nezhno.art admin] Supabase JS не загрузился.");
    return;
  }

  const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
  );

  // =========================================================
  // DOM
  // =========================================================

  const root = document.documentElement;

  const bootScreen = document.getElementById("admin-boot");
  const authScreen = document.getElementById("auth-screen");
  const adminShell = document.getElementById("admin-shell");

  const loginForm = document.getElementById("login-form");
  const loginEmail = document.getElementById("login-email");
  const loginPassword = document.getElementById("login-password");
  const loginError = document.getElementById("login-error");
  const loginSubmit = document.getElementById("login-submit");
  const authThemeToggle = document.getElementById("auth-theme-toggle");

  const themeToggle = document.getElementById("theme-toggle");
  const logoutButton = document.getElementById("logout-button");
  const adminUserEmail = document.getElementById("admin-user-email");

  const addProductButton = document.getElementById("add-product-button");
  const emptyAddButton = document.getElementById("empty-add-button");
  const refreshProductsButton = document.getElementById("refresh-products-button");
  const retryProductsButton = document.getElementById("retry-products-button");
  const productSearch = document.getElementById("product-search");
  const visibilityFilter = document.getElementById("visibility-filter");

  const productsGrid = document.getElementById("products-grid");
  const productsLoading = document.getElementById("products-loading");
  const productsError = document.getElementById("products-error");
  const productsErrorText = document.getElementById("products-error-text");
  const productsEmpty = document.getElementById("products-empty");
  const productsNoResults = document.getElementById("products-no-results");

  const statTotal = document.getElementById("stat-total");
  const statActive = document.getElementById("stat-active");
  const statHidden = document.getElementById("stat-hidden");

  const productDialog = document.getElementById("product-dialog");
  const productDialogClose = document.getElementById("product-dialog-close");
  const productCancelButton = document.getElementById("product-cancel-button");
  const productForm = document.getElementById("product-form");
  const productDialogKicker = document.getElementById("product-dialog-kicker");
  const productDialogTitle = document.getElementById("product-dialog-title");
  const productFormError = document.getElementById("product-form-error");
  const productSaveButton = document.getElementById("product-save-button");

  const productId = document.getElementById("product-id");
  const productTitle = document.getElementById("product-title");
  const productCategory = document.getElementById("product-category");
  const productPrice = document.getElementById("product-price");
  const productDescription = document.getElementById("product-description");
  const descriptionCounter = document.getElementById("description-counter");
  const productSortOrder = document.getElementById("product-sort-order");
  const productActive = document.getElementById("product-active");
  const productImage = document.getElementById("product-image");
  const imagePreview = document.getElementById("image-preview");
  const imageStatus = document.getElementById("image-status");
  const selectedImageName = document.getElementById("selected-image-name");
  const removeImageButton = document.getElementById("remove-image-button");

  const deleteDialog = document.getElementById("delete-dialog");
  const deleteDialogClose = document.getElementById("delete-dialog-close");
  const deleteCancelButton = document.getElementById("delete-cancel-button");
  const deleteConfirmButton = document.getElementById("delete-confirm-button");
  const deleteProductName = document.getElementById("delete-product-name");

  const toast = document.getElementById("admin-toast");

  const productsTab = document.getElementById("products-tab");
  const messagesTab = document.getElementById("messages-tab");
  const messagesBadge = document.getElementById("messages-badge");
  const adminProductsView = document.getElementById("admin-products-view");
  const adminMessagesView = document.getElementById("admin-messages-view");
  const refreshConversationsButton = document.getElementById("refresh-conversations-button");
  const conversationSearch = document.getElementById("conversation-search");
  const conversationsLoading = document.getElementById("conversations-loading");
  const conversationsEmpty = document.getElementById("conversations-empty");
  const conversationList = document.getElementById("conversation-list");
  const adminChatPlaceholder = document.getElementById("admin-chat-placeholder");
  const adminChatActive = document.getElementById("admin-chat-active");
  const adminChatName = document.getElementById("admin-chat-name");
  const adminChatEmail = document.getElementById("admin-chat-email");
  const adminChatMessages = document.getElementById("admin-chat-messages");
  const adminChatForm = document.getElementById("admin-chat-form");
  const adminChatInput = document.getElementById("admin-chat-input");
  const adminChatSend = document.getElementById("admin-chat-send");
  const adminChatFile = document.getElementById("admin-chat-file");
  const adminChatAttachmentPreview = document.getElementById("admin-chat-attachment-preview");

  // =========================================================
  // State
  // =========================================================

  let products = [];
  let editingProduct = null;
  let deletingProduct = null;
  let imageObjectUrl = null;
  let removeExistingImage = false;
  let toastTimer = null;
  let isSaving = false;

  let conversations = [];
  let conversationProfiles = new Map();
  let conversationLatest = new Map();
  let selectedConversation = null;
  let adminMessageChannel = null;
  let adminPendingAttachment = null;
  let adminAttachmentObjectUrl = null;
  let conversationsLoaded = false;
  let conversationsRefreshTimer = null;
  const renderedAdminMessageIds = new Set();

  // =========================================================
  // Small helpers
  // =========================================================

  const formatPrice = (value) =>
    new Intl.NumberFormat("ru-RU").format(Number(value) || 0);

  const normalizeText = (value) => String(value || "").trim().toLocaleLowerCase("ru");

  const setFormError = (element, message = "") => {
    if (!element) return;
    element.textContent = message;
    element.classList.toggle("visible", Boolean(message));
  };

  const showToast = (message, type = "success") => {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.toggle("is-error", type === "error");
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2800);
  };

  const setButtonLoading = (button, loading, loadingText) => {
    if (!button) return;

    if (loading) {
      button.dataset.loadingOriginalText = button.textContent.trim();
      button.disabled = true;
      button.textContent = loadingText;
      return;
    }

    button.disabled = false;
    button.textContent = button.dataset.loadingOriginalText || button.textContent;
    delete button.dataset.loadingOriginalText;
  };

  const openDialog = (dialog) => {
    if (!dialog) return;
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  };

  const closeDialog = (dialog) => {
    if (!dialog) return;
    if (typeof dialog.close === "function" && dialog.open) dialog.close();
    else dialog.removeAttribute("open");
  };

  const buildFallbackImage = (img) => {
    img.addEventListener(
      "error",
      () => {
        if (!img.src.endsWith(FALLBACK_IMAGE)) img.src = FALLBACK_IMAGE;
      },
      { once: true }
    );
  };

  // =========================================================
  // Theme — same localStorage key as the main page
  // =========================================================

  const getInitialTheme = () => {
    try {
      const saved = localStorage.getItem("nezhno-theme");
      if (saved === "light" || saved === "dark") return saved;
    } catch (_) {
      // Storage can be blocked in private modes.
    }
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  };

  const applyTheme = (theme) => {
    root.dataset.theme = theme;
    try {
      localStorage.setItem("nezhno-theme", theme);
    } catch (_) {
      // The theme still works for this page load.
    }
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", theme === "dark" ? "#160f11" : "#fff9f8");
  };

  const toggleTheme = () => applyTheme(root.dataset.theme === "dark" ? "light" : "dark");

  applyTheme(getInitialTheme());
  themeToggle?.addEventListener("click", toggleTheme);
  authThemeToggle?.addEventListener("click", toggleTheme);

  // =========================================================
  // Auth
  // =========================================================

  const showBoot = () => {
    bootScreen?.classList.remove("hidden");
    authScreen?.classList.add("hidden");
    adminShell?.classList.add("hidden");
  };

  const showLogin = () => {
    bootScreen?.classList.add("hidden");
    authScreen?.classList.remove("hidden");
    adminShell?.classList.add("hidden");
    setFormError(loginError, "");
  };

  const showAdmin = (user) => {
    bootScreen?.classList.add("hidden");
    authScreen?.classList.add("hidden");
    adminShell?.classList.remove("hidden");
    if (adminUserEmail) adminUserEmail.textContent = user?.email || "Администратор";
    // Подгружаем счётчик новых диалогов в фоне, даже если открыт каталог.
    window.setTimeout(() => {
      subscribeAdminMessages();
      loadConversations({ quiet: true });
    }, 0);
  };

  const signOutForeignUser = async () => {
    try {
      await supabaseClient.auth.signOut();
    } catch (error) {
      console.warn("[nezhno.art admin] Не удалось завершить чужую сессию:", error);
    }
  };

  const verifyUser = async () => {
    const { data, error } = await supabaseClient.auth.getUser();
    if (error || !data?.user) return null;

    if (data.user.id !== LINA_USER_ID) {
      await signOutForeignUser();
      return null;
    }

    return data.user;
  };

  const initializeAuth = async () => {
    showBoot();
    try {
      const user = await verifyUser();
      if (!user) {
        showLogin();
        return;
      }
      showAdmin(user);
      await loadProducts();
    } catch (error) {
      console.error("[nezhno.art admin] Ошибка проверки авторизации:", error);
      showLogin();
      setFormError(loginError, "Не удалось проверить авторизацию. Обновите страницу и попробуйте снова.");
    }
  };

  loginForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    setFormError(loginError, "");

    const email = loginEmail?.value.trim() || "";
    const password = loginPassword?.value || "";

    if (!email || !password) {
      setFormError(loginError, "Введите email и пароль.");
      return;
    }

    setButtonLoading(loginSubmit, true, "Входим…");

    try {
      const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });

      if (error || !data?.user) {
        console.warn("[nezhno.art admin] Ошибка входа:", error);
        setFormError(loginError, "Неверный email или пароль.");
        return;
      }

      if (data.user.id !== LINA_USER_ID) {
        await signOutForeignUser();
        setFormError(loginError, "У этого аккаунта нет доступа к панели управления.");
        return;
      }

      loginPassword.value = "";
      showAdmin(data.user);
      await loadProducts();
    } catch (error) {
      console.error("[nezhno.art admin] Ошибка входа:", error);
      setFormError(loginError, "Не удалось связаться с сервером. Проверьте интернет и попробуйте снова.");
    } finally {
      setButtonLoading(loginSubmit, false, "Входим…");
    }
  });

  logoutButton?.addEventListener("click", async () => {
    setButtonLoading(logoutButton, true, "…");
    try {
      await supabaseClient.auth.signOut();
    } finally {
      window.location.reload();
    }
  });

  // If the session expires or the user signs out in another tab, close the panel.
  supabaseClient.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_OUT" && !authScreen?.classList.contains("hidden")) return;
    if (event === "SIGNED_OUT") showLogin();
    if (session?.user && session.user.id !== LINA_USER_ID) signOutForeignUser();
  });

  // =========================================================
  // Products
  // =========================================================

  const setProductsLoading = (loading) => {
    productsLoading?.classList.toggle("hidden", !loading);
    if (loading) {
      productsError?.classList.add("hidden");
      productsEmpty?.classList.add("hidden");
      productsNoResults?.classList.add("hidden");
    }
  };

  const updateStats = () => {
    const active = products.filter((item) => item.is_active).length;
    if (statTotal) statTotal.textContent = String(products.length);
    if (statActive) statActive.textContent = String(active);
    if (statHidden) statHidden.textContent = String(products.length - active);
  };

  const getFilteredProducts = () => {
    const query = normalizeText(productSearch?.value);
    const visibility = visibilityFilter?.value || "all";

    return products.filter((product) => {
      const matchesVisibility =
        visibility === "all" ||
        (visibility === "active" && product.is_active) ||
        (visibility === "hidden" && !product.is_active);

      if (!matchesVisibility) return false;
      if (!query) return true;

      const haystack = normalizeText(
        `${product.title || ""} ${product.description || ""} ${CATEGORY_META[product.category] || product.category || ""}`
      );
      return haystack.includes(query);
    });
  };

  const createProductCard = (product) => {
    const article = document.createElement("article");
    article.className = "admin-product-card";
    article.dataset.productId = String(product.id);

    const imageWrap = document.createElement("div");
    imageWrap.className = "admin-product-image";

    const image = document.createElement("img");
    image.src = product.image_url || FALLBACK_IMAGE;
    image.alt = `Изображение товара: ${product.title || "без названия"}`;
    image.loading = "lazy";
    buildFallbackImage(image);

    const state = document.createElement("span");
    state.className = `admin-product-state${product.is_active ? "" : " is-hidden"}`;
    state.textContent = product.is_active ? "Опубликован" : "Скрыт";

    imageWrap.append(image, state);

    const body = document.createElement("div");
    body.className = "admin-product-body";

    const topLine = document.createElement("div");
    topLine.className = "admin-product-topline";

    const category = document.createElement("span");
    category.className = "admin-product-category";
    category.textContent = CATEGORY_META[product.category] || product.category || "Без категории";

    const order = document.createElement("span");
    order.className = "admin-product-order";
    order.textContent = `Порядок: ${Number.isFinite(Number(product.sort_order)) ? product.sort_order : "—"}`;

    topLine.append(category, order);

    const title = document.createElement("h3");
    title.textContent = product.title || "Без названия";

    const description = document.createElement("p");
    description.className = "admin-product-description";
    description.textContent = product.description || "Описание не добавлено.";

    const price = document.createElement("div");
    price.className = "admin-product-price";
    const pricePrefix = document.createElement("span");
    pricePrefix.textContent = "от";
    const priceValue = document.createElement("strong");
    priceValue.textContent = `${formatPrice(product.price_from)} ₽`;
    price.append(pricePrefix, priceValue);

    const actions = document.createElement("div");
    actions.className = "admin-product-actions";

    const editButton = document.createElement("button");
    editButton.className = "admin-card-button";
    editButton.type = "button";
    editButton.textContent = "Редактировать";
    editButton.addEventListener("click", () => openEditProduct(product));

    const visibilityButton = document.createElement("button");
    visibilityButton.className = "admin-card-button";
    visibilityButton.type = "button";
    visibilityButton.title = product.is_active ? "Скрыть с основной страницы" : "Опубликовать на основной странице";
    visibilityButton.setAttribute("aria-label", visibilityButton.title);
    visibilityButton.textContent = product.is_active ? "◉" : "○";
    visibilityButton.addEventListener("click", () => toggleProductVisibility(product, visibilityButton));

    const deleteButton = document.createElement("button");
    deleteButton.className = "admin-card-button is-danger";
    deleteButton.type = "button";
    deleteButton.title = "Удалить товар";
    deleteButton.setAttribute("aria-label", `Удалить ${product.title || "товар"}`);
    deleteButton.textContent = "×";
    deleteButton.addEventListener("click", () => openDeleteProduct(product));

    actions.append(editButton, visibilityButton, deleteButton);
    body.append(topLine, title, description, price, actions);
    article.append(imageWrap, body);

    return article;
  };

  const renderProducts = () => {
    if (!productsGrid) return;

    updateStats();
    const filtered = getFilteredProducts();
    productsGrid.replaceChildren(...filtered.map(createProductCard));

    productsEmpty?.classList.toggle("hidden", products.length !== 0);
    productsNoResults?.classList.toggle(
      "hidden",
      products.length === 0 || filtered.length !== 0
    );
  };

  const loadProducts = async ({ silent = false } = {}) => {
    if (!silent) setProductsLoading(true);
    productsError?.classList.add("hidden");

    try {
      const { data, error } = await supabaseClient
        .from("products")
        .select("id,title,price_from,category,description,image_url,is_active,sort_order")
        .order("sort_order", { ascending: true, nullsFirst: false })
        .order("id", { ascending: true });

      if (error) throw error;

      products = Array.isArray(data) ? data : [];
      renderProducts();
    } catch (error) {
      console.error("[nezhno.art admin] Не удалось загрузить товары:", error);
      if (productsErrorText) productsErrorText.textContent = error.message || "Неизвестная ошибка Supabase.";
      productsError?.classList.remove("hidden");
      showToast("Не удалось загрузить каталог", "error");
    } finally {
      setProductsLoading(false);
    }
  };

  const toggleProductVisibility = async (product, button) => {
    if (!product || !button) return;
    button.disabled = true;

    const nextValue = !product.is_active;
    try {
      const { error } = await supabaseClient
        .from("products")
        .update({ is_active: nextValue })
        .eq("id", product.id);

      if (error) throw error;

      product.is_active = nextValue;
      renderProducts();
      showToast(nextValue ? "Товар опубликован" : "Товар скрыт с сайта");
    } catch (error) {
      console.error("[nezhno.art admin] Ошибка видимости товара:", error);
      showToast("Не удалось изменить видимость", "error");
      button.disabled = false;
    }
  };

  refreshProductsButton?.addEventListener("click", async () => {
    setButtonLoading(refreshProductsButton, true, "Обновляем…");
    await loadProducts({ silent: true });
    setButtonLoading(refreshProductsButton, false, "Обновляем…");
  });

  retryProductsButton?.addEventListener("click", () => loadProducts());
  productSearch?.addEventListener("input", renderProducts);
  visibilityFilter?.addEventListener("change", renderProducts);

  // =========================================================
  // Product form
  // =========================================================

  const clearObjectUrl = () => {
    if (imageObjectUrl) URL.revokeObjectURL(imageObjectUrl);
    imageObjectUrl = null;
  };

  const setPreviewImage = (src, status) => {
    if (!imagePreview) return;
    imagePreview.src = src || FALLBACK_IMAGE;
    if (imageStatus) imageStatus.textContent = status;
  };

  const resetProductForm = () => {
    clearObjectUrl();
    productForm?.reset();
    if (productId) productId.value = "";
    if (productCategory) productCategory.value = "banner";
    if (productActive) productActive.checked = true;
    if (productSortOrder) productSortOrder.value = "0";
    if (productImage) productImage.value = "";
    if (descriptionCounter) descriptionCounter.textContent = "0";
    if (selectedImageName) selectedImageName.textContent = "Изображение необязательно. Без него на сайте будет использована резервная картинка.";
    setPreviewImage(FALLBACK_IMAGE, "Предпросмотр");
    removeImageButton?.classList.add("hidden");
    setFormError(productFormError, "");
    editingProduct = null;
    removeExistingImage = false;
  };

  const openAddProduct = () => {
    resetProductForm();
    if (productDialogKicker) productDialogKicker.textContent = "Новый товар";
    if (productDialogTitle) productDialogTitle.textContent = "Добавить товар";
    if (productSaveButton) productSaveButton.textContent = "Добавить товар";
    openDialog(productDialog);
    setTimeout(() => productTitle?.focus(), 0);
  };

  const openEditProduct = (product) => {
    resetProductForm();
    editingProduct = product;

    if (productDialogKicker) productDialogKicker.textContent = "Редактирование";
    if (productDialogTitle) productDialogTitle.textContent = product.title || "Редактировать товар";
    if (productSaveButton) productSaveButton.textContent = "Сохранить изменения";

    if (productId) productId.value = String(product.id);
    if (productTitle) productTitle.value = product.title || "";
    if (productCategory) productCategory.value = product.category || "banner";
    if (productPrice) productPrice.value = product.price_from ?? "";
    if (productDescription) productDescription.value = product.description || "";
    if (descriptionCounter) descriptionCounter.textContent = String((product.description || "").length);
    if (productSortOrder) productSortOrder.value = product.sort_order ?? "0";
    if (productActive) productActive.checked = Boolean(product.is_active);

    setPreviewImage(product.image_url || FALLBACK_IMAGE, product.image_url ? "Текущее изображение" : "Резервная картинка");

    if (product.image_url) {
      removeImageButton?.classList.remove("hidden");
      if (selectedImageName) selectedImageName.textContent = "Можно оставить текущее изображение, заменить его новым или убрать.";
    } else {
      removeImageButton?.classList.add("hidden");
      if (selectedImageName) selectedImageName.textContent = "У этого товара нет отдельного изображения.";
    }

    openDialog(productDialog);
    setTimeout(() => productTitle?.focus(), 0);
  };

  const closeProductDialog = () => {
    if (isSaving) return;
    closeDialog(productDialog);
    clearObjectUrl();
  };

  addProductButton?.addEventListener("click", openAddProduct);
  emptyAddButton?.addEventListener("click", openAddProduct);
  productDialogClose?.addEventListener("click", closeProductDialog);
  productCancelButton?.addEventListener("click", closeProductDialog);

  productDialog?.addEventListener("click", (event) => {
    if (event.target === productDialog) closeProductDialog();
  });

  productDialog?.addEventListener("cancel", (event) => {
    if (isSaving) event.preventDefault();
  });

  productDescription?.addEventListener("input", () => {
    if (descriptionCounter) descriptionCounter.textContent = String(productDescription.value.length);
  });

  productImage?.addEventListener("change", () => {
    clearObjectUrl();
    setFormError(productFormError, "");

    const file = productImage.files?.[0];
    if (!file) {
      if (editingProduct && !removeExistingImage) {
        setPreviewImage(editingProduct.image_url || FALLBACK_IMAGE, editingProduct.image_url ? "Текущее изображение" : "Резервная картинка");
      }
      return;
    }

    if (!file.type.startsWith("image/")) {
      productImage.value = "";
      setFormError(productFormError, "Выберите файл изображения.");
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      productImage.value = "";
      setFormError(productFormError, "Файл больше 50 МБ. Выберите изображение меньшего размера.");
      return;
    }

    removeExistingImage = false;
    imageObjectUrl = URL.createObjectURL(file);
    setPreviewImage(imageObjectUrl, "Новое изображение");
    if (selectedImageName) selectedImageName.textContent = `${file.name} · ${Math.max(0.01, file.size / 1024 / 1024).toFixed(2)} МБ`;
    removeImageButton?.classList.remove("hidden");
  });

  removeImageButton?.addEventListener("click", () => {
    clearObjectUrl();
    if (productImage) productImage.value = "";
    removeExistingImage = true;
    setPreviewImage(FALLBACK_IMAGE, "Изображение будет убрано");
    if (selectedImageName) selectedImageName.textContent = "После сохранения товар будет использовать резервную картинку сайта.";
    removeImageButton.classList.add("hidden");
  });

  const sanitizeFileName = (name) => {
    const parts = String(name || "image").split(".");
    const extension = parts.length > 1 ? parts.pop().toLowerCase().replace(/[^a-z0-9]/g, "") : "";
    const safeExtension = extension || "jpg";
    return `products/${Date.now()}-${crypto.randomUUID?.() || Math.random().toString(36).slice(2)}.${safeExtension}`;
  };

  const uploadProductImage = async (file) => {
    if (!file) return null;

    const path = sanitizeFileName(file.name);
    const { error } = await supabaseClient.storage
      .from(STORAGE_BUCKET)
      .upload(path, file, {
        cacheControl: "3600",
        contentType: file.type || undefined,
        upsert: false,
      });

    if (error) throw error;

    const { data } = supabaseClient.storage.from(STORAGE_BUCKET).getPublicUrl(path);
    if (!data?.publicUrl) throw new Error("Supabase не вернул публичный URL изображения.");

    return { path, publicUrl: data.publicUrl };
  };

  const getStoragePathFromPublicUrl = (url) => {
    if (!url || typeof url !== "string") return null;

    const marker = `/storage/v1/object/public/${STORAGE_BUCKET}/`;
    const index = url.indexOf(marker);
    if (index === -1) return null;

    const encodedPath = url.slice(index + marker.length).split("?")[0];
    if (!encodedPath) return null;

    try {
      return decodeURIComponent(encodedPath);
    } catch (_) {
      return encodedPath;
    }
  };

  const removeStorageImageByUrl = async (url) => {
    const path = getStoragePathFromPublicUrl(url);
    if (!path) return;

    const { error } = await supabaseClient.storage.from(STORAGE_BUCKET).remove([path]);
    if (error) throw error;
  };

  const buildProductPayload = (imageUrl) => ({
    title: productTitle.value.trim(),
    price_from: Number(productPrice.value),
    category: productCategory.value,
    description: productDescription.value.trim() || null,
    image_url: imageUrl || null,
    is_active: Boolean(productActive.checked),
    sort_order: Math.max(0, Number(productSortOrder.value) || 0),
  });

  productForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (isSaving) return;

    setFormError(productFormError, "");

    if (!productTitle.value.trim()) {
      setFormError(productFormError, "Введите название товара.");
      productTitle.focus();
      return;
    }

    if (productPrice.value === "" || Number(productPrice.value) < 0) {
      setFormError(productFormError, "Введите корректную цену.");
      productPrice.focus();
      return;
    }

    const file = productImage.files?.[0] || null;
    if (file && file.size > MAX_IMAGE_SIZE) {
      setFormError(productFormError, "Файл больше 50 МБ.");
      return;
    }

    isSaving = true;
    setButtonLoading(productSaveButton, true, file ? "Загружаем…" : "Сохраняем…");

    let uploadedImage = null;

    try {
      const previousImageUrl = editingProduct?.image_url || null;
      let nextImageUrl = removeExistingImage ? null : previousImageUrl;

      if (file) {
        uploadedImage = await uploadProductImage(file);
        nextImageUrl = uploadedImage.publicUrl;
      }

      const payload = buildProductPayload(nextImageUrl);

      if (editingProduct) {
        const { data, error } = await supabaseClient
          .from("products")
          .update(payload)
          .eq("id", editingProduct.id)
          .select("id,title,price_from,category,description,image_url,is_active,sort_order")
          .single();

        if (error) throw error;

        const index = products.findIndex((item) => String(item.id) === String(editingProduct.id));
        if (index !== -1) products[index] = data;

        // Delete the old storage object only after the database already points to the new state.
        if (previousImageUrl && previousImageUrl !== nextImageUrl) {
          try {
            await removeStorageImageByUrl(previousImageUrl);
          } catch (cleanupError) {
            console.warn("[nezhno.art admin] Товар обновлён, но старое изображение не удалено:", cleanupError);
          }
        }

        showToast("Изменения сохранены");
      } else {
        const { data, error } = await supabaseClient
          .from("products")
          .insert(payload)
          .select("id,title,price_from,category,description,image_url,is_active,sort_order")
          .single();

        if (error) throw error;

        products.push(data);
        showToast("Товар добавлен");
      }

      products.sort((a, b) => {
        const aOrder = Number.isFinite(Number(a.sort_order)) ? Number(a.sort_order) : Number.MAX_SAFE_INTEGER;
        const bOrder = Number.isFinite(Number(b.sort_order)) ? Number(b.sort_order) : Number.MAX_SAFE_INTEGER;
        return aOrder - bOrder || Number(a.id) - Number(b.id);
      });

      renderProducts();
      closeDialog(productDialog);
      clearObjectUrl();
    } catch (error) {
      console.error("[nezhno.art admin] Не удалось сохранить товар:", error);

      // Avoid orphan files when upload succeeded but the database write failed.
      if (uploadedImage?.path) {
        try {
          await supabaseClient.storage.from(STORAGE_BUCKET).remove([uploadedImage.path]);
        } catch (cleanupError) {
          console.warn("[nezhno.art admin] Не удалось убрать незакреплённый файл:", cleanupError);
        }
      }

      setFormError(productFormError, error.message || "Не удалось сохранить товар.");
      showToast("Не удалось сохранить товар", "error");
    } finally {
      isSaving = false;
      setButtonLoading(productSaveButton, false, "Сохраняем…");
    }
  });

  // =========================================================
  // Delete
  // =========================================================

  const openDeleteProduct = (product) => {
    deletingProduct = product;
    if (deleteProductName) deleteProductName.textContent = `«${product.title || "Без названия"}»`;
    openDialog(deleteDialog);
  };

  const closeDeleteDialog = () => {
    if (deleteConfirmButton?.disabled) return;
    deletingProduct = null;
    closeDialog(deleteDialog);
  };

  deleteDialogClose?.addEventListener("click", closeDeleteDialog);
  deleteCancelButton?.addEventListener("click", closeDeleteDialog);
  deleteDialog?.addEventListener("click", (event) => {
    if (event.target === deleteDialog) closeDeleteDialog();
  });

  deleteConfirmButton?.addEventListener("click", async () => {
    if (!deletingProduct) return;

    const product = deletingProduct;
    setButtonLoading(deleteConfirmButton, true, "Удаляем…");

    try {
      // Database first: if Storage cleanup fails later, the public catalog is still correct.
      const { error } = await supabaseClient.from("products").delete().eq("id", product.id);
      if (error) throw error;

      products = products.filter((item) => String(item.id) !== String(product.id));
      renderProducts();

      if (product.image_url) {
        try {
          await removeStorageImageByUrl(product.image_url);
        } catch (cleanupError) {
          console.warn("[nezhno.art admin] Товар удалён, но файл изображения остался в Storage:", cleanupError);
          showToast("Товар удалён, но старый файл изображения не удалось очистить", "error");
          closeDialog(deleteDialog);
          deletingProduct = null;
          return;
        }
      }

      showToast("Товар удалён");
      closeDialog(deleteDialog);
      deletingProduct = null;
    } catch (error) {
      console.error("[nezhno.art admin] Не удалось удалить товар:", error);
      showToast("Не удалось удалить товар", "error");
    } finally {
      setButtonLoading(deleteConfirmButton, false, "Удаляем…");
    }
  });

  // =========================================================
  // Messages / inbox
  // =========================================================

  const CHAT_BUCKET = "chat-attachments";
  const MAX_CHAT_IMAGE_SIZE = 50 * 1024 * 1024;

  const formatConversationTime = (value) => {
    if (!value) return "";
    const date = new Date(value);
    const now = new Date();
    const sameDay = date.toDateString() === now.toDateString();
    return new Intl.DateTimeFormat("ru-RU", sameDay
      ? { hour: "2-digit", minute: "2-digit" }
      : { day: "2-digit", month: "2-digit" }
    ).format(date);
  };

  const getSeenKey = (conversationId) => `nezhno-admin-seen-${conversationId}`;

  const getConversationSeenAt = (conversationId) => {
    try { return localStorage.getItem(getSeenKey(conversationId)) || ""; }
    catch (_) { return ""; }
  };

  const markConversationSeen = (conversationId) => {
    try { localStorage.setItem(getSeenKey(conversationId), new Date().toISOString()); }
    catch (_) { /* LocalStorage может быть недоступен. */ }
  };

  const isConversationUnread = (conversation) => {
    const latest = conversationLatest.get(conversation.id);
    if (!latest || latest.sender_id === LINA_USER_ID) return false;
    const seenAt = getConversationSeenAt(conversation.id);
    return !seenAt || new Date(latest.created_at).getTime() > new Date(seenAt).getTime();
  };

  const updateMessagesBadge = () => {
    const unread = conversations.filter(isConversationUnread).length;
    if (!messagesBadge) return;
    messagesBadge.textContent = String(unread);
    messagesBadge.classList.toggle("hidden", unread === 0);
  };

  const getConversationProfile = (conversation) =>
    conversationProfiles.get(conversation.user_id) || {
      display_name: "Пользователь",
      email: "Email недоступен",
    };

  const getConversationPreview = (conversation) => {
    const latest = conversationLatest.get(conversation.id);
    if (!latest) return "Диалог создан, сообщений пока нет";
    if (latest.body) return latest.body.replace(/\s+/g, " ").trim();
    if (latest.attachment_name) return `📎 ${latest.attachment_name}`;
    return "Новое сообщение";
  };

  const getFilteredConversations = () => {
    const query = normalizeText(conversationSearch?.value);
    if (!query) return conversations;
    return conversations.filter((conversation) => {
      const profile = getConversationProfile(conversation);
      return normalizeText(`${profile.display_name || ""} ${profile.email || ""}`).includes(query);
    });
  };

  const renderConversationList = () => {
    if (!conversationList) return;
    const filtered = getFilteredConversations();
    conversationList.innerHTML = "";

    filtered.forEach((conversation) => {
      const profile = getConversationProfile(conversation);
      const latest = conversationLatest.get(conversation.id);
      const unread = isConversationUnread(conversation);
      const button = document.createElement("button");
      button.type = "button";
      button.className = `admin-conversation-item${selectedConversation?.id === conversation.id ? " active" : ""}${unread ? " unread" : ""}`;
      button.dataset.conversationId = conversation.id;

      const avatar = document.createElement("span");
      avatar.className = "admin-conversation-avatar";
      avatar.textContent = (profile.display_name || profile.email || "П").trim().slice(0, 1).toUpperCase();

      const copy = document.createElement("span");
      copy.className = "admin-conversation-copy";
      const top = document.createElement("span");
      top.className = "admin-conversation-top";
      const name = document.createElement("strong");
      name.textContent = profile.display_name || "Пользователь";
      const time = document.createElement("time");
      time.textContent = formatConversationTime(latest?.created_at || conversation.updated_at || conversation.created_at);
      top.append(name, time);

      const email = document.createElement("small");
      email.textContent = profile.email || "";
      const preview = document.createElement("span");
      preview.className = "admin-conversation-preview";
      preview.textContent = getConversationPreview(conversation);
      copy.append(top, email, preview);

      if (unread) {
        const dot = document.createElement("i");
        dot.className = "admin-conversation-unread";
        dot.setAttribute("aria-label", "Есть новое сообщение");
        button.append(avatar, copy, dot);
      } else {
        button.append(avatar, copy);
      }

      button.addEventListener("click", () => openAdminConversation(conversation));
      conversationList.appendChild(button);
    });

    if (conversationsEmpty) {
      conversationsEmpty.classList.toggle("hidden", conversations.length !== 0);
    }
  };

  const loadConversations = async ({ quiet = false } = {}) => {
    if (!quiet) conversationsLoading?.classList.remove("hidden");
    try {
      const { data: conversationRows, error: conversationError } = await supabaseClient
        .from("conversations")
        .select("id,user_id,created_at,updated_at")
        .order("updated_at", { ascending: false });
      if (conversationError) throw conversationError;

      conversations = Array.isArray(conversationRows) ? conversationRows : [];
      const userIds = [...new Set(conversations.map((item) => item.user_id).filter(Boolean))];

      conversationProfiles = new Map();
      if (userIds.length) {
        const { data: profilesRows, error: profilesError } = await supabaseClient
          .from("profiles")
          .select("id,display_name,email")
          .in("id", userIds);
        if (profilesError) throw profilesError;
        (profilesRows || []).forEach((profile) => conversationProfiles.set(profile.id, profile));
      }

      conversationLatest = new Map();
      if (conversations.length) {
        const { data: latestRows, error: latestError } = await supabaseClient
          .from("messages")
          .select("id,conversation_id,sender_id,body,attachment_name,created_at")
          .order("created_at", { ascending: false })
          .limit(1000);
        if (latestError) throw latestError;
        (latestRows || []).forEach((message) => {
          if (!conversationLatest.has(message.conversation_id)) {
            conversationLatest.set(message.conversation_id, message);
          }
        });
      }

      conversationsLoaded = true;
      renderConversationList();
      updateMessagesBadge();

      if (selectedConversation) {
        selectedConversation = conversations.find((item) => item.id === selectedConversation.id) || selectedConversation;
      }
    } catch (error) {
      console.error("[nezhno.art admin] Не удалось загрузить диалоги:", error);
      showToast("Не удалось загрузить сообщения", "error");
    } finally {
      conversationsLoading?.classList.add("hidden");
    }
  };

  const createAdminSignedUrl = async (path) => {
    if (!path) return null;
    const { data, error } = await supabaseClient.storage.from(CHAT_BUCKET).createSignedUrl(path, 60 * 60);
    if (error) {
      console.warn("[nezhno.art admin] Не удалось открыть вложение:", error);
      return null;
    }
    return data?.signedUrl || null;
  };

  const appendAdminMessage = async (message, { scroll = true } = {}) => {
    if (!message || !adminChatMessages || renderedAdminMessageIds.has(String(message.id))) return;
    renderedAdminMessageIds.add(String(message.id));
    adminChatMessages.querySelector(".admin-chat-empty")?.remove();

    const mine = message.sender_id === LINA_USER_ID;
    const bubble = document.createElement("article");
    bubble.className = `admin-message${mine ? " is-mine" : " is-client"}`;
    bubble.dataset.messageId = String(message.id);

    const author = document.createElement("span");
    author.className = "admin-message-author";
    author.textContent = mine ? "Вы · nezhno.art" : getConversationProfile(selectedConversation).display_name || "Клиент";
    bubble.appendChild(author);

    if (message.body) {
      const text = document.createElement("p");
      text.textContent = message.body;
      bubble.appendChild(text);
    }

    if (message.attachment_path) {
      const signedUrl = await createAdminSignedUrl(message.attachment_path);
      if (signedUrl) {
        const link = document.createElement("a");
        link.className = "admin-message-image";
        link.href = signedUrl;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        const img = document.createElement("img");
        img.src = signedUrl;
        img.alt = message.attachment_name ? `Вложение: ${message.attachment_name}` : "Прикреплённое изображение";
        img.loading = "lazy";
        link.appendChild(img);
        bubble.appendChild(link);
      } else {
        const fallback = document.createElement("small");
        fallback.textContent = message.attachment_name ? `Не удалось открыть ${message.attachment_name}` : "Не удалось открыть вложение";
        bubble.appendChild(fallback);
      }
    }

    const time = document.createElement("time");
    time.dateTime = message.created_at || "";
    time.textContent = message.created_at
      ? new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(message.created_at))
      : "";
    bubble.appendChild(time);
    adminChatMessages.appendChild(bubble);
    if (scroll) adminChatMessages.scrollTop = adminChatMessages.scrollHeight;
  };

  const loadAdminConversationMessages = async (conversation) => {
    if (!conversation || !adminChatMessages) return;
    adminChatMessages.innerHTML = '<div class="admin-chat-loading"><span class="admin-loader" aria-hidden="true"></span><span>Загружаем переписку…</span></div>';
    renderedAdminMessageIds.clear();

    const { data, error } = await supabaseClient
      .from("messages")
      .select("id,conversation_id,sender_id,body,attachment_path,attachment_name,attachment_mime,created_at")
      .eq("conversation_id", conversation.id)
      .order("created_at", { ascending: true });
    if (error) throw error;

    adminChatMessages.innerHTML = "";
    for (const message of data || []) await appendAdminMessage(message, { scroll: false });
    if (!data?.length) {
      const empty = document.createElement("div");
      empty.className = "admin-chat-empty";
      empty.textContent = "Пользователь пока ничего не написал.";
      adminChatMessages.appendChild(empty);
    }
    adminChatMessages.scrollTop = adminChatMessages.scrollHeight;
  };

  async function openAdminConversation(conversation) {
    selectedConversation = conversation;
    const profile = getConversationProfile(conversation);
    if (adminChatName) adminChatName.textContent = profile.display_name || "Пользователь";
    if (adminChatEmail) adminChatEmail.textContent = profile.email || "";
    adminChatPlaceholder?.classList.add("hidden");
    adminChatActive?.classList.remove("hidden");
    markConversationSeen(conversation.id);
    renderConversationList();
    updateMessagesBadge();

    try {
      await loadAdminConversationMessages(conversation);
      adminChatInput?.focus();
    } catch (error) {
      console.error("[nezhno.art admin] Не удалось загрузить переписку:", error);
      if (adminChatMessages) adminChatMessages.innerHTML = '<div class="admin-chat-empty">Не удалось загрузить переписку.</div>';
    }
  }

  const clearAdminAttachment = () => {
    if (adminAttachmentObjectUrl) URL.revokeObjectURL(adminAttachmentObjectUrl);
    adminAttachmentObjectUrl = null;
    adminPendingAttachment = null;
    if (adminChatFile) adminChatFile.value = "";
    if (adminChatAttachmentPreview) {
      adminChatAttachmentPreview.innerHTML = "";
      adminChatAttachmentPreview.classList.add("hidden");
    }
  };

  adminChatFile?.addEventListener("change", () => {
    const file = adminChatFile.files?.[0] || null;
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      showToast("Можно прикреплять только изображения", "error");
      clearAdminAttachment();
      return;
    }
    if (file.size > MAX_CHAT_IMAGE_SIZE) {
      showToast("Изображение больше 50 МБ", "error");
      clearAdminAttachment();
      return;
    }

    clearAdminAttachment();
    adminPendingAttachment = file;
    adminAttachmentObjectUrl = URL.createObjectURL(file);
    if (adminChatAttachmentPreview) {
      adminChatAttachmentPreview.classList.remove("hidden");
      const img = document.createElement("img");
      img.src = adminAttachmentObjectUrl;
      img.alt = file.name;
      const copy = document.createElement("span");
      copy.textContent = file.name;
      const remove = document.createElement("button");
      remove.type = "button";
      remove.textContent = "×";
      remove.setAttribute("aria-label", "Убрать изображение");
      remove.addEventListener("click", clearAdminAttachment);
      adminChatAttachmentPreview.append(img, copy, remove);
    }
  });

  const makeAdminStoragePath = (userId, file) => {
    const cleanName = file.name
      .normalize("NFKD")
      .replace(/[^a-zA-Z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "") || "image";
    const unique = typeof crypto?.randomUUID === "function" ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    return `${userId}/${Date.now()}-${unique}-${cleanName}`;
  };

  adminChatInput?.addEventListener("input", () => {
    adminChatInput.style.height = "auto";
    adminChatInput.style.height = `${Math.min(adminChatInput.scrollHeight, 150)}px`;
  });

  adminChatInput?.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      adminChatForm?.requestSubmit();
    }
  });

  adminChatForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!selectedConversation) return;
    const text = adminChatInput?.value.trim() || "";
    const file = adminPendingAttachment;
    if (!text && !file) return;

    setButtonLoading(adminChatSend, true, "…");
    let uploadedPath = null;
    try {
      let attachment = { path: null, name: null, mime: null };
      if (file) {
        uploadedPath = makeAdminStoragePath(selectedConversation.user_id, file);
        const { error: uploadError } = await supabaseClient.storage.from(CHAT_BUCKET).upload(uploadedPath, file, {
          contentType: file.type || "image/*",
          upsert: false,
        });
        if (uploadError) throw uploadError;
        attachment = { path: uploadedPath, name: file.name, mime: file.type || "image/*" };
      }

      const { data, error } = await supabaseClient
        .from("messages")
        .insert({
          conversation_id: selectedConversation.id,
          sender_id: LINA_USER_ID,
          body: text || null,
          attachment_path: attachment.path,
          attachment_name: attachment.name,
          attachment_mime: attachment.mime,
        })
        .select("id,conversation_id,sender_id,body,attachment_path,attachment_name,attachment_mime,created_at")
        .single();
      if (error) throw error;

      await appendAdminMessage(data);
      if (adminChatInput) {
        adminChatInput.value = "";
        adminChatInput.style.height = "auto";
      }
      clearAdminAttachment();
      markConversationSeen(selectedConversation.id);
      scheduleConversationRefresh();
    } catch (error) {
      console.error("[nezhno.art admin] Не удалось отправить ответ:", error);
      if (uploadedPath) {
        try { await supabaseClient.storage.from(CHAT_BUCKET).remove([uploadedPath]); } catch (_) { /* noop */ }
      }
      showToast("Не удалось отправить сообщение", "error");
    } finally {
      setButtonLoading(adminChatSend, false, "…");
    }
  });

  const scheduleConversationRefresh = () => {
    clearTimeout(conversationsRefreshTimer);
    conversationsRefreshTimer = setTimeout(() => loadConversations({ quiet: true }), 220);
  };

  const subscribeAdminMessages = () => {
    if (adminMessageChannel) return;
    adminMessageChannel = supabaseClient
      .channel("admin-all-messages")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const message = payload.new;
          if (!message) return;
          if (selectedConversation?.id === message.conversation_id) {
            markConversationSeen(selectedConversation.id);
            window.setTimeout(() => appendAdminMessage(message), 0);
          }
          scheduleConversationRefresh();
        }
      )
      .subscribe();
  };

  const switchAdminView = async (view) => {
    const messages = view === "messages";
    adminProductsView?.classList.toggle("hidden", messages);
    adminMessagesView?.classList.toggle("hidden", !messages);
    productsTab?.classList.toggle("active", !messages);
    messagesTab?.classList.toggle("active", messages);
    productsTab?.setAttribute("aria-selected", String(!messages));
    messagesTab?.setAttribute("aria-selected", String(messages));

    if (messages) {
      subscribeAdminMessages();
      if (!conversationsLoaded) await loadConversations();
    }
  };

  productsTab?.addEventListener("click", () => switchAdminView("products"));
  messagesTab?.addEventListener("click", () => switchAdminView("messages"));
  refreshConversationsButton?.addEventListener("click", () => loadConversations());
  conversationSearch?.addEventListener("input", renderConversationList);

  // =========================================================
  // Start
  // =========================================================

  initializeAuth();
})();
