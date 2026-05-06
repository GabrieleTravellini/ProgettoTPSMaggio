const WebSocket = require("ws");
const PORT = 41000;
const DIM = 10; // Griglia 10x10
const MIN_GIOCATORI = 2;

const NAVI_CONFIG = [
  { nome: "Portaerei", lunghezza: 5 },
  { nome: "Corazzata", lunghezza: 4 },
  { nome: "Incrociatore", lunghezza: 3 },
  { nome: "Cacciatorpediniere", lunghezza: 3 },
  { nome: "Sottomarino", lunghezza: 2 }
];
const TOTALE_CELLE = NAVI_CONFIG.reduce((s, n) => s + n.lunghezza, 0);

let giocatori = new Map();
let ordine = [];
let turnoIdx = 0;
let stato = "ATTESA"; // ATTESA, POSIZIONAMENTO, IN_CORSO, TERMINATA

const wss = new WebSocket.Server({ host: '0.0.0.0', port: PORT });

function creaGrigliaVuota() {
  return Array.from({ length: DIM }, () => Array(DIM).fill("~"));
}

function oscura(g) {
  return g.map(r => r.map(c => c === "N" ? "~" : c));
}

function validaPosizionamento(g, r0, c0, orizzontale, lunghezza) {
  for (let i = 0; i < lunghezza; i++) {
    let r = orizzontale ? r0 : r0 + i;
    let c = orizzontale ? c0 + i : c0;
    if (r < 0 || r >= DIM || c < 0 || c >= DIM) return false;
    if (g[r][c] !== "~") return false;
  }
  return true;
}

function invia(ws, msg) {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
}
function inviaATutti(msg) {
  for (const [, g] of giocatori) invia(g.ws, msg);
}

function inizia() {
  stato = "IN_CORSO";
  ordine = [...giocatori.keys()];
  turnoIdx = 0;
  console.log("\n=== PARTITA INIZIATA ===");
  inviaATutti({ tipo: "INIZIO", ordine });
  notificaTurno();
}

function notificaTurno() {
  while (giocatori.get(ordine[turnoIdx])?.eliminato)
    turnoIdx = (turnoIdx + 1) % ordine.length;

  const attuale = ordine[turnoIdx];
  const gAttuale = giocatori.get(attuale);
  const avversari = {};
  for (const [n, info] of giocatori) {
    if (n !== attuale && !info.eliminato) avversari[n] = oscura(info.griglia);
  }

  invia(gAttuale.ws, { tipo: "IL_TUO_TURNO", avversari });
  for (const [n, g] of giocatori) {
    if (n !== attuale && !g.eliminato) invia(g.ws, { tipo: "ATTENDI", turno_di: attuale });
  }
}

function attacca(nomeAttaccante, dati) {
  if (stato !== "IN_CORSO" || ordine[turnoIdx] !== nomeAttaccante) return;

  const { bersaglio, riga, col } = dati;
  const target = giocatori.get(bersaglio);
  if (!target || target.eliminato) return;
  if (riga < 0 || riga >= DIM || col < 0 || col >= DIM) return;

  const cella = target.griglia[riga][col];
  if (cella === "X" || cella === "O") return;

  let esito = "MANCATO";
  let naveAffondata = null;

  if (cella === "N") {
    target.griglia[riga][col] = "X";
    target.colpiSubiti++;
    esito = "COLPITO";
    naveAffondata = trovaNaveAffondata(target.griglia, riga, col);
    if (naveAffondata) esito = "AFFONDATA";
  } else {
    target.griglia[riga][col] = "O";
  }

  // Invia risultati personalizzati: griglia piena al bersaglio, oscurata agli altri
  const baseMsg = {
    tipo: "RISULTATO", attaccante: nomeAttaccante, bersaglio, riga, col, esito,
    nave: naveAffondata, celleRimaste: TOTALE_CELLE - target.colpiSubiti
  };

  for (const [nome, g] of giocatori) {
    if (nome === bersaglio) {
      invia(g.ws, { ...baseMsg, grigliaAggiornata: target.griglia, sonoIoIlBersaglio: true });
    } else {
      invia(g.ws, { ...baseMsg, grigliaAggiornata: oscura(target.griglia), sonoIoIlBersaglio: false });
    }
  }

  if (target.colpiSubiti >= TOTALE_CELLE) {
    target.eliminato = true;
    inviaATutti({ tipo: "ELIMINATO", giocatore: bersaglio });
  }

  const attivi = ordine.filter(n => !giocatori.get(n).eliminato);
  if (attivi.length === 1) {
    stato = "TERMINATA";
    inviaATutti({ tipo: "VITTORIA", vincitore: attivi[0] });
    return;
  }
  turnoIdx = (turnoIdx + 1) % ordine.length;
  notificaTurno();
}

function trovaNaveAffondata(g, r0, c0) {
  const dirs = [[0,1],[0,-1],[1,0],[-1,0]];
  const gruppo = [[r0, c0]];
  for (const [dr, dc] of dirs) {
    let r = r0 + dr, c = c0 + dc;
    while (r >= 0 && r < DIM && c >= 0 && c < DIM && (g[r][c] === "X" || g[r][c] === "N")) {
      gruppo.push([r, c]); r += dr; c += dc;
    }
  }
  if (gruppo.every(([r,c]) => g[r][c] === "X")) {
    return NAVI_CONFIG.find(n => n.lunghezza === gruppo.length)?.nome || "Nave";
  }
  return null;
}

wss.on("connection", function (ws) {
  let mioNome = null;

  ws.on("message", function (raw) {
    let dati;
    try { dati = JSON.parse(raw); } catch { return; }

    switch (dati.tipo) {
      case "UNISCITI": {
        const nome = (dati.nome || "").trim();
        if (!nome || stato !== "ATTESA" || giocatori.has(nome)) {
          return invia(ws, { tipo: "ERRORE", messaggio: "Non puoi entrare ora o nome già in uso." });
        }
        mioNome = nome;
        giocatori.set(nome, { ws, griglia: creaGrigliaVuota(), colpiSubiti: 0, eliminato: false, flottaPronta: false });
        invia(ws, { tipo: "BENVENUTO", nome, dim: DIM });
        inviaATutti({ tipo: "GIOCATORI", lista: [...giocatori.keys()] });
        break;
      }

      case "PRONTO": {
        if (giocatori.size < MIN_GIOCATORI || stato !== "ATTESA") return;
        stato = "POSIZIONAMENTO";
        for (const [, g] of giocatori) g.flottaPronta = false;
        inviaATutti({ tipo: "INIZIA_POSIZIONAMENTO", navi: NAVI_CONFIG, dim: DIM });
        break;
      }

      case "POSIZIONA_NAVE": {
        if (stato !== "POSIZIONAMENTO") return;
        const { naveNome, r0, c0, orizzontale } = dati;
        const configNave = NAVI_CONFIG.find(n => n.nome === naveNome);
        const g = giocatori.get(mioNome);
        
        if (validaPosizionamento(g.griglia, r0, c0, orizzontale, configNave.lunghezza)) {
          for (let i = 0; i < configNave.lunghezza; i++) {
            g.griglia[orizzontale ? r0 : r0 + i][orizzontale ? c0 + i : c0] = "N";
          }
          invia(g.ws, { tipo: "POSIZIONAMENTO_OK", griglia: g.griglia, naveNome: naveNome });
        } else {
          invia(g.ws, { tipo: "ERRORE", messaggio: "Posizione non valida!" });
        }
        break;
      }

      case "CONFERMA_FLITTA": {
        if (stato !== "POSIZIONAMENTO") return;
        giocatori.get(mioNome).flottaPronta = true;
        
        let tuttiPronti = true;
        for (const [, info] of giocatori) { if (!info.flottaPronta) { tuttiPronti = false; break; } }
        
        if (tuttiPronti) {
          inizia();
        } else {
          invia(giocatori.get(mioNome).ws, { tipo: "ATTENDI_POS", messaggio: "Flotta pronta! Attendi gli altri..." });
        }
        break;
      }

      case "ATTACCA": { attacca(mioNome, dati); break; }

      case "RICOMINCIA": {
        if (stato !== "TERMINATA" || giocatori.size < MIN_GIOCATORI) return;
        for (const [nome, g] of giocatori) {
          g.griglia = creaGrigliaVuota();
          g.colpiSubiti = 0;
          g.eliminato = false;
          g.flottaPronta = false;
        }
        stato = "POSIZIONAMENTO";
        inviaATutti({ tipo: "INIZIA_POSIZIONAMENTO", navi: NAVI_CONFIG, dim: DIM });
        break;
      }
    }
  });

  ws.on("close", function () {
    if (mioNome && giocatori.has(mioNome)) {
      giocatori.delete(mioNome);
      if (stato === "ATTESA" || stato === "POSIZIONAMENTO") {
        if (giocatori.size < MIN_GIOCATORI) {
          stato = "ATTESA";
          inviaATutti({ tipo: "TORNA_LOBBY", lista: [...giocatori.keys()] });
        }
      }
    }
  });
});

console.log("╔══════════════════════════════════════╗");
console.log("║  BATTAGLIA NAVALE 10x10 - SERVER WS  ║");
console.log(`║  In ascolto su porta ${PORT}            ║`);
console.log("╚══════════════════════════════════════╝\n");