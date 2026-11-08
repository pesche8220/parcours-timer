// Übungsarchiv.
// WICHTIG: Die Reihenfolge von BUILTIN ist fest. Neue Übungen nur HINTEN anhängen,
// nie umsortieren oder löschen – der Index wird in QR-Codes verwendet.
//
// eq  = Ausrüstung: none | kb (Kettlebell) | db (Hanteln) | band | bar (Klimmzugstange) | rope (Springseil)
// pat = Muster für den Generator: legs | push | pull | core | cardio | full | mob (Aufwärmen) | stretch (Cool-down)
// hard = explosiv/anspruchsvoll (wird bei «Locker» weggelassen), warm = eignet sich zum Aufwärmen

export const CATS = [
  { id: 'body', name: 'Körpergewicht' },
  { id: 'core', name: 'Core' },
  { id: 'kettlebell', name: 'Kettlebell' },
  { id: 'dumbbell', name: 'Hantel' },
  { id: 'band', name: 'Band' },
  { id: 'pullup', name: 'Klimmzugstange' },
  { id: 'cardio', name: 'Cardio' },
  { id: 'mobility', name: 'Mobilität' }
];
export const catName = id => (CATS.find(c => c.id === id) || CATS[0]).name;

export const EQUIPMENT = [
  { id: 'kb', name: 'Kettlebell', icon: 'kettlebell' },
  { id: 'db', name: 'Hanteln', icon: 'dumbbell' },
  { id: 'band', name: 'Band', icon: 'band' },
  { id: 'bar', name: 'Stange', icon: 'pullup' },
  { id: 'rope', name: 'Springseil', icon: 'rope' }
];

const X = (name, cat, eq, pat, flags = '') => ({ name, cat, eq, pat, hard: flags.includes('h'), warm: flags.includes('w') });

export const BUILTIN = [
  // 0–9 Körpergewicht
  X('Kniebeugen', 'body', 'none', 'legs'),
  X('Liegestütze', 'body', 'none', 'push'),
  X('Burpees', 'body', 'none', 'full', 'h'),
  X('Ausfallschritte', 'body', 'none', 'legs'),
  X('Hampelmann', 'body', 'none', 'cardio', 'w'),
  X('Sprungkniebeugen', 'body', 'none', 'legs', 'h'),
  X('Dips', 'body', 'none', 'push'),
  X('Wandsitzen', 'body', 'none', 'legs'),
  X('Strecksprünge', 'body', 'none', 'cardio', 'h'),
  X('Bear Crawl', 'body', 'none', 'full'),
  // 10–18 Core
  X('Plank', 'core', 'none', 'core'),
  X('Seitstütz', 'core', 'none', 'core'),
  X('Crunches', 'core', 'none', 'core'),
  X('Russian Twist', 'core', 'none', 'core'),
  X('Beinheben', 'core', 'none', 'core'),
  X('Superman', 'core', 'none', 'pull'),
  X('Hollow Hold', 'core', 'none', 'core'),
  X('Mountain Climbers', 'core', 'none', 'cardio'),
  X('Schulter-Taps', 'core', 'none', 'core'),
  // 19–24 Kettlebell
  X('KB Swing', 'kettlebell', 'kb', 'full'),
  X('Goblet Squat', 'kettlebell', 'kb', 'legs'),
  X('KB Rudern', 'kettlebell', 'kb', 'pull'),
  X('Clean & Press', 'kettlebell', 'kb', 'full', 'h'),
  X('KB Kreuzheben', 'kettlebell', 'kb', 'legs'),
  X('Turkish Get-up', 'kettlebell', 'kb', 'full', 'h'),
  // 25–29 Hantel
  X('Bizeps-Curls', 'dumbbell', 'db', 'pull'),
  X('Schulterdrücken', 'dumbbell', 'db', 'push'),
  X('Rudern vorgebeugt', 'dumbbell', 'db', 'pull'),
  X('Thruster', 'dumbbell', 'db', 'full', 'h'),
  X('Farmer Walk', 'dumbbell', 'db', 'full'),
  // 30–34 Band
  X('Band Rudern', 'band', 'band', 'pull'),
  X('Pull-Aparts', 'band', 'band', 'pull'),
  X('Band Squats', 'band', 'band', 'legs'),
  X('Monster Walk', 'band', 'band', 'legs'),
  X('Band Brustpresse', 'band', 'band', 'push'),
  // 35–39 Klimmzugstange
  X('Klimmzüge', 'pullup', 'bar', 'pull', 'h'),
  X('Hängen', 'pullup', 'bar', 'pull'),
  X('Knieheben hängend', 'pullup', 'bar', 'core'),
  X('Negativ-Klimmzüge', 'pullup', 'bar', 'pull'),
  X('Australian Pull-ups', 'pullup', 'bar', 'pull'),
  // 40–45 Cardio
  X('Seilspringen', 'cardio', 'rope', 'cardio', 'w'),
  X('Kniehebelauf', 'cardio', 'none', 'cardio', 'w'),
  X('Sprint', 'cardio', 'none', 'cardio', 'h'),
  X('Skipping', 'cardio', 'none', 'cardio', 'w'),
  X('Anfersen', 'cardio', 'none', 'cardio', 'w'),
  X('Pendellauf', 'cardio', 'none', 'cardio'),
  // 46–51 Mobilität
  X('Armkreisen', 'mobility', 'none', 'mob', 'w'),
  X('Hüftkreisen', 'mobility', 'none', 'mob', 'w'),
  X('Inchworm', 'mobility', 'none', 'mob', 'w'),
  X('World’s Greatest Stretch', 'mobility', 'none', 'mob', 'w'),
  X('Katze-Kuh', 'mobility', 'none', 'mob', 'w'),
  X('Beinpendel', 'mobility', 'none', 'mob', 'w'),
  // 52– Ergänzungen (v1.0)
  X('Hüftheben', 'body', 'none', 'legs'),
  X('Seitliche Ausfallschritte', 'body', 'none', 'legs'),
  X('Pike Push-ups', 'body', 'none', 'push', 'h'),
  X('Knie-Liegestütze', 'body', 'none', 'push'),
  X('Ausfallschritte rückwärts', 'body', 'none', 'legs'),
  X('Dead Bug', 'core', 'none', 'core'),
  X('Plank-Jacks', 'core', 'none', 'cardio'),
  X('Skater-Sprünge', 'cardio', 'none', 'cardio'),
  X('Sumo Squat', 'kettlebell', 'kb', 'legs'),
  X('KB Halo', 'kettlebell', 'kb', 'mob', 'w'),
  X('Ausfallschritte mit Hanteln', 'dumbbell', 'db', 'legs'),
  X('Floor Press', 'dumbbell', 'db', 'push'),
  X('Pallof Press', 'band', 'band', 'core'),
  X('Tiefe Hocke halten', 'mobility', 'none', 'stretch'),
  X('Oberschenkel dehnen', 'mobility', 'none', 'stretch'),
  X('Hüftbeuger dehnen', 'mobility', 'none', 'stretch'),
  X('Kindhaltung', 'mobility', 'none', 'stretch'),
  X('Brustdehnung', 'mobility', 'none', 'stretch'),
  X('Wade dehnen', 'mobility', 'none', 'stretch'),
  X('Rücken drehen liegend', 'mobility', 'none', 'stretch')
];

export const BUILTIN_INDEX = new Map(BUILTIN.map((x, i) => [x.name.toLowerCase(), i]));
export const builtinByName = name => {
  const i = BUILTIN_INDEX.get(String(name).trim().toLowerCase());
  return i == null ? null : BUILTIN[i];
};
