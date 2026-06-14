---
name: videocard
description: 뉴스·홍보용 '영상카드'(4:5 1080×1350, 상단 3:2 영상 + 하단 개조식 패널) 생성 스킬. 공식 데모영상 구간 컷 또는 이미지 Ken Burns를 상단에, 뉴스식 개조식 불릿을 하단에 배치한 카드 영상을 만들 때 사용.
---

# 영상카드 (videocard)

타이리언니(@tyri.unnie) SNS 채널용 **영상카드** 생성 스킬.
한 뉴스 = 카드 1장(mp4), 여러 장을 묶어 캐러셀로 발행한다(IG 최대 10장).

## 카드 포맷 (고정)

```
┌─────────────────────────┐
│  상단 1080×720 (3:2)     │  ← 영상/이미지 미디어 영역
│  · 좌상단 라벨 "AI 솔로프리너 | 타이리 언니"
│  · 우상단 배지 "오늘의 AI #N"
├─────────────────────────┤
│  하단 1080×630 패널      │  ← 라이트 그라데이션 배경
│  · 리본(브랜드 블루 #2B50E6)
│  · 섹션라벨 + 날짜
│  · 제목(58px 900) + 개조식 불릿 3~4개
│  · 푸터: 바 + 출처
└─────────────────────────┘
전체 4:5 = 1080×1350, 카드당 8~10초, -an(무음), libx264 crf20
```

### 안전여백 (필수 — FB 오버스캔 대응)
FB는 피드에서 영상을 ~5% 확대 표시 → **가장자리 고정 요소는 상하좌우 ≥92px 안쪽**에 배치.
(라벨 left:92, 배지 right:92, 패널 padding 48px 92px 64px — 스크립트에 반영됨)

## 폰트 (Pretendard — 전 요소 공통)

- **패밀리**: `"Pretendard", sans-serif` + `-webkit-font-smoothing: antialiased`
- **로딩**(CDN, 네트워크 필요):
  ```html
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@latest/dist/web/static/pretendard.css">
  ```
- **렌더 전 대기 필수**: Playwright에서 `await page.evaluate(() => document.fonts.ready)` 후 캡처/녹화 (폰트 미로딩 시 시스템폰트로 깨짐).
- 한글 자막 PNG(영상 합성용)도 동일하게 Pretendard 사용 — ffmpeg drawtext가 한글 미지원이라 HTML→PNG로 만들어 overlay.

### 타이포그래피 스펙 (하단 패널, gen-videocard.cjs 기준)

| 요소 | 크기 | 굵기 | 색 | 비고 |
|---|---|---|---|---|
| 상단 라벨 (AI 솔로프리너 \| 타이리 언니) | 38px | 800 | #fff | text-shadow 0 2px 12px rgba(0,0,0,.45), 구분자 `\|`=#9DB4F0 |
| 배지 (오늘의 AI #N) | 30px | 800 | #fff | 배경 #2B50E6, radius 30px, padding 8px 26px |
| 섹션라벨 (오늘의 AI 소식) | 29px | 800 | #2B50E6 | |
| 날짜 | 25px | 700 | #6b7088 | |
| **제목** | **58px** | **900** | **#1A1E38** | line-height 1.12, letter-spacing −.035em |
| 설명(desc, 옵션) | 33px | 600 | #2b3050 | line-height 1.4 |
| 개조식 불릿 | 32px | 600 | #2f3550 | line-height 1.36, letter-spacing −.01em |
| 불릿 강조 `<b>` | 32px | **800** | #1A1E38 | 수치·핵심어에만 |
| 출처(푸터) | 24px | 600 | #6b7088 | 앞에 56×9px 블루 바 |

### 브랜드 컬러

| 토큰 | 값 | 용도 |
|---|---|---|
| 액센트 블루 `AC` | `#2B50E6` | 리본·배지·불릿 점·바 |
| 잉크 `INK` | `#1A1E38` | 제목·강조 텍스트 |
| 서브 `SUB` | `#6b7088` | 날짜·출처 |
| 패널 배경 | 라이트 그라데이션 (#EEF0FB→#F4F1FB→#EAF0FA + 라벤더/블루 radial) | 하단 패널 |
| 카드 베이스 | `#121426` | ffmpeg color base (상하단 사이 이음새) |
| 인디고 소프트 | `#8E91EC` | 보조 포인트 |

## footage 원칙 (콘텐츠가 생명)

1. **공식 데모영상 우선** — 제품이 실제 동작/산출하는 역동적 장면을 구간(seg)으로 잘라 사용.
   - `yt-dlp --print uploader`로 **공식 채널 검증** (뉴스사·리뷰어 영상 금지).
   - 단색 페이드/아웃트로/로딩/빈화면 구간 금지 — **프레임 샘플링 QA 필수**.
2. 영상이 없으면: **여러 스틸컷을 ~2초씩 컷전환 몽타주**(`gen-videocard-montage.cjs`)로 역동성 확보 — 실사↔일러스트 교차, 컷 경계 화이트 플래시.
3. **팬(translate)·Ken Burns zoompan은 최후수단** — ffmpeg zoompan은 정수 반올림으로 **미세 떨림** 발생(사용자 불만 2026-06-13). 꼭 써야 하면 translate 없이 GPU `transform:scale`만(부드러움). 텍스트 슬라이드/로고 이미지 줌 금지.
4. 정 없으면: 브랜드 그라데이션 슬로우 줌.
5. **재생성 시 출력폴더의 옛 slug 카드 먼저 정리** (옛+새 섞여 잘못된 장수 게시됨).

## 스크립트

### 1) `scripts/gen-videocard.cjs` — 하단 패널 PNG
```bash
IDX=1 TITLE="제목" BULLETS_FILE=bul.json SRC="출처" DATE=2026-06-12 TOPH=720 OUT=panel.png \
  node scripts/gen-videocard.cjs
```
- `BULLETS_FILE`: JSON 배열. 뉴스식 개조식(명사형 종결), `<b>`로 수치 강조. 예: `["SPCX 첫날 <b>19%</b> 급등", ...]`
- 출력: 1080×1350 PNG, 상단 TOPH px 투명(영상 자리).

### 2) `scripts/gen-hotcards.mjs` — 공식영상 구간 컷 카드 일괄
```bash
node scripts/gen-hotcards.mjs items.json
```
items.json: `{date, src: "영상경로", out_dir, items:[{idx, slug, title, bullets:[...], src:"출처표기", seg:[시작초, 끝초]}]}`
한 소식을 소제목별 카드 3~4장으로 분해(무엇/규모/하이라이트/의미), 카드마다 다른 seg.

### 3) `scripts/gen-routine2.mjs` — 일일 뉴스 N건 카드 일괄
```bash
node scripts/gen-routine2.mjs items.json
```
items.json: `{date, out_dir, items:[{idx, slug, title, bullets, src, media}]}`
- `media` 종류: `video:<경로>[@시작초]` | `img:<로컬이미지>`(Ken Burns) | `og:<URL>`(OG이미지 자동수집→Ken Burns) | 생략(그라데이션 폴백)

### 4) `scripts/gen-videocard-montage.cjs` — 스틸컷 2초 컷전환 몽타주 (★역동성, 떨림 없음)
```bash
node scripts/gen-videocard-montage.cjs items.json
```
items.json: `{date, out_dir, items:[{idx, slug, title, bullets, src, stills:[이미지경로...]}]}`
- 공식 역동 영상이 없을 때 권장. 카드당 `stills` 여러 장(보통 3장)을 **~2.3초씩 컷전환**(opacity 컷 + 은은한 `scale` 1.05→1.13, **translate 없음=떨림 없음**) + 컷 경계 화이트 플래시.
- 실사 스틸과 주제 일러스트를 교차하면 효과적. Playwright로 상단 몽타주+하단 패널을 한 번에 렌더(7초/카드).

### 5) `scripts/gen-videocard-strip.cjs` — 여러 카드를 '횡으로 긴 한 영상'으로 (스레드 캐러셀 미리보기 스타일)
```bash
node scripts/gen-videocard-strip.cjs <out.mp4> <card1.mp4> <card2.mp4> ...
node scripts/gen-videocard-strip.cjs <out.mp4> <폴더>     # 폴더 내 *-card.mp4 파일명 정렬순
```
- 4:5 카드영상 N장을 가로로 이어붙여 **모든 카드 동시 재생**되는 긴 영상 1개 생성(미리보기·예고용).
- **흰 배경 + 카드 둥근 모서리 + 카드 사이 여백**(스레드 캐러셀 느낌). 모서리는 ffmpeg `geq` 알파마스크(translate 없음).
- 옵션(env): `CARD_W`(기본540) `GAP`(20) `MARGIN`(20) `RADIUS`(26) `BG`(white) `DUR`(7). 예) 5장 기본=2820×716.

공통 환경: `VC_DIR`로 기준 폴더 지정 가능(기본=스크립트 위치). 의존성: node + playwright(chromium) + ffmpeg (+ yt-dlp).

## 합성 레시피 (참고 — 스크립트에 내장)

```bash
# 영상 top
ffmpeg -y -ss A -t DUR -i SRC -i PANEL -filter_complex \
"[0:v]fps=30,scale=1080:720:force_original_aspect_ratio=increase,crop=1080:720,setsar=1[top];\
color=c=0x121426:s=1080x1350:d=DUR[base];[base][top]overlay=0:0[v1];[v1][1:v]overlay=0:0[out]" \
-map "[out]" -t DUR -c:v libx264 -crf 20 -pix_fmt yuv420p -movflags +faststart -an OUT
# 이미지 top (Ken Burns)
# zoompan=z='min(zoom+0.0007,1.12)':d=DUR*30:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1080x720:fps=30
```

## QA 체크리스트 (발행 전 필수)

- [ ] 카드별 프레임 추출(`ffmpeg -ss N -frames:v 1`)해 육안 확인
- [ ] 상단: 실제 콘텐츠 장면인가(페이드/빈화면/로고 아님)
- [ ] 하단: 제목·불릿 줄바꿈/오버플로 없음, 수치 `<b>` 강조
- [ ] 라벨·배지 92px 안전여백
- [ ] 출력폴더에 옛 slug 파일 없음, 카드 수 = 뉴스 수
