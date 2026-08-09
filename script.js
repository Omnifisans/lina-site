(() => {
  "use strict";

  // Вставьте username Лины без @, когда он будет согласован.
  // Пример: const TELEGRAM_USERNAME = "nezhno_art";
  const TELEGRAM_USERNAME = "";

  // -------------------------
  // Supabase: каталог услуг
  // -------------------------
  const SUPABASE_URL = "https://dalipumytxktfrtqhxxm.supabase.co";
  const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_re7xSQ02x55-CTUDSbIpYQ_1qX8tRqN";
  const LINA_USER_ID = "984948c4-d839-4cc7-9635-8868c7ddc6a7";
  const CHAT_BUCKET = "chat-attachments";
  const MAX_CHAT_IMAGE_SIZE = 50 * 1024 * 1024;
  const AUTH_REDIRECT_URL = "https://omnifisans.github.io/lina-site/";

  // Элементы с .reveal теперь анимируются в обе стороны: появляются при входе
  // в область просмотра и снова плавно скрываются, когда пользователь уходит
  // от них. Observer создаётся ниже, но нужен и динамическим карточкам услуг.
  let revealObserver = null;
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const registerRevealItem = (item) => {
    if (!item?.classList?.contains("reveal")) return;

    if (!("IntersectionObserver" in window) || prefersReducedMotion) {
      item.classList.add("visible");
      return;
    }

    revealObserver?.observe(item);
  };

  if (!window.supabase?.createClient) {
    console.error("[nezhno.art] Supabase JS не загрузился.");
    return;
  }

  // Отдельное хранилище сессии для клиентской части сайта. Так тестовый
  // пользователь не перетирает сессию админки в том же браузере.
  const userAuthStorage = {
    getItem: (key) => localStorage.getItem(`nezhno-user-${key}`),
    setItem: (key, value) => localStorage.setItem(`nezhno-user-${key}`, value),
    removeItem: (key) => localStorage.removeItem(`nezhno-user-${key}`),
  };

  const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY,
    {
      auth: {
        storage: userAuthStorage,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    }
  );

  // Ловим auth-события сразу после создания клиента. Это особенно важно для
  // PASSWORD_RECOVERY: событие приходит во время обработки ссылки из письма.
  const pendingAuthEvents = [];
  let authEventHandler = null;
  supabaseClient.auth.onAuthStateChange((event, session) => {
    if (typeof authEventHandler === "function") {
      window.setTimeout(() => authEventHandler(event, session), 0);
    } else {
      pendingAuthEvents.push([event, session]);
    }
  });

  const serviceGrid = document.getElementById("service-grid");

  const categoryMeta = {
    banner: { label: "Баннеры", button: "Обсудить баннер" },
    stickers: { label: "Стикеры", button: "Обсудить стикеры" },
    model: { label: "Модели", button: "Обсудить модель" },
  };

  const formatPrice = (value) =>
    new Intl.NumberFormat("ru-RU").format(Number(value) || 0);

  const createServiceCard = (product) => {
    const meta = categoryMeta[product.category] || {
      label: product.category || "Услуга",
      button: "Обсудить заказ",
    };

    const article = document.createElement("article");
    article.className = "service-card reveal";
    article.dataset.productId = String(product.id);

    const preview = document.createElement("div");
    preview.className = `service-preview${product.category === "stickers" ? " service-preview-stickers" : ""}`;

    const image = document.createElement("img");
    image.src = product.image_url || "nezhno-art.jpg";
    image.alt = `Пример: ${product.title || "работа nezhno.art"}`;
    image.loading = "lazy";
    image.addEventListener("error", () => {
      if (!image.src.endsWith("nezhno-art.jpg")) image.src = "nezhno-art.jpg";
    });
    preview.appendChild(image);

    const body = document.createElement("div");
    body.className = "service-body";

    const label = document.createElement("span");
    label.className = "service-label";
    label.textContent = meta.label;

    const title = document.createElement("h3");
    title.textContent = product.title || "Услуга";

    const description = document.createElement("p");
    description.textContent = product.description || "Подробности можно обсудить с автором.";

    const price = document.createElement("div");
    price.className = "service-price";
    const pricePrefix = document.createElement("span");
    pricePrefix.textContent = "от";
    const priceValue = document.createElement("strong");
    priceValue.textContent = `${formatPrice(product.price_from)} ₽`;
    price.append(pricePrefix, priceValue);

    const button = document.createElement("button");
    button.className = "button button-primary button-full";
    button.type = "button";
    button.dataset.openChat = "";
    button.dataset.service = product.title || meta.label;
    button.textContent = meta.button;

    body.append(label, title, description, price, button);
    article.append(preview, body);
    return article;
  };

  const loadProducts = async () => {
    try {
      const params = new URLSearchParams({
        select: "id,title,price_from,category,description,image_url,is_active,sort_order",
        is_active: "eq.true",
        order: "sort_order.asc.nullslast,id.asc",
      });

      const response = await fetch(`${SUPABASE_URL}/rest/v1/products?${params.toString()}`, {
        headers: {
          apikey: SUPABASE_PUBLISHABLE_KEY,
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        const details = await response.text();
        throw new Error(`HTTP ${response.status}: ${details}`);
      }

      const products = await response.json();
      console.log("[nezhno.art] Активные услуги из Supabase:", products);

      // Если база временно недоступна или пуста, оставляем статические карточки из HTML как fallback.
      if (!Array.isArray(products) || products.length === 0 || !serviceGrid) {
        console.warn("[nezhno.art] Активных услуг в products нет — оставлены резервные карточки из HTML.");
        return;
      }

      const cards = products.map(createServiceCard);
      serviceGrid.replaceChildren(...cards);
      cards.forEach(registerRevealItem);
      console.log(`[nezhno.art] Каталог обновлён из Supabase: ${products.length} поз.`);
    } catch (error) {
      console.error("[nezhno.art] Не удалось загрузить каталог из Supabase:", error);
      console.info("[nezhno.art] Используются резервные карточки из index.html.");
    }
  };

  loadProducts();

  const root = document.documentElement;
  const body = document.body;
  const toast = document.getElementById("toast");
  let toastTimer;

  const showToast = (message) => {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2500);
  };

  // -------------------------
  // Theme
  // -------------------------
  const themeToggle = document.getElementById("theme-toggle");
  let savedTheme = null;
  try {
    savedTheme = localStorage.getItem("nezhno-theme");
  } catch (_) {
    // Тема всё равно работает, даже если хранилище браузера недоступно.
  }
  const systemPrefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
  const initialTheme = savedTheme || (systemPrefersDark ? "dark" : "light");

  const applyTheme = (theme) => {
    root.dataset.theme = theme;
    try {
      localStorage.setItem("nezhno-theme", theme);
    } catch (_) {
      // Ничего страшного: просто не запомним выбор после перезагрузки.
    }
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) metaTheme.setAttribute("content", theme === "dark" ? "#160f11" : "#fff9f8");
  };

  applyTheme(initialTheme);

  themeToggle?.addEventListener("click", () => {
    applyTheme(root.dataset.theme === "dark" ? "light" : "dark");
  });

  // -------------------------
  // Mobile navigation
  // -------------------------
  const menuToggle = document.getElementById("menu-toggle");
  const mainNav = document.getElementById("main-nav");

  const closeMenu = () => {
    mainNav?.classList.remove("open");
    menuToggle?.setAttribute("aria-expanded", "false");
  };

  menuToggle?.addEventListener("click", () => {
    const willOpen = !mainNav?.classList.contains("open");
    mainNav?.classList.toggle("open", willOpen);
    menuToggle.setAttribute("aria-expanded", String(willOpen));
  });

  mainNav?.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeMenu));
  window.addEventListener("resize", () => {
    if (window.innerWidth > 880) closeMenu();
  });

  // -------------------------
  // Reveal on scroll
  // -------------------------
  const revealItems = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && !prefersReducedMotion) {
    revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          // В отличие от прежней версии, элемент больше не перестаёт
          // отслеживаться после первого появления. Поэтому при выходе из
          // viewport класс снимается, а CSS проигрывает анимацию обратно.
          entry.target.classList.toggle("visible", entry.isIntersecting);
        });
      },
      { threshold: 0.01, rootMargin: "48px 0px 48px 0px" }
    );
    revealItems.forEach(registerRevealItem);
  } else {
    revealItems.forEach((item) => item.classList.add("visible"));
  }

  // -------------------------
  // Portfolio filtering
  // -------------------------
  const filterButtons = document.querySelectorAll("[data-filter]");
  const portfolioCards = document.querySelectorAll(".portfolio-card");

  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const filter = button.dataset.filter;
      filterButtons.forEach((item) => {
        const active = item === button;
        item.classList.toggle("active", active);
        item.setAttribute("aria-selected", String(active));
      });

      portfolioCards.forEach((card) => {
        const visible = filter === "all" || card.dataset.category === filter;
        card.classList.toggle("is-hidden", !visible);
      });
    });
  });

  // -------------------------
  // Portfolio gallery / lightbox
  // -------------------------
  const galleryItems = [
    { src: "bannerpage.png", title: "Баннер для страницы", category: "Баннеры", alt: "Баннер для страницы в соцсети" },
    { src: "stickerpack.jpg", title: "Стикерпак", category: "Стикеры", alt: "Стикерпак для Telegram" },
    { src: "gachamodel.jpg", title: "Модель персонажа", category: "Модели", alt: "Модель для гачатубера" },
    { src: "nezhno-art.jpg", title: "Фирменный визуал nezhno.art", category: "Баннеры", alt: "Фирменный визуал nezhno.art" }
  ];

  const galleryDialog = document.getElementById("gallery-dialog");
  const galleryImage = document.getElementById("gallery-image");
  const galleryTitle = document.getElementById("gallery-title");
  const galleryCategory = document.getElementById("gallery-category");
  const galleryCounter = document.getElementById("gallery-counter");
  const galleryClose = document.getElementById("gallery-close");
  const galleryPrev = document.getElementById("gallery-prev");
  const galleryNext = document.getElementById("gallery-next");
  let galleryIndex = 0;
  let touchStartX = 0;

  const renderGallery = () => {
    const item = galleryItems[galleryIndex];
    if (!item || !galleryImage) return;
    galleryImage.src = item.src;
    galleryImage.alt = item.alt;
    galleryTitle.textContent = item.title;
    galleryCategory.textContent = item.category;
    galleryCounter.textContent = `${galleryIndex + 1} / ${galleryItems.length}`;
  };

  const openGallery = (index) => {
    galleryIndex = Number(index) || 0;
    renderGallery();
    if (typeof galleryDialog?.showModal === "function") {
      galleryDialog.showModal();
    } else {
      galleryDialog?.setAttribute("open", "");
    }
  };

  const closeGallery = () => {
    if (galleryDialog?.open && typeof galleryDialog.close === "function") galleryDialog.close();
    else galleryDialog?.removeAttribute("open");
  };

  const moveGallery = (step) => {
    galleryIndex = (galleryIndex + step + galleryItems.length) % galleryItems.length;
    renderGallery();
  };

  portfolioCards.forEach((card) => {
    card.addEventListener("click", () => openGallery(card.dataset.galleryIndex));
  });

  galleryClose?.addEventListener("click", closeGallery);
  galleryPrev?.addEventListener("click", () => moveGallery(-1));
  galleryNext?.addEventListener("click", () => moveGallery(1));
  galleryDialog?.addEventListener("click", (event) => {
    if (event.target === galleryDialog) closeGallery();
  });
  galleryDialog?.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") moveGallery(-1);
    if (event.key === "ArrowRight") moveGallery(1);
  });
  galleryDialog?.addEventListener("touchstart", (event) => {
    touchStartX = event.changedTouches[0]?.clientX || 0;
  }, { passive: true });
  galleryDialog?.addEventListener("touchend", (event) => {
    const touchEndX = event.changedTouches[0]?.clientX || 0;
    const delta = touchEndX - touchStartX;
    if (Math.abs(delta) > 55) moveGallery(delta > 0 ? -1 : 1);
  }, { passive: true });

  // -------------------------
  // Auth + real chat
  // -------------------------
  const accountButton = document.getElementById("account-button");
  const accountButtonLabel = document.getElementById("account-button-label");

  const authDialog = document.getElementById("auth-dialog");
  const authClose = document.getElementById("auth-close");
  const authViews = document.querySelectorAll("[data-auth-view]");
  const authSwitchers = document.querySelectorAll("[data-auth-switch]");
  const authSuccessText = document.getElementById("auth-success-text");

  const loginForm = document.getElementById("login-form");
  const loginEmail = document.getElementById("login-email");
  const loginPassword = document.getElementById("login-password");
  const loginError = document.getElementById("login-error");
  const loginSubmit = document.getElementById("login-submit");

  const registerForm = document.getElementById("register-form");
  const registerName = document.getElementById("register-name");
  const registerEmail = document.getElementById("register-email");
  const registerPassword = document.getElementById("register-password");
  const registerPasswordRepeat = document.getElementById("register-password-repeat");
  const registerError = document.getElementById("register-error");
  const registerSubmit = document.getElementById("register-submit");

  const recoverForm = document.getElementById("recover-form");
  const recoverEmail = document.getElementById("recover-email");
  const recoverError = document.getElementById("recover-error");
  const recoverSubmit = document.getElementById("recover-submit");

  const recoveryDialog = document.getElementById("recovery-dialog");
  const recoveryViews = document.querySelectorAll("[data-recovery-view]");
  const recoveryCancel = document.getElementById("recovery-cancel");
  const recoveryDone = document.getElementById("recovery-done");
  const passwordForm = document.getElementById("password-form");
  const newPassword = document.getElementById("new-password");
  const newPasswordRepeat = document.getElementById("new-password-repeat");
  const passwordError = document.getElementById("password-error");
  const passwordSubmit = document.getElementById("password-submit");

  const chatPanel = document.getElementById("chat-panel");
  const chatBackdrop = document.getElementById("chat-backdrop");
  const chatClose = document.getElementById("chat-close");
  const chatForm = document.getElementById("chat-form");
  const chatInput = document.getElementById("chat-input");
  const chatSend = document.getElementById("chat-send");
  const chatMessages = document.getElementById("chat-messages");
  const chatStatusText = document.getElementById("chat-status-text");
  const chatAccountName = document.getElementById("chat-account-name");
  const chatAccountEmail = document.getElementById("chat-account-email");
  const chatLogout = document.getElementById("chat-logout");
  const chatPresetButtons = document.querySelectorAll("[data-chat-preset]");
  const copyChatButton = document.getElementById("copy-chat");
  const openTelegramButton = document.getElementById("open-telegram");
  const telegramFooterButton = document.getElementById("telegram-link");
  const briefDetails = document.getElementById("chat-brief");
  const briefForm = document.getElementById("brief-form");
  const briefService = document.getElementById("brief-service");
  const briefFields = document.getElementById("brief-fields");
  const chatFiles = document.getElementById("chat-files");
  const attachmentPreview = document.getElementById("chat-attachment-preview");

  let currentUser = null;
  let currentProfile = null;
  let currentConversation = null;
  let currentMessages = [];
  let chatChannel = null;
  let pendingAttachments = [];
  let pendingService = "";
  let isSendingMessage = false;
  let isPasswordRecovery = false;
  const renderedMessageIds = new Set();

  const setInlineError = (element, message = "") => {
    if (!element) return;
    element.textContent = message;
    element.classList.toggle("visible", Boolean(message));
  };

  const setLoadingButton = (button, loading, loadingText) => {
    if (!button) return;
    if (loading) {
      button.dataset.originalText = button.textContent;
      button.disabled = true;
      button.textContent = loadingText;
    } else {
      button.disabled = false;
      button.textContent = button.dataset.originalText || button.textContent;
      delete button.dataset.originalText;
    }
  };

  const showAuthView = (name) => {
    authViews.forEach((view) => {
      view.hidden = view.dataset.authView !== name;
    });
    [loginError, registerError, recoverError].forEach((item) => setInlineError(item, ""));
  };

  const openAuth = (view = "login") => {
    showAuthView(view);
    if (typeof authDialog?.showModal === "function") authDialog.showModal();
    else authDialog?.setAttribute("open", "");
    window.setTimeout(() => {
      const target = authDialog?.querySelector('[data-auth-view]:not([hidden]) input');
      target?.focus();
    }, 80);
  };

  const closeAuth = () => {
    if (authDialog?.open && typeof authDialog.close === "function") authDialog.close();
    else authDialog?.removeAttribute("open");
  };

  const showRecoveryView = (name) => {
    recoveryViews.forEach((view) => {
      view.hidden = view.dataset.recoveryView !== name;
    });
    setInlineError(passwordError, "");
  };

  const openRecoveryDialog = () => {
    closeAuth();
    showRecoveryView("form");
    if (typeof recoveryDialog?.showModal === "function") {
      if (!recoveryDialog.open) recoveryDialog.showModal();
    } else {
      recoveryDialog?.setAttribute("open", "");
    }
    window.setTimeout(() => newPassword?.focus(), 80);
  };

  const closeRecoveryDialog = () => {
    if (recoveryDialog?.open && typeof recoveryDialog.close === "function") recoveryDialog.close();
    else recoveryDialog?.removeAttribute("open");
  };

  // Не даём закрыть окно восстановления клавишей Escape: recovery-сессия уже
  // активна. Для выхода есть явная кнопка «Отменить восстановление».
  recoveryDialog?.addEventListener("cancel", (event) => event.preventDefault());

  authClose?.addEventListener("click", closeAuth);
  authDialog?.addEventListener("click", (event) => {
    if (event.target === authDialog) closeAuth();
  });
  authSwitchers.forEach((button) => {
    button.addEventListener("click", () => showAuthView(button.dataset.authSwitch || "login"));
  });

  const getDisplayName = () =>
    currentProfile?.display_name?.trim() || currentUser?.user_metadata?.display_name?.trim() || currentUser?.email?.split("@")[0] || "Пользователь";

  const updateAuthUi = () => {
    const signedIn = Boolean(currentUser);
    if (accountButtonLabel) accountButtonLabel.textContent = signedIn ? getDisplayName() : "Войти";
    accountButton?.setAttribute("aria-label", signedIn ? "Открыть личный чат" : "Войти в аккаунт");
    if (chatAccountName) chatAccountName.textContent = getDisplayName();
    if (chatAccountEmail) chatAccountEmail.textContent = currentUser?.email || "";
    if (chatStatusText) chatStatusText.textContent = signedIn ? "Личная переписка" : "Требуется вход";
  };

  const loadOwnProfile = async () => {
    currentProfile = null;
    if (!currentUser) return;
    const { data, error } = await supabaseClient
      .from("profiles")
      .select("id,display_name,email")
      .eq("id", currentUser.id)
      .maybeSingle();
    if (error) console.warn("[nezhno.art] Не удалось загрузить профиль:", error);
    currentProfile = data || null;
    updateAuthUi();
  };

  const resetChatState = async () => {
    currentConversation = null;
    currentMessages = [];
    renderedMessageIds.clear();
    if (chatChannel) {
      try { await supabaseClient.removeChannel(chatChannel); } catch (_) { /* noop */ }
      chatChannel = null;
    }
  };

  const closeChat = () => {
    chatPanel?.classList.remove("open");
    chatPanel?.setAttribute("aria-hidden", "true");
    if (chatBackdrop) chatBackdrop.hidden = true;
    body.classList.remove("no-scroll");
  };

  const signOutUser = async () => {
    closeChat();
    await resetChatState();
    const { error } = await supabaseClient.auth.signOut();
    if (error) showToast("Не удалось выйти из аккаунта");
  };

  chatLogout?.addEventListener("click", signOutUser);

  accountButton?.addEventListener("click", () => {
    if (currentUser) openChat("");
    else openAuth("login");
  });

  loginForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    setInlineError(loginError, "");
    const email = loginEmail?.value.trim() || "";
    const password = loginPassword?.value || "";
    if (!email || !password) {
      setInlineError(loginError, "Введите email и пароль.");
      return;
    }
    setLoadingButton(loginSubmit, true, "Входим…");
    try {
      const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
      if (error || !data?.user) throw error || new Error("Не удалось войти");
      currentUser = data.user;
      await loadOwnProfile();
      if (loginPassword) loginPassword.value = "";
      closeAuth();
      showToast("Вы вошли в аккаунт");
      if (pendingService) {
        const service = pendingService;
        pendingService = "";
        await openChat(service);
      }
    } catch (error) {
      console.warn("[nezhno.art] Ошибка входа:", error);
      const message = /confirm/i.test(error?.message || "")
        ? "Сначала подтвердите email по ссылке из письма."
        : "Не удалось войти. Проверьте email и пароль.";
      setInlineError(loginError, message);
    } finally {
      setLoadingButton(loginSubmit, false, "Входим…");
    }
  });

  registerForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    setInlineError(registerError, "");
    const displayName = registerName?.value.trim() || "";
    const email = registerEmail?.value.trim() || "";
    const password = registerPassword?.value || "";
    const repeat = registerPasswordRepeat?.value || "";

    if (!displayName || !email || !password || !repeat) {
      setInlineError(registerError, "Заполните все поля.");
      return;
    }
    if (password.length < 8) {
      setInlineError(registerError, "Пароль должен содержать минимум 8 символов.");
      return;
    }
    if (password !== repeat) {
      setInlineError(registerError, "Пароли не совпадают.");
      return;
    }

    setLoadingButton(registerSubmit, true, "Создаём…");
    try {
      const { data, error } = await supabaseClient.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: displayName },
          emailRedirectTo: AUTH_REDIRECT_URL,
        },
      });
      if (error) throw error;

      if (data?.session && data?.user) {
        currentUser = data.user;
        await loadOwnProfile();
        closeAuth();
        showToast("Аккаунт создан");
        if (pendingService) {
          const service = pendingService;
          pendingService = "";
          await openChat(service);
        }
        return;
      }

      if (authSuccessText) authSuccessText.textContent = `Письмо с подтверждением отправлено на ${email}. После подтверждения вернитесь на сайт.`;
      showAuthView("success");
      registerForm.reset();
    } catch (error) {
      console.warn("[nezhno.art] Ошибка регистрации:", error);
      setInlineError(registerError, "Не удалось создать аккаунт. Проверьте email и данные формы.");
    } finally {
      setLoadingButton(registerSubmit, false, "Создаём…");
    }
  });

  recoverForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    setInlineError(recoverError, "");
    const email = recoverEmail?.value.trim() || "";
    if (!email) {
      setInlineError(recoverError, "Введите email.");
      return;
    }
    setLoadingButton(recoverSubmit, true, "Отправляем…");
    try {
      const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
        redirectTo: AUTH_REDIRECT_URL,
      });
      if (error) throw error;
      if (authSuccessText) authSuccessText.textContent = `Если аккаунт с адресом ${email} существует, на него отправлено письмо для смены пароля.`;
      showAuthView("success");
    } catch (error) {
      console.warn("[nezhno.art] Ошибка восстановления пароля:", error);
      setInlineError(recoverError, "Не удалось отправить письмо. Попробуйте позже.");
    } finally {
      setLoadingButton(recoverSubmit, false, "Отправляем…");
    }
  });

  passwordForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    setInlineError(passwordError, "");
    const password = newPassword?.value || "";
    const repeat = newPasswordRepeat?.value || "";
    if (password.length < 8) {
      setInlineError(passwordError, "Пароль должен содержать минимум 8 символов.");
      return;
    }
    if (password !== repeat) {
      setInlineError(passwordError, "Пароли не совпадают.");
      return;
    }
    setLoadingButton(passwordSubmit, true, "Сохраняем…");
    try {
      const { error } = await supabaseClient.auth.updateUser({ password });
      if (error) throw error;
      passwordForm.reset();
      isPasswordRecovery = false;
      showRecoveryView("success");
      if (location.hash || /[?&](type|code)=/.test(location.search)) {
        history.replaceState({}, document.title, location.pathname);
      }
    } catch (error) {
      console.warn("[nezhno.art] Ошибка смены пароля:", error);
      setInlineError(passwordError, error?.message || "Не удалось изменить пароль.");
    } finally {
      setLoadingButton(passwordSubmit, false, "Сохраняем…");
    }
  });

  recoveryCancel?.addEventListener("click", async () => {
    isPasswordRecovery = false;
    closeRecoveryDialog();
    try {
      await supabaseClient.auth.signOut();
    } catch (_) {
      // Даже если сеть отвалилась, локальная recovery-модалка всё равно закрывается.
    }
    showToast("Восстановление отменено");
  });

  recoveryDone?.addEventListener("click", () => {
    closeRecoveryDialog();
    showToast("Новый пароль сохранён");
  });

  const ensureConversation = async () => {
    if (!currentUser) throw new Error("AUTH_REQUIRED");
    if (currentConversation?.user_id === currentUser.id) return currentConversation;

    let { data, error } = await supabaseClient
      .from("conversations")
      .select("id,user_id,created_at,updated_at")
      .eq("user_id", currentUser.id)
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      const created = await supabaseClient
        .from("conversations")
        .insert({ user_id: currentUser.id })
        .select("id,user_id,created_at,updated_at")
        .single();

      if (created.error) {
        // Если две вкладки одновременно создали один диалог, UNIQUE защитит базу.
        const retry = await supabaseClient
          .from("conversations")
          .select("id,user_id,created_at,updated_at")
          .eq("user_id", currentUser.id)
          .maybeSingle();
        if (retry.error || !retry.data) throw created.error;
        data = retry.data;
      } else {
        data = created.data;
      }
    }

    currentConversation = data;
    return data;
  };

  const renderChatIntro = () => {
    if (!chatMessages) return;
    chatMessages.innerHTML = "";
    const intro = document.createElement("div");
    intro.className = "message message-seller message-intro";
    intro.innerHTML = '<div class="message-author">nezhno.art</div><p>Привет! Расскажите, что хотите заказать. Можно начать с пары предложений, а детали уточним дальше ♡</p>';
    chatMessages.appendChild(intro);
  };

  const renderChatState = (title, text = "") => {
    if (!chatMessages) return;
    renderChatIntro();
    const state = document.createElement("div");
    state.className = "chat-state";
    const strong = document.createElement("strong");
    strong.textContent = title;
    state.appendChild(strong);
    if (text) {
      const p = document.createElement("p");
      p.textContent = text;
      state.appendChild(p);
    }
    chatMessages.appendChild(state);
  };

  const createSignedAttachmentUrl = async (path) => {
    if (!path) return null;
    const { data, error } = await supabaseClient.storage.from(CHAT_BUCKET).createSignedUrl(path, 60 * 60);
    if (error) {
      console.warn("[nezhno.art] Не удалось создать ссылку на вложение:", error);
      return null;
    }
    return data?.signedUrl || null;
  };

  const appendRemoteMessage = async (message, { scroll = true } = {}) => {
    if (!message || renderedMessageIds.has(String(message.id)) || !chatMessages) return;
    renderedMessageIds.add(String(message.id));
    chatMessages.querySelector(".chat-state-small")?.remove();

    const type = message.sender_id === LINA_USER_ID ? "seller" : "user";
    const wrap = document.createElement("div");
    wrap.className = `message message-${type}`;
    wrap.dataset.messageId = String(message.id);

    if (type === "seller") {
      const author = document.createElement("div");
      author.className = "message-author";
      author.textContent = "nezhno.art";
      wrap.appendChild(author);
    }

    if (message.body) {
      const paragraph = document.createElement("p");
      paragraph.textContent = message.body;
      wrap.appendChild(paragraph);
    }

    if (message.attachment_path) {
      const signedUrl = await createSignedAttachmentUrl(message.attachment_path);
      if (signedUrl) {
        const gallery = document.createElement("div");
        gallery.className = "message-attachments";
        const link = document.createElement("a");
        link.href = signedUrl;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        const image = document.createElement("img");
        image.src = signedUrl;
        image.alt = message.attachment_name ? `Вложение: ${message.attachment_name}` : "Прикреплённое изображение";
        image.loading = "lazy";
        link.appendChild(image);
        gallery.appendChild(link);
        wrap.appendChild(gallery);
      } else {
        const error = document.createElement("small");
        error.className = "message-file-error";
        error.textContent = message.attachment_name ? `Не удалось открыть ${message.attachment_name}` : "Не удалось открыть вложение";
        wrap.appendChild(error);
      }
    }

    const time = document.createElement("time");
    time.className = "message-time";
    time.dateTime = message.created_at || "";
    time.textContent = message.created_at
      ? new Intl.DateTimeFormat("ru-RU", { hour: "2-digit", minute: "2-digit" }).format(new Date(message.created_at))
      : "";
    wrap.appendChild(time);

    chatMessages.appendChild(wrap);
    if (scroll) chatMessages.scrollTop = chatMessages.scrollHeight;
  };

  const loadMessages = async () => {
    const conversation = await ensureConversation();
    renderChatState("Загружаем переписку…");
    renderedMessageIds.clear();

    const { data, error } = await supabaseClient
      .from("messages")
      .select("id,conversation_id,sender_id,body,attachment_path,attachment_name,attachment_mime,created_at")
      .eq("conversation_id", conversation.id)
      .order("created_at", { ascending: true });

    if (error) throw error;
    currentMessages = Array.isArray(data) ? data : [];
    renderChatIntro();
    for (const message of currentMessages) await appendRemoteMessage(message, { scroll: false });
    if (currentMessages.length === 0) {
      const empty = document.createElement("div");
      empty.className = "chat-state chat-state-small";
      empty.textContent = "История пока пустая. Напишите первое сообщение ♡";
      chatMessages.appendChild(empty);
    }
    chatMessages.scrollTop = chatMessages.scrollHeight;
  };

  const subscribeToConversation = async () => {
    if (!currentConversation) return;
    if (chatChannel) {
      try { await supabaseClient.removeChannel(chatChannel); } catch (_) { /* noop */ }
    }

    const conversationId = currentConversation.id;
    chatChannel = supabaseClient
      .channel(`chat-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const message = payload.new;
          if (!message || String(message.conversation_id) !== String(conversationId)) return;
          if (!currentMessages.some((item) => String(item.id) === String(message.id))) currentMessages.push(message);
          window.setTimeout(() => appendRemoteMessage(message), 0);
        }
      )
      .subscribe((status) => {
        if (chatStatusText) {
          chatStatusText.textContent = status === "SUBSCRIBED" ? "На связи" : "Личная переписка";
        }
      });
  };

  const serviceToBriefValue = (service) => {
    const normalized = String(service || "").toLowerCase();
    if (normalized.includes("баннер")) return "banner";
    if (normalized.includes("стикер")) return "stickers";
    if (normalized.includes("модел")) return "model";
    return "general";
  };

  const applyServicePreset = (service) => {
    if (!chatInput || !service) return;
    if (service !== "Новый заказ" && service !== "Общий вопрос") {
      if (!chatInput.value.trim()) chatInput.value = `Здравствуйте! Хочу обсудить: ${service}. `;
      if (briefService) {
        briefService.value = serviceToBriefValue(service);
        renderBriefFields();
      }
    } else if (service === "Общий вопрос" && !chatInput.value.trim()) {
      chatInput.value = "Здравствуйте! У меня вопрос: ";
    }
    autoGrowChatInput();
  };

  async function openChat(service = "") {
    if (!currentUser) {
      pendingService = service || pendingService;
      openAuth("login");
      return;
    }

    chatPanel?.classList.add("open");
    chatPanel?.setAttribute("aria-hidden", "false");
    if (chatBackdrop) chatBackdrop.hidden = false;
    body.classList.add("no-scroll");
    applyServicePreset(service);

    try {
      if (chatStatusText) chatStatusText.textContent = "Подключаемся…";
      await ensureConversation();
      await loadMessages();
      await subscribeToConversation();
      if (chatStatusText) chatStatusText.textContent = "На связи";
      window.setTimeout(() => chatInput?.focus(), 100);
    } catch (error) {
      console.error("[nezhno.art] Не удалось открыть чат:", error);
      renderChatState("Не удалось загрузить чат", "Проверьте интернет и попробуйте закрыть и открыть чат снова.");
      if (chatStatusText) chatStatusText.textContent = "Ошибка соединения";
    }
  }

  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-open-chat]");
    if (!button) return;
    openChat(button.dataset.service || "");
  });

  chatClose?.addEventListener("click", closeChat);
  chatBackdrop?.addEventListener("click", closeChat);

  const autoGrowChatInput = () => {
    if (!chatInput) return;
    chatInput.style.height = "auto";
    chatInput.style.height = `${Math.min(chatInput.scrollHeight, 140)}px`;
  };

  chatPresetButtons.forEach((button) => {
    button.addEventListener("click", () => {
      if (!chatInput) return;
      chatInput.value = `${button.dataset.chatPreset}. `;
      if (briefService && button.dataset.briefService) {
        briefService.value = button.dataset.briefService;
        renderBriefFields();
        if (briefDetails) briefDetails.open = true;
      }
      autoGrowChatInput();
      chatInput.focus();
    });
  });

  const briefTemplates = {
    general: [{ name: "idea", label: "Что нужно?", placeholder: "Например, оформление профиля" }],
    banner: [
      { name: "platform", label: "Где будет использоваться?", placeholder: "Telegram, VK, YouTube…" },
      { name: "size", label: "Размер / формат, если известен", placeholder: "Например, 1590 × 400" },
    ],
    stickers: [
      { name: "count", label: "Примерное количество стикеров", placeholder: "Например, 8", type: "number", min: "1" },
      { name: "character", label: "Персонаж / тема", placeholder: "Кого или что рисуем?" },
    ],
    model: [
      { name: "parts", label: "Примерное количество деталей", placeholder: "Например, 150", type: "number", min: "1" },
      { name: "character", label: "Персонаж / задача", placeholder: "Коротко опишите модель" },
    ],
  };

  const renderBriefFields = () => {
    if (!briefFields || !briefService) return;
    briefFields.innerHTML = "";
    const fields = briefTemplates[briefService.value] || briefTemplates.general;
    fields.forEach((field) => {
      const label = document.createElement("label");
      const caption = document.createElement("span");
      caption.textContent = field.label;
      const input = document.createElement("input");
      input.name = field.name;
      input.type = field.type || "text";
      input.placeholder = field.placeholder || "";
      if (field.min) input.min = field.min;
      label.append(caption, input);
      briefFields.appendChild(label);
    });
  };

  renderBriefFields();
  briefService?.addEventListener("change", renderBriefFields);

  const renderAttachmentPreview = () => {
    if (!attachmentPreview) return;
    attachmentPreview.innerHTML = "";
    attachmentPreview.hidden = pendingAttachments.length === 0;
    pendingAttachments.forEach((item, index) => {
      const chip = document.createElement("div");
      chip.className = "attachment-chip";
      const image = document.createElement("img");
      image.src = item.url;
      image.alt = item.file.name;
      const remove = document.createElement("button");
      remove.type = "button";
      remove.setAttribute("aria-label", `Убрать ${item.file.name}`);
      remove.textContent = "×";
      remove.addEventListener("click", () => {
        URL.revokeObjectURL(item.url);
        pendingAttachments.splice(index, 1);
        renderAttachmentPreview();
      });
      chip.append(image, remove);
      attachmentPreview.appendChild(chip);
    });
  };

  chatFiles?.addEventListener("change", () => {
    const files = Array.from(chatFiles.files || []).filter((file) => file.type.startsWith("image/"));
    const availableSlots = Math.max(0, 4 - pendingAttachments.length);
    files.slice(0, availableSlots).forEach((file) => {
      if (file.size > MAX_CHAT_IMAGE_SIZE) {
        showToast(`${file.name}: файл больше 50 МБ`);
        return;
      }
      pendingAttachments.push({ file, url: URL.createObjectURL(file) });
    });
    if (files.length > availableSlots) showToast("Можно прикрепить до 4 изображений за раз");
    chatFiles.value = "";
    renderAttachmentPreview();
  });

  const makeStoragePath = (ownerId, file) => {
    const cleanName = file.name
      .normalize("NFKD")
      .replace(/[^a-zA-Z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "") || "image";
    const unique = typeof crypto?.randomUUID === "function" ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    return `${ownerId}/${Date.now()}-${unique}-${cleanName}`;
  };

  const sendOutgoingMessage = async (text, attachments = []) => {
    const cleanText = String(text || "").trim();
    if ((!cleanText && attachments.length === 0) || !currentUser || isSendingMessage) return;
    isSendingMessage = true;
    if (chatSend) chatSend.disabled = true;

    const uploaded = [];
    try {
      const conversation = await ensureConversation();

      for (const item of attachments) {
        const path = makeStoragePath(currentUser.id, item.file);
        const { error } = await supabaseClient.storage.from(CHAT_BUCKET).upload(path, item.file, {
          contentType: item.file.type || "image/*",
          upsert: false,
        });
        if (error) throw error;
        uploaded.push({
          path,
          name: item.file.name,
          mime: item.file.type || "image/*",
        });
      }

      const payloads = uploaded.length
        ? uploaded.map((file, index) => ({
            conversation_id: conversation.id,
            sender_id: currentUser.id,
            body: index === 0 && cleanText ? cleanText : null,
            attachment_path: file.path,
            attachment_name: file.name,
            attachment_mime: file.mime,
          }))
        : [{
            conversation_id: conversation.id,
            sender_id: currentUser.id,
            body: cleanText,
            attachment_path: null,
            attachment_name: null,
            attachment_mime: null,
          }];

      const { data, error } = await supabaseClient
        .from("messages")
        .insert(payloads)
        .select("id,conversation_id,sender_id,body,attachment_path,attachment_name,attachment_mime,created_at");
      if (error) throw error;

      for (const message of data || []) {
        if (!currentMessages.some((item) => String(item.id) === String(message.id))) currentMessages.push(message);
        await appendRemoteMessage(message);
      }
      return true;
    } catch (error) {
      console.error("[nezhno.art] Не удалось отправить сообщение:", error);
      if (uploaded.length) {
        try { await supabaseClient.storage.from(CHAT_BUCKET).remove(uploaded.map((item) => item.path)); } catch (_) { /* noop */ }
      }
      showToast("Не удалось отправить сообщение");
      return false;
    } finally {
      isSendingMessage = false;
      if (chatSend) chatSend.disabled = false;
    }
  };

  briefForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const serviceNames = { general: "Другое / пока не знаю", banner: "Баннер", stickers: "Стикеры", model: "Модель" };
    const lines = [`Быстрый бриф: ${serviceNames[briefService?.value] || "Заказ"}`];
    briefFields?.querySelectorAll("label").forEach((label) => {
      const caption = label.querySelector("span")?.textContent;
      const value = label.querySelector("input")?.value.trim();
      if (caption && value) lines.push(`${caption}: ${value}`);
    });
    if (lines.length === 1) {
      showToast("Заполните хотя бы одно поле брифа");
      return;
    }
    const sent = await sendOutgoingMessage(lines.join("\n"));
    if (sent) {
      briefForm.reset();
      if (briefService) briefService.value = "general";
      renderBriefFields();
      if (briefDetails) briefDetails.open = false;
    }
  });

  chatInput?.addEventListener("input", autoGrowChatInput);
  chatInput?.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      chatForm?.requestSubmit();
    }
  });

  chatForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const text = chatInput?.value.trim() || "";
    if (!text && pendingAttachments.length === 0) return;
    const attachmentsToSend = [...pendingAttachments];
    const sent = await sendOutgoingMessage(text, attachmentsToSend);
    if (!sent) return;

    attachmentsToSend.forEach((item) => URL.revokeObjectURL(item.url));
    pendingAttachments = [];
    renderAttachmentPreview();
    chatInput.value = "";
    autoGrowChatInput();
  });

  const chatToPlainText = () => {
    const lines = currentMessages.map((item) => {
      const name = item.sender_id === LINA_USER_ID ? "nezhno.art" : "Клиент";
      const parts = [item.body || ""];
      if (item.attachment_name) parts.push(`[Изображение: ${item.attachment_name}]`);
      return `${name}: ${parts.filter(Boolean).join("\n")}`;
    });
    return lines.length ? lines.join("\n\n") : "Переписка пока пустая.";
  };

  copyChatButton?.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(chatToPlainText());
      showToast("Переписка скопирована");
    } catch (_) {
      showToast("Не получилось скопировать автоматически");
    }
  });

  const openTelegram = () => {
    if (!TELEGRAM_USERNAME) {
      showToast("Telegram пока не настроен. В script.js нужно указать username Лины.");
      return;
    }
    window.open(`https://t.me/${TELEGRAM_USERNAME}`, "_blank", "noopener,noreferrer");
  };

  openTelegramButton?.addEventListener("click", openTelegram);
  telegramFooterButton?.addEventListener("click", openTelegram);

  const handleAuthEvent = async (event, session) => {
    currentUser = session?.user || null;

    if (event === "PASSWORD_RECOVERY" && currentUser) {
      isPasswordRecovery = true;
      openRecoveryDialog();
    }

    if (!currentUser) {
      currentProfile = null;
      await resetChatState();
      updateAuthUi();
      if (event === "SIGNED_OUT") closeRecoveryDialog();
      return;
    }

    await loadOwnProfile();
    updateAuthUi();

    if (event === "PASSWORD_RECOVERY") return;

    // Во время recovery Supabase уже создал временную сессию пользователя.
    // Не закрываем интерфейс восстановления из-за сопутствующего SIGNED_IN.
    if (event === "SIGNED_IN" && authDialog?.open && !isPasswordRecovery) {
      closeAuth();
    }
  };

  authEventHandler = handleAuthEvent;
  pendingAuthEvents.splice(0).forEach(([event, session]) => {
    window.setTimeout(() => handleAuthEvent(event, session), 0);
  });

  const initializeUserSession = async () => {
    try {
      const hashParams = new URLSearchParams(location.hash.replace(/^#/, ""));
      const redirectError = hashParams.get("error_description") || "";
      const redirectErrorCode = hashParams.get("error_code") || "";

      const { data } = await supabaseClient.auth.getSession();
      currentUser = data?.session?.user || null;
      if (currentUser) await loadOwnProfile();
      updateAuthUi();

      if (redirectError) {
        const expired = /expired|otp_expired/i.test(`${redirectErrorCode} ${redirectError}`);
        openAuth("recover");
        setInlineError(
          recoverError,
          expired
            ? "Ссылка для восстановления устарела. Запросите новое письмо."
            : "Не удалось использовать ссылку восстановления. Запросите новую."
        );
      }

      // После того как Supabase обработал токены/ошибку из URL, убираем
      // служебные параметры из адресной строки. Сама сессия уже сохранена SDK.
      if (location.hash && /access_token|refresh_token|type=recovery|error_code|error_description/.test(location.hash)) {
        history.replaceState({}, document.title, `${location.pathname}${location.search}`);
      }
    } catch (error) {
      console.warn("[nezhno.art] Не удалось восстановить сессию:", error);
      updateAuthUi();
    }
  };

  initializeUserSession();

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && chatPanel?.classList.contains("open")) closeChat();
  });
})();
