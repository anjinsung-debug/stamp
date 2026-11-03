const D = STAMP_DATA;
const KEY = "stamp:v1";
const app = document.getElementById("app");

const VERDICT = {
  both: ["기내·위탁 모두 가능", "어느 가방에 넣어도 돼요"],
  carry_on_only: ["기내만", "위탁 수하물에 넣으면 안 돼요"],
  checked_only: ["위탁만", "기내에 가져갈 수 없어요"],
  prohibited: ["반입 금지", "비행기에 실을 수 없어요"],
  null: ["출국 규정 검수 전", "공식 안내를 확인하세요"],
};
const LEVEL = { banned: "입국 금지", declare: "신고·서류 확인", info: "참고" };
const BUCKET = { no: "가져가지 마세요", carry_on_only: "기내 가방", checked_only: "위탁 가방", both: "어느 가방이든 가능", unknown: "확인 필요" };
const INKS = ["var(--violet)", "var(--green)", "var(--red)", "var(--blue)"];
// 단계마다 다른 도장 문양 (장식용, 화면 낭독기는 단계 이름을 읽음)
const ICONS = {
  plan: '<path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>',
  passport: '<rect x="5" y="3" width="14" height="18" rx="2"/><circle cx="12" cy="10" r="3"/><path d="M9 16h6"/>',
  booking: '<path d="M4 6h16v4a2 2 0 0 0 0 4v4H4v-4a2 2 0 0 0 0-4z"/><path d="M14 7v2M14 11v2M14 15v2"/>',
  entry: '<path d="M7 3h7l4 4v14H7z"/><path d="M10 13l2 2 4-4"/>',
  money: '<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M3 10h18M7 15h3"/>',
  pack: '<rect x="4" y="7" width="16" height="13" rx="2"/><path d="M9 7V4h6v3M9 11v5M15 11v5"/>',
  airport: '<path d="M3 20h18"/><path d="M5 15l14-6a1.6 1.6 0 0 0-1-3l-4 1.5L8 4 6.5 4.7l3.5 4.4-4 1.6-2-1.5-1.2.5 2 4z"/>',
  arrival: '<path d="M3 20h18"/><path d="M4 9.5l2-.6 1.6 2 4.2.5L9.5 6l1.8-.3 4.4 5.9 3.6.4a1.6 1.6 0 0 1-.4 3.2L5 13.6z"/>',
  local: '<path d="M4 11l8-7 8 7v9H4z"/><path d="M10 20v-5h4v5"/>',
  emergency: '<path d="M12 3l9.5 17h-19z"/><path d="M12 10v4M12 17.5h.01"/>',
};
const icon = (id) => `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true">${ICONS[id] || ""}</svg>`;

// 물건 확인 목록 묶음 (같은 선 굵기의 문양)
const GICONS = {
  battery: '<rect x="3" y="7" width="16" height="10" rx="2"/><path d="M21 11v2M7 10v4M11 10v4"/>',
  drop: '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>',
  blade: '<circle cx="6" cy="17" r="3"/><circle cx="18" cy="17" r="3"/><path d="M8.5 15L19 4M15.5 15L5 4"/>',
  flame: '<path d="M12 3c1 4 5 5.5 5 10a5 5 0 0 1-10 0c0-2.5 1.5-4 2.5-5 .3 2 1.5 3 2.5 3 0-3-1-5 0-8z"/>',
  food: '<path d="M4 11h16a8 8 0 0 1-16 0z"/><path d="M9 7c0-2 2-2 2-4M14 7c0-2 2-2 2-4"/>',
  pill: '<rect x="2.5" y="8.5" width="19" height="7" rx="3.5" transform="rotate(-45 12 12)"/><path d="M9.5 9.5l5 5"/>',
};
const gicon = (id) => `<svg class="gico" viewBox="0 0 24 24" aria-hidden="true">${GICONS[id]}</svg>`;
const GROUPS = [
  ["배터리·전자기기", "battery", ["power_bank", "spare_battery", "electronics", "e_cigarette", "hair_iron"]],
  ["액체·스프레이", "drop", ["liquid_cosmetic", "lens_solution", "spray", "alcohol", "duty_free_liquid"]],
  ["칼·가위·도구", "blade", ["scissors", "knife", "multi_tool", "razor", "nail_clipper", "selfie_stick"]],
  ["불", "flame", ["lighter", "torch_lighter", "matches"]],
  ["음식", "food", ["meat_product", "fresh_fruit", "dairy", "instant_food"]],
  ["약", "pill", ["medicine", "liquid_medicine"]],
];
const two = (n) => String(n).padStart(2, "0");
const TILTS = [-8, 5, -3, 9, -6, 3, -10, 7, -4, 6];

let state = load();
let view = { tab: "road", step: null, item: null, query: "" };

function load() {
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; }
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
}
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const srcLink = (s) => s ? `<div class="src">출처: <a href="${s.url}" target="_blank" rel="noopener">${esc(s.title)}</a> (확인 ${D.checked_at})</div>` : "";
const country = () => D.countries[state.trip.country];
const itemById = (id) => D.items.find((i) => i.id === id);
const dot = (date) => date.replaceAll("-", ".");
const num = new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 1 }).format;

function dday() {
  const ms = new Date(state.trip.departure_date) - new Date(new Date().toDateString());
  return Math.round(ms / 86400000);
}

// ---------- 판정 ----------
function judge(item, answers = {}) {
  let status = null, note = null, needs = false;
  if (item.rule?.type === "fixed") ({ status, note } = item.rule);
  if (item.rule?.type === "conditional") {
    const v = answers[item.rule.field];
    if (v == null) needs = true;
    else ({ status, note } = item.rule.cases.find((c) => c.max == null || v <= c.max));
  }
  const rules = country().rules.filter((r) => r.items.includes(item.id));
  const banner = status === "prohibited" || rules.some((r) => r.level === "banned");
  const bucket = banner ? "no" : status || "unknown";
  return { status, note, needs, rules, banner, bucket };
}

function search(q) {
  const n = q.replace(/\s/g, "");
  if (!n) return [];
  // 앞부분이 맞을 때만 매칭: "약"이 "치약"(액체류)에, "치약"이 "약"에 걸리지 않게
  return D.items.filter((i) => i.aliases.some((a) => a.startsWith(n) || (a.length > 1 && n.includes(a))));
}

// ---------- 화면 ----------
// 로고를 누르면 지금 할 일(첫 화면)로
const mark = `<h1 class="mark"><button class="home" data-tab="road" aria-label="STAMP, 지금 할 일로 가기">STAMP<span>혼자 떠나는 첫 해외여행 가이드</span></button></h1>`;

function render() {
  if (!state.trip) return renderSetup();
  const tabs = [["road", "지금 할 일"], ["stamps", "여행 로드맵"], ["items", "물건 확인"], ["bag", "내 짐"]]
    .map(([k, t]) => `<button class="${view.tab === k ? "on" : ""}" data-tab="${k}" ${view.tab === k ? 'aria-current="page"' : ""}>${t}</button>`).join("");
  // 왼쪽 위 메뉴: 화면이 다시 그려지면 자연스럽게 닫힘
  const head = `<header><details class="menu"><summary aria-label="메뉴"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg></summary>
    <nav aria-label="주 메뉴">${tabs}<button class="reset" data-act="reset">여행지 바꾸기</button></nav></details>${mark}</header>`;
  const body = view.tab === "road" ? roadView() : view.tab === "stamps" ? stampsView()
    : view.tab === "items" ? itemsView() : bagView();
  app.innerHTML = head + `<div class="narrow">${body}</div>`;
}

function renderSetup() {
  const opts = Object.entries(D.countries).map(([k, c]) => `<option value="${k}">${c.name}</option>`).join("");
  app.innerHTML = `<div class="narrow" style="max-width:440px;margin:24px auto 0">
    <div class="cover"><div class="emblem">STAMP</div><h1>첫 여권</h1><p>처음이면 다들 헷갈려요. 하나씩 같이 준비해요.</p></div>
    <div class="sheet">
      <label for="c">어디로 가나요?</label><select id="c">${opts}</select>
      <label for="d">언제 출발하나요?</label><input id="d" type="date" required>
      <p style="margin-top:16px"><button class="full" data-act="start">여권 만들기</button></p>
    </div></div>`;
}

function stepDone(s) { return (state.steps_done?.[s.id] || []).length === s.todos.length; }

function mrz(days) {
  const d = state.trip.departure_date.replaceAll("-", "").slice(2);
  return `P<KOR<STAMP<<${state.trip.country.toUpperCase()}<<${d}<<D${Math.max(days, 0)}`.padEnd(44, "<");
}

// 지금 할 단계: 여행 중(출국일이 지남)에는 출국 전 단계 대신 현지에서 할 단계 중에서
function nowStep() {
  const days = dday();
  const pool = days < 0 ? D.steps.filter((s) => s.during) : D.steps;
  return pool.find((s) => !stepDone(s) && days <= s.start) || pool.find((s) => !stepDone(s));
}
// 여권 화면에 보여 줄 단계: 이전/다음·도장으로 고른 단계, 없으면 지금 할 단계
const currentStepId = () => view.step || nowStep()?.id;

// 여권 정보 면 (목적지, 출국일, D-day): 여행 로드맵 맨 위
function datapage() {
  const days = dday();
  const dlabel = days > 0 ? `D-${days}` : days === 0 ? "D-DAY" : `D+${-days}`;
  return `<div class="datapage">
      <div class="fields">
        <div class="field"><small>목적지</small><b>${country().name}</b></div>
        <div class="dday"><b>${dlabel}</b><small>${days >= 0 ? "출국까지" : "여행 중"}</small></div>
        <div class="field"><small>출국일</small><b>${dot(state.trip.departure_date)}</b></div>
      </div>
      <div class="mrz" aria-hidden="true">${esc(mrz(days))}</div>
    </div>`;
}

// 지금 할 일: 지금 진행할 단계
function roadView() {
  const id = currentStepId();
  return `${id ? stepView(id) : `<div class="sheet"><h2 style="margin-top:0">모든 단계를 끝냈어요</h2><p>도장을 모두 모았어요. 즐거운 여행 되세요.</p><button data-tab="stamps">여행 로드맵 보기</button></div>`}`;
}

function stampsView() {
  const done = D.steps.filter(stepDone).length;
  const now = nowStep();
  const slots = D.steps.map((s, i) => {
    const isDone = stepDone(s);
    const style = isDone ? `style="--ink-c:${INKS[i % 4]};--tilt:${TILTS[i]}deg"` : "";
    const inner = isDone
      ? `<span>${icon(s.id)}<span class="t">${s.title}</span>${dot(state.stamped?.[s.id] || "")}</span>`
      : `<span>${icon(s.id)}<span class="t">${s.title}</span>${s === now ? "지금 할 일" : s.start > 0 ? `D-${s.start}부터` : "출국 당일부터"}</span>`;
    return `<button class="slot shape-${i % 3} ${isDone ? "done" : ""} ${s === now ? "now" : ""}" data-step="${s.id}" ${style} aria-label="${i + 1}단계 ${s.title}${isDone ? " 완료" : ""}">${inner}</button>`;
  }).join("");
  return `${datapage()}
    <section class="visa" aria-labelledby="col-title">
      <div class="col-head">
        <h2 id="col-title">여행 로드맵</h2>
        <div class="count" aria-label="도장 ${done}개 중 ${D.steps.length}개"><b>${two(done)}</b><span>/ ${D.steps.length}</span></div>
      </div>
      <div class="slots">${slots}</div>
    </section>`;
}

// 여행경보 단계는 수시로 바뀌니 단계를 적지 않고 외교부 국가 페이지로 바로 연결
const alertLink = (c) => `<a class="alert" href="${c.alert.url}" target="_blank" rel="noopener">${c.name} 여행경보 보기<span>외교부 해외안전여행 · 새 창</span></a>`;

// 인천공항 게이트 번호 → 건물 (출국절차 공식 안내의 게이트 번호 범위)
const gateBuilding = (g) => Object.keys(D.airports.icn.buildings).find((k) => g >= D.airports.icn.buildings[k].gates[0] && g <= D.airports.icn.buildings[k].gates[1]);

// 건물 위치 관계 그림 (실제 도면 아님): 제2터미널 · 제1터미널 ─셔틀트레인─ 탑승동
function gateMap(b) {
  const B = D.airports.icn.buildings;
  const blk = (id, x) => {
    const cls = id === b ? "on" : b === "CA" && id === "T1" ? "from" : "";
    return `<g class="blk ${cls}"><path d="M${x} 58h72v40h-72z"/><path d="M${x} 58l12-12h72l-12 12z"/><path d="M${x + 72} 58l12-12v40l-12 12z"/>
      <text x="${x + 42}" y="122">${B[id].name}</text></g>`;
  };
  const label = b === "CA" ? "제1여객터미널에서 셔틀트레인을 타고 탑승동으로 가는 그림" : `${B[b].name} 위치 그림`;
  return `<svg class="gmap" viewBox="0 40 340 92" role="img" aria-label="${label}">${blk("T2", 0)}${blk("T1", 116)}${blk("CA", 256)}
    <path class="rail ${b === "CA" ? "on" : ""}" d="M200 82h56"/><text class="rail-t" x="228" y="74">셔틀트레인</text></svg>`;
}

function gateSteps(b, g) {
  const B = D.airports.icn.buildings, dep = B[b].from || b;
  const steps = [`${B[dep].name} 3층 출국장에 도착해요`, "체크인 카운터에서 탑승수속을 하고 짐을 부쳐요", "보안검색을 받아요",
    "출국심사를 받아요. 면세구역에 들어가면 일반구역으로 돌아갈 수 없어요"];
  if (b === "CA") steps.push("지하 1층에서 셔틀트레인을 타고 탑승동으로 가요. 5분마다 다니고, 한 번 타면 돌아올 수 없어요",
    "탑승동에 내리면 에스컬레이터로 두 층 올라가 3층으로 가요");
  steps.push(`${g}번 게이트에 탑승 30~40분 전까지 도착해요`);
  return steps;
}

// 7단계 출발 공항 고르기: 인천은 게이트 찾기, 한국공항공사 공항은 국제선 출발 순서
const airportId = () => (D.airports[state.airport] ? state.airport : "icn");
function airportView() {
  const id = airportId(), a = D.airports[id];
  const opts = Object.entries(D.airports).map(([k, x]) => `<option value="${k}" ${k === id ? "selected" : ""}>${x.name}</option>`).join("");
  return `<div class="info gate"><h3>출발 공항</h3><label for="ap" style="margin-top:0">어느 공항에서 출발하나요?</label><select id="ap">${opts}</select>
    ${a.buildings ? gateView() : kacView(a)}</div>`;
}

function kacView(a) {
  return `<p class="gate-where">${a.name} 국제선 출국 순서예요.</p>
    <ol class="gate-steps">${D.kacSteps.map((x) => `<li>${x}</li>`).join("")}</ol>
    <p class="footnote">탑승구 번호는 탑승권과 공항 전광판, 아래 실시간 출발 안내에서 확인하세요.</p>
    <a class="alert map" href="${a.board.url}" target="_blank" rel="noopener">${a.name} 실시간 출발 안내<span>새 창</span></a>`;
}

function gateView() {
  const A = D.airports.icn, g = state.gate, b = g && gateBuilding(g);
  const result = b ? `<p class="gate-where" tabindex="-1"><b>${g}번 게이트</b>는 <b>${A.buildings[b].name}</b>에 있어요.</p>${gateMap(b)}
    <p class="footnote" style="margin-top:0">실제 도면이 아니라 건물 위치 관계를 나타낸 그림이에요.</p>
    <ol class="gate-steps">${gateSteps(b, g).map((x) => `<li>${x}</li>`).join("")}</ol>` : "";
  return `<label for="gate">인천공항 게이트 찾기: 탑승권에 적힌 게이트 번호</label>
    <div class="row"><input id="gate" type="number" min="1" inputmode="numeric" enterkeyhint="search" placeholder="예: 115" value="${g ?? ""}"><button data-act="gate" style="flex:none">찾기</button></div>
    ${result}
    <p class="footnote">터미널은 항공사마다 달라요. 제2여객터미널은 ${A.buildings.T2.airlines}, 제1여객터미널은 ${A.buildings.T1.airlines}. 공동운항편은 다를 수 있으니 전자항공권에서 꼭 확인하세요.</p>
    <a class="alert map" href="${A.map.url}" target="_blank" rel="noopener">인천공항 공식 지도 보기<span>새 창</span></a>`;
}

// 단계에서 쓴 출처 모음 (단계 맨 아래 "출처 보기"에 한 번에 표시)
function stepSources(s) {
  const c = country();
  const by = { gate: D.airports[airportId()].sources, entry: [c.entry?.source], rules: c.rules.flatMap((r) => [].concat(r.source)), power: [c.info.source], calls: [c.emergencySource] };
  const all = [...(by[s.info] || []), ...(s.links || [])].filter(Boolean);
  return all.filter((x, i) => all.findIndex((y) => y.url === x.url) === i);
}

// 단계에 맞는 여행 국가 정보 (data.js steps[].info), 출처는 stepSources에서 따로 모음
function stepInfo(s) {
  if (s.info === "gate") return airportView();
  const c = country();
  const box = (title, body) => `<div class="info"><h3>${c.name} ${title}</h3>${body}</div>`;
  if (s.info === "entry") return box("입국 조건", c.entry
    ? `<p>${esc(c.entry.text)}</p>`
    : `<p>아직 공식 출처로 확인하지 못했어요. 외교부 해외안전여행에서 확인하세요.</p>`) + alertLink(c);
  if (s.info === "rules") return box("반입 주의 물건", c.rules.map((r) =>
    `<div class="note lv-${r.level}"><b>${r.items.map((id) => esc(itemById(id).name)).join(", ")} · ${LEVEL[r.level]}</b>${r.message}</div>`).join(""));
  if (s.info === "power") return box("전기·플러그", `<dl><dt>전압</dt><dd>${c.info.voltage || "공식 출처 확인 전"}</dd>
    <dt>플러그</dt><dd>${c.info.plug || "공식 출처 확인 전"}</dd></dl>`);
  if (s.info === "calls") return box("긴급 번호", `<ul class="calls">${[...c.emergency, ...D.commonEmergency]
    .map(([l, n]) => `<li><span>${esc(l)}</span><a href="tel:${n.replace(/[^\d+]/g, "")}">${n}</a></li>`).join("")}</ul>`);
  return "";
}

function stepView(id) {
  const i = D.steps.findIndex((x) => x.id === id);
  const s = D.steps[i];
  const checked = state.steps_done?.[s.id] || [];
  const srcs = stepSources(s);
  return `<div class="sheet"><div class="muted">${i + 1}단계${s === nowStep() ? ` <span class="now-tag">지금 할 일</span>` : ""}</div>
      <h2 style="margin-top:4px">${s.title}</h2><p>${s.summary}</p>
      ${stepInfo(s)}
      <ul class="todos">${s.todos.map((t, j) => `<li><label><input type="checkbox" data-todo="${j}" ${checked.includes(j) ? "checked" : ""}>${esc(t)}</label></li>`).join("")}</ul>
      ${s.goItems ? `<p style="margin-top:12px"><button data-tab="items">물건 확인하기</button></p>` : ""}
      <h2 style="font-size:15px">자주 하는 실수</h2><ul>${s.mistakes.map((m) => `<li>${esc(m)}</li>`).join("")}</ul>
      ${s.faq.map(([q, a, link]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p>${link === "alert" ? alertLink(country()) : ""}</details>`).join("")}
</div>
    <div class="pager">
      ${i > 0 ? `<button class="ghost" data-step="${D.steps[i - 1].id}"><small>이전 ${i}단계</small>${D.steps[i - 1].title}</button>` : "<span></span>"}
      ${i < D.steps.length - 1 ? `<button class="ghost next" data-step="${D.steps[i + 1].id}"><small>다음 ${i + 2}단계</small>${D.steps[i + 1].title}</button>` : ""}
    </div>
    ${srcs.length ? `<footer class="page-foot"><details class="sources"><summary>출처 보기 (${srcs.length})</summary>${srcs.map(srcLink).join("")}</details></footer>` : ""}`;
}

function itemsView() {
  if (view.item) return resultView();
  const hits = search(view.query);
  // 여행 국가에서 입국 금지인 물건은 칩에 작은 "금지" 표시
  const banned = new Set(country().rules.filter((r) => r.level === "banned").flatMap((r) => r.items));
  const chips = (list) => `<div class="chips">${list.map((i) => `<button data-item="${i.id}">${esc(i.name)}${banned.has(i.id)
    ? `<span class="ban">${country().name} 금지</span>` : ""}</button>`).join("")}</div>`;
  const grouped = `<div class="groups">${GROUPS.map(([title, ic, ids]) =>
    `<h3>${gicon(ic)}${title}</h3>${chips(ids.map(itemById))}`).join("")}</div>`;
  const list = !view.query ? grouped
    : hits.length ? chips(hits)
    : `<p style="margin-top:12px">"${esc(view.query)}"은(는) 아직 규정표에 없어요. 공식 안내에서 확인하세요.</p>${D.fallbackLinks.map(srcLink).join("")}`;
  return `<h2>물건 확인</h2><div class="sheet">
      <label for="q">가져갈 물건 이름</label>
      <div class="row"><input id="q" enterkeyhint="search" placeholder="보조배터리, 육포, 감기약" value="${esc(view.query)}"><button data-act="search" style="flex:none">찾기</button></div>
      <label class="photo-btn">사진으로 확인하기<input type="file" id="photo" accept="image/*"></label>
      ${photoView()}
      ${view.photo ? "" : list}</div>
    <p class="footnote">한국 공항 출국 규정과 ${country().name} 입국 규정을 함께 보여줘요.</p>`;
}

// 사진 판별 결과: AI가 고른 후보를 보여 주고, 사용자가 눌러서 확정
const PHOTO_ERR = { no_key: "사진 인식이 아직 설정되지 않았어요.", quota: "오늘 사진 인식 횟수를 다 썼어요.", limit: "사진 확인을 짧은 시간에 너무 많이 했어요. 잠시 뒤에 다시 해 주세요." };
function photoView() {
  const p = view.photo;
  if (!p) return "";
  if (p.status === "loading") return `<p class="photo-msg" role="status">사진을 보고 있어요…</p>`;
  const retry = `<p class="footnote">이름으로 찾거나 다시 찍어 보세요. <button class="link" data-act="photo-clear">목록 보기</button></p>`;
  if (p.status === "error") return `<p class="photo-msg" role="alert">${PHOTO_ERR[p.error] || "지금은 사진 인식이 어려워요."}</p>${retry}`;
  const r = p.result;
  const ids = [...new Set([r.item_id, ...r.candidates])].filter((id) => id !== "unknown");
  if (!ids.length) return `<p class="photo-msg" role="alert">무슨 물건인지 잘 알아보지 못했어요.</p>${retry}`;
  return `<p class="photo-msg" role="status">${r.confidence === "high" && ids.length ? "이 물건이 맞나요?" : "이 중에 있나요?"}</p>
    <div class="chips">${ids.map((id) => `<button data-item="${id}">${esc(itemById(id).name)}</button>`).join("")}</div>
    <p class="footnote">AI가 사진을 보고 고른 결과예요. 맞는 물건을 눌러 주세요. 사진은 저장하지 않아요.</p>${retry}`;
}

// 사진을 1024px 이하 JPEG로 줄여서 보냄 (무료 한도·전송량 절약)
async function shrink(file) {
  const img = await createImageBitmap(file);
  const k = Math.min(1, 1024 / Math.max(img.width, img.height));
  const c = Object.assign(document.createElement("canvas"), { width: Math.round(img.width * k), height: Math.round(img.height * k) });
  c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", 0.8).split(",")[1];
}

async function identifyPhoto(file) {
  view.photo = { status: "loading" };
  render();
  try {
    const r = await fetch("/api/identify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ image: await shrink(file), mime: "image/jpeg" }) });
    const data = await r.json().catch(() => ({}));
    // 우리 서버는 error를 문자열로 줌. 429인데 문자열이 아니면 Vercel 방화벽의 IP별 횟수 제한에 걸린 것
    const err = typeof data.error === "string" ? data.error : r.status === 429 ? "limit" : undefined;
    view.photo = r.ok ? { status: "done", result: data } : { status: "error", error: err };
  } catch {
    view.photo = { status: "error" };
  }
  render();
}

function resultView() {
  const item = itemById(view.item);
  const r = judge(item, view.answers || {});
  const back = `<p><button class="link" data-act="back">물건 목록으로</button></p>`;
  if (r.needs) {
    // 사진에서 용량 글자를 읽었으면 미리 채워 두고 사용자가 확인
    const cap = view.photo?.result?.capacity;
    const battery = item.rule.input === "battery";
    const pre = cap?.value > 0 && (battery ? ["mAh", "Wh"].includes(cap.unit) : cap.unit === item.rule.unit) ? cap : null;
    const field = battery
      ? `<div class="row"><input id="v" type="number" min="0" inputmode="decimal" enterkeyhint="done" placeholder="20000" value="${pre?.value ?? ""}"><select id="u" style="flex:none;width:96px" aria-label="단위"><option>mAh</option><option ${pre?.unit === "Wh" ? "selected" : ""}>Wh</option></select></div>
         <div class="footnote">제품에 Wh가 적혀 있으면 Wh로 입력하세요. mAh는 3.7V 기준으로 계산해요.</div>`
      : `<div class="row"><input id="v" type="number" min="0" inputmode="decimal" enterkeyhint="done" placeholder="${item.rule.placeholder}" value="${pre?.value ?? ""}"><span style="flex:none">${item.rule.unit}</span></div>`;
    return `${back}<div class="sheet"><h2 style="margin-top:0">${esc(item.name)}</h2>
      <label for="v">${item.rule.question}</label>${field}
      ${pre ? `<div class="footnote">사진에서 읽은 값이에요. 제품에 적힌 숫자와 같은지 확인하세요.</div>` : ""}
      <p style="margin-top:12px"><button data-act="answer">판정 보기</button></p></div>`;
  }
  const [main, sub] = VERDICT[r.status];
  const isMed = item.category === "medicine";
  const c = country();
  // 탑승권: 위는 물건과 여정(한국 출국 → 여행 국가 입국), 절취선 아래는 두 판정
  const entry = r.rules.some((x) => x.level === "banned") ? "banned" : r.rules.some((x) => x.level === "declare") ? "declare" : r.rules.length ? "info" : "ok";
  const ENTRY = { banned: "입국 금지", declare: "신고·서류 확인", info: "참고할 점 있음", ok: "제한 없음" };
  return `${back}<article class="pass" aria-label="${esc(item.name)} 판정">
    ${r.banner ? `<div class="banner">가져가지 마세요</div>` : ""}
    <div class="pass-top"><h2>${esc(item.name)}</h2>
      <div class="route"><span>한국<small>출국</small></span><i aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 15l14-6a1.6 1.6 0 0 0-1-3l-4 1.5L8 4 6.5 4.7l3.5 4.4-4 1.6-2-1.5-1.2.5 2 4z"/></svg></i><span>${c.name}<small>입국</small></span></div></div>
    <div class="pass-cut" aria-hidden="true"></div>
    <div class="pass-stub">
      <div><small>한국 공항 출국</small><div class="verdict s-${r.status}">${main}<small>${sub}</small></div></div>
      <div><small>${c.name} 입국</small><b class="entry e-${entry}">${ENTRY[entry]}</b></div>
    </div></article>
  <div class="sheet">
    ${r.note ? `<p>${r.note}</p>` : ""}${item.reason ? `<p class="muted">${item.reason}</p>` : ""}
    ${(item.sources || []).map(srcLink).join("")}
    ${r.status == null ? D.fallbackLinks.map(srcLink).join("") : ""}
    ${r.rules.map((x) => `<div class="note lv-${x.level}"><b>${country().name} ${LEVEL[x.level]}</b>${x.message}</div>${[].concat(x.source).map(srcLink).join("")}`).join("")}
    ${item.documents ? `<p style="margin-top:12px"><b>챙길 서류</b>: ${item.documents.join(", ")}</p>` : ""}
    <div class="footnote">최종 판단은 이용 항공사 안내를 확인하세요.${isMed ? " 의료 조언이 아닌 챙길 것 안내예요. 복용은 의사·약사와 상담하세요." : ""}</div>
    <p style="margin-top:14px"><button class="full" data-act="add">내 짐에 추가</button></p></div>`;
}

// 기본 항목 + 여행 국가 항목 (입국 금지 규정, 공식 안내에 어댑터가 필요하다고 나온 나라)
function checklist() {
  const c = country();
  const extra = c.rules.filter((r) => r.level === "banned").flatMap((r) => r.items.map((id) =>
    ({ id: `${state.trip.country}_no_${id}`, cat: `${c.name} 주의`, text: `${itemById(id).name} 넣지 않기`, item: id })));
  if (c.info.adapter) extra.unshift({ id: `${state.trip.country}_adapter`, cat: `${c.name} 주의`, text: `여행용 어댑터 (${c.info.plug.split(" — ")[0]})` });
  return [...D.checklist, ...extra];
}

function checklistView() {
  const list = checklist();
  const done = state.checklist_done || [];
  const n = list.filter((x) => done.includes(x.id)).length;
  const cats = [...new Set(list.map((x) => x.cat))];
  return `<div class="sheet checklist"><div class="col-head"><div><h3>챙길 것</h3><p class="muted">${n === list.length ? "다 챙겼어요." : "가방에 넣었으면 체크하세요."}</p></div>
    <div class="count" aria-label="${list.length}개 중 ${n}개 챙김"><b>${two(n)}</b><span>/ ${list.length}</span></div></div>
    ${cats.map((cat) => `<h4>${esc(cat)}</h4><ul class="todos">${list.filter((x) => x.cat === cat).map((x) =>
      `<li><label><input type="checkbox" data-check="${x.id}" ${done.includes(x.id) ? "checked" : ""}>${esc(x.text)}</label>${x.item
        ? `<button class="link" data-tab="items" data-item="${x.item}">규정 보기</button>` : ""}</li>`).join("")}</ul>`).join("")}</div>`;
}

function bagView() {
  const bag = state.bag || [];
  const head = `<h2>내 짐 <span class="muted">${country().name} 기준</span></h2>${checklistView()}`;
  if (!bag.length) return `${head}<div class="sheet"><h3>판정한 물건</h3><p>아직 담은 물건이 없어요.</p><button data-tab="items">물건 확인하기</button></div>`;
  const groups = {};
  bag.forEach((b, idx) => {
    const item = itemById(b.item_id);
    (groups[judge(item, b.answers).bucket] ||= []).push({ item, b, idx });
  });
  return head + Object.keys(BUCKET).filter((k) => groups[k]).map((k) =>
    `<section class="sheet group tag t-${k}"><h3>${BUCKET[k]}</h3><ul>${groups[k].map(({ item, b, idx }) =>
      `<li><span>${esc(item.name)}${b.answers?.[item.rule?.field] ? ` (${num(b.answers[item.rule.field])}${item.rule.unit})` : ""}</span>
       <button class="link" data-del="${idx}">빼기</button></li>`).join("")}</ul></section>`).join("");
}

// 입력칸 바로 아래에 오류를 보여주고 화면 낭독기와 연결
function showErr(id, msg) {
  const el = document.getElementById(id);
  el.setAttribute("aria-invalid", "true");
  el.setAttribute("aria-describedby", `${id}-err`);
  let p = document.getElementById(`${id}-err`);
  if (!p) {
    p = Object.assign(document.createElement("p"), { id: `${id}-err`, className: "err" });
    p.setAttribute("role", "alert");
    (el.closest(".row") || el).after(p);
  }
  p.textContent = msg;
  el.focus();
}

function stampFx(s) {
  const el = document.createElement("div");
  el.className = "stampfx";
  el.setAttribute("role", "status");
  el.innerHTML = `<div>${icon(s.id)}STAMP<small>${esc(s.title)} 완료</small></div>`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1300);
}

// ---------- 이벤트 ----------
document.addEventListener("click", (e) => {
  // 메뉴 바깥을 누르면 메뉴 닫기
  const menu = document.querySelector(".menu[open]");
  if (menu && !menu.contains(e.target)) menu.open = false;
  const t = e.target.closest("[data-tab],[data-act],[data-step],[data-item],[data-del]");
  if (!t) return;
  const d = t.dataset;
  if (d.tab) Object.assign(view, { tab: d.tab, step: null, item: null, photo: null });
  if (d.act === "photo-clear") view.photo = null;
  if (d.step) Object.assign(view, { tab: "road", step: d.step });
  if (d.item) Object.assign(view, { item: d.item, answers: {} });
  if (d.del) { state.bag.splice(+d.del, 1); save(); }
  if (d.act === "back") Object.assign(view, { step: null, item: null });
  if (d.act === "reset") { delete state.trip; save(); }
  if (d.act === "start") {
    const date = document.getElementById("d").value;
    if (!date) return showErr("d", "출국일을 선택해 주세요.");
    state = { ...state, trip: { country: document.getElementById("c").value, departure_date: date } };
    save();
  }
  if (d.act === "search") Object.assign(view, { query: document.getElementById("q").value.trim(), photo: null });
  if (d.act === "gate") {
    const typed = document.getElementById("gate").value, g = Number(typed);
    if (!Number.isInteger(g) || !gateBuilding(g)) {
      delete state.gate; // 예전 결과가 오류 문구 아래 남지 않게, 입력한 숫자는 그대로 둠
      save();
      render();
      document.getElementById("gate").value = typed;
      return showErr("gate", "1~50, 101~132, 208~290번 중에서 입력해 주세요.");
    }
    state.gate = g;
    save();
    render();
    return document.querySelector(".gate-where")?.focus(); // 화면 낭독기가 결과부터 읽게
  }
  if (d.act === "answer") {
    const v = parseFloat(document.getElementById("v").value);
    if (!(v > 0)) return showErr("v", "0보다 큰 숫자로 입력해 주세요.");
    const item = itemById(view.item);
    const unit = document.getElementById("u")?.value;
    view.answers = { [item.rule.field]: unit === "mAh" ? (v / 1000) * 3.7 : v };
  }
  if (d.act === "add") {
    (state.bag ||= []).push({ item_id: view.item, answers: view.answers || {}, added_at: new Date().toISOString() });
    save();
    Object.assign(view, { tab: "bag", item: null, photo: null });
  }
  const navigated = d.tab || d.step || d.item || d.act === "back" || d.act === "add" || d.act === "start" || d.act === "reset";
  if (!navigated) return render();
  // 화면이 바뀌면 새 화면을 부드럽게 넘기고, 포커스를 본문 처음으로 옮겨 키보드·화면 낭독기 사용자가 길을 잃지 않게 함
  swap(() => { render(); app.focus(); window.scrollTo(0, 0); });
});

// View Transitions를 지원하는 브라우저에서만 화면 전환 효과, 아니면 바로 바꿈 (움직임은 index.html CSS)
function swap(update) {
  if (!document.startViewTransition) return update();
  document.startViewTransition(update);
}

document.addEventListener("change", (e) => {
  if (e.target.id === "photo") return e.target.files[0] && identifyPhoto(e.target.files[0]);
  if (e.target.id === "ap") {
    state.airport = e.target.value;
    save();
    render();
    return document.getElementById("ap").focus(); // 다시 그려도 포커스 유지
  }
  if (e.target.dataset.check) {
    const done = new Set(state.checklist_done || []);
    e.target.checked ? done.add(e.target.dataset.check) : done.delete(e.target.dataset.check);
    state.checklist_done = [...done];
    save();
    render(); // 개수 다시 그리기, 키보드 사용자를 위해 같은 칸에 포커스 유지
    return document.querySelector(`[data-check="${e.target.dataset.check}"]`)?.focus();
  }
  if (e.target.dataset.todo == null) return;
  const s = D.steps.find((x) => x.id === currentStepId());
  const done = new Set(state.steps_done?.[s.id] || []);
  const i = +e.target.dataset.todo;
  e.target.checked ? done.add(i) : done.delete(i);
  const before = stepDone(s);
  (state.steps_done ||= {})[s.id] = [...done];
  if (!before && stepDone(s)) {
    (state.stamped ||= {})[s.id] = new Date().toISOString().slice(0, 10);
    stampFx(s);
    // 도장 연출이 끝나면 다음에 할 단계로 넘어감 (그 사이 다른 화면으로 갔거나 체크를 풀었으면 그대로)
    const shown = view.step;
    setTimeout(() => {
      if (view.tab !== "road" || view.step !== shown || !stepDone(s)) return;
      view.step = null;
      swap(() => { render(); app.focus(); window.scrollTo(0, 0); });
    }, 1300);
  }
  save();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && e.target.id === "q") { Object.assign(view, { query: e.target.value.trim(), photo: null }); render(); }
  if (e.key === "Enter" && e.target.id === "gate") document.querySelector('[data-act="gate"]').click();
  const menu = document.querySelector(".menu[open]");
  if (e.key === "Escape" && menu) { menu.open = false; menu.querySelector("summary").focus(); }
});

render();
