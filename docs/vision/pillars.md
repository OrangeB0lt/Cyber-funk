# Design pillars

*What CYBER FUNK is, and what it must always feel like.* These five pillars are drawn from the game as it ships. Each one says what it means, where you can see it in the game, and what it rules out. If a new idea fits all five, it probably belongs. If it breaks one, change the idea or make the case in the PR.

**Read this when** you pitch a feature, plan a district, design an enemy or a quest, or can't choose between two drafts of a scene. The setting is in the [world bible](world-bible.md), how lines should sound is in [tone and voice](tone-and-voice.md), and how characters look is in [character design](character-design.md).

## The game in one paragraph

NEON ORLEANS, 2084. Metronome Corporation wants the city in perfect time. Its police, the Hush, cite people for "unlicensed syncopation". Its MoodSync speakers play swingless music on every corner. Its Tower is about to broadcast the Click, a beat that every heart in the city will keep forever. You play in a brass band. Your teacher, Grand Marshal Gus Thibodeaux, died after a Metronome raid. You fight with your instrument, take back the six Blue Notes from the six lieutenants who hold them, and lead a second line of everyone you helped up the Tower to break the Click.

## The pillars at a glance

| # | Pillar | In one line |
|---|---|---|
| 1 | Music is the fight | Every combat action is playing, and timing is the skill. |
| 2 | Swing beats the grid | The enemy is perfection. The heroes play a little flat, on purpose. |
| 3 | Real New Orleans, in neon | Real places, food, words and traditions, named right and treated with respect. |
| 4 | Dirge on the way there, dance on the way back | Grief and joy in the same bar. Jokes sit next to funerals. |
| 5 | Nobody marches alone | The people you help are the reward, and the finale is built out of them. |

## 1. Music is the fight

**What it means.** A fight is a band playing. You don't swing a sword: you RIFF, PLAY, SOLO and VAMP. Every attack has a tone, and the tones are qualities of sound. Tapping On the One is the skill the whole game tests. Groove builds the way a crowd warms up, and the solo is the payoff. The last boss can only be beaten by playing the whole blues scale.

**How the game shows it.**
- **The actions are musical.** The battle buttons are RIFF, PLAY, SOLO, VAMP, BAG and SPLIT ([BattleActions.tsx](../../src/ui/combat/BattleActions.tsx)). RIFF, a damaging PLAY and SOLO open a timing bar graded ON THE ONE (×1.5), IN THE POCKET (×1.2), LOOSE and CLAMS (×0.6) ([timing.ts](../../src/content/combat/timing.ts)).
- **Tones are sounds.** HOT is "High, fast, and fiery", LOW is "Bass that shakes armor loose", BLUE is "The blue note, a sorrow that saps strength", and FUNK is "Syncopation that scrambles anything keeping strict time". SWEET heals and never deals damage ([tones.ts](../../src/content/combat/tones.ts)).
- **Classes are the instruments of a New Orleans brass band,** and skill names are real technique or tradition: Shake, Plunger Wah, Tailgate Reach, Oom-Pah, Circular Breath, Paradiddle, Press Roll, and the bass drum's Big Four counter ([classes/](../../src/content/classes/)).
- **Bosses fight with music.** Vox Perfecta samples your last skill and plays it back at you. Isolde Vane's Perfect Pitch Shield breaks only on an ON THE ONE hit or a SOLO. The Conductor's Fermata steals your turn ([vox_perfecta.ts](../../src/content/bosses/vox_perfecta.ts), [isolde.ts](../../src/content/bosses/isolde.ts), [conductor.ts](../../src/content/bosses/conductor.ts)).
- **The finale is the scale.** Behind Perfect Silence the Click takes no damage. Only Play the Blues, tapping the six Blue Notes as they light up, breaks it ([the_click.ts](../../src/content/bosses/the_click.ts), [the_click.scene.ts](../../src/content/bosses/the_click.scene.ts)).
- **Music outside combat.** The Sit In pays by eight timing taps. The Cutting Contest is three duels against rival players. Haints are laid to rest with a dirge ([quarter/places.scene.ts](../../src/content/districts/quarter/places.scene.ts), [cutting.scene.ts](../../src/content/districts/quarter/cutting.scene.ts), [cemetery/places.scene.ts](../../src/content/districts/cemetery/places.scene.ts)).

**What it rules out.**
- Weapons, spells or gadgets that aren't music. A new skill is a technique, a style or a piece of tradition, and its tone matches how it would sound.
- Main attacks that skip the timing bar. Auto rhythm exists for accessibility: it rolls the grade, it doesn't remove it.
- A boss that is only a damage race. Every boss has a trick of its own (a sampled skill, a shield only the ONE breaks, Chops that compound every turn), plus a weakness and a resistance that the scenes, the rumors and the Blue Book explain.

## 2. Swing beats the grid

**What it means.** The conflict is feel against perfection. Metronome isn't the enemy because it's cruel. It's wrong because it wants everything exactly on the beat, licensed and owned. What wins is the human part: the note bent flat on purpose, the beat played a hair early, the crowd. The game flips Metronome's insult into its moral. The Conductor calls jazz "just error, repeated", and the defeat screen answers: "a song is just error, repeated. Run it back."

**How the game shows it.**
- **Metronome talks in control.** Licensing, citations, Quiet Zones, the Silence Ordinance, MoodSync ("Perfect time, no swing"), and the Click ("until the whole city keeps time") ([glossary.ts](../../src/content/glossary.ts), [captain_hush.ts](../../src/content/bosses/captain_hush.ts), [storyville/places.scene.ts](../../src/content/districts/storyville/places.scene.ts)).
- **The Blue Note is the thesis.** "Wrong on paper. Right in the chest." ([notes.ts](../../src/content/notes.ts))
- **Villains break when they feel something.** Vox: "I was not built to feel that. I felt that." Isolde: "Flat. I was... flat." The Archivist: "The archive is... grieving? That is not a supported state." The Click's defeat line: "For the first time in its existence, the Click is late." ([bosses/](../../src/content/bosses/))
- **Gus says it outright.** "They can copy the notes. They can't copy the swing." ([archivist.scene.ts](../../src/content/bosses/archivist.scene.ts))
- **Everyday life resists the grid.** "The streetcar bell on Canal rings in perfect quarter notes. Metronome fixed that too." "The neon on Mama Roux's sign buzzes a half-step flat. It always has." ([quarter/district.ts](../../src/content/districts/quarter/district.ts), [treme/district.ts](../../src/content/districts/treme/district.ts))
- **When the player is good, the text says early, not precise.** At the ball you waltz "a hair ahead of the click". Isolde asks, "How are you early on every beat?" ([garden/places.scene.ts](../../src/content/districts/garden/places.scene.ts), [isolde.ts](../../src/content/bosses/isolde.ts))
- **The art draws the same line.** People are asymmetric, warm and hand-made. Metronome is symmetric white chrome with cyan light ([character design](character-design.md#art-direction)).

**What it rules out.**
- A villain whose motive isn't some kind of control, ownership or perfection. Mr. Ledger owns contracts. The Archivist catalogs. Isolde demands exactness.
- Making perfection, silence or order look right. Metronome's people can be funny or sad, and some of them can be saved, but the game never takes their side.
- Describing the hero as precise, perfect or on the grid.

## 3. Real New Orleans, in neon

**What it means.** The cyberpunk layer sits on top of a real city, and the real city is the point. Streets, neighborhoods, food, slang, institutions and spiritual traditions are named correctly and used the way locals use them. The future adds neon, chrome and drones. It never replaces what was there. The game teaches as it goes, through the Lagniappe Lexicon, without stopping the story to explain.

**How the game shows it.**
- **Real geography.** Claiborne Avenue under the overpass, Congo Square, Rampart, Frenchmen, Decatur, Royal, Bourbon, Jackson Square, Canal, Basin Street, St. Louis Cemetery No. 1, St. Charles Avenue, Poydras, Manchac Swamp, Bayou Lafourche, the Irish Channel and the Seventh Ward ([districts/](../../src/content/districts/), [roots.ts](../../src/content/roots.ts)).
- **Real institutions carry the plot.** Home base is a Social Aid & Pleasure Club. The game opens with a jazz funeral and ends with a second line. The Grand Marshal, cutting contests, a traiteur who won't take money, a mambo's temple and Red Beans Monday all have a place in it ([prologue.scene.ts](../../src/content/story/prologue.scene.ts), [places.ts](../../src/content/places.ts), [quests.ts](../../src/content/quests.ts)).
- **Healing is local food.** Beignets, a po'boy "dressed", gumbo, ya-ka-mein ("Old Sober"), boudin, sno-balls ("Not a snow cone. Never a snow cone."), pralines, and king cake with the baby in it ([items.ts](../../src/content/items.ts), [glossary.ts](../../src/content/glossary.ts)).
- **The Lagniappe Lexicon.** 62 terms in six categories, each with a one-line definition and most with a pronunciation. They link automatically in narration ([glossary.ts](../../src/content/glossary.ts)).
- **Roots are places.** Creole (Seventh Ward), Cajun (Bayou Lafourche) and Yat (Irish Channel) change what people say to you and which bluffs land. They never change how you look ([roots.ts](../../src/content/roots.ts); character design: "Skin tone is never tied to roots").
- **Folklore is belief, not horror.** The haints are musicians nobody played out. The rougarou is a young man hurt by a signal. Mambo Rosalie "keeps the dead company" ([cemetery/places.scene.ts](../../src/content/districts/cemetery/places.scene.ts), [rougarou.ts](../../src/content/bosses/rougarou.ts), [places.ts](../../src/content/places.ts)).
- **The credits say who it's for.** "For the Social Aid & Pleasure Clubs, who remember how to play. For Congo Square, where it started." ([finale.scene.ts](../../src/content/story/finale.scene.ts))

**What it rules out.**
- A generic cyberpunk city with a New Orleans skin. If a place, dish or word could be swapped for another city's, find the real one.
- Getting it wrong: a wrong pronunciation, a sno-ball called a snow cone, a street moved to the wrong neighborhood. Look it up.
- Dialect played for laughs, or a whole line spelled out phonetically ([tone and voice](tone-and-voice.md#dialect) has the rules).
- Voodoo, spirits or the dead as horror set dressing. In this game the dead are sad, funny or kind, and only Metronome does them harm.
- Tying roots to skin tone or looks, or giving culture a stat beyond the three roots.

## 4. Dirge on the way there, dance on the way back

**What it means.** The game is shaped like a jazz funeral. It opens on grief, Gus's casket going down Claiborne, and it ends in joy that doesn't erase the grief. Scenes hold both: a joke can sit right beside a loss, and a sad scene ends with something moving again. The tone is warm and wry, never grim and never silly.

**How the game shows it.**
- **The structure.** The opening is titled "Prologue: The Dirge". The ending is titled "Second Line": "the dirge turns to joy, the way it always has". Beating a boss puts "CUT THE BODY LOOSE" on the victory screen ([prologue.scene.ts](../../src/content/story/prologue.scene.ts), [finale.scene.ts](../../src/content/story/finale.scene.ts), [text.ts](../../src/content/text.ts)).
- **The refrain.** "Dirge on the way there, dance on the way back" comes back in the prologue, on Gus's cassette, at the broadcaster, with the haints, when the second line forms, in the credits and at the start of New Game+.
- **Grief, played straight.** The three haints who want their songs back ([cemetery/places.scene.ts](../../src/content/districts/cemetery/places.scene.ts)). Professor Theo getting his rolls back: "He doesn't cry. ... the room goes quiet, and then it doesn't." Mama Roux asking about Gus: "Don't answer that. He's leading the line. He's alright." ([storyville/places.scene.ts](../../src/content/districts/storyville/places.scene.ts), [treme/places.scene.ts](../../src/content/districts/treme/places.scene.ts))
- **Comedy right next to it.** Boudreaux and Thibodeaux jokes ("Gus always swore he was the Thibodeaux in these"), the Senator falling asleep at the crawfish race, Neon Mimes, the parade float whose pelican head falls off ([bayou/places.scene.ts](../../src/content/districts/bayou/places.scene.ts), [quarter/places.scene.ts](../../src/content/districts/quarter/places.scene.ts), [streetEvents.scene.ts](../../src/content/world/streetEvents.scene.ts)).
- **Losing is gentle.** "YOU GOT CUT." After a street loss, you wake at the club "with a wet rag on your head and lighter pockets" ([text.ts](../../src/content/text.ts)).
- **Villains get a human beat.** Vox lands a note flat and grins "like a person". Isolde admits, "I think I liked it." The epilogue cards say what became of them ([vox_perfecta.scene.ts](../../src/content/bosses/vox_perfecta.scene.ts), [isolde.scene.ts](../../src/content/bosses/isolde.scene.ts), [finale.scene.ts](../../src/content/story/finale.scene.ts)).

**What it rules out.**
- Grimdark: gore, torture, cruelty for its own sake, despair without a turn. The worst thing Metronome does is take people's music, and the game treats that as serious.
- Jokes at the expense of grief or of the culture. The humor comes from Metronome's stiffness, from people being people, and from the city's own jokes.
- Selling a cruel choice as the cool one. The harder options (keep the money, finish Lucien) are allowed and pay out in gear or Doubloons, but the text lets them cost something: Céleste "remembers".

## 5. Nobody marches alone

**What it means.** You are one player, but music here is something people do together. The people you meet, help, recruit or spare are the reward that matters, and the finale counts them. A side quest is never just an errand: it's a person, and finishing it puts them in the second line.

**How the game shows it.**
- **The roster.** Up to 15 people can march in the second line. Each joins because of something you did: recruiting a bandmate, finishing their quest, or one of the three big choices ([secondLine.ts](../../src/content/band/secondLine.ts)).
- **The crowd is mechanical too.** In the Tower, each marcher gives +2% to all stats, up to +25%, and every one of them strikes when you Play the Blues ([secondLine.scene.ts](../../src/content/story/secondLine.scene.ts), [the_click.scene.ts](../../src/content/bosses/the_click.scene.ts)).
- **Bandmates fight beside you.** Two can be active, and each assists every third round ([bandmates.ts](../../src/content/band/bandmates.ts)).
- **Mercy grows the line.** Reprogram Vox, burn the contracts, spare Lucien, and each of them marches. The selfish option pays in gear or money instead ([boss scenes](../../src/content/bosses/)).
- **A crowd beats the Tower.** At the plaza, "the Hush step aside, because that is what a crowd is for." Isolde says of the Conductor, "He's only ever been afraid of a crowd." ([climb.scene.ts](../../src/content/districts/tower/climb.scene.ts), [isolde.scene.ts](../../src/content/bosses/isolde.scene.ts))
- **The ending counts them.** The last epilogue card gives the line's size: "[N] strong on the night the Click broke. Everyone in it got a hat." The credits print it again ([finale.scene.ts](../../src/content/story/finale.scene.ts)).

**What it rules out.**
- A lone-hero ending. The final blow is the whole scale and the whole line.
- Fetch quests with nobody behind them. A new quest needs a person who wants something, a payoff scene, and, where it fits, a place in the second line.
- Recruits who vanish. Someone who joins should be heard from again: in place lines, in street events, in the Tower.

## A constraint, not a pillar: one thumb

The game is played on a 360px phone, one-handed, often in short sessions. That shapes design as much as the pillars do. Every action is a tap. Hit the Streets is a one-tap loop. Every line of story waits for its own tap. Rhythm taps can be set to auto. The rules are in [engineering principles](engineering-principles.md#6-phone-first-and-accessible), and line length and pacing are in [tone and voice](tone-and-voice.md#line-length-and-pacing).

## Testing an idea against the pillars

| Ask | If the answer is no |
|---|---|
| Does it sound or play like music? | Find the musical version of the mechanic, the name or the tone. |
| Is the opposition some form of the grid: control, ownership, perfection? | Rework the antagonist's motive, or make it a person, not a villain. |
| Could it only happen in New Orleans? | Swap in the real place, dish, word or tradition. |
| Does the sad part turn, and does the funny part stay kind? | Add the turn, or cut the joke. |
| Who in the city cares, and do they show up later? | Give it a person, and a payoff they're part of. |
