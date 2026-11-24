/* صياغة الوصيّة الشرعية — منطق التطبيق */
(function () {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const KEYS = {
    will: "wasaya.will.v1",
    progress: "wasaya.progress.v1",
    theme: "wasaya.theme.v1",
    best: "wasaya.best.v1",
    page: "wasaya.page.v1",
    rights: "wasaya.rights.v1",
    agent: "wasaya.agent.v1"
  };

  const store = {
    get(key, fallback) {
      try {
        const raw = localStorage.getItem(key);
        return raw === null ? fallback : JSON.parse(raw);
      } catch (e) { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* storage unavailable */ }
    }
  };

  const ar = (value) => String(value == null ? "" : value).replace(/[0-9]/g, (d) => "٠١٢٣٤٥٦٧٨٩"[+d]);
  const esc = (value) => String(value == null ? "" : value)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

  let toastTimer;
  function toast(message) {
    const el = $("#toast");
    el.textContent = message;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 2600);
  }

  /* ================= التنقل ================= */
  let currentPage = "home";
  function go(page) {
    if (!$("#" + page)) return;
    currentPage = page;
    $$(".page").forEach((p) => p.classList.toggle("active", p.id === page));
    $$(".nav-item").forEach((n) => n.classList.toggle("active", n.dataset.page === page));
    document.body.classList.remove("nav-open");
    store.set(KEYS.page, page);
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (page === "builder") showStep(step);
    if (page === "kaffarat" && !selectedKaffar) selectKaffar(KAFFARAT[0].id);
  }

  document.addEventListener("click", (e) => {
    const goBtn = e.target.closest("[data-go]");
    if (goBtn) { go(goBtn.dataset.go); return; }
    const navBtn = e.target.closest("[data-page]");
    if (navBtn) { go(navBtn.dataset.page); return; }
  });

  $("#menuBtn").addEventListener("click", () => document.body.classList.toggle("nav-open"));
  $("#drawerOverlay").addEventListener("click", () => document.body.classList.remove("nav-open"));

  /* ================= الوضع الليلي ================= */
  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    $("#themeBtn").textContent = theme === "dark" ? "☀️" : "🌙";
  }
  applyTheme(store.get(KEYS.theme, "light"));
  $("#themeBtn").addEventListener("click", () => {
    const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
    applyTheme(next);
    store.set(KEYS.theme, next);
  });

  /* ================= الاتصال والتثبيت والطباعة ================= */
  function updateNetwork() {
    const pill = $("#netPill");
    const online = navigator.onLine;
    pill.classList.toggle("offline", !online);
    $("span", pill).textContent = online ? "متصل" : "دون إنترنت";
  }
  updateNetwork();
  window.addEventListener("online", updateNetwork);
  window.addEventListener("offline", updateNetwork);

  let deferredPrompt = null;
  const installBtn = $("#installBtn");
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    installBtn.hidden = false;
  });
  installBtn.addEventListener("click", async () => {
    if (!deferredPrompt) { toast("استخدم قائمة المتصفح: «إضافة إلى الشاشة الرئيسية»"); return; }
    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === "accepted") toast("تمت إضافة التطبيق إلى جهازك");
    deferredPrompt = null;
    installBtn.hidden = true;
  });

  function printCurrent() {
    if (currentPage === "builder") renderPaper();
    const isWill = currentPage === "builder";
    document.body.classList.add(isWill ? "printing-will" : "printing-general");
    const cleanup = () => {
      document.body.classList.remove("printing-will", "printing-general");
      window.removeEventListener("afterprint", cleanup);
    };
    window.addEventListener("afterprint", cleanup);
    setTimeout(() => window.print(), 80);
    setTimeout(cleanup, 4000);
  }
  $("#printBtn").addEventListener("click", printCurrent);

  /* ================= شريط التقدّم والمحاور ================= */
  const doneModules = new Set(store.get(KEYS.progress, []));
  function renderModules() {
    $("#moduleGrid").innerHTML = MODULES.map((m) => `
      <article class="module-card ${doneModules.has(m.id) ? "done" : ""}" data-mod-card="${m.id}">
        <div class="mod-top"><span class="mod-num">${ar(String(m.id).padStart(2, "0"))}</span><span class="mod-ico">${m.icon}</span></div>
        <h3>${esc(m.title)}</h3>
        <p>${esc(m.desc)}</p>
        <label class="mod-check"><input type="checkbox" data-mod="${m.id}" ${doneModules.has(m.id) ? "checked" : ""}><span>أُنجز المحور</span></label>
        <button class="mod-go" data-go="${m.page}">افتح المحور ←</button>
      </article>`).join("");
  }
  function updateProgress() {
    const pct = Math.round((doneModules.size / MODULES.length) * 100);
    $("#sidePct").textContent = ar(pct) + "%";
    $("#sideBar").style.width = pct + "%";
    $("#homeCounter").textContent = ar(doneModules.size) + " / " + ar(MODULES.length) + " منجز";
    $("#sideHint").textContent = pct === 100 ? "أتممت المحاور الستة — أحسنت!" : "أنه المحاور الستة لتكتمل مسار التكوين";
  }
  function setModule(id, checked) {
    if (checked) doneModules.add(id); else doneModules.delete(id);
    store.set(KEYS.progress, Array.from(doneModules));
    $$('input[data-mod="' + id + '"]').forEach((box) => { box.checked = checked; });
    const card = $('[data-mod-card="' + id + '"]');
    if (card) card.classList.toggle("done", checked);
    updateProgress();
    if (checked && doneModules.size === MODULES.length) toast("أتممت التكوين كاملاً — بارك الله فيك 🎉");
  }
  document.addEventListener("change", (e) => {
    const box = e.target.closest("input[data-mod]");
    if (box) setModule(Number(box.dataset.mod), box.checked);
  });
  renderModules();
  updateProgress();

  /* ================= حاسبة الثلث ================= */
  function updateEstateCalc() {
    const estate = Math.max(0, Number($("#estateInput").value) || 0);
    const third = estate / 3;
    const rest = estate - third;
    $("#thirdOut").textContent = ar(Math.round(third).toLocaleString("en-US"));
    $("#restOut").textContent = ar(Math.round(rest).toLocaleString("en-US"));
    $("#pieChart").style.background = `conic-gradient(var(--gold) 0 33.333%, var(--green-100) 33.333% 100%)`;
  }
  $("#estateInput").addEventListener("input", updateEstateCalc);
  updateEstateCalc();

  /* ================= الكفّارات ================= */
  let selectedKaffar = null;
  function renderKaffarTabs() {
    $("#kaffarTabs").innerHTML = KAFFARAT.map((k) => `
      <button class="kaff-tab ${k.id === selectedKaffar ? "active" : ""}" data-kaffar="${k.id}">${esc(k.tab)}</button>`).join("");
  }
  function selectKaffar(id) {
    selectedKaffar = id;
    const k = KAFFARAT.find((x) => x.id === id) || KAFFARAT[0];
    $("#kaffarDetail").innerHTML = `
      <div class="kaff-head"><span class="kaff-emoji">${k.icon}</span><div><h4>${esc(k.title)}</h4><small>${esc(k.sub)}</small></div></div>
      <div class="kaff-body">
        <div class="kaff-block"><strong>السبب</strong><p>${esc(k.cause)}</p></div>
        <div class="kaff-block"><strong>ما يجب إخراجه</strong><p>${esc(k.obligation)}</p></div>
        <div class="kaff-block full"><strong>الدليل</strong><p>${esc(k.evidence)} <span class="kaff-source">— ${esc(k.source)}</span></p></div>
        <div class="kaff-block full"><strong>تنبيه فقهي</strong><p>${esc(k.note)}</p></div>
      </div>`;
    renderKaffarTabs();
  }
  $("#kaffarTabs").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-kaffar]");
    if (btn) selectKaffar(btn.dataset.kaffar);
  });
  selectKaffar(KAFFARAT[0].id);

  $("#addKaffarToWill").addEventListener("click", () => {
    const k = KAFFARAT.find((x) => x.id === selectedKaffar);
    if (!k) return;
    state.kaffars.push({ a: k.title, b: "1", c: k.obligation });
    saveWill();
    renderRows("kaffars");
    go("builder");
    showStep(4);
    toast("أُضيفت الكفّارة إلى الوصية — يمكنك تعديلها");
  });

  /* ================= تبويبات الحقوق ================= */
  $$(".seg").forEach((tab) => tab.addEventListener("click", () => {
    $$(".seg").forEach((t) => t.classList.toggle("active", t === tab));
    $$(".seg-panel").forEach((p) => p.classList.toggle("active", p.id === "seg-" + tab.dataset.seg));
  }));

  function renderCheckGrid(container, items, storageKey) {
    const saved = new Set(store.get(storageKey, []));
    container.innerHTML = items.map((text, i) => `
      <label class="mini-check ${saved.has(i) ? "checked" : ""}"><input type="checkbox" data-check="${i}" ${saved.has(i) ? "checked" : ""}><span>${esc(text)}</span></label>`).join("");
    container.addEventListener("change", (e) => {
      const box = e.target.closest("input[data-check]");
      if (!box) return;
      const set = new Set(store.get(storageKey, []));
      const idx = Number(box.dataset.check);
      if (box.checked) set.add(idx); else set.delete(idx);
      store.set(storageKey, Array.from(set));
      box.closest(".mini-check").classList.toggle("checked", box.checked);
      if (container.id === "rightsChecklist") updateRightsCount();
      if (container.id === "agentChecklist") updateAgentResult();
    });
  }
  function checkedIndices(key) { return new Set(store.get(key, [])); }
  function updateRightsCount() {
    $("#rightsCheckCount").textContent = ar(checkedIndices(KEYS.rights).size) + " / " + ar(RIGHTS_ITEMS.length);
  }
  renderCheckGrid($("#rightsChecklist"), RIGHTS_ITEMS, KEYS.rights);
  updateRightsCount();

  function updateAgentResult() {
    const count = checkedIndices(KEYS.agent).size;
    const el = $("#agentResult");
    el.classList.remove("good", "warn");
    if (count === AGENT_ITEMS.length) {
      el.classList.add("good");
      el.textContent = "✓ الوكيل مستوفياً لشروط الأهليّة المختصرة، والله أعلم.";
    } else if (count >= 4) {
      el.classList.add("warn");
      el.textContent = "قريب من الجاهزية: تبقّى " + ar(AGENT_ITEMS.length - count) + " شرطاً؛ راجعها قبل التوقيع.";
    } else {
      el.textContent = "اختر ما ينطبق على وكيلك (" + ar(count) + " / " + ar(AGENT_ITEMS.length) + ")";
    }
  }
  renderCheckGrid($("#agentChecklist"), AGENT_ITEMS, KEYS.agent);
  updateAgentResult();

  $("#rightsToBuilder").addEventListener("click", () => {
    const picked = Array.from(checkedIndices(KEYS.rights)).sort((a, b) => a - b).map((i) => RIGHTS_ITEMS[i]).filter(Boolean);
    if (picked.length) {
      state.wDeposits = [state.wDeposits, picked.join("؛ ")].filter(Boolean).join(" — ");
      syncFieldsFromState();
      saveWill();
    }
    go("builder");
    showStep(2);
    toast("نُقلت القائمة إلى وصيتك");
  });
  $("#agentToBuilder").addEventListener("click", () => { go("builder"); showStep(5); });

  /* ================= صانع الوصية ================= */
  const FIELD_IDS = [
    "wName", "wCity", "wDate", "wCapacity", "wVoluntary",
    "wEstate", "wCurrency", "wDeposits", "wAgent", "wAgentRel",
    "wAgentContact", "wAgentBackup", "wAgentOk", "wWitness1", "wWitness2",
    "wNotary", "wDocNo", "wReviewed", "wLegal", "wWorshipNotes"
  ];

  function emptyWill() {
    return {
      wName: "", wCity: "", wDate: new Date().toISOString().slice(0, 10),
      wCapacity: "أنا في كامل قواي العقلية والبدنية", wVoluntary: false,
      wEstate: "", wCurrency: "", wDeposits: "",
      debts: [], wills: [], kaffars: [],
      wAgent: "", wAgentRel: "", wAgentContact: "", wAgentBackup: "", wAgentOk: false,
      wWitness1: "", wWitness2: "", wNotary: "", wDocNo: "",
      wReviewed: false, wLegal: false, wWorshipNotes: ""
    };
  }
  let state = Object.assign(emptyWill(), store.get(KEYS.will, {}));
  ["debts", "wills", "kaffars"].forEach((k) => { if (!Array.isArray(state[k])) state[k] = []; });
  let step = 1;

  function saveWill() { store.set(KEYS.will, state); }
  function syncFieldsFromState() {
    FIELD_IDS.forEach((id) => {
      const el = $("#" + id);
      if (!el) return;
      if (el.type === "checkbox") el.checked = !!state[id];
      else el.value = state[id] == null ? "" : state[id];
    });
  }

  const WILL_TYPES = [
    "لغير وارث — من الثلث", "لوارث — بإجازة الورثة بعد الوفاة",
    "جهة برّ — صدقة جارية", "وقف أو عمل دائم", "أخرى"
  ];
  const KAFFAR_TITLES = KAFFARAT.map((k) => k.title).concat(["قضاء عبادة", "زكاة لم تُخرج", "أخرى"]);

  const ROW_CONFIG = {
    debts: {
      box: "#debtList",
      fields: [
        { k: "a", ph: "البيان (قرض، أجرة...)" },
        { k: "b", ph: "الجهة المستحقة" },
        { k: "c", ph: "القيمة التقديرية", type: "number" }
      ]
    },
    wills: {
      box: "#willList",
      fields: [
        { k: "a", ph: "المُوصى له أو الجهة" },
        { k: "b", type: "select", options: WILL_TYPES },
        { k: "c", ph: "القيمة أو النسبة", type: "number" }
      ]
    },
    kaffars: {
      box: "#kaffarList",
      fields: [
        { k: "a", type: "select", options: KAFFAR_TITLES },
        { k: "b", ph: "العدد", type: "number" },
        { k: "c", ph: "القدر / المستحق" }
      ]
    }
  };

  function renderRows(list) {
    const cfg = ROW_CONFIG[list];
    const box = $(cfg.box);
    if (!box) return;
    if (!state[list].length) {
      box.innerHTML = '<p class="tiny" style="margin:0">لا توجد إضافات بعد — اضغط الزر أدناه.</p>';
      return;
    }
    box.innerHTML = state[list].map((row, i) => {
      const inputs = cfg.fields.map((f) => {
        const val = esc(row[f.k] == null ? "" : row[f.k]);
        if (f.type === "select") {
          return `<select data-list="${list}" data-i="${i}" data-key="${f.k}">${f.options.map((o) => `<option ${o === row[f.k] ? "selected" : ""}>${esc(o)}</option>`).join("")}</select>`;
        }
        return `<input type="${f.type || "text"}" data-list="${list}" data-i="${i}" data-key="${f.k}" value="${val}" placeholder="${esc(f.ph || "")}">`;
      }).join("");
      return `<div class="rep-row">${inputs}<button class="rep-del" type="button" data-del="${list}" data-i="${i}" aria-label="حذف">×</button></div>`;
    }).join("");
  }

  Object.keys(ROW_CONFIG).forEach((list) => {
    const box = $(ROW_CONFIG[list].box);
    box.addEventListener("input", rowInputHandler);
    box.addEventListener("change", rowInputHandler);
    box.addEventListener("click", (e) => {
      const del = e.target.closest("[data-del]");
      if (!del) return;
      state[del.dataset.del].splice(Number(del.dataset.i), 1);
      saveWill();
      renderRows(del.dataset.del);
      updateDebtCalc();
    });
  });
  function rowInputHandler(e) {
    const field = e.target.closest("[data-list][data-key]");
    if (!field) return;
    const list = field.dataset.list;
    const i = Number(field.dataset.i);
    if (!state[list][i]) return;
    state[list][i][field.dataset.key] = field.value;
    saveWill();
    if (list === "debts") updateDebtCalc();
  }

  function addRow(list, preset) {
    const cfg = ROW_CONFIG[list];
    const row = {};
    cfg.fields.forEach((f) => { row[f.k] = f.type === "select" ? f.options[0] : ""; });
    Object.assign(row, preset || {});
    state[list].push(row);
    saveWill();
    renderRows(list);
    updateDebtCalc();
    return row;
  }

  $("#addDebt").addEventListener("click", () => addRow("debts"));
  $("#addWill").addEventListener("click", () => addRow("wills"));
  $("#addKaffar").addEventListener("click", () => addRow("kaffars"));

  $("#kaffarPicks").innerHTML = KAFFARAT.map((k) => `<button class="pick" type="button" data-pick="${k.id}">+ ${esc(k.title)}</button>`).join("");
  $("#kaffarPicks").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-pick]");
    if (!btn) return;
    const k = KAFFARAT.find((x) => x.id === btn.dataset.pick);
    addRow("kaffars", { a: k.title, c: k.obligation });
  });

  FIELD_IDS.forEach((id) => {
    const el = $("#" + id);
    if (!el) return;
    const evt = el.type === "checkbox" || el.tagName === "SELECT" ? "change" : "input";
    el.addEventListener(evt, () => {
      state[id] = el.type === "checkbox" ? el.checked : el.value;
      saveWill();
      if (id === "wEstate") updateDebtCalc();
      if (step === 7) renderPaper();
    });
  });

  function updateDebtCalc() {
    const estate = Math.max(0, Number(state.wEstate) || 0);
    const debts = state.debts.reduce((sum, r) => sum + (Number(r.c) || 0), 0);
    const net = Math.max(0, estate - debts);
    const third = net / 3;
    $("#debtCalc").textContent = estate || debts
      ? `التركة بعد الديون المذكورة: ${ar(Math.round(net).toLocaleString("en-US"))} ${esc(state.wCurrency || "")} — والثلث الأقصى: ${ar(Math.round(third).toLocaleString("en-US"))}`
      : "أدخل التركة والديون لتظهر التركة الصافية والثلث.";
  }

  function showStep(n) {
    step = Math.min(7, Math.max(1, n));
    $$(".wstep").forEach((s) => s.classList.toggle("active", Number(s.dataset.step) === step));
    $("#stepLabel").textContent = "الخطوة " + ar(step) + " من ٧";
    $("#prevStep").disabled = step === 1;
    $("#nextStep").textContent = step === 7 ? "تم ✓" : "التالي ←";
    $("#builderFill").style.width = (step / 7 * 100) + "%";
    $("#stepDots").innerHTML = Array.from({ length: 7 }, (_, i) => {
      const num = i + 1;
      return `<button class="step-dot ${num === step ? "active" : num < step ? "done" : ""}" type="button" data-wstep="${num}">${ar(num)}</button>`;
    }).join("");
    if (step === 7) renderPaper();
  }
  $("#stepDots").addEventListener("click", (e) => {
    const dot = e.target.closest("[data-wstep]");
    if (dot) showStep(Number(dot.dataset.wstep));
  });
  $("#nextStep").addEventListener("click", () => {
    if (step === 1 && !state.wName.trim()) { toast("اكتب اسم المُوصي أولاً"); $("#wName").focus(); return; }
    if (step === 7) { toast("وصيّتك محفوظة على جهازك — طباعتها أو حمّلها"); return; }
    showStep(step + 1);
  });
  $("#prevStep").addEventListener("click", () => showStep(step - 1));

  function line(label, value) {
    return value ? `<p>${label}: <strong>${esc(value)}</strong></p>` : "";
  }
  function listLines(items, render) {
    return items.length ? items.map(render).join("") : '<p>لا شيء مُقيّد — راجع الحقوق قبل التوقيع.</p>';
  }
  function renderPaper() {
    const d = state;
    const estate = Math.max(0, Number(d.wEstate) || 0);
    const debts = d.debts.reduce((s, r) => s + (Number(r.c) || 0), 0);
    const net = Math.max(0, estate - debts);
    $("#willPaper").innerHTML = `
      <div class="p-bism">بسم الله الرحمن الرحيم</div>
      <h4>وصيّة شرعية</h4>
      <div class="p-meta">
        <span>المُوصي: <strong>${esc(d.wName || "................")}</strong></span>
        <span>المكان: <strong>${esc(d.wCity || "................")}</strong></span>
        <span>التاريخ: <strong>${esc(d.wDate || "................")}</strong></span>
      </div>
      <p>أنا ${esc(d.wName || "المُوصي")}، ${esc(d.wCapacity)}. أوصي بعد وفاتي — بإذن الله — بالعمل بما يلي، والله على ما أقول وكيل:</p>

      <div class="p-sec"><strong>١) التركة وحقوق الله والعباد</strong>
        ${estate ? `<p>تقدير التركة قبل الديون: <strong>${ar(estate.toLocaleString("en-US"))} ${esc(d.wCurrency)}</strong> — والصافي بعد الديون المذكورة: <strong>${ar(Math.round(net).toLocaleString("en-US"))}</strong>.</p>` : ""}
        ${listLines(d.debts, (r, i) => `<p>${ar(i + 1)}) ${esc(r.a)} — الجهة: ${esc(r.b)} — القيمة: ${esc(r.c)}</p>`)}
        ${line("أمانات وودائع يجب ردّها", d.wDeposits)}
      </div>

      <div class="p-sec"><strong>٢) الوصايا من الثلث لغير الورثة</strong>
        ${listLines(d.wills, (r, i) => `<p>${ar(i + 1)}) إلى: ${esc(r.a)} — النوع: ${esc(r.b)} — المقدار: ${esc(r.c)}</p>`)}
        <p>ما زاد على الثلث، أو كانت الوصية لوارث، فموقوف على إجازة الورثة بعد الوفاة باتفاق وطيب نفس.</p>
      </div>

      <div class="p-sec"><strong>٣) الكفّارات والعبادات</strong>
        ${listLines(d.kaffars, (r, i) => `<p>${ar(i + 1)}) ${esc(r.a)} — العدد: ${esc(r.b)} — القدر أو المستحق: ${esc(r.c)}</p>`)}
        ${line("ملاحظات", d.wWorshipNotes)}
      </div>

      <div class="p-sec"><strong>٤) التنفيذ والوكيل</strong>
        ${line("الوكيل المُكفَّل بالتنفيذ", d.wAgent)}
        ${line("صفته", d.wAgentRel)}
        ${line("وسيلة التواصل", d.wAgentContact)}
        ${line("الوكيل البديل", d.wAgentBackup)}
        <p>على الوكيل أداء الحقوق الثابتة، وردّ الأمانات، وتنفيذ الوصايا في حدودها، ثم قسمة الباقي على الورثة، مع الإشهاد على كل دفع وتقديم حساب ختامي.</p>
      </div>

      <div class="p-sec"><strong>٥) التوثيق والشهود</strong>
        ${line("الشاهد الأول", d.wWitness1)}
        ${line("الشاهد الثاني", d.wWitness2)}
        ${line("مكان التوثيق", d.wNotary)}
        ${line("رقم الوثيقة", d.wDocNo)}
      </div>

      <div class="p-note"><strong>تنبيه:</strong> هذا نموذج استرشادي تعليمي، وليس فتوى ولا صكّاً رسمياً. يُراجع من عالم ثقة من أهل المذهب الإباضي، ويُوثَّق وفق الإجراءات القانونية المعتمدة محلياً. والله تعالى أعلم.</div>
      <div class="p-sign"><div>توقيع المُوصي</div><div>توقيع الوكيل</div><div>توقيع الشاهد الأول</div><div>توقيع الشاهد الثاني</div></div>`;
  }

  function plainDocument() {
    const d = state;
    const L = [];
    L.push("بسم الله الرحمن الرحيم");
    L.push("وصيّة شرعية");
    L.push("المُوصي: " + (d.wName || "........"), "المكان: " + (d.wCity || "........"), "التاريخ: " + (d.wDate || "........"), "");
    L.push("أنا " + (d.wName || "المُوصي") + "، " + d.wCapacity + ". أوصي بعد وفاتي بالعمل بما يلي:");
    L.push("", "١) التركة وحقوق الله والعباد");
    d.debts.forEach((r, i) => L.push(`${i + 1}) ${r.a} — ${r.b} — ${r.c}`));
    if (d.wDeposits) L.push("أمانات وودائع: " + d.wDeposits);
    L.push("", "٢) الوصايا من الثلث لغير الورثة");
    d.wills.forEach((r, i) => L.push(`${i + 1}) إلى ${r.a} — ${r.b} — ${r.c}`));
    L.push("ما زاد على الثلث أو كان لوارث فموقوف على إجازة الورثة بعد الوفاة.");
    L.push("", "٣) الكفّارات والعبادات");
    d.kaffars.forEach((r, i) => L.push(`${i + 1}) ${r.a} — العدد: ${r.b} — ${r.c}`));
    if (d.wWorshipNotes) L.push("ملاحظات: " + d.wWorshipNotes);
    L.push("", "٤) التنفيذ والوكيل");
    ["الوكيل: " + d.wAgent, "صفته: " + d.wAgentRel, "التواصل: " + d.wAgentContact, "البديل: " + d.wAgentBackup].forEach((x) => { if (x.split(": ")[1]) L.push(x); });
    L.push("", "٥) التوثيق والشهود");
    ["الشاهد الأول: " + d.wWitness1, "الشاهد الثاني: " + d.wWitness2, "مكان التوثيق: " + d.wNotary, "رقم الوثيقة: " + d.wDocNo].forEach((x) => { if (x.split(": ")[1]) L.push(x); });
    L.push("", "تنبيه: نموذج استرشادي تعليمي، ليس فتوى ولا صكّاً رسمياً؛ يُراجع من عالم ثقة من أهل المذهب الإباضي ويُوثَّق قانوناً. والله تعالى أعلم.");
    return L.join("\n");
  }

  function downloadFile(name, content, type) {
    const blob = new Blob([content], { type: type || "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  $("#printWill").addEventListener("click", () => { showStep(7); printCurrent(); });
  $("#downloadWill").addEventListener("click", () => {
    downloadFile("wasaya-" + (state.wDate || "will") + ".txt", plainDocument());
    toast("تم تحميل نسخة نصية من الوصية");
  });
  $("#copyWill").addEventListener("click", async () => {
    const text = plainDocument();
    try {
      await navigator.clipboard.writeText(text);
      toast("نُسخ نص الوصية");
    } catch (e) {
      const ta = document.createElement("textarea");
      ta.value = text; document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); toast("نُسخ نص الوصية"); } catch (err) { toast("تعذّر النسخ — استخدم التحميل"); }
      ta.remove();
    }
  });
  $("#exportJson").addEventListener("click", () => {
    downloadFile("wasaya-backup.json", JSON.stringify(state, null, 2), "application/json;charset=utf-8");
    toast("تم حفظ نسخة احتياطية");
  });
  $("#importJson").addEventListener("click", () => $("#importFile").click());
  $("#importFile").addEventListener("change", (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        state = Object.assign(emptyWill(), data);
        ["debts", "wills", "kaffars"].forEach((k) => { if (!Array.isArray(state[k])) state[k] = []; });
        saveWill();
        syncFieldsFromState();
        ["debts", "wills", "kaffars"].forEach(renderRows);
        updateDebtCalc();
        showStep(7);
        toast("تم استيراد الوصية بنجاح");
      } catch (err) { toast("الملف غير صالح — استخدم نسخة JSON من التطبيق"); }
    };
    reader.readAsText(file);
    e.target.value = "";
  });

  $("#demoFill").addEventListener("click", () => {
    state = Object.assign(emptyWill(), JSON.parse(JSON.stringify(DEMO_WILL)));
    saveWill();
    syncFieldsFromState();
    ["debts", "wills", "kaffars"].forEach(renderRows);
    updateDebtCalc();
    showStep(7);
    toast("تم ملء النموذج بمثال توضيحي — عدّله بما يناسبك");
  });
  $("#resetWill").addEventListener("click", () => {
    if (!window.confirm("سيُحذف كل ما أدخلته من الوصية على هذا الجهاز. هل تتابع؟")) return;
    state = emptyWill();
    saveWill();
    syncFieldsFromState();
    ["debts", "wills", "kaffars"].forEach(renderRows);
    updateDebtCalc();
    showStep(1);
    toast("تم إعادة ضبط النموذج");
  });

  syncFieldsFromState();
  ["debts", "wills", "kaffars"].forEach(renderRows);
  updateDebtCalc();
  showStep(1);

  /* ================= الاختبار ================= */
  function renderQuiz() {
    $("#quizList").innerHTML = QUIZ.map((item, qi) => `
      <article class="question-card" data-q="${qi}">
        <h3><span class="q-num">${ar(qi + 1)}</span>${esc(item.q)}</h3>
        <div class="options">
          ${item.o.map((opt, oi) => `<label class="option" data-opt="${oi}"><input type="radio" name="q${qi}" value="${oi}"><span>${esc(opt)}</span></label>`).join("")}
        </div>
        <div class="explanation" hidden>${esc(item.e)}</div>
      </article>`).join("");
  }
  function updateBest() {
    const best = store.get(KEYS.best, null);
    $("#bestScore").textContent = best === null ? "—" : ar(best) + " / " + ar(QUIZ.length);
  }
  $("#submitQuiz").addEventListener("click", () => {
    let score = 0;
    let answered = 0;
    QUIZ.forEach((item, qi) => {
      const card = $('.question-card[data-q="' + qi + '"]');
      const chosen = $('input[name="q' + qi + '"]:checked', card);
      const opts = $$(".option", card);
      const expl = $(".explanation", card);
      opts.forEach((o, oi) => {
        o.classList.remove("correct", "wrong");
        if (chosen && oi === item.c) o.classList.add("correct");
        if (chosen && oi === Number(chosen.value) && Number(chosen.value) !== item.c) o.classList.add("wrong");
      });
      expl.hidden = !chosen;
      if (chosen) { answered++; if (Number(chosen.value) === item.c) score++; }
    });
    if (!answered) { toast("أجب عن سؤال واحد على الأقل"); return; }
    const best = store.get(KEYS.best, null);
    if (best === null || score > best) store.set(KEYS.best, score);
    updateBest();
    const result = $("#quizResult");
    result.hidden = false;
    const pct = Math.round(score / QUIZ.length * 100);
    result.innerHTML = `<strong>${ar(score)} / ${ar(QUIZ.length)}</strong><p>نسبتك ${ar(pct)}٪ — ${pct >= 80 ? "ممتاز، فهمت المحاور جيداً" : pct >= 50 ? "جيد، راجع التفسيرات أسفل الأسئلة" : "راجع المحاور ثم أعد المحاولة"} المادة تعليمية وليست فتوى.</p>`;
    result.scrollIntoView({ behavior: "smooth", block: "center" });
  });
  $("#resetQuiz").addEventListener("click", () => {
    $$("#quizList input[type=radio]").forEach((r) => { r.checked = false; });
    $$("#quizList .option").forEach((o) => o.classList.remove("correct", "wrong"));
    $$("#quizList .explanation").forEach((e) => { e.hidden = true; });
    $("#quizResult").hidden = true;
    toast("أُعيد ضبط الاختبار — بالتوفيق");
  });
  renderQuiz();
  updateBest();

  /* ================= المعجم ================= */
  function renderGlossary(filter) {
    const q = (filter || "").trim();
    const matches = GLOSSARY.filter(([term, def]) => !q || term.includes(q) || def.includes(q));
    $("#glossaryList").innerHTML = matches.length
      ? matches.map(([term, def]) => `<article class="gloss-item"><strong>${esc(term)}</strong><p>${esc(def)}</p></article>`).join("")
      : '<p class="tiny">لا توجد نتائج مطابقة — جرّب كلمة أخرى.</p>';
  }
  $("#glossarySearch").addEventListener("input", (e) => renderGlossary(e.target.value));
  renderGlossary("");

  /* =================خدمة التطبيق دون إنترنت ================= */
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").catch(() => { /* لا يؤثر على التشغيل */ });
    });
  }

  const fromQuery = new URLSearchParams(location.search).get("go");
  const initial = fromQuery || store.get(KEYS.page, "home");
  go($("#" + initial) ? initial : "home");
})();
