const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '_research', 'full_review_dataset.json');
const OUT = path.join(__dirname, 'final_approved_dataset.json');
const ds = JSON.parse(fs.readFileSync(SRC, 'utf8'));

const note = (e) => (e.notes = e.notes || []);
const pushNote = (e, msg) => note(e).push(msg);

function find(needle) {
  const hits = ds.entries.filter((e) => e.name.toLowerCase().includes(needle.toLowerCase()));
  if (hits.length !== 1) throw new Error('needle "' + needle + '" matched ' + hits.length);
  return hits[0];
}

// ---------------------------------------------------------------------------
// Explicit founder decisions
// ---------------------------------------------------------------------------

// Pizzaburg — founder KEEP: coffee/drinks identity
const pizzaburg = find('Pizzaburg Gulshan');
pizzaburg.facts = [{
  wording: "Alongside its pizza menu, Pizzaburg has a large coffee and drinks selection.",
  fact_type: 'IDENTITY',
  confidence: 'HIGH',
  source: 'Khabo Kothay live menu_items (read-only audit, 2026-08-19); foodpanda menu (KOKEN drinks line)',
  evidence_note: 'Batch menu data: 23 drinks items (coffee/milkshakes/mojitos via the KOKEN line) vs 14 pizza items.',
  status: 'APPROVED',
}];
pizzaburg.recommendation = 'APPROVED';
pizzaburg.reason = 'Founder approved: unexpected coffee/drinks identity alongside the pizza menu (discovery insight).';

// Woodhouse Grill Banani — founder KEEP: open until 3 AM + brisket/Austin-style ribs
const woodhouse = find('Woodhouse Grill Banani');
woodhouse.facts.forEach((f) => (f.status = 'APPROVED'));
woodhouse.facts.push({
  wording: 'Stays open until 3 AM, from 4:30 PM.',
  fact_type: 'EXPERIENCE',
  confidence: 'HIGH',
  source: 'DhakaEats — https://dhakaeats.com/restaurants/woodhouse-grill-banani/ ; Wanderlog hours',
  evidence_note: 'DhakaEats hours: Sunday 4:30 pm – 3:00 am (all days).',
  status: 'APPROVED',
});
woodhouse.recommendation = 'APPROVED';

// Woodhouse Grill Gulshan — founder REMOVE rule: branch-count fact
const woodhouseG = find('Woodhouse Grill Gulshan');
woodhouseG.facts.forEach((f) => (f.status = 'REMOVED'));
woodhouseG.recommendation = 'REMOVED';
pushNote(woodhouseG, 'Branch-count/location fact removed per founder rule (duplicates Banani identity).');

// Halda Valley — founder KEEP: first tea lounge concept + own estate/varieties
const halda = find('Halda Valley Tea Lounge');
halda.facts.forEach((f) => (f.status = 'APPROVED'));
halda.facts.push({
  wording: 'Opened in October 2019, described by sources as the first tea lounge in Bangladesh.',
  fact_type: 'HISTORY',
  confidence: 'MEDIUM',
  source: 'The Business Standard (2025) — https://www.tbsnews.net/supplement/halda-valley-opens-new-horizons-world-class-tea-1222446 ; TripAdvisor',
  evidence_note: 'TBS dates the Gulshan tea lounge to October 2019; a TripAdvisor review calls it the first tea lounge in Bangladesh — "first" needs corroboration.',
  status: 'HOLD',
});
halda.recommendation = 'APPROVED';
pushNote(halda, '"First tea lounge" claim on HOLD pending corroboration; estate + varieties facts approved.');

// White Canary — founder KEEP: rooftop beside park + in-house roasting/brunch
const wc = find('The White Canary');
wc.facts.forEach((f) => (f.status = 'APPROVED'));
wc.facts.push({
  wording: 'Rooftop café with garden seating beside Justice Shahabuddin Park in Gulshan.',
  fact_type: 'LOCATION',
  confidence: 'HIGH',
  source: 'RestaurantGuru — https://restaurantguru.com/The-White-Canary-Cafe-Dhaka-3 ; Jetlygo',
  evidence_note: 'RestaurantGuru: "rooftop seating right beside Justice Shahbuddin Park"; Jetlygo: "cozy rooftop seating surrounded by lush greenery."',
  status: 'APPROVED',
});
wc.facts.push({
  wording: 'Roasts its coffee in-house and offers an all-day brunch menu.',
  fact_type: 'CONCEPT',
  confidence: 'MEDIUM',
  source: 'Wanderlog — https://wanderlog.com/place/details/2847339/the-white-canary-caf%C3%A9',
  evidence_note: 'Wanderlog: "known for its in-house roasted coffee, delectable cakes, and pastries" and North American all-day brunch options.',
  status: 'APPROVED',
});
wc.recommendation = 'APPROVED';

// Meat Theory — founder KEEP: high-rise + La Boca + pastrami (selected days)
const meat = find('Meat Theory');
meat.facts.forEach((f) => (f.status = 'APPROVED'));
meat.facts.push({
  wording: 'Occupies the 14th floor of Tower B 11 on Banani Road 11.',
  fact_type: 'LOCATION',
  confidence: 'HIGH',
  source: 'Official Instagram — https://www.instagram.com/meattheorybd',
  evidence_note: 'Official Instagram address block: "Tower B 11, Level 14, Plot 43, Block F, Road 11."',
  status: 'APPROVED',
});
meat.facts.push({
  wording: "Serves an Argentine-influenced 'La Boca' plate alongside steak mains, subject to availability.",
  fact_type: 'CONCEPT',
  confidence: 'MEDIUM',
  source: 'Wanderlog — https://wanderlog.com/place/details/8475179/meat-theory',
  evidence_note: 'Wanderlog: "their much-anticipated Argentine La Boca Plate — though it may not always be available."',
  status: 'APPROVED',
});
meat.facts.push({
  wording: 'Offers beef pastrami specials on selected days.',
  fact_type: 'EXPERIENCE',
  confidence: 'MEDIUM',
  source: 'Official Instagram — https://www.instagram.com/meattheorybd',
  evidence_note: 'Official Instagram: "Beef Pastrami, served every Thursday, Friday and Saturday. From 4:00 PM Onwards."',
  status: 'APPROVED',
});
meat.recommendation = 'APPROVED';

// Bluemoon — founder KEEP: bar+gym+billiards concept, American-style wording; HOLD adults-only
const bluemoon = find('Bluemoon');
const comboFact = bluemoon.facts.find((f) => /adults-only/.test(f.wording));
const openingFact = bluemoon.facts.find((f) => /2012/.test(f.wording));
bluemoon.facts = [];
if (openingFact) { openingFact.status = 'APPROVED'; bluemoon.facts.push(openingFact); }
bluemoon.facts.push({
  wording: 'Combines a restaurant, bar, gym and billiards tables in one venue, with live music on certain days.',
  fact_type: 'CONCEPT',
  confidence: 'MEDIUM',
  source: 'Official site — http://www.bluemoonclubbd.com/ ; Wanderlog — https://wanderlog.com/place/details/10727187/bluemoon-recreation-club',
  evidence_note: 'Wanderlog: "a restaurant serving international cuisines, as well as a gym and billiard area" alongside the bar.',
  status: 'APPROVED',
});
bluemoon.facts.push({
  wording: 'Features an American-style neon-lit bar atmosphere with live music on certain days.',
  fact_type: 'EXPERIENCE',
  confidence: 'MEDIUM',
  source: 'Wanderlog — https://wanderlog.com/place/details/10727187/bluemoon-recreation-club',
  evidence_note: 'Wanderlog: "a unique American bar experience with neon lighting and live music on certain days."',
  status: 'APPROVED',
});
if (comboFact) {
  bluemoon.facts.push({
    wording: 'The bar area is adults-only; children and teens are not admitted.',
    fact_type: 'EXPERIENCE',
    confidence: 'MEDIUM',
    source: 'TripAdvisor (2017) — via Wanderlog listing',
    evidence_note: 'TripAdvisor (2017): "only for adults kids and teens are not allowed."',
    status: 'HOLD',
  });
  pushNote(bluemoon, 'Adults-only claim on HOLD — founder requires verification before publishing.');
}
bluemoon.recommendation = 'APPROVED';

// Boithok — founder KEEP: Bengali gathering-house concept with books
const boithok = find('Boithok');
boithok.facts.forEach((f) => (f.status = 'APPROVED'));
boithok.facts.push({
  wording: "Named for the Bengali word 'boithok' (a gathering place); the interior is styled as a vintage Bengali meeting house with a book collection.",
  fact_type: 'CONCEPT',
  confidence: 'MEDIUM',
  source: 'Wanderlog — https://wanderlog.com/place/details/16283226/boithok ; FoodValy — https://www.foodvaly.com/listing/boithok-banani/',
  evidence_note: 'Wanderlog: "beautiful interior featuring Bengali aesthetics and a unique collection of books."',
  status: 'APPROVED',
});
boithok.recommendation = 'APPROVED';

// Dhaba Banani — founder KEEP: street-style phuchka/chaat adda identity
const dhaba = find('Dhaba Banani');
dhaba.facts.forEach((f) => (f.status = 'APPROVED'));
dhaba.facts.push({
  wording: "Known for street-style phuchka and chaat in a casual 'adda' (gathering) setting.",
  fact_type: 'CONCEPT',
  confidence: 'MEDIUM',
  source: 'Reserveit — https://reserveit.com.bd/ ; foodpanda reviews',
  evidence_note: 'Reserveit: "our popular phuchka and chaat that you can enjoy with friends and family during a fun adda."',
  status: 'APPROVED',
});
dhaba.recommendation = 'APPROVED';

// Fakhruddin — founder KEEP: long-running biryani identity/history (no superlatives)
const fakhruddin = find('Fakhruddin Biriyani');
fakhruddin.facts.forEach((f) => (f.status = 'APPROVED'));
fakhruddin.recommendation = 'APPROVED';

// Izakaya — founder KEEP: drone delivery trial / operational identity
const izakaya = find('Izakaya');
izakaya.facts.forEach((f) => (f.status = 'APPROVED'));
izakaya.recommendation = 'APPROVED';

// Jatra Biroti — founder KEEP: concept + sustainability
const jatra = find('Jatra Biroti');
jatra.facts.forEach((f) => (f.status = 'APPROVED'));
jatra.recommendation = 'APPROVED';

// Pizza Da Wali — founder KEEP: founder story, hidden location, Italian sourcing
const pdw = find('Pizza Da Wali');
pdw.facts.forEach((f) => (f.status = 'APPROVED'));
pdw.recommendation = 'APPROVED';

// Umai — founder KEEP: chef pedigree + Norway salmon
const umai = find('Umai');
umai.facts.forEach((f) => (f.status = 'APPROVED'));
umai.recommendation = 'APPROVED';

// Sultan's Dine — founder MODIFY: replace founding/pivot wording
const sultans = find("Sultan's Dine Gulshan");
sultans.facts.forEach((f) => {
  f.wording = 'Sultan\'s Dine was founded in 2017 and grew after shifting its focus from fast food to kacchi biryani.';
  f.status = 'MODIFIED';
});
sultans.recommendation = 'APPROVED';
pushNote(sultans, 'Founder replacement wording applied (avoid unsupported historical superlative).');

// Galito's — founder: KEEP brand entry, REMOVE Tamim Iqbal
const galitos = find("Galito's");
galitos.facts.forEach((f) => {
  if (/Tamim/.test(f.wording)) { f.status = 'REMOVED'; }
  else { f.status = 'APPROVED'; }
});
galitos.recommendation = 'APPROVED';
pushNote(galitos, 'Celebrity-opening fact (Tamim Iqbal) removed per founder: trivia, not discovery value.');

// Fish & Co. — founder MODIFY: Singapore-founded pan concept; REMOVE Dhaka history
const fishco = find('Fish & Co.');
fishco.facts.forEach((f) => {
  if (/2014/.test(f.wording) || /relaunch/.test(f.wording) || /first stint/.test(f.wording)) { f.status = 'REMOVED'; }
  else {
    f.wording = 'Fish & Co. is a Singapore-founded seafood chain known for serving seafood in a pan.';
    f.status = 'MODIFIED';
  }
});
fishco.recommendation = 'APPROVED';
pushNote(fishco, 'Bangladesh closure/relaunch history removed; pan-served concept kept with founder wording.');

// Star Kabab — founder MODIFY: avoid "oldest"
const star = find('Star Kabab');
star.facts.forEach((f) => {
  f.wording = "Star Kabab traces its origins to 1968, giving it decades of history in Dhaka's restaurant scene.";
  f.status = 'MODIFIED';
});
star.recommendation = 'APPROVED';
pushNote(star, 'Founder replacement wording applied (no superlative).');

// Haze — founder MODIFY: neutral wording only
const haze = find('Haze');
haze.facts.forEach((f) => {
  f.wording = 'Haze operates primarily as a shisha lounge with a limited food menu, rather than a traditional restaurant.';
  f.status = 'MODIFIED';
});
haze.recommendation = 'APPROVED';
pushNote(haze, 'Founder replacement wording applied (neutral, non-promotional).');

// El Toro — founder MODIFY: avoid exact founding year
const eltoro = find('El Toro');
eltoro.facts.forEach((f) => {
  if (/mid-1990s|1994|1995|since the/.test(f.wording)) {
    f.wording = 'El Toro has operated as a steakhouse concept since the mid-1990s.';
    f.status = 'MODIFIED';
  } else {
    f.status = 'APPROVED';
  }
});
eltoro.recommendation = 'APPROVED';
pushNote(eltoro, 'Founder wording applied. FLAG: research classifies El Toro as Mexican/Sonora-style — verify "steakhouse concept" wording with founder.');

// NAM — founder HOLD: Thai identity needs official confirmation
const nam = find('NAM');
nam.facts.forEach((f) => (f.status = 'HOLD'));
nam.recommendation = 'HOLD';
pushNote(nam, 'Founder HOLD: Thai identity requires stronger official confirmation.');

// Thai Emerald — general rule: founding-year conflict → HOLD the year fact
const te = find('Thai Emerald');
te.facts.forEach((f) => {
  f.status = /2016/.test(f.wording) ? 'HOLD' : 'APPROVED';
});
te.recommendation = 'APPROVED';
pushNote(te, 'Founding-year fact on HOLD (sources conflict: 2012/2015/2016). Interior fact approved.');

// ---------------------------------------------------------------------------
// General HOLD rule: MEDIUM-confidence oldest/first/best/famous claims need
// stronger evidence (unless explicitly approved by founder)
// ---------------------------------------------------------------------------
const holdPattern = /oldest|first|best|famous/i;
const holdExclusions = new Set(['Takumi']);
const explicitlyApproved = new Set([
  'Woodhouse Grill Banani', 'Halda Valley Tea Lounge', 'The White Canary Café', 'Meat Theory',
  'Bluemoon Recreation Club', 'Boithok', 'Dhaba Banani', 'Fakhruddin Biriyani & Restaurant - Gulshan 1',
  'Izakaya Gulshan', 'Jatra Biroti', 'Pizza Da Wali', 'Umai', 'Galito\'s Gulshan-2', 'Sultan\'s Dine Gulshan Branch',
]);
ds.entries.forEach((e) => {
  if (explicitlyApproved.has(e.name) || holdExclusions.has(e.name)) return;
  (e.facts || []).forEach((f) => {
    if (!f.status) f.status = 'KEEP_CANDIDATE';
    if (f.confidence === 'MEDIUM' && holdPattern.test(f.wording) && f.status !== 'REMOVED') {
      f.status = 'HOLD';
      pushNote(e, 'HOLD: superlative claim ("' + f.wording.slice(0, 60) + '...") needs stronger evidence.');
    }
  });
});

// ---------------------------------------------------------------------------
// General REMOVE rule guard (branch counts / franchise existence / generic
// location) — only facts that are PURELY branch/franchise existence, not
// history/name-origin facts that happen to mention branches.
const removePattern = /(only.*branch|international chain|global chain|another outlet of the same|a branch of the|franchise origin)/i;
ds.entries.forEach((e) => {
  (e.facts || []).forEach((f) => {
    if (f.status !== 'REMOVED' && removePattern.test(f.wording)) {
      f.status = 'REMOVED';
      pushNote(e, 'REMOVED (founder rule): "' + f.wording.slice(0, 60) + '..."');
    }
  });
});

// ---------------------------------------------------------------------------
// Untouched entries: derive fact status from research recommendation.
// KEEP → APPROVED (passed research QA + founder general rules), MODIFY → MODIFIED,
// REJECT → REMOVED, ABSTAIN → no facts.
// ---------------------------------------------------------------------------
ds.entries.forEach((e) => {
  (e.facts || []).forEach((f) => {
    if (f.status !== 'KEEP_CANDIDATE' && f.status !== undefined) return;
    if (e.recommendation === 'MODIFY') f.status = 'MODIFIED';
    else if (e.recommendation === 'REJECT') f.status = 'REMOVED';
    else f.status = 'APPROVED';
  });
});

// ---------------------------------------------------------------------------
// SUPERLATIVE RE-VERIFICATION (founder request): re-verified against primary
// sources 2026-08-19. APPROVE where the claim holds; keep HOLD otherwise.
// ---------------------------------------------------------------------------

// Halda "first tea lounge in Bangladesh" — TBS (2025): "Although coffee shops
// are common in Bangladesh, there had been no specialised high-end tea shop.
// ... Halda Valley opened a dedicated tea lounge in Gulshan, Dhaka, in
// October 2019." + TripAdvisor "First Tea lounge in Bangladesh." → APPROVED.
const haldaRV = find('Halda Valley Tea Lounge');
haldaRV.facts.forEach((f) => {
  if (f.status === 'HOLD' && /first tea lounge/.test(f.wording)) {
    f.status = 'APPROVED';
    f.confidence = 'HIGH';
    f.evidence_note = 'TBS (2025): "there had been no specialised high-end tea shop ... Halda Valley opened a dedicated tea lounge in Gulshan, Dhaka, in October 2019"; TripAdvisor: "First Tea lounge in Bangladesh."';
  }
});

// Chef's Table Gulshan 2 "first proper multi-brand food court" — BBF Digital
// (2020) CEO interview directly supports the attributed claim. → APPROVED.
const cts = ds.entries.find((e) => e.name.includes('Chef') && e.name.includes('Gulshan 2'));
if (!cts) throw new Error('Chef\'s Table Gulshan 2 not found');
cts.facts.forEach((f) => {
  if (f.status === 'HOLD' && /first proper multi-brand food court/.test(f.wording)) {
    f.status = 'APPROVED';
    f.evidence_note = 'BBF Digital (2020) CEO interview: "many consider us to be the first-ever proper food court in Bangladesh."';
  }
});

// Waffle Up "first waffle on a stick" — Dhaka Tribune (2025): "As the first
// ones to serve waffles on a stick in Bangladesh"; official site confirms
// waffle-on-a-stick as the signature format. → APPROVED (attributed wording).
const wu = find('Waffle Up');
wu.facts.forEach((f) => {
  if (f.status === 'HOLD' && /waffles on a stick/.test(f.wording)) {
    f.status = 'APPROVED';
    f.evidence_note = 'Dhaka Tribune (2025): "As the first ones to serve waffles on a stick in Bangladesh"; official site markets "Waffle On A Stick" as the core format.';
  }
});

// Boomers "helped popularize pool/billiards as a student activity" — The Daily
// Star (2011): "the pool culture kicked off in Dhaka." → APPROVED.
const boomers = find('Boomers Cafe');
boomers.facts.forEach((f) => {
  if (f.status === 'HOLD' && /pool\/billiards|pool culture/.test(f.wording)) {
    f.status = 'APPROVED';
    f.evidence_note = 'The Daily Star (2011): "When Boomers Café opened up, it instantly gained popularity as a student lounge, where the pool culture kicked off in Dhaka."';
  }
});

// Spaghetti Jazz — founder manually verified (2026-08-19) and approved the
// 1994 / oldest-Italian / thin-crust-pizza history. → APPROVED.
const spaghetti = find('Spaghetti Jazz');
spaghetti.facts.forEach((f) => {
  if (f.status === 'HOLD' && /oldest Italian|thin-crust pizza/.test(f.wording)) {
    f.status = 'APPROVED';
    pushNote(spaghetti, 'Founder manually verified the 1994 history claim; approved.');
  }
});

// ---------------------------------------------------------------------------

// Founder confirmation (2026-08-19): Bluemoon adults-only claim CONFIRMED.
const bluemoonC = find('Bluemoon Recreation Club');
bluemoonC.facts.forEach((f) => {
  if (f.status === 'HOLD' && /adults-only/.test(f.wording)) {
    f.status = 'APPROVED';
    pushNote(bluemoonC, 'Founder confirmed the adults-only claim; approved.');
  }
});

// Founder confirmation (2026-08-19): NAM Thai identity CONFIRMED.
const namC = find('NAM');
namC.facts.forEach((f) => {
  if (f.status === 'HOLD' && /Thai restaurant in Banani/.test(f.wording)) {
    f.status = 'APPROVED';
    pushNote(namC, 'Founder confirmed the Thai identity; approved.');
  }
});

// Thai Emerald founding-year fact REPLACED (sources conflict 2012/2015/2016).
// Founder: "replace that with something different ... available & verifiable."
// Official Emerald Restaurants site: "began its journey with Thai Emerald."
const thaiEmerald = find('Thai Emerald');
thaiEmerald.facts = thaiEmerald.facts.filter((f) => !(f.status === 'HOLD' && /Gulshan-1 branch opened in 2016/.test(f.wording)));
thaiEmerald.facts.push({
  status: 'APPROVED',
  wording: "Thai Emerald is the original restaurant of the Emerald Group of Restaurants, which later expanded to also operate Fools Diner, Red Chamber, Kiyoshi, Grove Bistro, Gusto, Trouvaille and Emerald Bakery.",
  fact_type: 'HISTORY',
  confidence: 'HIGH',
  source: 'https://emeraldrestaurants.com/ (official)',
  evidence_note: "Official site: 'Emerald Group of Restaurants began its journey with Thai Emerald, quickly establishing a name in Dhaka's vibrant food scene. Expanding into diverse cuisines, we proudly introduced premium dining experiences like Fools Diner, Red Chamber, Kiyoshi, Grove Bistro, Gusto, Trouvaille, and Emerald Bakery.'"
});
pushNote(thaiEmerald, 'Founding-year fact removed (conflicting 2012/2015/2016 dates); replaced with Emerald Group origin fact per founder directive.');

// ---------------------------------------------------------------------------
// Final recommendation + counts
// ---------------------------------------------------------------------------
const counts = { APPROVED: 0, MODIFIED: 0, REMOVED: 0, HOLD: 0 };
const restaurantStatus = {};
ds.entries.forEach((e) => {
  const has = (s) => (e.facts || []).some((f) => f.status === s);
  let status;
  if (e.recommendation === 'ABSTAIN' || e.recommendation === 'REJECT' || (e.facts || []).every((f) => f.status === 'REMOVED')) status = 'REMOVED_OR_ABSTAIN';
  else if (has('HOLD') && !has('APPROVED') && !has('MODIFIED')) status = 'HOLD';
  else if (has('MODIFIED')) status = 'MODIFIED';
  else status = 'APPROVED';
  e.final_status = status;
  restaurantStatus[status] = (restaurantStatus[status] || 0) + 1;
  (e.facts || []).forEach((f) => { counts[f.status] = (counts[f.status] || 0) + 1; });
});

const publishable = counts.APPROVED + counts.MODIFIED;
const out = {
  generated: '2026-08-19',
  source: 'full_review_dataset.json (research phase)',
  decisions: 'Founder editorial decisions applied (founder approval update)',
  counts,
  publishable_facts: publishable,
  restaurant_status: restaurantStatus,
  entries: ds.entries,
};
fs.writeFileSync(OUT, JSON.stringify(out, null, 1), 'utf8');

console.log('fact status counts:', JSON.stringify(counts));
console.log('publishable (APPROVED+MODIFIED):', publishable);
console.log('restaurant final status:', JSON.stringify(restaurantStatus));
console.log('written', OUT);