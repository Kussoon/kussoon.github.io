'use strict';
// Inspect actual M/L SVG geometry, including contiguous L commands.
module.exports=function segments(d){let previous=null;const result=[];for(const part of d.match(/[ML][^MLZ]+/g)||[]){const values=part.slice(1).split(',').map(Number);if(values.length!==2||!values.every(Number.isFinite))throw Error('Invalid border coordinate');const key=values.join(',');if(part[0]==='L'&&previous!==null)result.push(previous<key?previous+'|'+key:key+'|'+previous);previous=key;}return result;};
