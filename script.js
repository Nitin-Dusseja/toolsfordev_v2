let categories = [];
let allItems = [];
const results = document.getElementById("results");
const nav = document.getElementById("categoryNav");
const search = document.getElementById("searchInput");
const sidebar = document.getElementById("sidebar");

let activeCategory = "all";
let activeGroup = null;
let favorites = JSON.parse(localStorage.getItem("toolsfordev-favorites") || "[]");
let view = localStorage.getItem("toolsfordev-view") || "grid";

const iconMap = {
  "Design & UI Assets": "🎨",
  "Frontend Components & Styling": "🧩",
  "Animations & Motion Graphics": "✨",
  "Development & Coding Tools": "🛠️",
  "AI Tools & Generators": "🤖",
  "Design Editors & Multimedia Tools": "🖼️",
  "Document & Writing Utilities": "📄",
  "Privacy, Security & File Sharing": "🛡️",
  "Learning, Education & Career": "🎓",
  "Data, Analytics & Web Monitoring": "📊",
  "Design Inspiration & Discovery": "💡",
  "Productivity, Lifestyle & Miscellaneous": "⚡"
};

async function init() {
  try {
    const response = await fetch("data.json");
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    categories = await response.json();
    
    allItems = categories.flatMap(c => 
      (c.groups || []).flatMap(g => 
        (g.items || []).map(i => ({...i, category: c.title, group: g.title}))
      )
    );
    
    document.getElementById("resourceCount").textContent = allItems.length;
    document.getElementById("categoryCount").textContent = categories.length;

    makeNav();
    render();
  } catch (err) {
    console.error("Failed to load data:", err);
    if (results) {
      results.innerHTML = `<p style="color:var(--muted);padding:20px;">Failed to load resources from <strong>data.json</strong>. Ensure the file exists in the same root directory and you are serving the page via a local server (e.g., Live Server).</p>`;
    }
  }
}

function getFaviconUrl(url) {
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
  } catch (e) {
    return "";
  }
}

function makeNav() {
  if (!nav) return;
  
  nav.innerHTML = `
    <button class="nav-item active" data-cat="all">
      <span class="nav-icon">⌘</span>
      <span class="nav-text">All resources</span>
      <small>${allItems.length}</small>
    </button>
  `;

  categories.forEach(c => {
    const groups = c.groups || [];
    const totalCount = groups.reduce((n, g) => n + (g.items ? g.items.length : 0), 0);
    const catGroup = document.createElement("div");
    catGroup.className = "nav-group";

    const catBtn = document.createElement("button");
    catBtn.className = "nav-item has-sub";
    catBtn.dataset.cat = c.title;
    catBtn.innerHTML = `
      <span class="nav-icon">${iconMap[c.title] || "•"}</span>
      <span class="nav-text">${escapeHtml(c.title)}</span>
      <small>${totalCount}</small>
      <span class="arrow-icon">›</span>
    `;

    const subMenu = document.createElement("div");
    subMenu.className = "sub-menu";

    groups.forEach(g => {
      const items = g.items || [];
      const subBtn = document.createElement("button");
      subBtn.className = "sub-item";
      subBtn.dataset.cat = c.title;
      subBtn.dataset.group = g.title;
      subBtn.innerHTML = `
        <span class="sub-text">${escapeHtml(g.title)}</span>
        <small>${items.length}</small>
      `;

      subBtn.onclick = (e) => {
        e.stopPropagation();
        activeCategory = c.title;
        activeGroup = g.title;
        updateActiveNavState(subBtn);
        render();
        if (sidebar) sidebar.classList.remove("open");
      };

      subMenu.appendChild(subBtn);
    });

    catBtn.onclick = () => {
      const isOpen = catGroup.classList.contains("open");
      document.querySelectorAll(".nav-group.open").forEach(g => {
        if (g !== catGroup) g.classList.remove("open");
      });

      catGroup.classList.toggle("open", !isOpen);
      activeCategory = c.title;
      activeGroup = null;
      updateActiveNavState(catBtn);
      render();
    };

    catGroup.appendChild(catBtn);
    catGroup.appendChild(subMenu);
    nav.appendChild(catGroup);
  });

  const allBtn = nav.querySelector('[data-cat="all"]');
  if (allBtn) {
    allBtn.onclick = () => {
      activeCategory = "all";
      activeGroup = null;
      document.querySelectorAll(".nav-group.open").forEach(g => g.classList.remove("open"));
      updateActiveNavState(allBtn);
      render();
      if (sidebar) sidebar.classList.remove("open");
    };
  }
}

function updateActiveNavState(targetBtn) {
  nav.querySelectorAll(".nav-item, .sub-item").forEach(x => x.classList.remove("active"));
  targetBtn.classList.add("active");
  if (targetBtn.classList.contains("sub-item")) {
    const parentGroup = targetBtn.closest(".nav-group");
    if (parentGroup) {
      const parentNavBtn = parentGroup.querySelector(".nav-item");
      if (parentNavBtn) parentNavBtn.classList.add("active");
    }
  }
}

function render() {
  if (!results) return;
  
  const q = search ? search.value.trim().toLowerCase() : "";
  const isFavMode = activeCategory === "__favorites";

  const filtered = allItems.filter(i => {
    const catOk = isFavMode 
      ? favorites.includes(i.url) 
      : (activeCategory === "all" || i.category === activeCategory) &&
        (!activeGroup || i.group === activeGroup);
        
    const text = `${i.name || ""} ${i.note || ""} ${i.category || ""} ${i.group || ""}`.toLowerCase();
    return catOk && (!q || text.includes(q));
  });

  results.className = "resource-grid " + (view === "list" ? "list-view" : "");
  results.innerHTML = filtered.map((i, idx) => card(i, idx)).join("");
  
  let titleText = "Developer resources";
  if (q) {
    titleText = `Results for “${search.value}”`;
  } else if (isFavMode) {
    titleText = "Your favorites";
  } else if (activeCategory !== "all") {
    titleText = activeGroup ? `${activeCategory} › ${activeGroup}` : activeCategory;
  }
  
  const titleEl = document.getElementById("resultsTitle");
  if (titleEl) titleEl.textContent = titleText;
  
  const emptyEl = document.getElementById("emptyState");
  if (emptyEl) emptyEl.hidden = filtered.length !== 0;
  
  results.hidden = filtered.length === 0;

  results.querySelectorAll(".favorite").forEach(btn => {
    btn.onclick = e => {
      e.preventDefault(); 
      e.stopPropagation();
      toggleFavorite(btn.dataset.url);
    };
  });
  
  const favCountEl = document.getElementById("favCount");
  if (favCountEl) favCountEl.textContent = favorites.length;
}

function card(i, idx) {
  const fav = favorites.includes(i.url);
  const faviconUrl = getFaviconUrl(i.url);

  return `<article class="card" style="--delay:${Math.min(idx, 12) * 25}ms">
    <div class="card-top">
      <div class="card-icon">
        <img src="${faviconUrl}" alt="${escapeAttr(i.name)} favicon" loading="lazy" onError="this.style.display='none'; this.nextElementSibling.style.display='inline';" />
        <span style="display:none;">•</span>
      </div>
      <button class="favorite ${fav ? "saved" : ""}" data-url="${escapeAttr(i.url)}" aria-label="${fav ? "Remove from favorites" : "Add to favorites"}">${fav ? "★" : "☆"}</button>
    </div>
    <a class="card-link" href="${escapeAttr(i.url)}" target="_blank" rel="noopener noreferrer">
      <h3>${escapeHtml(i.name || "")}</h3>
      <p>${escapeHtml(i.note || i.group || "Developer resource")}</p>
      <span class="domain">${getDomain(i.url)} ↗</span>
    </a>
  </article>`;
}

function toggleFavorite(url) {
  favorites = favorites.includes(url) ? favorites.filter(x => x !== url) : [...favorites, url];
  localStorage.setItem("toolsfordev-favorites", JSON.stringify(favorites));
  render();
}

function getDomain(url) { 
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url || ""; } 
}

function escapeHtml(s) { 
  return String(s || "").replace(/[&<>"']/g, m => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m])); 
}

function escapeAttr(s) { 
  return escapeHtml(s); 
}

const favFilterBtn = document.getElementById("favoritesFilter");
if (favFilterBtn) {
  favFilterBtn.onclick = () => {
    activeCategory = "__favorites";
    activeGroup = null;
    document.querySelectorAll(".nav-group.open").forEach(g => g.classList.remove("open"));
    nav.querySelectorAll(".nav-item, .sub-item").forEach(x => x.classList.remove("active"));
    render(); 
    if (sidebar) sidebar.classList.remove("open");
  };
}

const allFilterBtn = document.getElementById("allFilter");
if (allFilterBtn) {
  allFilterBtn.onclick = () => {
    activeCategory = "all"; 
    activeGroup = null;
    document.querySelectorAll(".nav-group.open").forEach(g => g.classList.remove("open"));
    const allBtn = nav.querySelector('[data-cat="all"]');
    if (allBtn) updateActiveNavState(allBtn);
    render();
  };
}

const clearSearchBtn = document.getElementById("clearSearch");
if (clearSearchBtn) {
  clearSearchBtn.onclick = () => { 
    if (search) {
      search.value = ""; 
      render(); 
      search.focus(); 
    }
  };
}

if (search) search.addEventListener("input", render);

document.querySelectorAll(".view-btn").forEach(btn => btn.onclick = () => {
  view = btn.dataset.view; 
  localStorage.setItem("toolsfordev-view", view);
  document.querySelectorAll(".view-btn").forEach(x => x.classList.toggle("active", x === btn)); 
  render();
});

const defaultViewBtn = document.querySelector(`.view-btn[data-view="${view}"]`);
if (defaultViewBtn) defaultViewBtn.classList.add("active");

const themeToggleBtn = document.getElementById("themeToggle");
if (themeToggleBtn) {
  themeToggleBtn.onclick = () => {
    document.body.classList.toggle("light");
    localStorage.setItem("toolsfordev-theme", document.body.classList.contains("light") ? "light" : "dark");
  };
}

if (localStorage.getItem("toolsfordev-theme") === "light") document.body.classList.add("light");

const menuToggleBtn = document.getElementById("menuToggle");
if (menuToggleBtn && sidebar) {
  menuToggleBtn.onclick = () => sidebar.classList.toggle("open");
}

document.addEventListener("keydown", e => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { 
    e.preventDefault(); 
    if (search) search.focus(); 
  }
  if (e.key === "Escape") { 
    if (search) {
      search.value = ""; 
      render(); 
      search.blur(); 
    }
  }
});

init();
