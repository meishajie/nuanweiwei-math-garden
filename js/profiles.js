import {createState, hydrate} from './engine.js';

export const GRADES = Object.freeze([1, 2, 3]);
const validGrade = value => GRADES.includes(value);
const prefs = value => ({sound: value?.sound === true, motion: ['system','reduce','full'].includes(value?.motion) ? value.motion : 'system'});

export function createProfiles(legacyRaw = null) {
  const first = hydrate(legacyRaw, {grade: 1});
  const profiles = {version: 2, selectedGrade: 1, settings: prefs(first.settings),
    grades: {1: first, 2: createState(2), 3: createState(3)}};
  syncSettings(profiles, profiles.settings);
  return profiles;
}

export function hydrateProfiles(raw, legacyRaw = null) {
  const fallback = createProfiles(legacyRaw);
  if (!raw) return fallback;
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!parsed || parsed.version !== 2 || !parsed.grades
      || (typeof raw === 'string' && raw.length > 800_000)) return fallback;
    const profiles = {version: 2, selectedGrade: validGrade(parsed.selectedGrade) ? parsed.selectedGrade : 1,
      settings: prefs(parsed.settings), grades: {}};
    for (const grade of GRADES) profiles.grades[grade] = hydrate(parsed.grades[grade], {grade});
    // A still-open older tab may have written valid first-grade progress.
    const old = fallback.grades[1], first = profiles.grades[1];
    const keepsCards = first.cards.every(id=>old.cards.includes(id));
    const keepsStages = Object.entries(first.stages).every(([id,s])=>
      (old.stages[id]?.completedRounds||0)>=s.completedRounds
      && (old.stages[id]?.independent||0)>=s.independent
      && (old.stages[id]?.supported||0)>=s.supported);
    const later = old.completedQuestions>first.completedQuestions || old.cards.length>first.cards.length || old.rounds>first.rounds;
    if(later&&keepsCards&&keepsStages&&old.completedQuestions>=first.completedQuestions) profiles.grades[1]=old;
    else if(later) profiles.retainedLegacy=old;
    else if(parsed.retainedLegacy) profiles.retainedLegacy=hydrate(parsed.retainedLegacy,{grade:1});
    syncSettings(profiles, profiles.settings);
    return profiles;
  } catch { return fallback; }
}

export function syncSettings(profiles, settings) {
  profiles.settings = prefs(settings);
  for (const grade of GRADES) profiles.grades[grade].settings = {...profiles.settings};
  return profiles;
}

export function selectGrade(profiles, grade) {
  if (!validGrade(grade)) return false;
  profiles.selectedGrade = grade;
  return true;
}
