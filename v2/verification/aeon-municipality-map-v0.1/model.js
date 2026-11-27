// Kussoon municipality distribution map Ver.0.1
export const PALETTE = [
  ["0店舗", "#D5D5D5", 0], ["1店舗", "#F4DEEE", 1], ["2店舗", "#EBC5E0", 2],
  ["3〜5店舗", "#DC9BCE", 5], ["6〜9店舗", "#C971B4", 9], ["10〜19店舗", "#B34B98", 19],
  ["20〜49店舗", "#94337C", 49], ["50〜99店舗", "#75205F", 99], ["100店舗以上", "#4F1243", Infinity],
];
export const LEVELS = {city: "市町村単位", ward: "行政区単位"};
export const DIMENSIONS = {group: "屋号グループ", brand: "個別屋号", operator: "運営会社"};
export const categoryNames = (index, axis) => index[axis === "group" ? "groups" : axis === "brand" ? "brands" : "operators"];
export const band = count => PALETTE.findIndex(([, , max]) => count <= max);

export function matches(index, state, brand, operator) {
  if (state.axis === "all") return true;
  const key = state.axis === "brand" ? brand : state.axis === "operator" ? operator : index.brandGroup[brand];
  return key === state.value;
}

export function codesAtLevel(index, level) {
  return Object.keys(index.areas).filter(code => level === "ward"
    ? index.areas[code].kind !== "designatedCity" : !index.areas[code].parent);
}

function add(map, key, n) {
  map.set(key, (map.get(key) || 0) + n);
}

export function compute(index, state) {
  const all = new Map(), filtered = new Map(), prefTotals = new Map(), brands = new Map();
  const groups = new Map(), operators = new Map(), breakdown = new Map();
  for (const [ward, brand, operator, n] of index.members) {
    const area = index.areas[ward];
    const code = state.level === "city" ? area.parent || ward : ward;
    add(all, code, n);
    if (!matches(index, state, brand, operator)) continue;
    add(filtered, code, n);
    if (!breakdown.has(code)) breakdown.set(code, {brands: new Map(), operators: new Map()});
    add(breakdown.get(code).brands, brand, n);
    add(breakdown.get(code).operators, operator, n);
    if (state.pref && area.pref !== state.pref) continue;
    add(prefTotals, area.pref, n);
    add(groups, index.brandGroup[brand], n);
    add(brands, brand, n);
    add(operators, operator, n);
  }
  const bins = Array(PALETTE.length).fill(0), municipalities = [], zeros = [];
  let unconfirmed = 0, outOfScope = 0;
  for (const code of codesAtLevel(index, state.level)) {
    const area = index.areas[code];
    if (state.pref && area.pref !== state.pref) continue;
    if (area.status === "unconfirmed") unconfirmed++;
    else if (area.status === "out_of_scope") outOfScope++;
    else {
      const n = filtered.get(code) || 0;
      bins[band(n)]++;
      (n ? municipalities : zeros).push([code, n]);
    }
  }
  return {all, filtered, prefTotals, brands, groups, operators, breakdown, bins, municipalities, zeros,
    unconfirmed, outOfScope, total: [...prefTotals.values()].reduce((sum, n) => sum + n, 0)};
}

export function normalName(value) {
  return value.normalize("NFKC").toLowerCase().replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0) - 96))
    .replace(/[\s　]+/g, "");
}

export function searchAreas(index, state, query) {
  const terms = query.trim().split(/\s+/).filter(Boolean).map(normalName);
  if (!terms.length) return [];
  return codesAtLevel(index, state.level).filter(code => {
    const area = index.areas[code];
    if (state.pref && state.pref !== area.pref) return false;
    const pref = index.prefectures[area.pref];
    const label = normalName([pref + area.name, area.short, area.reading, code].join(" "));
    return terms.every(term => label.includes(term));
  }).sort().slice(0, 35);
}
