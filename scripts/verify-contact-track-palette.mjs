// Guards the Contact and Track Order colour polish (2026-10-15): no retired palette values, tokens for interaction and status colours.
import fs from 'node:fs';
const read = (p) => fs.readFileSync(p, 'utf8');
const files = { contact: read('src/pages/contact.tsx'), track: read('src/pages/track-order.tsx') };
const retired = ['#E4D8BF', '#2B4C78', '#5F6B7A', '#D6D2CA', '#DCE2E8', '#C6D0DA', '#C9D1DA', '#E5E9ED', '#EEF0F2', '#A8B9CA', '#203E5D'];
let failed = 0;
const check = (ok, msg) => { console.log(`${ok ? 'PASS' : 'FAIL'} ${msg}`); if (!ok) failed += 1; };
for (const [name, src] of Object.entries(files)) {
  for (const hex of retired) check(!src.toUpperCase().includes(hex), `${name} has no retired colour ${hex}`);
  check(!/emerald-|orange-|amber-|text-slate-400/.test(src), `${name} uses no emerald/orange/amber or low-contrast slate-400 text`);
}
check(files.contact.includes('focus:border-[#0E6B78]'), 'contact inputs use the petrol focus colour');
check((files.contact.match(/Visit our location/g) || []).length === 0, 'contact address is not shown twice');
check(files.track.includes('bg-[#F0FDF4] text-[#166534]'), 'track delivered/paid state uses the success token');
check(files.track.includes('bg-[#FFFBEB] text-[#854D0E]'), 'track pending payment uses the warning token (not orange)');
check(files.track.includes('complete ? "bg-[#0E6B78]"'), 'track completed stages use petrol');
console.log(failed ? `\n${failed} check(s) failed` : '\nContact and Track Order palette checks passed.');
process.exit(failed ? 1 : 0);
