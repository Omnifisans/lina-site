(() => {
  "use strict";

  const SUPABASE_URL = "https://dalipumytxktfrtqhxxm.supabase.co";
  const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_re7xSQ02x55-CTUDSbIpYQ_1qX8tRqN";

  // UID аккаунта Лины.
  // Это не пароль и не секрет. Тот же UID уже используется в RLS-политиках.
  const LINA_USER_ID = "984948c4-d839-4cc7-9635-8868c7ddc6a7";

  const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
  );

  const loginForm = document.getElementById("login-form");
  const emailInput = document.getElementById("login-email");
  const passwordInput = document.getElementById("login-password");
  const errorElement = document.getElementById("login-error");
  const submitButton = loginForm?.querySelector('button[type="submit"]');

  const loginCard = document.querySelector(".admin-login-card");

  const setError = (message = "") => {
    if (!errorElement) return;

    errorElement.textContent = message;
    errorElement.classList.toggle("visible", Boolean(message));
  };

  const setLoading = (loading) => {
    if (!submitButton) return;

    submitButton.disabled = loading;
    submitButton.textContent = loading ? "Входим..." : "Войти";
  };

  const showLoggedIn = (user) => {
    if (!loginCard) return;

    loginCard.innerHTML = `
      <div class="brand">
        <span class="brand-mark">♡</span>
        <span>
          <strong>nezhno.art</strong>
          <small>панель управления</small>
        </span>
      </div>

      <div class="admin-success">
        <div class="admin-success-icon">✓</div>

        <h1>Вход выполнен</h1>

        <p>
          Авторизация работает. Аккаунт администратора успешно подключён.
        </p>

        <div class="admin-user">
          <span>Вы вошли как</span>
          <strong>${escapeHtml(user.email || "администратор")}</strong>
        </div>

        <p class="admin-next-message">
          Дальше здесь появится управление товарами.
        </p>

        <button
          id="logout-button"
          class="button admin-secondary-button"
          type="button"
        >
          Выйти
        </button>
      </div>
    `;

    document
      .getElementById("logout-button")
      ?.addEventListener("click", logout);
  };

  const escapeHtml = (value) => {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  };

  const verifyLina = async (user) => {
    if (!user || user.id !== LINA_USER_ID) {
      await supabaseClient.auth.signOut();
      return false;
    }

    return true;
  };

  const logout = async () => {
    await supabaseClient.auth.signOut();
    window.location.reload();
  };

  loginForm?.addEventListener("submit", async (event) => {
    event.preventDefault();

    setError("");

    const email = emailInput?.value.trim() || "";
    const password = passwordInput?.value || "";

    if (!email || !password) {
      setError("Введите email и пароль.");
      return;
    }

    setLoading(true);

    try {
      const { data, error } =
        await supabaseClient.auth.signInWithPassword({
          email,
          password,
        });

      if (error) {
        console.error("[nezhno.art admin] Ошибка входа:", error);
        setError("Неверный email или пароль.");
        return;
      }

      const allowed = await verifyLina(data.user);

      if (!allowed) {
        setError("У этого аккаунта нет доступа к панели управления.");
        return;
      }

      showLoggedIn(data.user);
    } catch (error) {
      console.error("[nezhno.art admin] Ошибка:", error);

      setError(
        "Не удалось связаться с сервером. Проверьте интернет и попробуйте ещё раз."
      );
    } finally {
      setLoading(false);
    }
  });

  const checkExistingSession = async () => {
    try {
      const {
        data: { session },
        error,
      } = await supabaseClient.auth.getSession();

      if (error) {
        console.error(
          "[nezhno.art admin] Не удалось проверить сессию:",
          error
        );
        return;
      }

      if (!session?.user) return;

      const allowed = await verifyLina(session.user);

      if (allowed) {
        showLoggedIn(session.user);
      }
    } catch (error) {
      console.error(
        "[nezhno.art admin] Ошибка проверки авторизации:",
        error
      );
    }
  };

  checkExistingSession();
})();