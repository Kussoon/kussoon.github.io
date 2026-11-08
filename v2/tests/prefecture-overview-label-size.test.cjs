'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'../..');
const source=fs.readFileSync(path.join(root,'v2/shared/place-labels.js'),'utf8');
const page=fs.readFileSync(path.join(root,'maps/national-municipalities.html'),'utf8');
const window={};const nodes=[];
const document={createElementNS:(ns,tag)=>{const attrs={};const node={tag,attrs,textContent:'',children:[],setAttribute(k,v){attrs[k]=v;},append(child){this.children.push(child);},remove(){this.removed=true;}};nodes.push(node);return node;}};
vm.runInNewContext(source,{window,document});
const labels=window.KussoonV2PlaceLabels;
function run(overviewScale){const svg={querySelector:()=>null,append:()=>{}};return labels.show({svg,all:true,regions:[{code:'27127',name:'大阪市北区',polys:[[[[0,0],[1,0],[1,1],[0,1]]]]}],project:pt=>[pt[0]*100,pt[1]*100],positions:new Map([['27127',[40,50]]]),overviewScale});}
assert.equal(run(.78),1);assert(nodes.some(n=>n.tag==='g'&&n.attrs.transform==='translate(40.00 50.00) scale(0.78)'));
nodes.length=0;assert.equal(run(1),1);assert(nodes.some(n=>n.tag==='g'&&n.attrs.transform==='translate(40.00 50.00)'));
assert.throws(()=>run(0),/Invalid overview label scale/);
assert(page.includes("overviewScale:selected?1:0.78"),'Full prefecture uses compact labels; individual location uses original size');
assert(page.includes("KussoonV2EstablishedLabelAdapter.layout"),'Established label positions remain');
console.log('Prefecture overview compact labels: PASS');
