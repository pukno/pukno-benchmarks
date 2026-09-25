import { readFileSync, writeFileSync } from "node:fs";

const ts = readFileSync(new URL("../src/data/workbook.ts", import.meta.url), "utf8");
const marker = "export const workbook: Workbook = ";
const raw = ts.slice(ts.indexOf(marker) + marker.length).replace(/;\s*$/, "");
const data = JSON.parse(raw);
const payload = JSON.stringify(data).replace(/</g, "\\u003c");

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Local model ledger</title>
<meta name="description" content="Filter and sort open-weight models by license, hardware fit, speed, and quality." />
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='6' fill='%230f5c4c'/%3E%3Cpath d='M9 8.5h8.2a5.2 5.2 0 0 1 0 10.4H13.2V23.5H9V8.5zm4.2 6.6h3.7a1.6 1.6 0 0 0 0-3.2h-3.7v3.2z' fill='%23f3faf7'/%3E%3C/svg%3E" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,560;9..144,640&family=IBM+Plex+Sans:wght@400;500;600&display=swap" rel="stylesheet" />
<style>
  :root {
    --paper: #f2eee6; --ink: #1c1916; --muted: #6d655c; --line: #e0d6c8;
    --card: #faf8f4; --pine: #0f5c4c; --pine-fg: #f3faf7; --rust: #8f3d24; --rust-fg: #fff7f4;
    font-family: "IBM Plex Sans", ui-sans-serif, system-ui, sans-serif;
    color: var(--ink); background: var(--paper); line-height: 1.5;
  }
  * { box-sizing: border-box; }
  body { margin: 0; }
  button, select, summary { cursor: pointer; font: inherit; }
  button, select, input { color: inherit; }
  h1, h2, h3 { font-family: Fraunces, Georgia, serif; font-weight: 560; letter-spacing: -0.02em; margin: 0; }
  .app { min-height: 100dvh; display: flex; flex-direction: column; }
  header.top { display: flex; flex-wrap: wrap; gap: 12px; justify-content: space-between; align-items: flex-end; padding: 12px 16px; border-bottom: 1px solid var(--line); position: sticky; top: 0; background: color-mix(in srgb, var(--paper) 92%, transparent); z-index: 5; }
  .brand { display: flex; gap: 10px; align-items: center; }
  .kicker { margin: 0; font-size: 12px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--muted); }
  .controls { display: flex; flex-wrap: wrap; gap: 8px; align-items: flex-end; }
  label.field { display: flex; flex-direction: column; gap: 4px; font-size: 12px; color: var(--muted); }
  input, select { min-height: 44px; border: 1px solid var(--line); background: var(--card); border-radius: 6px; padding: 0 10px; }
  input[type="search"] { min-width: min(100%, 16rem); }
  .layout { display: flex; flex-direction: column; min-height: 0; }
  nav { display: flex; gap: 4px; overflow-x: auto; padding: 8px; border-bottom: 1px solid var(--line); }
  nav button { min-height: 44px; border: 0; background: transparent; border-radius: 6px; padding: 0 12px; white-space: nowrap; }
  nav button[aria-current="page"] { background: var(--pine); color: var(--pine-fg); }
  main { padding: 16px; }
  .row-actions { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
  .ghost, .solid, .dark { min-height: 44px; border-radius: 999px; padding: 0 14px; }
  .ghost { background: var(--card); border: 1px solid var(--line); }
  .solid { background: var(--ink); color: var(--paper); border: 0; }
  .dark[aria-pressed="true"], .ghost[aria-pressed="true"] { background: var(--ink); color: var(--paper); }
  .muted { color: var(--muted); }
  .note { font-size: 14px; max-width: 46rem; }
  .count { font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); }
  .pane { height: min(70dvh, 46rem); overflow: auto; border: 1px solid var(--line); border-radius: 10px; background: var(--card); }
  table { border-collapse: collapse; width: max-content; min-width: 100%; font-size: 14px; }
  th, td { text-align: left; padding: 6px 8px; white-space: nowrap; vertical-align: middle; }
  thead th { position: sticky; background: var(--card); z-index: 1; }
  thead tr:first-child th { top: 0; }
  thead tr:nth-child(2) th { top: 32px; font-weight: 400; }
  tbody tr { border-top: 1px solid var(--line); }
  tbody tr.click { cursor: pointer; }
  tbody tr.click:hover { background: var(--paper); }
  th button { background: none; border: 0; padding: 0; color: var(--muted); font-size: 11px; letter-spacing: 0.06em; text-transform: uppercase; min-height: 28px; }
  th input { min-height: 32px; width: 100%; min-width: 7rem; font-size: 12px; }
  .pill { display: inline-flex; max-width: 16rem; overflow: hidden; text-overflow: ellipsis; border-radius: 999px; padding: 2px 8px; font-size: 12px; font-weight: 500; }
  .yes { background: var(--pine); color: var(--pine-fg); }
  .no { background: var(--rust); color: var(--rust-fg); }
  .mid { background: var(--paper); box-shadow: inset 0 0 0 1px var(--line); }
  a { color: var(--pine); }
  .grid { display: grid; gap: 12px; }
  @media (min-width: 800px) {
    .layout { display: grid; grid-template-columns: 11rem 1fr; }
    nav { flex-direction: column; border-bottom: 0; border-right: 1px solid var(--line); overflow: visible; }
    .cards-4 { grid-template-columns: 1fr 1fr; }
    .split { grid-template-columns: 1.2fr 0.8fr; }
  }
  .card { background: var(--card); border: 1px solid var(--line); border-radius: 10px; padding: 14px; }
  .num { font-family: Fraunces, Georgia, serif; font-size: 32px; color: var(--pine); margin: 0; }
  dialog { border: 0; padding: 0; width: min(40rem, 100%); max-height: 100dvh; margin-left: auto; background: var(--card); }
  dialog::backdrop { background: rgba(28, 25, 22, 0.4); }
  .dlg { padding: 20px; overflow: auto; max-height: 100dvh; }
  .pair { display: grid; gap: 2px; padding: 8px 0; border-top: 1px solid var(--line); }
  @media (min-width: 640px) { .pair { grid-template-columns: 12rem 1fr; gap: 12px; } }
  .bar { height: 6px; background: var(--line); border-radius: 99px; }
  .bar > span { display: block; height: 6px; background: var(--pine); border-radius: 99px; }
  .hide { display: none; }
</style>
</head>
<body>
<div class="app">
  <header class="top">
    <div class="brand">
      <svg viewBox="0 0 32 32" width="36" height="36" aria-hidden="true"><rect width="32" height="32" rx="6" fill="#0f5c4c"/><path d="M9 8.5h8.2a5.2 5.2 0 0 1 0 10.4H13.2V23.5H9V8.5zm4.2 6.6h3.7a1.6 1.6 0 0 0 0-3.2h-3.7v3.2z" fill="#f3faf7"/></svg>
      <div>
        <p class="kicker">Open-weight evaluation</p>
        <h1>Local model ledger</h1>
      </div>
    </div>
    <div class="controls">
      <label class="field">Target machine
        <select id="profile"></select>
      </label>
      <label class="field">Search all columns
        <input id="q" type="search" placeholder="Name, license, runtime…" />
      </label>
    </div>
  </header>
  <div class="layout">
    <nav id="nav"></nav>
    <main id="main"></main>
  </div>
</div>
<dialog id="dlg"><div class="dlg" id="dlg-body"></div></dialog>
<script id="wb" type="application/json">${payload}</script>
<script>
const wb = JSON.parse(document.getElementById("wb").textContent);
const FIT = "Fits Hardware Profile";
const STATUS = "Local Status";
const nav = [
  ["brief", "Brief"], ["models", "Models"], ["speed", "Speed"], ["quality", "Quality"],
  ["hardware", "Hardware"], ["metrics", "Metrics"], ["scoring", "Scoring"],
  ["sources", "Sources"], ["dictionary", "Fields"]
];
const sheets = {
  models: ["Models", wb.modelColumns, () => state.models],
  speed: ["Speed_Benchmarks", wb.speedColumns, () => wb.speed],
  quality: ["Quality_Benchmarks", wb.qualityColumns, () => wb.quality],
  hardware: ["Hardware_Profiles", wb.hardwareColumns, () => wb.hardware],
  metrics: ["Metric_Catalog", wb.metricColumns, () => wb.metrics],
  scoring: ["Decision_Scoring", wb.scoreColumns, () => wb.scores],
  sources: ["Sources_Standards", wb.sourceColumns, () => wb.sources],
  dictionary: ["Field_Dictionary", wb.dictionaryColumns, () => wb.dictionary]
};
const presets = {
  Decision: [STATUS, FIT, "Model Name", "Primary Modality", "Publisher", "Commercial Local Verdict", "License", "Parameters Total (B)", "Parameters Active (B)", "Recommended Model Size (GB)", "Context / Input Limit", "Quality Summary Score"],
  Legal: ["Model Name", "License", "Commercial Local Verdict", "Commercial Use", "Weight Redistribution", "Fine-Tuning / Derivatives", "License Restrictions"],
  Hardware: [FIT, "Model Name", "Recommended Model Size (GB)", "Minimum RAM (GB)", "Minimum VRAM (GB)", "Minimum Unified Memory (GB)", "Primary Local Runtime", "Apple Silicon Support", "NVIDIA Support", "Recommended Machine"],
  Scores: ["Model Name", "Quality Summary Metric", "Quality Summary Score", "Quality Leaderboard Rank", "Speed Summary Metric", "Speed Summary Value"]
};
const state = { section: "models", profile: "HW-MAIN-32", q: "", filters: {}, sort: { key: "Model Name", dir: "asc" }, preset: "Decision" };
function num(v){ if(!v) return null; const t=String(v).replace(/,/g,"").trim(); return /^-?\\d+(\\.\\d+)?$/.test(t)?Number(t):null; }
function fits(model, profile){
  const ram=num(profile["System RAM (GB)"]), mem=num(profile["VRAM / Unified Memory (GB)"]);
  const minRam=num(model["Minimum RAM (GB)"]);
  const unified=ram!=null&&mem!=null&&ram===mem;
  const need=unified?(num(model["Minimum Unified Memory (GB)"])??num(model["Minimum VRAM (GB)"])??num(model["Recommended Model Size (GB)"])):(num(model["Minimum VRAM (GB)"])??num(model["Recommended Model Size (GB)"]));
  if(minRam==null&&need==null) return "Unknown";
  if(minRam!=null&&ram!=null&&minRam>ram) return "No";
  if(need==null||mem==null) return "Unknown";
  return need<=mem?"Yes":"No";
}
function statusOf(model, fit){
  if(model["Open Weights"]&&model["Open Weights"]!=="Yes") return "Blocked · weights";
  const verdict=model["Commercial Local Verdict"];
  if(verdict==="No") return "Blocked · license";
  const c=verdict==="Conditional";
  if(fit==="No") return c?"Conditional · does not fit":"Blocked · hardware";
  if(fit==="Unknown") return c?"Conditional · check memory":"Eligible · check memory";
  const p=c?"Conditional":"Eligible";
  const q=!!model["Quality Summary Score"], s=!!model["Speed Summary Value"];
  if(!q&&!s) return p+" · ungraded";
  if(!s) return p+" · needs a speed run";
  if(!q) return p+" · needs quality";
  return p+" · ready to score";
}
function profile(){ return wb.hardware.find(r=>r["Hardware Profile ID"]===state.profile)||wb.hardware[0]; }
function decorate(){
  const p=profile();
  state.models=(wb.models||[]).map(m=>{ const fit=fits(m,p); return Object.assign({}, m, { [FIT]: fit, [STATUS]: statusOf(m, fit) }); });
}
function cmp(a,b){
  if(!a&&!b) return 0; if(!a) return 1; if(!b) return -1;
  const na=num(a), nb=num(b); if(na!=null&&nb!=null) return na-nb;
  return String(a).localeCompare(String(b), undefined, {numeric:true, sensitivity:"base"});
}
function pill(value){
  const v=value.toLowerCase();
  const span=document.createElement("span");
  span.className="pill "+((v==="yes"||v.startsWith("eligible"))?"yes":(v==="no"||v.startsWith("blocked"))?"no":"mid");
  span.textContent=value;
  return span;
}
const PILL=new Set(["Commercial Local Verdict","Commercial Use","Commercial Local Use","Open Weights",FIT,STATUS,"Priority","Type","Higher Is Better"]);
function renderNav(){
  const host=document.getElementById("nav"); host.textContent="";
  nav.forEach(([id,label])=>{
    const b=document.createElement("button");
    b.type="button"; b.textContent=label;
    if(state.section===id) b.setAttribute("aria-current","page");
    b.onclick=()=>{ state.section=id; state.filters={}; state.q=""; document.getElementById("q").value=""; state.sort=id==="models"?{key:"Model Name",dir:"asc"}:null; render(); };
    host.appendChild(b);
  });
}
function el(tag, className, text){ const n=document.createElement(tag); if(className) n.className=className; if(text!=null) n.textContent=text; return n; }
function renderBrief(main){
  const wrap=el("div");
  wrap.appendChild(el("p","kicker","Workbook"));
  const h=el("h2",null,"Four questions before a weight file ships."); h.style.fontSize="clamp(2rem,4vw,3rem)"; h.style.margin="8px 0 12px";
  wrap.appendChild(h);
  wrap.appendChild(el("p","muted",wb.summary));
  const cards=el("div","grid cards-4"); cards.style.marginTop="16px";
  [["1","Legal","Can it be used in commercial local software?"],["2","Hardware","Does it fit the target machine?"],["3","Speed","How fast is that exact quant and runtime?"],["4","Quality","Is the modality-specific score good enough?"]].forEach(([n,t,b])=>{
    const c=el("article","card"); c.appendChild(el("p","num",n)); c.appendChild(el("h3",null,t)); c.appendChild(el("p","muted",b)); cards.appendChild(c);
  });
  wrap.appendChild(cards);
  const p=profile();
  const fitYes=state.models.filter(m=>m[FIT]==="Yes").length;
  const legal=state.models.filter(m=>m["Commercial Local Verdict"]==="Yes"&&m[FIT]==="Yes").length;
  const aside=el("aside","card"); aside.style.marginTop="16px";
  aside.appendChild(el("h3",null,"This catalog, "+p["Profile Name"]));
  aside.appendChild(el("p","note",legal+" commercially cleared models fit this machine. "+fitYes+" fit on memory before the license gate. "+state.models.length+" rows in the starter catalog."));
  const go=el("button","solid","Open the model table"); go.style.marginTop="12px"; go.onclick=()=>{ state.section="models"; render(); };
  aside.appendChild(go);
  wrap.appendChild(aside);
  const rules=el("div"); rules.style.marginTop="24px"; rules.appendChild(el("h3",null,"Design rules"));
  wb.rules.forEach(r=>{
    const row=el("div","pair"); row.appendChild(el("strong",null,r.rule)); row.appendChild(el("span","muted",r.recommendation)); rules.appendChild(row);
  });
  wrap.appendChild(rules);
  const weights=el("div"); weights.style.marginTop="24px"; weights.appendChild(el("h3",null,"Gates, then weights"));
  wb.scores.forEach(s=>{
    const block=el("div"); block.style.marginTop="10px";
    const line=el("div"); line.style.display="flex"; line.style.justifyContent="space-between";
    line.appendChild(el("span",null,s.Criterion)); line.appendChild(el("span","muted",s["Default Weight / Rule"]));
    const pct=String(s["Default Weight / Rule"]).endsWith("%")?Number(String(s["Default Weight / Rule"]).replace("%","")):8;
    const bar=el("div","bar"); const span=document.createElement("span"); span.style.width=(pct||8)+"%"; bar.appendChild(span);
    block.appendChild(line); block.appendChild(bar); block.appendChild(el("p","muted",s["How to Use"]));
    weights.appendChild(block);
  });
  wrap.appendChild(weights);
  const pages=el("div","card"); pages.style.marginTop="24px";
  pages.appendChild(el("strong",null,"GitHub Pages"));
  pages.appendChild(el("p","muted","This file is the site. Commit it as index.html on a gh-pages branch, or as /docs/index.html. Nothing here calls a server."));
  wrap.appendChild(pages);
  main.appendChild(wrap);
}
function visibleColumns(spec){
  if(state.section!=="models") return spec[1];
  return presets[state.preset];
}
function rowsFor(spec){
  let rows=spec[2]().slice();
  const q=state.q.trim().toLowerCase();
  rows=rows.filter(row=>{
    for(const [k,raw] of Object.entries(state.filters)){
      const n=raw.trim().toLowerCase(); if(n && !String(row[k]||"").toLowerCase().includes(n)) return false;
    }
    if(!q) return true;
    return Object.values(row).some(v=>String(v).toLowerCase().includes(q));
  });
  if(state.sort){
    const {key,dir}=state.sort; const s=dir==="asc"?1:-1;
    rows.sort((a,b)=>cmp(a[key]||"", b[key]||"")*s);
  }
  return rows;
}
function renderTable(main){
  const spec=sheets[state.section];
  const cols=visibleColumns(spec);
  const all=spec[2]();
  const rows=rowsFor(spec);
  const head=el("div");
  const purpose=(wb.sheets.find(s=>s.name===spec[0])||{}).purpose||"";
  head.appendChild(el("h2",null,nav.find(n=>n[0]===state.section)[1]));
  const p=el("p","muted note",purpose); p.style.margin="6px 0 10px"; head.appendChild(p);
  if(state.section==="models"){
    head.appendChild(el("p","muted note","Starter catalog, not your measurements. Licenses summarized 25 Sep 2026 from public cards and roundups — confirm each LICENSE file. Speed cells are blank on purpose. Quality indexes are a July 2026 secondary summary of Artificial Analysis. Not legal advice."));
    const actions=el("div","row-actions"); actions.style.margin="10px 0";
    Object.keys(presets).forEach(name=>{
      const b=el("button","ghost",name); b.setAttribute("aria-pressed", state.preset===name?"true":"false");
      b.onclick=()=>{ state.preset=name; render(); };
      actions.appendChild(b);
    });
    head.appendChild(actions);
  }
  if(state.section==="speed" && all.length===0){
    head.appendChild(el("p","card muted","No speed runs yet. A tok/s figure without hardware, quant, runtime, context, and concurrency is not comparable, so this sheet is empty instead of guessed."));
  }
  const count=el("p","count", rows.length+" of "+all.length+" rows"+(state.sort?" · sorted by "+state.sort.key+" "+state.sort.dir:""));
  count.style.margin="8px 0"; head.appendChild(count);
  main.appendChild(head);
  const pane=el("div","pane");
  const table=document.createElement("table");
  const thead=document.createElement("thead");
  const hr=document.createElement("tr");
  const fr=document.createElement("tr");
  cols.forEach(col=>{
    const th=document.createElement("th");
    const btn=document.createElement("button");
    btn.type="button";
    const mark=!state.sort||state.sort.key!==col?" ↕":state.sort.dir==="asc"?" ↑":" ↓";
    btn.textContent=col+mark;
    btn.onclick=()=>{
      if(!state.sort||state.sort.key!==col) state.sort={key:col,dir:"asc"};
      else if(state.sort.dir==="asc") state.sort={key:col,dir:"desc"};
      else state.sort=null;
      render();
    };
    th.appendChild(btn); hr.appendChild(th);
    const th2=document.createElement("th");
    const input=document.createElement("input");
    input.placeholder="Filter"; input.setAttribute("aria-label","Filter "+col); input.value=state.filters[col]||"";
    input.oninput=(e)=>{
      state.filters[col]=e.target.value;
      const label="Filter "+col;
      render();
      const next=[...document.querySelectorAll("th input")].find((node)=>node.getAttribute("aria-label")===label);
      if(next){ next.focus(); const n=next.value.length; next.setSelectionRange(n,n); }
    };
    th2.appendChild(input); fr.appendChild(th2);
  });
  thead.appendChild(hr); thead.appendChild(fr); table.appendChild(thead);
  const tb=document.createElement("tbody");
  if(!rows.length){
    const tr=document.createElement("tr"); const td=document.createElement("td");
    td.colSpan=cols.length; td.textContent="No rows match these filters."; td.style.padding="24px";
    tr.appendChild(td); tb.appendChild(tr);
  }
  rows.forEach(row=>{
    const tr=document.createElement("tr");
    if(state.section==="models"||state.section==="quality"){ tr.className="click"; tr.onclick=()=>openDetail(row); }
    cols.forEach(col=>{
      const td=document.createElement("td");
      const value=row[col]||"";
      if(!value) td.textContent="—";
      else if(/^https?:\\/\\//.test(value)){
        const a=document.createElement("a"); a.href=value; a.target="_blank"; a.rel="noreferrer"; a.textContent="Link";
        a.onclick=(e)=>e.stopPropagation(); td.appendChild(a);
      } else if(PILL.has(col)) td.appendChild(pill(value));
      else { td.textContent=value; td.title=value; }
      tr.appendChild(td);
    });
    tb.appendChild(tr);
  });
  table.appendChild(tb); pane.appendChild(table); main.appendChild(pane);
  if(state.section==="scoring"){
    const ol=el("div","grid cards-4"); ol.style.marginTop="16px";
    wb.flow.forEach(step=>{
      const c=el("article","card");
      c.appendChild(el("p","kicker","Step "+step.Step));
      c.appendChild(el("strong",null,step.Rule));
      c.appendChild(el("p","muted",step.Why));
      c.appendChild(el("p",null,step.Result));
      ol.appendChild(c);
    });
    main.appendChild(ol);
  }
}
function openDetail(row){
  const body=document.getElementById("dlg-body"); body.textContent="";
  const top=el("div"); top.style.display="flex"; top.style.justifyContent="space-between"; top.style.gap="12px";
  const titles=el("div");
  titles.appendChild(el("p","kicker",row["Primary Modality"]||row["Capability Dimension"]||"Row"));
  titles.appendChild(el("h2",null,row["Model Name"]||row["Benchmark / Leaderboard"]||"Row"));
  if(row[STATUS]) titles.appendChild(el("p",null,row[STATUS]));
  const close=el("button","ghost","Close"); close.onclick=()=>document.getElementById("dlg").close();
  top.appendChild(titles); top.appendChild(close); body.appendChild(top);
  Object.entries(row).forEach(([k,v])=>{
    if(!v||k===STATUS||k===FIT) return;
    const line=el("div","pair"); line.appendChild(el("span","muted",k));
    if(/^https?:\\/\\//.test(v)){ const a=document.createElement("a"); a.href=v; a.target="_blank"; a.rel="noreferrer"; a.textContent=v; line.appendChild(a); }
    else line.appendChild(el("span",null,v));
    body.appendChild(line);
  });
  if(row["Model ID"]){
    wb.quality.filter(q=>q["Model ID"]===row["Model ID"]).forEach(item=>{
      const c=el("article","card"); c.style.marginTop="10px";
      c.appendChild(el("strong",null,item["Benchmark / Leaderboard"]+": "+item.Score+" "+item["Score Unit"]));
      c.appendChild(el("p","muted",(item["Evaluation Date"]||"")+" · rank "+(item.Rank||"—")));
      if(item["Source URL"]){ const a=document.createElement("a"); a.href=item["Source URL"]; a.target="_blank"; a.rel="noreferrer"; a.textContent="Source"; c.appendChild(a); }
      c.appendChild(el("p","muted",item.Notes||""));
      body.appendChild(c);
    });
  }
  document.getElementById("dlg").showModal();
}
function render(){
  decorate();
  renderNav();
  const main=document.getElementById("main"); main.textContent="";
  if(state.section==="brief") renderBrief(main); else renderTable(main);
}
document.getElementById("profile").innerHTML=wb.hardware.map(h=>'<option value="'+h["Hardware Profile ID"]+'">'+h["Profile Name"]+" · "+h["VRAM / Unified Memory (GB)"]+"GB</option>").join("");
document.getElementById("profile").value=state.profile;
document.getElementById("profile").onchange=(e)=>{ state.profile=e.target.value; render(); };
document.getElementById("q").oninput=(e)=>{ state.q=e.target.value; if(state.section!=="brief") render(); };
document.getElementById("dlg").addEventListener("click",(e)=>{ if(e.target.id==="dlg") e.target.close(); });
render();
</script>
</body>
</html>
`;

writeFileSync(new URL("../public/open-weight-ledger.html", import.meta.url), html);
writeFileSync(new URL("../docs/index.html", import.meta.url), html);
console.log("wrote", html.length);
