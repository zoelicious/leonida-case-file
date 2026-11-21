/* Leonida Case File — tracker logic. Vanilla JS, no network at run time: it only
   fetches its own data files (app/data/trophies.json, app/data/sources.json) and
   keeps progress in localStorage. Every number on screen is counted from the data,
   never typed in by hand. */
(function () {
  'use strict';

  var LS_KEY = 'leonida-case-file-v1';
  var DEMO_EARNED = [2, 3, 8, 9, 10, 16, 18, 20, 21, 33, 44, 46, 51]; // 13 of 55
  var DEMO_MEDITATIONS = ['balcony', 'ascent']; // 2 of 18

  var trophies = [];
  var sources = [];
  var state = { earned: {}, meditations: {}, spoiler: true };
  var filter = 'all';
  var query = '';
  var sortMode = 'roadmap';
  var selectedId = 28; // Positive Mental Attitude opens on the cover

  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
  function gradeLetter(g) { return g === 'platinum' ? 'P' : g.charAt(0).toUpperCase(); }
  function citeList(nums) {
    return nums.map(function (n) { return '[' + n + ']'; }).join(' ');
  }

  function loadState() {
    try {
      var raw = localStorage.getItem(LS_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          state.earned = parsed.earned || {};
          state.meditations = parsed.meditations || {};
          state.spoiler = parsed.spoiler !== false;
          return;
        }
      }
    } catch (e) { /* corrupted save: fall through to demo */ }
    DEMO_EARNED.forEach(function (id) { state.earned[id] = true; });
    DEMO_MEDITATIONS.forEach(function (k) { state.meditations[k] = true; });
    state.spoiler = true;
    saveState();
  }
  function saveState() {
    try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch (e) { /* storage full/blocked */ }
  }

  function byId(id) {
    for (var i = 0; i < trophies.length; i++) if (trophies[i].id === id) return trophies[i];
    return null;
  }
  function earnedCount() {
    var n = 0;
    trophies.forEach(function (t) { if (state.earned[t.id]) n++; });
    return n;
  }
  function gradeCount(g) {
    var got = 0, total = 0;
    trophies.forEach(function (t) {
      if (t.grade === g) { total++; if (state.earned[t.id]) got++; }
    });
    return got + '/' + total;
  }
  function isHiddenSpoiler(t) {
    return t.hidden && state.spoiler && !state.earned[t.id] && !t.revealed;
  }

  /* ---------- audit numbers, counted from the data ---------- */
  function auditNumbers() {
    var stepsTotal = 0, stepsCited = 0, stepsTwoPlus = 0, guidesCited = 0;
    var verdicts = { disputed: 0, unconfirmed: 0, confirmed: 0 };
    trophies.forEach(function (t) {
      if (t.sources && t.sources.length) guidesCited++;
      (t.steps || []).forEach(function (s) {
        stepsTotal++;
        if (s.sources && s.sources.length) stepsCited++;
        if (s.sources && s.sources.length >= 2) stepsTwoPlus++;
      });
      if (t.verdict && verdicts[t.verdict.status] !== undefined) verdicts[t.verdict.status]++;
    });
    var vTotal = verdicts.disputed + verdicts.unconfirmed + verdicts.confirmed;
    return {
      stepsTotal: stepsTotal, stepsCited: stepsCited, stepsTwoPlus: stepsTwoPlus,
      guidesCited: guidesCited, verdicts: verdicts, verdictTotal: vTotal
    };
  }
  function citedBy(n) {
    var count = 0;
    trophies.forEach(function (t) {
      var seen = {};
      (t.steps || []).forEach(function (s) { (s.sources || []).forEach(function (x) { seen[x] = 1; }); });
      (t.sources || []).forEach(function (x) { seen[x] = 1; });
      if (t.verdict) {
        if (t.verdict.a) (t.verdict.a.sources || []).forEach(function (x) { seen[x] = 1; });
        if (t.verdict.b) (t.verdict.b.sources || []).forEach(function (x) { seen[x] = 1; });
      }
      if (seen[n]) count++;
    });
    return count;
  }

  /* ---------- header / audit strip ---------- */
  function renderHeader() {
    var earned = earnedCount();
    $('progressText').textContent = earned + ' / 55 earned';
    $('gradeBreak').textContent = 'P ' + gradeCount('platinum') + ' · G ' + gradeCount('gold') +
      ' · S ' + gradeCount('silver') + ' · B ' + gradeCount('bronze');
    $('progressFill').style.width = (earned / 55 * 100).toFixed(1) + '%';
    $('spoilerToggle').checked = state.spoiler;
    var a = auditNumbers();
    $('auditStrip').innerHTML =
      '55 official · 1P 2G 6S 46B · 28 hidden · ' + a.guidesCited + '/55 guides cite a source · ' +
      a.stepsCited + '/' + a.stepsTotal + ' steps cited · ' + a.stepsTwoPlus + ' steps cite 2+ sources · ' +
      sources.length + ' sources read 20–21 Nov 2026 · ' +
      a.verdicts.disputed + ' disputed · ' + a.verdicts.unconfirmed + ' unconfirmed · ' +
      a.verdicts.confirmed + ' confirmed = ' + a.verdictTotal + ' verdicts';
  }

  /* ---------- filters ---------- */
  var FILTERS = [
    ['all', 'All 55'], ['story', 'Story'], ['missable', 'Missable'], ['collectibles', 'Collectibles'],
    ['activities', 'Activities'], ['online', 'Online'], ['hidden', 'PSN-hidden 28'],
    ['disputed', 'Disputed'], ['unconfirmed', 'Unconfirmed'], ['earned', 'Earned'], ['notearned', 'Not earned']
  ];
  function filterCount(key) {
    if (key === 'all') return trophies.length;
    if (key === 'earned') return earnedCount();
    if (key === 'notearned') return trophies.length - earnedCount();
    if (key === 'missable') return trophies.filter(function (t) { return t.missable; }).length;
    if (key === 'hidden') return trophies.filter(function (t) { return t.hidden; }).length;
    if (key === 'disputed') return trophies.filter(function (t) { return t.verdict && t.verdict.status === 'disputed'; }).length;
    if (key === 'unconfirmed') return trophies.filter(function (t) { return t.verdict && t.verdict.status === 'unconfirmed'; }).length;
    return trophies.filter(function (t) { return t.kind === key; }).length;
  }
  function matchesFilter(t) {
    if (filter === 'all') return true;
    if (filter === 'earned') return !!state.earned[t.id];
    if (filter === 'notearned') return !state.earned[t.id];
    if (filter === 'missable') return !!t.missable;
    if (filter === 'hidden') return !!t.hidden;
    if (filter === 'disputed') return t.verdict && t.verdict.status === 'disputed';
    if (filter === 'unconfirmed') return t.verdict && t.verdict.status === 'unconfirmed';
    return t.kind === filter;
  }
  function matchesQuery(t) {
    if (!query) return true;
    var hay = (t.name + ' ' + t.description + ' ' + t.guide).toLowerCase();
    return hay.indexOf(query) !== -1;
  }
  function sortedList(list) {
    var arr = list.slice();
    if (sortMode === 'official') arr.sort(function (a, b) { return a.id - b.id; });
    else if (sortMode === 'roadmap') arr.sort(function (a, b) { return (a.stage - b.stage) || (a.id - b.id); });
    else if (sortMode === 'grade') {
      var rank = { platinum: 0, gold: 1, silver: 2, bronze: 3 };
      arr.sort(function (a, b) { return rank[a.grade] - rank[b.grade] || (a.id - b.id); });
    } else if (sortMode === 'name') arr.sort(function (a, b) { return a.name.localeCompare(b.name); });
    return arr;
  }

  function renderFilters() {
    $('filterChips').innerHTML = FILTERS.map(function (f) {
      return '<button type="button" class="chip' + (filter === f[0] ? ' active' : '') +
        '" data-filter="' + f[0] + '">' + f[1] + ' ' + filterCount(f[0]) + '</button>';
    }).join('');
  }

  function renderChecklist() {
    renderFilters();
    var list = sortedList(trophies.filter(function (t) { return matchesFilter(t) && matchesQuery(t); }));
    $('listCount').textContent = list.length + ' shown';
    $('checklist').innerHTML = list.map(function (t) {
      var earned = !!state.earned[t.id];
      var spoiler = isHiddenSpoiler(t);
      var name = spoiler ? 'Hidden trophy — hidden until earned' : esc(t.name);
      var desc = spoiler ? 'Reveal it to read the official description.' : esc(t.description);
      var pills = '';
      if (t.missable) pills += '<span class="pill missable">POSSIBLY MISSABLE</span>';
      if (t.watch) pills += '<span class="pill watch">WATCH</span>';
      if (t.verdict) pills += '<span class="pill ' + t.verdict.status + '">' + t.verdict.status.toUpperCase() + '</span>';
      if (t.hidden && !spoiler) pills += '<span class="pill hidden-pill">HIDDEN ON PSN</span>';
      return '<li data-id="' + t.id + '" class="' + (t.id === selectedId ? 'selected' : '') + (earned ? ' earned' : '') + '">' +
        '<input type="checkbox" data-earn="' + t.id + '"' + (earned ? ' checked' : '') + ' aria-label="Mark earned">' +
        '<span class="grade ' + t.grade + '">' + gradeLetter(t.grade) + '</span>' +
        '<span><span class="t-name' + (earned ? ' earned' : '') + '">' + name + '</span>' + pills +
        '<br><span class="t-desc">' + desc + '</span>' +
        '<br><span class="t-meta">#' + t.id + ' · ' + t.grade + ' · Stage S' + t.stage +
        (t.count ? ' · ' + t.count + ' to do' : '') + '</span></span></li>';
    }).join('');
  }

  /* ---------- detail panel ---------- */
  function verdictPill(v) {
    return '<span class="pill ' + v.status + '">' + v.status.toUpperCase() + '</span>';
  }
  function renderDetail() {
    var t = byId(selectedId) || trophies[0];
    if (!t) { $('detail').innerHTML = ''; return; }
    var spoiler = isHiddenSpoiler(t);
    var html = '';
    html += '<div class="detail-head"><div><span class="case-no">CASE FILE #' + t.id + ' OF 55 · STAGE S' + t.stage +
      ' · ' + t.kind.toUpperCase() + '</span><h2>' + (spoiler ? 'Hidden trophy' : esc(t.name)) + '</h2></div>' +
      '<span class="grade ' + t.grade + '" style="width:26px;height:26px;line-height:26px;font-size:14px">' + gradeLetter(t.grade) + '</span></div>';
    if (t.missable) html += '<p><span class="pill missable">POSSIBLY MISSABLE</span></p>';
    if (t.verdict) html += '<p>Verdict ' + verdictPill(t.verdict) + '</p>';
    if (spoiler) {
      html += '<p class="hidden-trophy">Hidden trophy — hidden until earned. This is a story trophy: its name and ' +
        'description stay hidden while the spoiler setting is on.</p>' +
        '<p><button type="button" data-reveal="' + t.id + '">Reveal this trophy</button> ' +
        '<span class="t-meta">Revealing shows the official name and description only — the guide stays cited either way.</span></p>';
      $('detail').innerHTML = html;
      return;
    }
    html += '<div class="official-box"><span class="lbl">OFFICIAL DESCRIPTION — AS PLAYSTATION PUBLISHES IT</span><br>' +
      esc(t.description) + '</div>';
    html += '<p class="guide-text">' + esc(t.guide) + ' <span class="cite">' + citeList(t.sources || []) + '</span></p>';
    html += '<h3>Steps</h3><ol class="steps">' + (t.steps || []).map(function (s) {
      return '<li>' + esc(s.text) + ' <span class="cite">' + citeList(s.sources || []) + '</span></li>';
    }).join('') + '</ol>';

    if (t.id === 28) {
      var done = Object.keys(state.meditations).filter(function (k) { return state.meditations[k]; }).length;
      html += '<div class="math-line">The count, checked: 8 spots × 2 meditations = 16, + balcony 1 + Ascent 1 = 18 meditations at 10 spots.</div>';
      html += '<div class="counter-row"><span class="stepper">YOUR COUNT − <button type="button" data-med="-1">−</button> ' +
        done + '/18 <button type="button" data-med="+1">+</button> +</span>' +
        '<span class="mini-bar"><span style="width:' + (done / 18 * 100).toFixed(1) + '%"></span></span></div>';
      html += '<h3>Tick each meditation off, one by one</h3><div class="item-checks">' +
        (t.items || []).map(function (it) {
          return '<label><input type="checkbox" data-medit="' + it.id + '"' +
            (state.meditations[it.id] ? ' checked' : '') + '> ' + esc(it.label) + '</label>';
        }).join('') + '</div>';
    } else if (t.count) {
      html += '<p class="t-meta">Target: ' + t.count + ' — track it in the game&rsquo;s Progress screen; tick the trophy above when it pops.</p>';
    }

    if (t.verdict) {
      var v = t.verdict;
      html += '<div class="verdict-box"><h3>VERDICT ' + verdictPill(v) + '</h3>';
      if (v.a && v.b) {
        html += '<div class="versus"><div><b>Version A</b><br>' + esc(v.a.text) + ' <span class="cite">' + citeList(v.a.sources) + '</span></div>' +
          '<div><b>Version B</b><br>' + esc(v.b.text) + ' <span class="cite">' + citeList(v.b.sources) + '</span></div></div>';
      }
      html += '<p class="call-line">OUR CALL — ' + esc(v.call) + '</p>';
      if (v.note) html += '<p>' + esc(v.note) + '</p>';
      html += '</div>';
    }
    if (t.safePlay) {
      html += '<div class="safeplay-box"><h3>SAFE PLAY</h3><p>' + esc(t.safePlay) + '</p></div>';
    }
    if (t.lastChance) {
      html += '<p class="last-chance"><b>LAST CHANCE:</b> ' + esc(t.lastChance) + '</p>';
    }
    $('detail').innerHTML = html;
  }

  /* ---------- source rail ---------- */
  var RELIABILITY = {
    'FULL GUIDE': 'full', 'KEY SECTIONS': 'key', 'LIST ONLY': 'list', 'ECHO': 'echo', 'UNVERIFIED': 'unver'
  };
  function renderRail() {
    var html = '<div class="rail-title">SOURCES — READ 20–21 NOV 2026</div>';
    html += sources.map(function (s) {
      return '<div class="source-item"><span class="s-name">[' + s.n + '] ' + esc(s.name) + '</span>' +
        '<span class="badge ' + (RELIABILITY[s.reliability] || 'list') + '">' + esc(s.reliability) + '</span>' +
        '<br><span class="s-title">' + esc(s.title) + '</span>' +
        '<br><span class="s-meta">Cited by ' + citedBy(s.n) + ' of 55 guides · Read ' + esc(s.read) +
        ' · <a href="' + esc(s.url) + '" target="_blank" rel="noopener">open source</a></span></div>';
    }).join('');
    html += '<div class="how-box"><b>HOW THIS GUIDE WAS BUILT.</b> Names, descriptions and grades are the official ' +
      'list as PlayStation publishes it. Every step cites the guide it came from, in our own words — a source is ' +
      'cited, never copied. Where guides disagree, both versions are shown with a verdict. The game launched ' +
      '19 Nov 2026, so nothing here is confirmed by playing it yet.</div>';
    $('sourceRail').innerHTML = html;
  }

  /* ---------- cover extras: Next Up + stage chips ---------- */
  var NEXT_UP = [
    ['1', 'CHAPTER 1 FIRST', 'Balcony meditation (PMA) before leaving Chapter 1 — the one possibly missable step.'],
    ['2', 'STORY CH. 2–4 + FINALE', '9 trophies; free-roam continues after the credits, no mission replay.'],
    ['3', 'STRANGERS & SIDE STORIES', '7 trophies; Andy is Lucia-only, Tyrone & Bret are Jason-only.'],
    ['4', 'ACTIVITIES & CHALLENGES', '19 trophies; 42 shooting-range golds, 250 stunts, 50 of 80 challenges.'],
    ['5', 'COLLECTIBLES & 100%', '15 trophies; cards, WAiNK 100, vehicles — then A Long Road pops.']
  ];
  function renderNextUp() {
    $('nextUp').innerHTML = '<h2>NEXT UP ·<br>ROADMAP ORDER</h2>' + NEXT_UP.map(function (s) {
      return '<div class="next-step"><b><span class="n">' + s[0] + '</span>' + s[1] + '</b>' + s[2] + '</div>';
    }).join('');
    var stages = [1, 2, 3, 4, 5].map(function (n) {
      var count = trophies.filter(function (t) { return t.stage === n; }).length;
      return { n: n, count: count };
    });
    var labels = { 1: 'Chapter 1 first', 2: 'Story Ch. 2–4 + finale', 3: 'Strangers', 4: 'Activities', 5: 'Collectibles & 100%' };
    $('stageChips').innerHTML = stages.map(function (s) {
      return '<span class="stage-chip">S' + s.n + ' · ' + labels[s.n] + ' <b>' + s.count + '</b></span>';
    }).join('') + '<span class="stage-chip">Total <b>55</b></span>';
  }

  /* ---------- roadmap tab ---------- */
  var STAGE_META = {
    1: { name: 'Chapter 1 first', hours: 'Opening · Chapter 1', note: 'Do the balcony meditation now; everything else in this stage pops from the opening missions.' },
    2: { name: 'Story, Chapters 2–4 + finale', hours: 'Story · 60–80 h total [1][2]', note: 'Chapter and mission trophies pop as you play. No mission replay, so keep manual saves.' },
    3: { name: 'Strangers & side stories', hours: 'Side stories · ~10 h [1]', note: 'Final missions for Andy, Kenton, Billy, Randy, Tyrone — plus 8 stranger strands and Bret.' },
    4: { name: 'Activities & challenges', hours: 'Open world · ongoing', note: 'Shooting ranges, races, stunts, challenges and crime trophies — most pop during cleanup.' },
    5: { name: 'Collectibles, money & 100%', hours: 'Cleanup · ~100 h [1][2]', note: 'Cards, WAiNK scans, vehicles, garages and the 100% checklist — then A Long Road and the platinum.' }
  };
  function renderRoadmap() {
    $('roadmapMeta').innerHTML =
      '<span class="meta-chip">Time to platinum <b>~200 h</b> [1][2][6] — <span class="pill disputed">DISPUTED</span> 250–300 h [4][5]</span>' +
      '<span class="meta-chip">Difficulty <b>4/10</b> [1][2] — <span class="pill disputed">DISPUTED</span> 7/10 in some guides [9]</span>' +
      '<span class="meta-chip"><b>1</b> playthrough [1][6]</span>' +
      '<span class="meta-chip"><b>0</b> online trophies [1][6]</span>' +
      '<span class="meta-chip">No mission replay [1][6]</span>' +
      '<span class="meta-chip"><b>5</b> chapters [1][2]</span>' +
      '<span class="meta-chip">Cheats disable trophies [1][6]</span>';
    $('roadmapStages').innerHTML = [1, 2, 3, 4, 5].map(function (n) {
      var members = trophies.filter(function (t) { return t.stage === n; });
      var earned = members.filter(function (t) { return state.earned[t.id]; }).length;
      var m = STAGE_META[n];
      return '<div class="stage-card"><h3>STAGE S' + n + ' — ' + m.name + '</h3>' +
        '<div class="s-count">' + earned + '/' + members.length + ' earned</div>' +
        '<div class="mini-bar" style="margin:5px 0"><span style="width:' + (members.length ? earned / members.length * 100 : 0) + '%"></span></div>' +
        '<div class="s-hours">' + m.hours + '</div><p style="font-size:11.5px;color:#b9bec7">' + m.note + '</p>' +
        '<ul>' + members.slice(0, 6).map(function (t) {
          return '<li>' + (state.earned[t.id] ? '✓ ' : '') + esc(isHiddenSpoiler(t) ? 'Hidden trophy' : t.name) + '</li>';
        }).join('') + (members.length > 6 ? '<li>…+' + (members.length - 6) + ' more</li>' : '') + '</ul></div>';
    }).join('');
    $('methodBox').innerHTML = '<h3>HOW THIS ROADMAP WAS BUILT</h3><p>Stages are grouped from the official ' +
      'descriptions: chapter trophies first, then mission trophies, then stranger finales, then activities and ' +
      'collectibles, then the 100% cleanup. The order and the risk flags come from the cited guides — PowerPyx ' +
      'runs the same three steps (story 60–80 h, 100% checklist ~100 h, Strangers &amp; cleanup ~10 h) [1] — ' +
      'not from memory. Where the guides disagree on time (200 h vs 250–300 h) or difficulty (4/10 vs 7/10), ' +
      'both numbers are shown above.</p>';
  }

  /* ---------- missables tab ---------- */
  function renderMissables() {
    var pma = byId(28);
    var watch = trophies.filter(function (t) { return t.watch && t.id !== 28; });
    var html = '<div class="missable-card"><h3>POSSIBLY MISSABLE — Positive Mental Attitude (#28)</h3>' +
      '<p>' + esc(pma.guide) + ' <span class="cite">' + citeList(pma.sources) + '</span></p>' +
      '<div class="safeplay-box"><h3>SAFE PLAY</h3><p>' + esc(pma.safePlay) + '</p></div>' +
      '<p class="last-chance"><b>LAST CHANCE:</b> ' + esc(pma.lastChance) + '</p></div>';
    html += watch.map(function (t) {
      return '<div class="missable-card watch-card"><h3>WATCH — ' + esc(t.name) + ' (#' + t.id + ')</h3>' +
        '<p>' + esc(t.guide) + ' <span class="cite">' + citeList(t.sources) + '</span></p>' +
        (t.safePlay ? '<div class="safeplay-box"><h3>SAFE PLAY</h3><p>' + esc(t.safePlay) + '</p></div>' : '') +
        '<p class="last-chance"><b>LAST CHANCE:</b> ' + esc(t.lastChance || 'Safe after the credits.') + '</p></div>';
    }).join('');
    html += '<div class="missable-card"><h3>SAFE AFTER THE CREDITS</h3><p>Every other trophy can be earned in ' +
      'free-roam after the story: the 100% checklist opens under Progress &gt; Stats after the credits, ' +
      'quest givers return, and nothing else has a point of no return. <span class="cite">[1][2][6]</span></p></div>';
    $('missablesList').innerHTML = html;
  }

  /* ---------- sources tab ---------- */
  function renderSources() {
    var html = '<h2>Source matrix — who says what</h2><p style="color:#b9bec7">Each cell counts the guides ' +
      'that cite that source. “Cited by” is counted from the data, not typed in.</p>' +
      '<table class="matrix-table"><thead><tr><th>Source</th><th>Reliability</th><th>Read</th>' +
      '<th>Guides citing it</th><th>Steps citing it</th></tr></thead><tbody>';
    html += sources.map(function (s) {
      var steps = 0;
      trophies.forEach(function (t) { (t.steps || []).forEach(function (st) { if ((st.sources || []).indexOf(s.n) !== -1) steps++; }); });
      return '<tr><td>[' + s.n + '] <a href="' + esc(s.url) + '" target="_blank" rel="noopener">' + esc(s.name) + '</a> — ' +
        esc(s.title) + '</td><td>' + esc(s.reliability) + '</td><td>' + esc(s.read) + '</td>' +
        '<td class="num">' + citedBy(s.n) + ' / 55</td><td class="num">' + steps + '</td></tr>';
    }).join('');
    html += '</tbody></table><ul class="source-detail">';
    html += sources.map(function (s) {
      return '<li><b>[' + s.n + '] ' + esc(s.name) + '</b> — ' + esc(s.note) + '</li>';
    }).join('');
    html += '</ul>';
    $('sourceMatrix').innerHTML = html;
  }

  /* ---------- tabs / hash ---------- */
  function showTab(name) {
    document.querySelectorAll('.tab').forEach(function (b) { b.classList.toggle('active', b.dataset.tab === name); });
    document.querySelectorAll('.tabpage').forEach(function (p) { p.classList.toggle('active', p.id === 'tab-' + name); });
    if (name === 'roadmap') renderRoadmap();
    if (name === 'missables') renderMissables();
    if (name === 'sources') renderSources();
  }
  function readHash() {
    var h = (location.hash || '').replace(/^#/, '');
    var parts = h.split('&');
    parts.forEach(function (p) {
      var kv = p.split('=');
      if (kv[0] === 'tab' && ['tracker', 'roadmap', 'missables', 'sources'].indexOf(kv[1]) !== -1) showTab(kv[1]);
      if (kv[0] === 'trophy') { var id = parseInt(kv[1], 10); if (byId(id)) { selectedId = id; showTab('tracker'); } }
    });
  }

  function renderAll() {
    renderHeader();
    renderChecklist();
    renderDetail();
    renderRail();
    renderNextUp();
  }

  /* ---------- events ---------- */
  document.addEventListener('click', function (e) {
    var earn = e.target.closest('[data-earn]');
    if (earn) {
      e.stopPropagation();
      var id = parseInt(earn.dataset.earn, 10);
      state.earned[id] = earn.checked;
      saveState(); renderHeader(); renderChecklist();
      return;
    }
    var li = e.target.closest('.checklist li');
    if (li) { selectedId = parseInt(li.dataset.id, 10); renderChecklist(); renderDetail(); return; }
    var chip = e.target.closest('[data-filter]');
    if (chip) { filter = chip.dataset.filter; renderChecklist(); return; }
    var tab = e.target.closest('.tab');
    if (tab) { showTab(tab.dataset.tab); return; }
    var reveal = e.target.closest('[data-reveal]');
    if (reveal) {
      var t = byId(parseInt(reveal.dataset.reveal, 10));
      if (t) { t.revealed = true; renderChecklist(); renderDetail(); }
      return;
    }
    var med = e.target.closest('[data-med]');
    if (med) {
      var items = (byId(28).items || []).map(function (it) { return it.id; });
      var done = items.filter(function (k) { return state.meditations[k]; });
      if (med.dataset.med === '+1' && done.length < 18) {
        var next = items.find(function (k) { return !state.meditations[k]; });
        if (next) state.meditations[next] = true;
      } else if (med.dataset.med === '-1' && done.length > 0) {
        delete state.meditations[done[done.length - 1]];
      }
      saveState(); renderDetail();
      return;
    }
    var medit = e.target.closest('[data-medit]');
    if (medit) {
      state.meditations[medit.dataset.medit] = medit.checked;
      saveState(); renderDetail();
      return;
    }
    if (e.target.id === 'exportBtn') {
      var blob = new Blob([JSON.stringify({ earned: Object.keys(state.earned).filter(function (k) { return state.earned[k]; }).map(Number), meditations: Object.keys(state.meditations).filter(function (k) { return state.meditations[k]; }) }, null, 2)], { type: 'application/json' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'leonida-case-file-progress.json';
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
      return;
    }
    if (e.target.id === 'importBtn') { $('importFile').click(); return; }
    if (e.target.id === 'resetBtn') {
      if (confirm('Reset all progress? This clears your earned ticks and meditation checks.')) {
        state.earned = {}; state.meditations = {};
        saveState(); renderAll();
      }
      return;
    }
  });
  document.addEventListener('change', function (e) {
    if (e.target.id === 'spoilerToggle') { state.spoiler = e.target.checked; saveState(); renderChecklist(); renderDetail(); }
    if (e.target.id === 'sortSelect') { sortMode = e.target.value; renderChecklist(); }
    if (e.target.id === 'importFile' && e.target.files && e.target.files[0]) {
      var reader = new FileReader();
      reader.onload = function () {
        try {
          var data = JSON.parse(reader.result);
          if (data && Array.isArray(data.earned)) {
            state.earned = {};
            data.earned.forEach(function (id) { state.earned[id] = true; });
          }
          if (data && Array.isArray(data.meditations)) {
            state.meditations = {};
            data.meditations.forEach(function (k) { state.meditations[k] = true; });
          }
          saveState(); renderAll();
        } catch (err) { alert('That file is not a Leonida Case File export.'); }
      };
      reader.readAsText(e.target.files[0]);
    }
  });
  document.addEventListener('input', function (e) {
    if (e.target.id === 'searchBox') { query = e.target.value.trim().toLowerCase(); renderChecklist(); }
  });

  /* ---------- boot ---------- */
  loadState();
  Promise.all([
    fetch('data/trophies.json').then(function (r) { return r.json(); }),
    fetch('data/sources.json').then(function (r) { return r.json(); })
  ]).then(function (res) {
    trophies = res[0].trophies || res[0];
    sources = res[1].sources || res[1];
    renderAll();
    readHash();
    renderChecklist();
    renderDetail();
  }).catch(function (err) {
    $('detail').innerHTML = '<p>Could not load the trophy data. Serve app/ over HTTP (node serve.ts) — file:// blocks fetch.</p>';
  });
})();
