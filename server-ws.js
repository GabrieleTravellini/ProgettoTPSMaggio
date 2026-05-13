const WebSocket = require("ws");
const PORT = 41000;
const DIM = 10;
const MIN_GIOCATORI = 2;

const NAVI_CONFIG = [
  { nome: "Portaerei", lunghezza: 5 },
  { nome: "Corazzata", lunghezza: 4 },
  { nome: "Incrociatore", lunghezza: 3 },
  { nome: "Cacciatorpediniere", lunghezza: 3 },
  { nome: "Sottomarino", lunghezza: 2 }
];

const POWER_UPS = [
  { id: "radar", nome: "Radar", emoji: "📡", effetto: "Rivela la posizione di una nave" },
  { id: "double_hit", nome: "Doppio Colpo", emoji: "💥", effetto: "Attacca due volte" },
  { id: "shield", nome: "Scudo", emoji: "🛡️", effetto: "Proteggi una nave dal prossimo attacco" },
  { id: "scan", nome: "Scansione", emoji: "🔍", effetto: "Scansiona una riga/colonna" }
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
  if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
}
function inviaATutti(msg) {
  for (const [, g] of giocatori) invia(g.ws, msg);
}

function getShipHealth(griglia) {
  const ships = {};
  NAVI_CONFIG.forEach(config => {
    const celle = [];
    for (let r = 0; r < DIM; r++) {
      for (let c = 0; c < DIM; c++) {
        if (griglia[r][c] === "N" || griglia[r][c] === "X") {
          celle.push({ r, c, status: griglia[r][c] });
        }
      }
    }
    
    const gruppi = [];
    const visitati = new Set();
    
    for (const cella of celle) {
      if (visitati.has(`${cella.r},${cella.c}`)) continue;
      
      const gruppo = [];
      const stack = [cella];
      
      while (stack.length > 0) {
        const curr = stack.pop();
        const key = `${curr.r},${curr.c}`;
        if (visitati.has(key)) continue;
        visitati.add(key);
        gruppo.push(curr);
        
        [[0,1],[0,-1],[1,0],[-1,0]].forEach(([dr, dc]) => {
          const nr = curr.r + dr;
          const nc = curr.c + dc;
          if (nr >= 0 && nr < DIM && nc >= 0 && nc < DIM && !visitati.has(`${nr},${nc}`)) {
            const next = celle.find(c => c.r === nr && c.c === nc);
            if (next) stack.push(next);
          }
        });
      }
      
      if (gruppo.length === config.lunghezza) {
        const danno = gruppo.filter(c => c.status === "X").length;
        ships[config.nome] = { totale: gruppo.length, danno, status: danno === 0 ? "Intatto" : danno === gruppo.length ? "Affondato" : "Danneggiato" };
      }
    }
  });
  
  return ships;
}

function inizia() {
  stato = "IN_CORSO";
  ordine = [...giocatori.keys()];
  turnoIdx = 0;
  
  console.log("\n=== PARTITA INIZIATA ===");
  console.log(`Ordine turni: ${ordine.join(" → ")}\n`);
  
  inviaATutti({ tipo: "INIZIO", ordine });
  notificaTurno();
}

function notificaTurno() {
  while (turnoIdx < ordine.length && giocatori.get(ordine[turnoIdx])?.eliminato) {
    turnoIdx++;
  }

  if (turnoIdx >= ordine.length) {
    turnoIdx = 0;
    while (turnoIdx < ordine.length && giocatori.get(ordine[turnoIdx])?.eliminato) {
      turnoIdx++;
    }
  }

  const attuale = ordine[turnoIdx];
  const gAttuale = giocatori.get(attuale);
  
  if (!gAttuale) {
    turnoIdx = (turnoIdx + 1) % ordine.length;
    notificaTurno();
    return;
  }

  const avversari = {};
  for (const [n, info] of giocatori) {
    if (n !== attuale && !info.eliminato) {
      avversari[n] = {
        griglia: oscura(info.griglia),
        navi: getShipHealth(info.griglia)
      };
    }
  }

  // Invia a chi tocca
  invia(gAttuale.ws, {
    tipo: "IL_TUO_TURNO",
    avversari,
    ordine,
    turnoAttuale: attuale,
    powerUps: POWER_UPS
  });

  // Invia agli altri attivi
  for (const [n, g] of giocatori) {
    if (n !== attuale && !g.eliminato) {
      invia(g.ws, {
        tipo: "ATTENDI",
        turno_di: attuale,
        ordine,
        turnoAttuale: attuale
      });
    }
  }

  // Invia agli eliminati
  for (const [n, g] of giocatori) {
    if (g.eliminato) {
      invia(g.ws, {
        tipo: "ATTENDI",
        turno_di: attuale,
        ordine,
        turnoAttuale: attuale
      });
    }
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
    tipo: "RISULTATO",
    attaccante: nomeAttaccante,
    bersaglio,
    riga,
    col,
    esito,
    nave: naveAffondata,
    celleRimaste: TOTALE_CELLE - target.colpiSubiti
  };

  for (const [nome, g] of giocatori) {
    if (nome === bersaglio) {
      invia(g.ws, {
        ...baseMsg,
        grigliaAggiornata: target.griglia,
        sonoIoIlBersaglio: true,
        navi: getShipHealth(target.griglia)
      });
    } else {
      invia(g.ws, {
        ...baseMsg,
        grigliaAggiornata: oscura(target.griglia),
        sonoIoIlBersaglio: false,
        navi: getShipHealth(target.griglia)
      });
    }
  }

  if (target.colpiSubiti >= TOTALE_CELLE) {
    target.eliminato = true;
    const rimasti = ordine.filter(n => !giocatori.get(n).eliminato);
    console.log(`⚰️ ${bersaglio} è stato eliminato! Rimasti: ${rimasti.length}`);
    inviaATutti({ tipo: "ELIMINATO", giocatore: bersaglio });

    if (rimasti.length === 1) {
      stato = "TERMINATA";
      inviaATutti({ tipo: "VITTORIA", vincitore: rimasti[0] });
      return;
    }
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
        giocatori.set(nome, {
          ws,
          griglia: creaGrigliaVuota(),
          colpiSubiti: 0,
          eliminato: false,
          flottaPronta: false,
          powerUps: []
        });
        invia(ws, { tipo: "BENVENUTO", nome, dim: DIM });
        console.log(`✅ ${nome} è entrato in gioco. Giocatori: ${giocatori.size}`);
        inviaATutti({ tipo: "GIOCATORI", lista: [...giocatori.keys()] });
        break;
      }

      case "PRONTO": {
        if (giocatori.size < MIN_GIOCATORI || stato !== "ATTESA") return;
        stato = "POSIZIONAMENTO";
        for (const [, g] of giocatori) g.flottaPronta = false;
        inviaATutti({ tipo: "INIZIA_POSIZIONAMENTO", navi: NAVI_CONFIG, dim: DIM });
        console.log("🎮 POSIZIONAMENTO INIZIATO");
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
        console.log(`✅ ${mioNome} ha confermato la flotta`);

        let tuttiPronti = true;
        for (const [, info] of giocatori) {
          if (!info.flottaPronta) {
            tuttiPronti = false;
            break;
          }
        }

        if (tuttiPronti) {
          console.log("🚀 Tutti pronti! Inizio partita...");
          inizia();
        } else {
          invia(giocatori.get(mioNome).ws, { tipo: "ATTENDI_POS", messaggio: "Flotta pronta! Attendi gli altri..." });
        }
        break;
      }

      case "ATTACCA": {
        attacca(mioNome, dati);
        break;
      }

      case "USA_POWER_UP": {
        const { powerUpId, bersaglio } = dati;
        console.log(`⚡ ${mioNome} usa ${powerUpId} su ${bersaglio}`);
        break;
      }

      case "RICOMINCIA": {
        if (stato !== "TERMINATA" || giocatori.size < MIN_GIOCATORI) return;
        for (const [nome, g] of giocatori) {
          g.griglia = creaGrigliaVuota();
          g.colpiSubiti = 0;
          g.eliminato = false;
          g.flottaPronta = false;
          g.powerUps = [];
        }
        stato = "POSIZIONAMENTO";
        turnoIdx = 0;
        console.log("🔄 PARTITA RICOMINCIATA");
        inviaATutti({ tipo: "INIZIA_POSIZIONAMENTO", navi: NAVI_CONFIG, dim: DIM });
        break;
      }
    }
  });

  ws.on("close", function () {
    if (mioNome && giocatori.has(mioNome)) {
      console.log(`❌ ${mioNome} si è disconnesso`);
      giocatori.delete(mioNome);
      if ((stato === "ATTESA" || stato === "POSIZIONAMENTO") && giocatori.size < MIN_GIOCATORI) {
        stato = "ATTESA";
        inviaATutti({ tipo: "TORNA_LOBBY", lista: [...giocatori.keys()] });
      }
    }
  });
});

console.log("╔════════════════════════════════════════════╗");
console.log("║  BATTAGLIA NAVALE MOLTIGIOCATORE - SERVER  ║");
console.log(`║  In ascolto su porta ${PORT}                  ║`);
console.log("╚════════════════════════════════════════════╝\n");