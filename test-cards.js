/**
 * @file test-cards.js
 * @description Unit tests for the card deck system
 * Run these tests in Node.js: node test-cards.js
 */

const {
    Card, Deck, Hand, DiscardPile, CardEffect, ExodiaChecker, PowerUpManager,
    DEFAULT_CARD_DEFINITIONS, createDefaultDeck, CARD_CONFIG
} = require('./cards-server.js');

// Color codes for test output
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

let testsRun = 0;
let testsPassed = 0;
let testsFailed = 0;

/**
 * Assert helper
 */
function assert(condition, message) {
    testsRun++;
    if (condition) {
        console.log(`${GREEN}✓${RESET} ${message}`);
        testsPassed++;
    } else {
        console.log(`${RED}✗${RESET} ${message}`);
        testsFailed++;
    }
}

/**
 * Test Card class
 */
function testCard() {
    console.log(`\n${YELLOW}Testing Card Class${RESET}`);
    
    const card = new Card('TEST_CARD', 'Test Card', 'ATTACK', 'A test card', 5, 'RARE');
    
    assert(card.id === 'TEST_CARD', 'Card id is set correctly');
    assert(card.name === 'Test Card', 'Card name is set correctly');
    assert(card.type === 'ATTACK', 'Card type is set correctly');
    assert(card.power === 5, 'Card power is set correctly');
    assert(card.rarity === 'RARE', 'Card rarity is set correctly');
    assert(card.getEmoji() === '⚔️', 'Card emoji matches type');
    
    const json = card.toJSON();
    assert(json.id === 'TEST_CARD', 'Card serializes to JSON correctly');
    
    const restoredCard = Card.fromJSON(json);
    assert(restoredCard.name === 'Test Card', 'Card deserializes from JSON correctly');
}

/**
 * Test Deck class
 */
function testDeck() {
    console.log(`\n${YELLOW}Testing Deck Class${RESET}`);
    
    const deck = new Deck([], 40);
    
    assert(deck.getSize() === 0, 'New deck is empty');
    assert(deck.isEmpty() === true, 'New deck isEmpty() returns true');
    
    const card1 = new Card('CARD_1', 'Card 1', 'ATTACK', 'Test', 1);
    const card2 = new Card('CARD_2', 'Card 2', 'DEFENSE', 'Test', 0);
    
    deck.addCard(card1);
    deck.addCard(card2);
    
    assert(deck.getSize() === 2, 'Cards added to deck');
    assert(deck.isEmpty() === false, 'isEmpty() returns false for non-empty deck');
    
    const drawn = deck.draw();
    assert(drawn.success === true, 'Card drawn successfully');
    assert(drawn.card.id === 'CARD_1', 'Card drawn from top of deck');
    assert(deck.getSize() === 1, 'Deck size reduced after draw');
    
    // Test shuffle
    const testDeck = createDefaultDeck();
    const originalOrder = testDeck.cards.map(c => c.id);
    testDeck.shuffle();
    const shuffledOrder = testDeck.cards.map(c => c.id);
    // Note: Shuffle might occasionally produce same order, so we just check it ran without error
    assert(testDeck.getSize() === 40, 'Deck shuffle works');
    
    // Test max size limit
    const fullDeck = new Deck([], 2);
    fullDeck.addCard(card1);
    fullDeck.addCard(card2);
    const overLimit = fullDeck.addCard(new Card('CARD_3', 'Card 3', 'ATTACK', 'Test', 1));
    assert(overLimit.success === false, 'Deck prevents exceeding max size');
}

/**
 * Test Hand class
 */
function testHand() {
    console.log(`\n${YELLOW}Testing Hand Class${RESET}`);
    
    const hand = new Hand(5);
    
    assert(hand.getSize() === 0, 'New hand is empty');
    assert(hand.isFull() === false, 'New hand is not full');
    
    const card1 = new Card('CARD_1', 'Card 1', 'ATTACK', 'Test', 1);
    const card2 = new Card('CARD_2', 'Card 2', 'DEFENSE', 'Test', 0);
    
    hand.addCard(card1);
    assert(hand.getSize() === 1, 'Card added to hand');
    assert(hand.getCard(0).id === 'CARD_1', 'Card retrieved by index');
    
    hand.addCard(card2);
    assert(hand.getSize() === 2, 'Second card added');
    
    // Test max hand size
    for (let i = 0; i < 3; i++) {
        hand.addCard(new Card(`CARD_${i+3}`, `Card ${i+3}`, 'UTILITY', 'Test', 0));
    }
    const overLimit = hand.addCard(new Card('CARD_OVERFLOW', 'Overflow', 'ATTACK', 'Test', 1));
    assert(overLimit.success === false, 'Hand prevents exceeding max size');
    assert(hand.isFull() === true, 'isFull() returns true when full');
    
    // Test playCard
    const played = hand.playCard(0);
    assert(played.success === true, 'Card played successfully');
    assert(played.card.id === 'CARD_1', 'Correct card played');
    assert(hand.getSize() === 4, 'Card removed from hand after play');
    
    // Test getCardsByType
    const attacks = hand.getCardsByType('ATTACK');
    assert(attacks.length > 0, 'getCardsByType works');
    
    // Test findCard
    const found = hand.findCard('Card 2');
    assert(found !== null, 'findCard locates card');
    assert(found.id === 'CARD_2', 'findCard returns correct card');
}

/**
 * Test DiscardPile class
 */
function testDiscardPile() {
    console.log(`\n${YELLOW}Testing DiscardPile Class${RESET}`);
    
    const pile = new DiscardPile();
    
    assert(pile.getSize() === 0, 'New discard pile is empty');
    
    const card1 = new Card('CARD_1', 'Card 1', 'ATTACK', 'Test', 1);
    const card2 = new Card('CARD_2', 'Card 2', 'DEFENSE', 'Test', 0);
    
    pile.addCard(card1);
    pile.addCard(card2);
    
    assert(pile.getSize() === 2, 'Cards added to discard pile');
    assert(pile.peekTop().id === 'CARD_2', 'peekTop returns last card');
    
    const all = pile.getAllCards();
    assert(all.length === 2, 'getAllCards returns all cards');
    assert(pile.getSize() === 0, 'Discard pile empty after getAllCards');
}

/**
 * Test CardEffect class
 */
function testCardEffect() {
    console.log(`\n${YELLOW}Testing CardEffect Class${RESET}`);
    
    const effect = new CardEffect('RADAR', { area: '3x3' });
    
    assert(effect.effectType === 'RADAR', 'Effect type is set');
    assert(effect.isActive === false, 'Effect starts inactive');
    
    effect.activate();
    assert(effect.isActive === true, 'Effect activates');
    
    effect.deactivate();
    assert(effect.isActive === false, 'Effect deactivates');
    
    const result = effect.execute();
    assert(result.success === true, 'Effect executes');
    assert(result.revealed === '3x3', 'Effect parameters used in execution');
}

/**
 * Test ExodiaChecker class
 */
function testExodiaChecker() {
    console.log(`\n${YELLOW}Testing ExodiaChecker Class${RESET}`);
    
    const checker = new ExodiaChecker(true);
    const hand = new Hand(10);
    
    assert(checker.getProgress(hand) === 0, 'Initial progress is 0');
    assert(checker.checkWin(hand) === false, 'No win with empty hand');
    
    // Add 4 Exodia parts
    hand.addCard(DEFAULT_CARD_DEFINITIONS['EXODIA_HEAD']);
    hand.addCard(DEFAULT_CARD_DEFINITIONS['EXODIA_LEFT_ARM']);
    hand.addCard(DEFAULT_CARD_DEFINITIONS['EXODIA_RIGHT_ARM']);
    hand.addCard(DEFAULT_CARD_DEFINITIONS['EXODIA_LEFT_LEG']);
    
    assert(checker.getProgress(hand) === 4, 'Progress updates correctly');
    assert(checker.checkWin(hand) === false, 'No win with 4 parts');
    
    // Add final part
    hand.addCard(DEFAULT_CARD_DEFINITIONS['EXODIA_RIGHT_LEG']);
    
    assert(checker.getProgress(hand) === 5, 'Progress complete');
    assert(checker.checkWin(hand) === true, 'Win condition met with all 5 parts');
    
    // Test disabled Exodia
    const disabledChecker = new ExodiaChecker(false);
    assert(disabledChecker.checkWin(hand) === false, 'Exodia disabled prevents win');
}

/**
 * Test PowerUpManager class
 */
function testPowerUpManager() {
    console.log(`\n${YELLOW}Testing PowerUpManager Class${RESET}`);
    
    const manager = new PowerUpManager(2);
    
    assert(manager.canUsePowerUp() === true, 'Can use power-up initially');
    assert(manager.getRemaining() === 2, 'Initially 2 power-ups remaining');
    
    const effect1 = new CardEffect('RADAR');
    manager.usePowerUp(effect1);
    
    assert(manager.usedThisTurn === 1, 'Power-up usage incremented');
    assert(manager.getRemaining() === 1, 'Remaining power-ups decreased');
    assert(manager.canUsePowerUp() === true, 'Can still use one more');
    
    const effect2 = new CardEffect('SHIELD');
    manager.usePowerUp(effect2);
    
    assert(manager.getRemaining() === 0, 'No power-ups remaining');
    assert(manager.canUsePowerUp() === false, 'Cannot use more power-ups');
    
    // Test reset
    manager.resetTurn();
    assert(manager.usedThisTurn === 0, 'usedThisTurn reset');
    assert(manager.getRemaining() === 2, 'Remaining power-ups reset');
    assert(manager.canUsePowerUp() === true, 'Can use power-ups again');
}

/**
 * Test default deck creation
 */
function testDefaultDeck() {
    console.log(`\n${YELLOW}Testing Default Deck Creation${RESET}`);
    
    const deck = createDefaultDeck();
    
    assert(deck.getSize() === 40, 'Default deck has 40 cards');
    
    // Check for required cards
    const cardIds = deck.cards.map(c => c.id);
    assert(cardIds.includes('EXODIA_HEAD'), 'Default deck includes Exodia Head');
    assert(cardIds.includes('RADAR'), 'Default deck includes Radar card');
    assert(cardIds.includes('STRIKE_1'), 'Default deck includes basic attack');
    
    // Test shuffle
    const deck2 = createDefaultDeck();
    deck2.shuffle();
    assert(deck2.getSize() === 40, 'Deck size unchanged after shuffle');
    
    // Draw initial hand
    const hand = new Hand(10);
    const drawnCards = deck2.drawMultiple(5);
    assert(drawnCards.length === 5, 'Can draw 5 cards for initial hand');
    assert(deck2.getSize() === 35, 'Deck size reduced after draw');
}

/**
 * Test Card Configuration
 */
function testCardConfig() {
    console.log(`\n${YELLOW}Testing Card Configuration${RESET}`);
    
    assert(CARD_CONFIG.deckSize === 40, 'Default deck size is 40');
    assert(CARD_CONFIG.startingHandSize === 5, 'Starting hand size is 5');
    assert(CARD_CONFIG.maxHandSize === 10, 'Max hand size is 10');
    assert(CARD_CONFIG.powerUpsPerTurn === 2, 'Default power-ups per turn is 2');
    assert(CARD_CONFIG.enableExodia === true, 'Exodia is enabled by default');
}

/**
 * Run all tests
 */
function runAllTests() {
    console.log(`${YELLOW}╔════════════════════════════════════════════╗${RESET}`);
    console.log(`${YELLOW}║     CARD SYSTEM UNIT TESTS                 ║${RESET}`);
    console.log(`${YELLOW}╚════════════════════════════════════════════╝${RESET}`);
    
    testCard();
    testDeck();
    testHand();
    testDiscardPile();
    testCardEffect();
    testExodiaChecker();
    testPowerUpManager();
    testDefaultDeck();
    testCardConfig();
    
    // Print summary
    console.log(`\n${YELLOW}═══════════════════════════════════════════${RESET}`);
    console.log(`${YELLOW}Test Summary:${RESET}`);
    console.log(`${GREEN}Passed: ${testsPassed}${RESET}`);
    console.log(`${RED}Failed: ${testsFailed}${RESET}`);
    console.log(`Total: ${testsRun}`);
    
    if (testsFailed === 0) {
        console.log(`\n${GREEN}✓ All tests passed!${RESET}`);
        process.exit(0);
    } else {
        console.log(`\n${RED}✗ Some tests failed${RESET}`);
        process.exit(1);
    }
}

// Run tests
runAllTests();
