"use strict";

/* Works data is injected by Jekyll into window.WORKS_DATA on the top page. */
var WORKS = window.WORKS_DATA || [];

var CATEGORIES = [
  { key: "all", label: "ALL" },
  { key: "fanart", label: "FAN ART" },
  { key: "commission", label: "COMMISSION" },
  { key: "works", label: "WORKS" },
  { key: "original", label: "ORIGINAL" }
];
var CAT_LABEL = { fanart: "FAN ART", commission: "COMMISSION", works: "WORKS", original: "ORIGINAL" };

function track(name, params) {
  if (typeof window.trackEvent === "function") window.trackEvent(name, params || {});
}

var arrowSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17L17 7M9 7h8v8"/></svg>';

/* ================= Slideshow ================= */
var slides = Array.prototype.slice.call(document.querySelectorAll(".hero-slide"));
var dotsWrap = document.getElementById("heroDots");
var heroCount = document.getElementById("heroCount");
var toggleBtn = document.getElementById("heroToggle");
var toggleIcon = document.getElementById("heroToggleIcon");
var scrollHint = document.querySelector(".hero-scroll");
if (scrollHint) {
  var onScrollHint = function () {
    scrollHint.classList.toggle("is-hidden", window.scrollY > 40);
  };
  window.addEventListener("scroll", onScrollHint, { passive: true });
  onScrollHint();
}
var ICON_PAUSE = '<rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/>';
var ICON_PLAY = '<path d="M8 5.5v13l11-6.5z"/>';
var current = 0, timer = null, DELAY = 5500;
var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
var playing = !reduceMotion;

if (slides.length && dotsWrap) {
  slides.forEach(function (_, i) {
    var d = document.createElement("button");
    d.type = "button";
    d.className = "hero-dot" + (i === 0 ? " is-active" : "");
    d.setAttribute("role", "tab");
    d.setAttribute("aria-label", "スライド " + (i + 1) + " を表示");
    d.addEventListener("click", function () { goTo(i); restart(); });
    dotsWrap.appendChild(d);
  });
}
var dots = dotsWrap ? Array.prototype.slice.call(dotsWrap.children) : [];

function goTo(i) {
  if (!slides.length) return;
  current = (i + slides.length) % slides.length;
  slides.forEach(function (s, j) { s.classList.toggle("is-active", j === current); });
  dots.forEach(function (d, j) { d.classList.toggle("is-active", j === current); });
  if (heroCount) heroCount.textContent = (current + 1) + " / " + slides.length;
  var w = WORKS.filter(function (x) { return x.featured; })[current];
  if (w) track("hero_slide_view", { work_id: w.id, work_title: w.title, work_category: w.catLabel });
}
function stopTimer() { if (timer) { clearInterval(timer); timer = null; } }
function startTimer() {
  stopTimer();
  if (playing && slides.length > 1) {
    timer = setInterval(function () { goTo(current + 1); }, DELAY);
  }
}
function restart() { startTimer(); }
function setPlaying(p) {
  playing = p;
  if (toggleIcon) toggleIcon.innerHTML = playing ? ICON_PAUSE : ICON_PLAY;
  if (toggleBtn) {
    toggleBtn.setAttribute("aria-label", playing ? "自動再生を停止" : "自動再生を開始");
    toggleBtn.setAttribute("aria-pressed", playing ? "false" : "true");
  }
  startTimer();
}
var heroPrev = document.getElementById("heroPrev");
var heroNext = document.getElementById("heroNext");
if (heroPrev) heroPrev.addEventListener("click", function () { goTo(current - 1); restart(); });
if (heroNext) heroNext.addEventListener("click", function () { goTo(current + 1); restart(); });
if (toggleBtn) toggleBtn.addEventListener("click", function () { setPlaying(!playing); });
var heroEl = document.getElementById("hero");
if (heroEl) {
  /* マウスホバーでは一時停止しない（SEGAさんの要望）。キーボード操作時のみ配慮して止める */
  heroEl.addEventListener("focusin", stopTimer);
  heroEl.addEventListener("focusout", startTimer);
}
if (slides.length) { goTo(0); setPlaying(playing); }

/* ================= Category tabs + gallery ================= */
var tabsEl = document.getElementById("tabs");
var gridEl = document.getElementById("grid");
var emptyMsg = document.getElementById("emptyMsg");
var galleryTitle = document.getElementById("galleryTitle");
var galleryCount = document.getElementById("galleryCount");
var activeCat = "all";
var visibleWorks = WORKS.slice();

function countFor(key) {
  return key === "all" ? WORKS.length : WORKS.filter(function (w) { return w.cat === key; }).length;
}
if (tabsEl) {
  /* 作品が0件のカテゴリーはタブ自体を表示しない */
  CATEGORIES.forEach(function (c) {
    if (countFor(c.key) === 0) return;
    var li = document.createElement("li");
    var b = document.createElement("button");
    b.type = "button";
    b.className = "tab";
    b.setAttribute("role", "tab");
    b.dataset.cat = c.key;
    b.setAttribute("aria-selected", c.key === "all" ? "true" : "false");
    b.innerHTML = c.label + '<span class="cnt">' + countFor(c.key) + "</span>";
    b.addEventListener("click", function () { selectCategory(c.key); });
    li.appendChild(b);
    tabsEl.appendChild(li);
  });
}

/* グリッドの行またぎ（masonry）を、画像の原寸比率から計算して決める。
   実測に頼ると、読み込み途中の高さで計算してしまうことがあるため使わない。 */
function sizeGridCard(card) {
  var img = card.querySelector("img");
  if (!img || !img.naturalWidth || !img.naturalHeight) return;
  var style = window.getComputedStyle(gridEl);
  var cols = style.getPropertyValue("grid-template-columns").split(" ").length;
  var colGap = parseFloat(style.getPropertyValue("column-gap")) || 0;
  var rowGap = parseFloat(style.getPropertyValue("row-gap")) || 0;
  var rowHeight = parseFloat(style.getPropertyValue("grid-auto-rows")) || 10;
  var colW = (gridEl.clientWidth - (cols - 1) * colGap) / cols;
  var w = card.classList.contains("card--wide") ? colW * 2 + colGap : colW;
  var imgH = w * (img.naturalHeight / img.naturalWidth);
  var cap = card.querySelector("figcaption");
  var capH = cap ? cap.offsetHeight : 0;
  var span = Math.max(1, Math.ceil((imgH + capH + rowGap) / (rowHeight + rowGap)));
  card.style.gridRowEnd = "span " + span;
}
function sizeAllGridCards() {
  if (!gridEl) return;
  Array.prototype.forEach.call(gridEl.children, function (c) {
    if (c.classList && c.classList.contains("card")) sizeGridCard(c);
  });
}
var gridResizeTimer = null;
window.addEventListener("resize", function () {
  if (gridResizeTimer) clearTimeout(gridResizeTimer);
  gridResizeTimer = setTimeout(sizeAllGridCards, 150);
});
window.addEventListener("load", function () { sizeAllGridCards(); });

function renderGallery() {
  if (!gridEl) return;
  visibleWorks = activeCat === "all" ? WORKS.slice() : WORKS.filter(function (w) { return w.cat === activeCat; });
  gridEl.innerHTML = "";
  visibleWorks.forEach(function (w, idx) {
    var card = document.createElement("button");
    card.type = "button";
    card.className = "card";
    card.style.animationDelay = Math.min(idx * 40, 320) + "ms";
    card.setAttribute("aria-label", w.title + " を拡大表示");
    var metaParts = [];
    var catText = CAT_LABEL[w.cat] || w.catLabel;
    if (catText) metaParts.push(catText);
    if (w.year) metaParts.push(w.year);
    card.innerHTML =
      '<figure><span class="thumb"><img src="' + w.thumb + '" alt="' + w.title + '" loading="lazy" /></span>' +
      '<figcaption><span class="c-title">' + w.title + "</span>" +
      (metaParts.length ? '<span class="c-meta">' + metaParts.join(" — ") + "</span>" : "") +
      (w.detailUrl ? '<span class="c-detail">詳細ページあり</span>' : "") +
      "</figcaption></figure>";
    card.addEventListener("click", function () { openModal(idx); });
    gridEl.appendChild(card);
    var cardImg = card.querySelector("img");
    var onCardImg = function () {
      if (cardImg.naturalWidth > cardImg.naturalHeight) card.classList.add("card--wide");
      sizeAllGridCards();
    };
    if (cardImg.complete && cardImg.naturalWidth > 0) onCardImg();
    else cardImg.addEventListener("load", onCardImg);
  });
  sizeAllGridCards();
  if (emptyMsg) emptyMsg.hidden = visibleWorks.length > 0;
  var label = activeCat === "all" ? "ALL WORKS" : CAT_LABEL[activeCat];
  if (galleryTitle) galleryTitle.textContent = activeCat === "all" ? "ALL" : CAT_LABEL[activeCat];
  if (galleryCount) galleryCount.textContent = label + " · " + visibleWorks.length + " ITEMS";
}

function selectCategory(key) {
  activeCat = key;
  Array.prototype.forEach.call(tabsEl.querySelectorAll(".tab"), function (t) {
    t.setAttribute("aria-selected", t.dataset.cat === key ? "true" : "false");
  });
  track("category_select", { category: CAT_LABEL[key] || key });
  renderGallery();
  if (window.matchMedia("(min-width: 1024px)").matches) {
    var layoutTop = document.getElementById("layout").offsetTop;
    if (window.scrollY > layoutTop) window.scrollTo(0, layoutTop);
  }
}
if (gridEl) renderGallery();

/* ================= Modal ================= */
var modal = document.getElementById("modal");
var modalImg = document.getElementById("modalImg");
var modalCat = document.getElementById("modalCat");
var modalTitle = document.getElementById("modalTitle");
var modalYear = document.getElementById("modalYear");
var modalDesc = document.getElementById("modalDesc");
var modalDetailBtn = document.getElementById("modalDetailBtn");
var modalCounter = document.getElementById("modalCounter");
var modalIndex = 0;
var lastFocus = null;
var pageScrollY = 0;

function fillModal() {
  var w = visibleWorks[modalIndex];
  if (!w) return;
  modalImg.src = w.img;
  modalImg.alt = w.title;
  modalCat.textContent = CAT_LABEL[w.cat] || w.catLabel || "";
  modalTitle.textContent = w.title;
  modalYear.textContent = w.year || "";
  modalDesc.textContent = w.desc || "";
  /* 詳細ページが設定されている作品だけボタンを出す */
  if (w.detailUrl) {
    modalDetailBtn.href = w.detailUrl;
    modalDetailBtn.style.display = "";
  } else {
    modalDetailBtn.style.display = "none";
    modalDetailBtn.removeAttribute("href");
  }
  modalCounter.textContent = (modalIndex + 1) + " / " + visibleWorks.length;
}
function openModal(idx) {
  if (!modal) return;
  modalIndex = idx;
  lastFocus = document.activeElement;
  fillModal();
  var w = visibleWorks[modalIndex];
  if (w) track("work_modal_open", { work_id: w.id, work_title: w.title, work_category: w.catLabel });
  modal.hidden = false;
  requestAnimationFrame(function () { modal.classList.add("is-open"); });
  document.body.classList.add("modal-open");
  pageScrollY = window.scrollY || 0;
  document.body.style.overflow = "hidden";
  document.getElementById("modalClose").focus();
}
function closeModal() {
  if (!modal) return;
  modal.classList.remove("is-open");
  modal.hidden = true;
  document.body.classList.remove("modal-open");
  document.body.style.overflow = "";
  if (window.scrollY !== pageScrollY) window.scrollTo(0, pageScrollY);
  if (lastFocus && lastFocus.focus) lastFocus.focus();
}
function stepModal(d) {
  if (!visibleWorks.length) return;
  modalIndex = (modalIndex + d + visibleWorks.length) % visibleWorks.length;
  fillModal();
  var w = visibleWorks[modalIndex];
  if (w) track("work_modal_open", { work_id: w.id, work_title: w.title, work_category: w.catLabel });
}
if (modal) {
  document.getElementById("modalClose").addEventListener("click", closeModal);
  document.getElementById("modalBackdrop").addEventListener("click", closeModal);
  document.getElementById("modalPrev").addEventListener("click", function () { stepModal(-1); });
  document.getElementById("modalNext").addEventListener("click", function () { stepModal(1); });
  document.addEventListener("keydown", function (e) {
    if (!modal.classList.contains("is-open")) return;
    if (e.key === "Escape") closeModal();
    else if (e.key === "ArrowLeft") stepModal(-1);
    else if (e.key === "ArrowRight") stepModal(1);
  });
  /* swipe on modal */
  var touchX = null;
  modal.addEventListener("touchstart", function (e) { touchX = e.changedTouches[0].clientX; }, { passive: true });
  modal.addEventListener("touchend", function (e) {
    if (touchX === null) return;
    var dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 48) stepModal(dx < 0 ? 1 : -1);
    touchX = null;
  }, { passive: true });
}
