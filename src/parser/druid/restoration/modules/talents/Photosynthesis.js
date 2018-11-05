import React from 'react';

import StatisticBox from 'interface/others/StatisticBox';

import SPELLS from 'common/SPELLS';
import SpellIcon from 'common/SpellIcon';

import { formatPercentage } from 'common/format';

import Analyzer from 'parser/core/Analyzer';
import Combatants from 'parser/shared/modules/Combatants';
import calculateEffectiveHealing from 'parser/core/calculateEffectiveHealing';
import { HOTS_AFFECTED_BY_ESSENCE_OF_GHANIR } from '../../constants';

const PHOTOSYNTHESIS_HOT_INCREASE = 0.2;
// Spring blossoms double dips, confirmed by Bastas
const PHOTOSYNTHESIS_SB_INCREASE = 0.44;
const BLOOM_BUFFER_MS = 32;
const LIFEBLOOM_DURATION_MS = 15000;
//TODO Repalce this with 0.7 and do LIFEBLOOM_DURATION * PANDEMIC_COEF or w/e
const PANDEMIC_BUFFER_MS = 4500;

  function logLB(str, obj, evt){
      const time = (evt.timestamp - obj.firstTime) / 1000.0;
      console.log(`${str}: ${time}`);
      //console.log(obj.lastRealBloomTimestamp);
      //console.log((evt.timestamp - obj.firstTime) / 1000.0);
      //console.log(evt.timestamp - obj.lastRealBloomTimestamp);
  }

/*
While your Lifebloom is on yourself, your periodic heals heal 20% faster.

While your Lifebloom is on an ally, your periodic heals on them have a 5% chance to cause it to bloom.
 */
class Photosynthesis extends Analyzer {
  static dependencies = {
    combatants: Combatants,
  };

  lifebloomIncrease = 0;
  firstCast = false;
  firstTime = 0;
  lastLifebloomCast = null;
  lastLifebloomTargetID = null;
  lastLifebloomDuration = null;
  allBloomTimes = [];
  allBloomAmounts = [];
  naturalBloomTimes = [];
  

  // Counters for increased ticking rate of hots
  increasedRateRejuvenationHealing = 0;
  increasedRateWildGrowthHealing = 0;
  increasedRateCenarionWardHealing = 0;
  increasedRateCultivationHealing = 0;
  increasedRateLifebloomHealing = 0;
  increasedRateRegrowthHealing = 0;
  increasedRateTranqHealing = 0;
  increasedRateSpringBlossomsHealing = 0;
  increasedRateEffloHealing = 0;
  increasedRateGroveTendingHealing = 0;

  constructor(...args) {
    super(...args);
    this.active = this.selectedCombatant.hasTalent(SPELLS.PHOTOSYNTHESIS_TALENT.id);
  }
  
  on_byPlayer_cast(event){
    //For debugging. Not sure if theres a way to get like the first time
    if (this.firstCast === false){
        this.firstCast = true;
        this.firstTime = event.timestamp;
    }
    
    //The problem with this is changing targets on bloom does not trigger a refresh 
    //it has to be the same target
    if(event.ability.guid === SPELLS.LIFEBLOOM_HOT_HEAL.id) {
        logLB("LBCast", this, event);
        console.log(event.targetID);
        
        var extraPandemicTime = 0
        if(this.lastLifebloomCast !== null) {
          if(event.targetID === this.lastLifebloomTargetID)
          {
            extraPandemicTime = PANDEMIC_BUFFER_MS;
            const timeDelta = event.timestamp - this.lastLifebloomCast;
            console.log(`${(timeDelta) / 1000.0} since last lifebloom`);
            const lbTimeRemaining = this.lastLifebloomDuration - timeDelta;
            if(lbTimeRemaining > 0 && lbTimeRemaining <= PANDEMIC_BUFFER_MS)
            {
              logLB(`Refresh w ${lbTimeRemaining} remaining`, this, event);
              this.naturalBloomTimes.push(event.timestamp);
            }
          }
        }
        this.lastLifebloomDuration = LIFEBLOOM_DURATION_MS + extraPandemicTime;
        this.lastLifebloomTargetID = event.targetID;
        this.lastLifebloomCast = event.timestamp;
    }
    
    if(event.ability.guid === SPELLS.LIFEBLOOM_BLOOM_HEAL.id) {
        logLB("Bloom Cast?", this, event);
    }
    
  }

  on_byPlayer_removebuff(event){
    const spellId = event.ability.guid;
    if(spellId !== SPELLS.LIFEBLOOM_HOT_HEAL.id) {
      return;
    }
    
    logLB("LBEnd", this, event);
    this.naturalBloomTimes.push(event.timestamp);
    this.lastRealBloomTimestamp = event.timestamp;
  }

  on_byPlayer_heal(event) {
    const spellId = event.ability.guid;
    
    if(event.ability.guid === SPELLS.LIFEBLOOM_BLOOM_HEAL.id) {
        logLB("Bloom Heal", this, event);
        this.allBloomTimes.push(event.timestamp);
        this.allBloomAmounts.push(event.amount);
    }
    
    //
    //Previous link only ever used lifebloom on himself
    //https://www.warcraftlogs.com/reports/V2KzrCJXFkYhvWpM#fight=45&type=healing&source=9
    //
      

    // Yes it actually buffs efflorescence, confirmed by Voulk and Bastas
    if(this.selectedCombatant.hasBuff(SPELLS.LIFEBLOOM_HOT_HEAL.id, null, 0, 0, this.selectedCombatant.sourceID) && (HOTS_AFFECTED_BY_ESSENCE_OF_GHANIR.includes(spellId) || spellId === SPELLS.EFFLORESCENCE_HEAL.id || spellId === SPELLS.SPRING_BLOSSOMS.id)) {
      switch (spellId) {   
        case SPELLS.REJUVENATION.id:
          this.increasedRateRejuvenationHealing += calculateEffectiveHealing(event, PHOTOSYNTHESIS_HOT_INCREASE);
          break;
        case SPELLS.REJUVENATION_GERMINATION.id:
          this.increasedRateRejuvenationHealing += calculateEffectiveHealing(event, PHOTOSYNTHESIS_HOT_INCREASE);
          break;
        case SPELLS.WILD_GROWTH.id:
          this.increasedRateWildGrowthHealing += calculateEffectiveHealing(event, PHOTOSYNTHESIS_HOT_INCREASE);
          break;
        case SPELLS.CENARION_WARD_HEAL.id:
          this.increasedRateCenarionWardHealing += calculateEffectiveHealing(event, PHOTOSYNTHESIS_HOT_INCREASE);
          break;
        case SPELLS.CULTIVATION.id:
          this.increasedRateCultivationHealing += calculateEffectiveHealing(event, PHOTOSYNTHESIS_HOT_INCREASE);
          break;
        case SPELLS.LIFEBLOOM_HOT_HEAL.id:
          this.increasedRateLifebloomHealing += calculateEffectiveHealing(event, PHOTOSYNTHESIS_HOT_INCREASE);
          break;
        case SPELLS.SPRING_BLOSSOMS.id:
          this.increasedRateSpringBlossomsHealing += calculateEffectiveHealing(event, PHOTOSYNTHESIS_SB_INCREASE);
          break;
        case SPELLS.EFFLORESCENCE_HEAL.id:
          this.increasedRateEffloHealing += calculateEffectiveHealing(event, PHOTOSYNTHESIS_HOT_INCREASE);
          break;
        case SPELLS.GROVE_TENDING.id:
          this.increasedRateGroveTendingHealing += calculateEffectiveHealing(event, PHOTOSYNTHESIS_HOT_INCREASE);
          break;
        case SPELLS.REGROWTH.id:
          if (event.tick === true) {
            this.increasedRateRegrowthHealing += calculateEffectiveHealing(event, PHOTOSYNTHESIS_HOT_INCREASE);
          }
          break;
        case SPELLS.TRANQUILITY_HEAL.id:
          if (event.tick === true) {
            this.increasedRateTranqHealing += calculateEffectiveHealing(event, PHOTOSYNTHESIS_HOT_INCREASE);
          }
          break;
        default:
          console.error('Photosynthesis: Error, could not identify this object as a HoT: %o', event);
      }
    }
  }
  
  on_finished() { 
    console.log(`${this.naturalBloomTimes.length} naturals`)
    while(this.naturalBloomTimes.length > 0) {
      const naturalBloomTime = this.naturalBloomTimes[0];
      if (this.allBloomTimes.length <= 0) {
        console.log(`breaking, still ${this.naturalBloomTimes.length} nats`);
        while(this.naturalBloomTimes.length > 0){
          console.log(`nat: ${(this.naturalBloomTimes.shift() - this.firstTime) / 1000.0}`)
        }
        break;
      }
      const nextBloomTime = this.allBloomTimes.shift();
      const nextBloomAmount = this.allBloomAmounts.shift();
      var bloomDelta = Math.abs(naturalBloomTime - nextBloomTime);

      console.log(`Bloom at ${(naturalBloomTime - this.firstTime) / 1000.0}. Next is ${(nextBloomTime- this.firstTime) / 1000.0}. Delta: ${bloomDelta}`);  
      if (bloomDelta <= BLOOM_BUFFER_MS) {
        this.naturalBloomTimes.shift()
        console.log('^Natural^')
      } else {
        this.lifebloomIncrease += nextBloomAmount;
        console.log('^Photo^')
      }
    }    
  }

  statistic() {
    const totalPercent = this.owner.getPercentageOfTotalHealingDone(
      this.increasedRateRejuvenationHealing
      + this.increasedRateWildGrowthHealing
      + this.increasedRateCenarionWardHealing
      + this.increasedRateCultivationHealing
      + this.increasedRateLifebloomHealing
      + this.increasedRateRegrowthHealing
      + this.increasedRateTranqHealing
      + this.increasedRateSpringBlossomsHealing
      + this.increasedRateEffloHealing
      + this.increasedRateGroveTendingHealing
      + this.lifebloomIncrease);
    const sourceID = this.selectedCombatant._combatantInfo.sourceID;
    const selfUptime = this.selectedCombatant.getBuffUptime(SPELLS.LIFEBLOOM_HOT_HEAL.id, sourceID);
    const totalUptime =
      Object.keys(this.combatants.players)
          .map(key => this.combatants.players[key])
          .reduce((uptime, player) => uptime + player.getBuffUptime(SPELLS.LIFEBLOOM_HOT_HEAL.id), sourceID);

    return (
      <StatisticBox
        icon={<SpellIcon id={SPELLS.PHOTOSYNTHESIS_TALENT.id} />}
        value={`${formatPercentage(totalPercent)} %`}
        label={'Photosynthesis'}
        tooltip={`
            Healing contribution (right now random lifebloom blooms are not accounted for, thus potentially showing lower value than the actual gain).
            <ul>
              <li>Rejuvenation: <b>${formatPercentage(this.owner.getPercentageOfTotalHealingDone(this.increasedRateRejuvenationHealing))} %</b></li>
              <li>Wild Growth: <b>${formatPercentage(this.owner.getPercentageOfTotalHealingDone(this.increasedRateWildGrowthHealing))} %</b></li>
              <li>Cenarion Ward: <b>${formatPercentage(this.owner.getPercentageOfTotalHealingDone(this.increasedRateCenarionWardHealing))} %</b></li>
              <li>Cultivation: <b>${formatPercentage(this.owner.getPercentageOfTotalHealingDone(this.increasedRateCultivationHealing))} %</b></li>
              <li>Lifebloom HoT: <b>${formatPercentage(this.owner.getPercentageOfTotalHealingDone(this.increasedRateLifebloomHealing))} %</b></li>
              <li>Regrowth HoT: <b>${formatPercentage(this.owner.getPercentageOfTotalHealingDone(this.increasedRateRegrowthHealing))} %</b></li>
              <li>Tranquility HoT: <b>${formatPercentage(this.owner.getPercentageOfTotalHealingDone(this.increasedRateTranqHealing))} %</b></li>
              <li>Spring blossoms: <b>${formatPercentage(this.owner.getPercentageOfTotalHealingDone(this.increasedRateSpringBlossomsHealing))} %</b></li>
              <li>Efflorescence: <b>${formatPercentage(this.owner.getPercentageOfTotalHealingDone(this.increasedRateEffloHealing))} %</b></li>
              <li>Grove Tending: <b>${formatPercentage(this.owner.getPercentageOfTotalHealingDone(this.increasedRateGroveTendingHealing))} %</b></li>
              <hr>
              <li>Total HoT increase part: <b>${formatPercentage(totalPercent-this.owner.getPercentageOfTotalHealingDone(this.lifebloomIncrease))} %</b></li>
              <li>Lifebloom random bloom: <b>${formatPercentage(this.owner.getPercentageOfTotalHealingDone(this.lifebloomIncrease))} %</b></li>
            </ul>
            Lifebloom uptime
            <ul>
              <li>On Self: <b>${formatPercentage(selfUptime/ this.owner.fightDuration)} %</b>
              <li>On Others: <b>${formatPercentage((totalUptime - selfUptime) / this.owner.fightDuration)} %</b>
            </ul>
        `}
      />
    );
  }
}

export default Photosynthesis;
