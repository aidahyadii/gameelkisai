/* Duel online lewat WebSocket ke Cloudflare Worker (satu Durable Object per room) */
window.Online = (() => {
  let ws = null, me = null, role = null, code = null, handlers = {}, round = null, list = [];
  const id = () => Math.random().toString(36).slice(2, 10);

  function ready(){
    return typeof WebSocket !== "undefined";
  }

  function players(){
    return list.slice();
  }

  function connect(roomCode, name, asRole){
    return new Promise((resolve, reject) => {
      code = roomCode; role = asRole; me = { id:id(), name, role, t:Date.now() };
      const proto = location.protocol === "https:" ? "wss:" : "ws:";
      const sock = new WebSocket(`${proto}//${location.host}/ws/${roomCode}`);
      ws = sock;
      let done = false;
      const fail = e => { if (!done){ done = true; reject(e); } };
      sock.onopen = () => sock.send(JSON.stringify({ type:"join", id:me.id, name, role:asRole }));
      sock.onmessage = ({ data }) => {
        const m = JSON.parse(data);
        if (m.type === "joined"){ list = m.list; if (!done){ done = true; resolve(); } }
        else if (m.type === "error"){ fail(new Error(m.error)); sock.close(); }
        else if (m.type === "players"){ list = m.list; handlers.players?.(players()); }
        else if (m.type === "event"){ handlers[m.event]?.(m.payload); }
      };
      sock.onerror = () => fail(new Error("CONNECT_ERROR"));
      sock.onclose = () => {
        fail(new Error("CLOSED"));
        if (ws === sock){ ws = null; list = []; }
      };
    });
  }

  async function create(name){
    // kode room bentrok dengan room yang sudah ada: coba kode lain
    for (let i = 0; i < 5; i++){
      const roomCode = String(1000 + Math.floor(Math.random() * 9000));
      try { await connect(roomCode, name, "host"); return roomCode; }
      catch (e){ if (e.message !== "EXISTS") throw e; }
    }
    throw new Error("CONNECT_ERROR");
  }

  async function join(roomCode, name){
    await connect(roomCode, name, "guest");   // server menolak dengan NO_ROOM / FULL
  }

  const send = (event, payload) => {
    if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type:"event", event, payload }));
  };

  async function leave(){
    const sock = ws;
    ws = null; list = []; role = null; code = null;
    sock?.close();
  }

  return {
    ready, create, join, leave, players,
    on:(ev, fn) => { handlers[ev] = fn; },
    start:payload => send("start", payload),
    progress:payload => send("progress", { ...payload, from:me?.id, rid:round }),
    setRound:r => { round = r; },
    get round(){ return round; },
    get me(){ return me; }, get role(){ return role; }, get code(){ return code; }
  };
})();
