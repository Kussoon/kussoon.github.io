import json, re
from pathlib import Path
from urllib.parse import urlsplit, unquote
from lxml import html

root = Path(__file__).resolve().parents[1]
report = {'chapters': [], 'errors': []}
external = set()
def blocks(node):
    return [re.sub(r'\s+', ' ', ''.join(n.itertext())).strip() for n in node.xpath('.//p[not(ancestor::aside) and not(ancestor::figure) and not(ancestor::section)] | .//h2 | .//h3[not(ancestor::section)] | .//th | .//td')]
for i in range(1, 9):
    source = html.parse(str(root / 'source' / f'chapter-{i}.html')).xpath('//main')[0]
    doc = html.parse(str(root / f'chapter-{i}.html'))
    target = doc.xpath('//div[@class="manuscript"]')[0]
    # All original text blocks, table cells and manuscript references must match.
    a, b = blocks(source), blocks(target)
    source_links = source.xpath('.//a[not(ancestor::aside)]/@href')
    target_links = target.xpath('.//a[not(ancestor::figure) and not(ancestor::section)]/@href')
    ok = a == b and source_links == target_links
    if not ok: report['errors'].append(f'chapter-{i}: manuscript mismatch')
    report['chapters'].append({'chapter': i, 'manuscript_match': ok, 'tables': len(target.xpath('.//table')), 'reference_links': len(source_links)})
for path in sorted(root.glob('*.html')):
    doc = html.parse(str(path))
    ids = doc.xpath('//@id')
    if len(ids) != len(set(ids)): report['errors'].append(f'{path.name}: duplicate IDs')
    if not doc.xpath('//meta[@name="robots" and @content="noindex"]'): report['errors'].append(f'{path.name}: noindex missing')
    for value in doc.xpath('//a/@href | //img/@src | //script/@src | //link/@href'):
        parsed = urlsplit(value)
        if parsed.scheme in ('http', 'https'):
            if 'kussoon.com' not in parsed.netloc and 'umami.is' not in parsed.netloc: external.add(value)
            continue
        if parsed.scheme: continue
        dest = (root.parents[2] / parsed.path.lstrip('/')) if parsed.path.startswith('/') else path.parent / unquote(parsed.path)
        if not parsed.path: dest = path
        if not dest.exists(): report['errors'].append(f'{path.name}: missing {value}')
        elif parsed.fragment and dest.suffix == '.html':
            if unquote(parsed.fragment) not in html.parse(str(dest)).xpath('//@id'):
                report['errors'].append(f'{path.name}: missing anchor {value}')
    for img in doc.xpath('//img'):
        if not img.get('alt'): report['errors'].append(f'{path.name}: missing alt text')
report['external_urls'] = sorted(external)
(root / 'verification.json').write_text(json.dumps(report, ensure_ascii=False, indent=2))
print(json.dumps({k:v for k,v in report.items() if k != 'external_urls'}, ensure_ascii=False, indent=2))
if report['errors']: raise SystemExit(1)
