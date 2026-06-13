// gen-routine2.mjs — ai-whatchelin 일일 뉴스 → 영상카드 N장 일괄 생성(루틴2).
//  카드: 4:5(1080×1350), 상단 영상 3:2(1080×720), 하단 개조식 패널.
//  상단 미디어: video:<key>(보유 영상) | og:<url>(OG이미지 Ken Burns) | 실패시 브랜드 그라데이션 슬로우줌.
import { execSync, spawnSync } from 'child_process';
import { writeFileSync, mkdirSync, existsSync, statSync } from 'fs';
import { join } from 'path';
const DIR = process.env.VC_DIR || new URL('.', import.meta.url).pathname;
const itemsArg = process.argv[2] || join(DIR, 'output', 'routine2-items.json');
const itemsPath = itemsArg.startsWith('/') ? itemsArg : join(DIR, itemsArg);
const data = JSON.parse(execSync(`cat "${itemsPath}"`).toString());
const OUT = join(DIR, 'output', data.out_dir || 'routine2');
mkdirSync(OUT, { recursive: true });
const DATE = data.date;
const DUR = 8;                       // 카드당 초
const sh = (c) => execSync(c, { stdio: ['ignore', 'pipe', 'pipe'] }).toString();

function fetchOgImage(url) {
  try {
    const html = sh(`curl -sL --max-time 25 -A "Mozilla/5.0" "${url}"`);
    let m = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
         || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i)
         || html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i);
    if (!m) return null;
    let img = m[1]; if (img.startsWith('//')) img = 'https:' + img;
    const out = join(OUT, '_og_tmp.img');
    sh(`curl -sL --max-time 25 -A "Mozilla/5.0" -o "${out}" "${img}"`);
    if (!existsSync(out) || statSync(out).size < 3000) return null;
    // 유효 이미지인지 ffprobe로 확인
    const dim = sh(`ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 "${out}" 2>/dev/null || true`).trim();
    if (!/^\d+,\d+/.test(dim)) return null;
    return out;
  } catch { return null; }
}

function buildPanel(item) {
  const bf = join(OUT, `_bul_${item.idx}.json`); writeFileSync(bf, JSON.stringify(item.bullets));
  const panel = join(OUT, `${String(item.idx).padStart(2, '0')}-${item.slug}-panel.png`);
  const r = spawnSync('node', [join(DIR, 'gen-videocard.cjs')], {
    env: { ...process.env, IDX: String(item.idx), TITLE: item.title, BULLETS_FILE: bf, SRC: item.src, DATE, TOPH: '720', OUT: panel },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (r.status !== 0) throw new Error('panel-fail #' + item.idx + ' ' + (r.stderr || '').toString().slice(0, 200));
  return panel;
}

// 상단 영상 입력 필터 만들기 → [top] 1080x720
function topFilter(item) {
  if (item.media && item.media.startsWith('video:')) {
    // 보유 영상: video:<path>[@ss] → 16:9 → 1080x720 crop
    const spec = item.media.slice(6); const at = spec.includes('@') ? spec.split('@') : [spec, '17'];
    const vp = at[0].startsWith('/') ? at[0] : join(DIR, at[0]); const ss = at[1] || '17';
    return { input: `-ss ${ss} -t ${DUR} -i "${vp}"`,
      filter: `[0:v]fps=30,scale=1080:720:force_original_aspect_ratio=increase,crop=1080:720,setsar=1[top]`, kind: 'video' };
  }
  let img = null;
  if (item.media && item.media.startsWith('img:')) { const p = item.media.slice(4); img = p.startsWith('/') ? p : join(DIR, p); if (!existsSync(img)) img = null; }
  else if (item.media && item.media.startsWith('og:')) img = fetchOgImage(item.media.slice(3));
  if (img) {
    // OG 이미지 Ken Burns(슬로우 줌)
    return { input: `-loop 1 -t ${DUR} -i "${img}"`,
      filter: `[0:v]scale=1620:1080:force_original_aspect_ratio=increase,crop=1620:1080,zoompan=z='min(zoom+0.0007,1.12)':d=${DUR * 30}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1080x720:fps=30,setsar=1[top]`, kind: 'kenburns' };
  }
  // 폴백: 브랜드 그라데이션 슬로우 줌(텍스트 없음)
  return { input: `-f lavfi -t ${DUR} -i "gradients=s=1280x720:c0=0x8E91EC:c1=0x2B50E6:x0=0:y0=0:x1=1280:y1=720:d=${DUR}:speed=0.02"`,
    filter: `[0:v]fps=30,scale=1080:720,setsar=1[top]`, kind: 'gradient' };
}

const report = [];
for (const item of data.items) {
  const panel = buildPanel(item);
  const tf = topFilter(item);
  const card = join(OUT, `${String(item.idx).padStart(2, '0')}-${item.slug}-card.mp4`);
  const fc = `${tf.filter};color=c=0x121426:s=1080x1350:d=${DUR}[base];[base][top]overlay=0:0[v1];[v1][1:v]overlay=0:0[out]`;
  const cmd = `ffmpeg -y ${tf.input} -i "${panel}" -filter_complex "${fc}" -map "[out]" -t ${DUR} -c:v libx264 -crf 21 -preset medium -pix_fmt yuv420p -movflags +faststart -an "${card}"`;
  try { execSync(cmd, { stdio: ['ignore', 'ignore', 'pipe'] }); report.push({ idx: item.idx, slug: item.slug, media: tf.kind, ok: true }); }
  catch (e) { report.push({ idx: item.idx, slug: item.slug, media: tf.kind, ok: false, err: (e.stderr || '').toString().slice(-160) }); }
  process.stderr.write(`[card ${item.idx} ${item.slug}] media=${tf.kind} ${report[report.length - 1].ok ? 'OK' : 'FAIL'}\n`);
}
console.log(JSON.stringify(report, null, 2));
