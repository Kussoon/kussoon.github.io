// Fail CI when C-page HTML changes without updating the visible JST timestamp.
// Run inside the site repository; skip when the page was unchanged in the last commit.
"use strict";
const fs=require("node:fs"),cp=require("node:child_process"),assert=require("node:assert/strict");
const file="v2/nishinomiya-town-study-c.html";
const latest=fs.readFileSync(file,"utf8");
let previous;
try { previous=cp.execFileSync("git",["show","HEAD^:"+file],{encoding:"utf8",stdio:["ignore","pipe","ignore"]}); }
catch { console.log("SKIP: prior C-page revision not available");process.exit(0); }
if(latest===previous){console.log("PASS: C page unchanged");process.exit(0);}
const stampOf=s=>s.match(/更新：(\d{4}\/\d{2}\/\d{2} \d{2}:\d{2})（JST）/)?.[1];
const stamp=stampOf(latest),old=stampOf(previous);
assert.ok(stamp,"C版タイトルの更新日時がありません");
assert.notEqual(stamp,old,"C版ページ本体が変更されましたが更新日時が更新されていません");
console.log("PASS: C page timestamp advanced from "+old+" to "+stamp);
