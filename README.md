# ⚔️ Battaglia Navale - Multiplayer Edition

Un'esperienza di gioco di battaglia navale completamente rinnovata con supporto multiplayer avanzato, grafica moderna in stile UNO e nuove meccaniche di gioco!

## 🎮 Nuove Caratteristiche

### ✨ Multiplayer Avanzato (3+ Giocatori)
- **Supporto per più di 2 giocatori**: Gioca con 3, 4, 5 o più avversari contemporaneamente
- **Selezione dinamica del bersaglio**: Scegli chi attaccare a ogni turno con il modal di selezione
- **Sistema di turni circolari**: I turni passano automaticamente al prossimo giocatore non eliminato
- **Tracking giocatori eliminati**: Vedi chi è ancora in gioco grazie agli indicatori visivi

### 🎯 Interfaccia UNO-Style
- **Indicatore di turno con frecce**: Visualizza l'ordine dei giocatori con evidenziamento del turno attuale
- **Design moderno e intuitivo**: Layout responsive con colori vibranti e feedback visivi immediati
- **Navigazione fluida**: Transizioni smooth tra le schermate di gioco

### 🚢 Status Navi Avanzato
- **Visualizzazione salute navi**: Vedi quanti colpi ha ricevuto ogni nave (nemiche e tue)
- **Stato navi in tempo reale**: 
  - ✅ **Intatte** (nessun danno)
  - 🔥 **Danneggiate** (colpite parzialmente)
  - ⚰️ **Affondate** (distrutte)
- **Barra di stato flotta**: Monitoraggio veloce della salute della tua flotta

### ⚡ Sistema Power-Up (Pronto per l'Integrazione)
- **Radar 📡**: Rivela la posizione di una nave nemica
- **Doppio Colpo 💥**: Attacca due volte nel tuo turno
- **Scudo 🛡️**: Proteggi una nave dal prossimo attacco
- **Scansione 🔍**: Scansiona una riga/colonna intera per rilevare navi

*I power-up sono pronti per essere completamente integrati nel gameplay*

### 🎨 Grafica Migliorata
- **Nuovi colori e stilizzazione**:
  - 🌊 Acqua: Azzurro intenso con bordi sfumati
  - 🚢 Navi: Viola profondo con bordo luminoso
  - 💥 Colpito: Rosso brillante con effetto ombra
  - 💧 Mancato: Azzurro diverso dal mare
  
- **Animazioni fluide**:
  - Hit shake quando colpisci una nave
  - Boom effect quando affondi una nave
  - Flash warning quando vieni colpito
  
- **Effetti visivi**:
  - Hover scuro sulle celle attaccabili
  - Border highlights sulle navi
  - Transizioni colore smooth

### 🎲 Tile Attaccati (Visivamente Distinti)
- Le celle già attaccate (colpite/mancate) hanno colori e bordi distintivi
- Impossibile attaccare la stessa cella due volte
- Visual feedback immediato sul risultato dell'attacco

## 🛠️ Architettura Tecnica

### Server-Side (Node.js WebSocket)
```
server-ws.js
├── NAVI_CONFIG: 5 navi di varie lunghezze
├── POWER_UPS: Sistema di potenziamenti
├── Funzioni Principali:
│   ├── validaPosizionamento(): Controlla validità del posizionamento
│   ├── getShipHealth(): Calcola stato di salute navi in tempo reale
│   ├── inizia(): Avvia la partita
│   ├── notificaTurno(): Gestisce rotazione turni
│   ├── attacca(): Elabora attacchi e determina risultati
│   └── trovaNaveAffondata(): Rileva navi completamente affondate
└── WebSocket Events: UNISCITI, PRONTO, POSIZIONA_NAVE, ATTACCA, USA_POWER_UP
```

### Client-Side (JavaScript Vanilla)
```
app.js
├── Stato Globale:
│   ├── ordineGiocatori: Array dei giocatori in turno
│   ├── giocatoriEliminati: Set di giocatori fuori dal gioco
│   ├── avversari: Dati delle griglie nemiche
│   └── bersaglioAttuale: Giocatore target
├── Rendering:
│   ├── renderDynamicGrid(): Disegna le griglie 10x10
│   ├── renderShipStatus(): Mostra salute navi
│   ├── aggiornaTurnoArrows(): Disegna indicatori turno UNO-style
│   ├── renderPowerUps(): Visualizza power-up disponibili
│   └── renderNaviList(): Mostra navi da posizionare
├── Logica Gioco:
│   ├── gestisciMessaggio(): Router messaggi WebSocket
│   ├── mostraModalBersaglio(): Selezione target multiplayer
│   └── applicaAnimazione(): Effetti hit/sink
└── Event Listeners: Click, Input, WebSocket
```

## 📋 Flusso di Gioco

### 1️⃣ **Lobby (ATTESA)**
```
Giocatore entra → Nome confermato → Lista giocatori aggiornata
Quando 2+ giocatori pronti → PRONTO → POSIZIONAMENTO
```

### 2️⃣ **Posizionamento Navi (POSIZIONAMENTO)**
```
Ogni giocatore:
- Sceglie una nave dalla lista
- Ruota tra orizzontale/verticale
- Preview verde=valido, rosso=invalido
- Conferma posizionamento
Quando tutti confermano → INIZIO PARTITA
```

### 3️⃣ **Battaglia (IN_CORSO)**
```
Per ogni turno:
1. Giocatore attuale:
   - Sceglie bersaglio dal modal
   - Vede griglia nemica oscurata
   - Clicca una cella per attaccare
   - Riceve feedback: COLPITO/MANCATO/AFFONDATA
   
2. Giocatori in attesa:
   - Vedono il loro turno nei frecce UNO
   - Vedono gli attacchi ricevuti sulla loro griglia
   - Ricevono notifiche hit/damage
   
3. Logica Rotazione:
   - Salta giocatori eliminati automaticamente
   - Passa al prossimo vivo quando giro completa
   
4. Condizione Vittoria:
   - Ultimo giocatore rimasto = VINCITORE
```

### 4️⃣ **Fine Partita (TERMINATA)**
```
Vincitore annunciato ✨
Opzione ricomincia disponibile
```

## 🚀 Come Avviare

### Prerequisiti
- Node.js installato
- npm installato
- Porta 41000 disponibile

### Installazione e Avvio
```bash
cd c:\xampp\htdocs\BattagliaNav

# Installa dipendenze
npm install

# Avvia server
node server-ws.js

# Apri browser su http://localhost (se XAMPP è attivo)
# O accedi da: http://tuoip:80/BattagliaNav/index.html
```

## 📦 Struttura File

```
BattagliaNav/
├── AVVIA_SERVER.bat          # Batch per avviare server
├── index.html                # Frontend principale
├── package.json              # Dipendenze npm
├── server-ws.js              # Server WebSocket Node.js (AGGIORNATO)
├── css/
│   └── style.css             # Stili (COMPLETAMENTE RINNOVATO)
├── js/
│   └── app.js                # Logica client (RISCRITTO)
└── README.md                 # Questa documentazione
```

## 🎯 Prossimi Sviluppi Possibili

### Power-Up Completo
- [ ] Implementare logica backend dei power-up
- [ ] Animazioni quando usi power-up
- [ ] Limite uses per power-up
- [ ] Drop casuali durante il gioco

### Modalità di Gioco
- [ ] Team Battle: 2v2, 3v3, ecc.
- [ ] Battle Royale: Ultimi vivi
- [ ] Time Attack: Vinci in 5 minuti
- [ ] Survival: Più di 5 round

### Personalizazioni
- [ ] Custom griglia 8x8 o 12x12
- [ ] Custom navi (lunghezze diverse)
- [ ] Temi colore (dark, light, ocean)
- [ ] Profili giocatori e statistiche

### Chat e Social
- [ ] Chat in-game
- [ ] Emote/Reazioni
- [ ] Leaderboard globale
- [ ] Replay delle partite

## 🐛 Bug Known & Limitazioni

### Risolti
- ✅ Multiplayer >2 giocatori
- ✅ Selezione dinamica bersaglio
- ✅ Indicatori turno visivi

### Da Testare
- ⚠️ Disconnessioni durante il gioco
- ⚠️ Network latency alto
- ⚠️ Browser su mobile

### Limitazioni Attuali
- Max ~20 giocatori contemporanei (limitazione WebSocket)
- Power-up solo UI, non funzionanti
- No persistenza dati (restart = reset)

## 📞 Support & Feedback

Per segnalare bug o suggerimenti:
- Controlla la console browser (F12)
- Verifica i log del server (cmd)
- Testa su browser diversi

## 🎓 Concetti Implementati

- **WebSocket**: Real-time comunicazione server-client
- **State Management**: Tracciamento stato gioco lato server e client
- **Event-Driven Architecture**: Logica basata su messaggi
- **Responsive Design**: Adattamento a schermi diversi
- **UX/UI**: Feedback visivi e modal user-friendly
- **Data Validation**: Controllo validità mosse lato server

## 📝 Licenza

Questo progetto è libre! Usa e modifica come vuoi.

---

**Buon Divertimento! ⚔️🚢** 

*Battaglia Navale Moltigiocatore - Made with ❤️*
