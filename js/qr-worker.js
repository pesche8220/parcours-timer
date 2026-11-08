// QR-Erkennung im Hintergrund (jsQR, Apache-2.0), damit die Oberfläche flüssig bleibt.
importScripts('../vendor/jsQR.min.js');

self.onmessage = e => {
  const { buf, w, h } = e.data;
  let res = null;
  try { res = self.jsQR(new Uint8ClampedArray(buf), w, h, { inversionAttempts: 'dontInvert' }); } catch (err) { res = null; }
  self.postMessage(res ? res.data : null);
};
