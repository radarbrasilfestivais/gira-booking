(function () {
  "use strict";

  /* =====================================================
     CONFIG — acesso agora é validado pelo Firebase Authentication
     (email + senha), não mais por uma lista de chaves fixas no
     código. Cada comprador tem seu próprio login, criado
     automaticamente pela automação Herospark → Make → Firebase.
     Se um comprador pedir reembolso, basta desativar o login
     dele no painel do Firebase (Authentication) — o resto dos
     compradores continua funcionando normalmente.
  ===================================================== */

  /* ===================== App state =====================
     Declarado ANTES de qualquer função que possa lê-lo, para
     nunca mais correr risco de "Cannot access before initialization". */
  let ALL = [];
  let FILTERS = { genres: [], countries: [] };
  let filtered = [];
  let renderedCount = 0;
  const PAGE_SIZE = 30;

  const state = {
    query: "",
    genres: new Set(),
    countries: new Set(),
    contact: new Set(), // 'email' | 'phone' | 'site' | 'social'
    sort: "name",
  };

  /* ===================== Gate (login Firebase) ===================== */
  const gate = document.getElementById("gate");
  const appRoot = document.getElementById("appRoot");
  const gateForm = document.getElementById("gateForm");
  const gateEmail = document.getElementById("gateEmail");
  const gatePassword = document.getElementById("gatePassword");
  const gateError = document.getElementById("gateError");

  const welcomeScreen = document.getElementById("welcomeScreen");
  const infoOverlay = document.getElementById("infoOverlay");
  const infoCard = document.getElementById("infoCard");

  const auth = firebase.auth();

  /*
   * onAuthStateChanged é o "vigia" do Firebase: roda automaticamente
   * sempre que a página carrega, informando se já existe uma sessão
   * válida guardada no navegador (login persistente) ou não. Isso
   * substitui o antigo localStorage manual — o Firebase cuida disso
   * sozinho, de forma seaura, e também é quem detecta se o login foi
   * desativado (ex: reembolso) e desconecta o usuário automaticamente
   * na próxima vez que abrir o app.
   */
  auth.onAuthStateChanged(function (user) {
    if (user) {
      grantAccess();
    } else {
      gate.hidden = false;
      appRoot.hidden = true;
    }
  });

  function grantAccess() {
    gate.hidden = true;
    // Pré-carrega os dados em segundo plano (para já estarem prontos
    // quando o usuário clicar em "Acceder al directorio"), mas mostra
    // primeiro la pantalla de bienvenida — no cae directo en el listado.
    safeInitApp();
    showWelcomeScreen();
  }

  /* ===================== Welcome screen ===================== */

  function showWelcomeScreen() {
    welcomeScreen.hidden = false;
    appRoot.hidden = true;
  }

  function enterDirectory() {
    welcomeScreen.hidden = true;
    appRoot.hidden = false;
  }

  document.getElementById("btnAccederDirectorio").addEventListener("click", enterDirectory);
  document.getElementById("helpBtn").addEventListener("click", showWelcomeScreen);

  document.getElementById("btnComoFunciona").addEventListener("click", function () {
    showInfoOverlay(
      "Cómo funciona GIRA",
      '<p>GIRA es un directorio con más de 2.300 agencias de booking internacionales, listas para ayudarte a llevar tu música a otros países.</p>' +
      '<h3>Buscar y filtrar</h3>' +
      '<p>Usa la barra de búsqueda para encontrar agencias por nombre, género musical, país o ciudad. Con el botón <strong>Filtros</strong> puedes acotar por género, país de booking o qué tipo de contacto directo tiene la agencia (email, teléfono, sitio web o redes).</p>' +
      '<h3>Ver el detalle de una agencia</h3>' +
      '<p>Toca cualquier tarjeta para ver todos los datos de contacto disponibles, los géneros que trabaja y su ubicación.</p>' +
      '<h3>Reportar una agencia desactualizada</h3>' +
      '<p>Dentro del detalle de cada agencia hay un botón para reportar si un dato está desactualizado, si la agencia ya no existe o si está duplicada. Tu reporte nos llega directo — así mantenemos el directorio vivo y confiable con la ayuda de toda la comunidad.</p>'
    );
  });

  document.getElementById("btnSobreApp").addEventListener("click", function () {
    showInfoOverlay(
      "Sobre GIRA",
      '<p>GIRA es tu directorio internacional de booking, pensado para músicos independientes que quieren tocar fuera de su país sin necesitar un manager o una discográfica.</p>' +
      '<p>Tu acceso incluye el directorio completo con más de 2.300 agencias de booking en todo el mundo, buscable y filtrable, tanto desde tu computadora como desde tu celular.</p>' +
      '<p>El directorio se actualiza con el tiempo, y tu acceso ya comprado sigue siendo válido para esas actualizaciones futuras.</p>' +
      '<p>Cualquier duda, escríbenos a <a href="mailto:suporte@radarbrasilfestivais.com.br">suporte@radarbrasilfestivais.com.br</a>.</p>'
    );
  });

  function showInfoOverlay(title, bodyHtml) {
    infoCard.innerHTML = "";

    const closeBtn = document.createElement("button");
    closeBtn.className = "detail-close";
    closeBtn.innerHTML = "&times;";
    closeBtn.addEventListener("click", function () { infoOverlay.hidden = true; document.body.style.overflow = ""; });
    infoCard.appendChild(closeBtn);

    const heading = document.createElement("h2");
    heading.className = "detail-name";
    heading.textContent = title;
    infoCard.appendChild(heading);

    const body = document.createElement("div");
    body.className = "info-body";
    body.innerHTML = bodyHtml;
    infoCard.appendChild(body);

    infoOverlay.hidden = false;
    document.body.style.overflow = "hidden";
  }

  infoOverlay.addEventListener("click", function (e) {
    if (e.target.id === "infoOverlay") {
      infoOverlay.hidden = true;
      document.body.style.overflow = "";
    }
  });

  /*
   * Rede de segurança de verdade — sem "adivinhar" com timeout curto.
   *
   * Antes, o código só ficava tentando por alguns segundos e desistia,
   * o que dava erro falso em conexões mais lentas (o data.js tem ~1MB).
   * Agora: espera até 25 segundos (tempo de sobra mesmo em conexão
   * ruim) E, ao mesmo tempo, escuta se o <script src="data.js"> deu
   * erro de verdade (arquivo não encontrado, rede caiu, etc.) — nesse
   * caso mostra o aviso na hora, sem esperar o tempo todo à toa.
   */
  let DATA_SCRIPT_FAILED = false;
  (function watchDataScript() {
    // Encontra a tag <script src="...data.js..."> já presente no HTML
    // e escuta o evento nativo de erro de carregamento dela.
    const scripts = document.getElementsByTagName("script");
    for (let i = 0; i < scripts.length; i++) {
      if (scripts[i].src && scripts[i].src.indexOf("data.js") !== -1) {
        scripts[i].addEventListener("error", function () {
          DATA_SCRIPT_FAILED = true;
        });
        break;
      }
    }
  })();

  function safeInitApp(attempt) {
    attempt = attempt || 0;
    try {
      if (DATA_SCRIPT_FAILED) {
        throw new Error("[error de red al cargar data.js]");
      }
      if (!window.__AGENCY_DATA__ || !window.__AGENCY_DATA__.length) {
        // 170 intentos x 150ms ≈ 25 segundos de margen real antes de
        // rendirse — de sobra incluso en conexiones lentas.
        if (attempt < 170) {
          setTimeout(function () { safeInitApp(attempt + 1); }, 150);
          return;
        }
        throw new Error("[data.js no cargó a tiempo, 25s]");
      }
      initApp();
    } catch (err) {
      showLoadError(err && err.message);
    }
  }

  function showLoadError(reason) {
    const results = document.getElementById("results");
    const meta = document.getElementById("resultsCount");
    if (meta) meta.textContent = "No se pudo cargar el directorio";
    if (results) {
      results.innerHTML = "";
      const box = document.createElement("div");
      box.style.textAlign = "center";
      box.style.padding = "60px 20px";
      box.style.color = "var(--text-soft)";
      const msg = document.createElement("p");
      msg.style.marginBottom = "18px";
      msg.textContent = "Hubo un problema al cargar los datos del directorio.";
      const detail = document.createElement("p");
      detail.style.marginBottom = "18px";
      detail.style.fontSize = "12px";
      detail.style.opacity = "0.6";
      detail.style.fontFamily = "var(--font-mono)";
      detail.textContent = reason || "";
      const btn = document.createElement("button");
      btn.className = "btn-solid";
      btn.textContent = "Recargar";
      btn.addEventListener("click", function () {
        // Fuerza recarga sin usar la versión en caché del navegador.
        window.location.reload();
      });
      box.appendChild(msg);
      if (reason) box.appendChild(detail);
      box.appendChild(btn);
      results.appendChild(box);
    }
  }

  gateForm.addEventListener("submit", function (e) {
    e.preventDefault();
    gateError.hidden = true;
    const email = (gateEmail.value || "").trim();
    const password = gatePassword.value || "";
    if (!email || !password) return;

    const submitBtn = gateForm.querySelector("button[type=submit]");
    submitBtn.disabled = true;
    const originalLabel = submitBtn.textContent;
    submitBtn.textContent = "Verificando...";

    auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
      .then(function () {
        return auth.signInWithEmailAndPassword(email, password);
      })
      .then(function () {
        // onAuthStateChanged cuida de chamar grantAccess() automaticamente.
      })
      .catch(function (err) {
        gateError.textContent = gateErrorMessage(err);
        gateError.hidden = false;
        gatePassword.focus();
        gatePassword.select();
      })
      .finally(function () {
        submitBtn.disabled = false;
        submitBtn.textContent = originalLabel;
      });
  });

  function gateErrorMessage(err) {
    const code = err && err.code;
    if (code === "auth/user-disabled") {
      return "Este acceso fue desactivado. Si crees que es un error, contáctanos.";
    }
    if (code === "auth/invalid-email") {
      return "Ese email no parece válido.";
    }
    if (code === "auth/too-many-requests") {
      return "Demasiados intentos. Espera unos minutos e inténtalo de nuevo.";
    }
    // auth/user-not-found, auth/wrong-password y variantes se agrupan
    // en un mensaje genérico a propósito: no confirmamos si el email
    // existe o no, por seguridad.
    return "No pudimos verificar tus datos. Revisa el correo de tu compra.";
  }

  function normText(s) {
    return (s || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function initApp() {
    ALL = (window.__AGENCY_DATA__ || []).map(function (r, idx) {
      return {
        id: idx,
        name: r.n || "",
        genres: r.g || "",
        countries: r.b || "",
        phone: r.t || "",
        email: r.e || "",
        site: r.s || "",
        facebook: r.f || "",
        social: r.ig || "",
        address: r.a || "",
        location: r.l || "",
        _search: normText([r.n, r.g, r.b, r.l, r.a].join(" ")),
      };
    });
    FILTERS = window.__FILTER_DATA__ || { genres: [], countries: [] };

    buildChips();
    bindEvents();
    applyFilters();
    registerSW();
    setupInstallPrompt();
  }

  /* ===================== Filter chips ===================== */
  function buildChips() {
    const genreWrap = document.getElementById("genreChips");
    const countryWrap = document.getElementById("countryChips");

    FILTERS.genres.forEach(function (g) {
      const chip = document.createElement("button");
      chip.className = "chip";
      chip.textContent = title(g);
      chip.dataset.value = g;
      chip.addEventListener("click", function () {
        toggleSetValue(state.genres, g);
        chip.classList.toggle("selected");
        updateFilterCount();
      });
      genreWrap.appendChild(chip);
    });

    FILTERS.countries.forEach(function (c) {
      const chip = document.createElement("button");
      chip.className = "chip";
      chip.textContent = c;
      chip.dataset.value = c;
      chip.addEventListener("click", function () {
        toggleSetValue(state.countries, c);
        chip.classList.toggle("selected");
        updateFilterCount();
      });
      countryWrap.appendChild(chip);
    });

    document.querySelectorAll("[data-contact]").forEach(function (chip) {
      chip.addEventListener("click", function () {
        const key = chip.dataset.contact;
        toggleSetValue(state.contact, key);
        chip.classList.toggle("selected");
        updateFilterCount();
      });
    });
  }

  function title(s) {
    if (s.length <= 4) return s; // keep short acronyms like DJS, R&B as-is
    return s.charAt(0) + s.slice(1).toLowerCase();
  }

  function toggleSetValue(set, val) {
    if (set.has(val)) set.delete(val);
    else set.add(val);
  }

  function updateFilterCount() {
    const total = state.genres.size + state.countries.size + state.contact.size;
    const badge = document.getElementById("filterCount");
    const toggle = document.getElementById("filterToggle");
    if (total > 0) {
      badge.hidden = false;
      badge.textContent = String(total);
      toggle.classList.add("active");
    } else {
      badge.hidden = true;
      toggle.classList.remove("active");
    }
  }

  /* ===================== Events ===================== */
  function bindEvents() {
    const searchInput = document.getElementById("searchInput");
    const clearSearch = document.getElementById("clearSearch");
    let debounceTimer;

    searchInput.addEventListener("input", function () {
      clearSearch.hidden = !searchInput.value;
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(function () {
        state.query = normText(searchInput.value);
        applyFilters();
      }, 140);
    });

    clearSearch.addEventListener("click", function () {
      searchInput.value = "";
      clearSearch.hidden = true;
      state.query = "";
      applyFilters();
      searchInput.focus();
    });

    const filterToggle = document.getElementById("filterToggle");
    const filterPanel = document.getElementById("filterPanel");
    filterToggle.addEventListener("click", function () {
      filterPanel.hidden = !filterPanel.hidden;
    });

    document.getElementById("applyFilters").addEventListener("click", function () {
      filterPanel.hidden = true;
      applyFilters();
    });

    document.getElementById("clearAllFilters").addEventListener("click", function () {
      resetFilters();
      applyFilters();
    });

    document.getElementById("emptyReset").addEventListener("click", function () {
      searchInput.value = "";
      clearSearch.hidden = true;
      state.query = "";
      resetFilters();
      applyFilters();
    });

    document.querySelectorAll("[data-clear]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        const which = btn.dataset.clear;
        if (which === "genre") {
          state.genres.clear();
          document.querySelectorAll("#genreChips .chip").forEach(function (c) { c.classList.remove("selected"); });
        } else if (which === "country") {
          state.countries.clear();
          document.querySelectorAll("#countryChips .chip").forEach(function (c) { c.classList.remove("selected"); });
        }
        updateFilterCount();
      });
    });

    document.getElementById("sortSelect").addEventListener("change", function (e) {
      state.sort = e.target.value;
      applyFilters();
    });

    document.getElementById("results").addEventListener("click", function (e) {
      const card = e.target.closest(".card");
      if (card) openDetail(parseInt(card.dataset.id, 10));
    });

    document.getElementById("detailOverlay").addEventListener("click", function (e) {
      if (e.target.id === "detailOverlay") closeDetail();
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeDetail();
    });

    const io = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) renderMore();
    }, { rootMargin: "400px" });
    io.observe(document.getElementById("sentinel"));
  }

  function resetFilters() {
    state.genres.clear();
    state.countries.clear();
    state.contact.clear();
    document.querySelectorAll(".chip.selected").forEach(function (c) { c.classList.remove("selected"); });
    updateFilterCount();
  }

  /* ===================== Filtering / rendering ===================== */
  function applyFilters() {
    filtered = ALL.filter(function (rec) {
      if (state.query && rec._search.indexOf(state.query) === -1) return false;

      if (state.genres.size > 0) {
        const upperGenres = rec.genres.toUpperCase();
        let hit = false;
        state.genres.forEach(function (g) { if (upperGenres.indexOf(g) !== -1) hit = true; });
        if (!hit) return false;
      }

      if (state.countries.size > 0) {
        let hit = false;
        state.countries.forEach(function (c) { if (rec.countries.indexOf(c) !== -1) hit = true; });
        if (!hit) return false;
      }

      if (state.contact.size > 0) {
        let ok = true;
        state.contact.forEach(function (key) {
          if (key === "email" && !rec.email) ok = false;
          if (key === "phone" && !rec.phone) ok = false;
          if (key === "site" && !rec.site) ok = false;
          if (key === "social" && !rec.facebook && !rec.social) ok = false;
        });
        if (!ok) return false;
      }

      return true;
    });

    if (state.sort === "name") {
      filtered.sort(function (a, b) { return a.name.localeCompare(b.name, "es"); });
    } else if (state.sort === "contact") {
      filtered.sort(function (a, b) { return contactScore(b) - contactScore(a); });
    }

    renderedCount = 0;
    document.getElementById("results").innerHTML = "";
    updateResultsMeta();
    renderMore();
  }

  function contactScore(rec) {
    return (rec.email ? 1 : 0) + (rec.phone ? 1 : 0) + (rec.site ? 1 : 0) + (rec.facebook || rec.social ? 1 : 0);
  }

  function updateResultsMeta() {
    const el = document.getElementById("resultsCount");
    el.innerHTML = "<strong>" + filtered.length.toLocaleString("es-ES") + "</strong> agencias encontradas";
    document.getElementById("emptyState").hidden = filtered.length !== 0;
  }

  function renderMore() {
    if (renderedCount >= filtered.length) return;
    const frag = document.createDocumentFragment();
    const next = Math.min(renderedCount + PAGE_SIZE, filtered.length);
    for (let i = renderedCount; i < next; i++) {
      frag.appendChild(buildCard(filtered[i]));
    }
    document.getElementById("results").appendChild(frag);
    renderedCount = next;
  }

  function buildCard(rec) {
    const card = document.createElement("article");
    card.className = "card";
    card.dataset.id = rec.id;

    const top = document.createElement("div");
    top.className = "card-top";

    const name = document.createElement("div");
    name.className = "card-name";
    name.textContent = rec.name;

    const badges = document.createElement("div");
    badges.className = "card-badges";
    badges.appendChild(badge(rec.email, iconMail()));
    badges.appendChild(badge(rec.phone, iconPhone()));
    badges.appendChild(badge(rec.site, iconGlobe()));

    top.appendChild(name);
    top.appendChild(badges);

    const genres = document.createElement("div");
    genres.className = "card-genres";
    genres.textContent = rec.genres || "Géneros no informados";

    const countries = document.createElement("div");
    countries.className = "card-countries";
    countries.textContent = rec.countries ? ("→ " + rec.countries) : "";

    card.appendChild(top);
    card.appendChild(genres);
    if (rec.countries) card.appendChild(countries);

    return card;
  }

  function badge(has, iconSvg) {
    const b = document.createElement("span");
    b.className = "badge" + (has ? " has" : "");
    b.innerHTML = iconSvg;
    return b;
  }

  function iconMail() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>';
  }
  function iconPhone() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.9.34 1.79.65 2.65a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.43-1.43a2 2 0 0 1 2.11-.45c.86.31 1.75.53 2.65.65A2 2 0 0 1 22 16.92z"/></svg>';
  }
  function iconGlobe() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>';
  }

  /* ===================== Detail overlay ===================== */
  function openDetail(id) {
    const rec = ALL[id];
    if (!rec) return;
    const overlay = document.getElementById("detailOverlay");
    const card = document.getElementById("detailCard");
    card.innerHTML = "";

    const closeBtn = document.createElement("button");
    closeBtn.className = "detail-close";
    closeBtn.innerHTML = "&times;";
    closeBtn.addEventListener("click", closeDetail);
    card.appendChild(closeBtn);

    const name = document.createElement("h2");
    name.className = "detail-name";
    name.textContent = rec.name;
    card.appendChild(name);

    if (rec.location) {
      const loc = document.createElement("div");
      loc.className = "detail-location";
      loc.textContent = rec.location.split(" > ").reverse().join(" · ");
      card.appendChild(loc);
    }

    if (rec.genres) {
      card.appendChild(sectionTags("Géneros / tipo de artista", rec.genres));
    }

    if (rec.countries) {
      card.appendChild(sectionText("Booking en", rec.countries));
    }

    if (rec.address) {
      card.appendChild(sectionText("Dirección", rec.address));
    }

    const contacts = document.createElement("div");
    contacts.className = "detail-section";
    const clabel = document.createElement("div");
    clabel.className = "detail-label";
    clabel.textContent = "Contacto";
    contacts.appendChild(clabel);

    const rows = document.createElement("div");
    rows.className = "detail-contacts";

    if (rec.email) {
      rec.email.split(";").forEach(function (e) {
        e = e.trim();
        if (e) rows.appendChild(contactRow(iconMail(), e, "mailto:" + e));
      });
    }
    if (rec.phone) {
      rec.phone.split(";").forEach(function (p) {
        p = p.trim();
        if (p) rows.appendChild(contactRow(iconPhone(), p, null));
      });
    }
    if (rec.site) {
      rec.site.split(";").forEach(function (s) {
        s = s.trim();
        if (s) rows.appendChild(contactRow(iconGlobe(), s.replace(/^https?:\/\//, ""), s));
      });
    }
    if (rec.facebook) {
      rec.facebook.split(";").forEach(function (f) {
        f = f.trim();
        if (f) rows.appendChild(contactRow(iconGlobe(), f, "https://" + f.replace(/^https?:\/\//, "")));
      });
    }
    if (rec.social) {
      rec.social.split(";").forEach(function (s) {
        s = s.trim();
        if (s) rows.appendChild(contactRow(iconGlobe(), s, null));
      });
    }

    if (!rows.children.length) {
      const none = document.createElement("div");
      none.className = "detail-value";
      none.style.opacity = "0.5";
      none.textContent = "No hay contacto directo listado — consulta el sitio web o las redes sociales de la región.";
      rows.appendChild(none);
    }

    contacts.appendChild(rows);
    card.appendChild(contacts);

    card.appendChild(reportSection(rec));

    overlay.hidden = false;
    document.body.style.overflow = "hidden";
  }

  /* ===================== Report (Web3Forms) =====================
     Botão "Reportar esta agencia" dentro do card de detalhe. Ao
     clicar, mostra um mini-formulário (motivo + comentário opcional)
     que envia os dados direto pro Web3Forms — sem servidor próprio,
     igual ao login (Firebase) já faz. O Web3Forms encaminha por
     email pra suporte@radarbrasilfestivais.com.br automaticamente.
  ===================================================== */
  const WEB3FORMS_ACCESS_KEY = "019f86dc-c04d-493b-ab56-b6093b14f3ac";

  function reportSection(rec) {
    const wrap = document.createElement("div");
    wrap.className = "detail-section report-section";

    const reportBtn = document.createElement("button");
    reportBtn.type = "button";
    reportBtn.className = "report-trigger";
    reportBtn.innerHTML = iconFlag() + "<span>¿Este contacto está desactualizado? Repórtalo</span>";

    const formBox = document.createElement("div");
    formBox.className = "report-form";
    formBox.hidden = true;

    const reasonSelect = document.createElement("select");
    reasonSelect.className = "report-select";
    [
      ["desactualizado", "Datos desactualizados (teléfono, email, etc.)"],
      ["no_existe", "La agencia ya no existe"],
      ["duplicado", "Está duplicada en el directorio"],
      ["otro", "Otro motivo"],
    ].forEach(function (opt) {
      const o = document.createElement("option");
      o.value = opt[0];
      o.textContent = opt[1];
      reasonSelect.appendChild(o);
    });

    const commentBox = document.createElement("textarea");
    commentBox.className = "report-comment";
    commentBox.placeholder = "Comentario opcional — ¿qué debería corregirse?";
    commentBox.rows = 3;

    const sendBtn = document.createElement("button");
    sendBtn.type = "button";
    sendBtn.className = "report-send";
    sendBtn.textContent = "Enviar reporte";

    const statusMsg = document.createElement("div");
    statusMsg.className = "report-status";
    statusMsg.hidden = true;

    sendBtn.addEventListener("click", function () {
      sendBtn.disabled = true;
      const originalLabel = sendBtn.textContent;
      sendBtn.textContent = "Enviando...";
      statusMsg.hidden = true;

      const payload = {
        access_key: WEB3FORMS_ACCESS_KEY,
        subject: "Reporte de agencia — " + rec.name,
        agencia: rec.name,
        motivo: reasonSelect.options[reasonSelect.selectedIndex].textContent,
        comentario: commentBox.value.trim() || "(sin comentario)",
        pais: rec.countries || rec.location || "(no especificado)",
      };

      fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      })
        .then(function (res) { return res.json(); })
        .then(function (data) {
          if (data && data.success) {
            statusMsg.textContent = "¡Gracias! Tu reporte fue enviado.";
            statusMsg.className = "report-status ok";
            commentBox.value = "";
          } else {
            throw new Error("respuesta sin éxito");
          }
        })
        .catch(function () {
          statusMsg.textContent = "No se pudo enviar. Intenta de nuevo en un momento.";
          statusMsg.className = "report-status error";
        })
        .finally(function () {
          statusMsg.hidden = false;
          sendBtn.disabled = false;
          sendBtn.textContent = originalLabel;
        });
    });

    formBox.appendChild(reasonSelect);
    formBox.appendChild(commentBox);
    formBox.appendChild(sendBtn);
    formBox.appendChild(statusMsg);

    reportBtn.addEventListener("click", function () {
      formBox.hidden = !formBox.hidden;
    });

    wrap.appendChild(reportBtn);
    wrap.appendChild(formBox);
    return wrap;
  }

  function iconFlag() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>';
  }

  function sectionText(label, value) {
    const s = document.createElement("div");
    s.className = "detail-section";
    const l = document.createElement("div");
    l.className = "detail-label";
    l.textContent = label;
    const v = document.createElement("div");
    v.className = "detail-value";
    v.textContent = value;
    s.appendChild(l);
    s.appendChild(v);
    return s;
  }

  function sectionTags(label, value) {
    const s = document.createElement("div");
    s.className = "detail-section";
    const l = document.createElement("div");
    l.className = "detail-label";
    l.textContent = label;
    const tags = document.createElement("div");
    tags.className = "detail-genre-tags";
    value.split(/[,;]/).forEach(function (g) {
      g = g.trim();
      if (!g) return;
      const t = document.createElement("span");
      t.className = "detail-genre-tag";
      t.textContent = g;
      tags.appendChild(t);
    });
    s.appendChild(l);
    s.appendChild(tags);
    return s;
  }

  function contactRow(iconSvg, text, href) {
    const el = document.createElement(href ? "a" : "div");
    el.className = "contact-row";
    if (href) {
      el.href = href;
      if (href.indexOf("http") === 0) el.target = "_blank";
      el.rel = "noopener";
    }
    el.innerHTML = iconSvg + "<span>" + escapeHtml(text) + "</span>";
    return el;
  }

  function escapeHtml(s) {
    const div = document.createElement("div");
    div.textContent = s;
    return div.innerHTML;
  }

  function closeDetail() {
    document.getElementById("detailOverlay").hidden = true;
    document.body.style.overflow = "";
  }

  /* ===================== PWA ===================== */
  function registerSW() {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("sw.js").catch(function () {});
    }
  }

  function setupInstallPrompt() {
    let deferredPrompt;
    const btn = document.getElementById("installBtn");
    window.addEventListener("beforeinstallprompt", function (e) {
      e.preventDefault();
      deferredPrompt = e;
      btn.hidden = false;
    });
    btn.addEventListener("click", function () {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      deferredPrompt = null;
      btn.hidden = true;
    });
  }
})();
