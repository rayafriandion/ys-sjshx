import { readFile } from 'node:fs/promises';
import { CARDS, CHAPTERS, ARCHONS, RELICS, EVENT_IDS, EVENT_EFFECTS } from '../public/src/data.js';
const content = JSON.parse(await readFile(new URL('../public/content/zh-CN.json', import.meta.url), 'utf8'));
const groups = { cards: Object.keys(CARDS), chapters: CHAPTERS.map(c => c.id), archons: Object.keys(ARCHONS), relics: Object.keys(RELICS), events: EVENT_IDS };
let fields = 0, filled = 0;
for (const [group, ids] of Object.entries(groups)) {
  for (const id of ids) {
    if (!content[group]?.[id]) throw new Error(`Missing copy slot: ${group}.${id}`);
    if (group === 'events' && content.events[id].choices.length !== EVENT_EFFECTS[id].length) throw new Error(`Choice count mismatch: ${id}`);
  }
}
function walk(value) {
  if (typeof value === 'string') { fields++; if (value.trim()) filled++; }
  else if (value && typeof value === 'object') Object.values(value).forEach(walk);
}
for (const group of ['game', ...Object.keys(groups)]) walk(content[group]);
console.log(`Content schema OK: ${fields} narrative fields; ${filled} filled, ${fields - filled} intentionally empty.`);
