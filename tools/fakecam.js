// Ersetzt getUserMedia durch ein künstliches Kamerabild mit QR-Code (für Tests ohne Kamera).
window.__fake = { text: '', angle: 9, scale: 0.42, blur: 1.2, frames: 0 };
(function () {
  const cv = document.createElement('canvas');
  cv.width = 1280; cv.height = 720;
  const ctx = cv.getContext('2d');
  let img = null, imgText = null;
  async function ensureImg() {
    const f = window.__fake;
    if (!f.text || f.text === imgText) return;
    imgText = f.text;
    const mod = await import(new URL('js/qr.js', location.href).href);
    const svg = mod.qrSvg(f.text, { ecc: f.text.startsWith('PT1:') || f.text.includes('#c=') ? 'L' : 'M' });
    mod.qrLog.pop();
    const i = new Image();
    i.src = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    await i.decode();
    img = i;
  }
  function draw() {
    const f = window.__fake;
    ensureImg();
    ctx.filter = 'none';
    const g = ctx.createLinearGradient(0, 0, 1280, 720);
    g.addColorStop(0, '#5b564f'); g.addColorStop(1, '#2d2a27');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 1280, 720);
    if (img && f.text) {
      const s = 720 * f.scale;
      ctx.save();
      ctx.translate(640 + 40, 360 - 10);
      ctx.rotate(f.angle * Math.PI / 180);
      ctx.transform(1, 0.06, -0.04, 0.95, 0, 0);    // leichte Perspektive
      ctx.fillStyle = '#111'; ctx.fillRect(-s / 2 - 30, -s / 2 - 60, s + 60, s + 160);   // Handy-Gehäuse
      ctx.filter = `blur(${f.blur}px) brightness(0.92)`;
      ctx.drawImage(img, -s / 2, -s / 2, s, s);
      ctx.restore();
    }
    ctx.filter = 'none';
    const d = ctx.getImageData(0, 0, 1280, 720), a = d.data;
    for (let k = 0; k < a.length; k += 4) { const n = (Math.random() - 0.5) * 28; a[k] += n; a[k + 1] += n; a[k + 2] += n; }
    ctx.putImageData(d, 0, 0);
    f.frames++;
  }
  setInterval(draw, 66);
  const stream = cv.captureStream(15);
  navigator.mediaDevices.getUserMedia = async () => stream.clone();
})();
'fake camera ready';
