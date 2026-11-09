import type { SpriteId } from '@core/ids/sprites';
import type { DistrictId } from '@core/ids/world';
import type { GearId, ItemId, SheetMusicId } from '@core/ids/items';
import type { ShopStock } from '@narrative/types';
import { GEAR, ITEMS, SHEET_MUSIC, fmtDoubloons } from '@content/index';
import { sellables, shopRow } from '@engine/index';
import { Button } from '../components/Button';
import { ItemRow } from '../components/ItemRow';
import { Sprite } from '../components/Sprite';
import { useApp, useGame } from '../GameContext';
import { gearStats } from './format';
import { Sheet } from './Sheet';
import s from './Sheet.module.css';

interface Props {
  title: string;
  stock: readonly ShopStock[];
  noSell: boolean;
  tab: 'buy' | 'sell';
  /** Who runs it (their portrait beside the title). */
  keeper: SpriteId | null;
}

/** A shop: Buy and (usually) Sell at 40%. Prices come from the engine. */
export function ShopSheet({ title, stock, noSell, tab, keeper }: Props) {
  const app = useApp();
  const g = useGame()!;
  const district: DistrictId = g.district;
  return (
    <Sheet title={title} lead={keeper && <Sprite id={keeper} scale={2} />}>
      <div className={s.gold}>
        You have <b>{fmtDoubloons(g.doubloons)}</b>
      </div>
      {!noSell && (
        <div className={s.tabs} role="tablist" aria-label="Buy or sell">
          <Button
            testId="tab:buy"
            small
            role="tab"
            id="shop-tab-buy"
            aria-selected={tab === 'buy'}
            aria-controls="shop-panel"
            variant={tab === 'buy' ? 'primary' : 'ghost'}
            onClick={() => app.shopTab('buy')}
          >
            Buy
          </Button>
          <Button
            testId="tab:sell"
            small
            role="tab"
            id="shop-tab-sell"
            aria-selected={tab === 'sell'}
            aria-controls="shop-panel"
            variant={tab === 'sell' ? 'primary' : 'ghost'}
            onClick={() => app.shopTab('sell')}
          >
            Sell (40%)
          </Button>
        </div>
      )}
      <div
        id="shop-panel"
        role={noSell ? undefined : 'tabpanel'}
        aria-labelledby={noSell ? undefined : `shop-tab-${tab}`}
      >
        {tab === 'buy' ? (
          stock
            .filter(e => e.when !== false)
            .map(e => {
              const row = shopRow(g, e, district);
              const def =
                row.kind === 'gear'
                  ? GEAR[e.id as GearId]
                  : row.kind === 'sheet'
                    ? SHEET_MUSIC[e.id as SheetMusicId]
                    : ITEMS[e.id as ItemId];
              const unique = row.kind !== 'item';
              return (
                <ItemRow
                  key={e.id}
                  action={
                    <Button
                      testId={`buy:${e.id}`}
                      small
                      variant={row.canBuy ? 'primary' : undefined}
                      inactive={!row.canBuy}
                      onClick={() => app.buy(e.id, row.price)}
                    >
                      {fmtDoubloons(row.price)}
                    </Button>
                  }
                >
                  <b>{def.name}</b>
                  {unique
                    ? row.owned > 0 && <span className="good small"> owned</span>
                    : row.owned > 0 && <span className="dim small"> ×{row.owned}</span>}
                  <div className="small">
                    {row.kind === 'gear' ? `${gearStats(GEAR[e.id as GearId])}. ${def.desc}` : def.desc}
                  </div>
                  {row.levelLocked && (
                    <div className="small gold">Needs level {GEAR[e.id as GearId].level}</div>
                  )}
                </ItemRow>
              );
            })
        ) : (
          <SellList />
        )}
      </div>
    </Sheet>
  );
}

function SellList() {
  const app = useApp();
  const g = useGame()!;
  const rows = sellables(g);
  if (!rows.length) return <p className="dim">Nothing to sell.</p>;
  return (
    <>
      {rows.map(r => (
        <ItemRow
          key={r.id}
          action={
            <Button testId={`sell:${r.id}`} small onClick={() => app.sell(r.id)}>
              +{fmtDoubloons(r.price)}
            </Button>
          }
        >
          <b>{r.name}</b> <span className="dim small">×{r.n}</span>
        </ItemRow>
      ))}
    </>
  );
}
