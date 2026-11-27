// Kussoon municipality distribution map Ver.0.1
import {PALETTE, LEVELS, DIMENSIONS, categoryNames, band, matches, compute, searchAreas} from "./model.js?v=0.1";

const $ = id => document.getElementById(id);
const SVG = "http://www.w3.org/2000/svg";
const W = 980, H = 660;
const state = {level: "city", axis: "all", value: 0, pref: "", area: "", preferredWard: "", popup: true};
const fmt = n => Number(n).toLocaleString("ja-JP");
const percent = (n, total) => total ? (n * 100 / total).toFixed(1) + "%" : "—";
const dataRoot = new URL("./data/", import.meta.url);
let index, overview, statistics, viewport;
let renderedDetail = "", selectedGeometry = null, mapSelectionOutline = null, queryResults = [];
let geometryTicket = 0, storesTicket = 0;
const layers = new Map(), paths = new Map(), geometryCache = new Map(), storesCache = new Map();

function element(tag, text, cls) {
  const el = document.createElement(tag);
  if (text != null) el.textContent = text;
  if (cls) el.className = cls;
  return el;
}

function svgEl(tag, properties) {
  const el = document.createElementNS(SVG, tag);
  for (const [key, value] of Object.entries(properties)) el.setAttribute(key, value);
  return el;
}

async function readData(file) {
  const result = await fetch(new URL(file, dataRoot));
  if (!result.ok) throw new Error(`${file} HTTP ${result.status}`);
  return result.json();
}

function cacheRead(cache, key, file) {
  if (cache.has(key)) {
    const existing = cache.get(key);
    cache.delete(key);
    cache.set(key, existing);
    return existing;
  }
  const request = readData(file).catch(error => {
    if (cache.get(key) === request) cache.delete(key);
    throw error;
  });
  cache.set(key, request);
  if (cache.size > 5) cache.delete(cache.keys().next().value);
  return request;
}

function displayLabel(code) {
  const a = index.areas[code];
  const addPref = a.kind === "special_ward" || a.kind === "map_exception";
  return addPref ? index.prefectures[a.pref] + " " + a.name : a.name;
}

function labelWithPref(code) {
  const a = index.areas[code];
  return index.prefectures[a.pref] + "・" + a.name;
}

function pathRecord(g, code) {
  return g.city[code] || g.ward[code];
}

function paintPrefecture(pref, geometry) {
  const old = layers.get(pref);
  if (old) for (const path of old.querySelectorAll(".region")) paths.delete(path.dataset.code);
  const group = svgEl("g", {"data-pref": pref});
  const records = Object.entries(geometry.ward).filter(([code]) => state.level === "ward" || !index.areas[code].parent);
  if (state.level === "city") records.push(...Object.entries(geometry.city));
  for (const [code, [d, , parts]] of records) {
    const a = index.areas[code];
    const path = svgEl("path", {d, "data-code": code, "data-parts": parts,
      class: "region " + (a.status === "eligible" ? "" : "boundary-" + a.status), role: "button", tabindex: "-1"});
    path.append(svgEl("title", {}));
    paths.set(code, path);
    group.append(path);
  }
  group.append(svgEl("path", {class: "border-layer municipal", d: geometry[state.level + "Borders"], "aria-hidden": "true"}),
               svgEl("path", {class: "border-layer outer", d: geometry.outer, "aria-hidden": "true"}));
  if (old) old.replaceWith(group);
  else $("land-layer").append(group);
  layers.set(pref, group);
}

function renderMap() {
  for (const [pref, g] of Object.entries(overview).sort(([a], [b]) => a.localeCompare(b))) {
    paintPrefecture(pref, renderedDetail === pref ? selectedGeometry : g);
  }
  updatePaint();
}

function updatePaint() {
  mapSelectionOutline?.remove();
  for (const [code, path] of paths) {
    const area = index.areas[code];
    let label = "対象外";
    if (area.status === "eligible") {
      const total = statistics.filtered.get(code) || 0;
      const b = band(total);
      path.style.fill = PALETTE[b][1];
      path.dataset.band = b;
      path.dataset.count = total;
      label = fmt(total) + "店舗";
    } else if (area.status === "unconfirmed") {
      label = "区域の所属未確認";
    }
    path.classList.toggle("selected", code === state.area);
    path.setAttribute("aria-pressed", String(code === state.area));
    const name = labelWithPref(code) + " " + label;
    path.setAttribute("aria-label", name);
    path.firstElementChild.textContent = name;
    if (code === state.area) {
      mapSelectionOutline = svgEl("path", {d: path.getAttribute("d"), class: "selection-outline", "aria-hidden": "true"});
    }
  }
  if (state.area && mapSelectionOutline) $("land-layer").append(mapSelectionOutline);
}

function fitBox([left, top, right, bottom], areaFocus = false) {
  const frac = W / H;
  const w = Math.min(W, Math.max((right - left) * 1.24, (bottom - top) * 1.3 * frac, areaFocus ? 26 : 42));
  viewport.setView({x: (left + right - w) / 2, y: (top + bottom - w / frac) / 2, w});
}

function fitPrefecture(pref) {
  if (!pref) {
    viewport.reset();
    return;
  }
  const g = renderedDetail === pref ? selectedGeometry : overview[pref];
  const candidates = Object.values(g.ward);
  const main = candidates.reduce((largest, info) => {
    const box = info[1], old = largest[1];
    return (box[2]-box[0])*(box[3]-box[1]) > (old[2]-old[0])*(old[3]-old[1]) ? info : largest;
  });
  // The overview remains pan-able to remote islands. Fit the main body of an
  // especially dispersed prefecture and let named offshore areas be searched.
  if (g.bounds[2] - g.bounds[0] > 170 || g.bounds[3] - g.bounds[1] > 150) {
    const center = [(main[1][0] + main[1][2])/2, (main[1][1] + main[1][3])/2];
    const near = candidates.map(r => r[1]).filter(b => Math.abs((b[0]+b[2])/2-center[0]) < 105
      && Math.abs((b[1]+b[3])/2-center[1]) < 93);
    fitBox([Math.min(...near.map(b => b[0])), Math.min(...near.map(b => b[1])),
            Math.max(...near.map(b => b[2])), Math.max(...near.map(b => b[3]))]);
  } else fitBox(g.bounds);
}

async function enhance(pref) {
  const ticket = ++geometryTicket;
  if (renderedDetail && renderedDetail !== pref) {
    const previous = renderedDetail;
    renderedDetail = "";
    selectedGeometry = null;
    paintPrefecture(previous, overview[previous]);
    updatePaint();
  }
  $("map-status").textContent = "";
  if (!pref || renderedDetail === pref) return;
  $("map-status").textContent = index.prefectures[pref] + "の詳細を読み込み中";
  try {
    const g = await cacheRead(geometryCache, pref, `geometry/${pref}.json`);
    if (ticket !== geometryTicket) return;
    renderedDetail = pref;
    selectedGeometry = g;
    paintPrefecture(pref, g);
    updatePaint();
    $("map-status").textContent = "";
  } catch {
    if (ticket === geometryTicket) $("map-status").textContent = "詳細形状を取得できません。全国用の形状を表示しています。";
  }
}

function findArea(code, {focus = false, scope = false, scroll = false} = {}) {
  if (!index.areas[code]) return;
  if (code === state.area && !focus) {
    closeArea();
    return;
  }
  const area = index.areas[code];
  if (scope || (state.pref && state.pref !== area.pref)) {
    state.pref = area.pref;
    $("prefecture").value = state.pref;
  }
  state.area = code;
  state.preferredWard = area.parent ? code : "";
  state.popup = true;
  document.querySelector(".store-disclosure").open = false;
  refresh();
  if (focus) {
    const g = renderedDetail === area.pref ? selectedGeometry : overview[area.pref];
    const record = pathRecord(g, code);
    if (record) fitBox(record[1], true);
  }
  void enhance(area.pref);
  if (scroll) $("map-heading").scrollIntoView({block: "start"});
}

function closeArea() {
  state.area = "";
  state.preferredWard = "";
  refresh();
}

function selectPrefecture(pref, scroll = false) {
  state.pref = pref;
  $("prefecture").value = pref;
  state.area = "";
  state.preferredWard = "";
  dismissSearch(true);
  refresh();
  fitPrefecture(pref);
  void enhance(pref);
  if (scroll) $("map-heading").scrollIntoView({block: "start"});
}

function filterName() {
  return state.axis === "all" ? "全屋号" : categoryNames(index, state.axis)[state.value];
}

function populateCategories() {
  const select = $("category");
  select.parentElement.hidden = state.axis === "all";
  select.replaceChildren();
  if (state.axis === "all") return;
  $("category-label").textContent = DIMENSIONS[state.axis];
  categoryNames(index, state.axis).forEach((name, i) => select.add(new Option(name, i)));
  select.value = state.value;
}

function updateCoverage() {
  const {municipalities, zeros, unconfirmed, outOfScope, bins, total} = statistics;
  const n = municipalities.length + zeros.length;
  $("map-scope").textContent = state.pref ? index.prefectures[state.pref] : "日本全国";
  $("map-filter").textContent = filterName();
  const count = element("strong", fmt(total));
  count.id = "total-number";
  count.dataset.count = total;
  $("map-total").replaceChildren(count, "店舗");
  $("coverage-num").textContent = fmt(municipalities.length);
  $("coverage-denom").textContent = " / " + fmt(n) + "区域";
  $("coverage-bar").style.width = n ? municipalities.length / n * 100 + "%" : "0";
  $("coverage-positive").textContent = "店舗あり " + percent(municipalities.length, n);
  $("coverage-zero").textContent = "0店舗 " + percent(zeros.length, n);
  $("unconfirmed-count").textContent = fmt(unconfirmed);
  $("excluded-count").textContent = fmt(outOfScope);
  for (const [i, item] of [...$("legend").children].entries()) {
    item.lastElementChild.textContent = fmt(bins[i]);
  }
}

function buildLegend() {
  for (const [name, color] of PALETTE) {
    const li = element("li");
    const chip = element("i", null, "swatch");
    chip.style.setProperty("--swatch", color);
    li.append(chip, element("span", name), element("strong", "—"));
    $("legend").append(li);
  }
}

function link(url, title) {
  let target;
  try { target = new URL(url); } catch { return null; }
  if (!["https:", "http:"].includes(target.protocol)) return null;
  const a = element("a", title);
  a.href = target.href;
  a.target = "_blank";
  a.rel = "noopener noreferrer nofollow";
  return a;
}

function drawPopup(count, reason) {
  const popup = $("map-popup");
  popup.hidden = !state.popup;
  const head = element("div", null, "map-popup-head");
  const close = element("button", "×");
  close.type = "button";
  close.setAttribute("aria-label", "吹き出しを閉じる");
  close.onclick = () => { state.popup = false; popup.hidden = true; };
  head.append(element("strong", displayLabel(state.area)), close);
  const go = element("a", "詳細を見る ↓");
  go.href = "#detail";
  go.onclick = event => {
    event.preventDefault();
    $("detail").scrollIntoView({block: "start"});
    $("detail-title").focus({preventScroll: true});
  };
  const text = reason || (filterName() + " · " + fmt(count) + "店舗");
  popup.replaceChildren(head, element("p", text), go);
}

function sortCounts(rows) {
  return [...rows].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0]), "ja", {numeric: true}));
}

function bars(host, rows, labels) {
  if (!rows?.size) {
    host.replaceChildren(element("p", "該当する店舗はありません。"));
    return;
  }
  const sorted = sortCounts(rows);
  const list = element("ul", null, "bars");
  for (const [i, count] of sorted) {
    const item = element("li");
    const track = element("span", null, "bar");
    track.setAttribute("aria-hidden", "true");
    const fill = element("span");
    fill.style.width = count / sorted[0][1] * 100 + "%";
    track.append(fill);
    item.append(element("span", labels[i]), track, element("strong", fmt(count)));
    list.append(item);
  }
  host.replaceChildren(list);
}

function stat(name, n) {
  const panel = element("div", name, "detail-stat");
  const value = element("strong", fmt(n) + "店舗");
  value.dataset.count = n;
  panel.append(value);
  return panel;
}

function renderDetail() {
  ++storesTicket;
  const panel = $("detail");
  panel.hidden = !state.area;
  if (!state.area) {
    $("map-popup").hidden = true;
    return;
  }
  const area = index.areas[state.area];
  const count = statistics.filtered.get(state.area) || 0;
  const reason = area.status === "eligible" ? "" : (area.status === "unconfirmed" ? "未確認 · " : "対象外 · ") + area.reason;
  $("detail-title").textContent = area.name;
  $("detail-pref").textContent = index.prefectures[area.pref] + "　" + state.area;
  const status = $("detail-status");
  status.hidden = !reason;
  status.textContent = reason;
  panel.querySelector(".detail-eligible").hidden = Boolean(reason);
  drawPopup(count, reason);
  if (reason) return;
  $("detail-stats").replaceChildren(stat("自治体内の全屋号", statistics.all.get(state.area) || 0),
    stat("表示中の条件 · " + filterName(), count));
  const breakdown = statistics.breakdown.get(state.area);
  bars($("detail-brands"), breakdown?.brands, index.brands);
  bars($("detail-operators"), breakdown?.operators, index.operators);
  $("store-summary").textContent = "店舗一覧（" + fmt(count) + "件）";
  $("store-list").replaceChildren();
  if (panel.querySelector(".store-disclosure").open) void renderStores();
}

function storeCard(store) {
  const record = element("article", null, "store-record");
  record.dataset.storeId = store.id;
  record.append(element("h4", store.name), element("p", store.address || "住所未収録"),
    element("p", "屋号 " + index.brands[store.brand] + " ／ 実運営法人 " + index.operators[store.operator]));
  const urlLabel = store.urlKind.includes("一覧") ? "公式の店舗一覧 ↗" : "公式店舗ページ ↗";
  const a = link(store.url, urlLabel);
  if (a) record.append(a);
  else record.append(element("p", "公式ページ未収録"));
  if (store.addressType !== "公式原文") record.append(element("p", "住所の出典表記 · " + store.addressType));
  if (store.brandStatus === "candidate" || store.operatorSource || store.review.length) {
    const disclosure = element("details", null, "store-review");
    disclosure.append(element("summary", "分類根拠・確認状況"));
    if (store.brandStatus === "candidate") {
      const copy = element("p", "屋号は表示用の採用案（" + store.brandRule + "）。" + store.brandBasis);
      const source = link(store.brandSource, "屋号の根拠");
      if (source) copy.append(" ", source);
      disclosure.append(copy);
    }
    if (store.operatorSource) {
      const copy = element("p", store.operatorSource.reason);
      const source = link(store.operatorSource.evidence_url, "法人の根拠");
      if (source) copy.append(" ", source);
      disclosure.append(copy);
    }
    for (const item of store.review) {
      const copy = element("p", item.reason);
      const source = link(item.evidence_url, "関連資料");
      if (source) copy.append(" ", source);
      disclosure.append(copy);
    }
    record.append(disclosure);
  }
  return record;
}

async function renderStores() {
  const ticket = ++storesTicket;
  const code = state.area;
  if (!code || index.areas[code].status !== "eligible") return;
  const host = $("store-list");
  if (!(statistics.filtered.get(code) || 0)) {
    host.replaceChildren(element("p", "該当する店舗はありません。"));
    return;
  }
  const pref = index.areas[code].pref;
  host.replaceChildren(element("p", "店舗一覧を読み込み中"));
  try {
    const districts = await cacheRead(storesCache, pref, `stores/${pref}.json`);
    if (ticket !== storesTicket || !document.querySelector(".store-disclosure").open) return;
    const entries = Object.entries(districts)
      .filter(([ward]) => (state.level === "city" ? index.areas[ward].parent || ward : ward) === code)
      .flatMap(([, rows]) => rows).filter(s => matches(index, state, s.brand, s.operator));
    entries.sort((a, b) => a.name.localeCompare(b.name, "ja") || a.id.localeCompare(b.id));
    host.replaceChildren(...entries.map(storeCard));
  } catch {
    if (ticket !== storesTicket) return;
    const retry = element("button", "再読み込み", "button");
    retry.type = "button";
    retry.onclick = renderStores;
    host.replaceChildren(element("p", "店舗一覧を取得できませんでした。"), retry);
  }
}

const rankPanels = [
  ["prefectures", "都道府県別店舗数ランキング"],
  ["municipalities", "市区町村別店舗数ランキング"],
  ["groups", "屋号グループ別店舗数ランキング"],
  ["brands", "個別屋号別店舗数ランキング"],
  ["operators", "運営会社別店舗数ランキング"],
  ["zeros", "対象店舗が0件の市区町村一覧"],
];
const rankings = {};
function buildRankings() {
  for (const [key, title] of rankPanels) {
    const detail = element("details");
    detail.dataset.ranking = key;
    const summary = element("summary", title);
    const host = element("div");
    detail.append(summary, host);
    detail.addEventListener("toggle", () => { if (detail.open) updateRanking(key); });
    $("rankings").append(detail);
    rankings[key] = {detail, summary, host, title};
  }
}

function updateRanking(key) {
  const ranking = rankings[key];
  const raw = key === "prefectures" ? statistics.prefTotals : statistics[key];
  ranking.summary.textContent = ranking.title + "（" + fmt(raw.size ?? raw.length) + "）";
  if (!ranking.detail.open) return;
  const data = sortCounts(raw);
  if (!data.length) {
    ranking.host.replaceChildren(element("p", "該当する項目はありません。"));
    return;
  }
  const list = element("ol", null, "rank-list");
  const more = element("button", "もっと表示", "button more");
  more.type = "button";
  let offset = 0, rank = 0, last = null;
  const addSet = () => {
    const next = Math.min(data.length, offset + 30);
    for (; offset < next; offset++) {
      const [keyValue, count] = data[offset];
      if (count !== last) rank = offset + 1;
      last = count;
      const row = element("li");
      const area = key === "municipalities" || key === "zeros";
      const isPref = key === "prefectures";
      const title = area ? labelWithPref(keyValue) : isPref ? index.prefectures[keyValue] : index[key][keyValue];
      const name = element(area || isPref ? "button" : "span", title, "rank-name");
      if (area || isPref) {
        name.type = "button";
        name.dataset.code = keyValue;
        name.onclick = isPref ? () => selectPrefecture(keyValue, true)
          : () => findArea(keyValue, {focus: true, scroll: true});
      }
      row.append(element("span", key === "zeros" ? "" : String(rank), "rank-order"),
        name, element("span", fmt(count) + "店舗", "rank-count"));
      list.append(row);
    }
    more.hidden = offset >= data.length;
  };
  more.onclick = addSet;
  addSet();
  ranking.host.replaceChildren(list, more);
}

function dismissSearch(clear) {
  if (clear) $("search").value = "";
  $("search-results").hidden = true;
  queryResults = [];
}

function search() {
  const query = $("search").value.trim();
  if (!query) { dismissSearch(false); return; }
  queryResults = searchAreas(index, state, query);
  const host = $("search-results");
  const buttons = queryResults.map(code => {
    const b = element("button", index.areas[code].name);
    b.type = "button";
    b.dataset.code = code;
    b.append(element("small", index.prefectures[index.areas[code].pref] + " · " + code));
    b.onclick = () => chooseSearch(code);
    return b;
  });
  host.replaceChildren(...(buttons.length ? buttons : [element("p", "該当する自治体がありません。")]));
  host.hidden = false;
}

function chooseSearch(code) {
  dismissSearch(false);
  $("search").value = index.areas[code].name;
  findArea(code, {focus: true});
}

function refresh({rebuild = false} = {}) {
  statistics = compute(index, state);
  if (rebuild) renderMap();
  else updatePaint();
  updateCoverage();
  renderDetail();
  $("rank-scope").textContent = (state.pref ? index.prefectures[state.pref] : "日本全国")
    + " · " + LEVELS[state.level] + " · " + filterName();
  for (const [key] of rankPanels) updateRanking(key);
}

function recoverViewportTap(map) {
  const pointers = new Set();
  map.addEventListener("pointerdown", event => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    // A pinch or captured drag can finish without a click. Let the shared
    // viewport consume any suppression from that gesture on the SVG root
    // before it handles the first pointer of a new, independent gesture.
    if (!pointers.size) map.dispatchEvent(new MouseEvent("click", {cancelable: true}));
    pointers.add(event.pointerId);
  }, true);
  const release = event => pointers.delete(event.pointerId);
  document.addEventListener("pointerup", release, true);
  document.addEventListener("pointercancel", release, true);
}

function attachControls() {
  const select = $("prefecture");
  for (const [code, name] of Object.entries(index.prefectures).sort(([a], [b]) => a.localeCompare(b))) select.add(new Option(name, code));
  select.addEventListener("change", () => selectPrefecture(select.value));
  $("nation").addEventListener("click", () => selectPrefecture(""));
  $("clear").addEventListener("click", () => {
    const rebuild = state.level !== "city";
    Object.assign(state, {level: "city", axis: "all", value: 0, pref: "", area: "", preferredWard: ""});
    $("dimension").value = "all";
    select.value = "";
    document.querySelector('[name="level"][value="city"]').checked = true;
    populateCategories();
    dismissSearch(true);
    refresh({rebuild});
    viewport.reset();
    void enhance("");
  });

  $("dimension").addEventListener("change", event => {
    state.axis = event.target.value;
    state.value = 0;
    populateCategories();
    refresh();
  });
  $("category").addEventListener("change", event => { state.value = Number(event.target.value); refresh(); });
  for (const input of document.querySelectorAll('[name="level"]')) {
    input.addEventListener("change", () => {
      state.level = input.value;
      if (state.area) {
        const area = index.areas[state.area];
        if (state.level === "city" && area.parent) state.area = area.parent;
        else if (state.level === "ward" && area.kind === "designatedCity") state.area = state.preferredWard;
      }
      refresh({rebuild: true});
      if (!$("search-results").hidden) search();
    });
  }

  const searchInput = $("search");
  searchInput.addEventListener("input", search);
  searchInput.addEventListener("focus", search);
  searchInput.addEventListener("keydown", event => {
    if (event.key === "Escape") dismissSearch(false);
    if (event.key === "ArrowDown" && queryResults.length) {
      event.preventDefault();
      $("search-results").querySelector("button")?.focus();
    }
  });
  $("search-form").addEventListener("submit", event => {
    event.preventDefault();
    search();
    if (queryResults.length) chooseSearch(queryResults[0]);
  });
  document.addEventListener("pointerdown", event => {
    if (!event.target.closest(".search-field")) dismissSearch(false);
  });
  $("search-results").addEventListener("keydown", event => {
    if (event.key === "Escape") { searchInput.focus(); dismissSearch(false); }
    const sibling = event.key === "ArrowDown" ? event.target.nextElementSibling
      : event.key === "ArrowUp" ? event.target.previousElementSibling : null;
    if (sibling) { event.preventDefault(); sibling.focus(); }
  });

  recoverViewportTap($("map"));
  $("map").addEventListener("click", event => {
    if (!event.isTrusted) return;
    const path = event.target.closest?.(".region");
    if (path) findArea(path.dataset.code);
  });
  $("map").addEventListener("keydown", event => {
    if (event.key === "+" || event.key === "=") viewport.zoomIn();
    else if (event.key === "-") viewport.zoomOut();
    else if (event.key === "Home") fitPrefecture(state.pref);
    else if (event.key.startsWith("Arrow")) {
      const view = viewport.view();
      const dx = event.key === "ArrowLeft" ? -.16 : event.key === "ArrowRight" ? .16 : 0;
      const dy = event.key === "ArrowUp" ? -.16 : event.key === "ArrowDown" ? .16 : 0;
      viewport.setView({x: view.x + view.w * dx, y: view.y + view.h * dy, w: view.w});
    } else return;
    event.preventDefault();
  });
  $("zoom-in").addEventListener("click", viewport.zoomIn);
  $("zoom-out").addEventListener("click", viewport.zoomOut);
  $("fit").addEventListener("click", () => fitPrefecture(state.pref));
  $("detail-close").addEventListener("click", () => { closeArea(); $("map").focus({preventScroll: true}); });
  const disclosure = document.querySelector(".store-disclosure");
  disclosure.addEventListener("toggle", () => {
    if (disclosure.open) void renderStores();
    else ++storesTicket;
  });
}

async function start() {
  try {
    [index, overview] = await Promise.all([readData("index.json"), readData("geometry/overview.json")]);
    viewport = window.KussoonV2MapViewport.init({
      svg: $("map"), width: W, height: H, minZoom: 1, maxZoom: 55,
      onZoomChange(zoom) {
        $("zoom-out").disabled = zoom < 1.001;
        $("zoom-in").disabled = zoom > 54.9;
        $("map").classList.toggle("close-zoom", zoom >= 2.2);
      },
    });
    buildLegend();
    buildRankings();
    attachControls();
    const updateBackTop = () => {
      $("back-top").hidden = window.scrollY < 150
        || document.querySelector(".workbench").getBoundingClientRect().bottom > window.innerHeight - 64;
    };
    window.addEventListener("scroll", updateBackTop, {passive: true});
    window.addEventListener("resize", updateBackTop);
    updateBackTop();
    refresh({rebuild: true});
    $("map-status").textContent = "";
  } catch (error) {
    $("map-status").textContent = "地図データを読み込めませんでした。ページを再読み込みしてください。";
    console.error(error);
  }
}
void start();
