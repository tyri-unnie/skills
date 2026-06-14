// gen-videocard-strip.cjs — 여러 4:5 카드영상을 '횡으로 긴 한 영상'으로 합침(스레드 캐러셀 미리보기 스타일).
//  흰 배경 + 카드 둥근 모서리 + 카드 사이 여백. 모든 카드 동시 재생(가장 긴 길이에 맞춤).
//  사용: node gen-videocard-strip.cjs <out.mp4> <card1.mp4> <card2.mp4> ...
//        또는 폴더:  node gen-videocard-strip.cjs <out.mp4> <폴더>   (폴더 내 *-card.mp4 파일명 정렬순)
//  옵션(env): CARD_W(기본540) GAP(기본20) MARGIN(기본20) RADIUS(기본26) BG(기본 white) DUR(기본 7)
const { execSync } = require('child_process');
const fs = require('fs'), path = require('path');
const argv = process.argv.slice(2);
const outP = argv[0];
if (!outP) { console.error('사용: node gen-videocard-strip.cjs <out.mp4> <card1.mp4 ...|폴더>'); process.exit(2); }
let cards = argv.slice(1);
if (cards.length === 1 && fs.existsSync(cards[0]) && fs.statSync(cards[0]).isDirectory()) {
  const dir = cards[0];
  cards = fs.readdirSync(dir).filter(f => /-card\.mp4$/i.test(f)).sort().map(f => path.join(dir, f));
}
if (!cards.length) { console.error('카드 영상이 없습니다.'); process.exit(2); }

const CW = parseInt(process.env.CARD_W || '540', 10);     // 카드 표시 너비
const CH = Math.round(CW * 1350 / 1080);                   // 4:5 → 높이
const GAP = parseInt(process.env.GAP || '20', 10);         // 카드 사이 여백
const MG = parseInt(process.env.MARGIN || '20', 10);       // 외곽 여백
const R = parseInt(process.env.RADIUS || '26', 10);        // 모서리 반경
const BG = process.env.BG || 'white';                      // 배경색
const DUR = parseFloat(process.env.DUR || '7');            // 길이(초)
const N = cards.length;
let W = MG * 2 + N * CW + (N - 1) * GAP; if (W % 2) W++;
let H = MG * 2 + CH; if (H % 2) H++;

// 둥근 모서리 알파 마스크(translate 없음). superellipse 거리식.
const GEQ = `geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='if(gt(hypot(max(0\\,abs(X-W/2)-(W/2-${R}))\\,max(0\\,abs(Y-H/2)-(H/2-${R}))),${R}),0,255)'`;

const inputs = cards.map(c => `-i "${c}"`).join(' ') + ` -f lavfi -t ${DUR} -i "color=c=${BG}:s=${W}x${H}:r=30"`;
const bgIdx = N; // 배경은 마지막 입력
let fc = '';
for (let i = 0; i < N; i++) fc += `[${i}:v]scale=${CW}:${CH},setsar=1,format=rgba,${GEQ}[c${i}];`;
let prev = `[${bgIdx}:v]`;
for (let i = 0; i < N; i++) {
  const x = MG + i * (CW + GAP);
  const tag = i === N - 1 ? '[out]' : `[b${i}]`;
  fc += `${prev}[c${i}]overlay=${x}:${MG}${i === N - 1 ? ',format=yuv420p' : ''}${tag};`;
  prev = `[b${i}]`;
}
fc = fc.replace(/;$/, '');

const cmd = `ffmpeg -y ${inputs} -filter_complex "${fc}" -map "[out]" -t ${DUR} -c:v libx264 -crf 20 -pix_fmt yuv420p -movflags +faststart -an "${outP}"`;
try { execSync(cmd, { stdio: ['ignore', 'ignore', 'pipe'] }); console.log(`strip ok: ${outP} (${W}x${H}, ${N}장)`); }
catch (e) { console.error('ERR', (e.stderr || '').toString().slice(-400)); process.exit(1); }
