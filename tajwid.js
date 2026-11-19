/* Soal tajwid dasar. Hukum dideteksi otomatis dari teks Utsmani (API Quran.com), tidak diketik manual.
   Prinsip: PRESISI di atas jumlah. Kasus yang meragukan dilewati, bukan ditebak.
   Cakupan: nun sukun/tanwin, mim sukun, nun/mim bertasydid, mad (thabi'i, muttasil, munfasil, 'aridh),
   idgham mutamatsilain, mutajanisain, mutaqaribain, mad lazim kalimi, mad badal. */
window.Tajwid = (() => {
  const shuffle = a => Fresh.shuffle(a);
  const esc = s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  // ---------- tanda baca ----------
  const SHADDA = "\u0651", DAGGER = "\u0670";
  const SUKUN  = /[\u0652\u06E1]/;
  const FATHA  = /[\u064E\u0618]/, DAMMA = /[\u064F\u0619]/, KASRA = /[\u0650\u061A]/;
  const VOWEL  = /[\u064E\u064F\u0650\u0618\u0619\u061A]/;
  const TANWIN = /[\u064B\u064C\u064D\u08F0\u08F1\u08F2\u0656\u0657\u065E]/;   // tanwin tertutup dan terbuka (beda penyandian)
  const SILENT = /[\u06DF\u06E0]/;                                              // huruf yang tidak dibaca (alif sifr)
  const STOP   = /[\u06D6-\u06DC\u06DE\u06E9]/;                                 // tanda waqaf
  const LETTER = /[\u0621-\u063A\u0641-\u064A\u0671\u06CC]/;
  const HAMZA_MARK = /[\u0654\u0655]/;

  function parse(tok){
    const units = [];
    for (const c of tok){
      const prev = units[units.length - 1];
      if (c === "\u0622" && prev && FATHA.test(prev.m)) units.push({ ch:"ا", m:"\u0653" });   // آ di tengah kata = alif bertanda mad
      else if (LETTER.test(c)) units.push({ ch:c, m:"" });
      else if (prev) prev.m += c;
    }
    return units;
  }
  const norm = u => {
    const c = u.ch;
    if ("ءأإآؤئ".includes(c)) return "ء";
    if (c === "ا" && HAMZA_MARK.test(u.m)) return "ء";
    if (c === "ى" || c === "ی") return "ي";
    return c;
  };
  const isHamza = u => norm(u) === "ء";
  const hasShadda = u => u.m.includes(SHADDA);
  const hasVowel  = u => VOWEL.test(u.m) || TANWIN.test(u.m);
  const isWasl = u => u.ch === "\u0671";
  const isPlainAlif = u => u.ch === "ا" && norm(u) !== "ء";
  const MADLET = "اويىی";

  // ---------- keterangan hukum ----------
  const RULES = {
    izhar:             { name:"Izhar Halqi",          why:"Nun sukun atau tanwin bertemu huruf halqi (ء ه ع ح غ خ): dibaca jelas." },
    idgham_bighunnah:  { name:"Idgham Bighunnah",     why:"Nun sukun atau tanwin bertemu ي ن م و: dilebur dengan dengung." },
    idgham_bilaghunnah:{ name:"Idgham Bilaghunnah",   why:"Nun sukun atau tanwin bertemu ل atau ر: dilebur tanpa dengung." },
    iqlab:             { name:"Iqlab",                why:"Nun sukun atau tanwin bertemu ب: berubah menjadi bunyi mim, didengungkan." },
    ikhfa:             { name:"Ikhfa Haqiqi",         why:"Nun sukun atau tanwin bertemu 15 huruf ikhfa: dibaca samar dengan dengung." },
    ikhfa_syafawi:     { name:"Ikhfa Syafawi",        why:"Mim sukun bertemu ب: dibaca samar dengan dengung." },
    idgham_mimi:       { name:"Idgham Mimi",          why:"Mim sukun bertemu م: dilebur dengan dengung." },
    izhar_syafawi:     { name:"Izhar Syafawi",        why:"Mim sukun bertemu huruf selain ب dan م: dibaca jelas." },
    nun_tasydid:       { name:"Nun Musyaddadah",      why:"Nun bertasydid: wajib didengungkan (ghunnah)." },
    mim_tasydid:       { name:"Mim Musyaddadah",      why:"Mim bertasydid: wajib didengungkan (ghunnah)." },
    mad_thabii:        { name:"Mad Thabi'i",          why:"Mad asli: dibaca 2 harakat." },
    mad_muttasil:      { name:"Mad Wajib Muttasil",   why:"Mad bertemu hamzah dalam satu kata: dibaca 4 atau 5 harakat." },
    mad_munfasil:      { name:"Mad Jaiz Munfasil",    why:"Mad di akhir kata, hamzah di awal kata berikutnya: 2, 4, atau 5 harakat." },
    mad_aridh:         { name:"Mad 'Aridh Lissukun",  why:"Mad sebelum huruf akhir yang disukunkan karena berhenti: 2, 4, atau 6 harakat." },
    mad_lazim:         { name:"Mad Lazim Kalimi",     why:"Mad bertemu huruf bertasydid atau bersukun dalam satu kata: dibaca 6 harakat." },
    mad_badal:         { name:"Mad Badal",           why:"Hamzah bertemu huruf mad setelahnya dalam satu kata (آمَنُوا, إِيمَانًا): dibaca 2 harakat." },
    mutamatsilain:     { name:"Idgham Mutamatsilain", why:"Dua huruf yang sama, huruf pertama sukun: dilebur." },
    mutajanisain:      { name:"Idgham Mutajanisain",  why:"Dua huruf satu makhraj beda sifat (ت-د, ت-ط, ث-ذ, ذ-ظ, ب-م): dilebur." },
    mutaqaribain:      { name:"Idgham Mutaqaribain",  why:"Dua huruf berdekatan makhraj dan sifat (ل-ر, ق-ك): dilebur." },
    lam_qamariyah:     { name:"Alif Lam Qamariyah (Izhar)",  why:"Lam sukun bertemu huruf qamariyah (ا ب ج ح خ ع غ ف ق ك م و ه ي): lam dibaca jelas." },
    lam_syamsiyah:     { name:"Alif Lam Syamsiyah (Idgham)", why:"Lam bertemu huruf syamsiyah (ت ث د ذ ر ز س ش ص ض ط ظ ل ن): lam dilebur, huruf berikutnya bertasydid." }
  };
  const FAMILIES = {
    nun:     ["izhar", "idgham_bighunnah", "idgham_bilaghunnah", "iqlab", "ikhfa"],
    mim:     ["ikhfa_syafawi", "idgham_mimi", "izhar_syafawi"],
    tasydid: ["nun_tasydid", "mim_tasydid"],
    mad:     ["mad_thabii", "mad_muttasil", "mad_munfasil", "mad_aridh", "mad_lazim", "mad_badal"],
    sejenis: ["mutamatsilain", "mutajanisain", "mutaqaribain"],
    lam:     ["lam_qamariyah", "lam_syamsiyah"]
  };
  FAMILIES.campur = Object.values(FAMILIES).flat();
  const CONF = {   // hukum yang sering tertukar (untuk pengecoh level Sulit)
    izhar:["ikhfa","idgham_bighunnah"], idgham_bighunnah:["idgham_bilaghunnah","ikhfa"], idgham_bilaghunnah:["idgham_bighunnah","izhar"],
    iqlab:["ikhfa","idgham_bighunnah"], ikhfa:["iqlab","izhar"],
    ikhfa_syafawi:["idgham_mimi","izhar_syafawi"], idgham_mimi:["ikhfa_syafawi","mutamatsilain"], izhar_syafawi:["ikhfa_syafawi","izhar"],
    nun_tasydid:["mim_tasydid","idgham_bighunnah"], mim_tasydid:["nun_tasydid","idgham_mimi"],
    mad_thabii:["mad_aridh","mad_muttasil"], mad_muttasil:["mad_munfasil","mad_thabii"], mad_munfasil:["mad_muttasil","mad_thabii"], mad_aridh:["mad_thabii","mad_muttasil"],
    lam_qamariyah:["lam_syamsiyah","izhar"], lam_syamsiyah:["lam_qamariyah","idgham_bilaghunnah"],
    mutamatsilain:["mutajanisain","mutaqaribain"], mutajanisain:["mutamatsilain","mutaqaribain"], mutaqaribain:["mutajanisain","mutamatsilain"],
    mad_lazim:["mad_muttasil","mad_thabii"], mad_badal:["mad_muttasil","mad_thabii"]
  };

  const IZHAR = "ءهعحغخ", BIGH = "ينمو", BILA = "لر", IKHFA = "تثجدذزسشصضطظفقك";
  function nunRule(L){
    if (IZHAR.includes(L)) return "izhar";
    if (BIGH.includes(L))  return "idgham_bighunnah";
    if (BILA.includes(L))  return "idgham_bilaghunnah";
    if (L === "ب") return "iqlab";
    if (IKHFA.includes(L)) return "ikhfa";
    return null;
  }
  const SUN = "تثدذرزسشصضطظلن", MOON = "ابجحخعغفقكمهويء";
  const TAJANUS = new Set(["تد", "تط", "دت", "طت", "ذظ", "ظذ", "ثذ", "بم"]);
  const TAQARUB = new Set(["لر", "قك"]);

  // ---------- pemindai ----------
  function scanVerse(text, s, a){
    const words = [];
    for (const t of text.split(/\s+/).filter(Boolean)){
      const units = parse(t);
      if (!units.length){ if (words.length && STOP.test(t)) words[words.length - 1].stop = true; continue; }
      const w = { units, stop:false, idx:words.length };
      if (STOP.test(units[units.length - 1].m)) w.stop = true;
      words.push(w);
    }
    const out = [];
    const wtext = w => w.units.map(u => u.ch + u.m).join("");
    const show = (w, hi) => w.units.map((u, i) => hi.has(i) ? `<span class="tj">${esc(u.ch + u.m)}</span>` : esc(u.ch + u.m)).join("");
    const add = (rule, parts) => {            // parts: [[word, Set(unitIdx)], ...]
      const ws = parts.map(p => p[0].idx);
      out.push({ rule, s, a, id:`${s}:${a}:${rule}:${out.length}`, wFrom:Math.min(...ws) + 1, wTo:Math.max(...ws) + 1,
                 plain:parts.map(p => wtext(p[0])).join(" "),
                 html:parts.map(p => show(p[0], p[1])).join(" ") });
    };
    // huruf awal kata berikutnya yang aman dipakai sebagai penentu (null = lewati)
    const lead = (w, wi) => {
      if (w.stop) return null;
      const nw = words[wi + 1]; if (!nw) return null;
      const u = nw.units[0];
      if (SILENT.test(u.m) || isWasl(u) || isPlainAlif(u)) return null;
      return { nw, u };
    };

    words.forEach((w, wi) => {
      const U = w.units, last = U.length - 1, isLastWord = wi === words.length - 1;

      U.forEach((u, ui) => {
        // ---- nun sukun / tanwin ----
        const nunSukun = u.ch === "ن" && !hasVowel(u) && !hasShadda(u) && !SILENT.test(u.m);
        const tanwin = TANWIN.test(u.m) && !hasShadda(u);
        if (nunSukun && ui < last){                       // nun di dalam kata
          const nx = U[ui + 1];
          if (!SILENT.test(nx.m) && !isWasl(nx) && !isPlainAlif(nx)){
            const rule = nunRule(norm(nx));
            if (rule && !(BIGH + BILA).includes(norm(nx))) add(rule, [[w, new Set([ui, ui + 1])]]);   // ي و ل ر dalam satu kata = izhar mutlaq: dilewati
          }
        } else if (nunSukun && ui === last){              // nun di akhir kata
          const l = lead(w, wi);
          if (l){ const rule = nunRule(norm(l.u)); if (rule) add(rule, [[w, new Set([ui])], [l.nw, new Set([0])]]); }
        } else if (tanwin){                               // tanwin: harus di akhir kata (boleh diikuti alif penyangga)
          const rest = U.slice(ui + 1);
          const okEnd = rest.length === 0 || (rest.length === 1 && "اى".includes(rest[0].ch) && !hasVowel(rest[0]) && !hasShadda(rest[0]));
          const l = okEnd ? lead(w, wi) : null;
          if (l){ const rule = nunRule(norm(l.u)); if (rule) add(rule, [[w, new Set([ui])], [l.nw, new Set([0])]]); }
        }

        // ---- mim sukun (di akhir kata) ----
        if (u.ch === "م" && ui === last && !hasVowel(u) && !hasShadda(u) && !SILENT.test(u.m)){
          const l = lead(w, wi);
          if (l){
            const L = norm(l.u), hasSukun = SUKUN.test(u.m);
            let rule = null;
            if (L === "ب") rule = hasSukun ? null : "ikhfa_syafawi";
            else if (L === "م") rule = hasShadda(l.u) ? "idgham_mimi" : null;
            else rule = "izhar_syafawi";
            if (rule) add(rule, [[w, new Set([ui])], [l.nw, new Set([0])]]);
          }
        }

        // ---- nun / mim bertasydid ----
        if ((u.ch === "ن" || u.ch === "م") && hasShadda(u) && hasVowel(u)){
          let fromIdgham = false;                           // tasydid yang lahir dari idgham kata sebelumnya
          if (ui === 0 && wi > 0){
            const pu = words[wi - 1].units, pl = pu[pu.length - 1], pl2 = pu[pu.length - 2];
            fromIdgham = TANWIN.test(pl.m) || (pl2 && TANWIN.test(pl2.m) && "اى".includes(pl.ch)) ||
                         ((pl.ch === "ن" || pl.ch === "م") && !hasVowel(pl) && !hasShadda(pl));
          }
          const p1 = U[ui - 1], p2 = U[ui - 2];             // "ٱلنَّاسِ": tasydid karena alif lam syamsiyah
          const syamsiyah = p1 && p1.ch === "ل" && !hasVowel(p1) && p2 && isWasl(p2);
          if (!fromIdgham && !syamsiyah) add(u.ch === "ن" ? "nun_tasydid" : "mim_tasydid", [[w, new Set([ui])]]);
        }

        // ---- mad badal: hamzah diikuti huruf mad dalam satu kata (آمَنُوا, إِيمَانًا) ----
        if (ui === 0 && u.ch === "آ") add("mad_badal", [[w, new Set([0])]]);
        else if (isHamza(u) && ui < last){
          const nx = U[ui + 1];
          if (!hasVowel(nx) && !hasShadda(nx) && !SUKUN.test(nx.m) &&
              ((nx.ch === "ا" && FATHA.test(u.m)) || (nx.ch === "و" && DAMMA.test(u.m)) || ((nx.ch === "ي" || nx.ch === "ى") && KASRA.test(u.m))))
            add("mad_badal", [[w, new Set([ui, ui + 1])]]);
        }

        // ---- mad ----
        const mad = madAt(w, ui);
        if (mad){
          const li = mad.letterIdx; let k = li + 1;
          while (k === last && k < U.length && SILENT.test(U[k].m)) k++;      // alif sifr di akhir kata
          let nx = null, ownWord = true, nw = null;
          if (k < U.length){ nx = U[k]; if (SILENT.test(nx.m)) return; }
          else {
            ownWord = false;
            if (w.stop) return;
            nw = words[wi + 1]; if (!nw) return;
            nx = nw.units[0]; if (SILENT.test(nx.m)) return;
          }
          const hi = new Set([mad.prevIdx, li]);
          if (ownWord){
            if (isHamza(nx)){ hi.add(k); add("mad_muttasil", [[w, hi]]); }
            else if (hasShadda(nx) || (SUKUN.test(nx.m) && k < last)){ hi.add(k); add("mad_lazim", [[w, hi]]); }   // mad lazim kalimi
            else if (SUKUN.test(nx.m)) { /* sukun akhir kata saat berhenti: mad 'aridh, tidak dinilai di sini */ }
            else if (isLastWord && k === last){
              if (!TANWIN.test(nx.m) && !isHamza(nx)){ hi.add(k); add("mad_aridh", [[w, hi]]); }
            }
            else add("mad_thabii", [[w, hi]]);
          } else {
            if (isHamza(nx) && !isWasl(nx)){ add("mad_munfasil", [[w, hi], [nw, new Set([0])]]); }
            else if (!isWasl(nx) && !isPlainAlif(nx)) add("mad_thabii", [[w, hi]]);
          }
        }
      });

      // ---- alif lam: qamariyah (izhar) dan syamsiyah (idgham) ----
      const k = U.findIndex(isWasl);
      if (k >= 0 && k <= 2 && U[k + 1] && U[k + 1].ch === "ل" && U[k + 2]){
        const lam = U[k + 1], L = U[k + 2], core = U.slice(k).map(u => u.ch).join("");
        if (core !== "\u0671\u0644\u0644\u0647" && !hasShadda(lam)){        // "ٱللَّه" (lafzul jalalah) dan "ٱلَّذِي" (lam asli) dilewati
          const Ln = norm(L);
          if (SUKUN.test(lam.m) && !hasShadda(L) && MOON.includes(Ln)) add("lam_qamariyah", [[w, new Set([k + 1, k + 2])]]);
          else if (!hasVowel(lam) && !SUKUN.test(lam.m) && hasShadda(L) && SUN.includes(Ln)) add("lam_syamsiyah", [[w, new Set([k + 1, k + 2])]]);
        }
      }

      // ---- idgham sejenis (lintas kata) ----
      const lu = U[last];
      if (lu && lu.m === "" && !MADLET.includes(lu.ch) && !isHamza(lu) && !"نمٱ".includes(lu.ch)){
        const l = lead(w, wi);
        if (l && hasShadda(l.u)){
          const a1 = lu.ch, b1 = norm(l.u);
          let rule = null;
          if (a1 === b1) rule = "mutamatsilain";
          else if (TAJANUS.has(a1 + b1)) rule = "mutajanisain";
          else if (TAQARUB.has(a1 + b1)) rule = "mutaqaribain";
          if (rule) add(rule, [[w, new Set([last])], [l.nw, new Set([0])]]);
        }
      }
    });
    out.forEach(i => { i.nWords = words.length; });
    return out;
  }

  // huruf mad pada posisi j (alif/waw/ya mad atau alif kecil), atau null
  function madAt(w, j){
    const U = w.units, u = U[j];
    if (u.m.includes(DAGGER) && !SILENT.test(u.m) && !isHamza(u)) return { letterIdx:j, prevIdx:j };
    const p = j > 0 ? U[j - 1] : null; if (!p) return null;
    if (hasShadda(u) || SUKUN.test(u.m) || hasVowel(u) || SILENT.test(u.m)) return null;
    if (isHamza(p) || TANWIN.test(p.m)) return null;                      // setelah hamzah = mad badal; setelah tanwin = bukan mad
    if (u.ch === "ا" && !HAMZA_MARK.test(u.m) && FATHA.test(p.m)) return { letterIdx:j, prevIdx:j - 1 };
    if (u.ch === "و" && DAMMA.test(p.m)) return { letterIdx:j, prevIdx:j - 1 };
    if ((u.ch === "ي" || u.ch === "ى" || u.ch === "ی") && KASRA.test(p.m)) return { letterIdx:j, prevIdx:j - 1 };
    return null;
  }

  // ---------- pembuat soal ----------
  const OPTS = { easy:2, medium:3, hard:4 };
  const cacheRules = new Map();
  const rulesIn = plain => {
    if (!cacheRules.has(plain)) cacheRules.set(plain, new Set(scanVerse(plain, 0, 0).map(i => i.rule)));
    return cacheRules.get(plain);
  };
  function wrongNames(rule, family, level, n){
    const same = shuffle(family.filter(r => r !== rule));
    const all = shuffle(Object.keys(RULES).filter(r => r !== rule && !same.includes(r)));
    const conf = (CONF[rule] || []).filter(r => r !== rule);
    const order = level === "hard" ? [...conf, ...same, ...all] : level === "medium" ? [...same, ...all] : [...same, ...all];
    return [...new Set(order)].slice(0, n).map(r => RULES[r].name);
  }

  async function build(o){
    const level = o.level || "easy", rounds = +o.rounds || 10, nOpt = OPTS[level] || 3;
    const family = FAMILIES[o.taj] || FAMILIES.nun;
    const verses = await Quran.load(o.pick);
    const pools = {}; family.forEach(r => pools[r] = []);
    verses.forEach(v => scanVerse(v.t, v.s, v.a).forEach(i => { if (pools[i.rule]) pools[i.rule].push(i); }));
    const avail = family.filter(r => pools[r].length);
    if (!avail.length) return [];

    const seq = []; while (seq.length < rounds) seq.push(...shuffle(avail)); seq.length = rounds;
    const sig = `${o.pick?.by || ""}:${(o.pick?.list || []).join(",")}`;
    const qname = (s, names) => names[s] || "";

    return seq.map((rule, i) => {
      const inst = Fresh.pick(pools[rule], x => x.id, 1, `taj:${rule}:${sig}`)[0];
      const info = RULES[rule], where = `${qname(inst.s, o.names)} ayat ${inst.a}`;
      const ref = { seg:{ s:inst.s, a:inst.a, from:inst.wFrom, to:inst.wTo, n:inst.nWords, full:[inst.s, inst.a] } };   // hanya bagian yang ditanyakan
      const base = { hint:ref, playEnd:ref, reveal:`${info.name}: ${info.why} (${where})`, tajRule:rule };

      // bentuk 2: hukum diberikan, pilih bacaan yang sesuai
      if (i % 2 === 1){
        const others = avail.filter(r => r !== rule);
        const order = level === "hard" ? [...(CONF[rule] || []).filter(r => others.includes(r)), ...shuffle(others)] : shuffle(others);
        const chosen = [], seen = new Set([inst.plain]);
        for (const r of [...new Set(order)]){
          if (chosen.length >= nOpt - 1) break;
          const cands = shuffle(pools[r]);
          const d = cands.find(c => !seen.has(c.plain) && !rulesIn(c.plain).has(rule));
          if (d){ chosen.push(d); seen.add(d.plain); }
        }
        if (chosen.length){
          const cards = shuffle([inst, ...chosen]);
          const html = {}; if (level === "easy") cards.forEach(c => { html[c.plain] = c.html; });
          return { ...base, label:"Pilih bacaan yang termasuk hukum ini", prompt:info.name, promptClass:"big-latin",
                   slots:[inst.plain], cards:cards.map(c => c.plain), cardClass:"tjcard", cardHtml:level === "easy" ? html : null, lvKey:level };
        }
      }
      // bentuk 1: bacaan diberikan, tebak hukumnya
      return { ...base, label:"Apa hukum bacaan huruf berwarna ini?", prompt:inst.plain, promptHtml:inst.html, slots:[info.name],
               playStart:level === "hard" ? null : ref,
               cards:shuffle([info.name, ...wrongNames(rule, family, level, nOpt - 1)]), cardClass:"latin", lvKey:level };
    });
  }

  return { build, scanVerse, RULES, FAMILIES };
})();
