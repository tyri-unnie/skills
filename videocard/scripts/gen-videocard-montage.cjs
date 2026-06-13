// gen-videocard-montage.cjs — 영상카드(4:5)인데 상단 720px = 여러 스틸컷 몽타주(컷전환+은은한 스케일, zoompan 떨림 없음).
//  사용자 지시(2026-06-13): 역동 영상 없을 때 스틸 여러 장을 ~2초씩 붙여 화면전환 애니메이션. 팬(translate) 금지 → GPU scale만.
//  하단 630px = gen-videocard 패널과 동일(라이트 그라데이션·리본·제목·개조식·출처). 92px 안전여백.
//  items JSON: {date, out_dir, items:[{idx, slug, title, bullets[], src, stills:[파일경로...]}]}
//  사용: node gen-videocard-montage.cjs items.json
const { chromium } = require('playwright');
const { execSync } = require('child_process');
const path = require('path'), fs = require('fs');
const DIR = process.env.VC_DIR || __dirname;   // 이식성: VC_DIR로 기준 폴더(스틸/출력 경로 기준) 지정
const itemsPath = (() => { const a = process.argv[2] || 'output/montage-items.json'; return a.startsWith('/') ? a : path.join(DIR, a); })();
const data = JSON.parse(fs.readFileSync(itemsPath, 'utf8'));
const OUT = path.join(DIR, 'output', data.out_dir || 'montage');
fs.mkdirSync(OUT, { recursive: true });
const DATE = data.date || '2026-06-13';
const DUR = 7000;                    // 카드 길이(ms)
const f = p => 'file://' + (p.startsWith('/') ? p : path.join(DIR, p));
const AC = '#2B50E6', INK = '#1A1E38', SUB = '#6b7088';
const TOPH = 720, BH = 1350 - TOPH;
const PANEL_BG = `radial-gradient(circle at 12% 20%, rgba(207,201,240,.55) 0%, rgba(255,255,255,0) 50%),radial-gradient(circle at 90% 30%, rgba(157,180,240,.40) 0%, rgba(255,255,255,0) 48%),radial-gradient(circle at 88% 96%, rgba(191,224,242,.40) 0%, rgba(255,255,255,0) 50%),linear-gradient(135deg,#EEF0FB 0%,#F4F1FB 55%,#EAF0FA 100%)`;

function html(item) {
  const stills = item.stills;
  const N = stills.length, step = 100 / N;
  const cuts = stills.map((_, k) => [Math.round(k * step), Math.round((k + 1) * step)]);
  // 각 컷: 등장(opacity)+은은한 scale(1.05→1.13), 다음 컷 직전 페이드아웃(크로스). translate 없음=떨림 없음.
  const kf = cuts.map(([s, e], k) => {
    const last = k === N - 1;
    const fadeIn = s > 0 ? `0%,${Math.max(s - 2, 0)}%{opacity:0;}` : `0%{opacity:1;}`;
    const tail = last ? `100%{opacity:1;transform:scale(1.13);}` : `${e - 2}%{opacity:1;transform:scale(1.115);}${e}%{opacity:0;transform:scale(1.13);}100%{opacity:0;}`;
    return `@keyframes mc${k}{${fadeIn}${s}%{opacity:1;transform:scale(1.05);}${tail}}`;
  }).join('\n');
  const anim = cuts.map((_, k) => `.m${k}{animation:mc${k} ${DUR}ms ease-in-out forwards;}`).join('');
  // 컷 경계 화이트 플래시(짧게)
  const flParts = cuts.slice(0, -1).map(([, e]) => `${e - 1}%{opacity:0;}${e}%{opacity:.4;}${Math.min(e + 1, 100)}%{opacity:0;}`).join('');
  const flashKf = `@keyframes fl{0%{opacity:0;}${flParts}100%{opacity:0;}}`;
  const layers = stills.map((s, k) => `<img class="m m${k}" src="${f(s)}">`).join('');
  const bullets = item.bullets.map(b => `<div class="bi"><span class="dot"></span><span class="bt">${b}</span></div>`).join('');
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@latest/dist/web/static/pretendard.css"><style>
*{margin:0;padding:0;box-sizing:border-box;}html,body{width:1080px;height:1350px;overflow:hidden;font-family:"Pretendard",sans-serif;-webkit-font-smoothing:antialiased;}
.stage{position:relative;width:1080px;height:1350px;overflow:hidden;background:#0E1024;}
.mtop{position:absolute;top:0;left:0;width:1080px;height:${TOPH}px;overflow:hidden;background:#0E1024;}
.m{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0;transform-origin:center;will-change:transform,opacity;}
${anim}
${kf}
.flash{position:absolute;top:0;left:0;width:1080px;height:${TOPH}px;background:#fff;opacity:0;z-index:3;animation:fl ${DUR}ms linear forwards;}
${flashKf}
.vidscrim{position:absolute;top:0;left:0;right:0;height:150px;background:linear-gradient(to bottom, rgba(16,18,38,.5) 0%, rgba(16,18,38,0) 100%);z-index:4;}
.toplabel{position:absolute;top:46px;left:92px;display:flex;align-items:center;gap:13px;color:#fff;font-size:38px;font-weight:800;text-shadow:0 2px 12px rgba(0,0,0,.5);z-index:5;}
.toplabel .sep{color:#9DB4F0;font-weight:700;}
.badge{position:absolute;top:44px;right:92px;background:${AC};color:#fff;font-size:30px;font-weight:800;padding:8px 26px;border-radius:30px;box-shadow:0 10px 26px rgba(43,80,230,.4);z-index:5;}
.panel{position:absolute;left:0;top:${TOPH}px;width:1080px;height:${BH}px;background:${PANEL_BG};padding:48px 92px 64px;display:flex;flex-direction:column;}
.ribbon{position:absolute;top:-3px;left:0;width:100%;height:6px;background:${AC};}
.meta{display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;}
.seclabel{font-size:29px;font-weight:800;color:${AC};}.date{font-size:25px;font-weight:700;color:${SUB};}
.title{font-size:58px;font-weight:900;line-height:1.12;letter-spacing:-.035em;color:${INK};}
.bullets{margin-top:22px;display:flex;flex-direction:column;gap:16px;}
.bi{display:flex;gap:18px;align-items:flex-start;}
.dot{flex:none;width:14px;height:14px;border-radius:5px;background:${AC};margin-top:13px;}
.bt{font-size:32px;font-weight:600;line-height:1.36;color:#2f3550;letter-spacing:-.01em;}.bt b{font-weight:800;color:${INK};}
.foot{margin-top:auto;padding-top:18px;display:flex;align-items:center;gap:18px;}
.bar{width:56px;height:9px;border-radius:6px;background:${AC};flex:none;}.src{font-size:24px;font-weight:600;color:${SUB};}
.prog{position:absolute;left:0;bottom:0;height:9px;width:0;background:#8E91EC;z-index:6;animation:prog ${DUR}ms linear forwards;}@keyframes prog{to{width:100%;}}
</style></head><body><div class="stage">
<div class="mtop">${layers}<div class="flash"></div><div class="vidscrim"></div>
  <div class="toplabel">AI 솔로프리너 <span class="sep">|</span> 타이리 언니</div>
  <div class="badge">오늘의 AI #${item.idx}</div></div>
<div class="panel"><div class="ribbon"></div>
  <div class="meta"><span class="seclabel">오늘의 AI 소식</span><span class="date">${DATE}</span></div>
  <h2 class="title">${item.title}</h2>
  <div class="bullets">${bullets}</div>
  <div class="foot"><span class="bar"></span><span class="src">${item.src}</span></div>
</div><div class="prog"></div></div></body></html>`;
}

(async () => {
  const browser = await chromium.launch();
  for (const item of data.items) {
    if (process.env.ONLY && !String(item.slug).includes(process.env.ONLY)) continue;
    const ctx = await browser.newContext({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 1, recordVideo: { dir: OUT, size: { width: 1080, height: 1350 } } });
    const page = await ctx.newPage();
    const FILE = path.join(OUT, `_m_${item.idx}.html`); fs.writeFileSync(FILE, html(item), 'utf8');
    await page.goto('file://' + FILE, { waitUntil: 'networkidle' });
    try { await page.evaluate(() => document.fonts.ready); } catch {}
    await page.waitForTimeout(DUR + 400);
    await page.close(); await ctx.close();
    const webm = fs.readdirSync(OUT).filter(x => x.endsWith('.webm')).map(x => ({ x, t: fs.statSync(path.join(OUT, x)).mtimeMs })).sort((a, b) => b.t - a.t)[0].x;
    const inP = path.join(OUT, webm), outP = path.join(OUT, `${String(item.idx).padStart(2, '0')}-${item.slug}-card.mp4`);
    execSync(`ffmpeg -y -i "${inP}" -t ${(DUR / 1000).toFixed(1)} -vf "fps=30,scale=1080:1350,format=yuv420p" -c:v libx264 -crf 20 -pix_fmt yuv420p -movflags +faststart -an "${outP}"`, { stdio: 'ignore' });
    fs.rmSync(inP, { force: true });
    console.log('card', item.slug, 'done');
  }
  await browser.close();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
