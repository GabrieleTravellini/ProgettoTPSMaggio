/**
 * @file cards-server.js
 * @description Card system for Node.js server (same classes as cards.js)
 * Manages card decks, hands, and effects on the server side
 */

// ============================================================================
// CARD CLASS
// ============================================================================
class Card {
    constructor(id, name, type, description, power = 0, rarity = 'COMMON', effectFunction = null) {
        this.id = id;
        this.name = name;
        this.type = type;
        this.description = description;
        this.power = power;
        this.rarity = rarity;
        this.effectFunction = effectFunction;
        this.createdAt = new Date().getTime();
    }

    getEmoji() {
        const emojiMap = {
            'ATTACK': '⚔️',
            'DEFENSE': '🛡️',
            'UTILITY': '⚡',
            'EXODIA': '👑'
        };
        return emojiMap[this.type] || '🎴';
    }

    executeEffect(gameState = {}) {
        if (this.effectFunction && typeof this.effectFunction === 'function') {
            return this.effectFunction(gameState);
        }
        return { success: true, message: `${this.name} played successfully` };
    }

    toJSON() {
        return {
            id: this.id,
            name: this.name,
            type: this.type,
            description: this.description,
            power: this.power,
            rarity: this.rarity,
            createdAt: this.createdAt
        };
    }

    static fromJSON(data) {
        return new Card(data.id, data.name, data.type, data.description, data.power, data.rarity);
    }
}

// ============================================================================
// DECK CLASS
// ============================================================================
class Deck {
    constructor(cards = [], maxSize = 40) {
        this.cards = [...cards];
        this.maxSize = maxSize;
        this.drewThisTurn = false;
    }

    getSize() {
        return this.cards.length;
    }

    isEmpty() {
        return this.cards.length === 0;
    }

    addCard(card) {
        if (this.cards.length >= this.maxSize) {
            return { success: false, message: `Deck is full (${this.maxSize} cards max)` };
        }
        this.cards.push(card);
        return { success: true, message: `${card.name} added to deck` };
    }

    addCards(cardArray) {
        const results = cardArray.map(card => this.addCard(card));
        return results;
    }

    removeCard(index) {
        if (index < 0 || index >= this.cards.length) {
            return null;
        }
        return this.cards.splice(index, 1)[0];
    }

    draw() {
        if (this.isEmpty()) {
            return { success: false, message: 'Deck is empty!', card: null };
        }
        const card = this.cards.shift();
        return { success: true, message: `Drew ${card.name}`, card };
    }

    drawMultiple(count) {
        const drawn = [];
        for (let i = 0; i < count; i++) {
            const result = this.draw();
            if (result.success) {
                drawn.push(result.card);
            } else {
                break;
            }
        }
        return drawn;
    }

    shuffle() {
        for (let i = this.cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
        }
        return { success: true, message: 'Deck shuffled' };
    }

    toJSON() {
        return {
            cards: this.cards.map(c => c.toJSON()),
            maxSize: this.maxSize,
            drewThisTurn: this.drewThisTurn
        };
    }

    static fromJSON(data) {
        const cards = data.cards.map(c => Card.fromJSON(c));
        const deck = new Deck(cards, data.maxSize);
        deck.drewThisTurn = data.drewThisTurn || false;
        return deck;
    }
}

// ============================================================================
// HAND CLASS
// ============================================================================
class Hand {
    constructor(maxSize = 10) {
        this.cards = [];
        this.maxSize = maxSize;
    }

    getSize() {
        return this.cards.length;
    }

    isFull() {
        return this.cards.length >= this.maxSize;
    }

    addCard(card) {
        if (this.isFull()) {
            return { success: false, message: `Hand is full (${this.maxSize} cards max)` };
        }
        this.cards.push(card);
        return { success: true, message: `${card.name} added to hand` };
    }

    addCards(cardArray) {
        const results = [];
        for (const card of cardArray) {
            results.push(this.addCard(card));
        }
        return results;
    }

    playCard(index) {
        if (index < 0 || index >= this.cards.length) {
            return { success: false, message: 'Invalid card index', card: null };
        }
        const card = this.cards.splice(index, 1)[0];
        return { success: true, message: `Played ${card.name}`, card };
    }

    getCard(index) {
        return this.cards[index] || null;
    }

    getCardsByType(type) {
        return this.cards.filter(c => c.type === type);
    }

    getCardsByRarity(rarity) {
        return this.cards.filter(c => c.rarity === rarity);
    }

    findCard(name) {
        return this.cards.find(c => c.name.toLowerCase() === name.toLowerCase());
    }

    discardType(type) {
        const discarded = this.cards.filter(c => c.type === type);
        this.cards = this.cards.filter(c => c.type !== type);
        return discarded;
    }

    clear() {
        const cleared = [...this.cards];
        this.cards = [];
        return cleared;
    }

    toJSON() {
        return {
            cards: this.cards.map(c => c.toJSON()),
            maxSize: this.maxSize
        };
    }

    static fromJSON(data) {
        const hand = new Hand(data.maxSize);
        hand.cards = data.cards.map(c => Card.fromJSON(c));
        return hand;
    }
}

// ============================================================================
// DISCARD PILE CLASS
// ============================================================================
class DiscardPile {
    constructor() {
        this.cards = [];
    }

    getSize() {
        return this.cards.length;
    }

    addCard(card) {
        this.cards.push(card);
        return { success: true, message: `${card.name} discarded` };
    }

    addCards(cardArray) {
        cardArray.forEach(card => this.addCard(card));
        return { success: true, message: `${cardArray.length} cards discarded` };
    }

    getAllCards() {
        const all = [...this.cards];
        this.cards = [];
        return all;
    }

    peekTop() {
        return this.cards.length > 0 ? this.cards[this.cards.length - 1] : null;
    }

    clear() {
        const cleared = [...this.cards];
        this.cards = [];
        return cleared;
    }

    toJSON() {
        return {
            cards: this.cards.map(c => c.toJSON())
        };
    }

    static fromJSON(data) {
        const pile = new DiscardPile();
        pile.cards = data.cards.map(c => Card.fromJSON(c));
        return pile;
    }
}

// ============================================================================
// CARD EFFECT CLASS
// ============================================================================
class CardEffect {
    constructor(effectType, parameters = {}) {
        this.effectType = effectType;
        this.parameters = parameters;
        this.isActive = false;
        this.activatedAt = null;
    }

    activate() {
        this.isActive = true;
        this.activatedAt = new Date().getTime();
        return { success: true, message: `${this.effectType} activated` };
    }

    deactivate() {
        this.isActive = false;
        return { success: true, message: `${this.effectType} deactivated` };
    }

    isEffectActive() {
        return this.isActive;
    }

    getDetails() {
        return {
            type: this.effectType,
            active: this.isActive,
            parameters: this.parameters,
            activatedAt: this.activatedAt
        };
    }

    execute(gameState = {}) {
        const effects = {
            'RADAR': () => ({ success: true, revealed: this.parameters.area || '3x3' }),
            'DOUBLE_SHOT': () => ({ success: true, attacks: 2 }),
            'SHIELD': () => ({ success: true, protected: true }),
            'REPAIR': () => ({ success: true, healed: 1 }),
            'SONAR': () => ({ success: true, nearestShip: this.parameters.target }),
            'MINE': () => ({ success: true, trapped: true }),
            'EMP': () => ({ success: true, powerUpsDisabled: this.parameters.turns || 1 }),
            'SWAP': () => ({ success: true, swapped: true })
        };

        const executor = effects[this.effectType];
        return executor ? executor() : { success: false, message: 'Unknown effect' };
    }

    toJSON() {
        return {
            effectType: this.effectType,
            parameters: this.parameters,
            isActive: this.isActive,
            activatedAt: this.activatedAt
        };
    }

    static fromJSON(data) {
        const effect = new CardEffect(data.effectType, data.parameters);
        effect.isActive = data.isActive;
        effect.activatedAt = data.activatedAt;
        return effect;
    }
}

// ============================================================================
// EXODIA CHECKER CLASS
// ============================================================================
class ExodiaChecker {
    constructor(enabled = true) {
        this.enabled = enabled;
        this.requiredParts = ['EXODIA_HEAD', 'EXODIA_LEFT_ARM', 'EXODIA_RIGHT_ARM', 'EXODIA_LEFT_LEG', 'EXODIA_RIGHT_LEG'];
    }

    checkWin(hand) {
        if (!this.enabled || !hand) return false;

        const handCardIds = hand.cards.map(c => c.id);
        return this.requiredParts.every(part => handCardIds.includes(part));
    }

    getMissingParts(hand) {
        if (!hand) return this.requiredParts;

        const handCardIds = hand.cards.map(c => c.id);
        return this.requiredParts.filter(part => !handCardIds.includes(part));
    }

    getProgress(hand) {
        if (!hand) return 0;

        const handCardIds = hand.cards.map(c => c.id);
        const collected = this.requiredParts.filter(part => handCardIds.includes(part)).length;
        return collected;
    }

    getProgressPercentage(hand) {
        return (this.getProgress(hand) / this.requiredParts.length) * 100;
    }

    setEnabled(enabled) {
        this.enabled = enabled;
    }

    toJSON() {
        return {
            enabled: this.enabled,
            requiredParts: this.requiredParts
        };
    }
}

// ============================================================================
// POWER UP MANAGER CLASS
// ============================================================================
class PowerUpManager {
    constructor(maxPerTurn = 2) {
        this.maxPerTurn = maxPerTurn;
        this.usedThisTurn = 0;
        this.activeEffects = [];
    }

    canUsePowerUp() {
        return this.usedThisTurn < this.maxPerTurn;
    }

    getRemaining() {
        return Math.max(0, this.maxPerTurn - this.usedThisTurn);
    }

    usePowerUp(effect) {
        if (!this.canUsePowerUp()) {
            return { success: false, message: `Max power-ups reached (${this.maxPerTurn} per turn)` };
        }

        this.usedThisTurn++;
        // Only push effect if it's not null/undefined
        if (effect) {
            this.activeEffects.push(effect);
        }
        return { success: true, message: `Power-up used (${this.getRemaining()} remaining)` };
    }

    resetTurn() {
        this.usedThisTurn = 0;
        // Filter out effects that expire (duration = 1), but check for null/undefined first
        this.activeEffects = this.activeEffects.filter(e => e && e.parameters && e.parameters.duration !== 1);
        return { success: true, message: 'Power-ups reset for new turn' };
    }

    getActiveEffects() {
        return [...this.activeEffects];
    }

    toJSON() {
        return {
            maxPerTurn: this.maxPerTurn,
            usedThisTurn: this.usedThisTurn,
            activeEffects: this.activeEffects.filter(e => e).map(e => e.toJSON ? e.toJSON() : {})
        };
    }

    static fromJSON(data) {
        const manager = new PowerUpManager(data.maxPerTurn);
        manager.usedThisTurn = data.usedThisTurn;
        manager.activeEffects = data.activeEffects.map(e => CardEffect.fromJSON(e));
        return manager;
    }
}

// ============================================================================
// DEFAULT CARD DEFINITIONS
// ============================================================================

const DEFAULT_CARD_DEFINITIONS = {
    // Exodia Parts
    'EXODIA_HEAD': new Card('EXODIA_HEAD', 'Exodia the Forbidden One (Head)', 'EXODIA', 'Part of the legendary Exodia', 0, 'LEGENDARY'),
    'EXODIA_LEFT_ARM': new Card('EXODIA_LEFT_ARM', 'Left Arm of the Forbidden One', 'EXODIA', 'Part of the legendary Exodia', 0, 'LEGENDARY'),
    'EXODIA_RIGHT_ARM': new Card('EXODIA_RIGHT_ARM', 'Right Arm of the Forbidden One', 'EXODIA', 'Part of the legendary Exodia', 0, 'LEGENDARY'),
    'EXODIA_LEFT_LEG': new Card('EXODIA_LEFT_LEG', 'Left Leg of the Forbidden One', 'EXODIA', 'Part of the legendary Exodia', 0, 'LEGENDARY'),
    'EXODIA_RIGHT_LEG': new Card('EXODIA_RIGHT_LEG', 'Right Leg of the Forbidden One', 'EXODIA', 'Part of the legendary Exodia', 0, 'LEGENDARY'),

    // Power-Up Cards
    'RADAR': new Card('RADAR', 'Radar Scan', 'UTILITY', 'Reveals a 3×3 area on enemy board', 0, 'RARE'),
    'DOUBLE_SHOT': new Card('DOUBLE_SHOT', 'Double Shot', 'ATTACK', 'Fire at two coordinates this turn', 2, 'RARE'),
    'SHIELD': new Card('SHIELD', 'Shield Generator', 'DEFENSE', 'Protect one ship segment for one round', 1, 'UNCOMMON'),
    'REPAIR': new Card('REPAIR', 'Emergency Repair', 'UTILITY', 'Restore one damaged ship section', 0, 'UNCOMMON'),
    'SONAR': new Card('SONAR', 'Sonar Pulse', 'UTILITY', 'Reveal the nearest enemy ship', 0, 'UNCOMMON'),
    'MINE': new Card('MINE', 'Naval Mine', 'DEFENSE', 'Place a trap on the board', 0, 'UNCOMMON'),
    'EMP': new Card('EMP', 'EMP Burst', 'ATTACK', 'Disable one opponent\'s power-up next turn', 1, 'RARE'),
    'SWAP': new Card('SWAP', 'Card Swap', 'UTILITY', 'Exchange one card with opponent', 0, 'RARE'),

    // Basic Attack Cards
    'STRIKE_1': new Card('STRIKE_1', 'Basic Strike', 'ATTACK', 'Standard attack', 1, 'COMMON'),
    'STRIKE_2': new Card('STRIKE_2', 'Heavy Strike', 'ATTACK', 'Stronger attack', 2, 'UNCOMMON'),
    'STRIKE_3': new Card('STRIKE_3', 'Critical Strike', 'ATTACK', 'Powerful attack', 3, 'RARE'),

    // Defensive Cards
    'DEFENSE_1': new Card('DEFENSE_1', 'Armor Plating', 'DEFENSE', 'Reduce damage this turn', 0, 'COMMON'),
    'DEFENSE_2': new Card('DEFENSE_2', 'Reinforced Hull', 'DEFENSE', 'Stronger defense', 0, 'UNCOMMON'),

    // Utility Cards
    'DRAW': new Card('DRAW', 'Scavenge', 'UTILITY', 'Draw an additional card', 0, 'UNCOMMON'),
    'BOOST': new Card('BOOST', 'Adrenaline Rush', 'UTILITY', 'Boost power by 1 next turn', 0, 'COMMON'),
    'RESET': new Card('RESET', 'System Reset', 'UTILITY', 'Reset cooldowns', 0, 'RARE')
};

function createDefaultDeck() {
    const deckComposition = [
        'EXODIA_HEAD', 'EXODIA_LEFT_ARM', 'EXODIA_RIGHT_ARM', 'EXODIA_LEFT_LEG', 'EXODIA_RIGHT_LEG',
        'RADAR', 'RADAR',
        'DOUBLE_SHOT', 'DOUBLE_SHOT',
        'SHIELD', 'SHIELD', 'SHIELD',
        'REPAIR', 'REPAIR',
        'SONAR', 'SONAR',
        'MINE', 'MINE',
        'EMP',
        'SWAP',
        'STRIKE_1', 'STRIKE_1', 'STRIKE_1', 'STRIKE_1', 'STRIKE_1',
        'STRIKE_2', 'STRIKE_2', 'STRIKE_2', 'STRIKE_2', 'STRIKE_2',
        'DEFENSE_1', 'DEFENSE_1', 'DEFENSE_1',
        'DEFENSE_2', 'DEFENSE_2', 'DEFENSE_2',
        'DRAW', 'BOOST', 'RESET'
    ];

    const deck = new Deck([], 40);
    deckComposition.forEach(cardId => {
        const cardDef = DEFAULT_CARD_DEFINITIONS[cardId];
        if (cardDef) {
            deck.addCard(cardDef);
        }
    });

    return deck;
}

const CARD_CONFIG = {
    deckSize: 40,
    startingHandSize: 5,
    cardsDrawnPerTurn: 1,
    maxHandSize: 10,
    powerUpsPerTurn: 2,
    enableExodia: true,
    exodiaInstantWin: true,
    fatigueRules: {
        enabled: true,
        damagePerEmptyDraw: 1
    }
};

// Export for Node.js
module.exports = {
    Card, Deck, Hand, DiscardPile, CardEffect, ExodiaChecker, PowerUpManager,
    DEFAULT_CARD_DEFINITIONS, createDefaultDeck, CARD_CONFIG
};
