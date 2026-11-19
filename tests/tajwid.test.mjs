// Uji pemindai tajwid (tajwid.js) dengan teks Utsmani asli. Jalankan: npm test
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import assert from "node:assert/strict";

const dir = dirname(fileURLToPath(import.meta.url));
globalThis.window = {};
globalThis.Fresh = { shuffle: a => a, pick: () => [] };
new Function("window", "Fresh", readFileSync(join(dir, "..", "tajwid.js"), "utf8"))(globalThis.window, globalThis.Fresh, {});
const { scanVerse } = globalThis.window.Tajwid;

const rulesOf = (text, s, a) => new Set(scanVerse(text, s, a).map(i => i.rule));

const cases = [
  // [surat, ayat, teks, hukum yang harus ada, hukum yang tidak boleh ada]
  [1, 7,   "صِرَٰطَ ٱلَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ ٱلْمَغْضُوبِ عَلَيْهِمْ وَلَا ٱلضَّآلِّينَ", ["mad_lazim"], []],
  [2, 72,  "وَإِذْ قَتَلْتُمْ نَفْسًا فَٱدَّٰرَْٰٔتُمْ فِيهَا ۖ وَٱللَّهُ مُخْرِجٌ مَّا كُنتُمْ تَكْتُمُونَ", ["mad_lazim"], []],
  [2, 14,  "وَإِذَا لَقُوا ٱلَّذِينَ آمَنُوا قَالُوا آمَنَّا",   ["mad_badal"], []],
  [2, 3,   "إِيمَٰنًا",                                         ["mad_badal"], []],
  [1, 3,   "ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ",                          ["mad_thabii"], ["mad_lazim", "mad_badal"]],
];

let failed = 0;
for (const [s, a, text, want, forbid] of cases) {
  const got = rulesOf(text, s, a);
  try {
    for (const r of want) assert.ok(got.has(r), `harus ada ${r}`);
    for (const r of forbid) assert.ok(!got.has(r), `tidak boleh ada ${r}`);
    console.log(`PASS ${s}:${a}`);
  } catch (e) {
    failed++;
    console.log(`FAIL ${s}:${a} - ${e.message} (dapat: ${[...got].join(", ")})`);
  }
}
console.log(failed ? `${failed} gagal` : "semua lulus");
process.exit(failed ? 1 : 0);
