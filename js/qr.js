// QR-Codes erzeugen (qrcode-generator, MIT) und mit der Kamera lesen
// (BarcodeDetector, wo vorhanden, sonst jsQR in einem Worker). Alles lokal, offline.

export const qrLog = [];

export function qrSvg(text, { ecc = 'M', margin = 3 } = {}) {
  qrLog.push(text);
  if (qrLog.length > 5) qrLog.shift();
  const q = window.qrcode(0, ecc);
  q.addData(text, 'Byte');
  q.make();
  const n = q.getModuleCount(), size = n + margin * 2;
  let d = '';
  for (let r = 0; r < n; r++) {
    let c = 0;
    while (c < n) {
      if (!q.isDark(r, c)) { c++; continue; }
      let len = 1;
      while (c + len < n && q.isDark(r, c + len)) len++;
      d += `M${c + margin} ${r + margin}h${len}v1h-${len}z`;
      c += len;
    }
  }
  return `<svg class="qr-svg" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="QR-Code"><rect width="${size}" height="${size}" fill="#fff"/><path d="${d}" fill="#000"/></svg>`;
}

export class Scanner {
  constructor(video, onCode, { facing = 'environment' } = {}) {
    this.video = video;
    this.onCode = onCode;
    this.facing = facing;
    this.running = false;
    this.busy = false;
    this.last = '';
    this.lastAt = 0;
    Scanner.current = this;
  }

  /** Testhilfe: so tun, als hätte die Kamera diesen Text gelesen. */
  static inject(text) {
    if (!Scanner.current) return false;
    Scanner.current.onCode(text);
    return true;
  }

  static supported() {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  }

  async start() {
    if (!Scanner.supported()) throw new Error('nocam');
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: { ideal: this.facing }, width: { ideal: 1280 }, height: { ideal: 720 } }
    });
    const v = this.video;
    v.muted = true; v.playsInline = true; v.setAttribute('playsinline', '');
    v.srcObject = this.stream;
    try { await v.play(); } catch (e) { /* Autoplay: läuft trotzdem meist an */ }
    if ('BarcodeDetector' in window) {
      try {
        const f = await window.BarcodeDetector.getSupportedFormats();
        if (f.includes('qr_code')) this.det = new window.BarcodeDetector({ formats: ['qr_code'] });
      } catch (e) { this.det = null; }
    }
    if (!this.det) {
      this.worker = new Worker(new URL('./qr-worker.js', import.meta.url));
      this.worker.onmessage = e => { this.busy = false; if (e.data) this.hit(e.data); };
      this.canvas = document.createElement('canvas');
      this.ctx2d = this.canvas.getContext('2d', { willReadFrequently: true });
    }
    this.running = true;
    this.loop();
  }

  loop() {
    if (!this.running) return;
    const v = this.video;
    if (!this.busy && v.readyState >= 2 && v.videoWidth) {
      this.busy = true;
      if (this.det) {
        this.det.detect(v)
          .then(r => { this.busy = false; if (r && r.length) this.hit(r[0].rawValue); })
          .catch(() => { this.busy = false; });
      } else {
        const scale = Math.min(1, 900 / Math.max(v.videoWidth, v.videoHeight));
        const w = Math.round(v.videoWidth * scale), h = Math.round(v.videoHeight * scale);
        if (this.canvas.width !== w) { this.canvas.width = w; this.canvas.height = h; }
        this.ctx2d.drawImage(v, 0, 0, w, h);
        const img = this.ctx2d.getImageData(0, 0, w, h);
        this.worker.postMessage({ buf: img.data.buffer, w, h }, [img.data.buffer]);
      }
    }
    this.timer = setTimeout(() => this.loop(), 140);
  }

  hit(text) {
    const now = Date.now();
    if (text === this.last && now - this.lastAt < 3000) return;
    this.last = text; this.lastAt = now;
    this.onCode(text);
  }

  stop() {
    if (Scanner.current === this) Scanner.current = null;
    this.running = false;
    clearTimeout(this.timer);
    if (this.stream) this.stream.getTracks().forEach(t => t.stop());
    this.stream = null;
    if (this.worker) this.worker.terminate();
    this.worker = null;
    try { this.video.srcObject = null; } catch (e) { /* egal */ }
  }
}
