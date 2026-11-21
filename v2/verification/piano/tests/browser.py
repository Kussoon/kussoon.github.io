import json, os
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
URL = os.environ.get('PIANO_BASE_URL', 'http://127.0.0.1:8765/v2/verification/piano/')
results = {'browsers': [], 'errors': []}
screens = ROOT / 'screenshots'; screens.mkdir(exist_ok=True)
with sync_playwright() as p:
    for name, options in [('chromium', {'executable_path': os.environ.get('CHROMIUM_EXECUTABLE', '/usr/bin/chromium'), 'args': ['--no-sandbox']}), ('webkit', {})]:
        try: browser = getattr(p, name).launch(**options)
        except Exception as e:
            results['browsers'].append({'browser': name, 'available': False, 'reason': str(e)[:3000]})
            continue
        record = {'browser': name, 'available': True, 'pages_checked': 0, 'interactions': []}
        results['browsers'].append(record)
        context = browser.new_context(has_touch=True)
        context.route('https://cloud.umami.is/**', lambda route: route.abort())
        page = context.new_page()
        page.on('pageerror', lambda error: results['errors'].append(f'{name}: {error}'))
        for width in [320, 375, 390, 428, 768, 1280]:
            page.set_viewport_size({'width': width, 'height': 844})
            for scheme in ['light', 'dark']:
                page.emulate_media(color_scheme=scheme)
                for file in ['index.html'] + [f'chapter-{i}.html' for i in range(1, 9)]:
                    page.goto(URL + file, wait_until='load')
                    assert page.locator('h1').count() == 1
                    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), f'{name} {width} {scheme} {file}: overflow'
                    assert page.locator('img').evaluate_all('(images) => images.every(i => i.complete && i.naturalWidth > 0)'), f'{file}: image error'
                    record['pages_checked'] += 1
        page.set_viewport_size({'width': 390, 'height': 844})
        page.emulate_media(color_scheme='light')
        page.goto(URL + 'chapter-3.html')
        page.locator('[data-action-press]').click()
        page.wait_for_timeout(750)
        assert page.locator('[data-action]').evaluate("e => e.classList.contains('sounding')")
        assert 'ハンマーは弦から離れました' in page.locator('[data-action-status]').inner_text()
        page.locator('[data-action-release]').click()
        assert not page.locator('[data-action]').evaluate("e => e.classList.contains('pressed')")
        page.locator('[data-action-press]').click()
        page.locator('[data-action-release]').click()
        page.wait_for_timeout(750)
        assert not page.locator('[data-action]').evaluate("e => e.classList.contains('sounding')")
        record['interactions'].append('action: strike, rebound, release, early release')
        page.locator('[data-action]').screenshot(path=str(screens/f'{name}-action.png'))
        page.goto(URL + 'chapter-6.html')
        assert page.locator('.piano-key').count() == 88
        assert page.locator('.white-key').count() == 52
        assert page.locator('.black-key').count() == 36
        page.locator('[data-key-center]').click()
        assert 'C4' in page.locator('[data-key-status]').inner_text()
        page.locator('[data-key-colors]').check()
        assert page.locator('.keyboard').evaluate("e => e.classList.contains('reversed')")
        page.locator('[data-key-sound]').check()
        page.locator('[data-midi="69"]').click()
        assert '440.00 Hz' in page.locator('[data-key-status]').inner_text()
        assert 'できません' not in page.locator('[data-key-status]').inner_text()
        page.locator('[data-key-stop]').click()
        page.locator('[data-midi="69"]').focus()
        page.keyboard.press('ArrowRight')
        assert page.locator(':focus').get_attribute('data-midi') == '70'
        record['interactions'].append('keyboard: 88 keys, names/frequencies, reverse colors, sound, stop, arrow navigation')
        page.locator('[data-keyboard]').screenshot(path=str(screens/f'{name}-keyboard.png'))
        page.goto(URL + 'chapter-8.html')
        for mode in ['440', '442', 'both']:
            page.locator(f'[data-pitch-mode="{mode}"]').click()
            page.wait_for_timeout(100)
            assert page.locator(f'[data-pitch-mode="{mode}"]').get_attribute('aria-pressed') == 'true'
            assert '再生中' in page.locator('[data-pitch-status]').inner_text()
        page.locator('[data-pitch-volume]').fill('0.08')
        page.wait_for_timeout(100)
        assert page.locator('[data-beat-cursor]').get_attribute('transform') != 'translate(0 0)'
        page.locator('[data-pitch-stop]').click()
        assert page.locator('[data-pitch-mode][aria-pressed="true"]').count() == 0
        page.locator('[data-pitch-mode="both"]').click()
        page.wait_for_timeout(10400)
        assert '停止中' in page.locator('[data-pitch-status]').inner_text()
        page.emulate_media(reduced_motion='reduce')
        page.locator('[data-pitch-mode="both"]').click()
        page.wait_for_timeout(100)
        assert page.locator('[data-beat-cursor]').get_attribute('transform') == 'translate(0 0)'
        page.locator('[data-pitch-stop]').click()
        page.locator('[data-pitch]').screenshot(path=str(screens/f'{name}-pitch.png'))
        record['interactions'].append('pitch: single/both playback, switching, volume, moving cursor, stop, 10-second timeout, reduced motion')
        # An unavailable Web Audio API must leave note exploration usable.
        page.add_init_script('window.AudioContext=undefined; window.webkitAudioContext=undefined;')
        page.goto(URL + 'chapter-8.html')
        page.locator('[data-pitch-mode="both"]').click()
        assert '再生できません' in page.locator('[data-pitch-status]').inner_text()
        record['interactions'].append('audio unavailable: explanatory message')
        context.close(); browser.close()
(ROOT/'browser-verification.json').write_text(json.dumps(results, ensure_ascii=False, indent=2))
print(json.dumps(results, ensure_ascii=False, indent=2))
assert not results['errors']
