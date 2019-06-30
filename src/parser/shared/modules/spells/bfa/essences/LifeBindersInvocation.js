import React from 'react';

import SPELLS from 'common/SPELLS/index';
import { formatNumber, formatDuration } from 'common/format';
import { calculatePrimaryStat } from 'common/stats';
import SpellLink from 'common/SpellLink';

import StatIcon from 'interface/icons/PrimaryStat';
import ItemHealingDone from 'interface/others/ItemHealingDone';
import STATISTIC_CATEGORY from 'interface/others/STATISTIC_CATEGORY';
import ItemStatistic from 'interface/statistics/ItemStatistic';
import StatisticGroup from 'interface/statistics/StatisticGroup';

import calculateEffectiveHealing from 'parser/core/calculateEffectiveHealing';
import Analyzer, { SELECTED_PLAYER } from 'parser/core/Analyzer';
import Events from 'parser/core/Events';
import Abilities from 'parser/core/modules/Abilities';
import Combatants from 'parser/shared/modules/Combatants';

//https://www.warcraftlogs.com/reports/wg7GpmZxhat6TLjV#fight=41&source=44
class TheEverRisingTide extends Analyzer {
  static dependencies = {
    abilities: Abilities,
    combatants: Combatants,
  };
  burstHealing = 0;
  numBursts = 0;
  numBuffsRemoved = 0; // num timed out = numBuffsRemoved - numBursts
  healingOverTime = 0;
  stat = 0;

  constructor(...args) {
    super(...args);
    this.active = this.selectedCombatant.hasEssence(SPELLS.LIFE_BINDERS_INVOCATION.traitId);
    if (!this.active) {
      return;
    }
    this.hasMajor = this.selectedCombatant.hasMajor(SPELLS.LIFE_BINDERS_INVOCATION.traitId);
    this.stat = calculatePrimaryStat(420, 1569, this.selectedCombatant.neck.itemLevel);

    this.abilities.add({
      spell: SPELLS.LIFE_BINDERS_INVOCATION_MAJOR,
      category: Abilities.SPELL_CATEGORIES.ITEMS,
      cooldown: 180,
    });

    this.addEventListener(Events.cast.by(SELECTED_PLAYER).spell(SPELLS.LIFE_BINDERS_INVOCATION_MAJOR_ABILITY), this._cast);
    this.addEventListener(Events.applybuff.by(SELECTED_PLAYER).spell(SPELLS.LIFE_BINDERS_INVOCATION_HEAL_ON_DAMAGE_BUFF), this._applyBuff);
    this.addEventListener(Events.removebuff.by(SELECTED_PLAYER).spell(SPELLS.LIFE_BINDERS_INVOCATION_HEAL_ON_DAMAGE_BUFF), this._removebuff);
    this.addEventListener(Events.applybuffstack.by(SELECTED_PLAYER).spell(SPELLS.LIFE_BINDERS_INVOCATION_HEAL_ON_DAMAGE_BUFF), this._applyBuff);
    this.addEventListener(Events.applybuff.by(SELECTED_PLAYER).spell(SPELLS.LIFE_BINDERS_INVOCATION_HEAL_OVER_TIME_BUFF), this._applyBuff);
    this.addEventListener(Events.applybuffstack.by(SELECTED_PLAYER).spell(SPELLS.LIFE_BINDERS_INVOCATION_HEAL_OVER_TIME_BUFF), this._applyBuff);
    this.addEventListener(Events.heal.by(SELECTED_PLAYER), this._onHeal);
    this.addEventListener(Events.fightend, this._fightend);
  }

  casts = 0;
  byCast = {};
  _cast(event) {
    console.log(event.ability.name + " " + event.timestamp);
    //console.log(event.ability)
    this.casts += 1;
    this.byCast[this.casts] = {
      timestamp: event.timestamp,
      healing: 0,
      maxStacks: 0,
    };
  }

  _onHeal(event) {
    if(SPELLS.LIFE_BINDERS_INVOCATION_HEAL_ON_DAMAGE_BUFF.id === event.ability.guid)
    {
      console.log(event.ability.guid);
      this.burstHealing += event.healing;
      this.numBursts += 1;
    }
    else if(SPELLS.LIFE_BINDERS_INVOCATION_HEAL_OVER_TIME_BUFF.id === event.ability.guid) {
      //console.log(event.ability.guid);
      this.healingOverTime += event.healing;
    }

    
    //if (!this.buffActive) {
    //  return;
    //}
    //this.byCast[this.casts].healing += calculateEffectiveHealing(event, OVERCHARGE_MANA_HEALING_INCREASE_PER_STACK * this.stacks);
  }

  _applyBuff(event) {
    //console.log(event)
    console.log("applied to " + event.targetID + " at " + event.timestamp);
    //const target = this.combatants.getEntity(event);
    //if (!target) {
    //  return; // target wasn't important (a pet probably)
    //}
    //console.log(target)
    //this..hasBuff(SPELLS.INNERVATE.id)
    //console.log(event)
    //console.log(event);
    // this.buffActive = true;
    if(event.stack){
      console.log("Multistack: " + event.stack);
    }
    else 
    {
      console.log("Single stack");
    }
    // this.stacks = event.stack || 1;
  }

  _removebuff(event) {
    this.numBuffsRemoved += 1;
    console.log("removed from " + event.targetID + " at " + event.timestamp);

    // this.byCast[this.casts].maxStacks = this.stacks;
    // this.buffActive = false;
  }


  _fightend(event) {
    console.log('fight over');
    // if (this.buffActive) {
      // this.byCast[this.casts].maxStacks = this.stacks;
    // }
  }

  get manaLost() {
    //return this.selectedCombatant.getBuffUptime(SPELLS.EVER_RISING_TIDE_CHARGING_BUFF.id) / 1000 * MANA_REGEN_PER_SECOND;
  }

  get minorBuffUptime() {
    //return this.selectedCombatant.getBuffUptime(SPELLS.EVER_RISING_TIDE_STAT_BUFF.id) / this.owner.fightDuration;
  }

  get healing() {
    //return Object.values(this.byCast).reduce((acc, cast) => acc + cast.healing, 0);
  }

  statistic() {
    //const nth = (number) => number + (["st", "nd", "rd"][((number + 90) % 100 - 10) % 10 - 1] || "th");
    const rank = this.selectedCombatant.essenceRank(SPELLS.LIFE_BINDERS_INVOCATION.traitId);
    return (
      <StatisticGroup category={STATISTIC_CATEGORY.ITEMS}>
        <ItemStatistic ultrawide>
          <div className="pad">
            <label><SpellLink id={SPELLS.LIFE_BINDERS_INVOCATION.id} /> - Minor Rank {rank}</label>
            <div className="value">
              <label>hello</label>
            </div>
          </div>
        </ItemStatistic>
        {this.hasMajor && (
          <ItemStatistic
            ultrawide
            size="flexible">
            <div className="pad">
              <label><SpellLink id={SPELLS.LIFE_BINDERS_INVOCATION_MAJOR.id} /> - Major Rank {rank}</label>
            </div>
          </ItemStatistic>
        )}
      </StatisticGroup>
    );
  }
}

export default TheEverRisingTide;
