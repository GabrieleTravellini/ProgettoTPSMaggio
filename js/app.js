const WS_URL = `ws://${window.location.hostname}:41000`;
let ws = null;
let mioNome = "";
let isMioTurno = false;
let bersaglioAttuale = "";
let DIM = 10;
let ordineGiocatori = [];
let turnoAttualeIdx = 0;
let giocatoriEliminati = new Set();

// Card System Variables
let miaHand = null;
let miaExodiaChecker = null;
let mazzoSize = 0;
let scartiSize = 0;
let powerUpUsage = { used: 0, max: 2, remaining: 2 };
let exodiaProgress = { current: 0, total: 5, percentage: 0 };

// DOM Elements
const screens = {
  login: document.getElementById('screen-login'),
  lobby: document.getElementById('screen-lobby'),
  pos: document.getElementById('screen-posizionamento'),
  gioco: document.getElementById('screen-gioco')
};

const btnUnisciti = document.getElementById('btn-unisciti');
const btnPronto = document.getElementById('btn-pronto');
const btnRuota = document.getElementById('btn-ruota');
const btnConfermaPos = document.getElementById('btn-conferma-pos');
const btnRicomincia = document.getElementById('btn-ricomincia');
const btnCambiaBersaglio = document.getElementById('btn-cambia-bersaglio');
const listaGiocatori = document.getElementById('lista-giocatori');
const turnoAttuale = document.getElementById('turno-attuale');
const nomeGiocatoreAttuale = document.getElementById('nome-giocatore-attuale');
const posStatus = document.getElementById('pos-status');
const grigliaPos = document.getElementById('griglia-pos');
const grigliaPersonale = document.getElementById('griglia-personale');
const grigliaNemica = document.getElementById('griglia-nemica');
const nomeNemicoSpan = document.getElementById('nome-nemico');
const naviContainer = document.getElementById('navi-da-posizionare');
const turnoArrows = document.getElementById('turno-arrows');
const modalBersaglio = document.getElementById('modal-seleziona-bersaglio');
const listaBersagli = document.getElementById('lista-bersagli');
const naviRimaste = document.getElementById('navi-rimaste');
const flottaStatus = document.getElementById('flotta-status');
const powerUpsList = document.getElementById('power-ups-list');
const powerUpsSection = document.getElementById('power-ups-section');

// Card UI Elements
const deckCount = document.getElementById('deck-count');
const discardCount = document.getElementById('discard-count');
const exodiaProgress_ = document.getElementById('exodia-progress');
const exodiaProgressFill = document.getElementById('exodia-progress-fill');
const exodiaPartsCount = document.getElementById('exodia-parts-count');
const powerUpsTracker = document.getElementById('power-ups-tracker');
const powerUpsUsed = document.getElementById('power-ups-used');
const powerUpsMax = document.getElementById('power-ups-max');
const handContainer = document.getElementById('hand-container');
const handEmptyMessage = document.getElementById('hand-empty-message');
const deckSection = document.getElementById('deck-section');
const modalExodiaVictory = document.getElementById('modal-exodia-victory');
const exodiaVictoryText = document.getElementById('exodia-victory-text');
const exodiaPartsDisplay = document.getElementById('exodia-parts-display');

// Positioning Variables
let naviDaPosizionare = [];
let naveSelezionataIdx = 0;
let orientamento = 'H';
let grigliaPosData = [];

// Grid Data for rendering
let grigliaDatiPersonale = null;
let grigliaDatiNemica = null;

// Ships tracking
let shipData = {};
let avversari = {};

function mostraSchermata(key) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    screens[key].classList.add('active');
}

function connetti(nome) {
    ws = new WebSocket(WS_URL);
    ws.onopen = () => ws.send(JSON.stringify({ tipo: "UNISCITI", nome }));
    ws.onmessage = (event) => gestisciMessaggio(JSON.parse(event.data));
    ws.onclose = () => {
        turnoAttuale.innerText = "❌ Connessione persa!";
        turnoAttuale.style.color = "#ff4444";
    };
}

function gestisciMessaggio(msg) {
    switch (msg.tipo) {
        case "BENVENUTO":
            mioNome = msg.nome;
            DIM = msg.dim;
            nomeGiocatoreAttuale.innerText = `Tu: ${mioNome}`;
            mostraSchermata('lobby');
            break;

        case "GIOCATORI":
            listaGiocatori.innerHTML = "";
            msg.lista.forEach(n => {
                const li = document.createElement('li');
                li.innerText = n === mioNome ? `${n} (Tu) 👤` : n;
                listaGiocatori.appendChild(li);
            });
            btnPronto.disabled = msg.lista.length < 2;
            break;

        case "INIZIA_POSIZIONAMENTO":
            DIM = msg.dim;
            grigliaPosData = Array.from({ length: DIM }, () => Array(DIM).fill("~"));
            naviDaPosizionare = [...msg.navi];
            naveSelezionataIdx = 0;
            orientamento = 'H';
            btnRuota.innerText = "Ruota (Orizzontale)";
            posStatus.innerText = "";
            btnRicomincia.classList.add('hidden');
            grigliaPos.classList.remove('hidden');
            btnRuota.classList.remove('hidden');
            btnConfermaPos.classList.remove('hidden');
            naviContainer.classList.remove('hidden');
            mostraSchermata('pos');
            renderNaviList();
            renderGrigliaPos();
            break;

        case "POSIZIONAMENTO_OK":
            grigliaPosData = msg.griglia;
            naviDaPosizionare = naviDaPosizionare.filter(n => n.nome !== msg.naveNome);
            renderNaviList();
            renderGrigliaPos();
            break;

        case "ATTENDI_POS":
            posStatus.innerText = msg.messaggio;
            grigliaPos.classList.add('hidden');
            btnRuota.classList.add('hidden');
            btnConfermaPos.classList.add('hidden');
            naviContainer.classList.add('hidden');
            break;

        case "TORNA_LOBBY": 
            mostraSchermata('lobby'); 
            break;

        case "INIZIO":
            ordineGiocatori = msg.ordine;
            giocatoriEliminati.clear();
            turnoAttualeIdx = 0;
            mostraSchermata('gioco');
            renderDynamicGrid(grigliaPersonale, grigliaPosData, false);
            aggiornaTurnoArrows();
            break;

        case "IL_TUO_TURNO":
            console.log('🟢 Ricevuto IL_TUO_TURNO');
            isMioTurno = true;
            cardPlayLocked = false;  // Unlock card plays during our turn
            cardPlayPending = false;  // Reset pending state
            enableCardClicks();
            console.log('✅ Card plays unlocked - Ready to play cards');
            
            avversari = msg.avversari;
            turnoAttualeIdx = ordineGiocatori.indexOf(msg.turnoAttuale);
            grigliaDatiPersonale = grigliaPosData;
            renderDynamicGrid(grigliaPersonale, grigliaPosData, false);
            aggiornaTurnoArrows();
            
            turnoAttuale.innerText = "🟢 È il tuo turno! Scegli bersaglio e attacca!";
            turnoAttuale.style.color = "#4ecca3";
            
            const avversariDisponibili = Object.keys(avversari).filter(n => !giocatoriEliminati.has(n));
            if (avversariDisponibili.length > 0) {
                bersaglioAttuale = avversariDisponibili[0];
                nomeNemicoSpan.innerText = bersaglioAttuale;
                btnCambiaBersaglio.classList.remove('hidden');
                grigliaDatiNemica = avversari[bersaglioAttuale].griglia;
                renderDynamicGrid(grigliaNemica, grigliaDatiNemica, true, bersaglioAttuale);
                renderShipStatus(avversari[bersaglioAttuale].navi, bersaglioAttuale);
            }
            
            if (msg.powerUps) {
                renderPowerUps(msg.powerUps);
            }
            
            // Handle card system data
            if (msg.hand) {
                renderHand(msg.hand);
                playDrawAnimation();
            }
            if (msg.deck || msg.discard) {
                aggiornaMazzoEScari(msg.deck, msg.discard);
            }
            if (msg.exodia) {
                aggiornaProgressoExodia(msg.exodia);
            }
            if (msg.powerUpUsage) {
                aggiornaPowerUpTracker(msg.powerUpUsage);
            }
            break;

        case "ATTENDI":
            isMioTurno = false;
            cardPlayLocked = true;  // Lock card plays during opponent's turn
            disableCardClicks();
            
            ordineGiocatori = msg.ordine;
            turnoAttualeIdx = msg.ordine.indexOf(msg.turno_di);
            renderDynamicGrid(grigliaPersonale, grigliaPosData, false);
            aggiornaTurnoArrows();
            
            turnoAttuale.innerText = `🔴 Turno di ${msg.turno_di}. Attendi...`;
            turnoAttuale.style.color = "#e94560";
            grigliaNemica.classList.remove('cliccabile');
            btnCambiaBersaglio.classList.add('hidden');
            break;

        case "RISULTATO":
            if (msg.sonoIoIlBersaglio) {
                grigliaPosData[msg.riga][msg.col] = msg.esito === "MANCATO" ? "O" : "X";
                renderDynamicGrid(grigliaPersonale, msg.grigliaAggiornata, false);
                applicaAnimazione(grigliaPersonale, msg.riga, msg.col, msg.esito);
                
                turnoAttuale.innerText = `⚠️ SEI STATO COLPITO! ${msg.attaccante} → Tu`;
                turnoAttuale.style.color = "#ff4444";
                
                grigliaPersonale.parentElement.classList.add('flash-danno');
                setTimeout(() => grigliaPersonale.parentElement.classList.remove('flash-danno'), 1500);
                
                if (msg.navi) {
                    renderShipStatus(msg.navi, mioNome);
                }
            } else {
                if (msg.bersaglio === bersaglioAttuale) {
                    renderDynamicGrid(grigliaNemica, msg.grigliaAggiornata, false, bersaglioAttuale);
                    applicaAnimazione(grigliaNemica, msg.riga, msg.col, msg.esito);
                    if (msg.navi) {
                        renderShipStatus(msg.navi, bersaglioAttuale);
                    }
                }
                
                let txt = `${msg.attaccante} → ${msg.bersaglio}: `;
                txt += msg.esito === "COLPITO" ? "💥 Colpito!" : msg.esito === "AFFONDATA" ? `🚢 AFFONDATA (${msg.nave})!` : "💧 Acqua!";
                turnoAttuale.innerText = txt;
                turnoAttuale.style.color = "#ffffff";
            }
            break;

        case "ELIMINATO":
            giocatoriEliminati.add(msg.giocatore);
            console.log(`${msg.giocatore} è stato eliminato!`);
            aggiornaTurnoArrows();
            break;

        case "VITTORIA":
            isMioTurno = false;
            btnRicomincia.classList.remove('hidden');
            turnoAttuale.innerText = msg.vincitore === mioNome ? "🏆 HAI VINTO! 🏆" : `💀 HAI PERSO! Vince ${msg.vincitore}`;
            turnoAttuale.style.color = msg.vincitore === mioNome ? "#ffd700" : "#e94560";
            break;

        case "VITTORIA_EXODIA":
            isMioTurno = false;
            btnRicomincia.classList.remove('hidden');
            showExodiaVictory(msg.vincitore);
            turnoAttuale.innerText = msg.vincitore === mioNome 
                ? "👑 HAI ASSEMBLATO EXODIA! VITTORIA ISTANTANEA! 👑" 
                : `👑 ${msg.vincitore} HA ASSEMBLATO EXODIA!`;
            turnoAttuale.style.color = "#ffd700";
            break;

        case "AGGIORNA_MANO":
            // Update hand after card play
            console.log('📨 Ricevuto AGGIORNA_MANO dal server');
            cardPlayPending = false;  // Unlock card plays
            console.log('🔓 cardPlayPending = false (AGGIORNA_MANO) - Card plays unlocked');
            enableCardClicks();
            
            if (msg.hand) {
                renderHand(msg.hand);
            }
            if (msg.deck) {
                aggiornaMazzoEScari(msg.deck, null);
            }
            if (msg.discard) {
                aggiornaMazzoEScari(null, msg.discard);
            }
            if (msg.powerUpUsage) {
                aggiornaPowerUpTracker(msg.powerUpUsage);
            }
            console.log("✅ Hand updated after card play");
            break;

        case "MESSAGGIO":
            // Broadcast card play message to all players
            if (msg.carta) {
                turnoAttuale.innerText = msg.messaggio;
                turnoAttuale.style.color = "#4DD0E1";
                console.log(`🎴 ${msg.messaggio}`);
            }
            break;

        case "CARTA_GIOCATA":
            // Another player played a card (for future expanded effects)
            console.log(`${msg.giocatore} played ${msg.carta}`);
            break;

        case "RADAR_RESULT":
            // Show revealed 3x3 area from radar card
            console.log("📡 RADAR_RESULT ricevuto:", msg);
            if (msg.revealed) {
                mostraRiposta("📡 RADAR SCAN RESULT", msg.messaggio, msg.revealed);
            }
            break;

        case "SONAR_RESULT":
            // Show revealed ships from sonar card
            if (msg.ships) {
                mostraSonarResult(msg.ships, msg.messaggio);
            }
            break;

        case "RISULTATO":
            // Handle attack results (from both regular attacks and card attacks)
            if (msg.grigliaAggiornata) {
                if (msg.sonoIoIlBersaglio) {
                    grigliaDatiPersonale = msg.grigliaAggiornata;
                    renderDynamicGrid(grigliaPersonale, grigliaDatiPersonale, false);
                } else {
                    grigliaDatiNemica = msg.grigliaAggiornata;
                    renderDynamicGrid(grigliaNemica, grigliaDatiNemica, isMioTurno, bersaglioAttuale);
                }
                
                // Show cell attack results with animations
                if (msg.cellsAttacked && msg.cellsAttacked.length > 0) {
                    mostraRisultatiAttacco(msg.cellsAttacked, msg.sonoIoIlBersaglio ? grigliaPersonale : grigliaNemica);
                }
                
                // Update message
                turnoAttuale.innerText = msg.messaggio || `Attacco: ${msg.esito}`;
                console.log(`🎯 ${msg.messaggio}`);
            }
            break;

        case "ERRORE": 
            alert("❌ Errore: " + msg.messaggio); 
            break;
    }
}

// GRID RENDERING
function renderDynamicGrid(container, data, clickable, targetName = "") {
    container.innerHTML = "";
    container.classList.toggle("cliccabile", clickable);
    for (let r = 0; r < data.length; r++) {
        for (let c = 0; c < data[r].length; c++) {
            const cella = document.createElement("div");
            cella.classList.add("cella");
            const val = data[r][c];
            
            if (val === "N") cella.classList.add("nave");
            else if (val === "X") cella.classList.add("colpito");
            else if (val === "O") cella.classList.add("mancato");

            if (clickable && val !== "X" && val !== "O") {
                cella.style.cursor = "crosshair";
                cella.onclick = () => {
                    console.log(`🖱️ Click detected on cell [${r},${c}]`);
                    
                    // Check if card play is in progress or locked
                    if (cardPlayPending || cardPlayLocked) {
                        console.warn('⏸️ Card play in progress or locked, cannot attack');
                        return;
                    }
                    
                    if (isMioTurno) {
                        console.log(`⚔️ Attacking [${r},${c}] on ${targetName}`);
                        isMioTurno = false;
                        ws.send(JSON.stringify({
                            tipo: "ATTACCA",
                            bersaglio: targetName,
                            riga: r,
                            col: c
                        }));
                    }
                };
            }
            container.appendChild(cella);
        }
    }
}

function applicaAnimazione(container, r, c, esito) {
    const idx = r * DIM + c;
    const cella = container.children[idx];
    if (!cella) return;
    setTimeout(() => {
        if (esito === "AFFONDATA") cella.classList.add("affondata-anim");
        else if (esito === "COLPITO") cella.classList.add("colpito-anim");
    }, 50);
}

// SHIP STATUS
function renderShipStatus(ships, playerName) {
    flottaStatus.innerHTML = `<strong>${playerName}:</strong> `;
    
    let allSunk = true;
    let damageCount = 0;
    
    Object.entries(ships).forEach(([nome, data]) => {
        const statusClass = data.status === "Affondato" ? "sunk" : data.danno > 0 ? "damaged" : "";
        const icon = data.status === "Affondato" ? "⚰️" : data.danno > 0 ? "🔥" : "✅";
        flottaStatus.innerHTML += `<span class="ship-info ${statusClass}">${icon} ${nome}: ${data.danno}/${data.totale}</span> `;
        
        if (data.status !== "Affondato") allSunk = false;
        if (data.danno > 0) damageCount++;
    });
    
    if (allSunk) {
        flottaStatus.classList.add("critical");
    } else if (damageCount > 0) {
        flottaStatus.classList.remove("critical");
    }
}

// TURN ARROWS (UNO-STYLE)
function aggiornaTurnoArrows() {
    turnoArrows.innerHTML = "";
    ordineGiocatori.forEach((nome, idx) => {
        const arrow = document.createElement("div");
        arrow.className = "arrow-player";
        
        if (idx === turnoAttualeIdx) {
            arrow.classList.add("current");
        }
        if (giocatoriEliminati.has(nome)) {
            arrow.classList.add("eliminated");
        }
        
        arrow.innerHTML = `
            <div class="arrow-icon">${idx === turnoAttualeIdx ? "▶️" : "⬜"}</div>
            <div class="arrow-name">${nome === mioNome ? "Tu" : nome}</div>
        `;
        turnoArrows.appendChild(arrow);
    });
}

// POSITIONING LOGIC
function renderNaviList() {
    naviContainer.innerHTML = "";
    naviDaPosizionare.forEach((nave, idx) => {
        const btn = document.createElement("button");
        btn.className = `nave-btn ${idx === naveSelezionataIdx ? 'active' : ''}`;
        btn.innerHTML = `🚢 ${nave.nome}<br><span style="font-size: 12px;">(${nave.lunghezza} celle)</span>`;
        btn.onclick = () => {
            naveSelezionataIdx = idx;
            renderNaviList();
            renderGrigliaPos();
        };
        naviContainer.appendChild(btn);
    });
    btnConfermaPos.disabled = naviDaPosizionare.length > 0;
}

function renderGrigliaPos() {
    grigliaPos.innerHTML = "";
    if (naviDaPosizionare.length === 0) return;
    const nave = naviDaPosizionare[naveSelezionataIdx];

    for (let r = 0; r < DIM; r++) {
        for (let c = 0; c < DIM; c++) {
            const cella = document.createElement("div");
            cella.classList.add("cella");
            if (grigliaPosData[r][c] === "N") cella.classList.add("nave");

            // Logica Hover Preview
            cella.onmouseenter = () => previewNave(r, c, nave.lunghezza, true);
            cella.onmouseleave = () => previewNave(r, c, nave.lunghezza, false);
            cella.onclick = () => posizionaNave(r, c, nave);

            grigliaPos.appendChild(cella);
        }
    }
}

function getPreviewCells(r0, c0, len) {
    const cells = [];
    for (let i = 0; i < len; i++) {
        let r = orientamento === 'H' ? r0 : r0 + i;
        let c = orientamento === 'H' ? c0 + i : c0;
        cells.push({ r, c });
    }
    return cells;
}

function previewNave(r0, c0, len, show) {
    grigliaPos.querySelectorAll('.preview-valid, .preview-invalid').forEach(c => {
        c.classList.remove('preview-valid', 'preview-invalid');
    });
    if (!show) return;

    const cells = getPreviewCells(r0, c0, len);
    let isValid = true;

    for (const { r, c } of cells) {
        if (r < 0 || r >= DIM || c < 0 || c >= DIM || grigliaPosData[r][c] !== "~") {
            isValid = false;
            break;
        }
    }

    cells.forEach(({ r, c }) => {
        if (r >= 0 && r < DIM && c >= 0 && c < DIM) {
            const cella = grigliaPos.children[r * DIM + c];
            if (grigliaPosData[r][c] === "~") {
                cella.classList.add(isValid ? 'preview-valid' : 'preview-invalid');
            }
        }
    });
}

function posizionaNave(r0, c0, nave) {
    ws.send(JSON.stringify({
        tipo: "POSIZIONA_NAVE",
        naveNome: nave.nome,
        r0,
        c0,
        orizzontale: orientamento === 'H'
    }));
}

// MULTIPLAYER TARGET SELECTION
function mostraModalBersaglio() {
    listaBersagli.innerHTML = "";
    const bersagli = Object.keys(avversari).filter(n => !giocatoriEliminati.has(n));
    
    bersagli.forEach(nome => {
        const btn = document.createElement("button");
        btn.className = "btn-player-target";
        btn.innerHTML = `🎯 ${nome}`;
        btn.onclick = () => {
            bersaglioAttuale = nome;
            nomeNemicoSpan.innerText = bersaglioAttuale;
            grigliaDatiNemica = avversari[bersaglioAttuale].griglia;
            renderDynamicGrid(grigliaNemica, grigliaDatiNemica, true, bersaglioAttuale);
            renderShipStatus(avversari[bersaglioAttuale].navi, bersaglioAttuale);
            modalBersaglio.classList.add('hidden');
        };
        listaBersagli.appendChild(btn);
    });
    
    modalBersaglio.classList.remove('hidden');
}

// POWER-UPS
function renderPowerUps(powerUps) {
    if (!powerUps || powerUps.length === 0) {
        powerUpsSection.classList.add('hidden');
        return;
    }
    
    powerUpsSection.classList.remove('hidden');
    powerUpsList.innerHTML = "";
    
    powerUps.forEach(pu => {
        const card = document.createElement("div");
        card.className = "power-up-card";
        card.innerHTML = `
            <div class="power-up-icon">${pu.emoji}</div>
            <div class="power-up-name">${pu.nome}</div>
        `;
        card.title = pu.effetto;
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

// CARD EFFECT VISUALIZATION
function mostraRiposta(titolo, messaggio, cellsRivelate) {
    console.log(`📡 RADAR risultati:`, cellsRivelate);
    
    // Highlight cells on the actual enemy grid
    evidenziaRivelate(cellsRivelate, 'radar-revealed');
    
    // Create a temporary modal to show revealed cells
    const modal = document.createElement('div');
    modal.className = 'modal card-effect-modal';
    modal.id = 'radar-result-modal';
    modal.style.display = 'flex';
    
    const contenuto = document.createElement('div');
    contenuto.className = 'modal-content';
    contenuto.style.position = 'relative';
    contenuto.innerHTML = `
        <h3 style="color: #00BCD4; font-weight: bold; margin-bottom: 15px;">📡 ${titolo}</h3>
        <p style="margin: 10px 0; color: #ddd; font-size: 14px;">${messaggio}</p>
        <div id="revealed-grid" class="effect-grid-preview"></div>
        <button class="btn-primary" style="margin-top: 15px; width: 100%;">✓ Dismiss</button>
    `;
    
    modal.appendChild(contenuto);
    document.body.appendChild(modal);
    
    // Handle close button
    const closeBtn = contenuto.querySelector('button');
    closeBtn.onclick = () => {
        // Remove highlighting when modal closes
        grigliaNemica.querySelectorAll('.radar-revealed').forEach(el => el.classList.remove('radar-revealed'));
        modal.remove();
    };

    // Draw revealed cells in a mini grid
    const revealedGrid = modal.querySelector('#revealed-grid');
    const minR = Math.min(...cellsRivelate.map(c => c.riga));
    const minC = Math.min(...cellsRivelate.map(c => c.col));
    const maxR = Math.max(...cellsRivelate.map(c => c.riga));
    const maxC = Math.max(...cellsRivelate.map(c => c.col));
    const gridSize = Math.max(maxR - minR + 1, maxC - minC + 1);
    
    revealedGrid.style.gridTemplateColumns = `repeat(${gridSize}, 1fr)`;
    
    for (let r = minR; r <= maxR; r++) {
        for (let c = minC; c <= maxC; c++) {
            const cell = document.createElement('div');
            cell.className = 'cell-preview';
            const revealed = cellsRivelate.find(rv => rv.riga === r && rv.col === c);
            
            if (revealed) {
                cell.style.border = '2px solid';
                if (revealed.hasShip) {
                    cell.innerHTML = '🚢';
                    cell.style.background = 'linear-gradient(135deg, #FF6B6B, #FF4444)';
                    cell.style.borderColor = '#FF0000';
                    cell.style.color = '#fff';
                    cell.style.fontSize = '20px';
                    cell.style.fontWeight = 'bold';
                } else {
                    cell.innerHTML = '~';
                    cell.style.background = 'linear-gradient(135deg, #4DD0E1, #00BCD4)';
                    cell.style.borderColor = '#4DD0E1';
                    cell.style.color = '#fff';
                }
            } else {
                cell.innerHTML = '?';
                cell.style.background = '#333';
                cell.style.borderColor = '#555';
                cell.style.color = '#666';
            }
            
            revealedGrid.appendChild(cell);
        }
    }

    // Auto-dismiss after 10 seconds
    setTimeout(() => {
        if (modal.parentElement) {
            grigliaNemica.querySelectorAll('.radar-revealed').forEach(el => el.classList.remove('radar-revealed'));
            modal.remove();
        }
    }, 10000);
}

function mostraSonarResult(ships, messaggio) {
    console.log(`🌊 SONAR risultati:`, ships);
    
    // Highlight all ship cells on the enemy grid
    if (ships && ships.length > 0) {
        ships.forEach((ship, idx) => {
            if (ship && ship.length > 0) {
                ship.forEach(segment => {
                    if (segment.riga !== undefined && segment.col !== undefined) {
                        const cellIdx = segment.riga * DIM + segment.col;
                        const cellEl = grigliaNemica.children[cellIdx];
                        if (cellEl) {
                            cellEl.classList.add('sonar-revealed');
                        }
                    }
                });
            }
        });
    }
    
    // Show revealed ships
    const modal = document.createElement('div');
    modal.className = 'modal card-effect-modal';
    let shipsHtml = '';
    ships.forEach((ship, idx) => {
        const shipLength = ship ? ship.length : 'Unknown';
        shipsHtml += `<div class="ship-result">🚢 Ship ${idx + 1}: ${shipLength} segments</div>`;
    });

    const contenuto = document.createElement('div');
    contenuto.className = 'modal-content';
    contenuto.innerHTML = `
        <h3 style="color: #4DD0E1; font-weight: bold; margin-bottom: 15px;">🌊 SONAR PULSE</h3>
        <p style="margin: 10px 0; color: #ddd; font-size: 14px;">${messaggio}</p>
        <div style="margin: 15px 0; display: flex; flex-direction: column; gap: 8px;">
            ${shipsHtml}
        </div>
        <button class="btn-primary" style="margin-top: 15px; width: 100%;">✓ Dismiss</button>
    `;
    
    modal.appendChild(contenuto);
    document.body.appendChild(modal);
    
    // Handle close button
    const closeBtn = contenuto.querySelector('button');
    closeBtn.onclick = () => {
        grigliaNemica.querySelectorAll('.sonar-revealed').forEach(el => el.classList.remove('sonar-revealed'));
        modal.remove();
    };

    setTimeout(() => {
        if (modal.parentElement) {
            grigliaNemica.querySelectorAll('.sonar-revealed').forEach(el => el.classList.remove('sonar-revealed'));
            modal.remove();
        }
    }, 10000);
}

function evidenziaRivelate(cellsRivelate, className) {
    // Highlight revealed cells on the enemy grid
    cellsRivelate.forEach(cell => {
        const cellIdx = cell.riga * DIM + cell.col;
        const cellEl = grigliaNemica.children[cellIdx];
        if (cellEl) {
            cellEl.classList.add(className);
        }
    });
}

function mostraRisultatiAttacco(cellsAttacked, gridElement) {
    // Animate the attacked cells on the grid
    cellsAttacked.forEach((cell, idx) => {
        setTimeout(() => {
            const cellIdx = cell.riga * DIM + cell.col;
            const cellEl = gridElement.children[cellIdx];
            if (cellEl) {
                // Add animation class
                if (cell.esito === 'COLPITO') {
                    cellEl.classList.add('hit-animation');
                    cellEl.classList.add('colpito');
                } else if (cell.esito === 'MANCATO') {
                    cellEl.classList.add('miss-animation');
                    cellEl.classList.add('mancato');
                } else if (cell.esito === 'BLOCCATO') {
                    cellEl.classList.add('block-animation');
                }
            }
        }, idx * 300);
    });
}

// --- EVENTI UI ---
btnUnisciti.addEventListener("click", () => {
    const nome = document.getElementById('input-nome').value.trim();
    if (nome) connetti(nome);
});

document.getElementById('input-nome').addEventListener("keypress", (e) => {
    if (e.key === "Enter") btnUnisciti.click();
});

btnPronto.addEventListener("click", () => {
    if (ws) ws.send(JSON.stringify({ tipo: "PRONTO" }));
});

btnRuota.addEventListener("click", () => {
    orientamento = orientamento === 'H' ? 'V' : 'H';
    btnRuota.innerText = `Ruota (${orientamento === 'H' ? 'Orizzontale' : 'Verticale'})`;
    renderGrigliaPos();
});

btnConfermaPos.addEventListener("click", () => {
    if (ws) ws.send(JSON.stringify({ tipo: "CONFERMA_FLITTA" }));
});

btnRicomincia.addEventListener("click", () => {
    if (ws) ws.send(JSON.stringify({ tipo: "RICOMINCIA" }));
});

btnCambiaBersaglio.addEventListener("click", () => {
    mostraModalBersaglio();
});

// Close modal
document.querySelectorAll('.btn-close-modal').forEach(btn => {
    btn.addEventListener('click', () => {
        modalBersaglio.classList.add('hidden');
    });
});

// Close modal on background click
modalBersaglio.addEventListener('click', (e) => {
    if (e.target === modalBersaglio) {
        modalBersaglio.classList.add('hidden');
    }
});