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

  for (let gy = 0; gy < h; gy += mesh) {
    for (let gx = 0; gx < w; gx += mesh) {
      const col = Math.floor(gx / mesh);
      const row = Math.floor(gy / mesh);
      let baseUseA;
      if (currentDirection === 'stripe') baseUseA = col % 2 === 0;
      else if (currentDirection === 'basket') baseUseA = (row + col) % 2 === 0;
      else baseUseA = Math.floor((gx + gy) / mesh) % 2 === 0;

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
        const baseAlpha = (useA ? 0.10 : 0.07) * depthAmt * tensionDepthMul;
        const alpha = Math.max(0, Math.min(0.45, baseAlpha));
        ctx.fillStyle = useA ? `rgba(0,0,0,${alpha})` : `rgba(255,255,255,${alpha})`;
        ctx.fillRect(fx, fy, fw, fh);
      }
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
