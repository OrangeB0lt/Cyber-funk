/** Who marches in the second line on the Tower, in order. `when` decides if they've joined. */
import type { SecondLineMemberDef } from '@core/types';

export const SECOND_LINE: readonly SecondLineMemberDef[] = [
  {
    id: 'gus',
    name: 'Gus Thibodeaux (Grand Marshal)',
    when: s => !!s.flags.gusFreed,
    line: 'Leads the way, hat tipped, umbrella high.',
  },
  {
    id: 'mamaroux',
    name: 'Mama Roux',
    when: () => true,
    line: 'Brings the red beans and the whole kitchen.',
  },
  {
    id: 'tijacques',
    name: 'Ti-Jacques',
    when: () => true,
    line: 'Carries a horn in each hand and one in reserve.',
  },
  {
    id: 'odette',
    name: 'Miss Odette Fontenot',
    when: () => true,
    line: "Club Feu Follet closes for the night. Everybody's in the street.",
  },
  {
    id: 'sugar',
    name: 'Sugar Desmarais',
    when: s => s.band.recruited.includes('sugar'),
    line: 'Sings the lead, loud enough for the Tower to hear.',
  },
  {
    id: 'static',
    name: '"Static" Okafor',
    when: s => s.band.recruited.includes('static'),
    line: 'Deck on his shoulder, jamming the Hush frequencies.',
  },
  {
    id: 'remy',
    name: 'Remy Guidry',
    when: s => s.band.recruited.includes('remy'),
    line: 'Frottoir strapped on, spoons flying.',
  },
  {
    id: 'moses',
    name: 'Brother Moses Valcour',
    when: s => s.band.recruited.includes('moses'),
    line: "Banjo and a hymn for the ones who can't march.",
  },
  {
    id: 'celeste',
    name: 'Madame Céleste Arceneaux',
    when: s => s.choices.contracts === 'burned',
    line: 'Storyville walks free behind her, every one of them.',
  },
  {
    id: 'vox',
    name: 'Vox Perfecta',
    when: s => s.choices.vox === 'reprogrammed',
    line: 'Singing for real now. A little flat on purpose.',
  },
  {
    id: 'lucien',
    name: 'Lucien',
    when: s => s.choices.lucien === 'spared',
    line: 'The Chrome Wolves run alongside, howling in swing.',
  },
  {
    id: 'zinnia',
    name: 'Madame Zinnia',
    when: s => s.quests.lost_eye === 'done',
    line: "Reads the cards and says the Tower's already lost.",
  },
  {
    id: 'clothilde',
    name: 'Grand-mère Clothilde',
    when: s => s.quests.herbs === 'done',
    line: 'Says a prayer over the whole line before it steps off.',
  },
  {
    id: 'rosalie',
    name: 'Mambo Rosalie',
    when: s => s.quests.haints === 'done',
    line: 'Shakes the asson. The dead keep time with the living.',
  },
  {
    id: 'theo',
    name: 'Professor Theo Lavigne',
    when: s => s.quests.rolls === 'done',
    line: 'Pushes an upright piano down Canal Street on a dolly.',
  },
];
