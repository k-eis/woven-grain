// ── Woven Grain エフェクトエンジン（k-eis DESIGN FILTER・新規アプリコンセプト）
// 網籠の構造原理（張力・光と影・不均一さ・密度など）を、2枚（オプションで3枚）の写真の
// 編み込みに翻訳するアプリ。既存シリーズ（Silver Gelatin等）とは異なり、単一写真の色調フィルターではなく
// 2枚の写真の関係性そのものをデザインする構造系アプリ
//
// BASIC PARAMETERS: MESH SIZE / DIRECTION（Stripe・Basket・Diagonal）
// CHARACTER PARAMETERS: WEAVE DEPTH / WARP / IMPERFECTION / DENSITY / TENSION
// BACK LIGHT MODE: 3枚目の写真（Photo C）を背景に敷き、TENSION/IMPERFECTIONで生まれる
//                  隙間から透けて見えるようにする（光そのものではなく、奥に透ける景色）

const outputCanvas = document.getElementById('outputCanvas');
const ctx = outputCanvas.getContext('2d');
const canvasHint = document.getElementById('canvasHint');

// THEME SWITCH: matches the series convention (body.theme-xxx class swap),
// two beige palettes only — Sarashi（晒し布×真鍮、既定）／Touki（陶器×抹茶）
const themeBtns = document.querySelectorAll('.theme-btn');
const THEME_CLASS_MAP = { sarashi: null, touki: 'theme-touki' };

function applyTheme(themeKey) {
  if (!(themeKey in THEME_CLASS_MAP)) return;
  Object.values(THEME_CLASS_MAP).forEach(cls => { if (cls) document.body.classList.remove(cls); });
  const cls = THEME_CLASS_MAP[themeKey];
  if (cls) document.body.classList.add(cls);
  themeBtns.forEach(b => b.classList.toggle('active', b.dataset.theme === themeKey));
  try { localStorage.setItem('wovengrain-theme', themeKey); } catch (e) {}
}

themeBtns.forEach(btn => {
  btn.addEventListener('click', () => applyTheme(btn.dataset.theme));
});

(function initTheme() {
  let savedTheme = null;
  try { savedTheme = localStorage.getItem('wovengrain-theme'); } catch (e) {}
  if (savedTheme && (savedTheme in THEME_CLASS_MAP)) {
    applyTheme(savedTheme);
  } else if (savedTheme) {
    try { localStorage.removeItem('wovengrain-theme'); } catch (e) {}
  }
})();

const imgA = new Image();
const imgB = new Image();
const imgC = new Image();
let hasA = false, hasB = false, hasC = false;

const meshSlider = document.getElementById('mesh');
const meshVal = document.getElementById('meshVal');
const zoomWithMeshToggle = document.getElementById('zoomWithMesh');
const strandLengthSlider = document.getElementById('strandLength');
const strandLengthVal = document.getElementById('strandLengthVal');
const directionBtns = document.querySelectorAll('[data-direction]');
let currentDirection = 'basket';

const exposureASlider = document.getElementById('exposureA');
const exposureAVal = document.getElementById('exposureAVal');
const brillianceASlider = document.getElementById('brillianceA');
const brillianceAVal = document.getElementById('brillianceAVal');
const exposureBSlider = document.getElementById('exposureB');
const exposureBVal = document.getElementById('exposureBVal');
const brillianceBSlider = document.getElementById('brillianceB');
const brillianceBVal = document.getElementById('brillianceBVal');

const depthAmtSlider = document.getElementById('depthAmt');
const depthAmtVal = document.getElementById('depthAmtVal');
const shadowReachSlider = document.getElementById('shadowReach');
const shadowReachVal = document.getElementById('shadowReachVal');
const warpSlider = document.getElementById('warp');
const warpVal = document.getElementById('warpVal');
const imperfectionSlider = document.getElementById('imperfection');
const imperfectionVal = document.getElementById('imperfectionVal');
const densitySlider = document.getElementById('density');
const densityVal = document.getElementById('densityVal');
const tensionSlider = document.getElementById('tension');
const tensionVal = document.getElementById('tensionVal');
const backlightToggle = document.getElementById('backlight');
const lightIntensitySlider = document.getElementById('lightIntensity');
const lightIntensityVal = document.getElementById('lightIntensityVal');

const downloadBtn = document.getElementById('downloadBtn');
const resetBtn = document.getElementById('resetBtn');

function wireDrop(dropId, fileId, img, onLoaded) {
  const drop = document.getElementById(dropId);
  const file = document.getElementById(fileId);
  drop.addEventListener('click', () => file.click());
  file.addEventListener('change', (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      img.onload = () => {
        onLoaded();
        drop.classList.add('filled');
        drop.style.backgroundImage = `url(${ev.target.result})`;
        render();
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(f);
  });
}

wireDrop('dropA', 'fileA', imgA, () => { hasA = true; });
wireDrop('dropB', 'fileB', imgB, () => { hasB = true; });
wireDrop('dropC', 'fileC', imgC, () => { hasC = true; });

directionBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    directionBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentDirection = btn.dataset.direction;
    render();
  });
});

zoomWithMeshToggle.addEventListener('change', render);

function seededRandom(row, col, salt) {
  let x = Math.sin(row * 127.1 + col * 311.7 + salt * 74.7) * 43758.5453;
  return x - Math.floor(x);
}

// EXPOSURE(露出) -> brightness / BRILLIANCE(鮮やかさ) -> contrast+saturate combined,
// applied per photo (A/B independently) before that photo's cells are drawn.
// レンジは-100〜100、露出は0〜2倍（-100で真っ黒）、鮮やかさは彩度0〜2倍＋コントラスト強調
function photoFilter(exposureVal, brillianceVal) {
  const brightness = 1 + exposureVal / 100;
  const contrast = 1 + brillianceVal / 130;
  const saturate = 1 + brillianceVal / 100;
  return `brightness(${brightness}) contrast(${contrast}) saturate(${saturate})`;
}

function drawCover(img, w, h) {
  const ir = img.naturalWidth / img.naturalHeight;
  const cr = w / h;
  let sx, sy, sw, sh;
  if (ir > cr) { sh = img.naturalHeight; sw = sh * cr; sx = (img.naturalWidth - sw) / 2; sy = 0; }
  else { sw = img.naturalWidth; sh = sw / cr; sx = 0; sy = (img.naturalHeight - sh) / 2; }
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
}

function render() {
  const w = outputCanvas.width, h = outputCanvas.height;
  ctx.clearRect(0, 0, w, h);

  if (!hasA || !hasB) {
    canvasHint.style.display = 'block';
    downloadBtn.disabled = true;
    return;
  }
  canvasHint.style.display = 'none';
  downloadBtn.disabled = false;

  const mesh = parseInt(meshSlider.value, 10);
  const zoomWithMesh = zoomWithMeshToggle.checked;
  const zoomFactor = zoomWithMesh ? Math.max(1, mesh / 40) : 1; // 既定はOFF：MESH SIZEを変えても写真サイズは変わらない
  const strandLength = parseInt(strandLengthSlider.value, 10);
  const depthAmt = parseInt(depthAmtSlider.value, 10) / 100;
  const shadowReach = parseInt(shadowReachSlider.value, 10) / 100;
  const warpAmt = parseInt(warpSlider.value, 10) / 100 * 18;
  const imperfAmt = parseInt(imperfectionSlider.value, 10) / 100 * mesh * 0.3;
  const density = parseInt(densitySlider.value, 10);
  const tension = parseInt(tensionSlider.value, 10);
  const tensionFactor = (tension - 50) / 50;
  const tensionSizeAdjust = tensionFactor * mesh * 0.15;
  const tensionDepthMul = 1 + tensionFactor * 0.9;
  const backlightOn = backlightToggle.checked && hasC;
  const lightIntensity = parseInt(lightIntensitySlider.value, 10) / 100;

  const filterA = photoFilter(parseInt(exposureASlider.value, 10), parseInt(brillianceASlider.value, 10));
  const filterB = photoFilter(parseInt(exposureBSlider.value, 10), parseInt(brillianceBSlider.value, 10));

  if (backlightOn) {
    ctx.save();
    ctx.filter = `brightness(${0.6 + lightIntensity * 1.1})`;
    drawCover(imgC, w, h);
    ctx.restore();
  }

  if (currentDirection === 'diagonal') {
    renderDiagonalWeave({ mesh, zoomFactor, strandLength, depthAmt, shadowReach, warpAmt, imperfAmt, density, tensionFactor, tensionSizeAdjust, tensionDepthMul, filterA, filterB });
    return;
  }

  for (let gy = 0; gy < h; gy += mesh) {
    for (let gx = 0; gx < w; gx += mesh) {
      const col = Math.floor(gx / mesh);
      const row = Math.floor(gy / mesh);
      let baseUseA;
      // STRAND LENGTH groups multiple cells into one continuous-looking strand segment
      // (real basket weave doesn't alternate every single tiny square — see basket weave
      // grouping pairs of threads), instead of a fine 1×1 checkerboard reading as disconnected tiles.
      const gRow = Math.floor(row / strandLength);
      const gCol = Math.floor(col / strandLength);
      if (currentDirection === 'stripe') baseUseA = col % 2 === 0;
      else baseUseA = (gRow + gCol) % 2 === 0;

      let useA = baseUseA;
      if (density > 50 && !baseUseA) {
        if (seededRandom(gRow, gCol, 5) < (density - 50) / 50) useA = true;
      } else if (density < 50 && baseUseA) {
        if (seededRandom(gRow, gCol, 5) < (50 - density) / 50) useA = false;
      }

      const cw = Math.min(mesh, w - gx);
      const ch = Math.min(mesh, h - gy);

      const srcImg = useA ? imgA : imgB;
      const ir = srcImg.naturalWidth / srcImg.naturalHeight;
      const cr = w / h;
      const baseScale = ir > cr ? srcImg.naturalHeight / h : srcImg.naturalWidth / w;
      const scale = baseScale * zoomFactor;
      const offX = (srcImg.naturalWidth - w * scale) / 2;
      const offY = (srcImg.naturalHeight - h * scale) / 2;

      const warpX = warpAmt * Math.sin(gy * 0.05 + col);
      const warpY = warpAmt * Math.sin(gx * 0.05 + row);
      const sx = offX + (gx + warpX) * scale;
      const sy = offY + (gy + warpY) * scale;
      const sw = cw * scale;
      const sh = ch * scale;

      const jx = (seededRandom(row, col, 1) - 0.5) * 2 * imperfAmt;
      const jy = (seededRandom(row, col, 2) - 0.5) * 2 * imperfAmt;
      const jw = cw + (seededRandom(row, col, 3) - 0.5) * imperfAmt;
      const jh = ch + (seededRandom(row, col, 4) - 0.5) * imperfAmt;

      const fx = gx + jx - tensionSizeAdjust / 2;
      const fy = gy + jy - tensionSizeAdjust / 2;
      const fw = jw + tensionSizeAdjust;
      const fh = jh + tensionSizeAdjust;

      ctx.filter = useA ? filterA : filterB;
      ctx.drawImage(srcImg, sx, sy, sw, sh, fx, fy, fw, fh);
      ctx.filter = 'none';

      // draw the strand-segment's shadow/highlight only ONCE per group, from its
      // top-left anchor cell — not once per constituent cell — so the four edge
      // glows aren't stacked on top of each other inside the same group
      const isGroupAnchor = currentDirection === 'stripe'
        ? (row === 0)
        : (row % strandLength === 0 && col % strandLength === 0);
      if (depthAmt > 0 && isGroupAnchor) {
        let gx0, gy0, gw0, gh0;
        if (currentDirection === 'stripe') {
          gx0 = col * mesh; gy0 = 0; gw0 = mesh; gh0 = h;
        } else {
          gx0 = gCol * strandLength * mesh; gy0 = gRow * strandLength * mesh;
          gw0 = Math.min(strandLength * mesh, w - gx0);
          gh0 = Math.min(strandLength * mesh, h - gy0);
        }
        applyEdgeGlow(gx0, gy0, gw0, gh0, useA, depthAmt, shadowReach, tensionDepthMul);
      }
    }
  }
}

// Simulates the small pooled shadow / raised-edge highlight where one strand
// crosses under/over another in a real basket weave — concentrated right at the
// shape's own boundary edges (the seam with its neighbor), fading inward.
// Drawn as 4 edge-hugging gradient strips rather than one circular radial
// gradient, so it reads as a clean border hugging the actual rectangle instead
// of a round spotlight sitting in the middle of the tile.
function applyEdgeGlow(x, y, w, h, useA, depthAmt, shadowReach, tensionDepthMul) {
  const peak = Math.max(0, Math.min(0.5, (useA ? 0.16 : 0.22) * depthAmt * tensionDepthMul));
  if (peak <= 0.002) return;
  const reach = Math.max(1, Math.min(w, h) * 0.5 * Math.max(0.04, shadowReach));
  const color = useA ? '255,246,225' : '0,0,0';

  let g = ctx.createLinearGradient(0, y, 0, y + reach);
  g.addColorStop(0, `rgba(${color},${peak})`);
  g.addColorStop(1, `rgba(${color},0)`);
  ctx.fillStyle = g; ctx.fillRect(x, y, w, reach);

  g = ctx.createLinearGradient(0, y + h, 0, y + h - reach);
  g.addColorStop(0, `rgba(${color},${peak})`);
  g.addColorStop(1, `rgba(${color},0)`);
  ctx.fillStyle = g; ctx.fillRect(x, y + h - reach, w, reach);

  g = ctx.createLinearGradient(x, 0, x + reach, 0);
  g.addColorStop(0, `rgba(${color},${peak})`);
  g.addColorStop(1, `rgba(${color},0)`);
  ctx.fillStyle = g; ctx.fillRect(x, y, reach, h);

  g = ctx.createLinearGradient(x + w, 0, x + w - reach, 0);
  g.addColorStop(0, `rgba(${color},${peak})`);
  g.addColorStop(1, `rgba(${color},0)`);
  ctx.fillStyle = g; ctx.fillRect(x + w - reach, y, reach, h);
}

// Same idea as applyEdgeGlow but for an arbitrary quadrilateral (the rotated
// diamond groups in DIAGONAL mode) — walks each of the 4 edges and draws a
// gradient strip extruded inward along that edge's own inward normal.
function applyPolygonEdgeGlow(corners, useA, depthAmt, shadowReach, tensionDepthMul) {
  const peak = Math.max(0, Math.min(0.5, (useA ? 0.16 : 0.22) * depthAmt * tensionDepthMul));
  if (peak <= 0.002) return;
  const centroid = corners.reduce((a, c) => [a[0] + c[0] / corners.length, a[1] + c[1] / corners.length], [0, 0]);
  const edgeLen = Math.hypot(corners[1][0] - corners[0][0], corners[1][1] - corners[0][1]);
  const reach = Math.max(1, edgeLen * 0.5 * Math.max(0.04, shadowReach));
  const color = useA ? '255,246,225' : '0,0,0';

  for (let i = 0; i < corners.length; i++) {
    const a = corners[i], b = corners[(i + 1) % corners.length];
    const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
    let nx = mx - centroid[0], ny = my - centroid[1];
    const nlen = Math.hypot(nx, ny) || 1;
    nx /= nlen; ny /= nlen; // inward-pointing unit normal for this edge
    const a2 = [a[0] - nx * reach, a[1] - ny * reach];
    const b2 = [b[0] - nx * reach, b[1] - ny * reach];

    const g = ctx.createLinearGradient(mx, my, mx - nx * reach, my - ny * reach);
    g.addColorStop(0, `rgba(${color},${peak})`);
    g.addColorStop(1, `rgba(${color},0)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.lineTo(b2[0], b2[1]);
    ctx.lineTo(a2[0], a2[1]);
    ctx.closePath();
    ctx.fill();
  }
}

// DIAGONAL WEAVE: unlike stripe/basket (axis-aligned square cells with a diagonal
// boundary), this rotates the mesh grid itself by 45° so the bands genuinely cross
// like real diagonal basketry — each "cell" is a diamond in screen space, clipped
// and filled with the correctly-oriented (unrotated) photo content underneath.
function renderDiagonalWeave(p) {
  const { mesh, zoomFactor, strandLength, depthAmt, shadowReach, warpAmt, imperfAmt, density, tensionFactor, tensionSizeAdjust, tensionDepthMul, filterA, filterB } = p;
  const w = outputCanvas.width, h = outputCanvas.height;
  const cx = w / 2, cy = h / 2;
  const cosA = Math.SQRT1_2, sinA = Math.SQRT1_2; // 45°

  const diag = Math.sqrt(w * w + h * h);
  const range = Math.ceil(diag / 2 / mesh) + 2;

  // precompute cover-fit mapping (source <- canvas) once per photo, reused for every diamond's bounding box.
  // zoomFactor (tied to MESH SIZE) scales past the normal cover-fit baseline so a wider mesh reads as more zoomed-in.
  function coverMap(img) {
    const ir = img.naturalWidth / img.naturalHeight;
    const cr = w / h;
    const baseScale = ir > cr ? img.naturalHeight / h : img.naturalWidth / w;
    const scale = baseScale * zoomFactor;
    const offX = (img.naturalWidth - w * scale) / 2;
    const offY = (img.naturalHeight - h * scale) / 2;
    return { scale, offX, offY };
  }
  const mapA = coverMap(imgA), mapB = coverMap(imgB);

  for (let row = -range; row <= range; row++) {
    for (let col = -range; col <= range; col++) {
      const u0 = row * mesh, v0 = col * mesh;
      // STRAND LENGTH groups neighboring diamonds into the same continuous segment,
      // same rationale as basket/stripe below
      const gRow = Math.floor(row / strandLength);
      const gCol = Math.floor(col / strandLength);
      let baseUseA = (gRow + gCol) % 2 === 0;
      let useA = baseUseA;
      if (density > 50 && !baseUseA) {
        if (seededRandom(gRow, gCol, 5) < (density - 50) / 50) useA = true;
      } else if (density < 50 && baseUseA) {
        if (seededRandom(gRow, gCol, 5) < (50 - density) / 50) useA = false;
      }

      // diamond corners: rotated-grid square -> screen space, with IMPERFECTION
      // jittering each corner individually (uneven hand-woven edges) and TENSION
      // scaling the whole diamond from its centroid (tight = overlapping/sealed, loose = gaps)
      const cornersUV = [[u0, v0], [u0 + mesh, v0], [u0 + mesh, v0 + mesh], [u0, v0 + mesh]];
      let cornersXY = cornersUV.map(([u, v], i) => {
        const jx = (seededRandom(row, col, 10 + i) - 0.5) * 2 * imperfAmt;
        const jy = (seededRandom(row, col, 20 + i) - 0.5) * 2 * imperfAmt;
        return [u * cosA - v * sinA + cx + jx, u * sinA + v * cosA + cy + jy];
      });
      const centroid = cornersXY.reduce((a, c) => [a[0] + c[0] / 4, a[1] + c[1] / 4], [0, 0]);
      const tensionScale = 1 + tensionFactor * 0.22;
      cornersXY = cornersXY.map(([x, y]) => [
        centroid[0] + (x - centroid[0]) * tensionScale,
        centroid[1] + (y - centroid[1]) * tensionScale
      ]);

      const xs = cornersXY.map(c => c[0]), ys = cornersXY.map(c => c[1]);
      const bx = Math.max(0, Math.min(w, Math.min(...xs)));
      const by = Math.max(0, Math.min(h, Math.min(...ys)));
      const bxMax = Math.max(0, Math.min(w, Math.max(...xs)));
      const byMax = Math.max(0, Math.min(h, Math.max(...ys)));
      const bw = bxMax - bx, bh = byMax - by;
      if (bw <= 0 || bh <= 0) continue; // diamond entirely off-canvas, skip

      const map = useA ? mapA : mapB;
      const centerWarpX = warpAmt * Math.sin(centroid[1] * 0.05 + col);
      const centerWarpY = warpAmt * Math.sin(centroid[0] * 0.05 + row);
      const sx = map.offX + (bx + centerWarpX) * map.scale;
      const sy = map.offY + (by + centerWarpY) * map.scale;
      const sw = bw * map.scale, sh = bh * map.scale;

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(cornersXY[0][0], cornersXY[0][1]);
      for (let i = 1; i < cornersXY.length; i++) ctx.lineTo(cornersXY[i][0], cornersXY[i][1]);
      ctx.closePath();
      ctx.clip();
      ctx.filter = useA ? filterA : filterB;
      ctx.drawImage(useA ? imgA : imgB, sx, sy, sw, sh, bx, by, bw, bh);
      ctx.filter = 'none';
      ctx.restore();

      // group-level shadow: drawn once per group (from its anchor diamond), clipped
      // to the BIG group diamond's own path (not the small per-cell one) so the glow
      // hugs the group's true outer edge instead of stacking a blob on every sub-cell
      const isGroupAnchor = row % strandLength === 0 && col % strandLength === 0;
      if (depthAmt > 0 && isGroupAnchor) {
        const gu0 = row * mesh, gv0 = col * mesh;
        const gSize = strandLength * mesh;
        const groupCornersUV = [[gu0, gv0], [gu0 + gSize, gv0], [gu0 + gSize, gv0 + gSize], [gu0, gv0 + gSize]];
        let groupCorners = groupCornersUV.map(([u, v]) => [u * cosA - v * sinA + cx, u * sinA + v * cosA + cy]);
        const gCentroid = groupCorners.reduce((a, c) => [a[0] + c[0] / 4, a[1] + c[1] / 4], [0, 0]);
        groupCorners = groupCorners.map(([x, y]) => [
          gCentroid[0] + (x - gCentroid[0]) * tensionScale,
          gCentroid[1] + (y - gCentroid[1]) * tensionScale
        ]);
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(groupCorners[0][0], groupCorners[0][1]);
        for (let i = 1; i < groupCorners.length; i++) ctx.lineTo(groupCorners[i][0], groupCorners[i][1]);
        ctx.closePath();
        ctx.clip();
        applyPolygonEdgeGlow(groupCorners, useA, depthAmt, shadowReach, tensionDepthMul);
        ctx.restore();
      }
    }
  }
}

[meshSlider, strandLengthSlider, warpSlider, imperfectionSlider, densitySlider, tensionSlider, depthAmtSlider, shadowReachSlider, lightIntensitySlider,
 exposureASlider, brillianceASlider, exposureBSlider, brillianceBSlider].forEach(el => {
  el.addEventListener('input', () => {
    meshVal.textContent = meshSlider.value;
    strandLengthVal.textContent = strandLengthSlider.value;
    warpVal.textContent = warpSlider.value + '%';
    imperfectionVal.textContent = imperfectionSlider.value + '%';
    densityVal.textContent = densitySlider.value + '%';
    tensionVal.textContent = tensionSlider.value + '%';
    depthAmtVal.textContent = depthAmtSlider.value + '%';
    shadowReachVal.textContent = shadowReachSlider.value + '%';
    lightIntensityVal.textContent = lightIntensitySlider.value + '%';
    exposureAVal.textContent = exposureASlider.value;
    brillianceAVal.textContent = brillianceASlider.value;
    exposureBVal.textContent = exposureBSlider.value;
    brillianceBVal.textContent = brillianceBSlider.value;
    render();
  });
});
backlightToggle.addEventListener('change', render);

resetBtn.addEventListener('click', () => {
  meshSlider.value = 40; strandLengthSlider.value = 2; depthAmtSlider.value = 60; shadowReachSlider.value = 40; warpSlider.value = 0;
  imperfectionSlider.value = 15; densitySlider.value = 50; tensionSlider.value = 50;
  backlightToggle.checked = false; lightIntensitySlider.value = 50;
  zoomWithMeshToggle.checked = false;
  exposureASlider.value = 0; brillianceASlider.value = 0;
  exposureBSlider.value = 0; brillianceBSlider.value = 0;
  directionBtns.forEach(b => b.classList.remove('active'));
  document.querySelector('[data-direction="basket"]').classList.add('active');
  currentDirection = 'basket';
  [meshSlider, strandLengthSlider, warpSlider, imperfectionSlider, densitySlider, tensionSlider, depthAmtSlider, shadowReachSlider, lightIntensitySlider,
   exposureASlider, brillianceASlider, exposureBSlider, brillianceBSlider]
    .forEach(el => el.dispatchEvent(new Event('input')));
  render();
});

function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}

downloadBtn.addEventListener('click', () => {
  if (!hasA || !hasB) return;
  const dataUrl = outputCanvas.toDataURL('image/png');
  if (isIOS()) {
    document.getElementById('saveOverlayImg').src = dataUrl;
    document.getElementById('saveOverlay').style.display = 'flex';
  } else {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = 'woven-grain.png';
    a.click();
  }
});
document.getElementById('saveOverlayClose').addEventListener('click', () => {
  document.getElementById('saveOverlay').style.display = 'none';
});

render();
