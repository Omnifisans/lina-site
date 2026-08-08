(() => {
  "use strict";

  // Вставьте username Лины без @, когда он будет согласован.
  // Пример: const TELEGRAM_USERNAME = "nezhno_art";
  const TELEGRAM_USERNAME = "";

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
  if ("IntersectionObserver" in window && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px" }
    );
    revealItems.forEach((item) => observer.observe(item));
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
  // Demo chat
  // -------------------------
  const chatPanel = document.getElementById("chat-panel");
  const chatBackdrop = document.getElementById("chat-backdrop");
  const chatClose = document.getElementById("chat-close");
  const chatForm = document.getElementById("chat-form");
  const chatInput = document.getElementById("chat-input");
  const chatMessages = document.getElementById("chat-messages");
  const openChatButtons = document.querySelectorAll("[data-open-chat]");
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

  const chatStorageKey = "nezhno-demo-chat";
  const chatHistory = [];
  let pendingAttachments = [];

  const saveChat = () => {
    try {
      localStorage.setItem(chatStorageKey, JSON.stringify(chatHistory.slice(-20)));
    } catch (_) {
      // localStorage может быть недоступен в некоторых приватных режимах.
    }
  };

  const appendMessage = (text, type = "user", save = true, attachments = []) => {
    const cleanText = text?.trim() || "";
    if ((!cleanText && !attachments.length) || !chatMessages) return;
    const wrap = document.createElement("div");
    wrap.className = `message message-${type}`;

    if (type === "seller") {
      const author = document.createElement("div");
      author.className = "message-author";
      author.textContent = "nezhno.art";
      wrap.appendChild(author);
    }

    if (cleanText) {
      const paragraph = document.createElement("p");
      paragraph.textContent = cleanText;
      wrap.appendChild(paragraph);
    }

    if (attachments.length) {
      const gallery = document.createElement("div");
      gallery.className = "message-attachments";
      attachments.forEach((item) => {
        const image = document.createElement("img");
        image.src = item.url;
        image.alt = `Прикреплённый референс: ${item.file.name}`;
        gallery.appendChild(image);
      });
      wrap.appendChild(gallery);
    }

    chatMessages.appendChild(wrap);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    if (save) {
      const names = attachments.map((item) => item.file.name);
      const storedText = [cleanText, names.length ? `[Референсы: ${names.join(", ")}]` : ""].filter(Boolean).join("\n");
      chatHistory.push({ text: storedText, type });
      saveChat();
    }
  };

  const restoreChat = () => {
    try {
      const stored = JSON.parse(localStorage.getItem(chatStorageKey) || "[]");
      if (!Array.isArray(stored)) return;
      stored.slice(-20).forEach((item) => {
        if (!item?.text || !["user", "seller", "system"].includes(item.type)) return;
        chatHistory.push(item);
        appendMessage(item.text, item.type, false);
      });
    } catch (_) {
      // Игнорируем повреждённое демо-хранилище.
    }
  };

  restoreChat();

  const serviceToBriefValue = (service) => {
    const normalized = service.toLowerCase();
    if (normalized.includes("баннер")) return "banner";
    if (normalized.includes("стикер")) return "stickers";
    if (normalized.includes("модел")) return "model";
    return "general";
  };

  const openChat = (service = "") => {
    chatPanel?.classList.add("open");
    chatPanel?.setAttribute("aria-hidden", "false");
    if (chatBackdrop) chatBackdrop.hidden = false;
    body.classList.add("no-scroll");

    if (service && service !== "Новый заказ" && service !== "Общий вопрос") {
      chatInput.value = `Здравствуйте! Хочу обсудить: ${service}. `;
      if (briefService) {
        briefService.value = serviceToBriefValue(service);
        renderBriefFields();
      }
    } else if (service === "Общий вопрос") {
      chatInput.value = "Здравствуйте! У меня вопрос: ";
    }

    autoGrowChatInput();
    setTimeout(() => chatInput?.focus(), 120);
  };

  const closeChat = () => {
    chatPanel?.classList.remove("open");
    chatPanel?.setAttribute("aria-hidden", "true");
    if (chatBackdrop) chatBackdrop.hidden = true;
    body.classList.remove("no-scroll");
  };

  openChatButtons.forEach((button) => {
    button.addEventListener("click", () => openChat(button.dataset.service || ""));
  });
  chatClose?.addEventListener("click", closeChat);
  chatBackdrop?.addEventListener("click", closeChat);

  chatPresetButtons.forEach((button) => {
    button.addEventListener("click", () => {
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

  const autoGrowChatInput = () => {
    if (!chatInput) return;
    chatInput.style.height = "auto";
    chatInput.style.height = `${Math.min(chatInput.scrollHeight, 140)}px`;
  };

  const briefTemplates = {
    general: [
      { name: "idea", label: "Что нужно?", placeholder: "Например, оформление профиля" }
    ],
    banner: [
      { name: "platform", label: "Где будет использоваться?", placeholder: "Telegram, VK, YouTube…" },
      { name: "size", label: "Размер / формат, если известен", placeholder: "Например, 1590 × 400" }
    ],
    stickers: [
      { name: "count", label: "Примерное количество стикеров", placeholder: "Например, 8", type: "number", min: "1" },
      { name: "character", label: "Персонаж / тема", placeholder: "Кого или что рисуем?" }
    ],
    model: [
      { name: "parts", label: "Примерное количество деталей", placeholder: "Например, 150", type: "number", min: "1" },
      { name: "character", label: "Персонаж / задача", placeholder: "Коротко опишите модель" }
    ]
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

  briefForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(briefForm);
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
    appendMessage(lines.join("\n"), "user");
    showToast("Бриф добавлен в демо-чат");
    if (briefDetails) briefDetails.open = false;
  });

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
      if (file.size > 8 * 1024 * 1024) {
        showToast(`${file.name}: файл больше 8 МБ`);
        return;
      }
      pendingAttachments.push({ file, url: URL.createObjectURL(file) });
    });
    if (files.length > availableSlots) showToast("В демо можно прикрепить до 4 изображений");
    chatFiles.value = "";
    renderAttachmentPreview();
  });

  chatInput?.addEventListener("input", autoGrowChatInput);
  chatInput?.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      chatForm?.requestSubmit();
    }
  });

  chatForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const text = chatInput?.value.trim() || "";
    if (!text && pendingAttachments.length === 0) return;

    const attachmentsToSend = [...pendingAttachments];
    appendMessage(text, "user", true, attachmentsToSend);
    pendingAttachments = [];
    renderAttachmentPreview();
    chatInput.value = "";
    autoGrowChatInput();

    window.setTimeout(() => {
      appendMessage(
        "Это демо: сообщение и референсы остались только в браузере. Для настоящего чата подключим backend или внешний сервис после согласования.",
        "system"
      );
    }, 450);
  });

  const chatToPlainText = () => {
    const lines = chatHistory.map((item) => {
      const name = item.type === "user" ? "Клиент" : item.type === "seller" ? "nezhno.art" : "Система";
      return `${name}: ${item.text}`;
    });
    return lines.length ? lines.join("\n\n") : "Демо-чат пока пуст.";
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

  // ESC закрывает боковую панель.
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && chatPanel?.classList.contains("open")) closeChat();
  });
})();
