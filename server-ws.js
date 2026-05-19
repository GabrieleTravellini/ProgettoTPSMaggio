const WebSocket = require("ws");
const { Card, Deck, Hand, DiscardPile, CardEffect, ExodiaChecker, PowerUpManager, DEFAULT_CARD_DEFINITIONS, createDefaultDeck, CARD_CONFIG } = require("./cards-server.js");

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
  
  // Initialize card system: shuffle decks and draw initial hand
  for (const [nome, g] of giocatori) {
    g.deck.shuffle();
    const initialCards = g.deck.drawMultiple(CARD_CONFIG.startingHandSize);
    g.hand.addCards(initialCards);
    console.log(`🃏 ${nome}: Mano iniziale disegnata (${initialCards.length} carte)`);
  }
  
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

  // Reset power-up usage for current player
  if (gAttuale.powerUpManager) {
    gAttuale.powerUpManager.resetTurn();
  }

  // Draw card for current player
  if (gAttuale.deck && gAttuale.hand) {
    for (let i = 0; i < CARD_CONFIG.cardsDrawnPerTurn; i++) {
      const drawResult = gAttuale.deck.draw();
      if (drawResult.success) {
        gAttuale.hand.addCard(drawResult.card);
        console.log(`🃏 ${attuale} disegna: ${drawResult.card.name}`);
      } else {
        // Empty deck - apply fatigue rules if enabled
        if (CARD_CONFIG.fatigueRules.enabled) {
          console.log(`⚠️ ${attuale} tenta di disegnare da un mazzo vuoto!`);
        }
      }
    }
  }

  // Check for Exodia win condition
  if (gAttuale.exodiaChecker && CARD_CONFIG.exodiaInstantWin) {
    if (gAttuale.exodiaChecker.checkWin(gAttuale.hand)) {
      console.log(`👑 EXODIA! ${attuale} ha assemblato tutti i pezzi di Exodia!`);
      stato = "TERMINATA";
      const exodiaParts = ['EXODIA_HEAD', 'EXODIA_LEFT_ARM', 'EXODIA_RIGHT_ARM', 'EXODIA_LEFT_LEG', 'EXODIA_RIGHT_LEG'];
      inviaATutti({ 
        tipo: "VITTORIA_EXODIA", 
        vincitore: attuale,
        exodiaParts: exodiaParts
      });
      return;
    }
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

  // Prepare hand and deck info for current player
  const handInfo = gAttuale.hand ? {
    cards: gAttuale.hand.cards.filter(c => c && c.toJSON).map(c => c.toJSON()),
    size: gAttuale.hand.getSize(),
    maxSize: gAttuale.hand.maxSize
  } : null;

  const deckInfo = gAttuale.deck ? {
    size: gAttuale.deck.getSize(),
    isEmpty: gAttuale.deck.isEmpty()
  } : null;

  const discardInfo = gAttuale.discardPile ? {
    size: gAttuale.discardPile.getSize()
  } : null;

  const exodiaInfo = gAttuale.exodiaChecker ? {
    progress: gAttuale.exodiaChecker.getProgress(gAttuale.hand),
    progressPercentage: gAttuale.exodiaChecker.getProgressPercentage(gAttuale.hand),
    enabled: gAttuale.exodiaChecker.enabled
  } : null;

  const powerUpInfo = gAttuale.powerUpManager ? {
    used: gAttuale.powerUpManager.usedThisTurn,
    max: gAttuale.powerUpManager.maxPerTurn,
    remaining: gAttuale.powerUpManager.getRemaining()
  } : null;

  // Invia a chi tocca
  invia(gAttuale.ws, {
    tipo: "IL_TUO_TURNO",
    avversari,
    ordine,
    turnoAttuale: attuale,
    powerUps: POWER_UPS,
    hand: handInfo,
    deck: deckInfo,
    discard: discardInfo,
    exodia: exodiaInfo,
    powerUpUsage: powerUpInfo
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

/**
 * Executes attack card effects and applies damage to target grid
 */
function eseguiAttaccoCartaGiocata(attaccante, bersaglio, card, giocatoreAttaccante, giocatoreBersaglio) {
  const result = {
    tipo: "CARTA_GIOCATA",
    giocatore: attaccante,
    carta: card.name,
    cardType: 'ATTACK',
    bersaglio: bersaglio,
    effetto: `${attaccante} ha attaccato con ${card.name}!`,
    gridUpdate: null,
    revealedCells: []
  };

  // Determine number of shots based on card
  let numShots = 1;
  if (card.id === 'DOUBLE_SHOT') numShots = 2;
  else if (card.id === 'STRIKE_3') numShots = 1; // Critical hits harder
  else numShots = 1;

  const grid = giocatoreBersaglio.griglia;
  let colpiTotali = 0;
  let affondamenti = [];
  let cellsAttacked = [];

  // Execute attacks on random cells
  for (let i = 0; i < numShots; i++) {
    let riga, col, attempts = 0;
    
    // Find unattacked cell
    do {
      riga = Math.floor(Math.random() * DIM);
      col = Math.floor(Math.random() * DIM);
      attempts++;
    } while ((grid[riga][col] === 'X' || grid[riga][col] === 'O') && attempts < 10);

    if (attempts >= 10) continue; // Skip if can't find cell

    // Check for active defense
    let isBlocked = false;
    if (giocatoreBersaglio.activeDefenses && giocatoreBersaglio.activeDefenses.length > 0) {
      isBlocked = true;
      giocatoreBersaglio.activeDefenses = giocatoreBersaglio.activeDefenses.filter(d => d.turns > 0);
      giocatoreBersaglio.activeDefenses.forEach(d => d.turns--);
      result.effetto += ` [Ma ${bersaglio} si è difeso!]`;
      cellsAttacked.push({ riga, col, esito: 'BLOCCATO' });
    } else if (grid[riga][col] === 'N') {
      // HIT
      grid[riga][col] = 'X';
      giocatoreBersaglio.colpiSubiti++;
      colpiTotali++;
      let naveAffondata = trovaNaveAffondata(grid, riga, col);
      if (naveAffondata) affondamenti.push(naveAffondata);
      cellsAttacked.push({ riga, col, esito: 'COLPITO', nave: naveAffondata });
    } else {
      // MISS
      grid[riga][col] = 'O';
      cellsAttacked.push({ riga, col, esito: 'MANCATO' });
    }
  }

  // Build result message
  if (colpiTotali > 0) {
    result.effetto += ` ${colpiTotali} colpo${colpiTotali > 1 ? 'i' : ''}!`;
  } else {
    result.effetto += ` Mancato!`;
  }

  if (affondamenti.length > 0) {
    result.effetto += ` Navi affondate: ${affondamenti.join(', ')}!`;
  }

  // Send grid updates to all players
  for (const [nome, g] of giocatori) {
    if (nome === bersaglio) {
      invia(g.ws, {
        tipo: "RISULTATO",
        attaccante: attaccante,
        bersaglio: bersaglio,
        cellsAttacked: cellsAttacked,
        grigliaAggiornata: grid,
        sonoIoIlBersaglio: true,
        navi: getShipHealth(grid),
        messaggio: result.effetto
      });
    } else {
      invia(g.ws, {
        tipo: "RISULTATO",
        attaccante: attaccante,
        bersaglio: bersaglio,
        cellsAttacked: cellsAttacked,
        grigliaAggiornata: oscura(grid),
        sonoIoIlBersaglio: false,
        navi: getShipHealth(grid),
        messaggio: result.effetto
      });
    }
  }

  // Check for elimination
  if (giocatoreBersaglio.colpiSubiti >= TOTALE_CELLE) {
    giocatoreBersaglio.eliminato = true;
    const rimasti = ordine.filter(n => !giocatori.get(n).eliminato);
    console.log(`⚰️ ${bersaglio} è stato eliminato! Rimasti: ${rimasti.length}`);
    inviaATutti({ tipo: "ELIMINATO", giocatore: bersaglio });

    if (rimasti.length === 1) {
      stato = "TERMINATA";
      inviaATutti({ tipo: "VITTORIA", vincitore: rimasti[0] });
    }
  }

  console.log(`⚔️ ${attaccante} ha attaccato con ${card.name}: ${result.effetto}`);
  return result;
}

/**
 * Executes utility card effects (Radar, Sonar, Repair, Draw, etc.)
 */
function eseguiCarteUtility(giocatoreName, bersaglio, card, giocatore, giocatoreBersaglio) {
  const result = {
    tipo: "CARTA_GIOCATA",
    giocatore: giocatoreName,
    carta: card.name,
    cardType: 'UTILITY',
    bersaglio: bersaglio,
    effetto: `${giocatoreName} ha usato ${card.name}!`,
    revealedCells: null,
    revealedShips: null
  };

  switch (card.id) {
    case 'RADAR': {
      // Reveal 3x3 area
      const centerRow = Math.floor(Math.random() * DIM);
      const centerCol = Math.floor(Math.random() * DIM);
      const revealed = [];

      for (let r = Math.max(0, centerRow - 1); r <= Math.min(DIM - 1, centerRow + 1); r++) {
        for (let c = Math.max(0, centerCol - 1); c <= Math.min(DIM - 1, centerCol + 1); c++) {
          revealed.push({
            riga: r,
            col: c,
            content: giocatoreBersaglio.griglia[r][c],
            hasShip: giocatoreBersaglio.griglia[r][c] === 'N' || giocatoreBersaglio.griglia[r][c] === 'X'
          });
        }
      }

      result.effetto += ` Rivela zona 3x3 a (${centerRow}, ${centerCol})!`;
      result.revealedCells = revealed;
      
      console.log(`📡 ${giocatoreName} ha usato RADAR, inviando RADAR_RESULT con ${revealed.length} celle rivelate`);
      invia(giocatore.ws, {
        tipo: "RADAR_RESULT",
        revealed: revealed,
        messaggio: result.effetto
      });
      console.log(`✅ RADAR_RESULT inviato a ${giocatoreName}`);
      console.log(`📡 ${giocatoreName} ha usato RADAR, rivelate ${revealed.length} celle`);
      break;
    }

    case 'REPAIR': {
      // Find a damaged cell and repair it
      let repaired = false;
      for (let r = 0; r < DIM && !repaired; r++) {
        for (let c = 0; c < DIM && !repaired; c++) {
          if (giocatore.griglia[r][c] === 'X') {
            giocatore.griglia[r][c] = 'N';
            giocatore.colpiSubiti--;
            result.effetto += ` Una nave è stata riparata!`;
            repaired = true;
            console.log(`🔧 ${giocatoreName} ha usato REPAIR su (${r}, ${c})`);
          }
        }
      }
      if (!repaired) {
        result.effetto += ` (Nessun danno da riparare)`;
      }
      break;
    }

    case 'SONAR': {
      // Reveal all ships of a certain length
      const ships = [];
      const visited = new Set();

      for (let r = 0; r < DIM; r++) {
        for (let c = 0; c < DIM; c++) {
          const key = `${r},${c}`;
          if ((giocatoreBersaglio.griglia[r][c] === 'N' || giocatoreBersaglio.griglia[r][c] === 'X') && !visited.has(key)) {
            const ship = trovaNaviGruppo(giocatoreBersaglio.griglia, r, c, visited);
            if (ship) ships.push(ship);
          }
        }
      }

      result.effetto += ` Rivelate ${ships.length} navi nemiche!`;
      result.revealedShips = ships;
      
      invia(giocatore.ws, {
        tipo: "SONAR_RESULT",
        ships: ships,
        messaggio: result.effetto
      });
      console.log(`🌊 ${giocatoreName} ha usato SONAR, rivelate ${ships.length} navi`);
      break;
    }

    case 'DOUBLE_SHOT':
      result.effetto += ` Prossimo attacco: 2 colpi!`;
      if (!giocatore.powerups) giocatore.powerups = {};
      giocatore.powerups.doubleShot = true;
      console.log(`💥 ${giocatoreName} ha usato DOUBLE_SHOT`);
      break;

    case 'EMP':
      result.effetto += ` Una carta del nemico è stata disabilitata!`;
      if (giocatoreBersaglio.hand && giocatoreBersaglio.hand.cards.length > 0) {
        const randomIdx = Math.floor(Math.random() * giocatoreBersaglio.hand.cards.length);
        giocatoreBersaglio.hand.cards[randomIdx].disabled = true;
      }
      console.log(`⚡ ${giocatoreName} ha usato EMP`);
      break;

    case 'SWAP': {
      result.effetto += ` Una carta è stata scambiata!`;
      if (giocatore.hand.cards.length > 0 && giocatoreBersaglio.hand.cards.length > 0) {
        const idx1 = Math.floor(Math.random() * giocatore.hand.cards.length);
        const idx2 = Math.floor(Math.random() * giocatoreBersaglio.hand.cards.length);
        const temp = giocatore.hand.cards[idx1];
        giocatore.hand.cards[idx1] = giocatoreBersaglio.hand.cards[idx2];
        giocatoreBersaglio.hand.cards[idx2] = temp;
      }
      console.log(`🔄 ${giocatoreName} ha usato SWAP`);
      break;
    }

    case 'DRAW':
      result.effetto += ` Una carta in più!`;
      if (giocatore.deck.getSize() > 0) {
        const drawn = giocatore.deck.draw();
        if (drawn.success && drawn.card) {
          giocatore.hand.addCard(drawn.card);
        }
      }
      console.log(`📚 ${giocatoreName} ha usato DRAW`);
      break;

    case 'BOOST':
      result.effetto += ` Prossimi attacchi: +1 potenza!`;
      if (!giocatore.powerups) giocatore.powerups = {};
      giocatore.powerups.boost = true;
      console.log(`⚡ ${giocatoreName} ha usato BOOST`);
      break;

    case 'RESET':
      result.effetto += ` Cooldown resettati!`;
      console.log(`🔄 ${giocatoreName} ha usato RESET`);
      break;

    default:
      result.effetto += ` (Effetto sconosciuto)`;
  }

  return result;
}

/**
 * Find all connected cells of a ship and mark as visited
 */
function trovaNaviGruppo(grid, r, c, visited) {
  const dirs = [[0,1],[0,-1],[1,0],[-1,0]];
  const ship = [];
  const queue = [[r, c]];

  while (queue.length > 0) {
    const [cr, cc] = queue.shift();
    const key = `${cr},${cc}`;

    if (visited.has(key) || cr < 0 || cr >= DIM || cc < 0 || cc >= DIM) continue;
    if (grid[cr][cc] !== 'N' && grid[cr][cc] !== 'X') continue;

    visited.add(key);
    ship.push({riga: cr, col: cc, hasHit: grid[cr][cc] === 'X'});

    for (const [dr, dc] of dirs) {
      queue.push([cr + dr, cc + dc]);
    }
  }

  return ship.length > 0 ? ship : null;
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

/**
 * Process a card played by a player
 * Applies card effects and updates game state
 */
function processaCartaGiocata(nomeGiocatore, dati) {
  const { cardIndex, cardId, bersaglio } = dati;
  const giocatore = giocatori.get(nomeGiocatore);
  const targetPlayer = giocatori.get(bersaglio);

  if (!giocatore || !targetPlayer || stato !== "IN_CORSO") {
    return;
  }

  // Check if it's the player's turn
  if (ordine[turnoIdx] !== nomeGiocatore) {
    return;
  }

  // Get card from hand
  const hand = giocatore.hand;
  if (!hand || cardIndex >= hand.cards.length || cardIndex < 0) {
    console.log(`❌ Indice carta non valido per ${nomeGiocatore}`);
    return;
  }

  const card = hand.cards[cardIndex];
  if (!card) {
    console.log(`❌ Carta non trovata per ${nomeGiocatore}`);
    return;
  }

  // Check if card can be played (power-up limit if applicable)
  if ((card.type === 'ATTACK' || card.type === 'UTILITY') && giocatore.powerUpManager) {
    if (!giocatore.powerUpManager.canUsePowerUp()) {
      console.log(`⚠️ ${nomeGiocatore} ha raggiunto il limite di power-up per questo turno`);
      invia(giocatore.ws, { 
        tipo: "ERRORE", 
        messaggio: `Hai raggiunto il limite di ${giocatore.powerUpManager.maxPerTurn} power-up per questo turno!` 
      });
      return;
    }
  }

  // Play the card (remove from hand, add to discard)
  hand.playCard(cardIndex);
  giocatore.discardPile.addCard(card);

  // Use power-up if applicable
  if ((card.type === 'ATTACK' || card.type === 'UTILITY') && giocatore.powerUpManager) {
    giocatore.powerUpManager.usePowerUp(null);
  }

  // Apply card effect based on type
  let effectResult = {
    tipo: "CARTA_GIOCATA",
    giocatore: nomeGiocatore,
    carta: card.name,
    cardType: card.type,
    bersaglio: bersaglio,
    effetto: "",
    gridUpdate: null,
    revealedCells: null
  };

  switch (card.type) {
    case 'ATTACK':
      // Execute actual attack
      effectResult = eseguiAttaccoCartaGiocata(nomeGiocatore, bersaglio, card, giocatore, targetPlayer);
      break;

    case 'DEFENSE':
      effectResult.effetto = `${nomeGiocatore} si è difeso con ${card.name}!`;
      // Store active defense to block next attack
      if (!giocatore.activeDefenses) giocatore.activeDefenses = [];
      giocatore.activeDefenses.push({ cardName: card.name, turns: 1 });
      console.log(`🛡️ ${nomeGiocatore} si è difeso con ${card.name}`);
      break;

    case 'UTILITY':
      effectResult = eseguiCarteUtility(nomeGiocatore, bersaglio, card, giocatore, targetPlayer);
      break;

    case 'EXODIA':
      effectResult.effetto = `${nomeGiocatore} ha disegnato ${card.name}!`;
      console.log(`👑 ${nomeGiocatore} ha disegnato una parte di Exodia: ${card.name}`);
      
      // Check for Exodia win
      if (giocatore.exodiaChecker && giocatore.exodiaChecker.checkWin(giocatore.hand)) {
        console.log(`🎉 ${nomeGiocatore} HA VINTO CON EXODIA!`);
        stato = "TERMINATA";
        inviaATutti({ 
          tipo: "VITTORIA_EXODIA", 
          vincitore: nomeGiocatore,
          exodiaParts: giocatore.hand.cards
            .filter(c => c.type === 'EXODIA')
            .map(c => ({ name: c.name, emoji: c.getEmoji() }))
        });
        return;
      }
      break;
  }

  // Broadcast card play to all players
  inviaATutti({
    tipo: "MESSAGGIO",
    messaggio: effectResult.effetto,
    giocatore: nomeGiocatore,
    carta: card.name
  });

  // Send updated card state to current player
  invia(giocatore.ws, {
    tipo: "AGGIORNA_MANO",
    hand: {
      cards: giocatore.hand.cards.filter(c => c && c.toJSON).map(c => c.toJSON()),
      size: giocatore.hand.cards.length,
      maxSize: giocatore.hand.maxSize
    },
    deck: {
      size: giocatore.deck.getSize(),
      isEmpty: giocatore.deck.isEmpty()
    },
    discard: {
      size: giocatore.discardPile.getSize()
    },
    powerUpUsage: {
      used: giocatore.powerUpManager.usedThisTurn,
      max: giocatore.powerUpManager.maxPerTurn,
      remaining: giocatore.powerUpManager.getRemaining()
    }
  });

  console.log(`✅ Carta giocata: ${nomeGiocatore} -> ${card.name} su ${bersaglio}`);

  // Se la carta era di tipo ATTACK, avanza il turno (come fa attacca() normale)
  if (card.type === 'ATTACK' && stato !== 'TERMINATA') {
    turnoIdx = (turnoIdx + 1) % ordine.length;
    notificaTurno();
    console.log(`🔄 Turno avanzato dopo carta ATTACK di ${nomeGiocatore}`);
  }
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
        
        // Initialize card system for this player
        const deck = createDefaultDeck();
        const hand = new Hand(CARD_CONFIG.maxHandSize);
        const discardPile = new DiscardPile();
        const powerUpManager = new PowerUpManager(CARD_CONFIG.powerUpsPerTurn);
        const exodiaChecker = new ExodiaChecker(CARD_CONFIG.enableExodia);
        
        giocatori.set(nome, {
          ws,
          griglia: creaGrigliaVuota(),
          colpiSubiti: 0,
          eliminato: false,
          flottaPronta: false,
          powerUps: [],
          // Card system
          deck,
          hand,
          discardPile,
          powerUpManager,
          exodiaChecker,
          drewThisTurn: false
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

      case "PLAY_CARD": {
        processaCartaGiocata(mioNome, dati);
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
          
          // Reset card system
          g.deck = createDefaultDeck();
          g.hand = new Hand(CARD_CONFIG.maxHandSize);
          g.discardPile = new DiscardPile();
          g.powerUpManager = new PowerUpManager(CARD_CONFIG.powerUpsPerTurn);
          g.exodiaChecker = new ExodiaChecker(CARD_CONFIG.enableExodia);
          g.drewThisTurn = false;
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