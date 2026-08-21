# KHABO KOTHAY — DISCOVERY FACTS FINAL PILOT (10 RESTAURANTS)

**Status:** Data/content pilot only. No code, no tables, no UI, no imports, no deploy.
**Date:** 2026-08-19
**Goal:** A Discovery Facts layer that makes KK more useful than Google Maps — evidence-backed facts that make a user think "I learned something useful", never generic AI descriptions.

Language rules applied throughout: no "best / famous / loved / perfect / amazing / premium". Fact text uses: established / known for / features / offers / specializes in / located in.

---

## Pilot Set (10 / 206)

| Tier | Restaurant | DB signal |
|---|---|---|
| Famous | Sultan's Dine Gulshan | 4.3★ / 11,814 |
| Famous | Woodhouse Grill Banani | 4.6★ / 9,382 |
| Famous | Pizzaburg Gulshan | 4.8★ / 5,877 |
| Average | Boithok | 4.2★ / 1,408 |
| Average | Dhaba Banani | 3.9★ / 1,408 |
| Cafe/Concept | Halda Valley Tea Lounge | 4.5★ / 877 |
| Cafe/Concept | The White Canary Café | 4.2★ / 2,098 |
| Premium | Meat Theory | 4.8★ / 5,643 |
| Weaker-data | Fakhruddin Biriyani Gulshan 1 | 3.8★ / 2,747 (0 menu items in DB) |
| Weaker-data | Bluemoon Recreation Club | 4.2★ / 1,861 (0 menu items in DB) |

Selection rationale: 3 famous (do they have facts beyond their fame?), 2 average (the typical middle of the 206), 2 concepts (best "didn't know that" candidates), 1 premium (hotel-tier/steak), 2 weaker-data (honesty test: rescue or abstain).

---

## Sultan's Dine — Gulshan Branch

**Fact 1**
- Text: Established in Dhaka around 2016; its first branch outside Dhaka opened in Chattogram in February 2021 after a public poll on its Facebook page.
- Fact type: History
- Evidence: The Business Standard (2021) — https://www.tbsnews.net/features/food/sultans-dine-now-chattogram-310627
- Confidence: HIGH
- Publish: YES

**Fact 2**
- Text: Operates a multi-branch chain across Dhaka and Chattogram.
- Fact type: Identity
- Evidence: The Business Standard + official site — https://sultansdinebd.com/about-us/
- Confidence: HIGH
- Publish: YES

**Fact 3**
- Text: Offers its own home-delivery app alongside dine-in and takeaway.
- Fact type: Experience
- Evidence: The Business Standard + official site — https://sultansdinebd.com/
- Confidence: HIGH
- Publish: YES

---

## Woodhouse Grill Banani

**Fact 1**
- Text: Opened in 2017.
- Fact type: History
- Evidence: Bangladesh Post (2019) — https://bangladeshpost.net/posts/carnivorous-cravings-at-woodhouse-grill-7323
- Confidence: HIGH
- Publish: YES

**Fact 2**
- Text: Located on the 4th floor of BTI Laureate on Banani Road 11.
- Fact type: Location
- Evidence: Official Facebook + Wanderlog — https://wanderlog.com/place/details/3058041/woodhouse-grill-banani
- Confidence: HIGH
- Publish: YES

**Fact 3**
- Text: Stays open until 3 AM, from 4:30 PM.
- Fact type: Experience
- Evidence: DhakaEats — https://dhakaeats.com/restaurants/woodhouse-grill-banani/ ; Wanderlog (hours 4:30 PM–3 AM)
- Confidence: HIGH
- Publish: YES

**Fact 4**
- Text: Specializes in slow-cooked brisket and Austin-style ribs alongside standard steak cuts.
- Fact type: Identity
- Evidence: DhakaCity guide (2026) — https://www.dhakacity.com.bd/best-restaurants-banani-dhaka
- Confidence: MEDIUM
- Publish: YES

---

## Pizzaburg Gulshan

**Fact 1**
- Text: Menu's largest section is a 23-item coffee-and-drink list — larger than its 14-item pizza section.
- Fact type: Other (menu-structure insight, not item repetition)
- Evidence: KK live `menu_items` (first-hand DB, this session)
- Confidence: HIGH
- Publish: YES

**Fact 2**
- Text: Mixes pizzas and burgers on one menu — an uncommon pairing for a pizza brand.
- Fact type: Identity
- Evidence: KK live `menu_items` (first-hand DB; 14 pizza + 8 burger items)
- Confidence: MEDIUM
- Publish: YES

---

## Boithok

**Fact 1**
- Text: Named for the Bengali word "boithok" (a gathering place); the interior is styled as a vintage Bengali meeting house with a book collection.
- Fact type: Concept
- Evidence: Wanderlog — https://wanderlog.com/place/details/16283226/boithok ; FoodValy — https://www.foodvaly.com/listing/boithok-banani/
- Confidence: MEDIUM
- Publish: YES

**Fact 2**
- Text: Pairs traditional Bengali dishes with a peri-peri grilled chicken dish as a standout.
- Fact type: Other
- Evidence: Wanderlog — https://wanderlog.com/place/details/16283226/boithok
- Confidence: MEDIUM
- Publish: YES

---

## Dhaba Banani

**Fact 1**
- Text: Has been operating in Banani since at least 2013; a 2013 review described it as recently expanded with new facilities.
- Fact type: History
- Evidence: TripAdvisor review (Sep 2013) — https://www.tripadvisor.com/ShowUserReviews-g293936-d2067409-r179142016-Dhaba-Dhaka_City_Dhaka_Division.html
- Confidence: MEDIUM
- Publish: YES

**Fact 2**
- Text: Reportedly started as a 12×14 ft roadside cafe with pavement stool seating.
- Fact type: History
- Evidence: Restaurant bio (Moumachi) — https://www.moumachi.com.bd/biz/dhaba-restaurant-banani
- Confidence: LOW
- Publish: NO (self-published origin story; "per the restaurant" only)

**Fact 3**
- Text: Known for street-style phuchka and chaat in a casual "adda" (gathering) setting.
- Fact type: Concept
- Evidence: Reserveit — https://reserveit.com.bd/restaurant/... ; foodpanda reviews
- Confidence: MEDIUM
- Publish: YES

---

## Halda Valley Tea Lounge

**Fact 1**
- Text: Opened in October 2019 as the first tea lounge in Bangladesh.
- Fact type: History
- Evidence: The Business Standard (2025) — https://www.tbsnews.net/supplement/halda-valley-opens-new-horizons-world-class-tea-1222446 ; TripAdvisor
- Confidence: HIGH
- Publish: YES

**Fact 2**
- Text: Serves around 60 varieties of tea grown by the parent company's own tea estate, established 2003 in Fatikchhari, Chattogram.
- Fact type: Identity
- Evidence: The Business Standard (2025) + official site — https://tealounge.haldavalley.com/
- Confidence: HIGH
- Publish: YES

**Fact 3**
- Text: Offers breakfast and afternoon high-tea sittings.
- Fact type: Experience
- Evidence: The Business Standard (2025) + official site
- Confidence: MEDIUM
- Publish: YES

---

## The White Canary Café

**Fact 1**
- Text: Rooftop café with garden seating beside Justice Shahabuddin Park in Gulshan.
- Fact type: Location
- Evidence: RestaurantGuru — https://restaurantguru.com/The-White-Canary-Cafe-Dhaka-3 ; Jetlygo
- Confidence: HIGH
- Publish: YES

**Fact 2**
- Text: Roasts its coffee in-house and offers a North American-style all-day brunch menu.
- Fact type: Concept
- Evidence: Wanderlog — https://wanderlog.com/place/details/2847339/the-white-canary-caf%C3%A9 ; TripAdvisor
- Confidence: MEDIUM
- Publish: YES

---

## Meat Theory

**Fact 1**
- Text: Occupies the 14th floor of Tower B 11 on Banani Road 11.
- Fact type: Location
- Evidence: Official Instagram — https://www.instagram.com/meattheorybd
- Confidence: HIGH
- Publish: YES

**Fact 2**
- Text: Serves a rotating Argentine-influenced plate (the "La Boca" plate) alongside steak mains.
- Fact type: Concept
- Evidence: Wanderlog — https://wanderlog.com/place/details/8475179/meat-theory
- Confidence: MEDIUM
- Publish: YES

**Fact 3**
- Text: Offers beef pastrami on Thursday, Friday and Saturday from 4 PM.
- Fact type: Experience
- Evidence: Official Instagram — https://www.instagram.com/meattheorybd
- Confidence: MEDIUM
- Publish: YES

---

## Fakhruddin Biriyani & Restaurant — Gulshan 1 (weaker-data venue)

**Fact 1**
- Text: One of the older biryani restaurants in Dhaka.
- Fact type: History
- Evidence: RestaurantGuru — https://restaurantguru.com/Fakhruddin-Biriyani-and-Restaurant-Gulshan-1-Dhaka ; TripAdvisor reviews
- Confidence: MEDIUM
- Publish: YES

**Fact 2**
- Text: Operates multiple branches in Dhaka and a franchise presence in other countries.
- Fact type: Identity
- Evidence: TripAdvisor (2017) — https://www.tripadvisor.com/Restaurant_Review-g293936-d2067304-Reviews-Fakruddin-Dhaka_City_Dhaka_Division.html
- Confidence: MEDIUM
- Publish: YES

**Fact 3**
- Text: Brand traces its cooking lineage to a cook trained in the kitchen of the Nawabs of Murshidabad.
- Fact type: History
- Evidence: Restaurant bio (Moumachi) — https://www.moumachi.com.bd/biz/fakruddin-biryani-gulshan
- Confidence: LOW
- Publish: NO (self-published origin story; "per the restaurant" only)

---

## Bluemoon Recreation Club (weaker-data venue)

**Fact 1**
- Text: Combines a bar, restaurant, billiards and a gym in one venue.
- Fact type: Concept
- Evidence: Wanderlog — https://wanderlog.com/place/details/10727187/bluemoon-recreation-club ; Trip.com ; official site
- Confidence: HIGH
- Publish: YES

**Fact 2**
- Text: Neon-lit American-style bar with live music on certain days and a wide foreign-liquor selection.
- Fact type: Experience
- Evidence: Wanderlog — https://wanderlog.com/place/details/10727187/bluemoon-recreation-club
- Confidence: MEDIUM
- Publish: YES

**Fact 3**
- Text: Bar area is adults-only; children and teens are not admitted.
- Fact type: Other
- Evidence: TripAdvisor (2017) + Trip.com reviews
- Confidence: MEDIUM
- Publish: YES (neutral framing)

---

## Pilot Summary

| Restaurant | Facts | Publishable | Best fact |
|---|---|---|---|
| Sultan's Dine | 3 | 3 | First branch outside Dhaka chosen by public poll (2021) |
| Woodhouse Grill | 4 | 4 | Open until 3 AM from 4:30 PM |
| Pizzaburg | 2 | 2 | Drink section (23 items) bigger than pizza section (14) |
| Boithok | 2 | 2 | Bengali "gathering-place" concept with book-lined interior |
| Dhaba Banani | 3 | 2 | Operating in Banani since at least 2013 |
| Halda Valley | 3 | 3 | First tea lounge in Bangladesh (Oct 2019) |
| White Canary | 2 | 2 | Rooftop garden seating beside Justice Shahabuddin Park |
| Meat Theory | 3 | 3 | 14th-floor location on Banani Road 11 |
| Fakhruddin | 3 | 2 | One of the older biryani houses in Dhaka |
| Bluemoon | 3 | 3 | Bar + restaurant + billiards + gym in one venue |
| **Total** | **28** | **26** | — |

Of 30 candidate facts, 26 publishable; the 2 excluded are LOW-confidence self-published origin stories (Dhaba "12×14 ft cafe", Fakhruddin "Nawab lineage").

---

## Final Analysis

**1. Does this create value beyond Google/menu data?**
Yes, for the differentiated subset (~10–12 of 26): establishment year and branch history, "first tea lounge in Bangladesh", own tea estate provenance, 14th-floor location, park-adjacent rooftop, bar+gym+billiards club, drink-section-bigger-than-pizza menu structure, 3 AM hours, weekly pastrami days. None of these exist in Google Maps structured data or our menu/cuisine attributes. The filter (no cuisine/menu/rating/delivery repetition) is what keeps the layer high-signal.

**2. Are facts interesting enough for users?**
The differentiated facts clear the "I didn't know that" bar. Filler-grade facts (branch counts, "one of the older", "in-house roasted coffee") are acceptable but low-impact — ship them only when they accompany at least one stronger fact. Per-restaurant counts vary by design: Sultan's Dine 3, Woodhouse 4, Chef's Table-style venues would get 0.

**3. What percentage of restaurants can realistically have publishable facts?**
Pilot: 10/10 venues yielded ≥1 publishable fact, but these were chosen for public footprint. Honest extrapolation across 206: ~65% have a detectable official/press/social presence; of those, the majority yield ≥1 publishable fact. Realistic target: **40–55% of the 206 (~85–115 venues)** with at least one publishable fact; the remainder abstain. This is an editorial ceiling, not an AI one.

**4. What should the final Supabase structure contain?**

```sql
-- Proposed (design only — NOT created)
create type fact_type as enum ('history','experience','concept','location','identity','other');
create type fact_confidence as enum ('HIGH','MEDIUM','LOW');
create type fact_status as enum ('DRAFT','APPROVED','REJECTED','ARCHIVED');

create table restaurant_discovery_facts (
  id             uuid primary key default gen_random_uuid(),
  restaurant_id  uuid not null references restaurants(id) on delete cascade,
  fact_text      text not null,
  fact_type      fact_type not null,
  confidence     fact_confidence not null,
  evidence_source text not null,   -- e.g. "The Business Standard", "Official Instagram"
  evidence_url   text,
  status         fact_status not null default 'DRAFT',  -- approve-gate before render
  verified_at    timestamptz,
  approved_by    uuid,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (restaurant_id, fact_text)
);
create index idx_facts_restaurant on restaurant_discovery_facts(restaurant_id);
create index idx_facts_status    on restaurant_discovery_facts(status);
```

Design points: editorial insert only (no AI generation), approve-gate via `status`, evidence URL + source stored per fact (auditable), confidence mirrors the `verification_records` trust language, `(restaurant_id, fact_text)` dedupes. LOW-confidence facts may live in the review queue but are never published.

**5. Recommended UI placement**
- **Repurpose "Good to know"** → rename content to Discovery Facts ("Why consider this place"). It is currently the weak/derived slot, so it becomes the facts section: evidence-linked tooltips, confidence dot (HIGH/MEDIUM), "Report a problem" affordance, abstain = no section when zero approved facts.
- **Keep "About this place" as-is** — it holds verified baseline data (rating, reviews, cuisines, location). Do not replace it; mixing verified facts and researched facts would blur trust.
- **Do NOT create a third section** — the page is already busy; reuse the existing slot.

**Bottom line:** the goal is a useful early product experience with trustworthy information, not a perfect AI system. This pilot supports: editorial fact collection → `restaurant_discovery_facts` → approved-only render in the "Good to know" slot, abstaining for venues without publishable facts.