import { BattleActions } from '../combat/BattleActions';
import { useView } from '../GameContext';
import { CreateActions } from '../screens/Create';
import { DistrictActions } from '../screens/District';
import { PlaceActions } from '../screens/Place';
import { StoryActions } from '../screens/Story';
import { TitleActions } from '../screens/Title';

/** The thumb-reach action area at the bottom: whatever the current screen offers. */
export function ActionBar() {
  const v = useView();
  switch (v.screen) {
    case 'title':
      return <TitleActions />;
    case 'create':
      return <CreateActions />;
    case 'story':
      return <StoryActions />;
    case 'district':
      return v.busy ? null : <DistrictActions />;
    case 'place':
      return v.busy ? null : <PlaceActions />;
    case 'battle':
      return <BattleActions />;
  }
}
