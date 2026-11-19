'use strict';
/* R-TOWN-11/13/14: evidence for the user-observed boundary bias.
 * A wide glyph cannot fit, but its CENTER should remain deep inside.
 * Browser zoom regression separately verifies zero Range reflows per frame.
 */
const assert=require('node:assert/strict');
const fit=require('../v2/common/js/town-svg-one-label-fit.js');
const comp=require('../v2/common/js/town-geojson-component-labels.js');
const rect=(x0,y0,x1,y1)=>[[x0,y0],[x1,y0],[x1,y1],[x0,y1],[x0,y0]];
const place=(geometry,width,height)=>fit.place({
 geometry,projection:p=>p,width,height,padding:.65,
 viewBoxArea:10000,componentEngine:comp,grid:15
});
for(const name of ['青葉台','清瀬台','柳本町','河原町']){
 const g={type:'Polygon',coordinates:[rect(0,0,100,100)]};
 const anchor=place(g,110,20);
 assert.equal(anchor.wholeLabelFits,false,name+' cannot fully fit a 110px label in 100px width');
 assert(Math.abs(anchor.point[0]-50)<10,name+' label should not be pushed against left/right boundary');
 assert(Math.abs(anchor.point[1]-50)<10,name+' label should not be pushed to top/bottom edge');
 assert(comp.insideRing(anchor.point,g.coordinates[0]));
}
const islands={type:'MultiPolygon',coordinates:[
 [rect(0,0,20,20)],[rect(40,0,140,100)]
]};
const chosen=place(islands,110,20);
assert.equal(chosen.component,1,'largest separated component chosen when no text fits');
assert(Math.abs(chosen.point[0]-90)<10,'fallback center stays deep inside largest island');
const fitCase=place({type:'Polygon',coordinates:[rect(0,0,100,100)]},40,15);
assert.equal(fitCase.wholeLabelFits,true);
assert(Math.abs(fitCase.point[0]-50)<10,'fully fitting text also prefers deep central position');
console.log('PASS TOWN_SINGLE_LABEL_CENTER_PRIORITY');
