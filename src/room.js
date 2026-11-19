// Satu room duel = satu Durable Object. Menggantikan Supabase Realtime (presence + broadcast).
const MAX_PLAYERS = 2;
const ROLES = ["host", "guest"];

export class Room {
  constructor(state) {
    this.state = state;
  }

  async fetch() {
    const pair = new WebSocketPair();
    this.state.acceptWebSocket(pair[1]);
    return new Response(null, { status: 101, webSocket: pair[0] });
  }

  // Pemain yang sudah join (attachment terisi saat "join" diterima).
  members(except) {
    return this.state
      .getWebSockets()
      .filter((ws) => ws !== except)
      .map((ws) => ({ ws, p: ws.deserializeAttachment() }))
      .filter((m) => m.p);
  }

  list(except) {
    return this.members(except).map((m) => m.p).sort((a, b) => a.t - b.t);
  }

  send(ws, msg) {
    try {
      ws.send(JSON.stringify(msg));
    } catch (e) {
      /* koneksi sudah putus; ditangani webSocketClose */
    }
  }

  broadcastPlayers(except) {
    const list = this.list(except);
    for (const { ws } of this.members(except)) this.send(ws, { type: "players", list });
  }

  webSocketMessage(ws, raw) {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch (e) {
      return;
    }
    if (msg.type === "join") return this.join(ws, msg);

    // Pesan lain hanya diterima dari pemain yang sudah join
    if (!ws.deserializeAttachment()) return;
    if (msg.type === "event") {
      for (const { ws: other } of this.members(ws)) {
        this.send(other, { type: "event", event: msg.event, payload: msg.payload });
      }
    }
  }

  join(ws, msg) {
    if (ws.deserializeAttachment()) return;
    if (!ROLES.includes(msg.role)) return this.send(ws, { type: "error", error: "BAD_ROLE" });

    const members = this.members();
    const hasHost = members.some((m) => m.p.role === "host");
    if (msg.role === "guest" && !hasHost) return this.send(ws, { type: "error", error: "NO_ROOM" });
    if (msg.role === "host" && hasHost) return this.send(ws, { type: "error", error: "EXISTS" });
    if (members.length >= MAX_PLAYERS) return this.send(ws, { type: "error", error: "FULL" });

    const p = {
      id: String(msg.id).slice(0, 20),
      name: String(msg.name || "").slice(0, 30),
      role: msg.role,
      t: Date.now(),
    };
    ws.serializeAttachment(p);
    this.send(ws, { type: "joined", me: p, list: this.list() });
    this.broadcastPlayers();
  }

  webSocketClose(ws) {
    // kode dari klien (mis. 1005) tidak boleh dikirim balik: close() akan melempar error
    ws.close();
    this.broadcastPlayers(ws);
  }

  webSocketError(ws) {
    ws.close(1011, "error");
    this.broadcastPlayers(ws);
  }
}
