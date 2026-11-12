from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import json, urllib.request, urllib.error
root = Path(__file__).resolve().parents[1]
urls = json.loads((root/'verification.json').read_text())['external_urls']
def check(url):
    try:
        request = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (compatible; Kussoon-link-review/1.0)'})
        with urllib.request.urlopen(request, timeout=15) as response:
            return {'url': url, 'status': response.status, 'final_url': response.url}
    except urllib.error.HTTPError as e: return {'url': url, 'status': e.code, 'note': '要確認：認証・アクセス制限や削除の可能性'}
    except Exception as e: return {'url': url, 'status': None, 'note': str(e)}
with ThreadPoolExecutor(max_workers=12) as executor: results = list(executor.map(check, urls))
(root/'external-link-verification.json').write_text(json.dumps({'checked_at': '2026-11-10', 'results': results}, ensure_ascii=False, indent=2))
print('Checked:',len(results),'2xx:',sum(bool(x['status']) and 200<=x['status']<300 for x in results))
for r in results:
    if not r['status'] or r['status']>=400:print(r['status'],r['url'])
