#!/usr/bin/env python3
"""Exercise the SVG, filters and data loading in browser engines."""
import argparse
import json
from pathlib import Path

from playwright.sync_api import expect, sync_playwright

ROOT = Path(__file__).resolve().parent
SIZES = {"desktop": (1440, 960), "chromebook": (1366, 768), "android-tablet": (800, 1280),
         "iphone-14-plus": (428, 926), "iphone-se-3": (375, 667)}


def search(page, code):
    page.locator("#search").fill(code)
    page.locator(f"#search-results [data-code='{code}']").click()
    expect(page.locator("#detail")).to_be_visible()


def shape(page, code):
    return page.locator(f"#map .region[data-code='{code}']")


def count(page, value):
    expect(page.locator("#total-number")).to_have_attribute("data-count", str(value))


def test(page, engine, profile, theme, base, screenshot_dir):
    errors = []
    requests = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.on("request", lambda request: requests.append(request.url))
    ios = profile.startswith("iphone")
    touch = ios or profile == "android-tablet"
    page.goto(base, wait_until="domcontentloaded")
    count(page, 4613)
    assert page.locator("meta[name=robots]").get_attribute("content") == "noindex,nofollow"
    assert all("/stores/" not in u for u in requests)
    assert sum("/geometry/" in u for u in requests) == 1
    assert page.locator("#prefecture option").nth(1).get_attribute("value") == "01"
    expect(shape(page, "14100")).to_have_attribute("data-count", "286")
    expect(shape(page, "14100")).to_have_attribute("data-band", "8")
    expect(shape(page, "13111")).to_have_attribute("data-band", "7")
    expect(shape(page, "13364")).to_have_attribute("data-band", "0")
    expect(shape(page, "13000")).to_have_class("region boundary-unconfirmed")
    expect(shape(page, "01695")).to_have_class("region boundary-out_of_scope")
    assert shape(page, "13000").get_attribute("data-band") is None
    assert page.evaluate("document.documentElement.scrollWidth === innerWidth")
    assert page.locator("#back-top").is_hidden()
    if screenshot_dir:
        page.screenshot(path=str(screenshot_dir / f"{engine}-{profile}-{theme}.png"), full_page=True)

    initial = page.locator("#map").get_attribute("viewBox")
    page.locator("#zoom-in").click()
    assert page.locator("#map").get_attribute("viewBox") != initial
    page.locator("#zoom-out").click()
    if not touch:
        map_box = page.locator("#map").bounding_box()
        x, y = map_box["x"] + map_box["width"] * .5, min(map_box["y"] + 170, page.viewport_size["height"] - 20)
        page.mouse.move(x, y)
        page.mouse.down()
        page.mouse.up()
        page.mouse.wheel(0, -175)
        expect(page.locator("#map")).not_to_have_attribute("viewBox", initial)
        zoomed = page.locator("#map").get_attribute("viewBox")
        page.mouse.move(x - 45, y)
        page.mouse.down()
        page.mouse.move(x + 45, y + 18, steps=8)
        page.mouse.up()
        expect(page.locator("#map")).not_to_have_attribute("viewBox", zoomed)
    elif engine == "chromium":
        session = page.context.new_cdp_session(page)
        map_box = page.locator("#map").bounding_box()
        x, y = map_box["x"] + map_box["width"] / 2, map_box["y"] + 85
        points = lambda spread: [{"x": x-spread, "y": y, "id": 1}, {"x": x+spread, "y": y, "id": 2}]
        session.send("Input.dispatchTouchEvent", {"type": "touchStart", "touchPoints": points(20)})
        session.send("Input.dispatchTouchEvent", {"type": "touchMove", "touchPoints": points(65)})
        session.send("Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": []})
        expect(page.locator("#map")).not_to_have_attribute("viewBox", initial)
        session.detach()
    page.locator("#fit").click()
    expect(page.locator("#map")).to_have_attribute("viewBox", initial)

    page.locator('input[value="ward"]').check()
    count(page, 4613)
    assert shape(page, "14100").count() == 0
    expect(shape(page, "14106")).to_be_attached()
    expect(shape(page, "13111")).to_have_attribute("data-count", "99")
    page.locator("#search").fill("中央区")
    assert page.locator("#search-results button").count() > 6
    page.locator("#search").fill("静岡 はままつ はまな")
    expect(page.locator("#search-results button")).to_have_count(1)
    page.locator("#search").press("Enter")
    expect(page.locator("#detail-title")).to_have_text("浜松市浜名区")
    page.locator('input[value="city"]').check()
    expect(page.locator("#detail-title")).to_have_text("浜松市")
    page.locator('input[value="ward"]').check()
    expect(page.locator("#detail-title")).to_have_text("浜松市浜名区")

    page.locator("#nation").click()
    search(page, "13111")
    expect(page.locator("#detail-title")).to_have_text("大田区")
    expect(page.locator("#map-status")).to_be_hidden()
    assert sum("/geometry/13.json" in u for u in requests) == 1
    assert all("/stores/" not in u for u in requests)
    close = page.get_by_role("button", name="吹き出しを閉じる")
    close.click()
    assert page.locator("#map-popup").is_hidden()
    assert page.locator("#detail").is_visible()

    # Select by a genuine mouse/touch event on an interior SVG point.
    shape(page, "13111").scroll_into_view_if_needed()
    coords = shape(page, "13111").evaluate("""path => {
      const area = path.getBBox(), svg = path.ownerSVGElement, matrix = path.getScreenCTM();
      for (let i = 2; i < 18; i++) for (let j = 2; j < 18; j++) {
        const p = svg.createSVGPoint();
        p.x = area.x + i / 20 * area.width;
        p.y = area.y + j / 20 * area.height;
        if (!path.isPointInFill(p)) continue;
        const q = p.matrixTransform(matrix);
        if (document.elementFromPoint(q.x, q.y) === path) return [q.x, q.y];
      }
      return null;
    }""")
    assert coords, "Could not find an unobstructed shape interior"
    (page.touchscreen.tap if touch else page.mouse.click)(*coords)
    expect(page.locator("#detail")).to_be_hidden()
    (page.touchscreen.tap if touch else page.mouse.click)(*coords)
    expect(page.locator("#detail-title")).to_have_text("大田区")

    for axis, name, expected, categories in [
        ("group", "マックスバリュ系", 810, 21),
        ("brand", "まいばすけっと", 1449, 42),
        ("operator", "まいばすけっと株式会社", 1404, 17),
    ]:
        page.locator("#dimension").select_option(axis)
        expect(page.locator("#category option")).to_have_count(categories)
        page.locator("#category").select_option(label=name)
        count(page, expected)
        expect(page.locator("#map-filter")).to_have_text(name)

    page.locator("#store-summary").click()
    n = int(page.locator("#detail-stats [data-count]").last.get_attribute("data-count"))
    assert 0 < n < 99
    expect(page.locator("#store-list article")).to_have_count(n)
    assert page.locator("#store-list article a").first.get_attribute("href").startswith("https://")
    assert page.locator("#store-list article p").first.inner_text()
    assert any("/stores/13.json" in u for u in requests)
    page.locator('[data-ranking="operators"] summary').click()
    expect(page.locator('[data-ranking="operators"] li')).to_have_count(1)
    expect(page.locator('[data-ranking="operators"] .rank-count')).to_have_text("1,404店舗")

    page.locator("#clear").click()
    count(page, 4613)
    page.locator("#prefecture").select_option("13")
    count(page, 1385)
    search(page, "13364")
    expect(page.locator("#detail-title")).to_have_text("神津島村")
    expect(page.locator("#detail-stats [data-count]").last).to_have_attribute("data-count", "0")
    page.locator("#store-summary").click()
    expect(page.locator("#store-list")).to_contain_text("該当する店舗はありません。")
    search(page, "13000")
    expect(page.locator("#detail-status")).to_contain_text("未確認")
    page.locator("#nation").click()
    search(page, "01695")
    expect(page.locator("#detail-status")).to_contain_text("対象外")

    page.locator("#clear").click()
    search(page, "27362")
    expect(page.locator("#detail-title")).to_have_text("泉南郡田尻町")
    assert int(shape(page, "27362").get_attribute("data-parts")) >= 2
    page.locator("#clear").click()
    page.locator('[data-ranking="municipalities"] summary').click()
    page.locator('[data-ranking="municipalities"] [data-code="14100"]').click()
    expect(page.locator("#detail-title")).to_have_text("横浜市")
    expect(page.locator("#detail-stats [data-count]").last).to_have_attribute("data-count", "286")
    if screenshot_dir and profile == "desktop" and theme == "light":
        page.screenshot(path=str(screenshot_dir / f"{engine}-selected-yokohama.png"), full_page=True)
    assert page.evaluate("document.documentElement.scrollWidth === innerWidth")
    assert not errors, errors
    return {"engine": engine, "profile": profile, "theme": theme, "status": "passed"}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--url", default="http://127.0.0.1:3000/")
    parser.add_argument("--engine", choices=("chromium", "webkit"), required=True)
    parser.add_argument("--chromium", default="/usr/bin/chromium")
    parser.add_argument("--profile", choices=SIZES, action="append")
    parser.add_argument("--screenshots", type=Path)
    args = parser.parse_args()
    if args.screenshots:
        args.screenshots.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as playwright:
        driver = getattr(playwright, args.engine)
        launch = {"executable_path": args.chromium, "args": ["--no-sandbox"]} if args.engine == "chromium" else {}
        browser = driver.launch(**launch)
        print("browser", browser.version, flush=True)
        for profile in args.profile or SIZES:
            w, h = SIZES[profile]
            is_phone = profile.startswith("iphone")
            for theme in ("light", "dark"):
                page = browser.new_page(viewport={"width": w, "height": h}, color_scheme=theme,
                                        is_mobile=is_phone, has_touch=is_phone or profile == "android-tablet",
                                        device_scale_factor=1, reduced_motion="reduce")
                page.set_default_timeout(8000)
                print(json.dumps(test(page, args.engine, profile, theme, args.url, args.screenshots)), flush=True)
                page.close()
        browser.close()


if __name__ == "__main__":
    main()
