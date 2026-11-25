'use strict';

const el = id => document.getElementById(id);
const format = n => n.toLocaleString('ja-JP');
const pageSize = 14;
const pinZoom = 14;
const normalize = text => (text || '').normalize('NFKC').toLowerCase().replace(/[‐‑‒–—―−]/g, '-');
const colors = ['#8e376f','#087a73','#a64c13','#3754aa','#a52438','#3f7549','#6242a0','#376584','#716020','#963f83','#365930','#a74660','#6d5680','#aa5137','#28739d','#795122'];

function node(tag, content, className) {
  const item = document.createElement(tag);
  if (content) item.textContent = content;
  if (className) item.className = className;
  return item;
}

function totals(rows, key) {
  const counts = new Map();
  for (const row of rows) counts.set(row[key], (counts.get(row[key]) || 0) + 1);
  return counts;
}

async function start() {
  const response = await fetch('stores.json?v=20261125-1');
  if (!response.ok) throw new Error('店舗データを取得できませんでした');
  const stores = await response.json();
  const ids = new Set(stores.map(row => row.id));
  if (stores.length !== 4613 || ids.size !== stores.length) throw new Error('店舗データの件数が一致しません');

  const brands = [...totals(stores,'brand')].sort((a,b) => b[1]-a[1] || a[0].localeCompare(b[0],'ja'));
  const palette = new Map(brands.map(([name], i) => [name, colors[i] || `hsl(${(i*137.508)%360} ${48+(i%4)*9}% ${28+(i%5)*5}%)`]));
  const prefectureOrder = '北海道 青森県 岩手県 宮城県 秋田県 山形県 福島県 茨城県 栃木県 群馬県 埼玉県 千葉県 東京都 神奈川県 新潟県 富山県 石川県 福井県 山梨県 長野県 岐阜県 静岡県 愛知県 三重県 滋賀県 京都府 大阪府 兵庫県 奈良県 和歌山県 鳥取県 島根県 岡山県 広島県 山口県 徳島県 香川県 愛媛県 高知県 福岡県 佐賀県 長崎県 熊本県 大分県 宮崎県 鹿児島県 沖縄県'.split(' ');
  const prefTotals = totals(stores,'prefecture');
  for (const pref of prefectureOrder) el('prefecture').add(new Option(`${pref}（${format(prefTotals.get(pref))}）`,pref));
  for (const [brand,count] of brands) {
    el('brand').add(new Option(`${brand}（${format(count)}）`,brand));
    const li = node('li');
    li.append(swatch(brand), node('span',`${brand}（${format(count)}）`));
    el('brands').append(li);
  }
  function swatch(brand) {
    const dot = node('i',null,'swatch');
    dot.style.setProperty('--brand',palette.get(brand));
    dot.setAttribute('aria-hidden','true');
    return dot;
  }

  const sorted = stores.slice().sort((a,b) => prefectureOrder.indexOf(a.prefecture)-prefectureOrder.indexOf(b.prefecture) ||
    (a.city || '').localeCompare(b.city || '', 'ja') || a.name.localeCompare(b.name,'ja'));
  for (const row of sorted) row.search = normalize(`${row.name} ${row.address || ''}`);
  const map = L.map('map',{zoomControl:false,scrollWheelZoom:false,minZoom:3,maxZoom:18,zoomSnap:0.25});
  L.control.zoom({position:'topright',zoomInTitle:'拡大',zoomOutTitle:'縮小'}).addTo(map);
  const resetControl = L.control({position:'topright'});
  resetControl.onAdd = () => {
    const wrapper = node('div',null,'leaflet-bar');
    const button = node('button','全体','map-reset');
    button.type = 'button';
    button.title = '日本全体を表示';
    button.setAttribute('aria-label','日本全体を表示');
    button.addEventListener('click', fitNational);
    wrapper.append(button);
    L.DomEvent.disableClickPropagation(wrapper);
    return wrapper;
  };
  resetControl.addTo(map);
  L.tileLayer('https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png',{
    maxNativeZoom:18,maxZoom:18,keepBuffer:2,noWrap:true,
    attribution:'<a href="https://maps.gsi.go.jp/development/ichiran.html">地理院タイル</a>'
  }).addTo(map);

  const allBounds = L.latLngBounds(stores.map(row => [row.lat,row.lng]));
  function fitNational() {
    map.closePopup();
    map.fitBounds(allBounds,{padding:[24,24],animate:false});
  }
  fitNational();
  const clusterLayer = L.markerClusterGroup({
    maxClusterRadius:42,disableClusteringAtZoom:pinZoom,showCoverageOnHover:false,
    spiderfyOnMaxZoom:false,removeOutsideVisibleBounds:true,animate:false,
    iconCreateFunction(cluster) {
      const children = cluster.getAllChildMarkers();
      let count = 0;
      let brand = children[0].options.brand;
      for (const child of children) {
        count += child.options.storeCount;
        if (child.options.brand !== brand) brand = null;
      }
      const size = count >= 500 ? 54 : count >= 100 ? 48 : count >= 25 ? 42 : 34;
      const circle = node('span',format(count),'cluster');
      if (brand) circle.style.setProperty('--cluster',palette.get(brand));
      circle.setAttribute('aria-label',`${format(count)}店舗のクラスター`);
      return L.divIcon({className:'map-cluster',html:circle,iconSize:[size,size]});
    }
  }).addTo(map);
  let shown = [];
  let page = 0;
  let pointGroups = new Map();
  let searchTimer;
  const whichPoint = row => `${row.lat},${row.lng}`;
  const allPointGroups = new Map();
  for (const row of sorted) {
    const key = whichPoint(row);
    if (!allPointGroups.has(key)) allPointGroups.set(key,[]);
    allPointGroups.get(key).push(row);
  }

  function openPoint(matches, lead) {
    const rows = allPointGroups.get(whichPoint(matches[0]));
    const matchedIds = new Set(matches.map(row => row.id));
    const sortedRows = lead ? [lead,...rows.filter(row => row.id !== lead.id)] : rows;
    const list = node('ul',null,'popup-list');
    for (const row of sortedRows) {
      const item = node('li');
      item.dataset.storeId = row.id;
      item.append(node('strong',row.name),node('p',`${row.brand} ／ ${row.operator}`),node('p',row.address || '住所未確認'));
      if (!matchedIds.has(row.id)) item.append(node('p','絞り込み条件外の同一地点店舗','outside-filter'));
      if (row.url) {
        const link = node('a','公式店舗情報');
        link.href = row.url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        item.append(link);
      }
      list.append(item);
    }
    const content = node('div');
    if (rows.length > 1) content.append(node('div',`同じ座標の店舗（${format(rows.length)}件）`,'popup-title'));
    content.append(list);
    L.popup({maxWidth: Math.min(290,el('map').clientWidth-65), maxHeight: Math.min(280,el('map').clientHeight-110)})
      .setLatLng([rows[0].lat,rows[0].lng]).setContent(content).openOn(map);
  }

  function marker(rows) {
    const row = rows[0];
    const brand = rows.every(item => item.brand === row.brand) ? row.brand : null;
    const title = rows.length > 1 ? `同じ座標の店舗 ${format(rows.length)}件` : row.name;
    const dot = node('span',rows.length > 1 ? String(rows.length) : '',`store-dot${rows.length > 1 ? ' shared' : ''}`);
    if (brand) dot.style.setProperty('--brand',palette.get(brand));
    const size = 29;
    const icon = L.divIcon({className:'map-pin',html:dot,iconSize:[size,size],iconAnchor:[size/2,size/2]});
    return L.marker([row.lat,row.lng],{icon,title,alt:title,brand,storeCount:rows.length}).on('click',() => openPoint(rows));
  }

  function showPage() {
    const pageCount = Math.max(1,Math.ceil(shown.length/pageSize));
    const offset = page*pageSize;
    const items = shown.slice(offset,offset+pageSize).map(row => {
      const li = node('li');
      const button = node('button');
      button.type = 'button';
      button.append(swatch(row.brand),node('strong',row.name),node('small',row.address || '住所未確認'));
      button.addEventListener('click',() => {
        map.setView([row.lat,row.lng],Math.max(pinZoom,map.getZoom()),{animate:false});
        el('map').scrollIntoView({block:'nearest'});
        openPoint(pointGroups.get(whichPoint(row)),row);
      });
      li.append(button);
      return li;
    });
    el('stores').replaceChildren(...items);
    el('stores').scrollTop = 0;
    el('range').textContent = shown.length ? `${format(offset+1)}–${format(Math.min(shown.length,offset+pageSize))}件を表示` : '該当する店舗がありません。';
    el('page-number').textContent = `${format(page+1)} / ${format(pageCount)}`;
    el('previous').disabled = page === 0;
    el('next').disabled = page+1 >= pageCount;
  }

  function fitResults() {
    if (!shown.length) return;
    if (shown.length === stores.length) fitNational();
    else map.fitBounds(L.latLngBounds([...pointGroups.values()].map(([row]) => [row.lat,row.lng])),
      {padding:[24,24],maxZoom:pinZoom,animate:false});
  }

  function filter(refit) {
    const terms = normalize(el('query').value).trim().split(/\s+/).filter(Boolean);
    const pref = el('prefecture').value;
    const brand = el('brand').value;
    shown = sorted.filter(row => (!pref || row.prefecture === pref) && (!brand || row.brand === brand) &&
      terms.every(word => row.search.includes(word)));
    pointGroups = new Map();
    for (const row of shown) {
      const key = whichPoint(row);
      if (!pointGroups.has(key)) pointGroups.set(key,[]);
      pointGroups.get(key).push(row);
    }
    map.closePopup();
    clusterLayer.clearLayers();
    if (refit) fitResults();
    clusterLayer.addLayers([...pointGroups.values()].map(marker));
    el('count').textContent = `${format(shown.length)} / ${format(stores.length)} 店舗`;
    el('fit').disabled = !shown.length;
    page = 0;
    showPage();
  }

  for (const id of ['query','prefecture','brand','reset']) el(id).disabled = false;
  el('query').addEventListener('input',() => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => filter(true),150);
  });
  for (const id of ['prefecture','brand']) el(id).addEventListener('change',() => {
    clearTimeout(searchTimer);
    filter(true);
  });
  el('reset').addEventListener('click',() => {
    clearTimeout(searchTimer);
    for (const id of ['query','prefecture','brand']) el(id).value = '';
    filter(true);
  });
  el('fit').addEventListener('click', fitResults);
  el('previous').addEventListener('click',() => {page -= 1;showPage();});
  el('next').addEventListener('click',() => {page += 1;showPage();});
  if ('ResizeObserver' in window) new ResizeObserver(() => {
    const current = map.getSize();
    if (current.x !== el('map').clientWidth || current.y !== el('map').clientHeight) map.invalidateSize({pan:false});
  }).observe(el('map'));
  filter(false);
  performance.mark('stores-ready');
}
start().catch(error => {
  el('count').textContent = '読み込みに失敗しました';
  el('range').textContent = 'ページを再読み込みしてください。';
  console.error(error);
});
