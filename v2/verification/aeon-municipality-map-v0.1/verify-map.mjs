import assert from "node:assert/strict";
import {readFileSync, readdirSync} from "node:fs";
import {band, compute, matches, searchAreas} from "./model.js";

const read = path => JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8"));
const index = read("./data/index.json");
const verification = read("./data/validation.json");
const stores = [];
const ids = new Set();
const allowedKeys = ["address", "addressType", "brand", "brandBasis", "brandRule", "brandSource", "brandStatus",
  "id", "name", "operator", "operatorSource", "originalBrand", "review", "url", "urlKind"];
const storeDir = new URL("./data/stores/", import.meta.url);
for (const file of readdirSync(storeDir).sort()) {
  for (const [ward, records] of Object.entries(read("./data/stores/" + file))) {
    const area = index.areas[ward];
    assert.equal(area.pref + ".json", file);
    assert.equal(area.status, "eligible");
    assert(ward.match(/^\d{5}$/));
    for (const row of records) {
      assert.deepEqual(Object.keys(row).sort(), allowedKeys);
      assert(row.id && !ids.has(row.id));
      assert(row.address && /^https?:\/\//.test(row.url));
      ids.add(row.id);
      stores.push({...row, ward, city: area.parent || ward});
    }
  }
}
assert.equal(ids.size, 4613);
assert.equal(index.total, 4613);
assert.deepEqual([index.brands.length, index.groups.length, index.operators.length], [42, 21, 17]);
assert.equal(stores.filter(s => s.brandStatus === "candidate").length, 504);
assert.equal(stores.filter(s => s.operatorSource).length, 3);

let cases = 0;
for (const level of ["city", "ward"]) {
  const state = {level, pref: "", axis: "all", value: 0};
  const original = compute(index, state);
  assert.equal(original.total, 4613);
  assert.equal(original.unconfirmed, 7);
  assert.equal(original.outOfScope, 6);
  assert.equal(original.municipalities.length, verification.levels[level].withStores);
  assert.deepEqual(original.bins, verification.levels[level].colorBins);
  assert.equal(original.filtered.get("13111"), 99);
  assert.equal(original.filtered.get("14100"), level === "city" ? 286 : undefined);
  for (const [axis, options] of Object.entries({brand:index.brands,group:index.groups,operator:index.operators})) {
    for (let ordinal = 0; ordinal < options.length; ordinal++) {
      const filter = {...state, axis, value: ordinal};
      const expected = new Map();
      const rows = stores.filter(row => matches(index, filter, row.brand, row.operator));
      for (const row of rows) expected.set(row[level], (expected.get(row[level]) || 0) + 1);
      const actual = compute(index, filter);
      assert.deepEqual(actual.filtered, expected);
      assert.equal(actual.total, rows.length);
      assert.equal(actual.bins[0], verification.levels[level].areas - expected.size);
      assert.equal(actual.bins.reduce((a,b) => a+b,0), verification.levels[level].areas);
      assert.equal(actual.zeros.length + actual.municipalities.length, verification.levels[level].areas);
      for (const sums of [actual.brands, actual.groups, actual.operators, actual.prefTotals]) {
        assert.equal([...sums.values()].reduce((a,b) => a+b,0), rows.length);
      }
      cases++;
    }
  }
  assert(searchAreas(index, state, "大田区").includes("13111"));
  if (level === "ward") {
    assert(searchAreas(index, state, "中央区").length > 5);
    assert.deepEqual(searchAreas(index, state, "静岡 はままつ はまな"), ["22139"]);
  }
}
assert.deepEqual([0,1,2,3,5,6,9,10,19,20,49,50,99,100,4613].map(band), [0,1,2,3,3,4,4,5,5,6,6,7,7,8,8]);

const geometry = read("./data/geometry/overview.json");
const geomTest = read("./data/geometry/validation.json");
for (const mode of ["ward", "city"]) {
  for (const [pref, g] of Object.entries(geometry)) {
    const detail = read("./data/geometry/" + pref + ".json");
    assert.deepEqual(Object.keys(detail[mode]), Object.keys(g[mode]));
    for (const feature of Object.values(detail[mode])) assert(/^M.*Z$/.test(feature[0]));
    assert(geomTest.prefectures[pref].detail.mergeFallback.length === 0);
    if (Object.keys(g.city).length) assert(g.cityBorders.length < g.wardBorders.length);
  }
}
assert.equal(Object.values(geometry).reduce((sum,g) => sum + Object.keys(g.ward).length,0), 1905);
assert.equal(Object.values(geometry).reduce((sum,g) => sum + Object.keys(g.city).length,0), 20);
assert(geometry["27"].ward["27362"][2] >= 2, "Tajiri enclave");
assert(geometry["13"].ward["13364"][2] >= 1, "Kozushima");
console.log(`PASS 4,613 unique stores, ${cases} filtered rollups, 47 topology sets, no display store coordinates`);
