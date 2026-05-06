const WS_URL = `ws://${window.location.hostname}:41000`;
let ws = null;
let mioNome = "";
let isMioTurno = false;
let bersaglioAttuale = "";
let DIM = 10;

// Elementi DOM
const screens = { login: document.getElementById('screen-login'), lobby: document.getElementById('screen-lobby'), pos: document.getElementById('screen-posizionamento'), gioco: document.getElementById('screen-gioco') };
const btnUnisciti = document.getElementById('btn-unisciti');
const btnPronto = document.getElementById('btn-pronto');
const btnRuota = document.getElementById('btn-ruota');
const btnConfermaPos = document.getElementById('btn-conferma-pos');
const btnRicomincia = document.getElementById('btn-ricomincia');
const listaGiocatori = document.getElementById('lista-giocatori');
const turnoAttuale = document.getElementById('turno-attuale');
const posStatus = document.getElementById('pos-status');
const grigliaPos = document.getElementById('griglia-pos');
const grigliaPersonale = document.getElementById('griglia-personale');
const grigliaNemica = document.getElementById('griglia-nemica');
const nomeNemicoSpan = document.getElementById('nome-nemico');
const naviContainer = document.getElementById('navi-da-posizionare');

// Variabili Posizionamento
let naviDaPosizionare = [];
let naveSelezionataIdx = 0;
let orientamento = 'H'; // H or V
let grigliaPosData = [];

function mostraSchermata(key) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    screens[key].classList.add('active');
}

function connetti(nome) {
    ws = new WebSocket(WS_URL);
    ws.onopen = () => ws.send(JSON.stringify({ tipo: "UNISCITI", nome }));
    ws.onmessage = (event) => gestisciMessaggio(JSON.parse(event.data));
    ws.onclose = () => { turnoAttuale.innerText = "Connessione persa!"; };
}

function gestisciMessaggio(msg) {
    switch (msg.tipo) {
        case "BENVENUTO":
            mioNome = msg.nome; 
            DIM = msg.dim;
            mostraSchermata('lobby');
            break;

        case "GIOCATORI":
            listaGiocatori.innerHTML = "";
            msg.lista.forEach(n => { 
                const li = document.createElement('li'); 
                li.innerText = n === mioNome ? `${n} (Tu)` : n; 
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
            // Ri-mostro gli elementi nel caso di un restart
            grigliaPos.classList.remove('hidden');
            btnRuota.classList.remove('hidden');
            btnConfermaPos.classList.remove('hidden');
            naviContainer.classList.remove('hidden');
            
            mostraSchermata('pos');
            renderNaviList();
            renderGrigliaPos();
            break;

        case "POSIZIONAMENTO_OK":
            grigliaPosData = msg.griglia; // Aggiorno i dati locali con la conferma del server
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
            mostraSchermata('gioco'); 
            // DISEGNO LA MIA FLOTTA APPENA INIZIA LA PARTITA
            renderDynamicGrid(grigliaPersonale, grigliaPosData, false); 
            break;

        case "IL_TUO_TURNO":
            isMioTurno = true;
            // RASSICURO CHE LA MIA FLOTTA SIA VISIBILE AL MIO TURNO
            renderDynamicGrid(grigliaPersonale, grigliaPosData, false);
            
            turnoAttuale.innerText = "🟢 È il tuo turno! Fai fuoco!";
            turnoAttuale.style.color = "#4ecca3";
            const avversari = Object.keys(msg.avversari);
            if (avversari.length > 0) {
                bersaglioAttuale = avversari[0];
                nomeNemicoSpan.innerText = bersaglioAttuale;
                renderDynamicGrid(grigliaNemica, msg.avversari[bersaglioAttuale], true, bersaglioAttuale);
            }
            break;

        case "ATTENDI":
            isMioTurno = false;
            // RASSICURO CHE LA MIA FLOTTA SIA VISIBILE QUANDO ASPETTO
            renderDynamicGrid(grigliaPersonale, grigliaPosData, false);
            
            turnoAttuale.innerText = `🔴 Turno di ${msg.turno_di}. Attendi...`;
            turnoAttuale.style.color = "#e94560";
            grigliaNemica.classList.remove('cliccabile');
            break;

        case "RISULTATO":
            // --- SE SONO STATO IO A ESSERE COLPITO ---
            if (msg.sonioIlBersaglio) {
                // 1. Sincronizzo i miei dati nascosti
                grigliaPosData[msg.riga][msg.col] = msg.esito === "MANCATO" ? "O" : "X";
                
                // 2. Disegno la mia griglia (che il server mi invia NON oscurata, quindi vedo le esplosioni)
                renderDynamicGrid(grigliaPersonale, msg.grigliaAggiornata, false);
                
                // 3. Applico l'animazione alla cella colpita
                applicaAnimazione(grigliaPersonale, msg.riga, msg.col, msg.esito);
                
                // 4. Effetto allarme visivo forte
                turnoAttuale.innerText = "⚠️ SEI STATO COLPITO! ⚠️";
                turnoAttuale.style.color = "#ff4444";
                
                // Lampeggio rosso sul bordo della mia griglia
                grigliaPersonale.parentElement.classList.add('flash-danno');
                setTimeout(() => grigliaPersonale.parentElement.classList.remove('flash-danno'), 1500);
                
            } 
            // --- SE SONO STATO IO A SPARARE ---
            else {
                if (msg.bersaglio === bersaglioAttuale) {
                    renderDynamicGrid(grigliaNemica, msg.grigliaAggiornata, false, bersaglioAttuale);
                    applicaAnimazione(grigliaNemica, msg.riga, msg.col, msg.esito);
                }
                let txt = `${msg.attaccante} → ${msg.bersaglio}: `;
                txt += msg.esito === "COLPITO" ? "💥 Colpito!" : msg.esito === "AFFONDATA" ? `🚢 AFFONDATA (${msg.nave})!` : "💧 Acqua!";
                turnoAttuale.innerText = txt;
                turnoAttuale.style.color = "#ffffff";
            }
            break;

        case "VITTORIA":
            isMioTurno = false;
            btnRicomincia.classList.remove('hidden');
            turnoAttuale.innerText = msg.vincitore === mioNome ? "🏆 HAI VINTO! 🏆" : `💀 HAI PERSO! Vince ${msg.vincitore}`;
            turnoAttuale.style.color = msg.vincitore === mioNome ? "#ffd700" : "#e94560";
            break;

        case "ERRORE": 
            alert("Errore: " + msg.messaggio); 
            break;
    }
}

// --- LOGICA GRIGLIE ---
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
                cella.onclick = () => {
                    if (isMioTurno) { isMioTurno = false; ws.send(JSON.stringify({ tipo: "ATTACCA", bersaglio: targetName, riga: r, col: c })); }
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

// --- LOGICA POSIZIONAMENTO ---
function renderNaviList() {
    naviContainer.innerHTML = "";
    naviDaPosizionare.forEach((nave, idx) => {
        const btn = document.createElement("button");
        btn.className = `nave-btn ${idx === naveSelezionataIdx ? 'active' : ''}`;
        btn.innerText = `${nave.nome} (${nave.lunghezza})`;
        btn.onclick = () => { naveSelezionataIdx = idx; renderNaviList(); renderGrigliaPos(); };
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
    // Rimuovi vecchi preview
    grigliaPos.querySelectorAll('.preview-valid, .preview-invalid').forEach(c => { c.classList.remove('preview-valid', 'preview-invalid'); });
    if (!show) return;

    const cells = getPreviewCells(r0, c0, len);
    let isValid = true;

    for (const { r, c } of cells) {
        if (r < 0 || r >= DIM || c < 0 || c >= DIM || grigliaPosData[r][c] !== "~") { isValid = false; break; }
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
    ws.send(JSON.stringify({ tipo: "POSIZIONA_NAVE", naveNome: nave.nome, r0, c0, orizzontale: orientamento === 'H' }));
}

// --- EVENTI UI ---
btnUnisciti.addEventListener("click", () => {
    const nome = document.getElementById('input-nome').value.trim();
    if (nome) { connetti(nome); }
});
document.getElementById('input-nome').addEventListener("keypress", (e) => { if (e.key === "Enter") btnUnisciti.click(); });

btnPronto.addEventListener("click", () => { if (ws) ws.send(JSON.stringify({ tipo: "PRONTO" })); });

btnRuota.addEventListener("click", () => {
    orientamento = orientamento === 'H' ? 'V' : 'H';
    btnRuota.innerText = `Ruota (${orientamento === 'H' ? 'Orizzontale' : 'Verticale'})`;
});

btnConfermaPos.addEventListener("click", () => { if (ws) ws.send(JSON.stringify({ tipo: "CONFERMA_FLITTA" })); });

btnRicomincia.addEventListener("click", () => { if (ws) ws.send(JSON.stringify({ tipo: "RICOMINCIA" })); });