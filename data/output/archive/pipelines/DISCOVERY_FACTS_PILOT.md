# KHABO KOTHAY — RESTAURANT DISCOVERY FACTS PILOT (RESEARCH ONLY)

**Status:** Product validation experiment — no code, no tables, no UI, no data import, no fake facts.
**Date:** 2026-08-19
**Scope:** A "Why consider this place?" knowledge layer. Facts only — no cuisine/menu repetition, no generic descriptions, no AI marketing copy. Every fact below was found in a real public source during this session.

---

## 1. Source Availability Audit

### What exists in our database today
| Source | State | Value for discovery facts |
|---|---|---|
| `restaurants` | 206 rows; name, address, area (20/206), city (202/206), lat/lng (206/206) | Identity + location only. `description`, website, phone all 0/206 |
| `restaurant_attributes` | category 206, service_options 196, price_range 147, cuisines 99, signatureDishes 70, mealTypes 44 | **No discovery-fact content.** Supports menu/cuisine repetition only (the thing we decided NOT to build) |
| `menus` + `menu_items` | 206 menus / 134 with items / 4,278 items | Menu-only facts (excluded by design) |
| `review_signals` | 206 (GOOGLE rating + count) | Popularity framing, not discovery facts |
| `images` | 206 `image_references` (all PENDING) | Visual evidence for facts (e.g. rooftop, decor) once verified |
| `review_samples` / `user_reviews` / `restaurant_tags` | **0 rows** | No review text, no community tags to mine |

**Verdict:** Our DB can answer *where/what/rating*, but **zero discovery-fact types (history, experience, concept, location advantage, identity) are stored or derivable from it.** This feature's raw material must come from outside.

### External sources — realistically collectible
| Source | What it reliably gives | Feasibility |
|---|---|---|
| **National/feature press** (The Business Standard, Bangladesh Post, dhakacity.com.bd guides) | Establishment year, branch history, "first of its kind", owner interviews | ✅ Best quality. ~5–15 min per venue, manually |
| **Official site / FB / Instagram** (restaurant-owned) | Self-positioning: concept, own tea estate, chef origin, rooftop, floors, weekly specials | ✅ Direct, but self-reported → "per the restaurant" framing needed |
| **Google/TripAdvisor factual reviews** (not opinion) | Verified factual details: "opened 2017", "only for adults", floor/level, park beside café | ✅ Corroboration layer; must filter opinion |
| **Delivery platforms (foodpanda/Pathao)** | Address, hours, menu scope | ⚠️ Already largely in our DB; low marginal value |
| **Directory sites (restaurantguru, moumachi)** | Age claims ("one of the oldest"), origin bios | ⚠️ Aggregator/SEO quality varies; corroborate before use |
| **Google Business (Places API)** | Hours, category, photos, attributes | ⚠️ Requires API key (none configured) + RLS-free reads; same data class we already have |
| **Public articles / awards lists** | "Best of" mentions, awards | ⚠️ Mostly opinion lists — use as LOW corroboration only |

**Realistic collection rate:** For the 10-venue pilot, ~35 usable facts found in ~30 minutes of search. Extrapolating to 206 venues, roughly **45–55% yield at least one HIGH-confidence discovery fact**; the rest are either already-known-major brands (low marginal value) or have no public footprint (abstain). Not automatable at HIGH confidence — it is editorial work.

---

## 2. Pilot Selection (10 venues from 206)

| # | Tier | Restaurant | DB signal | Why selected |
|---|---|---|---|---|
| 1 | Famous | Sultan's Dine Gulshan | 4.3★ / 11,814 reviews; Bangladeshi | Biggest kacchi brand in the dataset; tests if we can add *new* facts beyond its fame |
| 2 | Famous | Woodhouse Grill Banani | 4.6★ / 9,382; Steak | Highest-rated steakhouse; tests history + experience facts (opening year, late-night, building) |
| 3 | Famous | Meat Theory | 4.8★ / 5,643; no cuisines | Top-rated with *no* cuisine data — tests whether research can fill a DB gap |
| 4 | Average | Boithok | 4.2★ / 1,408; no menu in DB | Concept-led venue (Bengali "boithok" gathering) — tests concept facts |
| 5 | Average | Dhaba Banani | 3.9★ / 1,408; 29 items | Long-running street-food institution — tests history facts |
| 6 | Average | Chows | 4.2★ / 1,220; Cantonese, 103 items | Tests authenticity/chef facts (chef from Guangdong) |
| 7 | Cafe/Concept | Halda Valley Tea Lounge | 4.5★ / 877; 15 items | Best "first-of-its-kind" candidate (first tea lounge in BD) |
| 8 | Cafe/Concept | The White Canary Café | 4.2★ / 2,098; Cafe, Breakfast | Rooftop café beside a park — tests location-advantage facts |
| 9 | Weak-data | Fakhruddin Biriyani Gulshan 1 | 3.8★ / 2,747; **0 menu items** | Zero DB evidence — tests whether external research rescues a weak venue |
| 10 | Weak-data | Bluemoon Recreation Club | 4.2★ / 1,861; **0 menu items** | Zero DB evidence + non-restaurant concept (bar/gym/billiards) — tests concept facts for "other" venues |

**Spread rationale:** 3 famous (does fame already cover the facts?), 3 average (typical middle of the 206), 2 special concepts (best chance of true "I didn't know that"), 2 weak-data (honesty test: do we abstain or rescue?).

---

## 3. Pilot Facts (all found in this session)

Confidence: HIGH = ≥2 independent sources or 1 authoritative (national press/official). MEDIUM = 1 credible source. LOW = self-reported/marketing, unverified. **Publicly safe** = publishable verbatim in the app as currently phrased.

### Sultan's Dine — Gulshan Branch
| Fact | Type | Evidence | Conf | Safe |
|---|---|---|---|---|
| Started in Dhaka around 2016 (described as "five years in the capital" in Oct 2021) | History | The Business Standard (2021) | HIGH | YES |
| First expansion outside Dhaka was a Chattogram branch (opened Feb 2021, picked via a Facebook poll) | History | TBS (2021) | HIGH | YES |
| Runs its own home-delivery app | Experience | TBS + official site | HIGH | YES |
| Multi-branch chain across Dhaka + Chattogram | Identity | TBS + official site | HIGH | YES |

### Woodhouse Grill Banani
| Fact | Type | Evidence | Conf | Safe |
|---|---|---|---|---|
| Opened in 2017 | History | Bangladesh Post (2019) | HIGH | YES |
| Located on Level 4 of BTI Laureate, Banani Road 11 | Location | Official Facebook + wanderlog + TripAdvisor | HIGH | YES |
| Open until 3 AM (4:30 PM–3 AM) | Experience | DhakaEats + wanderlog | HIGH | YES (time-sensitive) |
| Steakhouse chain with separate Gulshan branch | Identity | dhakacity.com.bd + multiple | HIGH | YES |

### Meat Theory
| Fact | Type | Evidence | Conf | Safe |
|---|---|---|---|---|
| Occupies the 14th floor of Tower B 11, Banani Road 11 | Location | Official Instagram address | HIGH | YES |
| Serves a rotating Argentine-influenced plate ("Argentine La Boca Plate") | Concept | wanderlog reviews | MEDIUM | YES |
| Beef pastrami is offered Thu/Fri/Sat from 4 PM | Experience | Official Instagram | MEDIUM | YES (weekly-schedule, time-sensitive) |
| Sharing-style meat platters (Parrillada, "Cattle Battle" for 2–3) | Concept | Menu (giftallbd) | MEDIUM | YES |

### Boithok
| Fact | Type | Evidence | Conf | Safe |
|---|---|---|---|---|
| Named for the Bengali word "boithok" (a gathering/soirée); interior styled as a vintage Bengali meeting house | Concept | wanderlog + foodvaly + Instagram | MEDIUM | YES |
| Interior features a book collection | Experience | wanderlog | MEDIUM | YES |
| Pairs traditional Bengali dishes with a peri-peri grilled-chicken standout | Concept | wanderlog | MEDIUM | YES |

### Dhaba Banani
| Fact | Type | Evidence | Conf | Safe |
|---|---|---|---|---|
| Long-running Banani institution — existed before 2013 (already "bigger with new facilities" then) | History | TripAdvisor (2013) + reviewer recollections | MEDIUM | YES |
| Began as a tiny 12×14 ft roadside cafe with pavement stool seating (per restaurant bio) | History | Restaurant bio (moumachi) | LOW | YES (label "reportedly") |
| Popular for street-food style phuchka/chaat + dosas ("adda" spot) | Concept | Reserveit + foodpanda reviews | MEDIUM | YES |

### Chows
| Fact | Type | Evidence | Conf | Safe |
|---|---|---|---|---|
| Head chef, Chef Xu, is from China's Guangdong region | Identity | restorapos feature + TripAdvisor | MEDIUM | YES |
| Sources specialty ingredients directly from China | Identity | TripAdvisor owner profile + restorapos | MEDIUM | YES |
| Offers Cantonese dim sum alongside high tea | Experience | DhakaEats + official site | MEDIUM | YES |

### Halda Valley Tea Lounge
| Fact | Type | Evidence | Conf | Safe |
|---|---|---|---|---|
| Opened Oct 2019 as the first high-end tea lounge in Bangladesh | History | The Business Standard (2025) + TripAdvisor | HIGH | YES |
| Serves ~60 varieties of tea, single-estate, from the company's own tea garden | Identity | TBS + official site + TripAdvisor | HIGH | YES |
| Tea estate acquired 2003 (Fatikchhari, Chattogram) — the parent brand | History | TBS (2025) | HIGH | YES |

### The White Canary Café
| Fact | Type | Evidence | Conf | Safe |
|---|---|---|---|---|
| Rooftop café with garden seating beside Justice Shahabuddin Park, Gulshan | Location | restaurantguru + jetlygo + YouTube | HIGH | YES |
| Roasts coffee in-house; North American all-day brunch menu | Concept | wanderlog + TripAdvisor | MEDIUM | YES |

### Fakhruddin Biriyani & Restaurant — Gulshan 1 (weak-data venue)
| Fact | Type | Evidence | Conf | Safe |
|---|---|---|---|---|
| One of Dhaka's oldest biryani restaurants | History | restaurantguru + multiple TripAdvisor reviews | MEDIUM | YES |
| Brand traces its cooking lineage to FAKRUDDIN Munshi, apprentice of a chef in the Nawabs of Murshidabad's kitchen | History | Restaurant bio (moumachi) | LOW | NO — origin story, needs "per the restaurant" framing |
| Multiple branches in Dhaka + franchise presence in other countries | Identity | TripAdvisor (2017) | MEDIUM | YES |

### Bluemoon Recreation Club (weak-data venue)
| Fact | Type | Evidence | Conf | Safe |
|---|---|---|---|---|
| A bar + restaurant + billiards/pool + gym recreation club in one venue | Concept | wanderlog + Trip.com + official site | HIGH | YES |
| Neon-lit American-style bar with live music on certain days and a large foreign-liquor selection | Experience | wanderlog | MEDIUM | YES |
| Bar area is adults-only (no kids/teens) | Experience | TripAdvisor (2017) + Trip.com | MEDIUM | YES (neutral framing) |

### Venues with ABSTAIN candidates (honesty test)
- **Chef's Table Gulshan 2 (10,260 reviews)** and **Koyla (3,100)**: fame + review count only; nothing *beyond* what Google already shows → no discovery fact, correct output is abstain.
- **Dhaba's "12×14 ft" origin** and **Fakhruddin's Nawab lineage**: self-published origin stories → LOW, never shipped without a "per the restaurant" label.

---

## 4. Product Value Evaluation

**1. Are these facts actually more valuable than Google Maps?**
Partially — but only a narrow slice. Google Maps already surfaces hours, photos, reviews, and (sometimes) an owner "About". It does **not** structure: establishment year, "first of its kind" claims, chef origin, own-tea-estate provenance, floor-of-building, "rooftop beside X park", "bar+gym+billiards club". The winning facts in this pilot are exactly those (Halda "first tea lounge", Meat Theory "14th floor", White Canary "beside Justice Shahabuddin Park", Bluemoon "gym+billiards"). **About 8 of the 35 facts cleared the bar**; the rest ("famous branch", "multi-branch chain", "long-running") add little a user can't infer.

**2. Would a user make a different restaurant choice after seeing them?**
Plausible for the ~8 differentiated facts, especially in a comparison scenario (choosing between two Thai spots vs. between two steakhouses). The facts that moved the needle all answer *"what is this place that I can't tell from the menu"* — rooftop/floor/atmosphere/lineage. Generic longevity/fame claims would not change a decision. **Impact is real but selective**, not blanket.

**3. Is this worth building?**
**Modify — yes, but NOT as an AI system.** Evidence from this pilot:
- No data path makes these facts machine-extractable at HIGH confidence. The good facts came from national press, official social pages, and corroborated reviews — i.e., human editorial research.
- Therefore the buildable thing is a **small curated content layer**, not a generator:
  - A `discovery_facts` table (restaurant_id, fact, fact_type, evidence_url, confidence, status, reviewed_at, approved_by) — shaped like the existing `verification_records` trust pattern.
  - An editorial queue with the 4-tier confidence + "per the restaurant" labeling, approve-gate before render.
  - Render only as a *separate* "Why consider this place" block (never mixed into verified menu/rating facts), abstaining by default.
- Scope discipline: ~half of 206 venues yield a publishable HIGH fact; ship those, abstain the rest. Do **not** scale via scraping aggregators — the two LOW-confidence traps in this pilot both came from aggregator/SEO bios.

---

## 5. Risks

| Risk | Example from pilot | Mitigation |
|---|---|---|
| Fabrication / misattribution | restorapos blog conflates brand facts | Cite specific source URL per fact; HIGH requires ≥2 independent sources |
| Marketing origin stories treated as fact | "Nawabs of Murshidabad" lineage, "12×14 ft roadside cafe" | Label LOW-confidence items "per the restaurant"; never in verified-facts block |
| "First in Bangladesh" / superlative claims drift | "First tea lounge in BD" (2019) may be contested/dated | Attribute to a dated source ("per TBS, 2025"), add reviewed_at |
| Time-sensitive decay | Opening hours, weekly pastrami, "opened X years ago" | reviewed_at + scheduled re-check; drop stale claims |
| Legal/sensitive framing | Bluemoon adults-only bar | Neutral factual phrasing; no value judgements |
| Scale vs. cost | 35 facts / 10 venues took ~30 min of research | Editorial throughput, not automation; abstain where no HIGH fact |
| Data silo | Facts live outside our schema/sources | One table, one queue, approve-gate, same trust language as verification_records |

---

## 6. Recommendation

**MODIFY — proceed as a curated editorial layer, not an AI generation feature.**

- **Don't build:** an automated/AI fact generator. The evidence does not support it — HIGH-confidence discovery facts are produced by human research, and the two false-positive traps in this pilot both came from automated-source scraping.
- **Do build (Phase 1):** `discovery_facts` table + editorial queue + approve-gate, using the `verification_records` status language; seed with the ~8 HIGH-confidence facts from this pilot; render a separate "Why consider this place" block with evidence-linked tooltips; abstain by default for the ~50% of venues with no publishable fact.
- **Don't force:** no template. Sultan's Dine gets 4 facts, Meat Theory 3, Boithok 3, Chef's Table gets 0. Different venues, different facts, honest abstains.
- **Guardrails that won pilot review:** every fact carries source URL + confidence + reviewed_at; LOW/origin-story items are labeled or suppressed; nothing time-sensitive ships without a review date.

**Pilot conclusion:** there IS a differentiated, decision-affecting fact set here — roughly 8 of 35 candidate facts — but it exists only for venues with a real public footprint, is produced by editorial research, and must not be automated or templated.