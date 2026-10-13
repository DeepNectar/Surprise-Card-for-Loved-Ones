// Mock Supabase REST + serve fake Drive images so the app runs offline in tests.
const PEOPLE = [
  { id: 1, slug: 'asha', display_name: 'Asha', birthday: '2000-01-01', enabled: true },
];
let SETTINGS = [
  { key: 'shared__adminPassword', value: 'Deepnectar@@1617@@', person_id: null },
  { key: 'shared__admin_slug', value: 'cake', person_id: null },
  { key: 'shared__enableStory', value: 'true', person_id: 1 },
  { key: 'shared__enableMap', value: 'true', person_id: 1 },
  { key: 'shared__enableUpload', value: 'true', person_id: 1 },
  { key: 'shared__storySlideshowEnabled', value: 'true', person_id: 1 },
  { key: 'shared__storySlideDefaultSec', value: '3', person_id: 1 },
  { key: 'texts__en_mainHeadline', value: 'Happy Birthday Asha!', person_id: 1 },
];
const GIFTS = [
  { id: 11, person_id: 1, emoji: '🎁', title: 'Gift One', message: 'Open me', photo_drive_id: 'GIFTID1,GIFTID2' },
];
const STORY = [
  { id: 21, person_id: 1, title: 'The Day We Met', body: 'It was a rainy evening.', photo_drive_id: 'STORYID1,STORYID2' },
  { id: 22, person_id: 1, title: 'Our Wedding', body: 'Forever starts now.', photo_drive_id: 'STORYID3' },
];
const EVENTS = [
  { id: 31, person_id: 1, icon: '💖', label: 'Anniversary', target_iso: new Date(Date.now() + 86400000 * 5).toISOString() },
];
const VOICE = [{ id: 41, person_id: 1, title: 'Voice', audio_url: 'https://drive.google.com/file/d/VOICEID1/view' }];
const VIDEO = [{ id: 51, person_id: 1, title: 'Video', video_url: 'https://example.com/v.mp4' }];
const PINS = [
  { id: 61, person_id: 1, label: 'Paris', lat: '48.85', lng: '2.35', photo_drive_id: 'PINID1,PINID2', story: 'Our trip to Paris!' },
  { id: 62, person_id: 1, label: 'Goa', lat: '15.49', lng: '73.82', photo_drive_id: 'PINID3', story: 'Beach days.' },
];
const MEDIA = [
  { id: 71, person_id: 1, type: 'photo', drive_id: 'MEDID1', src: '', title: '' },
  { id: 72, person_id: 1, type: 'photo', drive_id: 'MEDID2', src: '', title: '' },
];

const TABLES = {
  people: () => PEOPLE,
  settings: () => SETTINGS,
  media: () => MEDIA,
  gifts: () => GIFTS,
  story_pages: () => STORY,
  event_countdowns: () => EVENTS,
  voice_messages: () => VOICE,
  video_messages: () => VIDEO,
  map_pins: () => PINS,
  guest_submissions: () => [],
  uploads: () => [],
  reviews: () => [],
  finished_ledger: () => [{ id: 1, value: '{"people":[]}', updated_at: new Date().toISOString() }],
};

function parseUrl(u) {
  const url = new URL(u);
  const seg = url.pathname.split('/').filter(Boolean); // rest/v1/<table>
  return { table: seg[2] || '', query: Object.fromEntries(url.searchParams.entries()) };
}

window.__MOCK_LOG__ = [];

const origFetch = window.fetch.bind(window);
window.fetch = async function (input, init) {
  let u = typeof input === 'string' ? input : (input && input.url) || '';
  if (!u.startsWith('http')) u = new URL(u, location.href).href;
  const method = ((init && init.method) || (input && input.method) || 'GET').toUpperCase();

  // Fake Google image hosts -> tiny SVG
  if (/lh3\.googleusercontent\.com|drive\.google\.com\/thumbnail|drive\.usercontent\.google\.com|ssl\.googleusercontent\.com/.test(u)) {
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='800' height='600'><rect width='100%' height='100%' fill='#ffccd5'/><text x='50%' y='50%' font-size='40' text-anchor='middle'>FAKE IMG</text></svg>`;
    return new Response(svg, { status: 200, headers: { 'Content-Type': 'image/svg+xml' } });
  }

  if (u.includes('/rest/v1/')) {
    const { table, query } = parseUrl(u);
    const rowsFn = TABLES[table];
    const base = rowsFn ? rowsFn() : [];
    window.__MOCK_LOG__.push(method + ' ' + u.slice(0, 160));
    const headers = { 'Content-Type': 'application/json' };

    if (method === 'GET') {
      let rows = base.slice();
      if (query.person_id === 'is.null') rows = rows.filter(r => r.person_id == null);
      else if (query.person_id) rows = rows.filter(r => String(r.person_id) === query.person_id);
      if (query.id) rows = rows.filter(r => String(r.id) === query.id);
      if (query.key && query.key.startsWith('in.')) {
        const keys = query.key.slice(4, -1).split(',').map(s => s.replace(/^"|"$/g, ''));
        rows = rows.filter(r => keys.includes(r.key));
      }
      if (query.slug) rows = rows.filter(r => r.slug && r.slug.toLowerCase().includes(query.slug.toLowerCase()));
      if (query.select && query.select !== '*') {
        const cols = query.select.split(',');
        rows = rows.map(r => Object.fromEntries(cols.filter(c => c !== '*').map(c => [c, r[c]])));
      }
      return new Response(JSON.stringify(rows), { status: 200, headers });
    }
    if (method === 'POST') {
      let body = [];
      try { body = JSON.parse(init.body); } catch (e) {}
      if (!Array.isArray(body)) body = [body];
      body.forEach((r, i) => {
        if (table === 'settings') {
          SETTINGS = SETTINGS.filter(s => !(String(s.person_id) === String(r.person_id) && s.key === r.key));
          SETTINGS.push({ key: r.key, value: r.value, person_id: r.person_id === undefined ? null : r.person_id });
        } else {
          const id = Date.now() + i;
          const arr = TABLES[table] && TABLES[table]();
          if (Array.isArray(arr)) arr.push(Object.assign({ id }, r));
        }
      });
      return new Response(JSON.stringify(body), { status: 201, headers });
    }
    if (method === 'PATCH') {
      return new Response(JSON.stringify(base), { status: 200, headers });
    }
    if (method === 'DELETE') {
      if (query.person_id) {
        const arr = TABLES[table] && TABLES[table]();
        if (Array.isArray(arr) && table !== 'settings') {
          for (let i = arr.length - 1; i >= 0; i--) if (String(arr[i].person_id) === String(query.person_id)) arr.splice(i, 1);
        }
        if (table === 'settings' && query.person_id === 'is.null') SETTINGS = SETTINGS.filter(s => s.person_id != null);
        else if (table === 'settings' && query.person_id) SETTINGS = SETTINGS.filter(s => String(s.person_id) !== String(query.person_id));
      }
      return new Response('[]', { status: 200, headers });
    }
  }
  // Anything else (rpc, storage, external): stub ok
  if (u.includes('/auth/')) return new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } });
  return origFetch(input, init).catch(() => new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } }));
};
