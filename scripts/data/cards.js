class Card {
  constructor(data) {
    if (!data.id || !data.name) {
      throw new Error("Card must have an id and name");
    }
    this.id = data.id;
    this.name = data.name;
  }
}

class DungeonCard extends Card {
  constructor(data) {
    super(data);
    this.icons = data.icons || "";
    this.linkedResultId = data.linkedResultId || [];
    this.abilities = data.abilities || [];
    this.effects = data.effects || [];
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

export { DungeonCard, EnemyCard, LootCard, TrapCard, RaceCard, ClassCard, TrappingsCard };