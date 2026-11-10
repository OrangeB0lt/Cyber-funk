# World bible

*Neon Orleans as the game presents it: the premise, the districts in story order, the band, the second line, the Tower and the endings.* Everything here comes from the shipped content in `src/content/`. Where the game leaves something open, this doc says so instead of filling the gap. Full spoilers.

**Read this when** you write a scene, add a character or place, or need to know who knows what at a given point in the story. For stats (levels, tones, weaknesses, prices), use the generated [content tables](../reference/tables/README.md); this doc doesn't copy them. For how characters look, see [character design](character-design.md). For how they sound, see [tone and voice](tone-and-voice.md).

## The premise

**NEON ORLEANS, 2084.** New Orleans under neon: shotgun houses wrapped in pink and green light, holographic billboards over the Vieux Carré, chrome streetcars, jet-turbine airboats in the swamp. The money is the Doubloon ("In Neon Orleans, the only money that matters"), written Ð.

**Metronome Corporation** wants the city in perfect time. Its CEO is Maestro Aurelius Quant, the Conductor. Its tools:

| Thing | What it is | Where it shows up |
|---|---|---|
| **The Hush** | Metronome's police: white chrome armor, noise-cancelling helmets, citation pads. Ranks run Patrolman, Sergeant, Captain, and the gold-chrome Elites. | Everywhere; Captain Hush holds Tremé |
| **MoodSync** | "Metronome's licensed, algorithm-made music. Perfect time, no swing." Speakers on every corner. | Ambient lines, street events |
| **Licensing** | Music needs a Metronome license. Bourbon Street is the Licensed Entertainment Strip, wired to a licensing broadcaster in Jackson Square. Theo mentions a Silence Ordinance; Captain Hush declares Quiet Zones. | French Quarter, Storyville |
| **The Mute** | The device a Metronome raid used on Gus. "When the Hush left, the song was gone out of him, and then so was he." Brother Moses lost his band "to the first Mute raids". | Prologue, bandmates |
| **Click-Drones and machines** | Hovering metronomes with tasers, Quantizers, Repo Drones, Butler Units. Metronome machines are usually weak to FUNK. | Every district |
| **The Data Mausoleum** | A server farm under the oldest tomb in St. Louis No. 1, holding the captured songs of everyone Metronome Muted. They're fed to the Click "so it can learn what to erase". | Cities of the Dead |
| **The Click** | "A perfect beat, broadcast citywide, and when it drops, every heart in Neon Orleans keeps time with it. Forever. No swing. No lagniappe. Just the grid." Built from the six stolen Blue Notes and "ten thousand captured songs", broadcast from the crown of Metronome Tower. | Prologue, the Tower |

**Gus.** Auguste "Gus" Thibodeaux was Grand Marshal of the Lagniappe Social Aid & Pleasure Club in Tremé, and the man who taught you to play. The game opens at his jazz funeral. He leaves you his second-line umbrella and his last cassette, made the night before the raid. On it he tells you about the Click and the Blue Notes: "Six notes, six lieutenants, one in each pocket. Take 'em back. Learn to play the whole scale. And when you can, baby, you can break the Click." ([prologue.scene.ts](../../src/content/story/prologue.scene.ts))

**You.** A musician in Gus's band. You choose a name, your roots and your instrument. The text calls you "you", in the present tense, and never gives you a gender. People call you baby, cher, chéri, mon 'tit or dawlin', depending on who's talking. By the credits you're the Grand Marshal ("Grand Marshal: [name]" in [finale.scene.ts](../../src/content/story/finale.scene.ts); character creation opens with "Every Grand Marshal starts with a name").

**What you're fighting for.** The city's own time: its swing, its lagniappe, its right to play out of tune on purpose. The tagline: "The city that care forgot never forgot how to play."

## Who you are: roots and instruments

**Roots** are where you grew up ([roots.ts](../../src/content/roots.ts)). Each gives a small stat bonus, starting kit, and a way people talk to you.

| Roots | Home | Bonus | What changes in the story |
|---|---|---|---|
| Creole | 7th Ward | +2 Mojo, a Gris-Gris Pouch, 5% off in Tremé and the Quarter | "Family knows everyone": cousins, a grandmother who danced in Congo Square, Krewe rolls at the ball |
| Cajun | Bayou Lafourche | +2 Grit, two Boudin Links, 5% off in the Bayou | Speaks Cajun French with bayou folk; extra dialogue with Clothilde and Remy |
| Yat | Irish Channel | +2 Tempo, an extra Ð50 | "Streetwise": better odds on Mojo bluffs (+15%) |

Scenes that branch on roots: Mama Roux's greeting and Ti-Jacques' small talk ([treme/places.scene.ts](../../src/content/districts/treme/places.scene.ts)), Captain Hush's pre-fight scene ([captain_hush.scene.ts](../../src/content/bosses/captain_hush.scene.ts)), the street preacher ([streetEvents.scene.ts](../../src/content/world/streetEvents.scene.ts)), Clothilde and Remy ([bayou/places.scene.ts](../../src/content/districts/bayou/places.scene.ts)), and the roots option at the Vane ball ([garden/places.scene.ts](../../src/content/districts/garden/places.scene.ts)).

**Instruments** are the seven classes, the instruments of a New Orleans brass band ([classes/](../../src/content/classes/)). Ti-Jacques builds each one's legendary once you hold five Blue Notes.

| Class | Title | Tones | Role | Legendary |
|---|---|---|---|---|
| Trumpet | Lead Horn | HOT | Burst damage, glass cannon | The Archangel |
| Trombone | Tailgate | BLUE | Drain bruiser, debuffs | Tailgate Royale |
| Sousaphone | Low End | LOW | Tank, armor shred | Leviathan Bell |
| Saxophone | Honker | FUNK, BLUE | Control and charm | Midnight Honker |
| Clarinet | Licorice Stick | HOT, SWEET | Healer, buffer, agile | The Licorice Saint |
| Snare Drum | Snare Line | FUNK | Speed, multi-hit, stun | Thunderhead Snare |
| Bass Drum | The Heartbeat | LOW, FUNK | Heavy hitter, Big Four counter | The Big Four |

## Home base: the Lagniappe club

The Lagniappe Social Aid & Pleasure Club on Claiborne in Tremé: "Folding chairs, a trophy wall, a coffee urn older than you, and the quest board nobody's allowed to touch but Mama Roux." Recovered Blue Notes hang on the trophy wall. You rest here for free (the day turns over), save by hand, swap bandmates, read the quest board and replay Gus's cassette. Lose a street fight and somebody drags you back here. The second line forms here, and after the ending, New Game+ starts here ([treme/places.scene.ts](../../src/content/districts/treme/places.scene.ts), [streets.scene.ts](../../src/content/world/streets.scene.ts)).

## How an act runs

Each district is one act, and most follow the same shape ([acts.ts](../../src/content/story/acts.ts)):

1. **Arrive.** One line of first-visit narration points you at the district's guide ([arrivals.scene.ts](../../src/content/world/arrivals.scene.ts)).
2. **Meet the guide,** who explains what Metronome is doing here and what you need.
3. **Earn the way in.** Win street fights, collect items from street enemies, or get past a gate.
4. **Face the boss.** A short scene before, the fight, and a scene after: the Blue Note, sometimes a big choice, and the guide sending you on.

| Act | District | Guide | Steps | Boss | Note | Opens |
|---|---|---|---|---|---|---|
| 1 | Tremé | Mama Roux | Win 3 street fights; Congo Square | Captain Hush | C | French Quarter |
| 2 | French Quarter & Frenchmen | Miss Odette | Sabotage the broadcaster; the main stage | Vox Perfecta | E♭ | Storyville |
| 3 | Storyville | Madame Céleste | 3 Ledger Pages; buy the Whisper; the vault | Mr. Ledger | F | Manchac Swamp |
| 4 | Manchac Swamp | Grand-mère Clothilde | Take the airboat; 3 Rougarou Pups; Pump Station 13 | Le Rougarou Chromé | G | Cities of the Dead |
| 5 | Cities of the Dead | Mambo Rosalie | 3 Crypt Keys; the Data Mausoleum | The Archivist | B♭ | Garden District |
| 6 | Garden District | (Rosalie points the way) | Get an invitation; the ball; the duel | Lady Concertmaster Isolde Vane | G♭ | (the Tower act) |
| 7 | Central Business District | Gus | Form the second line; climb; the Booth; the Crown | The Conductor, then THE CLICK | none | The ending |

## The districts, in story order

### 1. Tremé

- **Tone.** Home. "Shotgun houses wrapped in neon, iron balconies dripping pink light, and a brass band always practicing somewhere behind a shutter." Warm, defiant, under occupation ([treme/district.ts](../../src/content/districts/treme/district.ts)).
- **Places.** The Lagniappe club; Mama Roux's Kitchen ("the best cook in the Sixth Ward"); Ti-Jacques' Pawn & Horn; Congo Square, fenced off by Metronome ("The fence hums.").
- **Street enemies.** Hush Patrolman, Click-Drone, Mutant Nutria, Corner Hustler. **Elite:** Hush Sergeant. **Boss:** Captain Hush, who has declared Congo Square a Quiet Zone.
- **People.** Mama Roux, the neighborhood's cook and mentor. Ti-Jacques, "a man who can fix anything that makes a sound", who talks like the bayou ("Mais, cher") and builds your legendary instrument later. Gus, on his cassette.
- **The act.** The prologue (the funeral, two tutorial fights against the Hush), then thinning the Hush out with three street wins, until Captain Hush will "come see about you himself". When he falls, "the sound comes back into the square all at once". Afterwards Congo Square hosts a drum circle and a sparring circle.

### 2. French Quarter & Frenchmen

- **Tone.** Licensed fun. "The Vieux Carré under holographic billboards. Wrought iron, go-cups, licensed jingles leaking from every doorway, and the river breathing fog over it all." The most comic district: mimes, tourists, drunks ([quarter/district.ts](../../src/content/districts/quarter/district.ts)).
- **Places.** The Bourbon Strip (the Licensed Entertainment Strip, with the main stage at the end); the Thirsty Pelican (rumors, the bounty board, crawfish races); Club Feu Follet on Frenchmen ("The last real jazz club"); the French Market; Jackson Square (Madame Zinnia's data-tarot, and the licensing broadcaster).
- **Street enemies.** Go-Cup Golem, Neon Mime, Licensed Busker-Bot, Bourbon Barker. **Elite:** Hurricane Hooligan. **Boss:** Vox Perfecta, a forty-foot holographic android diva: "Perfect pitch, perfect time, and one note she cannot feel."
- **People.** Miss Odette, who runs Club Feu Follet and refuses to pay Metronome's license. Sugar, the singer you win at the Cutting Contest. Madame Zinnia, the tarot reader with a cybernetic eye. An old busker on a Jackson Square bench. The Cutting Contest rivals: "Hot Rod" Broussard (trumpet), Big Mae Boudreaux (sousaphone) and Henri "Two-Tone" LeBlanc (saxophone).
- **The act.** Kill the broadcaster's signal: wire in Gus's cassette, smash it, or play your own riff into it. Then take the main stage from Vox. Afterwards comes the first big choice: reprogram her or shut her down ([vox_perfecta.scene.ts](../../src/content/bosses/vox_perfecta.scene.ts)).

### 3. Storyville

- **Tone.** Velvet and paper. "The old red-light district, revived in neon and velvet. Basin Street glows magenta. Every parlor has a piano, a bouncer, and a contract nailed above the bar." Everything has a price ([storyville/district.ts](../../src/content/districts/storyville/district.ts)).
- **Places.** The Velvet Lantern (Madame Céleste's parlor: deluxe rest, Whispers, Professor Theo's piano, the DJ in the corner booth); the Basin Street Chop Shop (cyberware); Ledger & Sons Counting House, with a vault somewhere under Basin Street.
- **Street enemies.** Contract Enforcer, Velvet Rope Bouncer, Absinthe Phantom, Repo Drone. **Elite:** The Bagman. **Boss:** Mr. Ledger, who "bought every contract in Storyville".
- **People.** Madame Céleste, who sells secrets and keeps her deals. Professor Theo, who "taught every piano player in this district, and then Metronome taught them to stop". Static, a DJ whose contract Metronome owns. The Chop Shop surgeon, who did Lucien's implant and is sorry.
- **The act.** Take three Ledger Pages off Contract Enforcers, pay Céleste Ð60 for the Whisper that locates the vault, and go down the coal chute. Ledger's Chops compound every turn: "Don't give him turns." Afterwards comes the second big choice: burn the contracts or keep the money. Céleste hands you an airboat key either way ([mr_ledger.scene.ts](../../src/content/bosses/mr_ledger.scene.ts)).

### 4. Manchac Swamp (the Bayou)

- **Tone.** Old, wet and haunted by machines. "Cypress knees in black water, fog thick enough to lean on, jet-turbine airboats screaming past, and Metronome pylons humming a test tone deep in the dark." The swamp is "taking them back, slowly" ([bayou/district.ts](../../src/content/districts/bayou/district.ts)). You reach it only by airboat.
- **Places.** Grand-mère Clothilde's Cabin; the Fais Do-Do Dancehall; Boudreaux's Boudin Shack ("the worst jokes in the parish, free with purchase"); Pump Station 13, broadcasting the Click's test signal.
- **Street enemies.** Chrome Gator, Feu Follet, Swamp Grunch, Skeeter Swarm, Rougarou Pup. **Elite:** Big Grunch. **Boss:** Le Rougarou Chromé, who was Lucien.
- **People.** Grand-mère Clothilde, a traiteur who heals for free. Remy Guidry, who plays frottoir at the Fais Do-Do. Boudreaux, who tells Boudreaux-and-Thibodeaux jokes. Lucien, alpha of the Chrome Wolves.
- **The act.** Clothilde explains that Metronome has been testing the Click out here, and the signal got into Lucien's implant and "turned him into something the old folks got a name for. Rougarou." Put down three feral pups, follow the trail, and reach him with heat. Afterwards comes the third big choice: spare him or finish him ([rougarou.scene.ts](../../src/content/bosses/rougarou.scene.ts)).

### 5. Cities of the Dead

- **Tone.** Grief, and tenderness for the dead. "Whitewashed tombs in neat rows, LED votives flickering in the alcoves, and beneath it all a hum: the Data Mausoleum, where Metronome keeps the songs of the dead." ([cemetery/district.ts](../../src/content/districts/cemetery/district.ts))
- **Places.** Mambo Rosalie's Temple (blessings, gris-gris); the Crypt Rows; the Data Mausoleum, "a server farm shaped like a chapel".
- **Street enemies.** Wandering Haint, Data Wraith, Tomb Crawler, Archive Drone, Bone Choir. **Elite:** Crypt Keeper Unit. **Boss:** The Archivist, which summons Ghost Tracks, "the captured echo of a dead musician".
- **People.** Mambo Rosalie, a priestess who "keeps the dead company". Brother Moses, a banjo player who has played for the restless dead alone for a year. Three haints in the rows, each with a story.
- **The act.** Rosalie tells you Gus's song is down in the Mausoleum and he can't settle until it's free. Take three Crypt Keys from wraiths and haints, open the slab, and give the Archivist some grief ("BLUE tones break through its filters"). When it falls, the songs fly out "like birds", and Gus steps out of the racks, "wearing a hat". He gives you his Grand Marshal's Regalia and sends you after the last note ([archivist.scene.ts](../../src/content/bosses/archivist.scene.ts)).

### 6. Garden District

- **Tone.** Old money run by machines. "Oak-lined St. Charles Avenue. Mansions under security domes, topiary trimmed into soldiers, and a streetcar that runs in perfect silence past gates that never open." Cold, exact, silly in its formality ([garden/district.ts](../../src/content/districts/garden/district.ts)).
- **Places.** Maison Chrome (top-tier gear); the Silver Tuxedo Supper Club (string-quartet bots, and a valet who knows things); Vane Manor, where the debutante ball happens.
- **Street enemies.** Debutante Droid, Butler Unit, Topiary Mech, String Quartet Drone, Valet Assassin. **Elite:** Security Chief Beaumont. **Boss:** Lady Concertmaster Isolde Vane, "Metronome's First Chair, keeper of the Blue Note", with a violin that is also a blade.
- **People.** The Silver Tuxedo's valet. Isolde. Static and Céleste, from Storyville, if you earned their help.
- **The act.** Get an invitation to the Vane ball. Static forges one if he's in your band, Céleste calls in a favor if you burned the contracts, or the valet sells one for Ð300 ([shared.scene.ts](../../src/content/world/shared.scene.ts)). Cross the ballroom floor by dancing (Tempo), bluffing (Mojo), your roots, or fighting, then duel Isolde. With the sixth note you feel "the shape of the blues in your hands for the first time". Isolde tells you the Conductor broadcasts the Click "tomorrow night" and sends you to "take everyone" ([isolde.scene.ts](../../src/content/bosses/isolde.scene.ts)).

### 7. Central Business District (the Tower)

- **Tone.** The grid itself. "Glass canyons and a sky the color of a dead CRT. Metronome Tower rises out of the middle of it, a chrome needle with a pendulum in its crown, and the whole city ticks to it." ([tower/district.ts](../../src/content/districts/tower/district.ts))
- **Places.** Metronome Tower, the final dungeon. Its floors are below.
- **Street enemies.** Hush Elite, Quantizer, Session Clone ("a corporate copy of a musician who plays your instrument"), Click Sentinel. **Elite:** Tempo Warden. **Bosses:** The Conductor, then THE CLICK.
- **People.** Your whole second line, and the Conductor.
- **The act.** Back at the club, the second line forms and marches "Claiborne to Canal, Canal to Poydras", and the district opens ([secondLine.scene.ts](../../src/content/story/secondLine.scene.ts)). Then you climb.

## The Blue Notes

The six notes of the blues scale, "the frequencies this city's made of" ([notes.ts](../../src/content/notes.ts)). Each boss guards one. You recover them in story order, which isn't scale order: the blue note itself comes last.

| Note | Degree | Holder | The line you hear when it's recovered |
|---|---|---|---|
| C | Root | Captain Hush | "Every song starts at the root. So does this city." |
| E♭ | Flat Third | Vox Perfecta | "The flat third is where the song starts to hurt, a little, on purpose." |
| F | Fourth | Mr. Ledger | "The fourth leans forward. It wants to go somewhere." |
| G | Fifth | Le Rougarou Chromé | "The fifth holds the roof up." |
| B♭ | Flat Seventh | The Archivist | "The flat seventh is the door you leave by, and come back through." |
| G♭ | The Blue Note | Isolde Vane | "The blue note itself. Wrong on paper. Right in the chest." |

The Conductor and the Click hold no note. With all six, you can Play the Blues at the Crown.

## The band

Four bandmates can be recruited. Two can be active at a time, and each assists every third round ([bandmates.ts](../../src/content/band/bandmates.ts)). Each one is won by a quest in their own district.

| Bandmate | Plays | How they join | Their story |
|---|---|---|---|
| Sugar Desmarais | vocals | Win the Cutting Contest at Club Feu Follet | Sang backup on MoodSync tracks for two years before she quit. "They pitched my voice to a grid," she says. "I pitched their grid to the river." |
| "Static" Okafor | cassette deck | Walk him two blocks past Metronome's Repo Drones ("Static's Contract") | Built the Click's first test encoder as a Metronome intern and has been trying to break it ever since |
| Remy Guidry | frottoir | Hold the Fais Do-Do against two waves of Chrome Gators | His grand-père played frottoir on the same floor for sixty years |
| Brother Moses Valcour | banjo | Lay the three Restless Haints to rest | Lost his whole band to the first Mute raids, and kept playing in the cemetery "so they'd have somewhere to listen" |

Recruited bandmates turn up elsewhere too. Static can hack a payroll terminal or fix a broken drone in street events, and forges the ball invitation. Sugar sings in the ending.

## The second line

When you hold all six notes, you form the second line at the Lagniappe club. Everyone who'll march is listed on cards, each with a line of their own ([secondLine.ts](../../src/content/band/secondLine.ts)). Anyone who joins later falls in at the start of your next climb, with a roll call of their own.

| Marcher | Joins if | Their line |
|---|---|---|
| Gus Thibodeaux (Grand Marshal) | Freed from the Mausoleum (always, by this point) | "Leads the way, hat tipped, umbrella high." |
| Mama Roux | Always | "Brings the red beans and the whole kitchen." |
| Ti-Jacques | Always | "Carries a horn in each hand and one in reserve." |
| Miss Odette Fontenot | Always | "Club Feu Follet closes for the night. Everybody's in the street." |
| Sugar, Static, Remy, Brother Moses | Recruited | (one line each) |
| Madame Céleste Arceneaux | You burned the contracts | "Storyville walks free behind her, every one of them." |
| Vox Perfecta | You reprogrammed her | "Singing for real now. A little flat on purpose." |
| Lucien | You spared him | "The Chrome Wolves run alongside, howling in swing." |
| Madame Zinnia | The Lost Eye is done | "Reads the cards and says the Tower's already lost." |
| Grand-mère Clothilde | Traiteur's Herbs is done | "Says a prayer over the whole line before it steps off." |
| Mambo Rosalie | Restless Haints is done | "Shakes the asson. The dead keep time with the living." |
| Professor Theo Lavigne | The Missing Rolls is done | "Pushes an upright piano down Canal Street on a dolly." |

The line can be 4 to 15 strong. Inside the Tower each marcher gives +2% to all stats (up to +25%), and every one of them strikes when you Play the Blues. The roster is fixed when it forms: anyone recruited, or any quest finished, after that doesn't join. That behavior is an open design question in [known issues](../known-issues.md).

## The Tower

Five floors, bottom to top ([tower.ts](../../src/content/world/tower.ts), [climb.scene.ts](../../src/content/districts/tower/climb.scene.ts)). At the plaza, "the Hush step aside, because that is what a crowd is for."

1. **The Lobby.** "Marble, chrome, a fountain that ticks." Two fights against Hush Elites, a Quantizer and a Sentinel. No fleeing.
2. **The Server Floors.** "Floors of servers humming the Click." Two fights, including Session Clones of your own instrument.
3. **The Studio Floor.** A busted vending machine ("WORKS IF YOU HIT IT", "GUS WAS HERE") sells snacks, works as a save point, and lets you rest once.
4. **The Booth.** The Conductor, at the console with his baton. Afterwards the second line rallies around you: "Mama Roux produces a thermos."
5. **The Crown.** THE CLICK, a colossal chrome metronome. "It does not speak. It ticks." Perfect Silence makes it immune until you Play the Blues, and it re-shields once at half Heart.

## The ending

The Click's pendulum stops mid-swing, every screen in the city goes dark, and "the city, for the first time in a year, hears itself." You come down the Tower at dawn with the second line behind you. Gus tips his hat, "already getting hard to see in the daylight", lifts the umbrella one more time, and walks on ahead of the band into the sun ([finale.scene.ts](../../src/content/story/finale.scene.ts)).

**The three story choices.** Each comes right after a boss and is recorded in the save. Each changes later lines, what the district looks like afterwards, the second line and the epilogue.

| Choice | Option | What it changes |
|---|---|---|
| **Vox** (after Vox Perfecta) | **Reprogram her** | She sings for real, "a little flat on purpose", and marches. The main stage gets a real band with Vox on it. Odette: "You did a good thing, cher." |
| | **Shut her down** | You get the Perfect Pitch Chip (a mod: wider ONE zone, more crits). The main stage stays dark until "somebody put a real band on it". |
| **The contracts** (after Mr. Ledger) | **Burn them** | Storyville is free. The Lantern's deluxe rest is free forever. Céleste marches, and she can get you the ball invitation. "FREE" is painted over the Counting House door. |
| | **Keep the money** | +Ð1,000, and the paper on every life in Storyville is yours. Céleste goes cold, "I just remember", and won't march. |
| **Lucien** (after Le Rougarou Chromé) | **Spare him** | You smash the implant. Lucien and the Chrome Wolves march. He sits on Clothilde's porch all night and fixes her steps. |
| | **Finish him** | You get the Chrome Fang (a charm). The pack scatters. Clothilde prays for both of you. |

**The epilogue** is four cards: Vox, Storyville and Lucien, each following your choice, and the second line's size ("Everyone in it got a hat."). Then "THE END. The city that care forgot never forgot how to play.", then the credits.

**Smaller choices** shape single scenes without branching the ending: how you kill the broadcaster's signal (+40 Groove next fight, a fight with a Hush squad, or +1 Mojo for good), how you cross the ballroom, and whether to answer a street event kindly or not (pocketing a busker's tips gives you Bad Juju).

## New Game+

After the ending, the club offers "March again (New Game+)" ([finale.scene.ts](../../src/content/story/finale.scene.ts)). "The city resets like a tape rewound," and the prologue plays again.

- **You keep** your level and XP, gear, sheet music, permanent stats, blessings, your bag, the Lexicon, the Blue Book, the day count and half your Doubloons ([state.ts](../../src/engine/state.ts)).
- **The city resets:** the story, the Blue Notes, the band, quests and flags.
- **Enemies get +30% per cycle.** The credits mark the save "New Game+1", "New Game+2", and so on.

## Around the edges

These aren't on the main path, but they make the city feel lived in.

- **Side quests** ([quests.ts](../../src/content/quests.ts)), each tied to a person: Red Beans Monday (Mama Roux; her meals get stronger), The Confiscated Horn (the Jackson Square busker), the Cutting Contest, The Lost Eye (Zinnia), Static's Contract, The Professor's Missing Rolls, Defend the Fais Do-Do (Remy), Traiteur's Herbs (Clothilde), Restless Haints (Rosalie and Moses).
- **Hit the Streets** in any district: mostly fights, sometimes a street event, a find, the district elite, or the Praline Lady and her cart of lucky things ([streets.scene.ts](../../src/content/world/streets.scene.ts)). There are 23 street events, some district-only: Hush checkpoints, crawfish boils, a passing second line, a haint's riddle, a crate marked LAVIGNE ([streetEvents.scene.ts](../../src/content/world/streetEvents.scene.ts)).
- **Ways to get ready:** the Pelican's bounty board (one elite per district), sparring in Congo Square, the daily Sit In at Feu Follet, Zinnia's data-tarot, Céleste's Whispers (any boss's weakness for Ð120), Rosalie's blessings (+1 to a stat, three at most), bar rumors about the next boss, and Ti-Jacques' legendary instrument at five notes.

## What the game leaves open

Don't settle these in new content without agreeing on it first.

- **The timeline.** The ending says the city hears itself "for the first time in a year", and Vox's defeat gets the Strip laughing "for the first time in a year". But one haint says "The Hush took my horn in '82 and I died in '83", so the Hush were taking instruments at least two years before 2084. The game doesn't date the licensing, the Mute raids or the Click project.
- **The Chrome Wolves.** Lucien is "the boy with the implant" and the pack's alpha. The pack has implants and howls, and the pups are "a Chrome Wolf gone feral". Whether the other Chrome Wolves are people, animals or something between isn't stated.
- **Who the lieutenants work for.** Gus calls the six note-holders lieutenants. Captain Hush, Vox and Isolde are plainly Metronome's. Céleste calls Ledger "a worse problem than Metronome", though Metronome owns Static's contract and its Repo Drones work Ledger's streets. Lucien is a victim of the signal, not a lieutenant by choice. The game never spells out how Ledger & Sons relates to Metronome.
- **Isolde's father.** "Father never let me be flat." He is never named.
- **What Gus is after the Mausoleum.** A freed song, or a spirit "wearing a hat". Rosalie says he's "settled. Not resting." He leads the line and is gone by daylight. The game doesn't call him a ghost or a haint.
- **The spelling of the tradition.** The Lexicon defines a mambo as "A Voodoo priestess"; [character design](character-design.md) writes Vodou. Pick one with the team before adding more.
