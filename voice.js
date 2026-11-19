/* Pengenal suara (Web Speech API). Didukung Chrome laptop/Android, butuh internet.
   Mikrofon dibiarkan menyala terus sepanjang sesi; antar soal cukup "ditandai" (mark),
   bukan dimatikan-hidupkan ulang, karena mematikan-menghidupkan berulang membuatnya
   kadang tidak sempat benar-benar mendengarkan. */
window.Voice = (() => {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  let rec = null, want = false, lang = "ar-SA", onText = null, onState = null, held = false;
  let totalResults = 0, markAt = 0;

  function make(){
    rec = new SR();
    rec.continuous = true; rec.interimResults = true; rec.maxAlternatives = 3; rec.lang = lang;
    rec.onresult = e => {
      totalResults = e.results.length;
      if (held) return;
      const lastIdx = e.results.length - 1;
      if (lastIdx < markAt) return;                      // sisa hasil dari soal sebelumnya: abaikan
      let text = "";
      for (let i = markAt; i < e.results.length; i++) text += e.results[i][0].transcript + " ";
      const last = e.results[lastIdx];
      const alts = [...last].map(a => a.transcript);
      onText?.({ text:text.trim(), alts, final:last.isFinal });
    };
    rec.onerror = e => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed"){ want = false; onState?.("denied"); }
      else if (e.error === "network") onState?.("network");
      // "no-speech" dan "aborted" ditangani lewat onend (otomatis dicoba lagi)
    };
    rec.onend = () => {
      if (!want) return onState?.("off");
      rec.lang = lang;
      setTimeout(() => { if (want) try { rec.start(); } catch(e){} }, 250);
    };
    rec.onstart = () => onState?.(held ? "hold" : "on");
  }

  return {
    supported: !!SR,
    get currentLang(){ return lang; },
    start(l, textCb, stateCb){
      lang = l; onText = textCb; onState = stateCb; want = true; held = false; totalResults = 0; markAt = 0;
      if (rec){ rec.onend = null; try { rec.abort(); } catch(e){} }
      make(); try { rec.start(); } catch(e){}
    },
    // tandai mulai soal baru: abaikan ucapan sebelumnya, TANPA mematikan mikrofon
    mark(){ markAt = totalResults; },
    // ganti bahasa pengenalan (hanya dipakai kalau benar-benar perlu; memulai ulang mikrofon)
    reset(l){
      if (l && l !== lang){ lang = l; try { rec?.abort(); } catch(e){} }
      else this.mark();
    },
    hold(v){ held = v; onState?.(v ? "hold" : "on"); if (!v) this.mark(); },  // selesai dengar audio: abaikan gema, bukan matikan mikrofon
    stop(){ want = false; held = false; if (rec){ rec.onend = null; try { rec.abort(); } catch(e){} } rec = null; },
    get active(){ return want; }
  };
})();
