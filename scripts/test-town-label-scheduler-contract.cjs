'use strict';
const assert=require('node:assert/strict');
const {create}=require('../v2/common/js/town-svg-label-update-scheduler.js');
let next=0;const pending=new Map();const events=[];
const scheduler=create({
 update:()=>events.push('update'),
 requestFrame:callback=>{const id=++next;pending.set(id,callback);return id},
 cancelFrame:id=>pending.delete(id)
});
for(let i=0;i<50;i++)scheduler.request();
assert.equal(scheduler.stats().requests,50);
assert.equal(pending.size,1);
for(const callback of pending.values())callback();
pending.clear();
assert.equal(events.length,1);
assert.equal(scheduler.stats().pending,false);
scheduler.request();scheduler.flush();
assert.equal(events.length,2);
assert.equal(pending.size,0);
scheduler.request();scheduler.cancel();
assert.equal(scheduler.stats().pending,false);
assert.equal(events.length,2);
assert.deepEqual(scheduler.stats(),{requests:52,updates:2,pending:false});
console.log('PASS TOWN_LABEL_SCHEDULER_CONTRACT',scheduler.stats());
