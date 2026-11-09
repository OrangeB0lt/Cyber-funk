# Tone and voice

*How CYBER FUNK sounds: the narrator, the people, Metronome, the jokes, the city's words, and the copy on the buttons.* Every quote below is real game text, with the file it's in. When you write something new, put it next to the lines here and check that it sits in the same room.

**Read this when** you write or edit any player-facing text: narration, dialogue, choice labels, item descriptions, Blue Book entries, toasts. The API for scenes is in [writing scenes](../guides/writing-scenes.md). Who everyone is is in the [world bible](world-bible.md), and why the game feels the way it does is in the [pillars](pillars.md).

## The short version

Warm, wry and specific. Second person, present tense. A city that tells jokes at funerals and means both. People talk like neighbors; Metronome talks like a terms-of-service page. Name the real street, the real food, the real sound. Keep it short: every line is a tap on a phone.

## The narrator

**Second person, present tense.** The narrator talks to the player as "you" and stays in the moment.

> "You step onto the stones. Somewhere behind you, in the dark, somebody starts a drum. Then another. The square remembers." ([captain_hush.scene.ts](../../src/content/bosses/captain_hush.scene.ts))

**Concrete before abstract.** Lead with what you'd see, hear, smell or eat, and let the feeling come from that. "The smell of red beans comes through somebody's window. It's Monday somewhere." ([treme/district.ts](../../src/content/districts/treme/district.ts))

**Two rhythms.** Short declaratives carry the beats:

> "The band stops. Mama Roux does not. She looks at you. Everybody looks at you." ([prologue.scene.ts](../../src/content/story/prologue.scene.ts))

Long sentences strung on "and" carry the big emotional turns, and they're saved for those moments:

> "And the trumpet cuts loose, and the snare cracks, and the whole street turns from grief to joy in the space of one bar, the way it has for two hundred years, the way Metronome will never understand." ([prologue.scene.ts](../../src/content/story/prologue.scene.ts))

**The understated tag.** A scene often ends on a short, dry sentence: "You take the umbrella. It's heavier than it looks. Everything is." ([prologue.scene.ts](../../src/content/story/prologue.scene.ts)) "Two kids on a stoop tap out a street beat on a bucket, then freeze and look innocent. Good kids." ([treme/district.ts](../../src/content/districts/treme/district.ts))

**Music is the metaphor.** Time and pitch describe everything, and they tell you whose side a thing is on. Metronome's world runs in 4/4, in quarter notes, at 120 BPM, at exactly 440 Hz. The people's world swings, plays on the two and four, shaves ice "in 7/8 time just to annoy the drone", and buzzes "a half-step flat". Use real terms and use them correctly.

**The player.** Never named in narration, never given a gender, and almost never given lines the player didn't pick. NPCs address the player with an endearment instead of a name (see the table under [the people](#the-people)). Choice labels are the player's voice; see [UI copy](#ui-copy).

**Explaining things.** The narrator doesn't stop to explain a joke, a dish or a tradition. The [Lexicon](#the-lagniappe-lexicon) does that. Mechanical results go in parentheses at the end of the line (see [UI copy](#ui-copy)). Tutorials are the one exception: they start with `TUTORIAL:`, speak plainly, and put action names in capitals.

## Metronome's voice

Metronome's people talk in policy, licensing, accounting and measurement. They're formal and literal, and they sound funny because they're so sure of themselves. When they lose, their speech breaks into ellipses and they find a feeling they weren't built for. Vox, the Archivist and Isolde use no contractions until they lose. Vox's first one, "Oh, that's what it's for.", comes the moment she's reprogrammed ([vox_perfecta.scene.ts](../../src/content/bosses/vox_perfecta.scene.ts)).

| Speaker | How they sound | Lines |
|---|---|---|
| The Hush (Captain Hush) | Citation language, then panic | "Unlicensed assembly. Unlicensed syncopation detected. Cease all swing. Disperse." ([prologue.scene.ts](../../src/content/story/prologue.scene.ts)) · "Backup. BACKUP. Someone turn down this city!" ([captain_hush.ts](../../src/content/bosses/captain_hush.ts)) |
| Vox Perfecta | A PA announcement that wants to be loved | "Tonight's performance is brought to you by Metronome. Please remain in perfect time." · "That note. The blue one. I was not built to feel that. I felt that." ([vox_perfecta.scene.ts](../../src/content/bosses/vox_perfecta.scene.ts)) |
| Mr. Ledger | Finance as threat | "Every song in this district has a lienholder, and the lienholder is me. Let's discuss your balance." · "The books... were supposed to balance..." ([mr_ledger.ts](../../src/content/bosses/mr_ledger.ts)) |
| The Archivist | System messages | "The dead do not improvise. Soon, neither will you." · "Index corruption. The archive is... grieving? That is not a supported state." ([archivist.ts](../../src/content/bosses/archivist.ts)) |
| Isolde Vane | Old money, perfect diction, cracking | "A duel? In my ballroom? How quaint." · "You are... early. On every beat. How are you early on every beat?" ([isolde.ts](../../src/content/bosses/isolde.ts)) |
| The Conductor | Grand contempt | "Jazz is just error, repeated until someone mistook it for culture." · "The orchestra is restless. I will fix that. I fix everything." ([conductor.ts](../../src/content/bosses/conductor.ts)) |
| THE CLICK | Silence. The narrator speaks for it. | "It does not speak. It ticks." ([tower.ts](../../src/content/world/tower.ts)) |
| Street Preacher | Slogans in capitals | "SILENCE IS ORDER. ORDER IS PEACE. SWING IS SIN." ([streetEvents.scene.ts](../../src/content/world/streetEvents.scene.ts)) |

Le Rougarou Chromé doesn't speak during the fight; its lines are narration ("It howls in perfect time."). Lucien speaks only after, in broken sentences: "Make it stop. Or make me stop." ([rougarou.scene.ts](../../src/content/bosses/rougarou.scene.ts))

Signs, machines and Metronome notices are in capitals: "ALL PERFORMANCES PROPERTY OF LEDGER & SONS." ([storyville/district.ts](../../src/content/districts/storyville/district.ts)), "CLUNK. The machine lights up. BEIGNETS. CAFÉ AU LAIT. SAVE POINT (UNLICENSED)." ([climb.scene.ts](../../src/content/districts/tower/climb.scene.ts)).

## The people

The city's people are generous, proud, funny and tired, and none of them is impressed by Metronome. Each has a verbal habit you can hear in one line. Their names show in the colour set in [npcs.ts](../../src/content/npcs.ts).

| Who | Voice | Lines |
|---|---|---|
| **Gus** | Warm, preacherly, always "baby"; says the game's refrain | "Don't you cry too long for me, now. Dirge on the way there, dance on the way back. That's how we do." ([prologue.scene.ts](../../src/content/story/prologue.scene.ts)) · "They got my song, but they never got my time." ([archivist.scene.ts](../../src/content/bosses/archivist.scene.ts)) |
| **Mama Roux** | Love as orders; short imperatives; food | "Where y'at, baby. Come here. You walk next to me. You hold your horn up where he can see it." ([prologue.scene.ts](../../src/content/story/prologue.scene.ts)) · "Sit. Eat. Don't talk with your mouth full, Gus never learned and look what happened." ([treme/places.scene.ts](../../src/content/districts/treme/places.scene.ts)) |
| **Ti-Jacques** | Proud craftsman; "Mais, cher", "yeah" | "Metronome wanted to license my shop. I told them my shop's been licensed since 1952. By me." ([treme/places.scene.ts](../../src/content/districts/treme/places.scene.ts)) |
| **Miss Odette** | Dry, businesslike, quietly fierce | "Sit down, the first drink's on the house and the second one's on Metronome because I'm not paying their license." ([quarter/places.scene.ts](../../src/content/districts/quarter/places.scene.ts)) |
| **Sugar** | Brassy, all in | "I sang backup on MoodSync for two years and I will never forgive myself. You got a band? You got a singer." ([cutting.scene.ts](../../src/content/districts/quarter/cutting.scene.ts)) |
| **Madame Zinnia** | Mystic who charges | "Thirty Doubloons, cher. The cards don't read for free. Neither do I." ([quarter/places.scene.ts](../../src/content/districts/quarter/places.scene.ts)) |
| **Madame Céleste** | "chéri"; everything has a price; never forgets | "Everything here is for a small fee. That's how we stay open." · "I don't judge, chéri. I just remember." ([storyville/places.scene.ts](../../src/content/districts/storyville/places.scene.ts)) |
| **Professor Theo** | Teacher's aphorisms | "Circular Breathing isn't a trick. It's a decision not to stop." ([storyville/places.scene.ts](../../src/content/districts/storyville/places.scene.ts)) |
| **Static** | Terse hacker, counts in seconds | "Every grid has a seam. I know where I left mine." · "I can forge an invitation in my sleep. Give me four seconds." ([storyville/places.scene.ts](../../src/content/districts/storyville/places.scene.ts)) |
| **Grand-mère Clothilde** | "mon 'tit"; gentle authority; prayer | "Come here, mon 'tit. Traiteur don't take money. But if you got some boudin, I won't say no." · "Don't be afraid. Be hot." ([bayou/places.scene.ts](../../src/content/districts/bayou/places.scene.ts)) |
| **Remy** | Easy Cajun cheer; "Mais", "cher", "yeah" | "Where we going, cher? I got spoons for days." ([bayou/places.scene.ts](../../src/content/districts/bayou/places.scene.ts)) |
| **Boudreaux** | Joke teller, laughs first | "Thibodeaux says, 'WHAT HELMET?'" ([bayou/places.scene.ts](../../src/content/districts/bayou/places.scene.ts)) |
| **Mambo Rosalie** | Calm and grave; speaks for the dead | "Come in. Mind the candles. I know who you are. The dead have been talking about you for a month." · "Grief is a frequency. The Archivist doesn't have a filter for it." ([cemetery/places.scene.ts](../../src/content/districts/cemetery/places.scene.ts)) |
| **Brother Moses** | Gentle, "friend" | "Dead folks got good ears, friend, and they're telling me to follow you." ([cemetery/places.scene.ts](../../src/content/districts/cemetery/places.scene.ts)) |
| **The Valet** | Bored discretion | "Three hundred Doubloons, and I never saw you." · "Then I never saw you for free." ([garden/places.scene.ts](../../src/content/districts/garden/places.scene.ts)) |
| **The rivals** | Trash talk with respect | Hot Rod: "Let's see what Tremé sent." Big Mae: "Cute. Now the low end." Two-Tone: "Sweet or dirty, cher? Pick, because I'm playing both." ([cutting.scene.ts](../../src/content/districts/quarter/cutting.scene.ts)) |
| **The haints** | One-off speakers in haint blue, each with a story | "I played cornet in the Eureka Brass Band. The Hush took my horn in '82 and I died in '83 and nobody played me out." ([cemetery/places.scene.ts](../../src/content/districts/cemetery/places.scene.ts)) |

**Who calls you what.** Keep endearments consistent with the speaker.

| Word | Used by |
|---|---|
| baby | Gus, Mama Roux, the Praline Lady, the crawfish-boil host, the riddling haint |
| cher | Ti-Jacques, Remy, Zinnia, Odette, Two-Tone, the tip-jar busker, the Garden dowager droid |
| chéri | Céleste, and only Céleste |
| mon 'tit | Grand-mère Clothilde |
| dawlin' | Mama Roux (to a Yat), the Storyville balcony dancer |
| friend | Brother Moses |
| child | Big Mae |

## Humour

The jokes come from four places:

- **Metronome's literal-mindedness.** "The preacher doesn't have a response coded for that." "The Butler Unit's eyes narrow. Butler Units can't narrow their eyes. This one has learned." ([streetEvents.scene.ts](../../src/content/world/streetEvents.scene.ts), [garden/places.scene.ts](../../src/content/districts/garden/places.scene.ts))
- **Animals and objects with opinions,** pigeons above all. "A pigeon has learned to leave on the downbeat." "A Quantizer snaps a pigeon's flight path to a grid. The pigeon seems offended." ([quarter/district.ts](../../src/content/districts/quarter/district.ts), [tower/district.ts](../../src/content/districts/tower/district.ts))
- **People being people.** "Your crawfish wandered off the table. 'Happens,' the bartender says. 'They're crawfish.'" ([quarter/places.scene.ts](../../src/content/districts/quarter/places.scene.ts))
- **The city's own jokes.** Boudreaux and Thibodeaux, always about Metronome, and always followed by "Gus always swore he was the Thibodeaux in these." ([bayou/places.scene.ts](../../src/content/districts/bayou/places.scene.ts), [streetEvents.scene.ts](../../src/content/world/streetEvents.scene.ts))

The shape is usually setup, then a short deadpan sentence: "You wait. It waits. Eventually a Hush patrol gives it a commendation and it leaves." The aside "because of course there is" (and Remy's "like clockwork, because of course") is already used twice; don't wear it out. Even the credits do it: "Mimes, tourists, and Metronome Corporation were harmed in the making of this game." ([finale.scene.ts](../../src/content/story/finale.scene.ts))

**Limits.** No jokes at the expense of grief, the dead, the culture, or anyone's accent. A grief scene (the haints, Theo's rolls, the funeral) stays straight until it turns. Mimes and tourists are fair game; locals laugh with each other, never at each other.

## New Orleans: words, roots, music, belief

### The Lagniappe Lexicon

[glossary.ts](../../src/content/glossary.ts) holds 62 terms in six categories: Talk, City life, Parades & funerals, Spirits & bayou, Food, Musician slang. Tapping a linked word shows the term, how it's said and a one-line definition, and saves it to the player's Lexicon.

- **Auto-linking.** A word in narration or dialogue that matches a key links by itself. It's case-insensitive, the longest match wins, and each term links once per line ([lexicon.ts](../../src/app/lexicon.ts)).
- **`noauto` terms** don't link by themselves, because they're also game words: chops, clams, in the pocket, woodshedding, vamp, the big four, on the one, blue note, blues scale, the hush, moodsync, the click. Link them by hand when the story moment is about the word.
- **Explicit links.** `[[second line]]` forces a link. `[[blues scale|six Blue Notes]]` links the key `blues scale` and shows the text after the bar. Keys are lowercase: write `[[the hush|the Hush]]`, not `[[Hush|the Hush]]`. The prologue has one line in the wrong form, and it renders as plain text; it's a known issue, so don't copy it. `npm test` fails on any link whose key isn't in the glossary.
- **Adding a term.** Give it a `term`, a `pron` (stressed syllable in capitals: "LAN-yap", "ben-YAY"; leave it empty when it's obvious), a `def` and a `cat`. Definitions are one or two plain sentences and may end with a small joke: "Shaved ice with syrup. Not a snow cone. Never a snow cone." Use the term in at least one line: a term is saved to the Lexicon only when it's seen, and the sheet counts "N of 62 terms met".

### Dialect

Light touch. A line gets one or two markers, not a phonetic transcription. The markers the game uses:

- **Openers and tags:** "Mais," at the start of a line; ", yeah" at the end; "Where y'at?"
- **Endearments:** see the table above.
- **Grammar:** "ain't", "don't" for "doesn't" ("Traiteur don't take money"), "got" for "have" ("You got a band? You got a singer.").
- **Spelling:** a few dropped g's ("lookin'", "dawlin'") and "Dat's", once, from Ti-Jacques. Everything else is standard spelling.
- **Phrases:** "making groceries", "pass a good time", "Ça c'est bon", "Comment ça va, cher?"

Keep the accents in names and loanwords: Tremé, Céleste, Café au Lait, Vieux Carré, Ça c'est bon, Le Rougarou Chromé.

### Roots

The three roots are places and upbringings, never looks or race ([roots.ts](../../src/content/roots.ts), [character design](character-design.md#art-direction)). When a scene branches on roots, each version should sound like where that person grew up:

| Roots | Home | How the city talks to them | Example |
|---|---|---|---|
| Creole | 7th Ward | Family and ancestry: cousins, grandmothers, Congo Square, Krewe rolls | "My grandmother sang in Congo Square before your company had a logo." ([streetEvents.scene.ts](../../src/content/world/streetEvents.scene.ts)) |
| Cajun | Bayou Lafourche | Cajun French, the bayou, grand-pères and accordions | "Mais, cher, on the bayou we got a word for a man who thinks quiet is the same as safe. Couillon." ([streetEvents.scene.ts](../../src/content/world/streetEvents.scene.ts)) |
| Yat | Irish Channel | Streetwise, quick, bluffing | "Where y'at, padre. Y'all got a permit for that crate?" ([streetEvents.scene.ts](../../src/content/world/streetEvents.scene.ts)) |

If you branch on roots, write all three versions. The ball's roots option is a good model: one choice label and one outcome per roots ([garden/places.scene.ts](../../src/content/districts/garden/places.scene.ts)).

### Music

Get the music right; players who play will notice. The game uses real terms precisely: the degrees of the blues scale, the two and four, the Big Four, tailgate trombone, cutting contest, fermata, ritardando, pizzicato, cadenza. Skill names come from real technique (Plunger Wah, Circular Breath, Paradiddle). If you aren't sure a term means what you think, ask, or pick a plainer one.

### Belief and the dead

Spiritual traditions are part of the city, not spooky decoration. Mambo Rosalie is a priestess who keeps the dead company; Clothilde's healing "isn't a spell, exactly"; haints are musicians who need to be heard and played out; gris-gris and haint-blue paint protect people. The dead can be funny ("A church? Baby, a church eats plenty.") and they are always treated with care. No tradition in the game is sinister. The harm in this world comes from Metronome.

## UI copy

System lines (Blue Note found, victory, defeat, fleeing) live in [text.ts](../../src/content/text.ts), and writers own them like any prose. Button and option labels live in the scenes.

| Thing | Convention | Examples |
|---|---|---|
| Tones, actions, timing grades | Capitals | HOT, FUNK, RIFF, VAMP, SPLIT, ON THE ONE, CLAMS |
| District actions | Capitals | HIT THE STREETS, TRAVEL, MENU, TRACK BOUNTY |
| Stats, statuses, items, places | Title Case | Heart, Mojo, In the Pocket, Café au Lait, The Thirsty Pelican |
| Money | `fmtD` from [streets.scene.ts](../../src/content/world/streets.scene.ts); "Doubloons" capitalised | Ð30, Ð1,250, "Not enough Doubloons." |
| Mechanical results | In parentheses at the end of the line, stat names, signed numbers, real minus sign | "(+20 Groove next fight.)", "(Sugar joins your band.)", "(Bad Juju: −4 Mojo next fight.)" |
| Choice labels | Short. An action, or a spoken line in quotes. Costs and checks in parentheses. Always a way out. | "Bribe them (Ð30)", "Bluff (Mojo check)", "Dance your way across (Tempo)", '"Let's walk."', "Not tonight", "Keep walking" |
| Place options | A verb phrase in sentence case, with a one-sentence `sub` for the mechanic | "Rest (free)" / "Full Heart and Funk. The day turns over." |
| Toasts | One short full sentence | "Saved to the club ledger.", "Got the Ball Invitation. Vane Manor is open." |
| Forward buttons | End in ▸ | "Continue ▸", "Play on ▸", "Walk the dirge ▸" |
| Screen titles | The place or event name; chapters get a colon | "Mama Roux's Kitchen", "Hush Checkpoint", "Prologue: The Dirge" |
| Journal steps | An imperative sentence with a full stop | "Talk to Mama Roux at the Lagniappe club." |
| Blue Book entries | One or two sentences: what it is, plus a hint. Elites end "ELITE." Bosses add the tactic. | "Three stripes on the chrome and a riot baton he names. ELITE." |
| Item and gear text | Mechanics first, then one flavour fragment | "+40 Heart. Powdered sugar on everything you own." |

**Choice labels are the player speaking.** Unless a choice is `silent`, its label is echoed as the player's line, with their hero's portrait. Write labels that read well that way, and put real dialogue in quotes. A roots option ends with the roots in parentheses: `"I'm the Lafourche delegation." (Cajun)`.

**Quote marks.** Dialogue keeps its quote marks inside the string, and narration around it doesn't need any. A few lines are missing them (Mama Roux's wake-up lines in [streets.scene.ts](../../src/content/world/streets.scene.ts), Ti-Jacques' first pawn-shop line, the first line of Gus's cassette at the club). Don't copy those.

## Line length and pacing

The story screen is built for a 360px phone in one hand:

- **Width.** Text is Share Tech Mono at 17px. That's about **35 characters per line** of narration. Dialogue fits about 27 characters beside the speaker's portrait for the first two lines, then about 33.
- **Every line is a tap.** Each `narrate` or `say` types out, then waits for Continue. A tap finishes the typing first. At normal speed that's 16 ms per character.
- **What the game does now.** Across the scene files, narration and dialogue lines have a median of about 120 characters (three or four phone lines). Nine in ten are under about 230 characters, and the longest are about 340 (around ten lines).
- **Aim for 60 to 200 characters a line.** Split anything over about 250 into two beats. One idea per line.
- **Big moments get more taps, not longer lines.** The prologue's funeral is a run of short narrations.
- **Choice labels** should fit one or two button lines: under about 45 characters. **Toasts** should stay under about 50.
- **Repeat visits should feel fresh.** Talking to someone again picks one line from a pool with `s.rng.pick`. Write three to five, and make some depend on state (story progress, quests, the big choices).
- **Typical scene sizes.** An arrival is one line. A guide's first meeting is three or four. A boss's pre-fight scene is two to four lines, and its post-fight scene is three to six, including any choice.

## What to avoid

- Explaining the joke, the dish or the tradition in narration. Link it to the Lexicon instead.
- Phonetic dialect across a whole line, or dialect on people who don't have it.
- Metronome speakers who sound reasonable, or who use the people's slang.
- Calling the hero precise, perfect or "on the grid". They're early, swinging, in the pocket.
- Gore, cruelty for laughs, despair without a turn.
- Generic fantasy or cyberpunk words where a New Orleans or musical one exists (a "potion" is a gumbo; a "tavern" is a dive bar on Decatur).
- Second-guessing the player's choices in narration. The hard options can cost something, but the narrator doesn't scold.
- Gendering the player, or naming them in narration.
- Emoji in story text. (The one exception is the crawfish race's track drawing.)
- Lines longer than about 250 characters, or toasts and labels that wrap to three lines.

## Before you write a line

- [ ] I know where this happens, who is there, and what they already know ([world bible](world-bible.md)).
- [ ] The narration is second person, present tense, and concrete: a real street, food or sound.
- [ ] Each speaker sounds like their row in [the people](#the-people) or [Metronome's voice](#metronomes-voice), and uses the right endearment.
- [ ] Metronome characters talk in control, licensing or measurement; the people never sound impressed.
- [ ] Any New Orleans term is right, and the Lexicon links it (`[[key]]` with a lowercase key), or I've added the term to [glossary.ts](../../src/content/glossary.ts).
- [ ] Any music term is used correctly.
- [ ] If I branch on roots, all three versions exist and sound like those places.
- [ ] Sad beats turn; jokes punch at Metronome, not at grief or culture.
- [ ] Each line is under about 250 characters with one idea; labels and toasts are short.
- [ ] Choice labels read well as the player's own line, with costs and checks in parentheses and a way out.
- [ ] Mechanical effects are in parentheses at the end, using the real stat names.
- [ ] Dialogue has its quote marks, and accents (Tremé, Céleste) are kept.
- [ ] I played it at 360px (`npm run dev`, dev menu to jump there). If I changed existing text, I updated its transcript case and ran `npm run transcripts:baseline` ([writing scenes](../guides/writing-scenes.md#checklist-before-you-open-a-pr)).
