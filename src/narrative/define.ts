/**
 * Authoring helpers for the two most common shapes of story content: places and street events.
 * They add no behavior; they give each shape a name, a type and a place for docs.
 */
import type { StoryPosition } from '@core/ids/story';
import type { DistrictId, PlaceId } from '@core/ids/world';
import type { GameState } from '@core/types';
import type { Scene } from './types';

/** One thing to do at a place. */
export interface PlaceOption {
  /** Stable key: used for test ids (`opt:<key>`) and never shown. Don't rename casually. */
  key: string;
  /** Button text. */
  label: string;
  /** Second line under the label. */
  sub?: string;
  /** Highlight as the story-relevant option. */
  hint?: boolean;
  /** What happens. When it ends, the player is back at the place (unless the scene moved them). */
  run: Scene;
}

/** What a place shows above its options. */
export interface PlaceIntro {
  /** A paragraph under the description. */
  text?: string;
  /** Show the Blue Notes trophy wall. */
  notes?: boolean;
}

/** Read-only rules a place needs to build its options (content can't import the engine). */
export interface PlaceHelpers {
  /** A price after the player's discounts in a district (default: the current one). */
  price(base: number, district?: DistrictId): number;
  /** Is the main quest exactly at this step? */
  is(p: StoryPosition): boolean;
  /** Has the main quest reached this step? */
  reached(p: StoryPosition): boolean;
}

/** A place's behavior: computed from the game state every time the place is shown. */
export interface PlaceScenes {
  /** Extra text above the options. */
  intro?(g: Readonly<GameState>, h: PlaceHelpers): PlaceIntro | null;
  /** The options available right now, in display order. */
  options(g: Readonly<GameState>, h: PlaceHelpers): PlaceOption[];
}

/** Declare a place's scenes. */
export function definePlace(id: PlaceId, spec: PlaceScenes): PlaceScenes & { id: PlaceId } {
  return { id, ...spec };
}

/** One choice in a street event. */
export interface EventOption {
  /** Stable key (test ids). */
  key: string;
  /** Button text. */
  label: string;
  /** Only offered when this holds. */
  when?(g: Readonly<GameState>): boolean;
  /** What happens. */
  run: Scene;
}

/** A random encounter on the streets that isn't a fight (though it may become one). */
export interface StreetEventDef {
  /** Id. */
  id: string;
  /** Title shown over the event. */
  name: string;
  /** Districts it can happen in (null = anywhere). */
  districts: readonly DistrictId[] | null;
  /** Relative likelihood among eligible events. */
  weight: number;
  /** The setup, narrated before the choice. */
  text: string;
  /** The choices. */
  options: readonly EventOption[];
}

/** Declare a street event. */
export function defineEvent(spec: StreetEventDef): StreetEventDef {
  return spec;
}
