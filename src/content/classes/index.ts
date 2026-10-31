/** The seven instrument classes and all of their skills. */
import type { ClassId } from '@core/ids/characters';
import type { ClassDef, Table } from '@core/types';
import { trumpet, trumpetSkills } from './trumpet';
import { trombone, tromboneSkills } from './trombone';
import { sousaphone, sousaphoneSkills } from './sousaphone';
import { saxophone, saxophoneSkills } from './saxophone';
import { clarinet, clarinetSkills } from './clarinet';
import { snare, snareSkills } from './snare';
import { bassdrum, bassdrumSkills } from './bassdrum';

export const CLASSES: Table<ClassId, ClassDef> = {
  trumpet,
  trombone,
  sousaphone,
  saxophone,
  clarinet,
  snare,
  bassdrum,
};

/** Every class skill, in class order. */
export const CLASS_SKILLS = {
  ...trumpetSkills,
  ...tromboneSkills,
  ...sousaphoneSkills,
  ...saxophoneSkills,
  ...clarinetSkills,
  ...snareSkills,
  ...bassdrumSkills,
};
