#!/usr/bin/env node
'use strict';
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'kawanishi-town-pilot/index.html'),'utf8');
const engine=fs.readFileSync(path.join(root,'common/js/town-map-engine.js'),'utf8');
const required=[
  '../common/js/label-engine.js',
  '../common/js/readable-labels.js',
  '../progressive-preview/map-viewport.js',
  '../common/js/town-map-engine.js'
];
for(const src of required) if(!html.includes('src="'+src+'"')) throw new Error('missing shared module '+src);
for(const token of ['KussoonLabelEngine.buildModels','KussoonV2MapViewport.init','planAdaptiveLabels','191','182']) if(!engine.includes(token)&&!html.includes(token)) throw new Error('missing contract '+token);
if(!html.includes('noindex,follow')) throw new Error('pilot must remain noindex');
if(html.includes('KussoonLabelEngine.buildModels(data.features)')) throw new Error('labels must be grouped by display name');
console.log('kawanishi-town-map-contract: PASS');
