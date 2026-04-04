# Sleep Engineer

A mobile-first PWA to track and improve your sleep using 29 evidence-based rules.

Set your wake and bed times, log daily events (caffeine, meals, exercise, light exposure, screens), and the app automatically scores your compliance, shows upcoming cutoffs, and tracks your progress over time.

**Live app:** [sleep-engineer.vercel.app](https://sleep-engineer.vercel.app)

Based on the article: [How to Engineer Perfect Sleep](https://substack.com/@polymathinvestor/note/c-237314021?r=pc5gs) by Polymath Investor.

## The 29 Rules

### I. Circadian Rhythm

| # | Rule | Key point |
|---|------|-----------|
| 1 | The ±30-minute rail | Keep sleep and wake times within ±30 min, 7 days a week |
| 2 | The 16-hour melatonin timer | Get outdoor sunlight within the first hour of waking |
| 3 | The sunset vaccination | Get 10–20 min of outdoor light in the late afternoon |
| 4 | The circadian dead zone | Light between 10 AM–2 PM has minimal clock-setting power |
| 5 | The 11% social jet lag tax | Each hour of weekend sleep shift = 11% higher CVD risk |
| 6 | Respect the chronotype | Chronotype is ~50% genetic — work with it, not against it |

### II. Sleep Pressure

| # | Rule | Key point |
|---|------|-----------|
| 7 | The 16-hour reboot cycle | Stay awake 16 hours, sleep 8 |
| 8 | The two-process alignment rule | Sleep when pressure is high and alertness is low |
| 9 | The 3 PM nap curfew | No naps after 3 PM |
| 10 | Mental work accelerates sleep | Hard cognitive work produces adenosine faster |
| 11 | Sleep debt can't be fully repaid | You recover less than 50% of lost sleep |

### III. Light & Environment

| # | Rule | Key point |
|---|------|-----------|
| 12 | The 10-lux evening ceiling | Keep ambient light below 10 lux after sunset |
| 13 | Overhead off, candles on | Eliminate overhead lighting after dark |
| 14 | Total darkness during sleep | Bedroom below 1 lux during sleep |
| 15 | Blue light is often exaggerated | Total brightness matters more than Night Mode |
| 16 | The 65°F (18.3°C) bedroom | Target 65°F; above 70°F promotes insomnia |
| 17 | The 90-min warm bath paradox | A warm bath 90 min before bed cuts sleep onset by ~36% |
| 18 | Noise: earplugs (below 30 dB) | Keep bedroom noise below 30 dB |

### IV. Behavioral Timing

| # | Rule | Key point |
|---|------|-----------|
| 19 | The caffeine quarter-life rule | Stop caffeine 10–14 hours before bed |
| 20 | The nightcap myth | Alcohol suppresses REM and fragments sleep |
| 21 | The 2.5–3 hour dinner cutoff | Finish last meal 2.5–4 hours before bed |
| 22 | Evening exercise timing | Vigorous exercise needs 2+ hours before bed |
| 23 | The 10-3-2-1-0 countdown | 10h: no caffeine. 3h: no food/alcohol. 2h: no work. 1h: no screens |

### V. Cognitive & Psychological

| # | Rule | Key point |
|---|------|-----------|
| 24 | The 30–60 min wind-down buffer | Consistent pre-sleep ritual every night |
| 25 | Sleep is involuntary: stop trying | The harder you try, the less you sleep |
| 26 | Stay awake to fall asleep | Paradoxical intention reduces sleep anxiety |
| 27 | Bed is for sleep only | Protect the bed-sleep association |
| 28 | The 20-minute rule | Not asleep in 20 min? Get out of bed |
| 29 | Write it down to shut it down | A 5-min to-do list offloads anxiety |

## Development

```bash
just install        # install dependencies
just dev            # start dev server
just check          # lint + test + build
just fix            # format, then lint + test + build
```
