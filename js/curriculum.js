import * as legacy from './curriculum-legacy.js?v=20261013-1';
import {courseProfile,availableTopics,TOPICS} from './course-catalog.js?v=20261013-1';
import {courseBank} from './course-questions.js?v=20261013-1';
export * from './curriculum-legacy.js?v=20261013-1';
export function getLevels(grade=1,settings=null){
 if(grade<=3&&!settings)return legacy.getLevels(grade);
 const p=courseProfile(grade,settings||{}),topics=availableTopics(p);
 return legacy.LEVELS.map((l,i)=>({...l,grade,skill:TOPICS[topics[i%topics.length]].label,range:TOPICS[topics[i%topics.length]].label,maxValue:99999,baseMaxValue:99999}));
}
export function difficultyRange(grade,levelId,difficulty='standard',settings=null){
 if(grade<=3&&!settings)return legacy.difficultyRange(grade,levelId,difficulty);
 return 99999;
}
export function getDifficultyBank(grade,levelId,difficulty='standard',settings=null){
 if(grade<=3&&!settings)return legacy.getDifficultyBank(grade,levelId,difficulty);
 return courseBank(courseProfile(grade,{...settings,difficulty}),levelId);
}

export function getQuestionBank(grade=1,levelId=1,settings=null){return grade<=3&&!settings?legacy.getQuestionBank(grade,levelId):courseBank(courseProfile(grade,settings||{}),levelId);}
