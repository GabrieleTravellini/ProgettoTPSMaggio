# 🎮 BATTAGLIA NAVALE v2.0 - VISUAL DIAGRAMS

## Game State Machine

```
┌─────────────────────────────────────────────────────────┐
│                      BATTAGLIA NAVALE                   │
│                   State Machine Diagram                 │
└─────────────────────────────────────────────────────────┘

    ┌──────────────┐
    │   ATTESA     │ ← Server started, waiting for players
    └──────┬───────┘
           │ Min 2 players + PRONTO button
           ▼
    ┌──────────────────────┐
    │ POSIZIONAMENTO       │ ← Each player places ships
    └──────┬───────────────┘
           │ All players confirm
           ▼
    ┌──────────────────────┐
    │ IN_CORSO (BATTAGLIA) │ ← Game active, turns happening
    └──────┬───────────────┘
           │ Last player standing
           ▼
    ┌──────────────────────┐
    │   TERMINATA          │ ← Game over, winner announced
    └──────┬───────────────┘
           │ RICOMINCIA
           └─→ POSIZIONAMENTO (repeat)
```

---

## Player Turn Rotation (3+ Players)

```
┌─────────────────────────────────────────────────────────┐
│            Turn Rotation with Elimination              │
└─────────────────────────────────────────────────────────┘

ROUND 1:
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│  Player A   │  →   │  Player B   │  →   │  Player C   │
│  (Attacks)  │      │  (Waiting)  │      │  (Waiting)  │
└─────────────┘      └─────────────┘      └─────────────┘
                                                    ↓
                                            (Attacks next)
ROUND 2:
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│  Player A   │  ←   │  Player B   │  ←   │  Player C   │
│  (Waiting)  │      │  (Attacks)  │      │  (Attacks)  │
└─────────────┘      └─────────────┘      └─────────────┘

ROUND 3 (Player B gets sunk):
┌─────────────┐      ┌──────────────────┐  ┌─────────────┐
│  Player A   │  →   │  Player B ⚰️     │→ │  Player C   │
│  (Attacks)  │      │  (ELIMINATED)    │  │  (Waiting)  │
└─────────────┘      └──────────────────┘  └─────────────┘
                        ↓ (SKIPPED)

ROUND 4:
┌─────────────┐                             ┌─────────────┐
│  Player A   │  ←──────────────────────→   │  Player C   │
│  (Waiting)  │                             │  (Attacks)  │
└─────────────┘                             └─────────────┘
     ↑                                              ↓
     └──────────────────────────────────────────────┘
            (Battle continues 1v1)

WINNER: Last player alive!
```

---

## Message Flow (Single Attack Cycle)

```
┌─────────────────────────────────────────────────────────┐
│          WebSocket Message Flow: Attack                │
└─────────────────────────────────────────────────────────┘

CLIENT (Player A)          SERVER              CLIENT (Player B)
    │                         │                      │
    │ CLICK CELL              │                      │
    ├─────────────────────────►                      │
    │                    PROCESS:                    │
    │                    - Validate cell            │
    │                    - Check grid               │
    │                    - Calculate hit/miss       │
    │                    - Update state            │
    │                    - Check if sunk           │
    │                    - Check if eliminated     │
    │                         │                      │
    │                    SEND: "RISULTATO"          │
    │                         │──────────────────────►
    │                         │                  UPDATE:
    │                         │              - Griglia loro
    │                         │              - Navi salute
    │                         │              - Status
    │                         │
    │  RECEIVE: "RISULTATO"   │
    │◄─────────────────────────                     │
    │  Vedi il tuo feedback   │
    │
    │                    SEND: "IL_TUO_TURNO"      │
    │                    (Next player in rotation) │
    │                         │───────────────────────► TOCCA A TE!
    │                         │
    │                    SEND: "ATTENDI"           │
    ├─────────────────────────────────────────────────►│ ASPETTA
    │                         │                      │
    └─────────────────────────────────────────────────┘
```

---

## UNO-Style Turn Indicator

```
┌──────────────────────────────────────────────┐
│          Arrow Turn Display                 │
└──────────────────────────────────────────────┘

SCENARIO: 4 Players, Player 2's turn

┌─────┐   ┌──────┐   ┌─────┐   ┌──────┐
│ ⬜  │   │  ▶️  │   │ ⬜  │   │ ⚰️  │
│  P1 │   │  P2  │   │ P3  │   │  P4  │
└─────┘   └──────┘   └─────┘   └──────┘
  normal   CURRENT    normal   eliminated
   (⬜)    (🟢/▶️)     (⬜)      (⚰️/gray)

COLOR CODES:
- 🟢 GREEN: Current player turn
- ⬜ WHITE: Waiting (not current)
- ⚰️ GRAY: Eliminated (out of game)

ANIMATION:
- Pulse effect on CURRENT
- Fade effect on ELIMINATED
- Smooth transition between turns
```

---

## Ship Health Display

```
┌──────────────────────────────────────────────┐
│      Ship Status Visualization              │
└──────────────────────────────────────────────┘

INTACT SHIP:
┌────────────────────────┐
│ ✅ Portaerei: 0/5     │ Green, no damage
└────────────────────────┘

DAMAGED SHIP:
┌────────────────────────┐
│ 🔥 Corazzata: 2/4     │ Orange, partial damage
└────────────────────────┘

SUNK SHIP:
┌────────────────────────┐
│ ⚰️ Incrociatore: 3/3  │ Red, fully damaged
└────────────────────────┘

FLEET STATUS BAR (Multi-ship):
┌─────────────────────────────────────────────┐
│ ✅ Portaerei: 0/5  🔥 Corazzata: 2/4       │
│ ⚰️ Incrociatore: 3/3  ✅ Cacciatorpedine: 0/3│
│ ✅ Sottomarino: 0/2                         │
└─────────────────────────────────────────────┘

STATUS COLORS:
- ✅ GREEN (0 damage):     Intatto
- 🔥 ORANGE (1-2 damage):  Danneggiato  
- ⚰️ RED (3+ damage):       Affondato
```

---

## Target Selection Modal

```
┌────────────────────────────────────────────────────┐
│         Target Selection Modal (Multiplayer)      │
└────────────────────────────────────────────────────┘

        ╔═════════════════════════════════════╗
        ║  🎯 Scegli il tuo Bersaglio       ║
        ╠═════════════════════════════════════╣
        ║                                     ║
        ║   ┌─────────┐   ┌─────────┐       ║
        ║   │ 🎯 P1   │   │ 🎯 P3   │       ║
        ║   └─────────┘   └─────────┘       ║
        ║                                     ║
        ║   ┌─────────────────────────┐      ║
        ║   │   (P2 è eliminato)      │      ║
        ║   └─────────────────────────┘      ║
        ║                                     ║
        ║   ┌─────────────────────────┐      ║
        ║   │  ✕ Annulla (ESC)        │      ║
        ║   └─────────────────────────┘      ║
        ║                                     ║
        ╚═════════════════════════════════════╝

BUTTON BEHAVIOR:
- Click P1: Seleziona P1 come bersaglio
- Click P3: Seleziona P3 come bersaglio
- Click Annulla: Chiudi modal, mantieni vecchio target
- Click Outside: Chiudi modal (ESC key)
```

---

## Power-Up System (Framework)

```
┌────────────────────────────────────────────────────┐
│         Power-Up Cards Display                    │
└────────────────────────────────────────────────────┘

⚡ POWER-UPS DISPONIBILI:

┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
│   📡     │  │   💥     │  │   🛡️     │  │   🔍     │
│ Radar    │  │Double Hit│  │ Shield   │  │ Scan     │
│          │  │          │  │          │  │          │
│Reveal    │  │Attack 2x │  │Protect   │  │Scan row  │
│Position  │  │in turn   │  │ship      │  │/column   │
└──────────┘  └──────────┘  └──────────┘  └──────────┘

USED POWER-UP (Grayed out):
┌──────────┐
│   📡     │
│ Radar    │ ← Opaque, disabled
│ (USED)   │
└──────────┘

HOVER EFFECTS:
- Glow: #ffd700 (gold border)
- Scale: 1.05x enlargement  
- Shadow: 0 0 15px gold
```

---

## Grid Cell States

```
┌────────────────────────────────────────────────────┐
│        Grid Cell Visual States                    │
└────────────────────────────────────────────────────┘

1. WATER (Empty):
┌────┐
│ ~~ │ Light blue (#1a4b8c)
└────┘ Hoverable, clickable

2. SHIP (Positioning):
┌────┐
│ 🚢 │ Purple (#533483) with glow
└────┘ Not yet attacked

3. HIT (Colpito):
┌────┐
│ 💥 │ Red (#ff0000)
└────┘ X in center, no re-attack

4. MISS (Mancato):
┌────┐
│ 💧 │ Light blue (#2a6fa8) - different from water
└────┘ O in center, no re-attack

5. PREVIEW - VALID:
┌────┐
│    │ Green (#4ecca3) semi-transparent
└────┘ Ship can be placed here

6. PREVIEW - INVALID:
┌────┐
│    │ Red (#ff4444) semi-transparent
└────┘ Ship cannot be placed (conflict)

STYLING:
- Border: 1-2px colored border
- Shadow: Inset shadow for depth
- Transition: 0.2s smooth color change
```

---

## Layout Overview

```
┌────────────────────────────────────────────────────────────┐
│              MAIN GAME SCREEN LAYOUT                      │
└────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ Header: Tu: [Nome Giocatore]  |  ▶️ P1 ⬜ P2 ⚰️ P3     │
├──────────────────────────────────────────────────────────┤
│                                                          │
│ ⚡ Power-ups: [📡][💥][🛡️][🔍]                         │
│                                                          │
│ Status: ✅ P1:0/5  🔥 P2:2/4  ⚰️ P3:3/3               │
│                                                          │
├────────────────────────────────────────────────────────┬─┤
│                                                        │ │
│  🔵 La tua Flotta      │    🔴 Bersaglio: P2       │ │
│  ┌──────────────────┐  │    ┌──────────────────┐   │ │
│  │ ~ ~ 🚢 ~ ~ ~ ~ │  │    │ ~ ~ ~ ~ XX ~ ~ │   │ │
│  │ ~ ~ ~ ~ ~ ~ ~  │  │    │ XX ~ ~ O ~ ~ ~ │   │ │
│  │ X ~ ~ 🚢 ~ ~ ~  │  │    │ ~ XX ~ ~ ~ ~ ~ │   │ │
│  │ ~ ~ ~ ~ ~ ~ ~  │  │    │ ~ ~ ~ ~ ~ ~ ~ │   │ │
│  │ 🚢 ~ X ~ ~ ~ ~  │  │    │ ~ ~ ~ ~ ~ ~ ~ │   │ │
│  │ ~ X ~ ~ ~ ~ ~  │  │    │ ~ ~ O ~ ~ ~ ~ │   │ │
│  │ X ~ ~ ~ X ~ ~  │  │    │ ~ ~ ~ ~ ~ ~ ~ │   │ │
│  │ ~ ~ ~ ~ ~ ~ ~  │  │    │ ~ ~ ~ ~ ~ ~ ~ │   │ │
│  │ ~ ~ ~ 🚢 ~ ~ ~  │  │    │ ~ ~ X ~ ~ ~ ~ │   │ │
│  │ ~ ~ ~ ~ ~ ~ ~  │  │    │ ~ ~ ~ ~ ~ ~ ~ │   │ │
│  └──────────────────┘  │    └──────────────────┘   │ │
│  ✅ P0: 0/5            │    [Cambia Bersaglio]    │ │
│  🔥 P1: 2/4            │                          │ │
│  ⚰️ P2: 3/3            │    [CLICK TO ATTACK]     │ │
│  ✅ P3: 1/2            │                          │ │
│                        │                          │ │
└────────────────────────────────────────────────────┴─┘
```

---

## Multiplayer Turnover Timeline

```
┌────────────────────────────────────────────────────────────┐
│          Battle Timeline (Multi-Player)                   │
└────────────────────────────────────────────────────────────┘

TIME    PLAYER           ACTION                    STATE
────────────────────────────────────────────────────────────
0s      P1 👈 TURN       Choose target: P2
5s      P1 👈 TURN       Click cell (3,4)
6s      P2 ← HIT         See: 💥 COLPITO!        (Navi: 2/5)
6s      P2 ← HIT         Griglia updates
7s      P3 👈 TURN       "Prossimo: P3"
7s      P3 👈 TURN       Choose target: P1
10s     P3 👈 TURN       Click cell (1,1)
11s     P1 ← MISS        See: 💧 ACQUA!
11s     P1 ← MISS        Griglia updates
12s     P2 👈 TURN       "Prossimo: P2"
12s     P2 👈 TURN       Choose target: P3
15s     P2 👈 TURN       Click cell (5,5)
16s     P3 ← HIT         See: 💥 COLPITO!        (Navi: 1/5)
16s     P3 ← HIT         Griglia updates
17s     --- CYCLING ---
        P1 👈 TURN
        P3 👈 TURN
        P2 👈 TURN
        (Pattern repeats)
        
[SCENARIO] P2 sunk all P3 ships
...
60s     --- FINAL ROUND ---
        P1 vs P2 (P3 eliminated)
        
80s     P1 🏆 WINS       "Player1 VINCE!"
```

---

## Data Structure (Server-Side)

```
┌────────────────────────────────────────────────────────────┐
│         Server Data Structure (In Memory)                 │
└────────────────────────────────────────────────────────────┘

giocatori: Map {
  "Player1" => {
    ws: WebSocket,                    // Connection
    griglia: [                        // 10x10 grid
      ["~","N","~",...],              // Row 0
      ["~","N","~",...],              // Row 1
      ["X","~","~",...],              // Row 2 (X=hit)
      ...
    ],
    colpiSubiti: 3,                   // Total hits taken
    eliminato: false,                 // Still alive?
    flottaPronta: true,               // Confirmed ships?
    powerUps: ["radar","double_hit"], // Available power-ups
  },
  "Player2" => {...},
  "Player3" => {...},
}

ordine: ["Player1", "Player2", "Player3"]  // Turn order

turnoIdx: 1  // Currently: Player2's turn

stato: "IN_CORSO"  // Game state

NAVI_CONFIG:
[
  {nome:"Portaerei", lunghezza:5},
  {nome:"Corazzata", lunghezza:4},
  {nome:"Incrociatore", lunghezza:3},
  {nome:"Cacciatorpediniere", lunghezza:3},
  {nome:"Sottomarino", lunghezza:2}
]
```

---

## Data Structure (Client-Side)

```
┌────────────────────────────────────────────────────────────┐
│         Client Data Structure (Browser Memory)            │
└────────────────────────────────────────────────────────────┘

// Player info
mioNome: "Player1"
isMioTurno: false
DIM: 10

// Turn management
ordineGiocatori: ["Player1", "Player2", "Player3"]
turnoAttualeIdx: 1  // Player2's turn
giocatoriEliminati: Set{"Player3"}

// Target management
bersaglioAttuale: "Player2"
avversari: {
  "Player2": {
    griglia: [["~","X",...],...]  // Obscured grid
    navi: {
      "Portaerei": {danno:1, totale:5, status:"Danneggiato"},
      "Corazzata": {danno:0, totale:4, status:"Intatto"},
      ...
    }
  },
  "Player3": {...}
}

// Own fleet
grigliaPosData: [["N","N",...],...]  // Full grid, only for me
naviDaPosizionare: [
  {nome:"Portaerei", lunghezza:5},
  ...
]
naveSelezionataIdx: 0
orientamento: "H"  // Horizontal
```

---

**End of Visual Diagrams**

*Use these diagrams to understand the system architecture, data flow, and visual layouts of Battaglia Navale v2.0*
