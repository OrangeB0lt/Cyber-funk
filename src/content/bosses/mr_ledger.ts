/**
 * Mr. Ledger, Act 3 (Storyville, the vault under Ledger & Sons). Guards the fourth (F).
 * Pattern: Compound Interest: +8% Chops at the start of every turn, so kill him fast. Foreclose and
 * a telegraphed Audit. At 30% Heart, Hostile Takeover summons a Repo Drone.
 */
import type { BossDef } from '@core/types';

export const mrLedger = {
  id: 'mr_ledger',
  name: 'Mr. Ledger',
  level: 7,
  district: 'storyville',
  tone: 'LOW',
  weak: 'FUNK',
  resist: 'BLUE',
  note: 'F',
  lines: {
    intro:
      "Every song in this district has a lienholder, and the lienholder is me. Let's discuss your balance.",
    half: 'Hostile takeover. Repossess everything.',
    defeat: 'The books... were supposed to balance...',
  },
  book: 'Bought every contract in Storyville and keeps them in a vault under Basin Street. His Chops compound every turn. Kill him fast.',
  ai({ self }) {
    const t = self.turnCount;
    if (t % 4 === 1) return { skill: 'b_foreclose' };
    if (t % 4 === 3) return { skill: 'b_audit', telegraph: 'Mr. Ledger opens a very thick folder...' };
    return { skill: 'en_basic' };
  },
  onTurnStart({ self, ops }) {
    self.chopsStack = (self.chopsStack || 0) + 0.08;
    ops.log(`Compound Interest: Mr. Ledger's Chops +${Math.round(self.chopsStack * 100)}%.`);
  },
  onHp({ self, ops }) {
    if (!self.flags.takeover && self.hp <= self.maxHp * 0.3) {
      self.flags.takeover = true;
      ops.summon('repo_drone', 7, 'HOSTILE TAKEOVER. A Repo Drone drops from the vault ceiling.');
    }
  },
} satisfies BossDef;
