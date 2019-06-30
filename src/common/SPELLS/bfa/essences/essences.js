/**
 * All azerite essences go in here.
 * You need to do this manually, usually an easy way to do this is by opening a WCL report and clicking the icons of spells to open the relevant Wowhead pages, here you can get the icon name by clicking the icon, copy the name of the spell and the ID is in the URL.
 * You can access these entries like other entries in the spells files by importing `common/SPELLS` and using the assigned property on the SPELLS object. Please try to avoid abbreviating properties.
 */

 // Trait IDs
  //   2 = "Azeroth's Undying Gift"
  //   3 = "Sphere of Suppression"
  //   4 = "Worldvein Resonance"
  //   5 = "Essence of the Focusing Iris"
  //   6 = "Purification Protocol"
  //   7 = "Anima of Life and Death"
  //  12 = "The Crucible of Flame"
  //  13 = "Nullification Dynamo"
  //  14 = "Condensed Life-Force"
  //  15 = "Ripple in Space"
  //  17 = "The Ever-Rising Tide"
  //  18 = "Artifice of Time"
  //  19 = "The Well of Existence"
  //  20 = "Life-Binder's Invocation"
  //  21 = "Vitality Conduit"
  //  22 = "Vision of Perfection"
  //  23 = "Blood of the Enemy"
  //  25 = "Aegis of the Deep"
  //  27 = "Memory of Lucid Dreams"
  //  28 = "The Unbound Force"
  //  32 = "Conflict and Strife"

// ert example https://www.warcraftlogs.com/reports/8Nd4KCZXPVpyM62b#fight=last&source=1
// lucicd dreams https://www.warcraftlogs.com/reports/hZtFTLqrnCDbkAdM#fight=1&source=2&type=auras
// artifice of time https://www.warcraftlogs.com/reports/Zy79xqD6kCcTNRAr#fight=last&source=132
// ripple in space https://www.warcraftlogs.com/reports/xyQvtHA3kfzGJwFa#fight=10&type=damage-done&source=79&ability=302770
// Life binder's https://www.warcraftlogs.com/reports/wg7GpmZxhat6TLjV#fight=41&source=44

  
export default {
  EVER_RISING_TIDE: {
    id: 299879,
    traitId: 17,
    name: 'The Ever-Rising Tide',
    icon: 'inv_elemental_mote_mana',
  },
  EVER_RISING_TIDE_MAJOR: {
    id: 299876,
    name: 'Overcharge Mana',
    icon: 'spell_azerite_essence09',
  },
  EVER_RISING_TIDE_HEALING_BUFF: {
    id: 299624,
    name: 'Overcharge Mana',
    icon: 'spell_azerite_essence09',
  },
  EVER_RISING_TIDE_CHARGING_BUFF: {
    id: 296072,
    name: 'Overcharge Mana',
    icon: 'spell_azerite_essence09',
  },
  EVER_RISING_TIDE_STAT_BUFF: {
    id: 296059,
    name: 'The Ever-Rising Tide',
    icon: 'inv_elemental_mote_mana',
  },
  EVER_RISING_TIDE_ENERGIZE: {
    id: 296065,
    name: 'The Ever-Rising Tide',
    icon: 'inv_elemental_mote_mana',
  },
  
  LIFE_BINDERS_INVOCATION: {
    id: 299940,
    traitId: 20,
    name: 'Life Binder\'s Invocation',
    icon: 'inv_farm_herbseed',
  },
  LIFE_BINDERS_INVOCATION_MAJOR: {
    id: 299944,
    name: 'Life-Binder\'s Invocation',
    icon: 'spell_azerite_essence07',
  },
  LIFE_BINDERS_INVOCATION_MAJOR_ABILITY: {
    id: 293032,
    name: 'Life-Binder\'s Invocation',
    icon: 'spell_azerite_essence07',
  },
  LIFE_BINDERS_INVOCATION_HEAL_ON_DAMAGE_BUFF: {
    id: 296211,
    name: 'Seed of Eonar',
    icon: 'inv_farm_herbseed',
  },
  LIFE_BINDERS_INVOCATION_HEAL_OVER_TIME_BUFF: {
    id: 296212,
    name: 'Seed of Eonar',
    icon: 'inv_farm_herbseed',
  },
};
