import sys, time, json, os
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
URL = 'file://' + os.path.join(ROOT, 'dist', 'cyberfunk.html')
OUT = os.path.join(ROOT, 'shots'); os.makedirs(OUT, exist_ok=True)
errors = []

def shot(page, name):
    page.screenshot(path=os.path.join(OUT, name + '.png'))
    ow = page.evaluate("() => ({doc: document.documentElement.scrollWidth, body: document.body.scrollWidth, screen: document.querySelector('#screen') ? document.querySelector('#screen').scrollWidth : 0, inner: window.innerWidth})")
    flag = '' if ow['doc'] <= ow['inner'] and ow['body'] <= ow['inner'] and ow['screen'] <= ow['inner'] + 1 else '  <-- OVERFLOW'
    print(f'{name}: widths {ow}{flag}')

def click(page, act):
    page.click(f'[data-act="{act}"]', timeout=4000)

def wait_continue(page, n=1):
    for _ in range(n):
        page.wait_for_selector('[data-act="continue"]', timeout=5000)
        page.click('[data-act="continue"]'); time.sleep(0.05)
        if page.query_selector('[data-act="continue"]'):
            page.click('[data-act="continue"]')
        time.sleep(0.08)

with sync_playwright() as p:
    browser = p.chromium.launch()
    ctx = browser.new_context(viewport={'width': 360, 'height': 740}, device_scale_factor=2, is_mobile=True, has_touch=True)
    page = ctx.new_page()
    page.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto(URL); time.sleep(0.6)
    shot(page, '01_title')
    page.evaluate("() => { CF.UI.titleSettings.textSpeed = 'instant'; }")
    click(page, 'new'); time.sleep(0.2); shot(page, '02_name')
    page.fill('#name-input', 'Dawlin'); click(page, 'next'); time.sleep(0.2); shot(page, '03_roots')
    click(page, 'next'); time.sleep(0.2); shot(page, '04_instrument')
    click(page, 'pick:snare'); time.sleep(0.1); click(page, 'next'); time.sleep(0.3); shot(page, '05_howto')
    click(page, 'go'); time.sleep(0.4); shot(page, '06_prologue')
    # advance to first battle
    for i in range(14):
        if page.query_selector('[data-act="act:riff"]'): break
        try: wait_continue(page)
        except Exception as e:
            print('wait_continue failed at', i, page.evaluate("() => document.body.innerText.slice(0,300)")); shot(page, '06b_stuck'); break
    time.sleep(0.3); shot(page, '07_battle')
    # riff -> timing bar (manual)
    click(page, 'act:riff'); time.sleep(0.5); shot(page, '08_timing')
    # tap the bar
    page.mouse.click(180, 600); time.sleep(0.8); shot(page, '09_after_tap')
    # open skill picker
    page.wait_for_selector('[data-act="act:play"]', timeout=15000); time.sleep(0.2)
    click(page, 'act:play'); time.sleep(0.2); shot(page, '10_skills')
    click(page, 'back'); time.sleep(0.1)
    # open bag in battle
    click(page, 'act:bag'); time.sleep(0.3); shot(page, '11_bag_battle'); click(page, 'sheet-close')
    # tap a status chip? maybe none. Finish fight with auto rhythm
    page.evaluate("() => { CF.S.settings.rhythm = 'auto'; }")
    for i in range(80):
        if page.query_selector('.victory'): break
        if page.query_selector('#popup:not([hidden])'): page.click('#popup [data-act]'); time.sleep(0.1); continue
        if page.query_selector('[data-act="continue"]'): page.click('[data-act="continue"]'); time.sleep(0.1); continue
        t = page.query_selector('.ecard.targetable')
        if t: t.click(); time.sleep(0.1); continue
        if page.query_selector('[data-act="act:riff"]'): click(page, 'act:riff'); time.sleep(0.7); continue
        time.sleep(0.2)
    shot(page, '12_victory')
    # to district: continue through
    for i in range(60):
        if page.query_selector('[data-act="streets"]'): break
        if page.query_selector('#popup:not([hidden])'): page.click('#popup [data-act]'); time.sleep(0.1); continue
        if page.query_selector('[data-act="continue"]'): page.click('[data-act="continue"]'); time.sleep(0.08); continue
        t = page.query_selector('.ecard.targetable')
        if t: t.click(); time.sleep(0.1); continue
        if page.query_selector('[data-act="act:riff"]'): click(page, 'act:riff'); time.sleep(0.7); continue
        time.sleep(0.2)
    time.sleep(0.2); shot(page, '13_district')
    click(page, 'menu'); time.sleep(0.3); shot(page, '14_menu')
    click(page, 'm:status'); time.sleep(0.3); shot(page, '15_status')
    click(page, 'sheet-back'); click(page, 'm:journal'); time.sleep(0.2); shot(page, '16_journal')
    click(page, 'sheet-back'); click(page, 'm:settings'); time.sleep(0.2); shot(page, '17_settings'); click(page, 'sheet-close')
    click(page, 'place:kitchen'); time.sleep(0.3); shot(page, '18_place')
    page.click('[data-act="opt:1"]'); time.sleep(0.3); shot(page, '19_shop'); click(page, 'sheet-close')
    click(page, 'leave'); time.sleep(0.2)
    # dev: jump to the click to screenshot play the blues
    page.evaluate("() => { openDevMenu(); }"); time.sleep(0.2); shot(page, '20_dev')
    page.click('[data-act="items"]'); page.click('[data-act="gear"]'); page.click('[data-act="band"]'); page.click('[data-act="notes"]'); page.click('[data-act="boss:the_click"]'); time.sleep(0.5)
    for i in range(10):
        if page.query_selector('[data-act="act:blues"]'): break
        if page.query_selector('[data-act="continue"]'): page.click('[data-act="continue"]'); time.sleep(0.1)
        else: time.sleep(0.2)
    shot(page, '21_click_battle')
    click(page, 'act:blues'); time.sleep(1.2); shot(page, '22_blues')
    time.sleep(4)
    # Lexicon term tap & chip
    page.evaluate("() => { CF.S.lexicon.push('cher','lagniappe'); openLexiconSheet(); }"); time.sleep(0.2); shot(page, '23_lexicon'); click(page, 'sheet-close')
    print('errors:', json.dumps(errors, indent=1))
    browser.close()
