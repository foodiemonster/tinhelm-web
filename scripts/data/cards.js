class Card {
  constructor(data) {
    if (!data.id || !data.name) {
      throw new Error("Card must have an id and name");
    }
    this.id = data.id;
    this.name = data.name;
    this.image = data.image || '';
  }
}

class DungeonCard extends Card {
  constructor(data) {
    super(data);
    this.icons = data.icons || "";
    this.linkedResultId = data.linkedResultId || [];
    this.abilities = data.abilities || [];
    this.effects = data.effects || [];
    this.enemy = data.enemy || null; // Added enemy property
    this.trap = data.trap || null; // Added trap property
    this.random = data.random || null; // Added random property
    this.loot = data.loot || null; // Added loot property
  }
}

class EnemyCard extends Card {
  constructor(data) {
    super(data);
    this.health = data.health || 0;
    this.attack = data.attack || 0;
    this.defense = data.defense || 0;
    this.favor = data.favor || 0;
    this.enemyType = data.enemyType || null;
    this.abilities = data.abilities || [];
    this.effects = data.effects || [];
  }
}

class LootCard extends Card {
  constructor(data) {
    super(data);
    this.abilities = data.abilities || [];
    this.effects = data.effects || [];
  }
}

class TrapCard extends Card {
  constructor(data) {
    super(data);
    this.abilities = data.abilities || [];
    this.effects = data.effects || [];
  }
}

class RaceCard extends Card {
  constructor(data) {
    super(data);
    this.classRestriction = data.classRestriction || null;
    this.health = data.health || 0;
    this.energy = data.energy || 0;
    this.rations = data.rations || 0;
    this.abilities = data.abilities || [];
    this.effects = data.effects || [];
  }
}

class ClassCard extends Card {
  constructor(data) {
    super(data);
    // Copy all properties from data to this instance (including bonus fields)
    Object.assign(this, data);
    // Ensure required fields are present (fallbacks)
    this.startingTrapping = data.startingTrapping || null;
    this.healthModifier = data.healthModifier || 0;
    this.energyModifier = data.energyModifier || 0;
    this.abilities = data.abilities || [];
    this.effects = data.effects || [];
  }
}

class TrappingsCard extends Card {
    constructor(data) {
        super(data);
        this.abilities = data.abilities || [];
        this.effects = data.effects || [];
    }
}


// Function to load JSON data
async function loadJsonData(filePath) {
  try {
    const response = await fetch(filePath);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Failed to load ${filePath}:`, error);
    return [];
  }
}

// Fisher-Yates (aka Knuth) Shuffle algorithm
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]]; // Swap elements
    }
    return array;
}

// Global variables to hold the card data and decks
let allCards = {};
let dungeonDeck = [];
let dungeonResultDeck = [];
// Add other decks as needed (enemy, loot, etc.)

// Function to load all card data and initialize decks
async function loadCardData() {
    console.log("Loading card data...");
    const [classesData, dungeonResultData, dungeonRoomData, enemyData, lootData, raceData, referenceData, trappingsData] = await Promise.all([
        loadJsonData('data/class.json'),
        loadJsonData('data/dungeonResult.json'),
        loadJsonData('data/dungeonRoom.json'),
        loadJsonData('data/enemy.json'),
        loadJsonData('data/loot.json'),
        loadJsonData('data/race.json'),
        loadJsonData('data/reference.json'),
        loadJsonData('data/trappings.json')
    ]);

    // Store all loaded data keyed by ID for easy lookup
    allCards = {
        ...classesData.reduce((acc, card) => ({ ...acc, [card.id]: new ClassCard(card) }), {}),
        ...dungeonResultData.reduce((acc, card) => ({ ...acc, [card.id]: new DungeonCard(card) }), {}), // Using DungeonCard for results as well, might need a specific class if they differ significantly
        ...dungeonRoomData.reduce((acc, card) => ({ ...acc, [card.id]: new DungeonCard(card) }), {}),
        ...enemyData.reduce((acc, card) => ({ ...acc, [card.id]: new EnemyCard(card) }), {}),
        ...lootData.reduce((acc, card) => ({ ...acc, [card.id]: new LootCard(card) }), {}),
        ...raceData.reduce((acc, card) => ({ ...acc, [card.id]: new RaceCard(card) }), {}),
        ...referenceData.reduce((acc, card) => ({ ...acc, [card.id]: new Card(card) }), {}), // Assuming Reference cards are just basic cards
        ...trappingsData.reduce((acc, card) => ({ ...acc, [card.id]: new TrappingsCard(card) }), {})
    };

    // Initialize decks (example: Dungeon Room and Result decks)
    dungeonDeck = shuffleArray(dungeonRoomData.map(cardData => allCards[cardData.id]));
    dungeonResultDeck = shuffleArray(dungeonResultData.map(cardData => allCards[cardData.id]));
    // Initialize other decks here if needed

    console.log("Card data loaded and decks initialized.");
}

// Function to draw a card from a deck
function drawCard(deck) {
    if (deck.length > 0) {
        return deck.pop(); // Remove and return the last card
    } else {
        console.warn("Attempted to draw from an empty deck!");
        return null;
    }
}

// Function to get a card by its ID
function getCardById(cardId) {
    return allCards[cardId] || null;
    }

// Function to expose all loaded cards
function getAllCardsData() {
    return allCards;
}

export { DungeonCard, EnemyCard, LootCard, TrapCard, RaceCard, ClassCard, TrappingsCard, loadCardData, drawCard, getCardById, dungeonDeck, dungeonResultDeck, getAllCardsData };
