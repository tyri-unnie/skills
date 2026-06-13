// gen-videocard.cjs — '영상카드' 하단 패널 PNG 생성(1080x1350, 상단 TOPH px=영상자리 투명, 하단=브랜드+제목+설명).
//  루틴2: 뉴스 1건 = 카드 1장(영상). 상단=가로(16:9) 영상, 하단=제목-설명.
//  env: IDX, TITLE, DESC, SRC, DATE, TOPH(기본 608), OUT(파일경로)
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
const E = process.env;
const IDX = E.IDX || '1';
const TITLE = E.TITLE || '제목';
const DESC = E.DESC || '';                             // 단문(옵션)
const BULLETS = E.BULLETS_FILE ? JSON.parse(fs.readFileSync(E.BULLETS_FILE, 'utf8'))
  : (E.BULLETS ? JSON.parse(E.BULLETS) : []);           // 개조식 불릿(JSON 배열 또는 파일)
const SRC = E.SRC || 'Source';
const DATE = E.DATE || '2026.06.12';
const TOPH = parseInt(E.TOPH || '720', 10);          // 상단 영상 높이. 데일리 루틴=720(3:2 가로영상, 더 높게)
const OUTP = E.OUT || path.join(__dirname, 'output', 'videocards', 'panel.png');
fs.mkdirSync(path.dirname(OUTP), { recursive: true });
const W = 1080, H = 1350, BH = H - TOPH;             // 하단 패널 높이

const AC = '#2B50E6', INK = '#1A1E38', SUB = '#6b7088';
const PAL = { lavLt:'#E2DEF7', blueLt:'#C2D4F5', sky:'#BFE0F2', mintLt:'#D4EEE1', indigoSoft:'#8E91EC' };
const BG = `radial-gradient(circle at 12% 20%, rgba(207,201,240,.55) 0%, rgba(255,255,255,0) 50%),radial-gradient(circle at 90% 30%, rgba(157,180,240,.40) 0%, rgba(255,255,255,0) 48%),radial-gradient(circle at 88% 96%, rgba(191,224,242,.40) 0%, rgba(255,255,255,0) 50%),linear-gradient(135deg,#EEF0FB 0%,#F4F1FB 55%,#EAF0FA 100%)`;

const css = `*{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:"Pretendard",sans-serif;-webkit-font-smoothing:antialiased;background:transparent;}
  .frame{position:relative;width:${W}px;height:${H}px;background:transparent;overflow:hidden;}
  .top{position:absolute;top:0;left:0;width:${W}px;height:${TOPH}px;background:transparent;}
  /* 상단 영상 위 가독성 스크림 + 라벨 */
  .vidscrim{position:absolute;top:0;left:0;right:0;height:150px;background:linear-gradient(to bottom, rgba(16,18,38,.55) 0%, rgba(16,18,38,0) 100%);}
  .toplabel{position:absolute;top:68px;left:92px;display:flex;align-items:center;gap:13px;color:#fff;font-size:38px;font-weight:800;text-shadow:0 2px 12px rgba(0,0,0,.45);}
  .toplabel .sep{color:#9DB4F0;font-weight:700;}
  .badge{position:absolute;top:66px;right:92px;background:${AC};color:#fff;font-size:30px;font-weight:800;padding:8px 26px;border-radius:30px;box-shadow:0 10px 26px rgba(43,80,230,.4);}
  /* 하단 텍스트 패널 — FB 오버스캔 대비 안전여백(좌우 92px, 하단 64px) */
  .panel{position:absolute;left:0;top:${TOPH}px;width:${W}px;height:${BH}px;background:${BG};padding:48px 92px 64px;display:flex;flex-direction:column;}
  .ribbon{position:absolute;top:-3px;left:0;width:100%;height:6px;background:${AC};}
  .meta{display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;}
  .seclabel{font-size:29px;font-weight:800;color:${AC};}
  .date{font-size:25px;font-weight:700;color:${SUB};}
  .title{font-size:58px;font-weight:900;line-height:1.12;letter-spacing:-.035em;color:${INK};}
  .desc{margin-top:18px;font-size:33px;font-weight:600;line-height:1.4;color:#2b3050;}
  .bullets{margin-top:22px;display:flex;flex-direction:column;gap:16px;}
  .bi{display:flex;gap:18px;align-items:flex-start;}
  .dot{flex:none;width:14px;height:14px;border-radius:5px;background:${AC};margin-top:13px;}
  .bt{font-size:32px;font-weight:600;line-height:1.36;color:#2f3550;letter-spacing:-.01em;}
  .bt b{font-weight:800;color:${INK};}
  .foot{margin-top:auto;padding-top:18px;display:flex;align-items:center;gap:18px;}
  .bar{width:56px;height:9px;border-radius:6px;background:${AC};flex:none;}
  .src{font-size:24px;font-weight:600;color:${SUB};}`;

const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@latest/dist/web/static/pretendard.css">
<style>${css}</style></head><body>
<section class="frame">
  <div class="top"><div class="vidscrim"></div>
    <div class="toplabel">AI 솔로프리너 <span class="sep">|</span> 타이리 언니</div>
    <div class="badge">오늘의 AI #${IDX}</div>
  </div>
  <div class="panel"><div class="ribbon"></div>
    <div class="meta"><span class="seclabel">오늘의 AI 소식</span><span class="date">${DATE}</span></div>
    <h2 class="title">${TITLE}</h2>
    ${DESC ? `<p class="desc">${DESC}</p>` : ''}
    ${BULLETS.length ? `<div class="bullets">${BULLETS.map(b => `<div class="bi"><span class="dot"></span><span class="bt">${b}</span></div>`).join('')}</div>` : ''}
    <div class="foot"><span class="bar"></span><span class="src">${SRC}</span></div>
  </div>
</section></body></html>`;

(async () => {
  const FILE = path.join(path.dirname(OUTP), '_panel.html'); fs.writeFileSync(FILE, html, 'utf8');
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  await p.goto('file://' + FILE, { waitUntil: 'networkidle' });
  try { await p.evaluate(() => document.fonts.ready); } catch {}
  await p.waitForTimeout(800);
  await (await p.$('.frame')).screenshot({ path: OUTP, omitBackground: true });
  await b.close();
  console.log('panel:', OUTP);
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
