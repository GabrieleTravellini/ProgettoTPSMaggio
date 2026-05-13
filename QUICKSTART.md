# 🚀 QUICK START GUIDE

## ⚡ Avvio Veloce (5 minuti)

### Passo 1: Installa Dipendenze
```powershell
cd c:\xampp\htdocs\BattagliaNav
npm install
```

### Passo 2: Avvia Server
```powershell
node server-ws.js
```

Vedrai:
```
╔════════════════════════════════════════════╗
║  BATTAGLIA NAVALE MOLTIGIOCATORE - SERVER  ║
║  In ascolto su porta 41000                  ║
╚════════════════════════════════════════════╝
```

### Passo 3: Apri Browser
```
http://localhost/BattagliaNav/index.html
```

### Passo 4: Gioca
1. Inserisci nome giocatore
2. Clicca "Entra in Battaglia"
3. Attendi altri giocatori (min 2)
4. Clicca "Pronti a posizionare le navi"
5. Posiziona le 5 navi
6. Clicca "Conferma Flotta"
7. **BATTAGLIA!** 🎮

---

## 🎯 Guida Rapida Gameplay

### Screen: Posizionamento Navi
```
┌─────────────────────────────────────┐
│ 🚢 Posiziona la tua Flotta          │
├─────────────────────────────────────┤
│ [Navi da posizionare]  [Griglia 10x10] │
│                                        │
│ 🚢 Portaerei (5)                     │
│ 🚢 Corazzata (4)                     │
│ 🚢 Incrociatore (3)   Preview: 🟢    │
│ 🚢 Cacciatorpediniere (3)            │
│ 🚢 Sottomarino (2)                   │
│                                        │
│ [Ruota]        [Conferma Flotta]     │
└─────────────────────────────────────┘

🔑 Come:
- Clicca nave per selezionarla
- Hover su griglia = preview verde/rosso
- Clicca griglia = posiziona
- Ruota = cambia orientamento
```

### Screen: Battaglia
```
┌─────────────────────────────────────────┐
│         🎯 È il tuo turno!             │
│  ⬜ Player1  ▶️ Tu  ⬜ Player3        │
├─────────────────────────────────────────┤
│ La tua Flotta    |    Bersaglio: Player1│
│ ┌──────────┐     |    ┌──────────┐      │
│ │🚢🚢🚢    │     |    │ ~~ ~~    │      │
│ │~~~~~~~~~  │     |    │ ~~ XX ~~│      │
│ │ XX ~~~~~  │     |    │ XX ~~~~│      │
│ │ ~~ ~~ ~~  │     |    │ ~~~~~ ~~│      │
│ │ XX ~~ ~~ │     |    │ ~~ ~~ ~~│      │
│ │ ~~ ~~ XX │     |    │ ~~ ~~ ~~│      │
│ └──────────┘     |    └──────────┘      │
│ ✅ Portaerei: 0/5  |   [Cambia Bersaglio]│
│ 🔥 Corazzata: 2/4  |                     │
│ ⚰️ Incrociatore: 3/3│  [Clicca per sparare]│
└─────────────────────────────────────────┘

🔑 Come:
- Sinistra: tua griglia (vedi i tuoi colpi ricevuti)
- Destra: griglia nemica
- Clicca cella nemica per attaccare
- XX = colpito, O = mancato
- Cambia Bersaglio = seleziona altro giocatore
- Leggi status navi per vederle danneggiate
```

### Screen: Turno di Attesa
```
┌─────────────────────────────────────┐
│   🔴 Turno di Player2. Attendi...   │
│  ⬜ Tu  ▶️ Player2  ⬜ Player3      │
├─────────────────────────────────────┤
│ [Vedi la tua griglia - non attacchi] │
│                                      │
│ Testi dei turni precedenti...        │
│ Player1 → Player2: 💥 Colpito!      │
│ Player2 → Player3: 💧 Acqua!        │
└─────────────────────────────────────┘
```

---

## ❌ Troubleshooting

### Server non avvia
```
❌ Error: listen EADDRINUSE :::41000
```
**Soluzione**: Porta già in uso
```powershell
# Trova processo su porta 41000
netstat -ano | findstr :41000

# Termina processo
taskkill /PID <PID> /F

# O cambia porta in server-ws.js: const PORT = 41001;
```

### Browser non si connette
```
❌ WebSocket is closed before the connection is established
```
**Soluzione**: 
1. Verifica server sia avviato
2. Controlla porta corretta (41000)
3. Controlla firewall permette porta
4. Prova da `http://localhost` (non `file://`)

### Freezing durante partita
```
❌ Griglia non risponde ai click
```
**Soluzione**:
1. Apri Console (F12) e controlla errori
2. Ricerca il problema nei log
3. Ricarica pagina (F5)
4. Se persiste, riavvia server

### Giocatore disconnesso
```
❌ Giocatore lascia mid-game
```
**Attuale**: Partita non si ferma, giocatore è "Eliminato"
**Futuro**: Dovrebbe gestirlo meglio

---

## 🎮 Comandi Rapidi (Keyboard Shortcuts)

| Tasto | Azione |
|-------|--------|
| Enter | Conferma (login, posizionamento) |
| Esc | Chiudi modal |
| Click | Posiziona nave / Attacca |
| Hover | Preview nave / Evidenzia cella |

---

## 📊 Statistic Durante Partita

Monitorare da browser console:
```javascript
// Apri Console (F12) e incolla:

// Vedi ordine turni
console.log("Ordine giocatori:", ordineGiocatori);

// Vedi bersaglio attuale
console.log("Bersaglio:", bersaglioAttuale);

// Vedi giocatori eliminati
console.log("Eliminati:", Array.from(giocatoriEliminati));

// Vedi indice turno attuale
console.log("Turno attuale idx:", turnoAttualeIdx);

// Vedi se è il tuo turno
console.log("È mio turno:", isMioTurno);
```

---

## 🎯 Obiettivi Gioco

### Vittoria
✅ Affonda tutte le navi di tutti gli avversari
✅ Mantieni almeno 1 nave intatta
✅ Sei l'ultimo giocatore vivo

### Sconfitta
❌ Tutte le tue navi sono affondate
❌ Sei eliminato
❌ Un altro giocatore affonda tutti

---

## 🔍 Debug Mode

### Attiva logging dettagliato
Nel file `server-ws.js`, aggiungi all'inizio:
```javascript
const DEBUG = true;

function log(msg) {
  if (DEBUG) console.log(`[${new Date().toLocaleTimeString()}] ${msg}`);
}

// Usa: log("Evento accaduto");
```

### Monitora messaggi WebSocket
Nel file `app.js`:
```javascript
function gestisciMessaggio(msg) {
    console.log("📨 Messaggio ricevuto:", msg); // Aggiungi questa riga
    switch (msg.tipo) {
        // ...
    }
}
```

---

## 💾 Backup & Reset

### Backup file importanti
```powershell
# Copia tutto
Copy-Item -Path "c:\xampp\htdocs\BattagliaNav" -Destination "backup_$(Get-Date -Format yyyyMMdd_HHmmss)" -Recurse
```

### Reset a stato iniziale
```powershell
# Elimina cache browser
# Chiudi tutti browser
# Riavvia server
# Ricaricare pagina Ctrl+Shift+R
```

---

## 📱 Multi-Device Testing

### Stesso computer, browser diversi
```
Browser 1: chrome - Player1
Browser 2: firefox - Player2
Browser 3: edge - Player3
```

### Rete locale
```
PC 1 (Server): c:\xampp\htdocs\BattagliaNav
PC 2 (Client): http://[IP_PC1]/BattagliaNav/index.html
PC 3 (Client): http://[IP_PC1]/BattagliaNav/index.html

Trova IP: ipconfig | findstr IPv4
```

---

## 🐛 Report Bug

Quando trovi un bug, allega:
1. **Screenshot** del problema
2. **Passi per riprodurre**
3. **Log console** (F12 → Console)
4. **Log server** (cmd finestra)
5. **Browser + versione**

Esempio:
```
BUG: Griglia nemica non risponde ai click
STEPS: 1. Accedi con Player1
       2. Attendi Player2
       3. È turno Player1
       4. Click su cella → niente accade
BROWSER: Chrome v120
ERROR: WebSocket.send is not a function
```

---

## 📈 Performance Tips

### Riduci latenza
- Abilita hardware acceleration in browser
- Chiudi schede non necessarie
- Server più vicino possibile

### Aumenta stabilità
- Aggiorna browser
- Disabilita estensioni
- Pulisci cache periodicamente

---

## 🎓 Guida Strategica

### Posizionamento Ottimale
✅ **Buono**:
- Navi sparse (difficili da trovare)
- No navi toccantesi (limita danni)
- Mescola orizzontale/verticale

❌ **Cattivo**:
- Navi cluster
- Tutte in un angolo
- Tutte orizzontali/verticali

### Tattica Battaglia
1. **Fase esploratoria**: Sparate a griglia larga
2. **Fase focale**: Quando colpisci, attacca intorno
3. **Fase finale**: Finisci navi danneggiate
4. **Selezione bersaglio**: Muta tra giocatori per confondere

### Uso Power-Up (quando disponibile)
- 📡 **Radar**: Usa quando perso (rivela nave)
- 💥 **Doppio Colpo**: Usa quando hai vantaggio
- 🛡️ **Scudo**: Usa nave importante quando sotto fuoco
- 🔍 **Scansione**: Usa su riga sospetta

---

## 📞 Support

- **Docs**: Leggi README.md e IMPLEMENTATION_GUIDE.md
- **Console**: F12 per errori JavaScript
- **Server Log**: Finestra cmd server
- **Network**: Network tab in DevTools

---

**Goditi la battaglia! ⚔️🚢**
