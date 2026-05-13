const WS_URL = `ws://${window.location.hostname}:41000`;
let ws = null;
let mioNome = "";
let isMioTurno = false;
let bersaglioAttuale = "";
let DIM = 10;
let ordineGiocatori = [];
let turnoAttualeIdx = 0;
let giocatoriEliminati = new Set();

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

// Positioning Variables
let naviDaPosizionare = [];
let naveSelezionataIdx = 0;
let orientamento = 'H';
let grigliaPosData = [];

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
            isMioTurno = true;
            avversari = msg.avversari;
            turnoAttualeIdx = ordineGiocatori.indexOf(msg.turnoAttuale);
            renderDynamicGrid(grigliaPersonale, grigliaPosData, false);
            aggiornaTurnoArrows();
            
            turnoAttuale.innerText = "🟢 È il tuo turno! Scegli bersaglio e attacca!";
            turnoAttuale.style.color = "#4ecca3";
            
            const avversariDisponibili = Object.keys(avversari).filter(n => !giocatoriEliminati.has(n));
            if (avversariDisponibili.length > 0) {
                bersaglioAttuale = avversariDisponibili[0];
                nomeNemicoSpan.innerText = bersaglioAttuale;
                btnCambiaBersaglio.classList.remove('hidden');
                renderDynamicGrid(grigliaNemica, avversari[bersaglioAttuale].griglia, true, bersaglioAttuale);
                renderShipStatus(avversari[bersaglioAttuale].navi, bersaglioAttuale);
            }
            
            if (msg.powerUps) {
                renderPowerUps(msg.powerUps);
            }
            break;

        case "ATTENDI":
            isMioTurno = false;
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
                    if (isMioTurno) {
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
            renderDynamicGrid(grigliaNemica, avversari[bersaglioAttuale].griglia, true, bersaglioAttuale);
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