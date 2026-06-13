// gen-hotcards.mjs — 핫이슈를 영상카드 N장으로(루틴1 영상카드 형식). 각 카드 top=공식영상 구간[s,e].
//  사용: node gen-hotcards.mjs <items.json>  (items: {date, src, out_dir, items:[{idx,slug,title,bullets,src,seg:[s,e]}]})
import { execSync, spawnSync } from 'child_process';
import { writeFileSync, mkdirSync } from 'fs';
import { join, isAbsolute } from 'path';
const DIR = process.env.VC_DIR || new URL('.', import.meta.url).pathname;
const itemsPath = process.argv[2] || join(DIR, 'output', 'googlebook-items.json');
const data = JSON.parse(execSync(`cat "${isAbsolute(itemsPath) ? itemsPath : join(DIR, itemsPath)}"`).toString());
const OUT = join(DIR, 'output', data.out_dir || 'hotcards');
mkdirSync(OUT, { recursive: true });
const SRC = isAbsolute(data.src) ? data.src : join(DIR, data.src);
const DATE = data.date;
const report = [];
for (const item of data.items) {
  const bf = join(OUT, `_bul_${item.idx}.json`); writeFileSync(bf, JSON.stringify(item.bullets));
  const panel = join(OUT, `${String(item.idx).padStart(2, '0')}-${item.slug}-panel.png`);
  const r = spawnSync('node', [join(DIR, 'gen-videocard.cjs')], {
    env: { ...process.env, IDX: String(item.idx), TITLE: item.title, BULLETS_FILE: bf, SRC: item.src, DATE, TOPH: '720', OUT: panel },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (r.status !== 0) { report.push({ idx: item.idx, ok: false, err: (r.stderr || '').toString().slice(-200) }); continue; }
  const [s, e] = item.seg; const dur = (e - s);
  const card = join(OUT, `${String(item.idx).padStart(2, '0')}-${item.slug}-card.mp4`);
  const fc = `[0:v]fps=30,scale=1080:720:force_original_aspect_ratio=increase,crop=1080:720,setsar=1[top];` +
    `color=c=0x121426:s=1080x1350:d=${dur}[base];[base][top]overlay=0:0[v1];[v1][1:v]overlay=0:0[out]`;
  const cmd = `ffmpeg -y -ss ${s} -t ${dur} -i "${SRC}" -i "${panel}" -filter_complex "${fc}" -map "[out]" -t ${dur} ` +
    `-c:v libx264 -crf 20 -preset medium -pix_fmt yuv420p -movflags +faststart -an "${card}"`;
  try { execSync(cmd, { stdio: ['ignore', 'ignore', 'pipe'] }); report.push({ idx: item.idx, slug: item.slug, ok: true }); }
  catch (err) { report.push({ idx: item.idx, slug: item.slug, ok: false, err: (err.stderr || '').toString().slice(-160) }); }
  process.stderr.write(`[card ${item.idx} ${item.slug}] seg=${s}-${e} ${report[report.length - 1].ok ? 'OK' : 'FAIL'}\n`);
}
console.log(JSON.stringify(report, null, 2));
