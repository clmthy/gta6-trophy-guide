// Leonida Ledger: a tracker over the 55 official GTA VI trophies with a full guide,
// sources and a spoiler setting for each, plus a roadmap to the platinum.
// Progress and notes stay in this browser (localStorage); export and import move them.
const KEY = 'gta6-trophy-checklist';
const NOTES_KEY = 'gta6-trophy-notes';
const SPOILER_KEY = 'gta6-trophy-spoilers';

const doc = await (await fetch('data/trophies.json')).json();
const trophies = doc.trophies;

let earned = new Set(JSON.parse(localStorage.getItem(KEY) ?? '[]'));
let notes = JSON.parse(localStorage.getItem(NOTES_KEY) ?? '{}');
let spoilers = localStorage.getItem(SPOILER_KEY) === '1';

// Phases of the roadmap, by trophy id.
const PHASE1 = new Set([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);
const PHASE3 = new Set([14, 30, 31, 32, 35, 39, 40, 41, 42, 43, 54, 55]);

const $ = (id) => document.getElementById(id);
const rowsEl = $('rows');

function save() {
  localStorage.setItem(KEY, JSON.stringify([...earned]));
  localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
  localStorage.setItem(SPOILER_KEY, spoilers ? '1' : '0');
}

// Story trophies whose names give the story away stay hidden until earned, when the
// spoiler setting is on. The platinum and the 100% gold are not story spoilers.
function isHidden(t) {
  return spoilers && t.kind === 'story' && t.id !== 1 && t.id !== 14 && !earned.has(t.name);
}

function gradeLabel(g) {
  return g[0].toUpperCase() + g.slice(1);
}

function renderProgress() {
  $('earned-count').textContent = earned.size;
  $('bar-fill').style.width = `${(earned.size / trophies.length) * 100}%`;
  const counts = {};
  for (const t of trophies) {
    counts[t.grade] = counts[t.grade] ?? [0, 0];
    counts[t.grade][1] += 1;
    if (earned.has(t.name)) counts[t.grade][0] += 1;
  }
  $('grade-counts').textContent = ['platinum', 'gold', 'silver', 'bronze']
    .map((g) => `${gradeLabel(g)} ${counts[g][0]}/${counts[g][1]}`).join(' · ');
  const p1 = [...PHASE1].filter((id) => earned.has(trophies[id - 1].name)).length;
  const p3 = [...PHASE3].filter((id) => earned.has(trophies[id - 1].name)).length;
  const p2total = trophies.length - PHASE1.size - PHASE3.size - 1;
  const p2 = earned.size - p1 - p3 - (earned.has(trophies[0].name) ? 1 : 0);
  $('phase-story').textContent = `— ${p1}/${PHASE1.size} done`;
  $('phase-side').textContent = `— ${p2}/${p2total} done`;
  $('phase-clean').textContent = `— ${p3}/${PHASE3.size} done`;
}

function renderNextUp() {
  const el = $('next-up');
  if (earned.size === trophies.length) {
    el.innerHTML = '<strong>Platinum earned.</strong> Vice Got a Price! is yours — congratulations, Leonida Legend.';
    return;
  }
  const nextStory = trophies.find((t) => t.kind === 'story' && t.id !== 1 && t.id !== 14 && !earned.has(t.name));
  const next = nextStory ?? trophies.find((t) => !earned.has(t.name));
  const warn = !earned.has('Positive Mental Attitude')
    ? ' <span class="next-warn">Remember: do the Chapter 1 kitchen meditation the first time you see it.</span>'
    : '';
  el.innerHTML = `<strong>Next up:</strong> ${escapeHtml(next.name)} — ${escapeHtml(next.description)}${warn}`;
}

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function visibleTrophies() {
  const q = $('search').value.trim().toLowerCase();
  const kind = $('kind').value;
  const grade = $('grade').value;
  return trophies.filter((t) => {
    if (kind !== 'all' && t.kind !== kind) return false;
    if (grade !== 'all' && t.grade !== grade) return false;
    if (!q) return true;
    if (isHidden(t)) return 'hidden story trophy'.includes(q);
    return (t.name + ' ' + t.description + ' ' + t.guide).toLowerCase().includes(q);
  });
}

function renderRows() {
  const list = visibleTrophies();
  rowsEl.replaceChildren();
  for (const t of list) {
    const li = document.createElement('li');
    li.className = 'row' + (earned.has(t.name) ? ' earned' : '');
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = earned.has(t.name);
    box.setAttribute('aria-label', `Mark ${isHidden(t) ? 'hidden story trophy' : t.name} earned`);
    box.addEventListener('change', () => {
      if (box.checked) earned.add(t.name);
      else earned.delete(t.name);
      save();
      renderAll();
    });
    const body = document.createElement('button');
    body.type = 'button';
    body.className = 'row-body';
    body.addEventListener('click', () => openDetail(t));
    const name = document.createElement('span');
    name.className = 'row-name';
    name.textContent = isHidden(t) ? 'Hidden story trophy' : t.name;
    const desc = document.createElement('span');
    desc.className = 'row-desc';
    desc.textContent = isHidden(t) ? 'Earn it to reveal its name and description.' : t.description;
    const meta = document.createElement('span');
    meta.className = 'row-meta';
    const grade = document.createElement('span');
    grade.className = `chip grade-${t.grade}`;
    grade.textContent = gradeLabel(t.grade);
    const kind = document.createElement('span');
    kind.className = 'chip';
    kind.textContent = t.kind;
    meta.append(grade, kind);
    if (t.missable === 'possible') {
      const m = document.createElement('span');
      m.className = 'chip miss';
      m.textContent = 'possibly missable';
      meta.append(m);
    }
    if (notes[t.name]) {
      const n = document.createElement('span');
      n.className = 'chip note';
      n.textContent = 'note';
      meta.append(n);
    }
    const preview = document.createElement('span');
    preview.className = 'row-guide';
    preview.textContent = isHidden(t) ? '' : t.guide;
    body.append(name, desc, meta, preview);
    li.append(box, body);
    rowsEl.append(li);
  }
  const note = $('filter-note');
  if ($('kind').value === 'online') {
    note.textContent = 'Every trophy is offline — there is no online trophy in this list.';
  } else if (list.length === 0) {
    note.textContent = 'No trophies match those filters.';
  } else if ($('kind').value === 'missable') {
    note.textContent = 'Only one trophy is flagged: the possible Chapter 1 meditation. No trophy is confirmed missable.';
  } else {
    note.textContent = `${list.length} of 55 shown. Click a trophy for its full guide and sources.`;
  }
}

function renderAll() {
  renderProgress();
  renderNextUp();
  renderRows();
  $('spoiler-state').textContent = spoilers
    ? 'Spoiler setting is ON — story trophies\u2019 names and descriptions are hidden in the Checklist until earned. Toggle it in the Checklist tab.'
    : 'Spoiler setting is OFF — story trophies are shown. Toggle it in the Checklist tab.';
}

// Detail pane.
let detailTrophy = null;
function openDetail(t) {
  detailTrophy = t;
  $('detail-grade').textContent = `${gradeLabel(t.grade)} · ${t.kind}`;
  $('detail-grade').className = `detail-grade grade-${t.grade}`;
  $('detail-name').textContent = isHidden(t) ? 'Hidden story trophy' : t.name;
  $('detail-desc').textContent = isHidden(t) ? 'Earn it to reveal its name and description.' : t.description;
  $('detail-kind').textContent = isHidden(t) ? '' : `Trophy ${t.id} of 55 · ${gradeLabel(t.grade)}`;
  const m = $('detail-missable');
  if (t.missable === 'possible') {
    m.hidden = false;
    m.textContent = '⚠ Possibly missable — unconfirmed. Do the Chapter 1 kitchen meditation the first time you see it.';
  } else {
    m.hidden = true;
  }
  $('detail-guide').textContent = isHidden(t) ? '' : t.guide;
  $('detail-sources').textContent = isHidden(t) ? '' : `Sources: ${t.sources.join('; ')}.`;
  $('detail-note').value = notes[t.name] ?? '';
  updateToggleButton();
  $('detail').hidden = false;
}
function updateToggleButton() {
  if (!detailTrophy) return;
  $('detail-toggle').textContent = earned.has(detailTrophy.name) ? 'Mark not earned' : 'Mark earned';
}
function closeDetail() {
  $('detail').hidden = true;
  detailTrophy = null;
}
$('detail-close').addEventListener('click', closeDetail);
$('detail').addEventListener('click', (e) => { if (e.target === $('detail')) closeDetail(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDetail(); });
$('detail-toggle').addEventListener('click', () => {
  if (!detailTrophy) return;
  if (earned.has(detailTrophy.name)) earned.delete(detailTrophy.name);
  else earned.add(detailTrophy.name);
  save();
  updateToggleButton();
  renderAll();
});
$('detail-note').addEventListener('input', () => {
  if (!detailTrophy) return;
  const v = $('detail-note').value.trim();
  if (v) notes[detailTrophy.name] = v;
  else delete notes[detailTrophy.name];
  save();
  renderRows();
});

// Tabs.
for (const tab of document.querySelectorAll('.tab')) {
  tab.addEventListener('click', () => showView(tab.dataset.view));
}
function showView(view) {
  for (const tab of document.querySelectorAll('.tab')) {
    tab.classList.toggle('active', tab.dataset.view === view);
  }
  for (const section of document.querySelectorAll('.view')) {
    section.classList.toggle('active', section.id === `view-${view}`);
  }
}

// Controls.
$('search').addEventListener('input', renderRows);
$('kind').addEventListener('change', renderRows);
$('grade').addEventListener('change', renderRows);
$('spoilers').addEventListener('change', () => {
  spoilers = $('spoilers').checked;
  save();
  renderAll();
});
$('export').addEventListener('click', () => {
  const data = { version: 1, earned: [...earned], notes, spoilers };
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  a.download = 'gta6-trophy-progress.json';
  a.click();
});
$('import').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    const names = Array.isArray(data) ? data : data.earned;
    const known = new Set(trophies.map((t) => t.name));
    earned = new Set(names.filter((n) => known.has(n)));
    if (!Array.isArray(data) && data.notes) notes = data.notes;
    if (!Array.isArray(data) && typeof data.spoilers === 'boolean') {
      spoilers = data.spoilers;
      $('spoilers').checked = spoilers;
    }
    save();
    renderAll();
  } catch {
    alert('That file is not valid trophy progress.');
  }
  e.target.value = '';
});
$('reset').addEventListener('click', () => {
  if (!confirm('Clear all earned trophies and notes?')) return;
  earned = new Set();
  notes = {};
  save();
  renderAll();
});

// Screenshot scenes: ?seed=N marks the first N trophies earned, ?view= opens a tab,
// ?trophy=ID opens its guide, ?spoilers=on turns the spoiler setting on.
const params = new URLSearchParams(location.search);
if (params.has('seed')) {
  const n = Math.max(0, Math.min(trophies.length, Number(params.get('seed')) || 0));
  earned = new Set(trophies.slice(0, n).map((t) => t.name));
  save();
}
if (params.get('spoilers') === 'on') {
  spoilers = true;
  save();
}
$('spoilers').checked = spoilers;
if (params.has('view')) showView(params.get('view'));
renderAll();
if (params.has('trophy')) {
  const t = trophies.find((x) => x.id === Number(params.get('trophy')));
  if (t) openDetail(t);
}
