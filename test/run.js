// E2E verification for the surprise card app (offline, mocked backend).
const { chromium } = require('/tmp/pwtest/node_modules/playwright');
const path = require('path');

const ROOT = '/workspace';
const results = [];
function check(name, ok, extra) {
  results.push({ name, ok: !!ok, extra: extra || '' });
  console.log((ok ? 'PASS' : 'FAIL') + ' | ' + name + (extra ? ' | ' + extra : ''));
}

(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage();
  const jsErrors = [];
  page.on('pageerror', e => jsErrors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') jsErrors.push('[console] ' + m.text()); });

  // Serve files via file:// is messy with fetch; use a tiny static route instead.
  await page.route('**/*', async (route, req) => {
    const u = new URL(req.url());
    if (u.hostname === 'app.test') {
      let p = u.pathname === '/' ? '/index.html' : u.pathname;
      const file = path.join(ROOT, p);
      try {
        const fs = require('fs');
        let body = fs.readFileSync(file);
        const ext = path.extname(file);
        const ct = ext === '.html' ? 'text/html' : ext === '.js' ? 'application/javascript' : ext === '.css' ? 'text/css' : 'text/plain';
        route.fulfill({ status: 200, contentType: ct + '; charset=utf-8', body });
      } catch (e) { route.fulfill({ status: 404, body: 'not found' }); }
      return;
    }
    route.continue();
  });

  await page.addInitScript({ path: path.join(ROOT, 'test', 'mock.js') });
  await page.goto('http://app.test/index.html', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  check('no JS errors on load', jsErrors.length === 0, jsErrors.slice(0, 3).join(' || '));

  // Home grid should have the person button
  const homeBtns = await page.$$('#homeGrid .home-btn');
  check('home grid built with person button', homeBtns.length >= 2, 'count=' + homeBtns.length);

  // Click person -> opening screen or lock screen
  await homeBtns[0].click();
  await page.waitForTimeout(800);
  const openingVisible = await page.evaluate(() => document.getElementById('openingScreen').classList.contains('active'));
  check('opening screen shown after person click', openingVisible);

  // Tap cake
  await page.click('#cakeClickable');
  await page.waitForTimeout(1200);
  const viewerActive = await page.evaluate(() => document.getElementById('viewerScreen').classList.contains('active'));
  check('card viewer active after cake tap', viewerActive);

  const storyBtnVisible = await page.evaluate(() => getComputedStyle(document.getElementById('storyBtn')).display !== 'none');
  check('story button visible on card', storyBtnVisible);
  const mapBtnVisible = await page.evaluate(() => getComputedStyle(document.getElementById('mapBtn')).display !== 'none');
  check('map button visible on card', mapBtnVisible);

  // ---- STORY MODE ----
  await page.click('#storyBtn');
  await page.waitForTimeout(600);
  const storyModalActive = await page.evaluate(() => document.getElementById('storyModal').classList.contains('active'));
  check('story modal opens', storyModalActive);

  const imgInfo = await page.evaluate(() => {
    const wrap = document.querySelector('#storyViewer #storySlideWrap');
    if (!wrap) return { wrap: false };
    const img = wrap.querySelector('img.mini-slide-img');
    if (!img) return { wrap: true, img: false };
    const r = img.getBoundingClientRect();
    return { wrap: true, img: true, complete: img.complete, nw: img.naturalWidth, w: r.width, h: r.height, src: img.src.slice(0, 80) };
  });
  check('story image element exists in slide wrap', imgInfo.img === true, JSON.stringify(imgInfo));
  check('story image actually displayed (non-zero size, loaded)', imgInfo.nw > 0 && imgInfo.w > 50 && imgInfo.h > 50, JSON.stringify(imgInfo));

  // slideshow advancing?
  const src1 = await page.evaluate(() => (document.querySelector('#storyViewer img.mini-slide-img') || {}).src || '');
  await page.waitForTimeout(3600); // story duration set to 3s in mock
  const src2 = await page.evaluate(() => (document.querySelector('#storyViewer img.mini-slide-img') || {}).src || '');
  check('story slideshow auto-advances between photos', src1 && src2 && src1 !== src2, src1.split('=').pop() + ' -> ' + src2.split('=').pop());

  // next page button
  await page.click('#storyNext');
  await page.waitForTimeout(400);
  const pageNum = await page.evaluate(() => document.getElementById('storyPageNum').textContent.trim());
  check('story Next button advances page', pageNum.startsWith('2'), pageNum);

  await page.click('#storyPrev');
  await page.waitForTimeout(400);
  const pageNum2 = await page.evaluate(() => document.getElementById('storyPageNum').textContent.trim());
  check('story Prev button goes back', pageNum2.startsWith('1'), pageNum2);

  await page.click('#storyClose');
  await page.waitForTimeout(300);
  const storyClosed = await page.evaluate(() => !document.getElementById('storyModal').classList.contains('active'));
  check('story modal closes', storyClosed);

  // ---- MAP PIN SLIDESHOW ----
  await page.click('#mapBtn');
  await page.waitForTimeout(500);
  const pinsCount = await page.$$('#mapCanvas .map-pin');
  check('map modal shows pins', pinsCount.length === 2, 'pins=' + pinsCount.length);

  await pinsCount[0].click();
  await page.waitForTimeout(600);
  const pinModalActive = await page.evaluate(() => document.getElementById('pinModal').classList.contains('active'));
  check('pin detail modal opens', pinModalActive);

  const pinImgInfo = await page.evaluate(() => {
    const wrap = document.querySelector('#pinModalViewer #pinSlideWrap');
    if (!wrap) return { wrap: false };
    const img = wrap.querySelector('img.mini-slide-img');
    if (!img) return { wrap: true, img: false };
    const r = img.getBoundingClientRect();
    return { wrap: true, img: true, nw: img.naturalWidth, w: r.width, h: r.height };
  });
  check('pin slideshow image displayed', pinImgInfo.img && pinImgInfo.nw > 0 && pinImgInfo.w > 50, JSON.stringify(pinImgInfo));

  const psrc1 = await page.evaluate(() => (document.querySelector('#pinModalViewer img.mini-slide-img') || {}).src || '');
  await page.waitForTimeout(10500); // MODAL_IMG_DURATION_MS = 10s
  const psrc2 = await page.evaluate(() => (document.querySelector('#pinModalViewer img.mini-slide-img') || {}).src || '');
  check('pin slideshow auto-advances', psrc1 && psrc2 && psrc1 !== psrc2, psrc1.split('=').pop() + ' -> ' + psrc2.split('=').pop());

  await page.click('#pinModalClose');
  await page.waitForTimeout(300);
  await page.click('#mapClose');
  await page.waitForTimeout(300);

  // ---- GIFTS ----
  const giftBoxes = await page.$$('.gift-box');
  check('gift boxes rendered', giftBoxes.length === 1, 'n=' + giftBoxes.length);
  if (giftBoxes.length) {
    await giftBoxes[0].click();
    await page.waitForTimeout(500);
    const giftImg = await page.evaluate(() => {
      const w = document.querySelector('#giftSlideWrap');
      const i = w && w.querySelector('img.mini-slide-img');
      return i ? { nw: i.naturalWidth, w: i.getBoundingClientRect().width } : null;
    });
    check('gift slideshow image displayed', !!(giftImg && giftImg.nw > 0 && giftImg.w > 50), JSON.stringify(giftImg));
    await page.click('.info-modal.active #gmClose');
    await page.waitForTimeout(300);
  }

  // ---- UPLOAD ----
  await page.click('#uploadBtn');
  await page.waitForTimeout(400);
  const uploadActive = await page.evaluate(() => document.getElementById('uploadModal').classList.contains('active'));
  check('upload modal opens', uploadActive);
  await page.fill('#uploadName', 'Ravi');
  await page.fill('#uploadDriveId', 'ABC123');
  await page.click('#uploadSubmit');
  await page.waitForTimeout(700);
  const upStatus = await page.evaluate(() => document.getElementById('uploadStatus').textContent);
  check('upload submit succeeds', /✅/.test(upStatus), upStatus);

  // ---- VOICE ----
  const voiceVisible = await page.evaluate(() => getComputedStyle(document.getElementById('voiceRow')).display !== 'none');
  check('voice row visible', voiceVisible);

  // ---- VIDEO MESSAGE (card playback, incl. Catbox links) ----
  const videoRowVisible = await page.evaluate(() => getComputedStyle(document.getElementById('videoMsgRow')).display !== 'none');
  check('video message row visible on card', videoRowVisible);
  if (videoRowVisible) {
    await page.click('#videoMsgBtn');
    await page.waitForTimeout(500);
    const vm1 = await page.evaluate(() => {
      const m = document.querySelector('.info-modal.active .vm-modal-content');
      const v = m && m.querySelector('video.vm-video');
      return { modal: !!m, tag: v ? 'video' : (m && m.querySelector('iframe') ? 'iframe' : ''), src: v ? v.getAttribute('src') : '' };
    });
    check('video modal opens with native <video> for direct catbox URL', vm1.modal && vm1.tag === 'video' && /files\.cdn\.spbl\.catbox\.moe\/abc123\.mp4/.test(vm1.src || ''), JSON.stringify(vm1));
    const picks = await page.$$('.vm-pick');
    check('all submitted videos reachable via picker', picks.length === 2, 'n=' + picks.length);
    if (picks.length === 2) {
      await picks[1].click();
      await page.waitForTimeout(400);
      const vm2 = await page.evaluate(() => {
        const v = document.querySelector('.info-modal.active video.vm-video');
        return { src: v ? v.getAttribute('src') : '', title: (document.querySelector('.info-modal.active .info-title') || {}).textContent || '' };
      });
      check('catbox PAGE link auto-converts to direct file URL and plays', /files\.cdn\.spbl\.catbox\.moe\/def456\.webm/.test(vm2.src || '') && vm2.title === 'Catbox Page Link', JSON.stringify(vm2));
      await page.click('#vmClose');
      await page.waitForTimeout(300);
      const vmClosed = await page.evaluate(() => !document.querySelector('.info-modal.active .vm-modal-content'));
      check('video modal closes cleanly', vmClosed);
    }
  }

  // ---- normalizeVideoEmbed unit checks (in-page) ----
  const normOk = await page.evaluate(() => {
    const t = [
      ['https://catbox.moe/#!/abc.mp4', 'https://files.cdn.spbl.catbox.moe/abc.mp4'],
      ['https://files.cdn.spbl.catbox.moe/abc.webm', 'https://files.cdn.spbl.catbox.moe/abc.webm'],
      ['https://litterbox.catbox.moe/resources/internals/x.mp4', 'https://litterbox.catbox.moe/resources/internals/x.mp4'],
      ['https://youtu.be/dQw4w9WgXcQ', 'https://www.youtube.com/embed/dQw4w9WgXcQ'],
      ['https://drive.google.com/file/d/1AbC/view?usp=sharing', 'https://drive.google.com/file/d/1AbC/preview'],
      ['https://vimeo.com/123456789', 'https://player.vimeo.com/video/123456789']
    ];
    return t.every(c => normalizeVideoEmbed(c[0]) === c[1]);
  });
  check('normalizeVideoEmbed handles catbox/youtube/drive/vimeo shapes', normOk);

  // ---- BACK BUTTON returns home ----
  await page.evaluate(() => document.getElementById('viewerBackBtn').click());
  await page.waitForTimeout(600);
  const homeShown = await page.evaluate(() => !document.getElementById('homeScreen').classList.contains('hidden'));
  check('back button returns to home', homeShown);

  const lateErrs = jsErrors.filter(e => !/net::|Failed to load resource|favicon/i.test(e));
  check('no JS errors overall', lateErrs.length === 0, lateErrs.slice(0, 5).join(' || '));

  await browser.close();
  const failed = results.filter(r => !r.ok);
  console.log('\n=== SUMMARY: ' + (results.length - failed.length) + '/' + results.length + ' passed ===');
  process.exit(failed.length ? 1 : 0);
})().catch(e => { console.error('RUNNER ERROR', e); process.exit(2); });
