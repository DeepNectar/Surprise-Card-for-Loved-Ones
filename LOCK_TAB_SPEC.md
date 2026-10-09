# 🔓 The "LOCK" Tab of the Admin Portal — Complete Reference (everything in one file)

Project: **LoveCard** static admin portal (`index.html` + `js/app.js` + `css/styles.css`, Supabase PostgREST backend).

This document contains **all HTML, all data keys, every function and the full flow** that make up the
**🔓 Lock** tab inside the admin panel — plus everything the tab's settings drive at runtime
(lock screen, countdown, counters, music/volumes), and how saving/loading works.

> Verified against this repo: `index.html` (1087 lines) and `js/app.js` (3534 lines).
> All line numbers below are from the current files.

---

## 1. Where the pieces live (file map)

| Concern | File(s) | Lines / IDs |
|---|---|---|
| Tab button | `index.html` | line **511**: `<button class="panel-tab" data-pane="pane-lock">🔓 Lock</button>` |
| Pane markup (all form fields) | `index.html` | `#pane-lock` lines **634–680** |
| Lock-screen markup (what the tab configures) | `index.html` | `#lockScreen` lines **66–80** |
| Loading values into the tab fields | `js/app.js` | `fillAdminFields()` (~lines **1859–1912**) |
| Collecting tab fields → memory state | `js/app.js` | `readAdminFields()` (~lines **1914–1955**) |
| Slider value labels (live binding) | `js/app.js` | global `input` listener (~line **1958**) |
| Save pipeline (Save + Preview) | `js/app.js` | `saveAdminAll()` (line **2397**), `sb.upSet()` settings writer |
| Counter definitions (data schema) | `js/app.js` | `window.COUNTERS` lines **81–83**, `TEXT_FIELDS` ~lines **92–95** |
| Lock screen runtime (render + countdown + Open Early) | `js/app.js` | `renderLockFull()` **425**, `startCountdownFull()` **436**, `openEarlyBtn` handler **449** |
| Gate decision (show lock or not) | `js/app.js` | person-unlock flow lines **410–422** |
| Opening / cake handoff | `js/app.js` | `openOpeningFull()` **457**, `cakeClickable.onclick` **464** |
| Counters runtime on the card | `js/app.js` | `updateCounters()` **569** (+ 1s interval **584**), counter render in card **515–524** |
| Music runtime (card) | `js/app.js` | `getVol` **867**, `buildPlaylistFor` **871**, `playNext` **893**, `startMusicFor` **902**, `musicToggle` handler, `ended` loop |
| Music runtime (slideshow) | `js/app.js` | `SS_fadeMusic` **1088**, `SS_normalMusicVol` **1105**, `SS_duckedMusicVol` **1106**, `SS_isMusicDuringVideo` **1108**, `SS_musicTargetVol` **1109**, `SS_ensureMusicPlaying` **1112**, `SS_nextTrackIfOwn` **1145** |
| Video-slide duck/keep logic | `js/app.js` | slide switch lines **1477–1482** (video) & **1496–1517** (photo resume) |
| Slideshow close → card handoff | `js/app.js` | `SS_close()` **1566–1587** |
| View Details rows for lock/music | `js/app.js` | ~lines **2297–2324**, **2615–2616** |
| Guest-edit mirror of unlock fields | `js/app.js` | **2782–2783**, **2841–2842**, **2936–2937** |
| Timezone helpers used by the date fields | `js/app.js` | `zonedToUTC`, `utcToZonedLocal`, `TZ_OPTIONS`, `DEFAULT_TZ` |
| Persistence (key/value store) | Supabase | `public.settings` table; written via `sb.upSet(settings, pid)` with `shared__*` keys |

---

## 2. What the 🔓 Lock tab actually contains

The pane `#pane-lock` has **three sections**:

1. **💕 Counters** — 3 editable "live counter" cards (Counter 1 💬, Counter 2 💕, Counter 3 💍):
   Show checkbox, Label, Start date & time + timezone, Display-date text.
2. **🔓 Unlock** — the scheduled unlock datetime + timezone (this is THE lock feature:
   the card stays behind the lock screen until this moment).
3. **🎵 Music** — global play-mode radio, 5 song slots (on/url/where), volume sliders
   (card / slideshow / video / video-music) and a "keep music during video slides" toggle.

### 2.1 Exact HTML of the tab (verbatim from `index.html`, lines 634–680)

```html
<div class="panel-pane" id="pane-lock">
  <div class="panel-section">
    <div class="panel-section-title">💕 Counters</div>
    <div class="counter-edit-card"><div class="head"><span class="icon">💬</span><span>Counter 1</span><label><input type="checkbox" id="f_ct1_show"> Show</label></div>
      <div class="panel-field"><label class="panel-label">Label</label><input type="text" class="panel-input" id="f_ct1_label2"></div>
      <div class="panel-field"><label class="panel-label">Start date &amp; time + timezone</label><div class="tz-row"><input type="datetime-local" class="panel-input" id="f_ct1_datetime"><select class="panel-select tz-select" id="f_ct1_datetime_tz"></select></div></div>
      <div class="panel-field"><label class="panel-label">Display date text</label><input type="text" class="panel-input" id="f_ct1_dispdate"></div>
    </div>
    <div class="counter-edit-card"><div class="head"><span class="icon">💕</span><span>Counter 2</span><label><input type="checkbox" id="f_ct2_show"> Show</label></div>
      <div class="panel-field"><label class="panel-label">Label</label><input type="text" class="panel-input" id="f_ct2_label2"></div>
      <div class="panel-field"><label class="panel-label">Start date &amp; time + timezone</label><div class="tz-row"><input type="datetime-local" class="panel-input" id="f_ct2_datetime"><select class="panel-select tz-select" id="f_ct2_datetime_tz"></select></div></div>
      <div class="panel-field"><label class="panel-label">Display date text</label><input type="text" class="panel-input" id="f_ct2_dispdate"></div>
    </div>
    <div class="counter-edit-card"><div class="head"><span class="icon">💍</span><span>Counter 3</span><label><input type="checkbox" id="f_ct3_show"> Show</label></div>
      <div class="panel-field"><label class="panel-label">Label</label><input type="text" class="panel-input" id="f_ct3_label2"></div>
      <div class="panel-field"><label class="panel-label">Start date &amp; time + timezone</label><div class="tz-row"><input type="datetime-local" class="panel-input" id="f_ct3_datetime"><select class="panel-select tz-select" id="f_ct3_datetime_tz"></select></div></div>
      <div class="panel-field"><label class="panel-label">Display date text</label><input type="text" class="panel-input" id="f_ct3_dispdate"></div>
    </div>
  </div>
  <div class="panel-section">
    <div class="panel-section-title">🔓 Unlock</div>
    <div class="panel-field"><label class="panel-label">Unlock date &amp; time + timezone</label><div class="tz-row"><input type="datetime-local" class="panel-input" id="f_unlockDateISO"><select class="panel-select tz-select" id="f_unlockDateISO_tz"></select></div></div>
  </div>
  <div class="panel-section">
    <div class="panel-section-title">🎵 Music</div>
    <div class="panel-field"><label class="panel-label">Where to play</label><div style="display:flex;gap:1rem;flex-wrap:wrap;">
      <label style="display:inline-flex;align-items:center;gap:.35rem;font-size:.88rem;"><input type="radio" name="music_mode" value="both"> Both</label>
      <label style="display:inline-flex;align-items:center;gap:.35rem;font-size:.88rem;"><input type="radio" name="music_mode" value="card"> Card</label>
      <label style="display:inline-flex;align-items:center;gap:.35rem;font-size:.88rem;"><input type="radio" name="music_mode" value="slideshow"> Slideshow</label>
    </div></div>
    <!-- five identical song rows, i = 1..5 -->
    <div style="display:grid;grid-template-columns:auto 1fr auto;gap:.4rem;align-items:center;padding:.55rem .5rem;border:1px dashed rgba(196,30,58,.25);border-radius:.7rem;margin-bottom:.5rem;background:#fffdf8;">
      <input type="checkbox" id="f_song1_on">
      <input type="text" class="panel-input" id="f_song1_url" placeholder="https://... .mp3">
      <select class="panel-select" id="f_song1_where"><option value="both">Both</option><option value="card">Card</option><option value="slideshow">Slideshow</option></select>
    </div>
    <!-- … same for f_song2_*, f_song3_*, f_song4_*, f_song5_* … -->
    <div class="slider-row"><label>Card volume</label><input type="range" id="f_vol_card" min="0" max="1" step="0.05" value="0.45"><span class="slider-val" id="f_vol_card_val">0.45</span></div>
    <div class="slider-row"><label>Slideshow volume</label><input type="range" id="f_vol_slide" min="0" max="1" step="0.05" value="0.85"><span class="slider-val" id="f_vol_slide_val">0.85</span></div>
    <div class="slider-row"><label>Video volume</label><input type="range" id="f_vol_video" min="0" max="1" step="0.05" value="1.0"><span class="slider-val" id="f_vol_video_val">1.00</span></div>
    <div class="toggle-box" style="margin-top:.7rem;margin-bottom:.5rem;">
      <label><input type="checkbox" id="f_musicDuringVideo"> 🎵 Keep background music playing during video slides</label>
    </div>
    <div class="slider-row"><label>Music volume during video</label><input type="range" id="f_vol_video_music" min="0" max="1" step="0.05" value="0.35"><span class="slider-val" id="f_vol_video_music_val">0.35</span></div>
    <div style="font-size:.75rem;color:var(--c-text-muted);font-style:italic;line-height:1.5;margin-top:.35rem;">
      When ON, music plays under video at the volume set above (instead of ducking to 40%). When OFF, music ducks softly while a video is showing.
    </div>
  </div>
</div>
```

Tab button (in `.panel-tabs`, switches panes via `data-pane`):

```html
<button type="button" class="panel-tab" data-pane="pane-lock">🔓 Lock</button>
```

### 2.2 Related fields that live in OTHER tabs but belong to the Lock feature

Lock-screen *texts* are edited in the **📝 Text** tab (`index.html` lines ~562–568, 618):

```html
<div class="panel-section-title">🎂 Opening / Cake / Lock</div>
<input ... id="f_lockTitle">        <!-- Lock title -->
<input ... id="f_lockSubtitle">     <!-- Lock subtitle -->
<input ... id="f_lockDateText">     <!-- Lock date text -->
... (pwError, pwLockedMsg nearby)
<label><input type="checkbox" id="f_showLockScreen"> 🔒 Show Lock Screen</label>
```

- `f_showLockScreen` → `shared.showLockScreen` ('true'/'false'): force-show the lock screen even after unlock.
- `f_lockTitle / f_lockSubtitle / f_lockDateText / f_pwLockedMsg / f_countdownLabel / f_daysLabel / …` → stored as
  `texts__<lang>__lockTitle` etc. (multi-language en/gu/hi via `TEXT_FIELDS`).
- Shuffle toggles `f_shuffleMusicOn` / `f_shuffleMediaOn` live in the **Slideshow** pane (`index.html` lines 701/704)
  but their saved order (`musicOrder`, `mediaOrder`, `privateMediaOrder`) is consumed by the Music engine (§5, rule 14).

### 2.3 Lock-screen markup the tab configures (`index.html` lines 66–80)

```html
<div class="lock-screen" id="lockScreen">
<div class="lock-content">
<div class="lock-icon">🔒</div>
<div class="lock-title" id="lockTitleEl"></div>
<div class="lock-subtitle" id="lockSubtitleEl"></div>
<div class="countdown-label" id="countdownLabelEl"></div>
<div class="countdown">
<div class="cd-box"><div class="cd-num" id="cdDays">00</div><div class="cd-label" id="cdDaysLabel">Days</div></div>
<div class="cd-box"><div class="cd-num" id="cdHours">00</div><div class="cd-label" id="cdHoursLabel">Hours</div></div>
<div class="cd-box"><div class="cd-num" id="cdMins">00</div><div class="cd-label" id="cdMinsLabel">Mins</div></div>
<div class="cd-box"><div class="cd-num" id="cdSecs">00</div><div class="cd-label" id="cdSecsLabel">Secs</div></div>
</div>
<button class="open-early-btn" id="openEarlyBtn"><span>🔓</span><span id="openEarlyTextEl">Open Early</span></button>
<div class="lock-hearts">❤️ 💕 🌹 ✨ 💖</div>
</div>
</div>
```

Styling lives in `css/styles.css` (`.lock-screen`, `.lock-content`, `.cd-box`, `.open-early-btn`; in the original
multi-file project this was `css/lock.css`).

### 2.4 Shared audio player + music toggle (`index.html` lines 1081–1082)

```html
<audio id="audioPlayer" preload="auto" crossorigin="anonymous"></audio>
<button class="music-toggle" id="musicToggle" aria-label="Toggle music">🔊</button>
```

Card-side counter rows the Lock tab drives (`index.html` line ~128):

```html
<div class="counter-item" id="ctMain1"><div class="counter-icon">💬</div><div class="counter-body">
  <div class="counter-label" id="ctMain1_label"></div>
  <div class="counter-time" id="counterTalkMain">…</div>
  <div class="counter-date" id="ctMain1_date"></div></div></div>
```

(`hardExpiryISO` — the soft cloud-expiry datetime, edited in another pane but handled by the same
fill/read tz machinery — is at `index.html` line ~799.)

---

## 3. All DATA (keys, defaults, storage)

### 3.1 Settings keys written by the Lock tab

Everything on this tab is flattened into the per-person key/value `settings` table with a `shared__` prefix
(`Object.keys(S.CURR.shared).forEach(k => settings['shared__'+k] = S.CURR.shared[k]);` in `saveAdminAll`, line ~2447).

| Field id(s) | Storage key (`shared__…`) | Type / values | Default | Meaning |
|---|---|---|---|---|
| `f_ct1_show` | `ct1_show` | `'true'`/`'false'` string | `'true'` | Show Counter 1 on card |
| `f_ct1_label2` | `ct1_label` | text | `''` | Counter 1 label |
| `f_ct1_datetime` (+ `_tz`) | `ct1_datetime` | ISO-8601 UTC string | `''` | Counter start instant |
| `f_ct1_datetime_tz` | `ct1_datetime_tz` | IANA tz (e.g. `Asia/Kolkata`) | `DEFAULT_TZ` | Edit-timezone of the datetime |
| `f_ct1_dispdate` | `ct1_dispdate` | text | `''` | Human display date under counter |
| `f_ct2_*` … `f_ct3_*` | `ct2_*` … `ct3_*` | same pattern | same | Counters 2 & 3 |
| `f_unlockDateISO` | `unlockDateISO` | ISO-8601 UTC string or `''`/null | `''` | **Scheduled unlock moment** |
| `f_unlockDateISO_tz` | `unlockDateISO_tz` | IANA tz | `DEFAULT_TZ` | Edit-timezone of unlock |
| `music_mode` radios | `music_mode` | `'both'│'card'│'slideshow'` | `'both'` | Global music destination |
| `f_song{i}_on` | `song{i}_on` | `'true'`/`'false'` | `'false'` | Song slot i enabled |
| `f_song{i}_url` | `song{i}_url` | mp3 URL | `''` | Song slot i source |
| `f_song{i}_where` | `song{i}_where` | `'both'│'card'│'slideshow'` | `'both'` | Per-song override |
| `f_vol_card` | `vol_card` | 0–1 number-as-string | `'0.45'` | Card BGM volume |
| `f_vol_slide` | `vol_slide` | 0–1 | `'0.85'` | Slideshow volume |
| `f_vol_video` | `vol_video` | 0–1 | `'1.0'` | Video-slide volume |
| `f_musicDuringVideo` | `musicDuringVideo` | `'true'`/`'false'` | off | Keep music under videos |
| `f_vol_video_music` | `vol_video_music` | 0–1 | `'0.35'` | Music level while video plays |
| *(Slideshow tab)* `f_shuffleMusicOn` | `shuffleMusicOn` + `musicOrder` | `'true'`/`'false'` + `"0,2,1,…"` | off / `''` | Saved shuffle order of songs |
| *(Text tab)* `f_showLockScreen` | `showLockScreen` | `'true'`/`'false'` | `'false'` | Always show lock screen first |
| *(Text tab)* `f_lockTitle` … | `texts__en__lockTitle` … | text | see §3.3 | Lock screen copy |

Note: booleans/dates are stored as **strings** (`'true'/'false'`), because the settings table is `text` valued.

### 3.2 Counter schema object (`js/app.js` lines 81–83)

```js
window.COUNTERS = [
  {id:'ct1', icon:'💬',
    labelKey:'ct1_label', dtKey:'ct1_datetime', tzKey:'ct1_datetime_tz',
    dispKey:'ct1_dispdate', showKey:'ct1_show',
    mainLabel:'ctMain1_label', mainDate:'ctMain1_date', mainRow:'ctMain1'},
  {id:'ct2', icon:'💕', /* ct2_* keys, ctMain2_* */},
  {id:'ct3', icon:'💍', /* ct3_* keys, ctMain3_* */}
];
```

Runtime counter value elements on the card: `counterTalkMain` (ct1), `counterYesMain` (ct2), `counterEngagedMain` (ct3).

### 3.3 Lock-related text field names (`js/app.js → TEXT_FIELDS`, lines 92–95)

```js
'openLine1','openLine2','cakeHint',
'lockTitle','lockSubtitle','lockDateText','countdownLabel',
'daysLabel','hoursLabel','minsLabel','secsLabel','openEarlyText','pwError','pwLockedMsg',
```

Runtime fallbacks (used when a text key is empty, see `renderLockFull()`):
`lockTitle='The surprise is locked'`, `countdownLabel='Unlocks in'`, `daysLabel='Days'`, `hoursLabel='Hours'`,
`minsLabel='Mins'`, `secsLabel='Secs'`, `openEarlyText='Open Early'`,
`pwLockedMsg='🔒 This surprise unlocks on {date}. Please come back then.'`.

### 3.4 Database backing (Supabase `public.settings`)

```sql
create table if not exists public.settings (
  id         bigserial primary key,
  key        text not null,       -- e.g. 'shared__unlockDateISO'
  value      text,                -- e.g. '2026-11-20T18:30:00.000Z'
  person_id  bigint,
  updated_at timestamptz not null default now()
);
create unique index if not exists settings_key_person_uq
  on public.settings (key, coalesce(person_id, 0));
```

Writes go through `sb.upSet(settings, pid)` (PostgREST upsert with `?on_conflict=key,person_id`),
reads through `sb.getSet(personId)` when loading a person into the admin (`fillAdminFields`) and into
the viewer (`loadPersonIntoState` → `S.CURR.shared`).

---

## 4. How the tab LOADS and SAVES (data flow)

```
Supabase settings rows ──sb.getSet(pid)──▶ S.CURR.shared {ct1_show:'true', unlockDateISO:'…Z', music_mode:'both', vol_card:'0.45', …}
                                              │
                          fillAdminFields() ◀─┘  (UTC→local via utcToZonedLocal(value, *_tz); tz selects populated from TZ_OPTIONS)
                                              │
                                    [admin edits #pane-lock fields]
                                              │
                          readAdminFields() ──▶ writes BACK into S.CURR.shared (local→UTC via zonedToUTC(local,tz))
                                              │
              saveAdminAll(): shuffle bookkeeping (musicOrder/mediaOrder) → Object.keys(shared) → settings['shared__'+k]
                                              │
                                   sb.upSet(settings, pid)  ▶ Supabase
```

Key details:
- **Datetime fields** (`ct1..ct3_datetime`, `unlockDateISO`, `hardExpiryISO`): the `<input type="datetime-local">` holds
  wall-clock time in the chosen timezone; storage is always **UTC ISO**. `fillAdminFields` converts UTC→local for display,
  `readAdminFields` converts local→UTC for storage and also persists the `*_tz` key so re-opening shows the same wall time.
- **Show checkboxes** load with `String(v)!=='false'` (i.e., missing ⇒ shown) while toggles like `showLockScreen` load with
  `v==='true'` (missing ⇒ off). Booleans are collected as `'true'`/`'false'` strings.
- **music_mode radios** load via `document.querySelectorAll('input[name="music_mode"]')` matching `sh.music_mode||'both'`;
  collect reads whichever radio is checked.
- **Song rows** load/collect in a `for(i=1..5)` loop over `song{i}_on/url/where`.
- **Slider value labels** (`f_vol_*_val`) update live through a delegated `document` `input` listener (line ~1958) — they
  are cosmetic only; the real value is read at Save time.
- **Shuffle semantics at Save** (`saveAdminAll`, lines 2401–2419): if `shuffleMusicOn==='true'`, indices of the enabled
  songs (slot order) are shuffled once and stored as `musicOrder="a,b,c"`; otherwise `musicOrder=''`. Same idea for
  `mediaOrder` / `privateMediaOrder` with `shuffleMediaOn`.

---

## 5. Runtime behavior — the 14 rules

### Lock / gate rules

1. **Gate decision** (person password modal, lines 410–422): after auth,
   `locked = unlockDate && !isNaN(unlockDate) && now < unlockDate`;
   `showLock = shared.showLockScreen === 'true'`.
   If `locked || showLock` → render + show `#lockScreen` and (only if truly locked) start the countdown;
   else go straight to `openOpeningFull()` (cake screen). Requester-mode does **not** bypass the lock here.
2. **Countdown tick** (`startCountdownFull`, 436–448): 1-second interval; Days/Hours/Mins/Secs zero-padded to 2 digits;
   when diff ≤ 0 the timer clears itself and freezes at `00`s (page refresh then flips to unlocked automatically).
3. **Open Early button** (449–455): if still locked → `alert(pwLockedMsg with {date}=unlockDate.toLocaleString())` and stay locked;
   if past the unlock time (or only `showLockScreen` forcing the screen) → clear timer, hide lock, open cake screen.
4. **Countdown cleanup**: `clearInterval(CD_T)` happens on Open-Early success; leaving the card re-runs the gate fresh on next login.

### Counters rules

5. **Per-counter visibility**: `$(c.mainRow).classList.toggle('counter-hidden', String(s[c.showKey])==='false')`;
   if ALL three are hidden, the whole `#countersMain` box gets `.hidden-box`.
6. **Labels come ONLY from the Lock tab** (`s[c.labelKey]`, FIX 1 comment line 516) — not from the Text tab.
   The "Display date text" (`ctN_dispdate`) renders under the live number (`c.mainDate`).
7. **Live elapsed time** (`updateCounters`, 569–583): formats `now − ctN_datetime` as `D d H h M m S s`;
   future date → `'Just started 💕'`; empty → `'—'`. A 1-second `setInterval` refreshes it only while the viewer screen is active.

### Music routing rules

8. **Single shared player**: one `<audio id="audioPlayer">` element serves card AND slideshow; context tracked by
   `CURR_CTX` ('card'|'slideshow'), playlist `CURR_LIST`, index `CURR_IDX`, flag `MUSIC_ON`. Volume per context via
   `getVol(ctx)`: `video→vol_video`, `videomusic→vol_video_music`, `slideshow→vol_slide`, else `vol_card`
   (defaults 1.0 / 0.35 / 0.85 / 0.45 respectively; parsed with parseFloat and `||default` guard).
9. **Routing gates** (`buildPlaylistFor(ctx)`, FIX 4): `music_mode==='card'` ⇒ slideshow playlist is EMPTY;
   `music_mode==='slideshow'` ⇒ card playlist is EMPTY; `'both'` ⇒ both contexts get songs. Then per-song filter:
   include slot i only if `song{i}_on==='true'` AND trimmed `song{i}_url` non-empty AND (`song{i}_where==='both'` OR `===ctx`).
10. **Card startup**: opening the viewer calls `startMusicFor('card')` (line 493). `startMusicFor` shows/hides the floating
    `#musicToggle` based on playlist length; empty list pauses audio (if switching context) and returns; same-context
    already-playing ⇒ no-op; otherwise rebuilds list, sets ctx, and `playNext()`.
11. **Looping & autoplay handling**: `audioPlayer` `ended` event ⇒ `playNext()` modulo list length (endless loop).
    Play is wrapped in `.catch()` — if the browser blocks autoplay (no user gesture yet), `MUSIC_ON=false` and the
    toggle shows 🔇; the user can tap `#musicToggle` to start/resume manually.
12. **Handoff / position memory**: entering the slideshow calls `SS_ensureMusicPlaying()` (1112–1143):
    - mode `'card'` ⇒ return immediately (FIX 4: never start new music for slideshow);
    - preferred list = slideshow playlist, fallback = card playlist (mode 'both');
    - if audio is paused/no src ⇒ take ownership: `SS_ownPlaylist=wantList; SS_ownIdx=0; a.loop=false;
      a.volume=getVol(ssList.length?'slideshow':'card'); play()`;
    - if already playing and not ducked ⇒ just raise volume to `vol_slide`.
    While owned, track-end advances via `SS_nextTrackIfOwn()` (round-robin over `SS_ownPlaylist` at `vol_slide`).
    Leaving the slideshow (`SS_close`, 1566–1587) resets duck state, clears `SS_ownPlaylist`, restores
    `a.volume=getVol('card')` and calls `startMusicFor('card')` again — the card resumes its own playlist.
    Photo slides (non-video branch, 1496–1517, FIX 4): if paused and `CURR_LIST` non-empty ⇒ resume at context volume;
    else `SS_ensureMusicPlaying()`; then unduck to `SS_musicTargetVol()`.
13. **Video-slide duck/mute/guard** (slide switch, 1477–1482):
    - Video slide + `musicDuringVideo==='true'` ⇒ music keeps playing, faded (300 ms steps via `SS_fadeMusic`) to
      `vol_video_music`, `SS_musicDucked=false`;
    - Video slide + toggle OFF ⇒ music **ducks** to `SS_duckedMusicVol() = max(0.05, vol_slide × 0.35)` (~35%, the UI says 40%),
      `SS_musicDucked=true`;
    - The video element itself plays muted-with-unmute-button (`SS_playVideo` + `.unmute-btn`), its loudness governed by
      `vol_video` where applicable; other slides' videos are reset via `SS_resetVideo`.
    - `SS_musicTargetVol()` = `musicDuringVideo ? vol_video_music : vol_slide` — used whenever returning to photo slides.
14. **String persistence & shuffle semantics**: every value above is persisted as a string (`'true'/'false'`, `'0.45'`,
    ISO datetimes, comma-index lists). `musicOrder` is honored **only** when `shuffleMusicOn==='true'` (FIX 5):
    indices must be a permutation covering the current enabled-song count, else fall back to slot order; leftovers are
    appended defensively. Media order uses `mediaOrder` (normal) / `privateMediaOrder` (private ctx), gated by `shuffleMediaOn`.

---

## 6. Function inventory (complete)

### js/app.js — Lock runtime
| Function / handler | Line | Role |
|---|---|---|
| `renderLockFull()` | 425 | Fills lock title/subtitle+date/countdown label/CD labels/Open-Early text from texts w/ fallbacks |
| `startCountdownFull(unlockDate)` | 436 | 1-s interval updating `cdDays/Hours/Mins/Secs`; self-clears at ≤0 |
| `$('openEarlyBtn').onclick` | 449 | Locked ⇒ alert `pwLockedMsg{date}`; unlocked ⇒ hide lock, `openOpeningFull()` |
| `openOpeningFull()` | 457 | Cake/opening screen (post-lock target) |
| gate block in pw-submit | 410–422 | Computes `locked`/`showLock`, routes to lock vs opening |

### js/app.js — Counters runtime
| Function | Line | Role |
|---|---|---|
| `COUNTERS.forEach` in card render | 515 | label/dispdate/show per counter, `counter-hidden`, `hidden-box` |
| `updateCounters()` | 569 | live elapsed formatting for the 3 counters |
| `setInterval(...,1000)` | 584 | refresh counters while viewer active |

### js/app.js — Music (public API surface)
| Function | Line | Role |
|---|---|---|
| `getVol(ctx)` | 867 | Context → volume (video/videomusic/slideshow/card) |
| `buildPlaylistFor(ctx)` | 871 | Mode gates + per-song filters + shuffle-order application |
| `playNext()` | 893 | Advance `CURR_IDX` round-robin, set src/volume, play w/ catch |
| `startMusicFor(ctx)` | 902 | Toggle visibility, no-op/pause rules, kick off playlist |
| `audioPlayer 'ended'` listener | 916 | Loop: `if(MUSIC_ON)playNext()` |
| `musicToggle.onclick` | 917 | Manual pause/resume + 🔊/🔇 icon |

### js/app.js — Slideshow music (SS_*)
| Function | Line | Role |
|---|---|---|
| `SS_fadeMusic(target,duration)` | 1088 | 30-ms-step volume ramp (duck/unduck animation) |
| `SS_normalMusicVol()` / `SS_duckedMusicVol()` | 1105/1106 | `vol_slide` / `max(0.05, vol_slide×0.35)` |
| `SS_isMusicDuringVideo()` | 1108 | reads `musicDuringVideo==='true'` |
| `SS_musicTargetVol()` | 1109 | videomusic vs normal depending on toggle |
| `SS_ensureMusicPlaying()` | 1112 | Handoff into slideshow (rule 12) |
| `SS_nextTrackIfOwn()` | 1145 | Own-playlist round-robin at `vol_slide` |
| `SS_musicDucked` flag | 1015 | tri-state-ish duck bookkeeping (true/false) |
| `SS_close()` | 1566 | Restore card context (rule 12 exit) |

### js/app.js — Admin apply/collect/save
| Function | Line | Role |
|---|---|---|
| `fillAdminFields()` | ~1859 | shared → pane-lock inputs (tz conversion, radios, loops, sliders) |
| `readAdminFields()` | ~1914 | pane-lock inputs → shared (tz conversion, 'true'/'false' strings) |
| slider-label `input` listener | ~1958 | live `*_val` spans |
| `saveAdminAll()` | 2397 | shuffle bookkeeping → flatten `shared__*` → `sb.upSet` + table wipes/re-inserts |
| `shuffleArray(arr)` | utils | Fisher–Yates used for `musicOrder`/`mediaOrder` |

---

## 7. Porting checklist (replicate this section in a new site)

1. **HTML**: copy `#pane-lock` verbatim (§2.1) into your admin panel pane container, plus the tab button
   `data-pane="pane-lock"`; copy the `#lockScreen` markup (§2.3) and an `<audio id="audioPlayer">` + floating
   `#musicToggle` button into the viewer shell. Add the four Text-tab fields (`f_showLockScreen`, `f_lockTitle`,
   `f_lockSubtitle`, `f_lockDateText`, `f_pwLockedMsg`) if your split matches.
2. **CSS**: bring `.lock-screen/.lock-content/.countdown/.cd-box/.cd-num/.cd-label/.open-early-btn/.lock-hearts`,
   `.counter-edit-card`, `.tz-row`, `.slider-row/.slider-val`, `.toggle-box`, `.panel-pane/.panel-tab` (from
   `css/styles.css`; original project kept lock styles in `css/lock.css`).
3. **JS files/logic to copy**: `COUNTERS` + `TEXT_FIELDS` schema arrays; `renderLockFull/startCountdownFull/openEarlyBtn`;
   the gate block; `updateCounters` + interval; the whole music block (`getVol/buildPlaylistFor/playNext/startMusicFor/
   ended-listener/musicToggle`) and the SS_* music functions + the two duck branches in the slide-switch function;
   `fillAdminFields/readAdminFields` slices for these ids; `saveAdminAll`'s `shared__` flattening + shuffle bookkeeping;
   `zonedToUTC/utcToZonedLocal/fillTzSelect/shuffleArray` helpers.
4. **Wiring points**: (a) call `startMusicFor('card')` when the card becomes visible; (b) call `SS_ensureMusicPlaying()`
   on slideshow open and per-photo-slide; (c) run the video-duck branch on every slide change; (d) restore card music in
   the slideshow-close handler; (e) bind Save → `readAdminFields()` → `upSet`; Load → `getSet()` → `fillAdminFields()`.
5. **Storage key mapping**: keep the exact `shared__*` key names in §3.1 (they're referenced by string everywhere),
   keep booleans as `'true'/'false'` strings, datetimes as UTC ISO + companion `*_tz` keys, and orders as comma-index
   strings (`musicOrder`, `mediaOrder`, `privateMediaOrder`).
6. **Backend**: create the `public.settings (key,value,person_id)` table with the unique `(key, coalesce(person_id,0))`
   index (§3.4) and an upsert path `?on_conflict=key,person_id`.
7. **Test matrix**:
   - Lock: future unlock ⇒ lock+countdown ticks, Open-Early alerts; past unlock ⇒ cake directly; `showLockScreen=on`
     with past/empty unlock ⇒ lock without countdown, Open-Early proceeds.
   - Counters: each show toggle, all-off hides box, label/dispdate render, future date ⇒ "Just started 💕".
   - Music: mode=card ⇒ silent slideshow; mode=slideshow ⇒ silent card; per-song `where` filters; empty URLs skipped;
     toggle 🔇/🔇 resume after blocked autoplay; playlist loops end-to-start; enter/exit slideshow preserves playback
     and swaps volumes (0.45↔0.85 defaults).
   - Video slides: toggle OFF ⇒ duck to ~35% and back on photos; toggle ON ⇒ rides at `vol_video_music`; unmute button
     works; leaving slideshow mid-video restores card music.
   - Shuffle: enable ⇒ save twice produces different `musicOrder`; disable ⇒ `musicOrder` cleared and slot order restored;
     add/remove a song ⇒ stale permutation falls back gracefully.
   - Reload person ⇒ all wall-clock datetimes re-display identically in their chosen timezone.
