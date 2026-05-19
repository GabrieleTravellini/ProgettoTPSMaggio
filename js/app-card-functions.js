// ============================================================================
// CARD SYSTEM UI FUNCTIONS (Appended to app.js)
// ============================================================================

// Prevent multiple card plays
let cardPlayPending = false;
let cardPlayLocked = false;

/**
 * Update deck and discard pile counters
 */
function aggiornaMazzoEScari(deckInfo, discardInfo) {
    if (deckInfo) {
        mazzoSize = deckInfo.size;
        if (deckCount) deckCount.innerText = mazzoSize;
    }
    if (discardInfo) {
        scartiSize = discardInfo.size;
        if (discardCount) discardCount.innerText = scartiSize;
    }
}

/**
 * Update Exodia progress bar and counter
 */
function aggiornaProgressoExodia(exodiaInfo) {
    if (!exodiaInfo || !exodiaInfo.enabled) {
        if (exodiaProgress_) exodiaProgress_.classList.add('hidden');
        return;
    }

    if (exodiaProgress_) exodiaProgress_.classList.remove('hidden');

    exodiaProgress.current = exodiaInfo.progress;
    exodiaProgress.percentage = exodiaInfo.progressPercentage;

    if (exodiaProgressFill) {
        exodiaProgressFill.style.width = exodiaInfo.progressPercentage + '%';
    }
    if (exodiaPartsCount) {
        exodiaPartsCount.innerText = `${exodiaInfo.progress}/5`;
    }

    // Change color based on progress
    if (exodiaProgressFill) {
        if (exodiaInfo.progress === 5) {
            exodiaProgressFill.style.backgroundColor = '#ffd700'; // Gold for complete
        } else if (exodiaInfo.progress >= 3) {
            exodiaProgressFill.style.backgroundColor = '#ff6b6b'; // Red for danger
        } else {
            exodiaProgressFill.style.backgroundColor = '#4ecdc4'; // Teal for normal
        }
    }
}

/**
 * Update power-up usage tracker
 */
function aggiornaPowerUpTracker(powerUpInfo) {
    if (!powerUpInfo) {
        if (powerUpsTracker) powerUpsTracker.classList.add('hidden');
        return;
    }

    if (powerUpsTracker) powerUpsTracker.classList.remove('hidden');

    powerUpUsage.used = powerUpInfo.used;
    powerUpUsage.max = powerUpInfo.max;
    powerUpUsage.remaining = powerUpInfo.remaining;

    if (powerUpsUsed) powerUpsUsed.innerText = powerUpInfo.used;
    if (powerUpsMax) powerUpsMax.innerText = powerUpInfo.max;
}

/**
 * Render player's hand
 */
function renderHand(handInfo) {
    if (!handContainer) return;

    if (!handInfo || !handInfo.cards || handInfo.cards.length === 0) {
        handContainer.innerHTML = '<p id="hand-empty-message" class="hand-empty">No cards in hand</p>';
        return;
    }

    miaHand = handInfo;
    handContainer.innerHTML = '';

    handInfo.cards.forEach((cardData, index) => {
        const cardEl = document.createElement('div');
        cardEl.className = `card card-${cardData.type.toLowerCase()}`;
        cardEl.innerHTML = `
            <div class="card-header">
                <span class="card-emoji">${getCardEmoji(cardData.type)}</span>
                <span class="card-name">${cardData.name}</span>
            </div>
            <div class="card-body">
                <p class="card-description">${cardData.description}</p>
                ${cardData.power > 0 ? `<p class="card-power">⚡ ${cardData.power}</p>` : ''}
            </div>
            <div class="card-footer">
                <span class="card-rarity rarity-${cardData.rarity.toLowerCase()}">${cardData.rarity}</span>
            </div>
        `;
        cardEl.title = `Click to play`;
        cardEl.onclick = () => playCard(index, cardData);
        handContainer.appendChild(cardEl);
    });
}

/**
 * Get emoji for card type
 */
function getCardEmoji(type) {
    const emojiMap = {
        'ATTACK': '⚔️',
        'DEFENSE': '🛡️',
        'UTILITY': '⚡',
        'EXODIA': '👑'
    };
    return emojiMap[type] || '🎴';
}

/**
 * Play a card from hand
 */
function playCard(index, cardData) {
    // Prevent multiple simultaneous card plays
    if (cardPlayPending || cardPlayLocked) {
        console.warn('⏸️ Card play already in progress or locked');
        return;
    }

    if (!isMioTurno) {
        alert('Non è il tuo turno!');
        return;
    }

    // Check if player has power-ups available for special cards
    if (cardData.type === 'ATTACK' || cardData.type === 'UTILITY') {
        if (powerUpUsage.remaining <= 0) {
            alert('❌ Non hai più power-up disponibili questo turno!');
            return;
        }
    }

    // Lock card plays
    cardPlayPending = true;
    console.log('🔒 cardPlayPending = true - Locking card plays');
    disableCardClicks();

    // Send card play message to server
    ws.send(JSON.stringify({
        tipo: "PLAY_CARD",
        cardIndex: index,
        cardId: cardData.id,
        bersaglio: bersaglioAttuale
    }));

    console.log(`🎴 Hai giocato: ${cardData.name}`);
    
    // Timeout: if server doesn't respond in 5 seconds, unlock
    setTimeout(() => {
        if (cardPlayPending) {
            console.warn('⏱️ Card play timeout, unlocking');
            cardPlayPending = false;
            console.log('🔓 cardPlayPending = false (timeout) - Card plays unlocked');
            enableCardClicks();
        }
    }, 5000);
}

/**
 * Disable all card clicks during play
 */
function disableCardClicks() {
    const cards = document.querySelectorAll('.card');
    cards.forEach(card => {
        card.style.pointerEvents = 'none';
        card.style.opacity = '0.5';
        card.classList.add('card-disabled');
    });
}

/**
 * Enable card clicks
 */
function enableCardClicks() {
    const cards = document.querySelectorAll('.card');
    cards.forEach(card => {
        card.style.pointerEvents = 'auto';
        card.style.opacity = '1';
        card.classList.remove('card-disabled');
    });
}

/**
 * Display Exodia victory animation
 */
function showExodiaVictory(vincitore) {
    if (!modalExodiaVictory) return;

    if (exodiaVictoryText) {
        exodiaVictoryText.innerHTML = vincitore === mioNome 
            ? '👑 Hai assemblato tutti i cinque pezzi di Exodia! 👑<br>VITTORIA ISTANTANEA!'
            : `👑 ${vincitore} ha assemblato Exodia!<br>HAI PERSO!`;
    }

    // Display the 5 Exodia parts
    if (exodiaPartsDisplay) {
        exodiaPartsDisplay.innerHTML = `
            <div class="exodia-parts-grid">
                <div class="exodia-part">👁️ Head</div>
                <div class="exodia-part">🦾 Left Arm</div>
                <div class="exodia-part">🦾 Right Arm</div>
                <div class="exodia-part">🦵 Left Leg</div>
                <div class="exodia-part">🦵 Right Leg</div>
            </div>
        `;
    }

    modalExodiaVictory.classList.remove('hidden');

    // Play animation
    setTimeout(() => {
        const parts = document.querySelectorAll('.exodia-part');
        parts.forEach((part, i) => {
            setTimeout(() => {
                part.classList.add('exodia-appear');
            }, i * 200);
        });
    }, 100);
}

/**
 * Draw card animation
 */
function playDrawAnimation() {
    if (!deckCount) return;

    const deckEl = deckCount.closest('.deck-counter');
    if (!deckEl) return;

    // Create a temporary card element
    const tempCard = document.createElement('div');
    tempCard.className = 'temp-draw-card';
    tempCard.innerText = '🎴';
    document.body.appendChild(tempCard);

    // Animate card moving from deck to hand
    const deckRect = deckEl.getBoundingClientRect();
    const handRect = handContainer.getBoundingClientRect();

    tempCard.style.left = deckRect.left + 'px';
    tempCard.style.top = deckRect.top + 'px';

    requestAnimationFrame(() => {
        tempCard.style.transition = 'all 0.6s ease-in-out';
        tempCard.style.left = handRect.left + 'px';
        tempCard.style.top = handRect.top + 'px';
        tempCard.style.transform = 'scale(1.2)';
    });

    setTimeout(() => {
        tempCard.remove();
    }, 600);
}
