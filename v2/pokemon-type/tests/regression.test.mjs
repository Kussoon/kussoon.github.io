// Legacy V2 URL redirect regression. Full game tests now live in Kussoon/games.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,join} from 'node:path';

const root=join(dirname(fileURLToPath(import.meta.url)),'..');
for(const name of ['index.html','advanced.html','advanced-practice.html','advanced-quiz.html']){
  test('Legacy '+name+' redirects to the new game URL',()=>{
    const html=readFileSync(join(root,name),'utf8');
    const tail=name==='index.html'?'':name;
    const url='https://kussoon.com/games/pokemon-type/'+tail;
    assert.ok(html.includes('<meta name="robots" content="noindex,follow">'));
    assert.ok(html.includes('href="'+url+'"'),'visible fallback link');
    assert.ok(html.includes('url='+url),'meta refresh');
    assert.ok(html.includes('window.location.replace('),'browser redirect');
    assert.ok(html.includes('window.location.search + window.location.hash'),'preserve URL parameters');
  });
}
