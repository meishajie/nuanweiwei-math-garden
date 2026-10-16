import {createState} from './engine.js?v=20261016-2';
import {createProfiles,GRADES,syncSettings} from './profiles.js?v=20261016-2';
import {createRewards} from './play-rewards.js?v=20261016-2';
import {courseProfile} from './course-catalog.js?v=20261016-2';

export const GAME_KEYS=Object.freeze({profiles:'nuanweiwei.math-garden.profiles.v3',previous:'nuanweiwei.math-garden.profiles.v2',legacy:'nuanweiwei.math-garden.v1',rewards:'nuanweiwei.star-play.v1',recovery:'nuanweiwei.math-garden.profiles.v3.recovery'});
const clone=value=>JSON.parse(JSON.stringify(value));
export function restartProgress(profiles,rewards,{scope='grade',grade=profiles.selectedGrade}={}){
 if(!['grade','all'].includes(scope)||!GRADES.includes(grade))throw new RangeError('Invalid restart');
 if(scope==='all'){
  const next=createProfiles();for(const g of GRADES)next.grades[g].courseSettings||={textbook:'bnu',phase:1};next.resetGrades=[...GRADES];
  return {profiles:next,rewards:createRewards(next.grades)};
 }
 const next=clone(profiles),before=profiles.grades[grade],p=courseProfile(grade,{...before.courseSettings,difficulty:before.difficulty||'standard'}),fresh=createState(grade);
 fresh.courseSettings={textbook:p.textbook,phase:p.phase};fresh.difficulty=p.difficulty;next.grades[grade]=fresh;next.selectedGrade=grade;
 next.resetGrades=[...new Set([...(next.resetGrades||[]),grade])].sort();if(grade===1)delete next.retainedLegacy;syncSettings(next,profiles.settings);
 const earned=clone(rewards);earned.highWater[String(grade)]=Object.fromEntries(Array.from({length:10},(_,i)=>[i+1,0]));
 return {profiles:next,rewards:earned};
}

// Only this game's keys are touched. UI state changes after the whole commit succeeds.
export function persistRestart(storage,next,{scope='grade',grade=next.profiles.selectedGrade}={}){
 if(!['grade','all'].includes(scope)||!GRADES.includes(grade))throw new RangeError('Invalid restart');
 const keys=Object.values(GAME_KEYS),before=new Map(keys.map(key=>[key,storage.getItem(key)]));
 try{
  storage.setItem(GAME_KEYS.profiles,JSON.stringify(next.profiles));storage.setItem(GAME_KEYS.rewards,JSON.stringify(next.rewards));
  if(scope==='all'||grade===1)storage.setItem(GAME_KEYS.legacy,JSON.stringify(next.profiles.grades[1]));
  if(scope==='all'){storage.removeItem(GAME_KEYS.previous);storage.removeItem(GAME_KEYS.recovery);}
  else if(before.get(GAME_KEYS.previous)){
   let previous;try{previous=JSON.parse(before.get(GAME_KEYS.previous));}catch{}
   if(previous?.version===2&&previous.grades){previous.grades[grade]=clone(next.profiles.grades[grade]);previous.resetGrades=[...new Set([...(Array.isArray(previous.resetGrades)?previous.resetGrades:[]),grade])];if(grade===1)delete previous.retainedLegacy;storage.setItem(GAME_KEYS.previous,JSON.stringify(previous));}
  }
 }catch(cause){
  let restored=true;for(const [key,value] of [...before].reverse()){try{if(value===null)storage.removeItem(key);else storage.setItem(key,value);}catch{restored=false;}}
  const error=new Error(restored?'Restart not saved':'Restart rollback unavailable',{cause});error.code=restored?'RESTART_NOT_SAVED':'RESTART_STORAGE_UNAVAILABLE';throw error;
 }
 return next;
}
