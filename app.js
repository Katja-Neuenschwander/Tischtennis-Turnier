const KEY = "tt-turnier-v1";
const MIN = 3, MAX = 8, TMIN = 1, TMAX = 5;
let state = load() || { count: 8, names: Array.from({length: MAX}, (_, i) => "Spielerin " + (i + 1)), results: {} };
if (!state.tables) state.tables = 2;
let pending = null;

function load(){ try { return JSON.parse(localStorage.getItem(KEY)); } catch(e){ return null; } }
function save(){ try { localStorage.setItem(KEY, JSON.stringify(state)); } catch(e){} }
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const nm = i => (state.names[i] || "").trim() || "Spielerin " + (i + 1);
const key = (a, b) => a < b ? a + "-" + b : b + "-" + a;

/* Pseudozufall mit festem Startwert, damit derselbe Spielplan bei jedem Laden gleich aussieht */
function rng(seed){ return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }; }

/* Rundenturnier nach der Kreismethode, danach in Durchgänge mit bis zu T Spielen verteilt.
   Mehrere Varianten werden durchgerechnet; gewählt wird die mit den wenigsten Durchgängen
   und danach den wenigsten Spielen direkt hintereinander. */
function buildSchedule(n, T){
  const pairs = roundRobin(n);
  let best = null;
  for (let attempt = 0; attempt < 150; attempt++){
    const rnd = rng(attempt * 7919 + n * 31 + T);
    const s = fillSlots(pairs, n, T, attempt === 0 ? () => 0 : rnd);
    if (!best || s.slots.length < best.slots.length || (s.slots.length === best.slots.length && s.b2b < best.b2b)) best = s;
  }
  return best.slots;
}

function fillSlots(pairs, n, T, rnd){
  const left = pairs.slice(), slots = [], waited = Array(n).fill(0);
  let prev = [], b2b = 0;
  while (left.length){
    const slot = [], busy = new Set();
    while (slot.length < T){
      let bi = -1, bs = Infinity;
      left.forEach((mt, i) => {
        if (busy.has(mt[0]) || busy.has(mt[1])) return;
        const back = (prev.includes(mt[0]) ? 1 : 0) + (prev.includes(mt[1]) ? 1 : 0);
        const score = back * 10 - waited[mt[0]] - waited[mt[1]] + rnd() * 0.9;
        if (score < bs){ bs = score; bi = i; }
      });
      if (bi === -1) break;
      const mt = left.splice(bi, 1)[0];
      slot.push(mt); busy.add(mt[0]); busy.add(mt[1]);
      if (prev.includes(mt[0])) b2b++;
      if (prev.includes(mt[1])) b2b++;
    }
    for (let p = 0; p < n; p++) waited[p] = busy.has(p) ? 0 : waited[p] + 1;
    slots.push(slot); prev = slot.flat();
  }
  return { slots, b2b };
}

function roundRobin(n){
  let ids = Array.from({length: n}, (_, i) => i);
  if (n % 2) ids.push(-1);
  const m = ids.length, matches = [];
  for (let r = 0; r < m - 1; r++){
    for (let i = 0; i < m / 2; i++){
      const a = ids[i], b = ids[m - 1 - i];
      if (a !== -1 && b !== -1) matches.push((r + i) % 2 ? [b, a] : [a, b]);
    }
    ids = [ids[0], ids[m - 1], ...ids.slice(1, m - 1)];
  }
  return matches;
}

function getRes(a, b){
  const r = state.results[key(a, b)];
  if (!r || r[0] === "" || r[1] === "" || r[0] == null || r[1] == null) return null;
  return a < b ? [ +r[0], +r[1] ] : [ +r[1], +r[0] ];
}

function standings(){
  const n = state.count;
  const st = Array.from({length: n}, (_, i) => ({ i, sp: 0, s: 0, u: 0, nl: 0, pf: 0, pa: 0, pts: 0, tb: "" }));
  for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++){
    const r = getRes(a, b); if (!r) continue;
    const [x, y] = r, A = st[a], B = st[b];
    A.sp++; B.sp++; A.pf += x; A.pa += y; B.pf += y; B.pa += x;
    if (x > y){ A.s++; B.nl++; A.pts += 2; }
    else if (x < y){ B.s++; A.nl++; B.pts += 2; }
    else { A.u++; B.u++; A.pts++; B.pts++; }
  }
  st.forEach(p => p.diff = p.pf - p.pa);
  const groups = {};
  st.forEach(p => (groups[p.pts] = groups[p.pts] || []).push(p));
  Object.values(groups).forEach(g => {
    if (g.length < 2) return;
    const ids = g.map(p => p.i);
    g.forEach(p => { p.h2h = 0; ids.forEach(o => { if (o === p.i) return; const r = getRes(p.i, o); if (r) p.h2h += r[0] > r[1] ? 2 : r[0] === r[1] ? 1 : 0; }); });
    g.forEach(p => { p.tb = g.filter(o => o.h2h === p.h2h).length === 1 ? "DB" : "Diff"; });
  });
  st.sort((x, y) => y.pts - x.pts || (y.h2h || 0) - (x.h2h || 0) || y.diff - x.diff || y.pf - x.pf || x.i - y.i);
  // Ränge vergeben, echte Gleichstände teilen sich den Rang
  st.forEach((p, k) => {
    const q = st[k - 1];
    p.rank = q && q.pts === p.pts && (q.h2h || 0) === (p.h2h || 0) && q.diff === p.diff && q.pf === p.pf ? q.rank : k + 1;
  });
  return st;
}

function renderSetup(){
  $("count").innerHTML = Array.from({length: MAX - MIN + 1}, (_, k) => { const v = MIN + k; return `<option value="${v}" ${v === state.count ? "selected" : ""}>${v} Spielerinnen</option>`; }).join("");
  $("tables").innerHTML = Array.from({length: TMAX - TMIN + 1}, (_, k) => { const v = TMIN + k; return `<option value="${v}" ${v === state.tables ? "selected" : ""}>${v} ${v === 1 ? "Tisch" : "Tische"}</option>`; }).join("");
  const used = Math.min(state.tables, Math.floor(state.count / 2));
  $("sub").textContent = `Jede gegen jede, auf ${state.tables} ${state.tables === 1 ? "Tisch" : "Tischen"}. Resultate eintragen, die Rangliste rechnet automatisch.`;
  $("tables-note").textContent = used < state.tables ? `Mit ${state.count} Spielerinnen können höchstens ${used} ${used === 1 ? "Tisch" : "Tische"} gleichzeitig bespielt werden.` : "";
  $("tables-note").hidden = used >= state.tables;
  $("names").innerHTML = Array.from({length: state.count}, (_, i) =>
    `<label class="field" for="n${i}">Spielerin ${i + 1}<input type="text" id="n${i}" data-i="${i}" value="${esc(state.names[i] || "")}" maxlength="30" autocomplete="off"></label>`).join("");
}

function renderSchedule(){
  const n = state.count, slots = buildSchedule(n, state.tables);
  $("slots").innerHTML = slots.map((slot, si) => {
    const playing = slot.flat();
    const rest = Array.from({length: n}, (_, i) => i).filter(i => !playing.includes(i));
    return `<div class="slot"><div class="slot-head"><span>Durchgang ${si + 1}</span>${rest.length ? `<span class="rest">Pause: ${rest.map(i => esc(nm(i))).join(", ")}</span>` : ""}</div>` +
      slot.map((mt, ti) => {
        const [a, b] = mt, k = key(a, b), raw = state.results[k] || ["", ""];
        const va = a < b ? raw[0] : raw[1], vb = a < b ? raw[1] : raw[0];
        return `<div class="match" data-a="${a}" data-b="${b}">
          <span class="tisch">Tisch ${ti + 1}</span>
          <span class="name a" id="na-${k}">${esc(nm(a))}</span>
          <span class="score">
            <input type="number" inputmode="numeric" min="0" id="s-${k}-${a}" data-k="${k}" data-p="${a}" data-o="${b}" value="${va ?? ""}" aria-label="Punkte ${esc(nm(a))}">
            <span>:</span>
            <input type="number" inputmode="numeric" min="0" id="s-${k}-${b}" data-k="${k}" data-p="${b}" data-o="${a}" value="${vb ?? ""}" aria-label="Punkte ${esc(nm(b))}">
          </span>
          <span class="name b" id="nb-${k}">${esc(nm(b))}</span>
        </div>`;
      }).join("") + `</div>`;
  }).join("");
  markWinners();
}

function markWinners(){
  document.querySelectorAll(".match").forEach(el => {
    const a = +el.dataset.a, b = +el.dataset.b, r = getRes(a, b);
    const A = el.querySelector(".name.a"), B = el.querySelector(".name.b");
    A.className = "name a"; B.className = "name b";
    if (!r) return;
    if (r[0] > r[1]) A.classList.add("won"); else if (r[1] > r[0]) B.classList.add("won"); else { A.classList.add("drew"); B.classList.add("drew"); }
  });
}

function renderTable(){
  const st = standings(), n = state.count, total = n * (n - 1) / 2;
  const done = Object.keys(state.results).filter(k => { const [a, b] = k.split("-").map(Number); return a < n && b < n && getRes(a, b); }).length;
  $("progress").textContent = `${done} von ${total} Spielen`;
  $("bar").style.width = (done / total * 100) + "%";
  $("rank").innerHTML = `<thead><tr><th>#</th><th class="l">Name</th><th>Sp</th><th>S</th><th>U</th><th>N</th><th>Bälle</th><th>Diff</th><th>Pkt</th></tr></thead><tbody>` +
    st.map(p => `<tr class="${p.rank === 1 && p.sp ? "lead" : ""}"><td class="rk">${p.rank}</td><td class="l">${esc(nm(p.i))}${p.tb ? `<span class="tag">${p.tb}</span>` : ""}</td><td>${p.sp}</td><td>${p.s}</td><td>${p.u}</td><td>${p.nl}</td><td>${p.pf}:${p.pa}</td><td>${p.diff > 0 ? "+" : ""}${p.diff}</td><td class="pts">${p.pts}</td></tr>`).join("") + `</tbody>`;
  const ch = $("champion");
  if (done === total){
    const top = st.filter(p => p.rank === 1);
    ch.className = "champion";
    ch.innerHTML = top.length === 1
      ? `<div class="eyebrow">Turniersiegerin</div><div class="big">${esc(nm(top[0].i))}</div><div>${top[0].pts} Punkte, Balldifferenz ${top[0].diff > 0 ? "+" : ""}${top[0].diff}</div>`
      : `<div class="eyebrow">Gleichstand an der Spitze</div><div class="big">${top.map(p => esc(nm(p.i))).join(" & ")}</div><div>Alle Kriterien gleich. Ein Entscheidungsspiel bestimmt die Siegerin.</div>`;
  } else {
    ch.className = "champion open";
    ch.innerHTML = `<div class="eyebrow">Turniersiegerin</div><div class="big">Noch ${total - done} ${total - done === 1 ? "Spiel" : "Spiele"} offen</div><div>Die Siegerin steht fest, sobald alle Resultate eingetragen sind.</div>`;
  }
}

function ask(text, fn){ pending = fn; $("confirm-text").textContent = text; $("confirm").hidden = false; }
function hasResults(){ return Object.keys(state.results).length > 0; }

$("names").addEventListener("input", e => {
  const i = +e.target.dataset.i; state.names[i] = e.target.value; save();
  document.querySelectorAll(`.match`).forEach(el => {
    if (+el.dataset.a === i) el.querySelector(".name.a").textContent = nm(i);
    if (+el.dataset.b === i) el.querySelector(".name.b").textContent = nm(i);
  });
  renderTable();
});
$("names").addEventListener("change", () => renderSchedule());

$("count").addEventListener("change", e => {
  const v = +e.target.value;
  const apply = () => { state.count = v; state.results = {}; save(); renderAll(); };
  if (hasResults()) { e.target.value = state.count; ask(`Auf ${v} Spielerinnen wechseln? Alle eingetragenen Resultate werden gelöscht.`, apply); }
  else apply();
});
$("tables").addEventListener("change", e => {
  state.tables = +e.target.value; save(); renderAll();
});
$("build").addEventListener("click", () => {
  const apply = () => { state.results = {}; save(); renderAll(); };
  if (hasResults()) ask("Neuen Spielplan erstellen? Alle eingetragenen Resultate werden gelöscht.", apply); else apply();
});
$("clear").addEventListener("click", () => { if (hasResults()) ask("Alle Resultate löschen? Die Namen bleiben erhalten.", () => { state.results = {}; save(); renderAll(); }); });
$("confirm-yes").addEventListener("click", () => { $("confirm").hidden = true; if (pending) pending(); pending = null; });
$("confirm-no").addEventListener("click", () => { $("confirm").hidden = true; pending = null; });

$("slots").addEventListener("input", e => {
  const t = e.target; if (!t.dataset.k) return;
  const k = t.dataset.k, p = +t.dataset.p, lo = Math.min(p, +t.dataset.o);
  const r = state.results[k] || ["", ""];
  const v = t.value === "" ? "" : Math.max(0, Math.floor(+t.value));
  r[p === lo ? 0 : 1] = v;
  if (r[0] === "" && r[1] === "") delete state.results[k]; else state.results[k] = r;
  save(); markWinners(); renderTable();
});

function renderAll(){ renderSetup(); renderSchedule(); renderTable(); }
renderAll();
