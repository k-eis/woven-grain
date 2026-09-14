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

const imgA = new Image();
const imgB = new Image();
const imgC = new Image();
let hasA = false, hasB = false, hasC = false;

const meshSlider = document.getElementById('mesh');
const meshVal = document.getElementById('meshVal');
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

function seededRandom(row, col, salt) {
  let x = Math.sin(row * 127.1 + col * 311.7 + salt * 74.7) * 43758.5453;
  return x - Math.floor(x);
}

// EXPOSURE(露出) -> brightness / BRILLIANCE(鮮やかさ) -> contrast+saturate combined,
// applied per photo (A/B independently) before that photo's cells are drawn
function photoFilter(exposureVal, brillianceVal) {
  const brightness = 1 + exposureVal / 100;
  const contrast = 1 + brillianceVal / 200;
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
  const depthAmt = parseInt(depthAmtSlider.value, 10) / 100;
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
    renderDiagonalWeave({ mesh, depthAmt, warpAmt, imperfAmt, density, tensionFactor, tensionSizeAdjust, tensionDepthMul, filterA, filterB });
    return;
  }

  for (let gy = 0; gy < h; gy += mesh) {
    for (let gx = 0; gx < w; gx += mesh) {
      const col = Math.floor(gx / mesh);
      const row = Math.floor(gy / mesh);
      let baseUseA;
      if (currentDirection === 'stripe') baseUseA = col % 2 === 0;
      else baseUseA = (row + col) % 2 === 0;

      let useA = baseUseA;
      if (density > 50 && !baseUseA) {
        if (seededRandom(row, col, 5) < (density - 50) / 50) useA = true;
      } else if (density < 50 && baseUseA) {
        if (seededRandom(row, col, 5) < (50 - density) / 50) useA = false;
      }

      const cw = Math.min(mesh, w - gx);
      const ch = Math.min(mesh, h - gy);

      const srcImg = useA ? imgA : imgB;
      const ir = srcImg.naturalWidth / srcImg.naturalHeight;
      const cr = w / h;
      let scale, offX, offY;
      if (ir > cr) { scale = srcImg.naturalHeight / h; offX = (srcImg.naturalWidth - w * scale) / 2; offY = 0; }
      else { scale = srcImg.naturalWidth / w; offX = 0; offY = (srcImg.naturalHeight - h * scale) / 2; }

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

      if (depthAmt > 0) {
        const ccx = fx + fw / 2, ccy = fy + fh / 2;
        const radius = Math.hypot(fw, fh) / 2;
        applyWeaveShadow(ccx, ccy, radius, useA, depthAmt, tensionDepthMul, () => ctx.fillRect(fx, fy, fw, fh));
      }
    }
  }
}

// Simulates the small pooled shadow / raised-edge highlight where one strand
// crosses over another in a real basket weave — darkest/brightest right at the
// cell's own boundary (the seam with its neighbor), fading to nothing at the
// center, rather than a single flat tint across the whole cell.
function applyWeaveShadow(ccx, ccy, radius, useA, depthAmt, tensionDepthMul, fillFn) {
  const peak = Math.max(0, Math.min(0.5, (useA ? 0.16 : 0.22) * depthAmt * tensionDepthMul));
  if (peak <= 0.002) return;
  const grad = ctx.createRadialGradient(ccx, ccy, 0, ccx, ccy, radius);
  if (useA) {
    // raised strand: subtle warm highlight catching the light right at its edge
    grad.addColorStop(0, 'rgba(255,246,225,0)');
    grad.addColorStop(1, `rgba(255,246,225,${peak})`);
  } else {
    // recessed strand: soft shadow pooling where the neighbor overlaps it
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, `rgba(0,0,0,${peak})`);
  }
  ctx.fillStyle = grad;
  fillFn();
}

// DIAGONAL WEAVE: unlike stripe/basket (axis-aligned square cells with a diagonal
// boundary), this rotates the mesh grid itself by 45° so the bands genuinely cross
// like real diagonal basketry — each "cell" is a diamond in screen space, clipped
// and filled with the correctly-oriented (unrotated) photo content underneath.
function renderDiagonalWeave(p) {
  const { mesh, depthAmt, warpAmt, imperfAmt, density, tensionFactor, tensionSizeAdjust, tensionDepthMul, filterA, filterB } = p;
  const w = outputCanvas.width, h = outputCanvas.height;
  const cx = w / 2, cy = h / 2;
  const cosA = Math.SQRT1_2, sinA = Math.SQRT1_2; // 45°

  const diag = Math.sqrt(w * w + h * h);
  const range = Math.ceil(diag / 2 / mesh) + 2;

  // precompute cover-fit mapping (source <- canvas) once per photo, reused for every diamond's bounding box
  function coverMap(img) {
    const ir = img.naturalWidth / img.naturalHeight;
    const cr = w / h;
    let scale, offX, offY;
    if (ir > cr) { scale = img.naturalHeight / h; offX = (img.naturalWidth - w * scale) / 2; offY = 0; }
    else { scale = img.naturalWidth / w; offX = 0; offY = (img.naturalHeight - h * scale) / 2; }
    return { scale, offX, offY };
  }
  const mapA = coverMap(imgA), mapB = coverMap(imgB);

  for (let row = -range; row <= range; row++) {
    for (let col = -range; col <= range; col++) {
      const u0 = row * mesh, v0 = col * mesh;
      let baseUseA = (row + col) % 2 === 0;
      let useA = baseUseA;
      if (density > 50 && !baseUseA) {
        if (seededRandom(row, col, 5) < (density - 50) / 50) useA = true;
      } else if (density < 50 && baseUseA) {
        if (seededRandom(row, col, 5) < (50 - density) / 50) useA = false;
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

      if (depthAmt > 0) {
        const radius = Math.hypot(cornersXY[0][0] - centroid[0], cornersXY[0][1] - centroid[1]);
        applyWeaveShadow(centroid[0], centroid[1], radius, useA, depthAmt, tensionDepthMul, () => ctx.fill());
      }
      ctx.restore();
    }
  }
}

[meshSlider, warpSlider, imperfectionSlider, densitySlider, tensionSlider, depthAmtSlider, lightIntensitySlider,
 exposureASlider, brillianceASlider, exposureBSlider, brillianceBSlider].forEach(el => {
  el.addEventListener('input', () => {
    meshVal.textContent = meshSlider.value;
    warpVal.textContent = warpSlider.value + '%';
    imperfectionVal.textContent = imperfectionSlider.value + '%';
    densityVal.textContent = densitySlider.value + '%';
    tensionVal.textContent = tensionSlider.value + '%';
    depthAmtVal.textContent = depthAmtSlider.value + '%';
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
  meshSlider.value = 40; depthAmtSlider.value = 60; warpSlider.value = 0;
  imperfectionSlider.value = 15; densitySlider.value = 50; tensionSlider.value = 50;
  backlightToggle.checked = false; lightIntensitySlider.value = 50;
  exposureASlider.value = 0; brillianceASlider.value = 0;
  exposureBSlider.value = 0; brillianceBSlider.value = 0;
  directionBtns.forEach(b => b.classList.remove('active'));
  document.querySelector('[data-direction="basket"]').classList.add('active');
  currentDirection = 'basket';
  [meshSlider, warpSlider, imperfectionSlider, densitySlider, tensionSlider, depthAmtSlider, lightIntensitySlider,
   exposureASlider, brillianceASlider, exposureBSlider, brillianceBSlider]
    .forEach(el => el.dispatchEvent(new Event('input')));
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
