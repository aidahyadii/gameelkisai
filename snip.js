/* Potongan audio per kata dari rekaman satu surat (Quran.com chapter recitation + penanda waktu per kata).
   Dipakai soal tajwid agar yang dibacakan hanya bagian yang ditanyakan, tetap bersambung seperti bacaan aslinya.
   Bila data tidak ada / tidak cocok, resolve() mengembalikan null dan pemanggil memutar ayat penuh. */
window.Snip = (() => {
  const API = "https://api.quran.com/api/v4";
  const PREF = [/husary|hussary/i, /afasy|alafasy/i, /shatri|shatree/i, /abdul\s?-?basit|abdulbaset/i, /minshawi|minshawy/i, /sudais/i, /shuraim|shuraym/i];
  const FALLBACK_IDS = [7, 4, 2, 6];
  let reciterList = null;
  const chapters = new Map(), resolved = new Map();
  let lastName = "";

  async function listReciters(){
    if (reciterList) return reciterList;
    try {
      const r = await fetch(`${API}/resources/chapter_reciters`);
      if (!r.ok) throw new Error(r.status);
      const j = await r.json();
      const all = (j.reciters || []).map(x => ({ id:x.id, name:x.name || x.reciter_name || x.translated_name?.name || "" })).filter(x => x.id);
      const score = x => { const i = PREF.findIndex(p => p.test(x.name)); return i < 0 ? 99 : i; };
      reciterList = all.sort((a, b) => score(a) - score(b)).slice(0, 5);
      if (!reciterList.length) throw new Error("kosong");
    } catch(e){ reciterList = FALLBACK_IDS.map(id => ({ id, name:"" })); }
    return reciterList;
  }

  const fullUrl = u => !u ? null : /^https?:/.test(u) ? u : u.startsWith("//") ? "https:" + u : "https://download.quranicaudio.com/" + u.replace(/^\//, "");

  function chapter(rid, ch){
    const key = rid + ":" + ch;
    if (!chapters.has(key)) chapters.set(key, (async () => {
      try {
        const r = await fetch(`${API}/chapter_recitations/${rid}/${ch}?segments=true`);
        if (!r.ok) return null;
        const j = await r.json();
        const af = j.audio_file || (j.audio_files || [])[0];
        const url = fullUrl(af?.audio_url); if (!url) return null;
        const verses = {};
        for (const t of af.timestamps || []){
          if (!t.verse_key) continue;
          const segs = (t.segments || []).filter(x => Array.isArray(x) && x.length >= 3 && x.every(Number.isFinite));
          verses[t.verse_key] = { from:t.timestamp_from ?? t.start ?? 0, to:t.timestamp_to ?? t.end ?? null, segs };
        }
        return Object.values(verses).some(v => v.segs.length) ? { url, verses } : null;
      } catch(e){ return null; }
    })());
    return chapters.get(key);
  }

  // seg = { s, a, from, to, n }  (kata ke-from sampai ke-to, dari n kata dalam ayat)
  function resolve(seg){
    const key = `${seg.s}:${seg.a}:${seg.from}-${seg.to}:${seg.n}`;
    if (!resolved.has(key)) resolved.set(key, (async () => {
      for (const rc of await listReciters()){
        const c = await chapter(rc.id, seg.s); if (!c) continue;
        const v = c.verses[`${seg.s}:${seg.a}`]; if (!v || !v.segs.length) continue;
        const idx = v.segs.map(x => x[0]), base = Math.min(...idx);           // nomor kata bisa mulai dari 0 atau 1
        if (base > 1 || Math.max(...idx) - base + 1 !== seg.n) continue;      // jumlah kata tidak cocok: jangan menebak
        const pos = p => base === 0 ? p - 1 : p;
        const first = v.segs.find(x => x[0] === pos(seg.from)), last = v.segs.find(x => x[0] === pos(seg.to));
        if (!first || !last) continue;
        const rel = first[first.length - 2] < v.from - 50 && v.from > 1000;   // waktu kata relatif terhadap awal ayat?
        const off = rel ? v.from : 0;
        let start = first[first.length - 2] + off - 120, end = last[last.length - 1] + off + 250;
        if (v.to != null) end = Math.min(end, v.to + 150);
        start = Math.max(0, start);
        if (!(end > start) || end - start > 20000) continue;
        lastName = rc.name;
        return { url:c.url, start, end, reciter:rc.name };
      }
      return null;
    })());
    return resolved.get(key);
  }
  return { resolve, get reciter(){ return lastName; } };
})();
