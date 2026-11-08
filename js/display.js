// Anzeige-Seite der Verbindung: Befehle vom Handy ausführen, Zustand zurückmelden.
import { link } from './link.js';
import { startRun, command, getRunner, runMessage, stateMessage, onRunEvent, updateLink } from './views/run.js';
import { toast } from './ui.js';

function sendFull() {
  const r = getRunner();
  if (r) { link.send(runMessage()); link.send(stateMessage()); }
  else link.send({ t: 'st', rid: null });
}

link.on(ev => {
  if (ev.type === 'status') {
    updateLink();
    if (link.role === 'display' && ev.status === 'lost') toast('Fernbedienung getrennt – der Timer läuft weiter.');
    return;
  }
  if (ev.type === 'bye') { updateLink(); toast('Fernbedienung hat sich abgemeldet'); return; }
  if (ev.type !== 'message' || link.role !== 'display') return;
  const m = ev.msg;
  if (m.t === 'hi' || m.t === 'sync') sendFull();
  else if (m.t === 'start' && Array.isArray(m.segs) && m.segs.length) startRun(m.segs, String(m.title || 'Workout'));
  else if (m.t === 'cmd' && ['toggle', 'skip', 'prev', 'stop'].includes(m.c)) command(m.c);
});

onRunEvent(type => {
  if (link.role !== 'display' || !link.open) return;
  if (type === 'start') sendFull();
});
