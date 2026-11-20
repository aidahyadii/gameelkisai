/* Flashcard huruf hijaiyah: kartu dibalik. Depan = huruf, belakang = nama dan bunyi.
   Bunyi nama huruf diputar saat kartu muncul (kalau suara aktif). Progres "sudah hafal" disimpan di perangkat. */
window.Flash = (() => {
  const KEY = "ab_flash";
  const $ = id => document.getElementById(id);
  let learned = new Set(), queue = [], cur = null, sound = true, audio = null;

  function load(){
    try { learned = new Set(JSON.parse(localStorage.getItem(KEY) || "[]")); } catch(e){ learned = new Set(); }
  }
  function saveLearned(){
    try { localStorage.setItem(KEY, JSON.stringify([...learned])); } catch(e){}
  }
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--){ const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };

  function stop(){
    if (audio){ audio.pause(); audio = null; }
  }
  function play(){
    stop();
    if (!sound || !cur || !window.Rec) return;
    const k = Hijaiyah.rid(cur);
    if (!Rec.has(k)) return;
    audio = new Audio(Rec.url(k));
    audio.play().catch(() => {});
  }

  function render(){
    const done = !queue.length;
    $("flashCount").textContent = `Hafal ${learned.size} dari ${HIJAIYAH.length} · sisa ${queue.length}`;
    $("flashCard").hidden = done;
    $("flashActions").hidden = done;
    $("flashDone").textContent = done ? "Semua huruf sudah kamu hafal. Mau mulai lagi dari awal?" : "";
    $("flashReset").hidden = !done;
    if (done) return;
    $("flashCh").textContent = cur.ch;
    $("flashName").textContent = cur.name;
    $("flashTr").textContent = cur.c ? `bunyi "${cur.c}"` : "huruf hidup (alif)";
  }

  function show(){
    cur = queue[0] || null;
    $("flashCard").classList.remove("flipped");
    render();
    play();
  }

  function start(opts = {}){
    sound = opts.sound !== false;
    load();
    queue = shuffle(HIJAIYAH.filter(h => !learned.has(h.ch)));
    if (!queue.length){ learned.clear(); saveLearned(); queue = shuffle(HIJAIYAH); }
    if (window.Rec) Rec.init().then(() => { if (cur) play(); });
    show();
  }

  function flip(){
    if (!cur) return;
    const card = $("flashCard");
    card.classList.toggle("flipped");
    if (card.classList.contains("flipped") && sound) play();
  }
  function know(){
    if (!cur) return;
    learned.add(cur.ch); saveLearned();
    queue.shift();
    show();
  }
  function again(){
    if (!cur) return;
    queue.push(queue.shift());
    show();
  }
  function reset(){
    learned.clear(); saveLearned();
    start({ sound });
  }

  // tombol dipasang sekali saat halaman dimuat
  document.addEventListener("DOMContentLoaded", () => {
    $("flashCard").addEventListener("click", flip);
    $("flashCard").addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " "){ e.preventDefault(); flip(); } });
    $("flashSound").addEventListener("click", play);
    $("flashKnow").addEventListener("click", know);
    $("flashAgain").addEventListener("click", again);
    $("flashReset").addEventListener("click", reset);
  });

  return { start, stop };
})();
