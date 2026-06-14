// gen-web-capture.mjs — 웹페이지 캡처(footage 사다리 4단계: 실영상·실이미지 없을 때 텍스트 살아있는 화면 캡처).
//   node gen-web-capture.mjs <url> <out.png> [viewportW=1280] [viewportH=2200] [waitMs=8000]
// scratch 프로필(헤드리스). 전체 뷰포트 캡처 → 이후 ffmpeg로 중요부분 crop/zoom해서 슬라이드화.
import { homedir } from 'os'; import { join } from 'path'; import { rmSync, writeFileSync } from 'fs';
const dist = join(homedir(), '.claude/skills/cheliped-browser/scripts/dist/index.js');
const { Cheliped } = await import(dist);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const url = process.argv[2]; const out = process.argv[3];
const vw = parseInt(process.argv[4] || '1280', 10), vh = parseInt(process.argv[5] || '2200', 10);
const wait = parseInt(process.argv[6] || '8000', 10);
if (!url || !out) { console.error('node gen-web-capture.mjs <url> <out.png> [w] [h] [waitMs]'); process.exit(2); }
const pd = join(homedir(), '.cheliped', 'profiles', 'scratch');
for (const f of ['SingletonLock', 'SingletonCookie', 'SingletonSocket']) { try { rmSync(join(pd, f), { force: true }); } catch {} }
const c = new Cheliped({ headless: true, stealth: true, session: { profileName: 'scratch', persistCookies: true }, viewport: { width: vw, height: vh } });
try {
  await c.launch();
  await c.goto(url); await sleep(wait);
  // 쿠키/동의 배너 대충 닫기(있으면)
  try { await c.runJs(`(()=>{const re=/Accept|동의|모두 허용|Got it|확인|Allow all/i;[...document.querySelectorAll('button,[role="button"]')].slice(0,60).forEach(b=>{if(re.test((b.innerText||'').trim())&&b.getBoundingClientRect().width>0){try{b.click()}catch(e){}}});return 1;})()`); } catch {}
  await sleep(1500);
  const shot = await c.screenshot();
  writeFileSync(out, shot.buffer);
  console.log('CAP ok=' + out);
} catch (e) { console.log('CAP err=' + e.message); }
finally { try { await c.close(); } catch {} }
