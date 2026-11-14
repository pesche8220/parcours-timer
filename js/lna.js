// «Local Network Access»: Neuere Chrome-Versionen verlangen eine Erlaubnis, bevor eine Webseite
// Geräte im lokalen Netz erreicht (betrifft je nach Version auch WebRTC). Ohne diese Erlaubnis
// kommt die Verbindung Handy <-> Anzeige nicht zustande.

/** 'granted' | 'prompt' | 'denied' | 'unsupported' */
export async function lnaState() {
  if (!navigator.permissions || !navigator.permissions.query) return 'unsupported';
  // Lokal geladene Seite (Entwicklung): die Regel greift dort nicht
  if (/^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|\[::1\])|\.local$/.test(location.hostname)) return 'unsupported';
  for (const name of ['local-network', 'local-network-access']) {
    try {
      const s = await navigator.permissions.query({ name });
      return s.state;
    } catch (e) { /* Name unbekannt: nächsten probieren */ }
  }
  return 'unsupported';
}

/**
 * Löst Chromes Abfrage «Geräte im lokalen Netzwerk …» aus: eine Anfrage an eine private Adresse.
 * Die Anfrage selbst darf scheitern, es geht nur um die Abfrage. Muss aus einem Tipp heraus kommen.
 */
export async function requestLna() {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 8000);
  try {
    await fetch('https://10.255.255.1/', { mode: 'no-cors', cache: 'no-store', signal: ctrl.signal, targetAddressSpace: 'local' });
  } catch (e) { /* erwartet */ }
  clearTimeout(t);
  return lnaState();
}

/** Kurzer Text für die Oberfläche, oder '' wenn nichts zu tun ist */
export function lnaHelp(state) {
  if (state === 'denied') return 'Chrome hat den Zugriff aufs lokale Netzwerk für diese Seite gesperrt. Klappt die Verbindung nicht: Symbol links in der Adresszeile → Website-Einstellungen → «Lokales Netzwerk» auf «Zulassen» stellen.';
  if (state === 'prompt') return 'Damit sich die Geräte sicher finden, kann Chrome einmal nach dem lokalen Netzwerk fragen.';
  return '';
}
