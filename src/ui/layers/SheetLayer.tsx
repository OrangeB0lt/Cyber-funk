import { useGame, useView } from '../GameContext';
import {
  BagSheet,
  BandSheet,
  BookSheet,
  GearSheet,
  JournalSheet,
  LexiconSheet,
  MenuSheet,
  SlotSheet,
  StatusSheet,
} from '../sheets/MenuSheets';
import { SavesSheet } from '../sheets/SavesSheet';
import { SettingsSheet } from '../sheets/SettingsSheet';
import { ShopSheet } from '../sheets/ShopSheet';
import { BountySheet, DevSheet, HowToSheet, TravelSheet } from '../sheets/WorldSheets';

/** The open bottom sheet, if any. Sheets that need a game render nothing without one. */
export function SheetLayer() {
  const v = useView();
  const g = useGame();
  const sh = v.sheet;
  if (!sh) return null;
  switch (sh.kind) {
    case 'settings':
      return <SettingsSheet key={sh.id} fromTitle={sh.fromTitle} />;
    case 'howto':
      return <HowToSheet key={sh.id} start={sh.start} />;
    case 'dev':
      return <DevSheet key={sh.id} />;
    case 'saves':
      return <SavesSheet key={sh.id} mode={sh.mode} raw={sh.raw} />;
  }
  if (!g) return null;
  switch (sh.kind) {
    case 'menu':
      return <MenuSheet key={sh.id} />;
    case 'status':
      return <StatusSheet key={sh.id} />;
    case 'bag':
      return <BagSheet key={sh.id} battle={sh.battle} />;
    case 'gear':
      return <GearSheet key={sh.id} />;
    case 'slot':
      return <SlotSheet key={sh.id} slot={sh.slot} />;
    case 'band':
      return <BandSheet key={sh.id} />;
    case 'journal':
      return <JournalSheet key={sh.id} />;
    case 'book':
      return <BookSheet key={sh.id} />;
    case 'lexicon':
      return <LexiconSheet key={sh.id} />;
    case 'shop':
      return <ShopSheet key={sh.id} title={sh.title} stock={sh.stock} noSell={sh.noSell} tab={sh.tab} />;
    case 'travel':
      return <TravelSheet key={sh.id} />;
    case 'bounties':
      return <BountySheet key={sh.id} />;
  }
}
