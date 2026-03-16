const API = "";          // same origin — Flask serves both
const COLORS = {
  get accent()  { return getComputedStyle(document.documentElement).getPropertyValue('--accent').trim(); },
  get accent2() { return getComputedStyle(document.documentElement).getPropertyValue('--accent2').trim(); },
  get accent3() { return getComputedStyle(document.documentElement).getPropertyValue('--accent3').trim(); },
  get warn()    { return getComputedStyle(document.documentElement).getPropertyValue('--warn').trim(); },
  get danger()  { return getComputedStyle(document.documentElement).getPropertyValue('--danger').trim(); },
  get muted()   { return getComputedStyle(document.documentElement).getPropertyValue('--muted').trim(); },
  get grid()    { return document.documentElement.getAttribute('data-theme') === 'light' ? 'rgba(0,0,0,0.08)' : 'rgba(30,45,69,0.8)'; },
};

let charts  = {};
let activeEdu = "All";
let activeKid = "All";

// ── Boot ───────────────────────────────────────────────────────────
window.addEventListener("DOMContentLoaded", async () => {
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
    const btn = document.getElementById('theme-btn');
    if (btn) btn.textContent = '🌙 Dark Mode';
  }
  await loadInfo();
  await loadAll();
});

// ── Theme Toggle ───────────────────────────────────────────────────
function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const target = current === 'light' ? 'dark' : 'light';
  const btn = document.getElementById('theme-btn');
  if (target === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
    if (btn) btn.textContent = '🌙 Dark Mode';
  } else {
    document.documentElement.removeAttribute('data-theme');
    if (btn) btn.textContent = '☀️ Light Mode';
  }
  localStorage.setItem('theme', target);
  loadAll(); // Re-render charts
}

// ── Dataset info (sidebar + meta) ─────────────────────────────────
async function loadInfo() {
  try {
    const d = await get("/api/info");
    document.getElementById("topbar-meta").textContent =
      `${d.source} · ${d.total_rows.toLocaleString()} customers · ${d.columns} columns`;
    document.getElementById("ds-info").textContent =
      `${d.total_rows.toLocaleString()} customer records\nMirrored from UCI ML Repo`;

    // Build education filter chips dynamically
    const container = document.getElementById("edu-filters");
    container.innerHTML = `<div class="filter-chip active" onclick="setEdu(this,'All')">All</div>`;
    d.education_options.forEach(edu => {
      const chip = document.createElement("div");
      chip.className = "filter-chip";
      chip.textContent = edu;
      chip.onclick = () => setEdu(chip, edu);
      container.appendChild(chip);
    });
  } catch (e) {
    // info endpoint failed — show error
  }
}

// ── Load all charts ────────────────────────────────────────────────
async function loadAll() {
  show("loader");
  try {
    const params = buildParams();
    await Promise.all([
      loadKPIs(params),
      loadCmpBar(params),
      loadDonut(params),
      loadFunnel(params),
      loadSpend(params),
      loadEdu(),           // always full dataset
      loadIncome(params),
      loadTop(params),
    ]);
    show("dashboard");
  } catch (e) {
    console.error(e);
    if (e.message && e.message.includes("fetch")) {
      show("error-state");
    } else {
      document.getElementById("loader-text").textContent =
        "Error: " + e.message;
    }
  }
}

// ── Helpers ────────────────────────────────────────────────────────
function buildParams() {
  const p = new URLSearchParams();
  if (activeEdu !== "All") p.set("edu", activeEdu);
  if (activeKid !== "All") p.set("kid", activeKid);
  return p.toString() ? "?" + p.toString() : "";
}

async function get(path) {
  const res = await fetch(API + path);
  if (!res.ok) throw new Error(`API error ${res.status} on ${path}`);
  return res.json();
}

function show(id) {
  ["loader","error-state","dashboard"].forEach(i =>
    document.getElementById(i).style.display = i === id ? (i === "dashboard" ? "block" : "flex") : "none"
  );
}

function dc(id) {
  if (charts[id]) { charts[id].destroy(); delete charts[id]; }
}

function tickCfg(size = 10) {
  return { color: COLORS.muted, font: { size } };
}
function gridCfg() {
  return { color: COLORS.grid };
}

// ── Filters ────────────────────────────────────────────────────────
function setEdu(el, val) {
  document.getElementById("edu-filters")
    .querySelectorAll(".filter-chip")
    .forEach(c => c.classList.remove("active"));
  el.classList.add("active");
  activeEdu = val;
  loadAll();
}

function setKid(el, val) {
  el.closest(".filter-group")
    .querySelectorAll(".filter-chip")
    .forEach(c => c.classList.remove("active"));
  el.classList.add("active");
  activeKid = val;
  loadAll();
}

function resetFilters() {
  activeEdu = "All";
  activeKid = "All";
  document.querySelectorAll(".filter-chip").forEach(c => c.classList.remove("active"));
  document.querySelectorAll(".filter-chip:first-child").forEach(c => c.classList.add("active"));
  loadAll();
}

// ── KPIs ───────────────────────────────────────────────────────────
async function loadKPIs(params) {
  const d = await get("/api/kpis" + params);
  document.getElementById("k-total").textContent    = d.total_customers.toLocaleString();
  document.getElementById("k-total-sub").textContent = `${d.responded} converted on last campaign`;
  document.getElementById("k-resp").textContent     = d.response_rate + "%";
  document.getElementById("k-resp-sub").textContent = `${d.responded} of ${d.total_customers} customers`;
  document.getElementById("k-income").textContent   = "€" + Math.round(d.avg_income).toLocaleString();
  document.getElementById("k-spend").textContent    = "€" + Math.round(d.avg_spend).toLocaleString();
}

// ── Campaign bar ───────────────────────────────────────────────────
async function loadCmpBar(params) {
  const d = await get("/api/campaigns" + params);
  const bgColors = [
    COLORS.accent, COLORS.accent2, COLORS.accent3,
    COLORS.warn, COLORS.danger, COLORS.accent
  ];
  dc("cmpBar");
  charts.cmpBar = new Chart(document.getElementById("cmpBar").getContext("2d"), {
    type: "bar",
    data: {
      labels: d.labels,
      datasets: [{
        label: "Acceptance %", data: d.rates,
        backgroundColor: bgColors, borderRadius: 4, borderSkipped: false
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: true,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: ctx => " " + ctx.parsed.y + "%" } }
      },
      scales: {
        x: { grid: gridCfg(), ticks: tickCfg() },
        y: { grid: gridCfg(), ticks: { ...tickCfg(), callback: v => v + "%" } }
      }
    }
  });
}

// ── Donut ──────────────────────────────────────────────────────────
async function loadDonut(params) {
  const d = await get("/api/channels" + params);
  dc("chanDonut");
  charts.chanDonut = new Chart(document.getElementById("chanDonut").getContext("2d"), {
    type: "doughnut",
    data: {
      labels: Object.keys(d),
      datasets: [{
        data: Object.values(d),
        backgroundColor: [COLORS.accent, COLORS.accent2, COLORS.accent3],
        borderWidth: 0, hoverOffset: 6
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: true, cutout: "70%",
      plugins: {
        legend: { position: "bottom", labels: { color: COLORS.muted, font: { size: 11 }, padding: 12, boxWidth: 8 } },
        tooltip: { callbacks: { label: ctx => " " + ctx.label + ": " + ctx.parsed.toLocaleString() } }
      }
    }
  });
}

// ── Funnel ─────────────────────────────────────────────────────────
async function loadFunnel(params) {
  const stages = await get("/api/funnel" + params);
  const funnelColors = [COLORS.accent, COLORS.accent2, COLORS.accent3, COLORS.warn];
  document.getElementById("funnel").innerHTML = stages.map((s, i) => `
    <div class="funnel-stage">
      <div class="funnel-label">
        <span>${s.label}</span>
        <span>${s.value.toLocaleString()} · ${s.pct}%</span>
      </div>
      <div class="funnel-bar-bg">
        <div class="funnel-bar-fill" style="width:${s.pct}%;background:${funnelColors[i]}"></div>
      </div>
    </div>
  `).join("");
}

// ── Spend bar ──────────────────────────────────────────────────────
async function loadSpend(params) {
  const d = await get("/api/spend" + params);
  const spendColors = [
    COLORS.accent, COLORS.danger, COLORS.accent3,
    COLORS.accent2, COLORS.warn, COLORS.muted
  ];
  dc("spendBar");
  charts.spendBar = new Chart(document.getElementById("spendBar").getContext("2d"), {
    type: "bar",
    data: {
      labels: Object.keys(d),
      datasets: [{
        label: "Avg (€)", data: Object.values(d),
        backgroundColor: spendColors, borderRadius: 4, borderSkipped: false
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: true, indexAxis: "y",
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: ctx => " €" + ctx.parsed.x } }
      },
      scales: {
        x: { grid: gridCfg(), ticks: { ...tickCfg(), callback: v => "€" + v } },
        y: { grid: { display: false }, ticks: tickCfg() }
      }
    }
  });
}

// ── Education response chart ───────────────────────────────────────
async function loadEdu() {
  const d = await get("/api/education");
  dc("eduChart");
  charts.eduChart = new Chart(document.getElementById("eduChart").getContext("2d"), {
    type: "bar",
    data: {
      labels: d.labels,
      datasets: [{
        label: "Response %", data: d.rates,
        backgroundColor: COLORS.accent2, borderRadius: 4, borderSkipped: false
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: true,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: ctx => " " + ctx.parsed.y + "% (" + d.totals[ctx.dataIndex] + " customers)" } }
      },
      scales: {
        x: { grid: { display: false }, ticks: { ...tickCfg(9), maxRotation: 25 } },
        y: { grid: gridCfg(), ticks: { ...tickCfg(9), callback: v => v + "%" } }
      }
    }
  });
}

// ── Income distribution ────────────────────────────────────────────
async function loadIncome(params) {
  const d = await get("/api/income" + params);
  dc("incomeChart");
  charts.incomeChart = new Chart(document.getElementById("incomeChart").getContext("2d"), {
    type: "bar",
    data: {
      labels: d.labels,
      datasets: [{
        label: "Customers", data: d.counts,
        backgroundColor: COLORS.accent3, borderRadius: 4, borderSkipped: false
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: true,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: tickCfg(9) },
        y: { grid: gridCfg(), ticks: tickCfg(9) }
      }
    }
  });
}

// ── Top 10 spenders ────────────────────────────────────────────────
async function loadTop(params) {
  const d = await get("/api/top-spenders" + params);
  dc("topSpend");
  charts.topSpend = new Chart(document.getElementById("topSpend").getContext("2d"), {
    type: "bar",
    data: {
      labels: d.map(r => "ID " + r.ID),
      datasets: [{
        label: "Total Spend (€)", data: d.map(r => r.TotalSpend),
        backgroundColor: COLORS.warn, borderRadius: 4, borderSkipped: false
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: true, indexAxis: "y",
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: ctx => " €" + ctx.parsed.x.toLocaleString() } }
      },
      scales: {
        x: { grid: gridCfg(), ticks: { ...tickCfg(9), callback: v => "€" + v } },
        y: { grid: { display: false }, ticks: tickCfg(8) }
      }
    }
  });
}

// ── Export ─────────────────────────────────────────────────────────
function exportCSV() {
  const params = buildParams();
  window.location.href = "/api/export" + params;
}
