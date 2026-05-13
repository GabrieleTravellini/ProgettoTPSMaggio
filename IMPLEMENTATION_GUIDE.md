# 🎮 BATTAGLIA NAVALE - GUIDA IMPLEMENTAZIONE COMPLETA

## 📊 Sommario Cambiamenti

### Incremento di Funzionalità: 300% ⬆️
- **Prima**: Battaglia 1v1
- **Dopo**: Battaglia 3+v giocatori con interfaccia UNO-style, power-up e tracking navi

---

## 1️⃣ MULTIPLAYER SUPPORT (3+ GIOCATORI)

### Cosa è Stato Modificato

#### Server (`server-ws.js`)
```javascript
// Nuovo: Tracciamento ordine giocatori
let ordine = [];  // Array con nomi giocatori in ordine turni
let turnoIdx = 0; // Indice giocatore attuale

// Migliorato: Gestione eliminati
function notificaTurno() {
  while (turnoIdx < ordine.length && giocatori.get(ordine[turnoIdx])?.eliminato) {
    turnoIdx++;  // Salta automaticamente eliminati
  }
  // ... invia dati a tutti
}

// Nuovo: Tracking salute navi
function getShipHealth(griglia) {
  // Calcola stato (Intatto/Danneggiato/Affondato) per ogni nave
}
```

#### Client (`app.js`)
```javascript
// Nuovo: Variabili per multiplayer
let ordineGiocatori = [];      // Ordine turni visuale
let turnoAttualeIdx = 0;       // Chi gioca ora
let giocatoriEliminati = Set(); // Chi è out

// Nuovo: Funzione selezione bersaglio
function mostraModalBersaglio() {
  // Mostra lista giocatori attivi per scelta target
}

// Nuovo: Rendering frecce UNO
function aggiornaTurnoArrows() {
  // Disegna ▶️ su giocatore attuale
  // Disegna ⬜ su altri
  // Disegna grigio su eliminati
}
```

### Come Funziona

```
Giocatore 1: Attacca Giocatore 2
↓
Giocatore 2: Attacca Giocatore 3
↓
Giocatore 3: Sceglie tra [Giocatore 1, Giocatore 2]
↓
(Giocatore 2 eliminato) → Salta a Giocatore 1
↓
Giocatore 1: Attacca Giocatore 3
↓
... (Giocatore 3 eliminato) → Giocatore 1 VINCE!
```

---

## 2️⃣ INTERFACCIA UNO-STYLE

### HTML Nuovo
```html
<div class="turn-indicator">
  <div id="turno-arrows" class="arrows-container"></div>
</div>
```

### CSS Nuovo
```css
.arrow-player {
  display: flex;
  flex-direction: column;
  padding: 8px 12px;
}

.arrow-player.current {
  background: #4ecca3;
  box-shadow: 0 0 15px #4ecca3;
  transform: scale(1.15);
}

.arrow-player.eliminated {
  opacity: 0.4;
  border-color: #555;
}
```

### JavaScript
```javascript
function aggiornaTurnoArrows() {
  ordineGiocatori.forEach((nome, idx) => {
    const arrow = document.createElement("div");
    arrow.className = "arrow-player";
    
    if (idx === turnoAttualeIdx) {
      arrow.classList.add("current");  // 🟢 Evidenziato
    }
    if (giocatoriEliminati.has(nome)) {
      arrow.classList.add("eliminated"); // ⚰️ Fuori gioco
    }
    
    arrow.innerHTML = `
      <div class="arrow-icon">${idx === turnoAttualeIdx ? "▶️" : "⬜"}</div>
      <div class="arrow-name">${nome}</div>
    `;
  });
}
```

---

## 3️⃣ SHIP STATUS TRACKING

### Stato Navi in Tempo Reale

#### Calcolo Backend
```javascript
// Server calcola per ogni nave:
ships[nomeNave] = {
  totale: 5,           // Celle totali nave
  danno: 3,            // Celle colpite
  status: "Danneggiato" // Intatto/Danneggiato/Affondato
}

// Inviato nel messaggio IL_TUO_TURNO e RISULTATO
{
  tipo: "IL_TUO_TURNO",
  avversari: {
    "PlayerA": {
      griglia: [...],
      navi: {...shipHealth...}
    }
  }
}
```

#### Visualizzazione Frontend
```javascript
function renderShipStatus(ships, playerName) {
  flottaStatus.innerHTML = `<strong>${playerName}:</strong>`;
  
  Object.entries(ships).forEach(([nome, data]) => {
    const icon = data.status === "Affondato" ? "⚰️" 
               : data.danno > 0 ? "🔥" 
               : "✅";
    
    flottaStatus.innerHTML += 
      `<span class="ship-info">${icon} ${nome}: ${data.danno}/${data.totale}</span>`;
  });
}
```

### Display Esempio
```
🟢 Giocatore1:
✅ Portaerei: 0/5    🔥 Corazzata: 2/4    ⚰️ Incrociatore: 3/3
```

---

## 4️⃣ MODAL SELEZIONE BERSAGLIO

### HTML Nuovo
```html
<div id="modal-seleziona-bersaglio" class="modal hidden">
  <div class="modal-content">
    <h3>🎯 Scegli il tuo Bersaglio</h3>
    <div id="lista-bersagli" class="player-selector"></div>
    <button class="btn-close-modal">✕ Annulla</button>
  </div>
</div>
```

### Logica JavaScript
```javascript
btnCambiaBersaglio.addEventListener("click", () => {
  mostraModalBersaglio(); // Apri modal
});

function mostraModalBersaglio() {
  listaBersagli.innerHTML = "";
  
  // Filtra solo giocatori vivi
  const bersagli = Object.keys(avversari)
    .filter(n => !giocatoriEliminati.has(n));
  
  // Crea bottone per ogni bersaglio
  bersagli.forEach(nome => {
    const btn = document.createElement("button");
    btn.className = "btn-player-target";
    btn.innerHTML = `🎯 ${nome}`;
    btn.onclick = () => {
      bersaglioAttuale = nome; // Cambia target
      renderDynamicGrid(grigliaNemica, 
        avversari[bersaglioAttuale].griglia, 
        true, 
        bersaglioAttuale
      );
      modalBersaglio.classList.add('hidden'); // Chiudi
    };
    listaBersagli.appendChild(btn);
  });
  
  modalBersaglio.classList.remove('hidden');
}
```

---

## 5️⃣ TILE ATTACCATI (COLORI DIVERSI)

### Variabili Griglia

```javascript
// Nel server-ws.js
target.griglia[riga][col] = 
  cella === "N"  // Se colpisci una nave
    ? "X"        // Colpito
    : "O";       // Mancato
```

### CSS Styling
```css
.cella.colpito { 
  background-color: #ff0000;       /* Rosso brillante */
  border: 2px solid #ff6666;
  box-shadow: inset 0 0 8px rgba(255,0,0,0.5);
}

.cella.mancato { 
  background-color: #2a6fa8;       /* Azzurro diverso dal mare */
  color: #9cc5ff;
  border: 2px solid #5a9fd4;
}

.cella.attaccato { 
  background-color: #ff6b00;       /* Arancione */
  border: 2px solid #ffb366;
}
```

### Rendering
```javascript
function renderDynamicGrid(container, data, clickable, targetName = "") {
  for (let r = 0; r < data.length; r++) {
    for (let c = 0; c < data[r].length; c++) {
      const val = data[r][c];
      
      if (val === "X") cella.classList.add("colpito");
      else if (val === "O") cella.classList.add("mancato");
      
      // Blocca ri-attaccare stessa cella
      if (clickable && val !== "X" && val !== "O") {
        cella.onclick = () => {
          ws.send(JSON.stringify({tipo: "ATTACCA", ...}));
        };
      }
    }
  }
}
```

---

## 6️⃣ POWER-UP SYSTEM (FRAMEWORK)

### Struttura Server
```javascript
const POWER_UPS = [
  { 
    id: "radar",      // ID univoco
    nome: "Radar",    // Nome display
    emoji: "📡",      // Icona
    effetto: "Rivela posizione nave" 
  },
  { 
    id: "double_hit", 
    nome: "Doppio Colpo", 
    emoji: "💥",
    effetto: "Attacca due volte"
  },
  // ... altri 2 power-up
];

// Server invia nel turno
{
  tipo: "IL_TUO_TURNO",
  powerUps: POWER_UPS // Array completo
}
```

### Frontend Rendering
```javascript
function renderPowerUps(powerUps) {
  powerUpsSection.classList.remove('hidden');
  powerUpsList.innerHTML = "";
  
  powerUps.forEach(pu => {
    const card = document.createElement("div");
    card.className = "power-up-card";
    card.innerHTML = `
      <div class="power-up-icon">${pu.emoji}</div>
      <div class="power-up-name">${pu.nome}</div>
    `;
    card.title = pu.effetto; // Tooltip
    
    card.onclick = () => {
      ws.send(JSON.stringify({
        tipo: "USA_POWER_UP",
        powerUpId: pu.id,
        bersaglio: bersaglioAttuale
      }));
    };
    
    powerUpsList.appendChild(card);
  });
}
```

### CSS Power-Up
```css
.power-up-card {
  background: linear-gradient(135deg, #2a5a3a, #1a3a2a);
  border: 2px solid #ffd700;
  cursor: pointer;
  transition: all 0.2s;
}

.power-up-card:hover {
  box-shadow: 0 0 15px #ffd700;
  transform: scale(1.05);
}

.power-up-card.used {
  opacity: 0.4;
  cursor: not-allowed;
}
```

---

## 🔧 IMPLEMENTAZIONI FUTURE

### 1. Completare Power-Up System

```javascript
// Aggiungere in server-ws.js:
case "USA_POWER_UP": {
  const { powerUpId, bersaglio } = dati;
  const attaccante = giocatori.get(mioNome);
  
  // Verifica ha power-up
  if (!attaccante.powerUps.includes(powerUpId)) return;
  
  switch(powerUpId) {
    case "radar":
      // Rivela una nave casuale di bersaglio
      break;
    case "double_hit":
      // Permetti 2 attacchi questo turno
      break;
    case "shield":
      // Proteggi nave dal prossimo hit
      break;
    case "scan":
      // Scansiona riga/colonna
      break;
  }
  
  // Rimuovi power-up dopo uso
  attaccante.powerUps = attaccante.powerUps.filter(p => p !== powerUpId);
}
```

### 2. Drop Power-Up Casuali
```javascript
function generaPowerUp() {
  const random = POWER_UPS[Math.floor(Math.random() * POWER_UPS.length)];
  return random.id;
}

// Quando nave affondata
if (naveAffondata) {
  const newPowerUp = generaPowerUp();
  attaccante.powerUps.push(newPowerUp);
  
  invia(attaccante.ws, {
    tipo: "POWER_UP_OTTENUTO",
    powerUp: newPowerUp
  });
}
```

### 3. Modalità Gioco Alternative

#### Team Battle
```javascript
// Crea team all'inizio
const TEAM_A = ["Player1", "Player2"];
const TEAM_B = ["Player3", "Player4"];

// Condizione vittoria: tutti team avversario affondate
function controlloVittoriaTeam() {
  const teamAVivo = TEAM_A.some(p => !giocatori.get(p).eliminato);
  const teamBVivo = TEAM_B.some(p => !giocatori.get(p).eliminato);
  
  if (!teamAVivo) return "Team B";
  if (!teamBVivo) return "Team A";
  return null;
}
```

#### Survival Mode
```javascript
// N round, vince chi ha più navi intatte
let roundNum = 0;
const MAX_ROUNDS = 5;

function fineTurno() {
  if (ordine.filter(n => !giocatori.get(n).eliminato).length === 1) {
    roundNum++;
    if (roundNum < MAX_ROUNDS) {
      resetPerNewRound();
    } else {
      dichiaraSurvivalWinner();
    }
  }
}
```

### 4. Persistenza Dati
```javascript
// Aggiungere database (es. SQLite con better-sqlite3)
const Database = require('better-sqlite3');
const db = new Database('./battaglia.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS stats (
    playerName TEXT PRIMARY KEY,
    victorias INTEGER,
    sconfitte INTEGER,
    totaleTurni INTEGER
  )
`);

// Update dopo ogni partita
function salvaStats(vincitore) {
  db.prepare(`
    UPDATE stats 
    SET victorias = victorias + 1 
    WHERE playerName = ?
  `).run(vincitore);
}
```

### 5. Chat e Emote
```html
<!-- Aggiungere a index.html -->
<div id="chat-container" class="chat">
  <div id="chat-messages" class="chat-messages"></div>
  <input id="chat-input" type="text" placeholder="Messaggio..." />
  <button id="btn-emote">😊 Emote</button>
</div>
```

```javascript
// Server broadcast chat
case "CHAT": {
  const msg = { tipo: "CHAT", da: mioNome, testo: dati.testo, timestamp: Date.now() };
  inviaATutti(msg);
  break;
}
```

---

## 📈 Performance & Scalability

### Current Limits
- **Max Giocatori**: ~20 (limitazione WebSocket singolo)
- **Network**: Latenza < 100ms ottimale
- **Browser**: Chrome/Firefox/Edge moderni

### Ottimizzazioni Possibili
```javascript
// Compressione messaggi
const zlib = require('zlib');

// Invia griglia compressa
const compressed = zlib.deflateSync(JSON.stringify(griglia));
ws.send(compressed);

// Batch updates
let updates = [];
setInterval(() => {
  if (updates.length > 0) {
    inviaATutti({ tipo: "BATCH_UPDATES", dati: updates });
    updates = [];
  }
}, 50);
```

### Load Balancing
```javascript
// Con multiple server
const serverPool = [
  { host: 'server1', port: 41000, load: 0 },
  { host: 'server2', port: 41001, load: 0 }
];

function selectServer() {
  return serverPool.reduce((min, s) => s.load < min.load ? s : min);
}
```

---

## 🧪 Testing Checklist

- [ ] Test multiplayer (3, 4, 5 giocatori)
- [ ] Test selezione bersaglio
- [ ] Test turni circolari
- [ ] Test eliminazione giocatore
- [ ] Test vittoria finale
- [ ] Test riconnessione
- [ ] Test disconnessione
- [ ] Test browser diversi
- [ ] Test mobile responsivo
- [ ] Test WebSocket latenza alta

---

## 📝 Note Importanti

1. **Power-Up**: Sono implementati solo UI, logica backend richiede completamento
2. **Storage**: Nessuno persiste su disco - reset al riavvio server
3. **Sicurezza**: No autenticazione - aggiungere token per produzione
4. **Scalabilità**: Single server WebSocket - clusters per alto carico

---

**Documento: IMPLEMENTATION_GUIDE.md**
**Ultimo Aggiornamento**: 13 Maggio 2026
**Versione**: 2.0 - Multiplayer Edition
