/**
 * @file cards.js
 * @description Modular card deck system inspired by Yu-Gi-Oh!
 * Includes Card, Deck, Hand, DiscardPile, CardEffect, ExodiaChecker, PowerUpManager
 */

// ============================================================================
// CARD CLASS - Represents a single card
// ============================================================================
class Card {
    /**
     * @param {string} id - Unique identifier for the card
     * @param {string} name - Card name
     * @param {string} type - Card type: 'ATTACK', 'DEFENSE', 'UTILITY', 'EXODIA'
     * @param {string} description - Card effect description
     * @param {number} power - Power value for attack cards
     * @param {string} rarity - Rarity level: 'COMMON', 'UNCOMMON', 'RARE', 'LEGENDARY'
     * @param {Function|null} effectFunction - Optional custom effect function
     */
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

    /**
     * Get a visual emoji representation for the card type
     */
    getEmoji() {
        const emojiMap = {
            'ATTACK': '⚔️',
            'DEFENSE': '🛡️',
            'UTILITY': '⚡',
            'EXODIA': '👑'
        };
        return emojiMap[this.type] || '🎴';
    }

    /**
     * Execute the card's effect
     */
    executeEffect(gameState = {}) {
        if (this.effectFunction && typeof this.effectFunction === 'function') {
            return this.effectFunction(gameState);
        }
        return { success: true, message: `${this.name} played successfully` };
    }

    /**
     * Return card as JSON for serialization
     */
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

    /**
     * Create a Card from JSON
     */
    static fromJSON(data) {
        return new Card(data.id, data.name, data.type, data.description, data.power, data.rarity);
    }
}

// ============================================================================
// DECK CLASS - Manages the player's card deck
// ============================================================================
class Deck {
    /**
     * @param {Card[]} cards - Initial cards in the deck
     * @param {number} maxSize - Maximum deck size (default: 40)
     */
    constructor(cards = [], maxSize = 40) {
        this.cards = [...cards]; // Copy array to prevent external mutation
        this.maxSize = maxSize;
        this.drewThisTurn = false;
    }

    /**
     * Get current deck size
     */
    getSize() {
        return this.cards.length;
    }

    /**
     * Check if deck is empty
     */
    isEmpty() {
        return this.cards.length === 0;
    }

    /**
     * Add card to deck
     */
    addCard(card) {
        if (this.cards.length >= this.maxSize) {
            return { success: false, message: `Deck is full (${this.maxSize} cards max)` };
        }
        this.cards.push(card);
        return { success: true, message: `${card.name} added to deck` };
    }

    /**
     * Add multiple cards to deck
     */
    addCards(cardArray) {
        const results = cardArray.map(card => this.addCard(card));
        return results;
    }

    /**
     * Remove card from deck by index
     */
    removeCard(index) {
        if (index < 0 || index >= this.cards.length) {
            return null;
        }
        return this.cards.splice(index, 1)[0];
    }

    /**
     * Draw a card from the top of the deck
     */
    draw() {
        if (this.isEmpty()) {
            return { success: false, message: 'Deck is empty!', card: null };
        }
        const card = this.cards.shift();
        return { success: true, message: `Drew ${card.name}`, card };
    }

    /**
     * Draw multiple cards
     */
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

    /**
     * Shuffle the deck using Fisher-Yates algorithm
     */
    shuffle() {
        for (let i = this.cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
        }
        return { success: true, message: 'Deck shuffled' };
    }

    /**
     * Get all cards as JSON
     */
    toJSON() {
        return {
            cards: this.cards.map(c => c.toJSON()),
            maxSize: this.maxSize,
            drewThisTurn: this.drewThisTurn
        };
    }

    /**
     * Create Deck from JSON
     */
    static fromJSON(data) {
        const cards = data.cards.map(c => Card.fromJSON(c));
        const deck = new Deck(cards, data.maxSize);
        deck.drewThisTurn = data.drewThisTurn || false;
        return deck;
    }
}

// ============================================================================
// HAND CLASS - Manages player's cards in hand
// ============================================================================
class Hand {
    /**
     * @param {number} maxSize - Maximum hand size (default: 10)
     */
    constructor(maxSize = 10) {
        this.cards = [];
        this.maxSize = maxSize;
    }

    /**
     * Get current hand size
     */
    getSize() {
        return this.cards.length;
    }

    /**
     * Check if hand is full
     */
    isFull() {
        return this.cards.length >= this.maxSize;
    }

    /**
     * Add card to hand
     */
    addCard(card) {
        if (this.isFull()) {
            return { success: false, message: `Hand is full (${this.maxSize} cards max)` };
        }
        this.cards.push(card);
        return { success: true, message: `${card.name} added to hand` };
    }

    /**
     * Add multiple cards
     */
    addCards(cardArray) {
        const results = [];
        for (const card of cardArray) {
            results.push(this.addCard(card));
        }
        return results;
    }

    /**
     * Play a card (remove from hand by index)
     */
    playCard(index) {
        if (index < 0 || index >= this.cards.length) {
            return { success: false, message: 'Invalid card index', card: null };
        }
        const card = this.cards.splice(index, 1)[0];
        return { success: true, message: `Played ${card.name}`, card };
    }

    /**
     * Get card by index
     */
    getCard(index) {
        return this.cards[index] || null;
    }

    /**
     * Get cards of specific type
     */
    getCardsByType(type) {
        return this.cards.filter(c => c.type === type);
    }

    /**
     * Get cards of specific rarity
     */
    getCardsByRarity(rarity) {
        return this.cards.filter(c => c.rarity === rarity);
    }

    /**
     * Search for specific card by name
     */
    findCard(name) {
        return this.cards.find(c => c.name.toLowerCase() === name.toLowerCase());
    }

    /**
     * Discard all cards of specific type
     */
    discardType(type) {
        const discarded = this.cards.filter(c => c.type === type);
        this.cards = this.cards.filter(c => c.type !== type);
        return discarded;
    }

    /**
     * Clear the hand
     */
    clear() {
        const cleared = [...this.cards];
        this.cards = [];
        return cleared;
    }

    /**
     * Get all cards as JSON
     */
    toJSON() {
        return {
            cards: this.cards.map(c => c.toJSON()),
            maxSize: this.maxSize
        };
    }

    /**
     * Create Hand from JSON
     */
    static fromJSON(data) {
        const hand = new Hand(data.maxSize);
        hand.cards = data.cards.map(c => Card.fromJSON(c));
        return hand;
    }
}

// ============================================================================
// DISCARD PILE CLASS - Manages discarded cards
// ============================================================================
class DiscardPile {
    constructor() {
        this.cards = [];
    }

    /**
     * Get size of discard pile
     */
    getSize() {
        return this.cards.length;
    }

    /**
     * Add card to discard pile
     */
    addCard(card) {
        this.cards.push(card);
        return { success: true, message: `${card.name} discarded` };
    }

    /**
     * Add multiple cards
     */
    addCards(cardArray) {
        cardArray.forEach(card => this.addCard(card));
        return { success: true, message: `${cardArray.length} cards discarded` };
    }

    /**
     * Get all cards from discard pile (e.g., for shuffle-back)
     */
    getAllCards() {
        const all = [...this.cards];
        this.cards = [];
        return all;
    }

    /**
     * Get top card without removing
     */
    peekTop() {
        return this.cards.length > 0 ? this.cards[this.cards.length - 1] : null;
    }

    /**
     * Clear discard pile
     */
    clear() {
        const cleared = [...this.cards];
        this.cards = [];
        return cleared;
    }

    /**
     * Get all cards as JSON
     */
    toJSON() {
        return {
            cards: this.cards.map(c => c.toJSON())
        };
    }

    /**
     * Create DiscardPile from JSON
     */
    static fromJSON(data) {
        const pile = new DiscardPile();
        pile.cards = data.cards.map(c => Card.fromJSON(c));
        return pile;
    }
}

// ============================================================================
// CARD EFFECT CLASS - Manages card effects
// ============================================================================
class CardEffect {
    constructor(effectType, parameters = {}) {
        this.effectType = effectType; // 'RADAR', 'DOUBLE_SHOT', 'SHIELD', 'REPAIR', etc.
        this.parameters = parameters;
        this.isActive = false;
        this.activatedAt = null;
    }

    /**
     * Activate the effect
     */
    activate() {
        this.isActive = true;
        this.activatedAt = new Date().getTime();
        return { success: true, message: `${this.effectType} activated` };
    }

    /**
     * Deactivate the effect
     */
    deactivate() {
        this.isActive = false;
        return { success: true, message: `${this.effectType} deactivated` };
    }

    /**
     * Check if effect is still active
     */
    isEffectActive() {
        return this.isActive;
    }

    /**
     * Get effect details
     */
    getDetails() {
        return {
            type: this.effectType,
            active: this.isActive,
            parameters: this.parameters,
            activatedAt: this.activatedAt
        };
    }

    /**
     * Execute the effect logic
     */
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

    /**
     * Get effect as JSON
     */
    toJSON() {
        return {
            effectType: this.effectType,
            parameters: this.parameters,
            isActive: this.isActive,
            activatedAt: this.activatedAt
        };
    }

    /**
     * Create CardEffect from JSON
     */
    static fromJSON(data) {
        const effect = new CardEffect(data.effectType, data.parameters);
        effect.isActive = data.isActive;
        effect.activatedAt = data.activatedAt;
        return effect;
    }
}

// ============================================================================
// EXODIA CHECKER CLASS - Detects instant win condition
// ============================================================================
class ExodiaChecker {
    constructor(enabled = true) {
        this.enabled = enabled;
        this.requiredParts = ['EXODIA_HEAD', 'EXODIA_LEFT_ARM', 'EXODIA_RIGHT_ARM', 'EXODIA_LEFT_LEG', 'EXODIA_RIGHT_LEG'];
    }

    /**
     * Check if player has all Exodia parts in hand
     */
    checkWin(hand) {
        if (!this.enabled || !hand) return false;

        const handCardIds = hand.cards.map(c => c.id);
        return this.requiredParts.every(part => handCardIds.includes(part));
    }

    /**
     * Get missing Exodia parts
     */
    getMissingParts(hand) {
        if (!hand) return this.requiredParts;

        const handCardIds = hand.cards.map(c => c.id);
        return this.requiredParts.filter(part => !handCardIds.includes(part));
    }

    /**
     * Get Exodia progress (how many parts player has)
     */
    getProgress(hand) {
        if (!hand) return 0;

        const handCardIds = hand.cards.map(c => c.id);
        const collected = this.requiredParts.filter(part => handCardIds.includes(part)).length;
        return collected;
    }

    /**
     * Get progress as percentage
     */
    getProgressPercentage(hand) {
        return (this.getProgress(hand) / this.requiredParts.length) * 100;
    }

    /**
     * Enable/disable Exodia
     */
    setEnabled(enabled) {
        this.enabled = enabled;
    }

    /**
     * Get Exodia checker as JSON
     */
    toJSON() {
        return {
            enabled: this.enabled,
            requiredParts: this.requiredParts
        };
    }
}

// ============================================================================
// POWER UP MANAGER CLASS - Manages power-up usage per turn
// ============================================================================
class PowerUpManager {
    /**
     * @param {number} maxPerTurn - Maximum power-ups per turn (default: 2)
     */
    constructor(maxPerTurn = 2) {
        this.maxPerTurn = maxPerTurn;
        this.usedThisTurn = 0;
        this.activeEffects = [];
    }

    /**
     * Check if can use power-up
     */
    canUsePowerUp() {
        return this.usedThisTurn < this.maxPerTurn;
    }

    /**
     * Get remaining power-ups for this turn
     */
    getRemaining() {
        return Math.max(0, this.maxPerTurn - this.usedThisTurn);
    }

    /**
     * Use a power-up
     */
    usePowerUp(effect) {
        if (!this.canUsePowerUp()) {
            return { success: false, message: `Max power-ups reached (${this.maxPerTurn} per turn)` };
        }

        this.usedThisTurn++;
        this.activeEffects.push(effect);
        return { success: true, message: `Power-up used (${this.getRemaining()} remaining)` };
    }

    /**
     * Reset power-ups for new turn
     */
    resetTurn() {
        this.usedThisTurn = 0;
        // Remove expired effects (that last only 1 turn)
        this.activeEffects = this.activeEffects.filter(e => e.parameters.duration !== 1);
        return { success: true, message: 'Power-ups reset for new turn' };
    }

    /**
     * Get active effects
     */
    getActiveEffects() {
        return [...this.activeEffects];
    }

    /**
     * Get power-up manager as JSON
     */
    toJSON() {
        return {
            maxPerTurn: this.maxPerTurn,
            usedThisTurn: this.usedThisTurn,
            activeEffects: this.activeEffects.map(e => e.toJSON())
        };
    }

    /**
     * Create PowerUpManager from JSON
     */
    static fromJSON(data) {
        const manager = new PowerUpManager(data.maxPerTurn);
        manager.usedThisTurn = data.usedThisTurn;
        manager.activeEffects = data.activeEffects.map(e => CardEffect.fromJSON(e));
        return manager;
    }
}

// ============================================================================
// CARD CONFIGURATION & DEFAULT DECKS
// ============================================================================

/**
 * Default card definitions
 */
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

/**
 * Create a default starter deck (40 cards)
 */
function createDefaultDeck() {
    const deckComposition = [
        // Exodia parts (1 of each)
        'EXODIA_HEAD', 'EXODIA_LEFT_ARM', 'EXODIA_RIGHT_ARM', 'EXODIA_LEFT_LEG', 'EXODIA_RIGHT_LEG',
        // Power-ups (2-3 each)
        'RADAR', 'RADAR',
        'DOUBLE_SHOT', 'DOUBLE_SHOT',
        'SHIELD', 'SHIELD', 'SHIELD',
        'REPAIR', 'REPAIR',
        'SONAR', 'SONAR',
        'MINE', 'MINE',
        'EMP',
        'SWAP',
        // Basic attacks (10 cards)
        'STRIKE_1', 'STRIKE_1', 'STRIKE_1', 'STRIKE_1', 'STRIKE_1',
        'STRIKE_2', 'STRIKE_2', 'STRIKE_2', 'STRIKE_2', 'STRIKE_2',
        // Defenses (6 cards)
        'DEFENSE_1', 'DEFENSE_1', 'DEFENSE_1',
        'DEFENSE_2', 'DEFENSE_2', 'DEFENSE_2',
        // Utilities (remaining)
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

/**
 * Game configuration
 */
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
        damagePerEmptyDraw: 1 // Damage taken if attempting to draw from empty deck
    }
};

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        Card, Deck, Hand, DiscardPile, CardEffect, ExodiaChecker, PowerUpManager,
        DEFAULT_CARD_DEFINITIONS, createDefaultDeck, CARD_CONFIG
    };
}
