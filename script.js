let categories = [];
let allItems = [];
const results = document.getElementById("results");
const nav = document.getElementById("categoryNav");
const search = document.getElementById("searchInput");
const sidebar = document.getElementById("sidebar");
let activeCategory = "all";
let favorites = JSON.parse(localStorage.getItem("toolsfordev-favorites") || "[]");
let view = localStorage.getItem("toolsfordev-view") || "grid";

const iconMap = {
  "Background":"✦","Icons":"◈","Fonts":"Aa","Animations":"✺","Github - repo":"◉",
  "Illustration":"◇","Emojis & Cursor":"☺","Components":"▦","Bounties":"◆",
  "Hackathons":"⚡","helping to Learn":"⌘","Placement Resources":"↗",
  "hacking Resources":"⌁","Tools":"⚙","Inspiration Websites":"◎"
};

async function init() {
  try {
    const response = await fetch("data.json");
    categories = await response.json();
    allItems = categories.flatMap(c => c.groups.flatMap(g => g.items.map(i => ({...i, category:c.title, group:g.title}))));
    
    document.getElementById("resourceCount").textContent = allItems.length;
    document.getElementById("categoryCount").textContent = categories.length;

    makeNav();
    render();
  } catch (err) {
    console.error("Failed to load data.json:", err);
    results.innerHTML = `<p style="color:var(--muted);padding:20px;">Failed to load resources. Make sure data.json is present and hosted on a web server.</p>`;
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
  nav.innerHTML = '<button class="nav-item active" data-cat="all"><span>⌘</span>All resources<small>'+allItems.length+'</small></button>';
  categories.forEach(c => {
    const count = c.groups.reduce((n,g)=>n+g.items.length,0);
    nav.insertAdjacentHTML("beforeend",
      `<button class="nav-item" data-cat="${escapeAttr(c.title)}"><span>${iconMap[c.title]||"•"}</span>${escapeHtml(c.title)}<small>${count}</small></button>`);
  });
  nav.querySelectorAll(".nav-item").forEach(btn => btn.onclick = () => {
    activeCategory = btn.dataset.cat; 
    nav.querySelectorAll(".nav-item").forEach(x=>x.classList.remove("active"));
    btn.classList.add("active");
    render();
    sidebar.classList.remove("open");
  });
}

function render() {
  const q = search.value.trim().toLowerCase();
  const isFavMode = activeCategory === "__favorites";
  const filtered = allItems.filter(i => {
    const catOk = isFavMode ? favorites.includes(i.url) : (activeCategory === "all" || i.category === activeCategory);
    const text = `${i.name} ${i.note} ${i.category} ${i.group}`.toLowerCase();
    return catOk && (!q || text.includes(q));
  });
  results.className = "resource-grid " + (view === "list" ? "list-view" : "");
  results.innerHTML = filtered.map((i, idx) => card(i, idx)).join("");
  document.getElementById("resultsTitle").textContent = q ? `Results for “${search.value}”` : (isFavMode ? "Your favorites" : activeCategory === "all" ? "Developer resources" : activeCategory);
  document.getElementById("emptyState").hidden = filtered.length !== 0;
  results.hidden = filtered.length === 0;
  results.querySelectorAll(".favorite").forEach(btn => btn.onclick = e => {
    e.preventDefault(); e.stopPropagation();
    toggleFavorite(btn.dataset.url);
  });
  document.getElementById("favCount").textContent = favorites.length;
}

function card(i, idx) {
  const fav = favorites.includes(i.url);
  const faviconUrl = getFaviconUrl(i.url);
  const fallbackIcon = iconMap[i.category] || "•";

  return `<article class="card" style="--delay:${Math.min(idx,12)*25}ms">
    <div class="card-top">
      <div class="card-icon">
        <img src="${faviconUrl}" alt="${escapeAttr(i.name)} favicon" loading="lazy" onError="this.style.display='none'; this.nextElementSibling.style.display='inline';" />
        <span style="display:none;">${fallbackIcon}</span>
      </div>
      <button class="favorite ${fav?"saved":""}" data-url="${escapeAttr(i.url)}" aria-label="${fav?"Remove from favorites":"Add to favorites"}">${fav?"★":"☆"}</button>
    </div>
    <a class="card-link" href="${escapeAttr(i.url)}" target="_blank" rel="noopener noreferrer">
      <h3>${escapeHtml(i.name)}</h3>
      <p>${escapeHtml(i.note || i.group || "Developer resource")}</p>
      <span class="domain">${getDomain(i.url)} ↗</span>
    </a>
    <button class="favorite favorite-end ${fav?"saved":""}" data-url="${escapeAttr(i.url)}" aria-label="${fav?"Remove from favorites":"Add to favorites"}">${fav?"★":"☆"}</button>
  </article>`;
}

function toggleFavorite(url) {
  favorites = favorites.includes(url) ? favorites.filter(x=>x!==url) : [...favorites,url];
  localStorage.setItem("toolsfordev-favorites", JSON.stringify(favorites));
  render();
}
function getDomain(url) { try { return new URL(url).hostname.replace(/^www\./,""); } catch { return url; } }
function escapeHtml(s) { return String(s).replace(/[&<>"']/g, m => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m])); }
function escapeAttr(s) { return escapeHtml(s); }

document.getElementById("favoritesFilter").onclick = () => {
  activeCategory = "__favorites";
  nav.querySelectorAll(".nav-item").forEach(x=>x.classList.remove("active"));
  render(); sidebar.classList.remove("open");
};
document.getElementById("allFilter").onclick = () => {
  activeCategory = "all"; nav.querySelector('[data-cat="all"]').click();
};
document.getElementById("clearSearch").onclick = () => { search.value=""; render(); search.focus(); };
search.addEventListener("input", render);

document.querySelectorAll(".view-btn").forEach(btn => btn.onclick = () => {
  view = btn.dataset.view; localStorage.setItem("toolsfordev-view",view);
  document.querySelectorAll(".view-btn").forEach(x=>x.classList.toggle("active",x===btn)); render();
});
document.querySelector(`.view-btn[data-view="${view}"]`).classList.add("active");

document.getElementById("themeToggle").onclick = () => {
  document.body.classList.toggle("light");
  localStorage.setItem("toolsfordev-theme", document.body.classList.contains("light") ? "light" : "dark");
};
if(localStorage.getItem("toolsfordev-theme")==="light") document.body.classList.add("light");

document.getElementById("menuToggle").onclick = () => sidebar.classList.toggle("open");
document.addEventListener("keydown", e => {
  if((e.metaKey || e.ctrlKey) && e.key.toLowerCase()==="k") { e.preventDefault(); search.focus(); }
  if(e.key==="Escape") { search.value=""; render(); search.blur(); }
});

init();
