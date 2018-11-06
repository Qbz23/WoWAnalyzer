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
  
  //Refresh event happens after cast event so need to store two times to check for pandemic in refresh
  lastLifebloomCastTime = null;
  lastLifebloomDuration = null;
  currentLifebloomCastTime = null;
  lbWasRefreshed = false;
  potentialFirstBloomTime = null;
  lastNaturalBloomTime = null;
  
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
  
  //TODO is all this even necessary? its more guarunteed to be correct but I wonder if 
  //it will have the same results if i just set every refresh and end. 
  //The only risk is a photo bloom happening within the bloom buffer 
  //Isn't that what was in here before though? What was the problem with that? 
  
  //Hm I'm not sure this is correct. This is basically a more complicated version of the first commented uot implementation
  //But it has the two pass implementation commented out 
  //This similarly has the problem of the first example where the bloom can potentially come before an end 
  //However, the same two pass shell might be able to have a much simpler imlpementation of basically the first implementation 
  //but in two passes 
  
  on_byPlayer_cast(event){
    //For debugging. Not sure if theres a way to get the first time
    if (this.firstCast === false){
        this.firstCast = true;
        this.firstTime = event.timestamp;
    }
    
    if(event.ability.guid !== SPELLS.LIFEBLOOM_HOT_HEAL.id) {
      return;
    }
    
    logLB(`lbcast`, this, event);
    
    //First cast
    if(this.currentLifebloomCastTime === null){
      this.lastLifebloomCastTime = event.timestamp;
      this.currentLifebloomCastTime = event.timestamp;
      this.lastLifebloomDuration = LIFEBLOOM_DURATION_MS;
      return;
    }
    
    //If refreshed, on_byPlayer_refreshBuff sets duration considering pandemic time
    //If this is second cast since a refresh (lbWasRefreshed == false), set duration to default 
    if (this.lbWasRefreshed) {
      this.lbWasRefreshed = false;
    } else {
      this.lastLifebloomDuration = LIFEBLOOM_DURATION_MS;
    }
    
    this.lastLifebloomCastTime = this.currentLifebloomCastTime; 
    this.currentLifebloomCastTime = event.timestamp;
  }

  on_byPlayer_refreshbuff(event) {
    const spellId = event.ability.guid;
    if (spellId !== SPELLS.LIFEBLOOM_HOT_HEAL.id){
      return;
    }
    
    logLB("Event Refresh", this, event);
    
    //Refreshing first lifebloom, no way to know if going to bloom via pandemic
    if(this.currentLifebloomCastTime === this.lastLifebloomCastTime){
      this.lastNaturalBloomTime = event.timestamp;
      this.lbWasRefreshed = true;
      return;
    }
    
    //Check for bloom and set duration considering pandemic window
    const lbTimeRemaining = this.lastLifebloomDuration - (event.timestamp - this.lastLifebloomCastTime)
    console.log(`lbtime ${lbTimeRemaining}`);
    if (lbTimeRemaining <= PANDEMIC_BUFFER_MS) {
      logLB("Pandemic", this, event);
      this.lastLifebloomDuration = LIFEBLOOM_DURATION_MS + lbTimeRemaining;
      logLB("Natural", this, event);
      //this.naturalBloomTimes.push(event.timestamp);
      this.lastNaturalBloomTime = event.timestamp;
    } else {
      this.lastLifebloomDuration = LIFEBLOOM_DURATION_MS + PANDEMIC_BUFFER_MS;
    }
    
    this.lbWasRefreshed = true;
  }
  
  on_byPlayer_removebuff(event){
    const spellId = event.ability.guid;
    if(spellId !== SPELLS.LIFEBLOOM_HOT_HEAL.id) {
      return;
    }
    
    const lbDuration = event.timestamp - this.currentLifebloomCastTime;
    logLB(`LBEnd on target ${event.targetID}. Dur: ${lbDuration}`, this, event);
    
    //Lifebloom end before first cast
    //no way to know if due to changed target or bloom expire, check at end
    if(this.currentLifebloomCastTime === null) {
      this.lastNaturalBloomTime = event.timestamp;
      return;
    }
    
    //Ensure expired and not removed due to changed target 
    if(event.timestamp - this.currentLifebloomCastTime >= this.lastLifebloomDuration - BLOOM_BUFFER_MS){
      //this.naturalBloomTimes.push(event.timestamp);
      logLB("Natural", this, event);
      this.lastNaturalBloomTime = event.timestamp;
    }
  }

  on_byPlayer_heal(event) {
    const spellId = event.ability.guid;
   
    //
    //expect 3.58%
    //https://www.warcraftlogs.com/reports/V2KzrCJXFkYhvWpM#fight=45&type=healing&source=9
    //Has premature refresh
    //https://www.warcraftlogs.com/reports/fABq12hGtW3yxaNz#fight=5&type=healing&source=19 
    //Has target swap, expect 4 natural blooms. 6 total casts, 1 target swap, 1 still on at end of fight 
    //https://www.warcraftlogs.com/reports/7GNMc4kDfgwFKV1n#fight=40&type=healing&source=7
    //   
    
    //Track every bloom, seperate natural from photo at end 
    if(event.ability.guid === SPELLS.LIFEBLOOM_BLOOM_HEAL.id && event.timestamp - this.lastNaturalBloomTime > BLOOM_BUFFER_MS) {
        //logLB("Bloom Heal", this, event);
        //this.allBloomTimes.push(event.timestamp);
        //this.allBloomAmounts.push(event.amount);
        logLB('photo bloom', this, event);
        this.lifebloomIncrease += event.amount;
    } else if (event.ability.guid === SPELLS.LIFEBLOOM_BLOOM_HEAL.id ) {
      logLB('natural bloom', this, event);
    }
   
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
  
  //If a druid pre-casts life bloom, this will misattribute that bloom to photosynthesis 
  // on_finished() { 
    // console.log(`${this.naturalBloomTimes.length} naturals`)

    // //Check for blooms from prehots
    // //If potentialFirstBloomTime lines up with a bloom, that bloom wasn't photo 
    // //if it doesnt line up, it was either a premature refresh or buff end due to changed target 
    // if(this.potentialFirstBloomTime != null){
      // for(var i = 0; i < this.allBloomTimes.length; i += 1){
        // const delta = this.potentialFirstBloomTime - this.allBloomTimes[i];
        // //If ahead by more than fuzz buffer, won't find a bloom, can early exit
        // if(delta < -BLOOM_BUFFER_MS){
          // break;
        // } else if (delta >= -BLOOM_BUFFER_MS && delta <= BLOOM_BUFFER_MS) {
          // this.allBloomTimes.splice(i, 1);
          // this.allBloomAmounts.splice(i, 1);
          // console.log(`Found prehot natural at ${(this.potentialFirstBloomTime - this.firstTime) / 1000.0}`)
        // }
      // }
    // }
    
    // while(this.naturalBloomTimes.length > 0) {
      // const naturalBloomTime = this.naturalBloomTimes[0];
      // if (this.allBloomTimes.length <= 0) {
        // console.log(`breaking, still ${this.naturalBloomTimes.length} nats`);
        // while(this.naturalBloomTimes.length > 0){
          // console.log(`nat: ${(this.naturalBloomTimes.shift() - this.firstTime) / 1000.0}`)
        // }
        // break;
      // }
      // const nextBloomTime = this.allBloomTimes.shift();
      // const nextBloomAmount = this.allBloomAmounts.shift();
      // var bloomDelta = Math.abs(naturalBloomTime - nextBloomTime);

      // console.log(`Bloom at ${(naturalBloomTime - this.firstTime) / 1000.0}. Next is ${(nextBloomTime- this.firstTime) / 1000.0}. Delta: ${bloomDelta}`);  
      // if (bloomDelta <= BLOOM_BUFFER_MS) {
        // this.naturalBloomTimes.shift()
        // console.log('^Natural^')
      // } else {
        // this.lifebloomIncrease += nextBloomAmount;
        // console.log('^Photo^')
      // }
    // } 

    // //add any additional blooms after all naturals are accounted for 
    // // while(this.allBloomTimes.length > 0) {
      // // this.allBloomTimes.shift();
      // // this.lifebloomIncrease += this.allBloomAmounts.shift();
    // // }
  // }

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
