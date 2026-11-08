// Ein Workout starten: hier auf dem Gerät oder – wenn als Fernbedienung verbunden – auf der Anzeige.
import { link } from './link.js';
import { startRun } from './views/run.js';
import { expectRemoteRun } from './views/remote.js';

export const remoteReady = () => link.role === 'remote' && link.open;

export function launch(segs, title, { local = false } = {}) {
  if (!segs || !segs.length) return;
  if (!local && remoteReady()) {
    link.send({ t: 'start', title, segs });
    expectRemoteRun(title);
    return;
  }
  startRun(segs, title);
}
