# KHABO KOTHAY — DISCOVERY FACTS FULL DATASET RESEARCH (206 Restaurants)

> Research phase for the complete Discovery Facts review. NO database import performed. Founder QA required before any import.

## Summary

- Dataset: **206 restaurants** (Banani / Gulshan area, Dhaka)
- Facts found: **269** (recommendation KEEP/MODIFY only)
- Recommendations: {"ABSTAIN":46,"KEEP":145,"MODIFY":15}
- Fact types: {"HISTORY":93,"EXPERIENCE":47,"CONCEPT":61,"IDENTITY":22,"LOCATION":8,"OTHER":38}
- Confidence: {"HIGH":128,"MEDIUM":139,"LOW":2}
- KEEP+MODIFY restaurants: 160 | ABSTAIN: 46 | REJECT: 0

## Method

Per-restaurant web research (news: TBS, Dhaka Tribune, Daily Star, Bangladesh Post; official sites/Facebook/Instagram; TripAdvisor, Wanderlog, RestaurantGuru, DhakaEats, foodpanda).

Quality rule — a fact must pass **Interesting + Useful + Defensible**. Rejected: generic info, menu repetition, branch counts, plain location, marketing claims, unsupported superlatives. Wording is neutral (no best/famous/loved/perfect/amazing/premium/world-class/legendary). Confidence: HIGH = corroborated or official/first-hand, MEDIUM = single credible source, LOW = weak.

Priority: unique concept > history/origin > unique experience > special operating characteristics > things not visible on Google Maps/menu.

## Dataset file

- Structured JSON (joinable to `restaurants.id`): `database/pipelines/discovery-facts/_research/full_review_dataset.json`

## Per-restaurant review

### 0. Aaheli Kabab and Chinese Restaurant

- Category: Chinese
- Cuisines: Chinese
- Price range: ৳400–600
- **Recommendation: ABSTAIN**
- Possible facts: "Blends Indian kababs and Chinese dishes under one roof at NI Tower, Banani"; "Long-standing Banani eatery"
  - No defensible facts (ABSTAIN/REJECT).
- Note: Only generic info found (Indian/Chinese kabab house at NI Tower, Banani; foodpanda 4.8/3000+). No defensible origin/history or unique experience beyond menu and maps; aggregator claims are weak/unsourced.

### 1. Adana Sofrasi

- Category: Turkish
- Cuisines: Turkish
- Price range: ৳2,000+
- **Recommendation: KEEP**
- Possible facts: "Launched December 2025 in Gulshan"; "Hosts recurring ticketed Sufi-music evenings (Suqoon-e-Sofra)"; "Interior draws on Ottoman and Anatolian motifs"
  - Wording: "Adana Sofrasi opened in December 2025 on the second floor of FC Enclave on Gulshan Avenue, making it one of Dhaka's newer Turkish restaurants."
    - Type: HISTORY | Confidence: HIGH
    - Source: The Business Standard (2026) - https://www.tbsnews.net/features/food/adana-sofrasi-authentic-turkish-flavours-carefully-crafted-setting-1353321
    - Evidence: "When Adana Sofrasi launched in December last year, it promised diners authentic Turkish flavours paired with an interior inspired by the soul of Turkey."
  - Wording: "Adana Sofrasi hosts 'Suqoon-e-Sofra', a recurring ticketed evening of live Sufi music (about BDT 990 per person, reservation only, food excluded)."
    - Type: EXPERIENCE | Confidence: MEDIUM
    - Source: HappeningNext / AllEvents event listings (2026) - https://happeningnext.com/event/suqoon-e-sofra-2-a-sufi-night-returns-to-adana-sofrasi-eid3a0e0m94gw
    - Evidence: "Following the beautiful response to our first Suqoon-e-Sofra, we're bringing the experience back for another evening of soulful melodies... Ticket: BDT 990 per person... Reservation Only."
- Note: New-opening date and music-night experience are interesting, useful and evidence-backed.

### 2. Ajo Idea Space

- Category: Restaurant
- Price range: ৳600–1,600
- **Recommendation: KEEP**
- Possible facts: "Named after Bangla 'ajo' (new); Gulshan branch built almost entirely from reclaimed materials incl. a ~60-year-old swimming pool"; "Sources only ~2-3% of ingredients from abroad"; "Won Berger Best Interior Design Award 2025"
  - Wording: "Ajo Idea Space takes its name from the Bangla word 'ajo' ('new'), and its Gulshan branch was built almost entirely from reclaimed materials, including a repurposed swimming pool roughly 60 years old."
    - Type: CONCEPT | Confidence: HIGH
    - Source: The Business Standard (2023) - https://www.tbsnews.net/features/habitat/ajo-idea-space-gulshan-building-new-old-739274
    - Evidence: "Ajo Idea Space is named after the Bangla word 'Ajo' which translates to 'new'... crafted almost entirely from reclaimed materials, including the repurposing of a swimming pool that is almost 60 years old."
  - Wording: "Ajo Idea Space sources roughly 2-3% of its food ingredients from abroad, with the rest sourced locally."
    - Type: CONCEPT | Confidence: HIGH
    - Source: The Business Standard (2023) - https://www.tbsnews.net/features/habitat/ajo-idea-space-gulshan-building-new-old-739274
    - Evidence: "Ajo Idea Space sources a mere 2% to 3% of its food ingredients from abroad, the rest are sourced locally."
  - Wording: "The Gulshan branch of Ajo Idea Space won the Berger Best Interior Design Award 2025 in the Professional category."
    - Type: EXPERIENCE | Confidence: HIGH
    - Source: The Daily Star (2026) - https://www.thedailystar.net/life-living/news/the-philosophy-behind-ajo-idea-space-sustainable-sanctuary-4225481
    - Evidence: "This June, the space achieved a major milestone by winning the Berger Best Interior Design Award 2025 in the Professional category."
- Note: Distinctive sustainable-design concept with strong corroboration across TBS and The Daily Star.

### 3. Al-Amar Lebanese Cuisine Gulshan

- Category: Middle Eastern
- Cuisines: Middle Eastern
- **Recommendation: KEEP**
- Possible facts: "Started December 2015 in Dhanmondi, later expanded to Gulshan 2"; "Among the earlier Lebanese restaurants in Dhaka"
  - Wording: "Al-Amar began serving Lebanese cuisine in Dhanmondi in December 2015 and later added its Gulshan 2 outlet on Level 12 of Rangs FC Square."
    - Type: HISTORY | Confidence: HIGH
    - Source: The Daily Star (2016) & The Business Standard (2020) - https://www.thedailystar.net/shout/food/medley-meat-and-spices-1205203 ; https://www.tbsnews.net/feature/food/al-amar-best-lebanese-cuisine-town-119296
    - Evidence: Daily Star: "this place has been adding a new level of variety since December 2015." TBS (2020): "Al-Amar has been serving authentic Lebanese dishes for almost five years... A new outlet in Gulshan 2 will be opened soon."
- Note: Origin timeline corroborated by two independent sources and explains the Gulshan branch lineage.

### 4. Alfresco Banani

- Category: Restaurant
- Signature dishes: Pasta Basta,Chicken Thick Thai Soup,Pasta Alfresco,Creamy Chicken
- Price range: ৳400–600
- **Recommendation: KEEP**
- Possible facts: "Opened October 2014, founded by three friends"; "Grew from one outlet into a multi-branch Dhaka chain"
  - Wording: "Alfresco opened in October 2014 as an initiative of three friends and grew from a single outlet into a small chain across Dhaka."
    - Type: HISTORY | Confidence: HIGH
    - Source: The Daily Star (2023) - https://www.thedailystar.net/life-living/food-recipes/news/alfresco-home-away-home-dhakas-foodies-3461261
    - Evidence: "An initiative by three close friends, Kazi Md Rushdi, Mahathir Mohammad Ayan, and Md Mahmudul Hasan, Alfresco opened its doors to food lovers of the capital back in October 2014."
- Note: Founding story is decision-relevant and well sourced. Branch count omitted due to conflicting sources (Daily Star says 7, official site says 4).

### 5. Almajlis Arabian Restaurant | مطعم المجلس العربي

- Category: Family-friendly
- Signature dishes: Hummus,Molawah - Soft
- **Recommendation: KEEP**
- Possible facts: "Compact menu centered on chicken dishes and freshly baked Yemeni molawah flatbread"; "Lamb mandi (Yemeni national dish) as flagship item"; "Open very late (till ~4am)"
  - Wording: "Almajlis keeps a compact menu built around chicken dishes and freshly baked Yemeni molawah flatbread, with lamb mandi as a flagship item."
    - Type: IDENTITY | Confidence: MEDIUM
    - Source: Almajlis official site & foodpanda (2025) - https://almajlisarabianrestaurant.com/ ; https://www.foodpanda.com.bd/restaurant/qovf/almajlis-arabian-restaurant
    - Evidence: Official blog: mandi is "widely regarded as the national dish of Yemen"; foodpanda lists "Molawah - Traditional Yemeni flatbread, freshly baked"; menu listing is short and mostly chicken items.
- Note: Unexpected menu identity (a ~10-item chicken + molawah bread menu at a family-friendly restaurant) is decision-changing; late-night closing excluded as Google Maps data.

### 6. Amaya Food Gallery at Amari Dhaka

- Category: Asian
- Cuisines: Asian
- Price range: ৳2,000+
- **Recommendation: KEEP**
- Possible facts: "Indoor 'hawker stall' concept with live cooking stations"; "Located on the 13th floor of Amari Dhaka hotel"
  - Wording: "Amaya is designed as an indoor 'hawker stall' restaurant with live cooking stations, mixing international and Asian dishes."
    - Type: CONCEPT | Confidence: HIGH
    - Source: Amari Dhaka official site & The Business Standard (2025) - https://www.amari.com/dhaka/dine/amaya ; https://www.tbsnews.net/economy/corporates/amari-dhaka-launches-flavour-show-amaya-food-gallery-1206681
    - Evidence: Official site: "a vibrant, indoor hawker stall paradise with live cooking stations serving up international cuisine and Asian favourites inspired by local flavours." TBS describes the 'Flavour Show' live-station format.
- Note: Hawker-stall/live-station concept is unique in the batch and distinguishes it from a standard hotel buffet. 13th-floor location dropped (no verified view value).

### 7. American Burger | Gulshan 2

- Category: Fast Food
- Cuisines: Fast Food
- Signature dishes: Beef Cheese Burger,Chicken Cheese Burger,Double Chicken Cheese Burger,Double Chicken Burger
- Price range: ৳200–400
- **Recommendation: KEEP**
- Possible facts: "One of Dhaka's older local burger chains, predating the 2010s gourmet wave"; "Gulshan 2 branch of a long-running local chain"
  - Wording: "American Burger is one of the older local burger chains in Dhaka, operating before the gourmet-burger wave (Takeout, Madchef) of the 2010s."
    - Type: HISTORY | Confidence: MEDIUM
    - Source: The Daily Star (2020) - https://online.thedailystar.net/supplements/29th-anniversary-supplements/lifestyle-evolutions/news/culinary-revolutions-the-decade-1867660
    - Evidence: "Once upon a time... Then came along American Burger, elevating the whole burger business. And in the 2010s, several burger joints such as Takeout and Madchef opened up."
- Note: Positions the chain on Dhaka's burger timeline, which a user cannot derive from maps or menu.

### 8. American Burger Banani

- Category: Fast Food
- Cuisines: Fast Food
- Price range: ৳200–400
- **Recommendation: KEEP**
- Possible facts: "One of Dhaka's older local burger chains, predating the 2010s gourmet wave"; "Banani branch of a long-running local chain"
  - Wording: "American Burger is one of the older local burger chains in Dhaka, operating before the gourmet-burger wave (Takeout, Madchef) of the 2010s."
    - Type: HISTORY | Confidence: MEDIUM
    - Source: The Daily Star (2020) - https://online.thedailystar.net/supplements/29th-anniversary-supplements/lifestyle-evolutions/news/culinary-revolutions-the-decade-1867660
    - Evidence: "Then came along American Burger, elevating the whole burger business. And in the 2010s, several burger joints such as Takeout and Madchef opened up."
- Note: Same brand-level history fact as the Gulshan 2 entry; no independent branch facts found.

### 9. Amrit restaurant

- Category: Restaurant
- Price range: ৳200–1,400
- **Recommendation: KEEP**
- Possible facts: "Opened 2007 as the signature Indian restaurant of Hotel Sarina, Banani"; "Mughal-influenced menu built around 'dumpakht' with Awadhi/Hyderabadi specialisation"; "Signature Bahubali Thali needs ~5 hours advance notice"
  - Wording: "Amrit, the Indian restaurant at Hotel Sarina in Banani, opened in 2007."
    - Type: HISTORY | Confidence: HIGH
    - Source: Prothom Alo (2024) & The Daily Star - https://en.prothomalo.com/lifestyle/f2ee7l3y87 ; https://online91.thedailystar.net/lifestyle/review/royal-treats-amrit-restaurant-1559842
    - Evidence: Prothom Alo references "Amrit's remarkable journey since its inception in 2007"; Daily Star addresses the restaurant as "Restaurant Amrit, Hotel Sarina, House #27, Banani C/A, Road#17."
  - Wording: "Amrit's menu is built around Mughal-influenced cooking, with an emphasis on 'dumpakht' dishes developed around Awadhi and Hyderabadi specialisations."
    - Type: CONCEPT | Confidence: MEDIUM
    - Source: The Daily Star - https://online91.thedailystar.net/lifestyle/review/royal-treats-amrit-restaurant-1559842
    - Evidence: "Restaurant Amrit has launched its new menu that is a representation of Mughal influences... with an emphasis on the famed 'dumpakht'... based on Mohammad Rais's specialisations in Awadhi and Hyderabadi cuisine."
  - Wording: "Amrit's signature Bahubali Thali requires about five hours' advance notice."
    - Type: EXPERIENCE | Confidence: MEDIUM
    - Source: Wanderlog (review) - https://wanderlog.com/place/details/2670883/amrit-restaurant
    - Evidence: "The signature Bahubali Thali needs at least 5 hours preorder."
- Note: Hotel-backstory, cuisine concept and thali pre-order requirement are all decision-relevant and sourced.

### 10. Ankur Healing Restaurant, Gulshan Lake Drive

- Category: Bengali
- Cuisines: Bengali
- Price range: ৳200–400
- **Recommendation: KEEP**
- Possible facts: "Run by farmers; oil-free, pesticide-free Bengali meals"; "Sells fresh vegetables directly"; "Located beside Gulshan Lake"
  - Wording: "Ankur is run by farmers and serves 'healing' Bengali meals made without oil, using produce grown without pesticides or chemical fertilizers; it also sells fresh vegetables."
    - Type: CONCEPT | Confidence: MEDIUM
    - Source: LinkedIn posts by Ankur staff and associates (2025) - https://www.linkedin.com/posts/shafiqrbhuiyan_i-wanted-to-share-a-truly-wonderful-experience-activity-7291006449688715264-5j2L ; https://www.linkedin.com/posts/helal-hedaitul-islam-19329819_ankur-restaurant-run-by-the-farmers-all-activity-7325008194005520384-MRTK
    - Evidence: "A healthy and sustainable food restaurant called Ankur Restaurant, nestled by the serene Gulshan Lake... dedicated to serving completely oil-free, green food sourced directly from farmers in various regions. They even sell fresh green vegetables."; "run by the farmers, all foods are naturally grown (without pesticide & chemical fertilizer)."
- Note: Farm-run, oil-free/pesticide-free concept is genuinely unique in the batch; confidence MEDIUM as sources are owner/associate social posts.

### 11. Arrowhead Grill

- Category: Steak
- Cuisines: Steakhouse
- Signature dishes: Salvador Steak (200gm),Jamaican Chicken,Astoria Hunter,Dumbo Chaser,Hungry Ranch,Ultra Ranch 1,Ultra Ranch 2,Frango Piquant,Parmesan Chicken
- Price range: ৳2,000+
- **Recommendation: ABSTAIN**
- Possible facts: "Founded 2022; meat-platter steakhouse in Banani"
  - No defensible facts (ABSTAIN/REJECT).
- Note: Only generic/weak data found (LinkedIn 'founded 2022', marketing site copy, job ads); nothing decision-changing or defensible beyond menu/maps.

### 12. Attin Arabian Restaurant

- Category: Lebanese
- Cuisines: Middle Eastern
- **Recommendation: ABSTAIN**
- Possible facts: "A concern of IDOL Group"
  - No defensible facts (ABSTAIN/REJECT).
- Note: Only corporate-ownership info (IDOL Group concern) found; not decision-changing and no origin/unique-experience evidence.

### 13. Baan Busaba

- Category: Asian
- Cuisines: Asian
- Signature dishes: Mongolian Glazed Beef Tenderloin,Mala Fried Sea Bass,XO Beef Baked Noodles,Grilled Chicken Thighs,Charcoal Chicken Skewers,Thai Heritage Grilled Beef,Glazed Prawn
- **Recommendation: KEEP**
- Possible facts: "Opened early August 2025 at Hamid Tower, Gulshan Circle 2"; "East-Asian (not fusion) with separate chefs for Thai/Korean/Chinese"; "Sibling venture to Ruen Busaba, same founder Saadman Hossain"
  - Wording: "Baan Busaba opened in early August 2025 at Hamid Tower, Gulshan Circle 2."
    - Type: HISTORY | Confidence: HIGH
    - Source: Dhaka Tribune (2025) - https://www.dhakatribune.com/feature/food/389104/baan-busaba-serves-finger-licking-east-asian
    - Evidence: "Opened in early August 2025, Baan Busaba's biggest change is to maintain authenticity for three different cuisines."
  - Wording: "Baan Busaba presents itself as East-Asian rather than fusion, with dedicated chefs for its Thai, Korean and Chinese sections."
    - Type: CONCEPT | Confidence: HIGH
    - Source: Dhaka Tribune (2025) - https://www.dhakatribune.com/feature/food/389104/baan-busaba-serves-finger-licking-east-asian
    - Evidence: Managing Director Saadman Hossain: "It's not a fusion, it's not Pan-Asian. It is East-Asian, and we have specialized chefs for each of our Thai, Korean, and Chinese sections."
  - Wording: "Baan Busaba is a sibling venture to the Thai restaurant Ruen Busaba, run by the same founder, Saadman Hossain."
    - Type: HISTORY | Confidence: HIGH
    - Source: The Business Standard (2023) - https://www.tbsnews.net/features/food/ruen-busaba-authentic-thai-asian-spices-and-lord-dining-681818
    - Evidence: TBS on Ruen Busaba founder Saadman Hossain: "Saadman plans to launch another Thai-based fast-food chain named Baan Busaba."
- Note: Opening date, anti-fusion positioning and founder linkage are all corroborated and decision-relevant.

### 14. Bahar

- Category: Restaurant
- Price range: ৳2,000+
- **Recommendation: KEEP**
- Possible facts: "All-day restaurant of Renaissance Dhaka Gulshan Hotel (Level 3) with three private dining areas"; "Runs rotating themed buffet nights (Turkish, Italian)"
  - Wording: "Bahar is the all-day international restaurant of Renaissance Dhaka Gulshan Hotel (Level 3) and has three private dining areas."
    - Type: LOCATION | Confidence: HIGH
    - Source: Marriott (Renaissance Dhaka Gulshan official dining page) - https://www.marriott.com/en-us/hotels/dacbr-renaissance-dhaka-gulshan-hotel/dining/
    - Evidence: "Bahar... super stylish all-day international hotel restaurant... Three private dining areas are also available." (Level 3 confirmed by The Current View / ICE Business Times.)
  - Wording: "Bahar regularly runs themed buffet nights - recent examples include a Turkish theme ('A Taste of Turkey') and an Italian theme ('Buon Appetito')."
    - Type: EXPERIENCE | Confidence: MEDIUM
    - Source: The Current View (2026) & Bangladesh Monitor (2026) - https://thecurrentview.com/?p=5968 ; https://bangladeshmonitor.com.bd/en/renaissance-dhaka-gulshan-introduces-italian-themed-weekend-dining
    - Evidence: "Bahar Restaurant... officially unveils 'A Taste of Turkey'... launching on April 30, 2026"; "launched 'Buon Appetito,' an Italian-themed weekend dining experience at its signature all-day dining restaurant, Bahar."
- Note: Private dining rooms (useful for corporate) and rotating themed buffets are decision-changing for hotel-buffet seekers.

### 15. Bamboo shoot Gulshan

- Category: Chinese
- Cuisines: Chinese
- Signature dishes: BRAISED MUTTON WITH CARROT & RADISH
- **Recommendation: KEEP**
- Possible facts: "Long-running Chinese-owned restaurant in RM Centre, Gulshan Avenue (documented since 2009)"; "Serves Cantonese and Sichuan dishes including hotpot; clientele largely Chinese expats"; "Separate authentic Chinese menu on weekends"
  - Wording: "Bamboo Shoot has operated in the same RM Centre building on Gulshan Avenue since at least 2009 and is Chinese-owned, with a largely Chinese-expat clientele."
    - Type: HISTORY | Confidence: MEDIUM
    - Source: Feinfood.com (Chinese listing), Japanese expat blog (2009) & M's Adventures (2012) - http://cn.feinfood.com/restaurant/... ; http://bangladeshtourism.cocolog-nifty.com/blog/2009/06/banboo-shoot-ee.html ; https://madventures.me/2012/03/13/dhaka-restaurants-part-one/
    - Evidence: Feinfood: "known veteran Chinese restaurant in Dhaka, preferred gathering place for local Chinese expats"; 2009 blogger: "the customers are mostly Chinese"; 2012: "Chinese owned Chinese food."
  - Wording: "The kitchen covers Cantonese and Sichuan dishes, including hotpot, and an authentic Chinese menu runs alongside its regular Bangladeshi-Chinese menu."
    - Type: CONCEPT | Confidence: MEDIUM
    - Source: M's Adventures (2013) & Feinfood.com - https://madventures.me/tag/bamboo-shoot/ ; http://cn.feinfood.com/restaurant/...
    - Evidence: M's Adventures: "This place also serves Sichuan hotpot... have them insist on seeing the Chinese menu"; Feinfood: "菜肴有粤菜和川菜，还有火锅" (Cantonese and Sichuan dishes, plus hotpot).
- Note: Longevity, Chinese ownership and dual-menu (authentic vs Bangladeshi-Chinese) structure are not visible on maps/menu and are corroborated across several independent sources.

### 16. Bar.B.Q Tonight

- Category: Restaurant
- **Recommendation: KEEP**
- Possible facts: "Dhaka franchise of the Pakistani brand founded in Karachi in 1988; Gulshan outlet opened 2017"; "Franchise distinct from the Bangladeshi 'Bar B Q Tonite' in Dhanmondi"; "Relocated to The Grand Delvistaa, Level 8 in 2025"
  - Wording: "Bar.B.Q Tonight is the Dhaka franchise of the Pakistani restaurant brand of the same name (founded in Karachi in 1988); its Gulshan restaurant opened in 2017."
    - Type: HISTORY | Confidence: HIGH
    - Source: Dhaka Tribune (2025) & Bar.B.Q Tonight official site - https://www.dhakatribune.com/feature/food/387948/bar-b-q-tonight-serving-delectable-pakistani ; https://www.barbq-tonight.com/
    - Evidence: Dhaka Tribune: "Opened in 2017... we are a franchise"; official site: "Inaugurated on the 10th of November in 1988... started serving authentic Pakistani dishes."
  - Wording: "Bar.B.Q Tonight in Gulshan is a franchise distinct from the similarly named Bangladeshi brand 'Bar B Q Tonite' in Dhanmondi."
    - Type: CONCEPT | Confidence: HIGH
    - Source: Dhaka Tribune (2025) - https://www.dhakatribune.com/feature/food/387948/bar-b-q-tonight-serving-delectable-pakistani
    - Evidence: Manager Saiful Islam Palash: "often confused with Bar B Q Tonite in Dhanmondi... they are a franchise, while the one in Dhanmondi is a Bangladeshi brand and the two are completely different."
- Note: The franchise-vs-Bangladeshi-brand distinction directly resolves a real source of confusion; both facts are well sourced.

### 17. Barcode Cafe

- Category: Restaurant
- Signature dishes: Chicken Cashewnut Salad,English Roasted Chicken Meal,Chicken Steak Meal,Oven Baked Chicken Breast Pasta,Thai Soup
- Price range: ৳400–1,200
- **Recommendation: KEEP**
- Possible facts: "Part of Chittagong-based Barcode Restaurant Group, which began as a coffee shop named 'Barcode' in 2015"; "Group founded by Monjurul Haque"
  - Wording: "Barcode Cafe is an outpost of the Barcode Restaurant Group, a Chittagong-based company that began as a coffee shop named 'Barcode' in 2015."
    - Type: HISTORY | Confidence: HIGH
    - Source: Dhaka Tribune (2024) & The Daily Star (2018) - https://www.dhakatribune.com/business/357832/barcode-group%E2%80%99s-monjurul-haque-now-runs-20 ; https://www.thedailystar.net/star-youth/news/shaping-chattograms-bustling-cafe-scene-1655179
    - Evidence: Dhaka Tribune: "opened a coffee shop named Barcode... in 2015"; Daily Star: Barcode Cafe is among the "brainchildren of successful businessman Monjurul Hoque... He also owns another branch of Barcode at Banani in Dhaka."
- Note: The Chittagong-origin/coffee-shop backstory is not derivable from maps or menu and is well sourced.

### 18. Beyond Buffet (Gulshan)

- Category: Buffet
- Price range: ৳1,000–1,600
- **Recommendation: KEEP**
- Possible facts: "Gulshan buffet: 100+ items at lunch, 120+ at dinner"; "Also operates as a banquet/event venue with 450+ guest capacity in Gulshan"
  - Wording: "Beyond Buffet's Gulshan branch offers more than 100 items at lunch and over 120 at dinner."
    - Type: OTHER | Confidence: HIGH
    - Source: The Business Standard (2026) - https://www.tbsnews.net/economy/corporates/arabian-food-fest-kicks-beyond-buffet-runs-until-30-september-1518196
    - Evidence: "The Gulshan branch offers more than 100 items for lunch and over 120 items for dinner."
  - Wording: "Beyond Buffet also operates as a banquet venue; its Gulshan branch advertises a guest capacity of about 450."
    - Type: EXPERIENCE | Confidence: MEDIUM
    - Source: Beyond Buffet LinkedIn posts (2025) - https://www.linkedin.com/posts/the-rio-lounge_corporateevents-eventvenuedhaka-teamlunchdhaka-activity-7376216266661027840-0HWv
    - Evidence: Company posts: "Book your next AGM, team lunch, or seminar at Beyond Buffet, Gulshan... with the best with 100+ Buffet items"; Bengali post states Gulshan guest capacity of 450+.
- Note: Item counts and event-venue role are concrete, useful and sourced (TBS for counts).

### 19. BFC - Banani

- Category: Fast Food
- Cuisines: Fast Food
- Signature dishes: Spicy Crispy Fried Chicken,Best Burger,Regular Crispy Fried Chicken
- Price range: ৳200–400
- **Recommendation: KEEP**
- Possible facts: "Launched 2002 under the Opex & Sinha Group; among the earlier homegrown fried-chicken chains in Bangladesh"; "Chicken supplied from its own poultry farm in Rangpur"
  - Wording: "BFC (Best Fried Chicken) launched in 2002 under the Opex & Sinha Group and is among the earlier homegrown fried-chicken chains in Bangladesh."
    - Type: HISTORY | Confidence: HIGH
    - Source: BFC official site & The Business Standard (2025) - https://www.bfcbd.com/ ; https://www.tbsnews.net/features/food/clash-crispy-can-chicken-buzz-dethrone-best-fried-chicken-1073616
    - Evidence: Official site: "Best Fried Chicken (BFC) started its journey back in 2002... under the guidance of Anisur Rahman Sinha"; TBS: "Starting their journey in 2002, BFC has been around for more than two decades."
  - Wording: "BFC sources its chicken from its own poultry farm in Rangpur."
    - Type: OTHER | Confidence: MEDIUM
    - Source: Wikimapia (BFC entry) & TripAdvisor review - http://wikimapia.org/37010659/BFC-BFC-Best-Fried-Chicken ; https://www.tripadvisor.co.uk/ShowUserReviews-g293936-d1774728-r338835428-...
    - Evidence: Wikimapia: "the juicy fresh Chicken is formed by the owners at their expanding farm facility in Rangpur"; reviewer: "Thanks to the parent company having backward integration having own poultry."
- Note: Founding year + in-house poultry supply are factual and decision-relevant; superlative marketing claims on official site rephrased neutrally.

### 20. Bibi Dhaba

- Category: Restaurant
- **Recommendation: ABSTAIN**
- Possible facts: "Possibly related to the 'Bibi Biryani' brand (Elate Group) in Banani"
  - No defensible facts (ABSTAIN/REJECT).
- Note: No reliable information found under this name despite multiple searches; the similarly named 'Bibi Biryani' (Elate Group) is a different restaurant/address, so no defensible link.

### 21. Binni Restaurant

- Category: Restaurant
- Signature dishes: Lau Chingri,Binni Beef Letka Khichuri,Chicken Jhal Fry,Chingri Korola,Binni Beef Bhuna Khichuri
- Price range: ৳400–1,200
- **Recommendation: ABSTAIN**
- Possible facts: "Known for beef letka khichuri per foodpanda reviews"; "Late-night hours (open till ~5am)"
  - No defensible facts (ABSTAIN/REJECT).
- Note: Only foodpanda user reviews and menu data found; khichuri reputation is user-review based (not defensible objectively) and late-night hours are Google data.

### 22. Bistro-E

- Category: Restaurant
- **Recommendation: KEEP**
- Possible facts: "Located inside Bay's Edgewater on North Avenue, Gulshan 2 - a building that also houses embassy offices, requiring security screening on entry"; "All-day coffee shop and deli plus a private 'Clubroom' venue"
  - Wording: "Bistro-E sits inside Bay's Edgewater on North Avenue, Gulshan 2, a building that also houses embassy offices, so diners pass through security screening before entering."
    - Type: LOCATION | Confidence: MEDIUM
    - Source: Bistro-E official site & Wanderlog review - https://bistro-e.com/ ; https://wanderlog.com/place/details/2847385/bistro-e
    - Evidence: Official site: "nestled in Bay's Edgewater on North Avenue, Gulshan 2"; reviewer: "you've to go through some security checks because many embassy offices are located in the building."
- Note: Security screening is a genuine pre-visit consideration not visible on maps/menu; confidence MEDIUM (single review + official address).

### 23. BLUE SALT

- Category: Restaurant
- Price range: ৳400–600
- **Recommendation: ABSTAIN**
- Possible facts: "Described as a hidden culinary gem in Gulshan on TikTok"
  - No defensible facts (ABSTAIN/REJECT).
- Note: No reliable public information found; only a TikTok mention and unrelated businesses with the same name (Bangkok, UK, India).

### 24. Bluemoon Recreation Club

- Category: Restaurant
- Price range: ৳2,000+
- **Recommendation: KEEP**
- Possible facts: "Opened 2012"; "Adults-only venue combining a restaurant, bar, gym and billiards, with live music on certain days"
  - Wording: "Bluemoon Recreation Club opened in 2012."
    - Type: HISTORY | Confidence: MEDIUM
    - Source: Zentleman (2025) - https://zentleman.com/blue-moon-bar-all-blue-moon-re-creation-club-informations/
    - Evidence: "Bluemoon Re-Creation Club Opened in the year 2012."
  - Wording: "Bluemoon is an adults-only venue that combines a restaurant, bar, gym and billiard tables, with live music on certain days."
    - Type: EXPERIENCE | Confidence: MEDIUM
    - Source: Wanderlog & Zentleman - https://wanderlog.com/place/details/10727187/bluemoon-recreation-club ; https://zentleman.com/blue-moon-bar-all-blue-moon-re-creation-club-informations/
    - Evidence: Wanderlog: "there's a restaurant serving international cuisines, as well as a gym and billiard area... kids and teens are not allowed"; "live music on certain days."
- Note: Adults-only rule and the restaurant+bar+gym+billiards combo are decision-changing for prospective diners.

### 25. Boho | Banani

- Category: Thai
- Cuisines: Thai
- Signature dishes: Chicken Green Curry,Chicken Namtak,Fried Chicken,Prawn Toast,Mixed Rice,Fish Cake
- **Recommendation: KEEP**
- Possible facts: "Holds the Thai SELECT certificate from the Royal Thai Government's Ministry of Commerce (awarded Aug 2025)"; "Interior handcrafted by local artisans; designed by GOAAT (also behind Ajo Idea Space)"
  - Wording: "BOHO holds the Thai SELECT certificate awarded by the Royal Thai Government's Ministry of Commerce for authentic Thai cuisine; the certificate was handed over at BOHO Bond Centre in Banani in August 2025."
    - Type: CONCEPT | Confidence: HIGH
    - Source: The Business Standard, Prothom Alo & New Age (2025) - https://www.tbsnews.net/economy/corporates/boho-awarded-thai-select-certificate-authentic-thai-cuisine-1203521 ; https://en.prothomalo.com/corporate/vmcl9yj7e3 ; https://www.newagebd.net/post/mis/272001/boho-gets-thai-select-certificate
    - Evidence: TBS: "The Thai SELECT certification is awarded by the Ministry of Commerce, Royal Thai Government, to recognise restaurants and food products that preserve the authenticity of Thai cuisine."
  - Wording: "BOHO's interior was handcrafted by local artisans and designed by GOAAT, the same architectural practice behind Ajo Idea Space."
    - Type: EXPERIENCE | Confidence: MEDIUM
    - Source: Archinect / LinkedIn (interior designer Nehleen Chowdhury, GOAAT) - https://archinect.com/nchowdhury/project/boho-banani
    - Evidence: "An attempt at handcrafting an interior with local resources, local artisans and craftsmen's..." by the "Group of Architects and Thinkers (GOAAT)."
- Note: Thai SELECT certification (an official third-party authenticity mark) is a strong, sourced differentiator; the GOAAT link adds context.

### 26. Boithok

- Category: Restaurant
- Price range: ৳400–1,400
- **Recommendation: KEEP**
- Possible facts: "Doubles as an events venue (hosted a tech fair and a creative masterclass in 2025)"; "Name is the Bengali word for a sitting room / adda gathering"
  - Wording: "Boithok also operates as an events venue: in 2025 it hosted a sustainable water-grid technology fair and a Cannes Lions creative masterclass in Banani."
    - Type: CONCEPT | Confidence: MEDIUM
    - Source: LinkedIn event posts (2025) — https://www.linkedin.com/posts/naznin-jannat-638391215_sustainability-innovation-smartwatergrid-activity-7376489906832867329-Ku4p ; https://www.linkedin.com/posts/mamaruf_canneslions-aaab-creativeworkshop-activity-7359647927901806592-h_MN
    - Evidence: Tech fair 'taking place on Monday, September 29, 2025, at Boithok, Banani, Dhaka'; masterclass 'Join AAAB on 23 August 2025, 11 AM - 6 PM at Boithok, Banani, Dhaka'.
- Note: Event-venue identity is decision-changing (booking/capacity) and supported by two independent organizer posts.

### 27. Boomers Cafe

- Category: Restaurant
- Price range: ৳200–400
- **Recommendation: KEEP**
- Possible facts: "First Boomers Cafe opened in Banani as a student adda (hangout) house"; "Credited with popularizing pool/billiards culture among Dhaka students"; "Walls decorated with paintings of musicians (Pink Floyd, James)"
  - Wording: "Boomers Cafe's first outlet opened in Banani, where it began as an adda (hangout) spot mostly for NSU and AIUB students."
    - Type: HISTORY | Confidence: HIGH
    - Source: The Daily Star, Star Campus archive (2011) — https://archive.thedailystar.net/campus/2011/12/01/edibles.htm
    - Evidence: 'The first Boomers café opened up in Banani, for which it was an adda house mostly for North South University (NSU) and American International University of Bangladesh (AIUB) students.'
  - Wording: "Boomers Cafe is credited with helping popularize pool/billiards as a student activity in Dhaka when it first opened."
    - Type: HISTORY | Confidence: MEDIUM
    - Source: The Daily Star, Star Campus archive (2011) — https://archive.thedailystar.net/campus/2011/12/01/edibles.htm
    - Evidence: 'When Boomers Café opened up, it instantly gained popularity as a student lounge, where the pool culture kicked off in Dhaka.'
- Note: Origins and pool-culture history are interesting, useful (context for the vibe) and well sourced.

### 28. Brio: Italian Restaurant

- Category: Italian
- Cuisines: Italian
- Signature dishes: Tagliatelle Bolognese
- Price range: ৳2,000+
- **Recommendation: KEEP**
- Possible facts: "No signboard outside - only a small lit Italian flag marks the entrance"; "Flagship Gulshan-2 dining room with wood-fired pizza and hand-rolled pasta"; "Founded by three partners"
  - Wording: "Brio's Gulshan dining room has no signboard; the entrance is marked only by a small illuminated Italian flag, a deliberate choice by the owners."
    - Type: EXPERIENCE | Confidence: HIGH
    - Source: The Daily Star (2025) — https://www.thedailystar.net/lifestyle/food/news/living-italian-dhaka-day-dolce-vita-and-burrata-bliss-3841051
    - Evidence: 'it doesn't even have a signboard outside, just a small Italian flag that lights up. The owners prefer it that way, confident that word of mouth is the way to go.'
  - Wording: "The Gulshan-2 location is Brio's flagship dining room, where pizza is wood-fired and pasta is hand-rolled."
    - Type: CONCEPT | Confidence: HIGH
    - Source: Brio Dhaka official site — https://briodhaka.com/
    - Evidence: 'Our flagship dining room in the heart of Gulshan‑2 — wood-fired pizza, hand-rolled pasta and the full Italian table.'
- Note: Signboard fact is a genuinely unusual operating detail; flagship/craft claim is from the official site.

### 29. Bukhara Restaurant

- Category: Indian
- Cuisines: Indian
- Signature dishes: Kadhai Gosht,Khade Masale Ka Gosht,Mutton Dopiyaza,Achari Gosht,Bhuna Gosht
- Price range: ৳2,000+
- **Recommendation: KEEP**
- Possible facts: "Interiors designed by noted Bangladeshi architect Enamul Karim Nirjhar"; "High-floor dining at Iqbal Center, 42 Kemal Ataturk Avenue, Banani"; "Old 'see-through kitchen' policy (weak blog source only)"
  - Wording: "The interiors of Bukhara were designed by Bangladeshi architect Enamul Karim Nirjhar (System Architects), one of a series of conceptual restaurants he created in Dhaka."
    - Type: HISTORY | Confidence: MEDIUM
    - Source: Wikipedia — Enamul Karim Nirjhar (2026) — https://en.wikipedia.org/wiki/Enamul_Karim_Nirjhar ; Shaping Bangladesh — https://shapingbangladesh.com/archive/issues/20th-issue/shaped-by-freedom-the-creative-world-of-ar-enamul-karim-nirjhar
    - Evidence: 'He designed several conceptual restaurants in Dhaka and Chittagong, including Bukhara, Santoor, Bonanza, White Castle, and Asparagus.'
  - Wording: "Bukhara sits on the 17th floor of Iqbal Center at 42 Kemal Ataturk Avenue in Banani, putting the dining room high above the avenue."
    - Type: LOCATION | Confidence: MEDIUM
    - Source: Google Maps listing (batch data, 17th floor); staff profile on LinkedIn (2026) — https://linkedin.com/in/md-abdul-kader-1b8310100
    - Evidence: Staff record: 'Captain - Bukhara Restaurant, Aug 1999 - Aug 2007, Banani 42, Iqbal Center 18th Floor' (older record; current listing says 17th floor).
- Note: Architect-designed interiors and the high-floor location add real context; floor discrepancy flagged.

### 30. Bunka: Oriental All-You-Can-Eat

- Category: Restaurant
- **Recommendation: KEEP**
- Possible facts: "All-You-Can-Order (AYCO) format - not a standard buffet; dishes cooked fresh to order"; "Rotates a new themed menu roughly every two months"; "13th floor of Six Seasons Hotel with Gulshan Lake / city views"
  - Wording: "Bunka runs an All-You-Can-Order (AYCO) format: diners pick dishes from a menu and the kitchen cooks them fresh, rather than serving from a buffet line."
    - Type: CONCEPT | Confidence: HIGH
    - Source: Six Seasons Hotel official site — https://sixseasonshotel.com/restaurant/bunka-oriental-buffet/
    - Evidence: 'It's a buffet—but not the usual kind! Bunka offers an All You Can Order (AYCO)/ Service buffet, where you choose your dishes from the menu, and the chef cooks them freshly and live.'
  - Wording: "Bunka rotates a new themed menu roughly every two months; past themes include Thai Odyssey, Tokyo Treats, Dragon Fire Feast, Gangnam Bites and Indo Malay Flavour."
    - Type: CONCEPT | Confidence: HIGH
    - Source: Six Seasons Hotel official site — https://sixseasonshotel.com/restaurant/bunka-oriental-buffet/
    - Evidence: 'Every two months, Bunka unveils a new culinary chapter with themed menus such as Thai Odyssey, Tokyo Treats, Dragon Fire Feast, Gangnam Bites, and Indo Malay Flavour.'
  - Wording: "Bunka occupies the 13th floor of Six Seasons Hotel, with long glass windows overlooking Gulshan Lake."
    - Type: EXPERIENCE | Confidence: HIGH
    - Source: Six Seasons Hotel official site; The Daily Star (2014) — https://www.thedailystar.net/luxury-redefined-45314
    - Evidence: 'the long glass windows mirror the beautiful, serene Gulshan lake'; 'Climb 13 floors and you will be greeted by the spectacular sight of the third restaurant - Bunka.'
- Note: AYCO format and rotating themes are unique, decision-changing concepts; views well corroborated.

### 31. Burger King | Gulshan 2

- Category: Hamburger
- Cuisines: Burgers
- Signature dishes: Fried Chicken - 2 pcs,Grill Hot N Chili Chicken,Tandoori Grill Chicken
- Price range: ৳400–1,200
- **Recommendation: ABSTAIN**
- Possible facts: "International franchise; brand entered Bangladesh in December 2016 (Tiffinbox/Bangla Trac)"
  - No defensible facts (ABSTAIN/REJECT).
- Note: Global chain; only generic franchise/branch-count facts found, nothing decision-changing about this specific outlet.

### 32. Burger King Banani

- Category: Fast Food
- Cuisines: Fast Food
- Signature dishes: Crispy King,Chicken Tender,Hot Chicken Burrito,Fried Chicken - 2 pcs,Grill Hot N Chili Chicken,Crispy Sausage King
- Price range: ৳400–1,400
- **Recommendation: ABSTAIN**
- Possible facts: "International franchise; brand entered Bangladesh in December 2016"
  - No defensible facts (ABSTAIN/REJECT).
- Note: Global chain; only generic franchise/branch-count facts found, nothing decision-changing about this specific outlet.

### 33. BurgerGo - Gulshan

- Category: Fast Food
- Cuisines: Fast Food
- **Recommendation: ABSTAIN**
- Possible facts: "24-hour operation (from listing data)"; "Very small outlet (17 Google reviews)"
  - No defensible facts (ABSTAIN/REJECT).
- Note: Two searches returned no credible coverage; only a tiny 24-hour burger spot (17 reviews) with no defensible distinguishing facts.

### 34. Burgwich TOWN Dhaka

- Category: Fast Food
- Cuisines: Fast Food
- Price range: ৳200–1,000
- **Recommendation: KEEP**
- Possible facts: "Part of Chattogram-based Barcode Restaurant Group (began as a coffee shop in 2012)"; "Banani outlet trades as 'Burgwich Town Fusion Cafe' - burgers alongside fuchka & chaat"; "Group operates restaurants in Chattogram, Dhaka and the UAE"
  - Wording: "Burgwich Town is part of the Chattogram-based Barcode Restaurant Group, which began as a single coffee shop in 2012 and has since expanded to restaurants across Chattogram, Dhaka and the UAE."
    - Type: HISTORY | Confidence: MEDIUM
    - Source: The Business Standard (2023) — https://www.tbsnews.net/economy/corporates/barcode-launches-new-restaurant-burgwich-town-569474
    - Evidence: 'Monjurul Hoque, a young entrepreneur, started a restaurant business in 2012 with a coffee shop and has since expanded to 22 restaurants in Chattogram, Dhaka, and the UAE.'
  - Wording: "The Banani outlet operates as 'Burgwich Town Fusion Cafe', combining burgers with fuchka and chaat items on its delivery menu."
    - Type: IDENTITY | Confidence: MEDIUM
    - Source: foodpanda (2026) — https://www.foodpanda.com.bd/restaurant/var1/burgwich-town-fusion-cafe-banani
    - Evidence: Listing shows 'Burgwich Town Fusion Cafe - Banani' with a 'Fuchka & Chaat' section alongside its burger menu.
- Note: Group origin and the burger-plus-chaat fusion identity are both non-obvious and defensible.

### 35. C House Milano, Bangladesh

- Category: Italian
- Cuisines: Italian
- Signature dishes: Mini Burger
- **Recommendation: KEEP**
- Possible facts: "The Gulshan outlet was C House Milano's first store in Asia (opened March 2021)"; "Italian coffee/cafe brand with roots going back to the 1960s"
  - Wording: "The Gulshan outlet was C House Milano's first store in Asia; the Italian company behind the brand announced its opening on 11 March 2021."
    - Type: HISTORY | Confidence: HIGH
    - Source: Cristiano Iezzi, owner of C House Italia Srl (LinkedIn, 2021) — https://www.linkedin.com/posts/cristiano-iezzi-79b5b66_harder-better-faster-stronger-c-house-activity-6777199882273861632--Mzi ; Dhaka Tribune (2023) — https://www.dhakatribune.com/feature/food/325324/c-house-milano-takes-an-elegant-approach-to
    - Evidence: 'C House Milano Cafè | Restaurant and La Pizzeria Nazionale in Dhaka - Bangladesh! Unlocked from 11th of March 2021! Our first store in Asia!' (owner post).
- Note: First-in-Asia status is first-hand and decision-relevant (proven international brand); year conflict with a 2020 mention noted.

### 36. CAF

- Category: Coffee shop
- Signature dishes: Cheese Omelette,The Breakfast,Roasted Beef Sandwich,Protein Breakfast,Chicken Ham & Cheese Cold Sandwich,Orange Juice
- Price range: ৳200–1,000
- **Recommendation: KEEP**
- Possible facts: "Personalised coffee art - customers' photos printed on latte foam in edible ink"; "All-day breakfast and coffee identity, open 8am to midnight"; "At Rangs Paramount, Road 17, Block K, Banani"
  - Wording: "Cafe CAF prints personalized images onto coffee: a customer can send a photo and it appears on the latte foam in edible ink."
    - Type: EXPERIENCE | Confidence: HIGH
    - Source: The Daily Star (2019) — https://www.thedailystar.net/shout/hangouts/news/cafe-caf-fresh-brews-and-all-day-breakfasts-1730965
    - Evidence: 'the shop offers personalised coffee art ... once my cup of coffee arrived ... The cream was topped with a clear image of the dog, done in edible ink.'
  - Wording: "Cafe CAF is built around all-day breakfasts and coffee, open from 8am to midnight."
    - Type: CONCEPT | Confidence: HIGH
    - Source: The Daily Star (2019) — https://www.thedailystar.net/shout/hangouts/news/cafe-caf-fresh-brews-and-all-day-breakfasts-1730965
    - Evidence: Headline: 'Cafe CAF: Of fresh brews and all-day breakfasts'; 'The shop opens at 8 AM in the morning and closes at midnight.'
- Note: Photo-on-coffee is a rare, decision-changing experience detail; both facts sourced to The Daily Star.

### 37. Cafe Mango

- Category: Restaurant
- Price range: ৳400–1,200
- **Recommendation: KEEP**
- Possible facts: "Founded by architect Salauddin Ahmed; first Mango opened in Dhanmondi on 9 Nov 2000, Gulshan branch followed in Oct 2004"; "Interior built around Bangladeshi rural heritage (old bed headrests on ceiling, village tin-house windows)"; "Designed as a 'public living room' where people stay for hours"
  - Wording: "Cafe Mango was founded by architect Salauddin Ahmed; the first Mango opened in Dhanmondi on 9 November 2000 and the Gulshan branch followed in October 2004."
    - Type: HISTORY | Confidence: HIGH
    - Source: The Daily Star, Star Weekend Magazine (2004) — https://archive.thedailystar.net/magazine/2004/12/04/eating.htm
    - Evidence: 'The Mango in Dhanmondi was started in November 9, 2000'; 'the second Mango was born on October 1, 2004.'
  - Wording: "Cafe Mango's interior is built around Bangladeshi rural heritage: old bed headrests line the ceiling and wooden windows from village tin-shed houses are set into the walls."
    - Type: EXPERIENCE | Confidence: HIGH
    - Source: The Business Standard (2020) — https://www.tbsnews.net/feature/habitat/cafe-mango-blending-rural-heritage-urban-aesthetics-177934
    - Evidence: 'Looking up at the ceiling of the restaurant, you will be able to see the headrest of old beds. On the first floor ... the wooden windows of tin-shed houses from the rural part of Bangladesh.'
  - Wording: "The owner's stated aim was to make Cafe Mango a 'public living room' where people stay for hours rather than just dine."
    - Type: CONCEPT | Confidence: MEDIUM
    - Source: The Business Standard (2020) — https://www.tbsnews.net/feature/habitat/cafe-mango-blending-rural-heritage-urban-aesthetics-177934 ; Showcase Magazine (2020) — https://www.showcase.com.bd/the-reincarnation-of-cafe-mango/
    - Evidence: 'I wanted it to be something where people would come and stay for hours' (Salauddin Ahmed); 'an attempt to bring forth public living rooms in Dhaka.'
- Note: Architect-founder origin, heritage interior and 'public living room' concept are all strong and well sourced.

### 38. Cha Bagan

- Category: Restaurant
- Price range: ৳200–1,000
- **Recommendation: KEEP**
- Possible facts: "Name means 'tea garden' in Bengali; operates as a rooftop garden cafe in Banani"; "Green, nature-themed space with privacy-focused seating"
  - Wording: "Cha Bagan ('tea garden' in Bengali) operates as a rooftop garden cafe in Banani, with a greenery-filled, nature-themed space."
    - Type: EXPERIENCE | Confidence: MEDIUM
    - Source: Wanderlog — https://wanderlog.com/place/details/3381596/cha-bagan
    - Evidence: 'Cha Bagan is an enchanting outdoor dining spot ... Nestled on a rooftop in Banani, this venue features a breathtaking garden.'
- Note: Rooftop garden identity is useful and non-obvious from the listing; rests on a single travel-guide source (MEDIUM).

### 39. Cheez Banani

- Category: Pizza
- Cuisines: Pizza
- Price range: ৳400–1,400
- **Recommendation: MODIFY**
- Possible facts: "Menu includes 'The Kala Vuna' pizza - a Bangladeshi kala bhuna beef take on pizza"; "Cheez! brand reports staff across Bangladesh and the UAE"
  - No defensible facts (ABSTAIN/REJECT).
- Note: Candidate 'Kala Bhuna beef pizza (local twist not visible in the listed menu categories)' is interesting but rests on a single third-party menu listing (giftallbd.com); verify against the venue's own menu before use. Suggested wording: 'Cheez's menu includes 'The Kala Vuna' pizza topped with kala bhuna (slow-cooked Bangladeshi beef), an example of a local twist on pizza.'

### 40. Chef's Table - Gulshan 1

- Category: Food court
- Price range: ৳400–1,400
- **Recommendation: KEEP**
- Possible facts: "Multi-brand food court operated by Unimart (sister concern of United Group)"; "Houses resident brands (Chillox, Yum Cha District, Cheez) with a digital ordering system"; "Brand launched July 2018"
  - Wording: "Chef's Table is operated by Unimart, a sister concern of United Group, and the brand's first outlet opened in Gulshan in July 2018."
    - Type: HISTORY | Confidence: HIGH
    - Source: Dhaka Tribune (2019) — https://www.dhakatribune.com/business/166523/chef%E2%80%99s-table-revolutionizing-dhaka%E2%80%99s-culinary
    - Evidence: 'Chef's Table is the latest initiative by Unimart, a sister concern of United Group ... had its soft launch on July 1 last year and was opened for all since July 12.'
  - Wording: "Chef's Table Gulshan 1 works as a food court whose resident brands include Chillox, Yum Cha District and Cheez, with ordering through a digital system."
    - Type: CONCEPT | Confidence: MEDIUM
    - Source: Wanderlog — https://wanderlog.com/place/details/9865102/chefs-table-gulshan-1
    - Evidence: 'Savor delicious food from well-known outlets like Chillox, Yum Cha District, The Bunka, Cheez, and more'; 'fast and organized service through a digital ordering system.'
- Note: Food-court-with-resident-brands concept and corporate origin are useful and defensible.

### 41. Chef's Table - Gulshan 2

- Category: Restaurant
- Price range: ৳400–1,400
- **Recommendation: KEEP**
- Possible facts: "The original Chef's Table (opened July 2018), 24 stalls / ~22 cuisines in 27,000 sq ft"; "Company says customers often describe it as the first proper multi-brand food court in Bangladesh"; "Among the most-reviewed food courts in Dhaka (10,000+ Google reviews)"
  - Wording: "Chef's Table Gulshan 2 is the brand's original outlet: it opened in July 2018 by Unimart with 24 food stalls serving about 22 cuisine types in a 27,000 sq ft space."
    - Type: HISTORY | Confidence: HIGH
    - Source: Dhaka Tribune (2019) — https://www.dhakatribune.com/business/166523/chef%E2%80%99s-table-revolutionizing-dhaka%E2%80%99s-culinary
    - Evidence: 'currently serving 22 types of cuisine'; 'Developed in a 27,000 square feet area, Chef's Table consists of 24 food stalls.'
  - Wording: "The company behind Chef's Table says customers often describe it as the first proper multi-brand food court in Bangladesh."
    - Type: CONCEPT | Confidence: MEDIUM
    - Source: BBF Digital (2020) — https://bbf.digital/chefs-table-designing-a-multi-cuisine-experience
    - Evidence: 'many consider us to be the first-ever proper food court in Bangladesh.'
- Note: Original-outlet history and scale are defensible; the 'first proper food court' claim is kept neutral and attributed to the company.

### 42. Cheong Shing Restaurant, Dhaka.

- Category: Chinese
- Cuisines: Chinese
- Signature dishes: Bitter Guard in Stuffed with Minced Fish,Three BAO in Stuffed with Minced Fish,Steamed Egg with Shrimp,Fried Egg with Bitter Gourd,Chili in Stuffed with Minced Fish,Steamed Egg with Salted Egg Preserved Egg,Scrambled Egg with Shrimp,Fried Egg with Tomato,Sweet & Sour Chicken,Salted Fish with Chicken & Bean Curd,Cook Shrimp with Bean Curd,Braised Bean Curd with Hot Spicy Sauce,Minced Fish with Vegetables,Mixed Seafood,Squid with Black Bean Sauce,Chicken with Lemon Sauce,Vegetables Prawn with Cashew Nut,Stir Fried Slice Potato,Spicy Vegetable Chicken with Peanut,Bean Curd in Stuffed with Minced Fish
- **Recommendation: KEEP**
- Possible facts: "Cited among Dhaka's authentic (non-'deshi') Chinese restaurants, Cantonese style"; "Operating in Banani since at least the early 2010s"; "Menu built around Cantonese specialties (bitter gourd stuffed with minced fish etc.)"
  - Wording: "Cheong Shing is cited in Dhaka food writing as one of the city's authentic Chinese restaurants - Cantonese-style food rather than the local 'deshi' Chinese style."
    - Type: IDENTITY | Confidence: MEDIUM
    - Source: The Daily Star (2023) — https://online.thedailystar.net/my-dhaka/news/authentic-isnt-everything-nothing-hits-the-spot-deshi-chinese-food-3416631 ; The Business Standard (2020) — https://www.tbsnews.net/feature/food/when-chinese-food-not-chinese-122323
    - Evidence: 'Dhaka also boasts many authentic Chinese dining places, serving Cantonese, Hunan, Sichuan cuisines. Places like Cheong Shing, Yum Cha District, Chows'; TBS: 'the Cheong Shing restaurant in Banani probably sells some authentic Chinese dishes.'
  - Wording: "Cheong Shing has been operating in Banani since at least the early 2010s."
    - Type: HISTORY | Confidence: MEDIUM
    - Source: Dhaka Delicacy food blog (2010) — http://dhakadelicacy.blogspot.com/2010/02/ ; Faizul Khan blog (2011) — https://faizulkhan.blogspot.com/2011/06/chinese-at-cheong-shing.html
    - Evidence: 'I love this place in Banani- Chong SHing, been going there for years' (2010); 'Cheong Shing ... finds authentic Chinese in Banani' (2011).
- Note: Authentic-vs-deshi positioning is decision-changing and cited by two mainstream outlets; age corroborated by two dated blogs.

### 43. Chilis

- Category: Chinese
- Cuisines: Chinese
- Signature dishes: C- 02 Special Corn Soup,C- 69 Mixed Chowmein,C- 30 Chicken Chilli Onion,T-24 Thai Fried Chicken,S-02 Chicken Prawn Cashew- Nut Salad,C- 48 Sizzling Chicken
- Price range: ৳2,000+
- **Recommendation: KEEP**
- Possible facts: "Despite the name, this is a Chinese/Thai restaurant (not the US chain)"; "Shares its Banani venue with Santoor - Indian and Chinese cuisines under one roof"; "Located at WBC House, Road 11, Banani"
  - Wording: "Chilis is a Chinese/Thai restaurant in Banani (not the US chain) that shares its venue with Santoor, an Indian dining brand - both cuisines can be ordered from the same location."
    - Type: IDENTITY | Confidence: MEDIUM
    - Source: Pathao Food — https://food.pathao.com/restaurants/ge4dkni/chilis ; Chilis BD Facebook (2026) — https://www.facebook.com/ChilisBD/posts/1235936222037557/ ; Santoor & Chilis Instagram (2026)
    - Evidence: Pathao lists 'Chilis - Banani ... Chinese, Thai'; Chilis BD: 'You can order food from both Santoor and Chillis at the same location'; Instagram: '@santoorfusiondining & @chilis.bd now under one Roof.'
- Note: Clarifies identity vs the US chain and reveals the two-cuisines-in-one-venue operating model; the 'Lively chain' text in the batch address looks like scraped noise from the US chain's profile.

### 44. Chillox Banani

- Category: Fast Food
- Cuisines: Fast Food
- Signature dishes: French Fries,Fish Tots,Fried Chicken,Pan Asian Mashup
- Price range: ৳200–400
- **Recommendation: KEEP**
- Possible facts: "Started in Feb 2016 as a roadside burger cart opposite BRAC University, Mohakhali; first permanent outlet in 2017"; "Founded by three friends; sauce-level choice on burgers is a signature"; "Bangladeshi burger chain headquartered in Banani"
  - Wording: "Chillox began in February 2016 as a roadside burger cart opposite BRAC University in Mohakhali; its first permanent outlet opened in Mohakhali in 2017."
    - Type: HISTORY | Confidence: HIGH
    - Source: The Financial Express — https://thefinancialexpress.com.bd/home/from-roadside-cart-to-burger-brand-1669226865
    - Evidence: 'The food cart that started its journey in February 2016 had to shut down for placement reasons in the December of the same year ... in 2017 ... Chillox launched its first proper outlet at Mohakhali.'
  - Wording: "Chillox lets customers pick a sauce level for their burgers, a signature of the chain."
    - Type: EXPERIENCE | Confidence: MEDIUM
    - Source: The Financial Express — https://thefinancialexpress.com.bd/home/from-roadside-cart-to-burger-brand-1669226865
    - Evidence: 'What is your preferred sauce level, sir?'; 'They brought the flexibility of choosing sauce levels to cater to customers' demands.'
- Note: Cart-to-chain origin story and sauce-level customization are both non-obvious and well sourced.

### 45. China Garden Restaurant Ltd.

- Category: Chinese
- Cuisines: Chinese
- Price range: ৳2,000+
- **Recommendation: ABSTAIN**
- Possible facts: "Possible long-standing Chinese fine-dining outlet in Gulshan"
  - No defensible facts (ABSTAIN/REJECT).
- Note: Two searches surfaced only the unrelated Indian 'China Garden' chain (Nelson Wang); no credible coverage of this Gulshan outlet.

### 46. Chokka

- Category: Restaurant
- Price range: ৳1–600
- **Recommendation: ABSTAIN**
- Possible facts: "Small drink/beverage-focused spot in Banani (menu lists 13 beverage items)"
  - No defensible facts (ABSTAIN/REJECT).
- Note: Two searches found nothing relevant on this small Banani spot; only generic listing data available.

### 47. Chows

- Category: Cantonese
- Cuisines: Chinese
- Price range: ৳2,000+
- **Recommendation: KEEP**
- Possible facts: "Fine-dining Cantonese/dim sum restaurant that imports specialty ingredients directly from China"; "Operating in Banani since at least 2015"; "Large Hong Kong-style dim sum menu"
  - Wording: "Chows positions itself as a fine-dining Cantonese and dim sum restaurant that imports specialty ingredients directly from China."
    - Type: CONCEPT | Confidence: MEDIUM
    - Source: Chows official site — https://chowsbd.com/ ; Chows LinkedIn — https://www.linkedin.com/company/chows
    - Evidence: 'Chows is a fine dining cantonese and dim sum restaurant in Dhaka. They source fresh local ingredients and specialty ingredients directly from China.'
  - Wording: "Chows has been operating in Banani since at least 2015."
    - Type: HISTORY | Confidence: MEDIUM
    - Source: Chef Biplab profile (2025) — https://chefbiplab.com/chef-profile/md-jakir-hossain-3/
    - Evidence: 'Executive Chef CHOWS Chinese Restaurant, Banani, Dhaka / Mar 2015–Aug 2020.'
- Note: China-sourcing concept is from the official site and signals what sets the kitchen apart; tenure corroborated by a chef profile.

### 48. Ciao Dhaka

- Category: Italian
- Cuisines: Italian
- Price range: ৳800–2,000
- **Recommendation: KEEP**
- Possible facts: "Chef-owner Nayeem Ashraf is a Shera Radhuni (seasons 7-8) judge and founder of the SHINEE culinary schools"; "Restaurant name borrowed from 'Ciao Wine Bar', an Italian place he worked at in Canada"; "Shares its Banani space with Dessert Boutique by Nadia Lakhani"; "Deliberately minimal menu - six pizzas and five pastas"
  - Wording: "Ciao is led by chef Nayeem Ashraf, a judge of Shera Radhuni seasons 7 and 8 and founder of the SHINEE culinary schools; he named the restaurant after the Ciao Wine Bar where he worked in Canada."
    - Type: HISTORY | Confidence: MEDIUM
    - Source: The Business Standard (2025) — https://publisher.tbsnews.net/features/nayeem-ashraf-chef-who-serves-teaches-and-judges-1227511
    - Evidence: 'judge of Shera Radhuni Seasons 7 and 8, founder of SHINEE culinary schools ... During his time in Canada, he worked at an Italian restaurant called Ciao Wine Bar.'
  - Wording: "Ciao shares its Banani dining room with Dessert Boutique by Nadia Lakhani - Italian food and desserts in one venue."
    - Type: CONCEPT | Confidence: MEDIUM
    - Source: The Business Standard (2025) — https://www.tbsnews.net/features/food/ciao-authentic-slice-italy-heart-dhaka-1212241
    - Evidence: 'Ciao and Dessert Boutique by Nadia Lakhani coexist in the same place, Road No 10A, Banani, allowing the consumers to have the best of both worlds in the same order.'
  - Wording: "Ciao's menu is deliberately small - six pizzas and five pastas, with no starters or lasagna."
    - Type: CONCEPT | Confidence: MEDIUM
    - Source: The Business Standard (2025) — https://publisher.tbsnews.net/features/nayeem-ashraf-chef-who-serves-teaches-and-judges-1227511
    - Evidence: 'The menu is refreshingly simple: six pizzas priced between Tk800 and Tk1800, and five pastas ranging from Tk650 to Tk950 ... no lasagna, no frills.'
- Note: Chef pedigree, name origin, shared venue and deliberate menu restraint are all interesting and sourced to TBS features.

### 49. Cielo Rooftop - Gulshan

- Category: Restaurant
- Price range: ৳400–1,400
- **Recommendation: ABSTAIN**
- Possible facts: "Opened in 2023 (single low-quality directory listing)"; "The Cielo brand previously operated at Paribag (2020)"
  - No defensible facts (ABSTAIN/REJECT).
- Note: Only generic rooftop info and a low-quality directory for the opening year; no branch-specific fact that is both defensible and decision-changing.

### 50. Cielo Rooftop Banani

- Category: Restaurant
- Price range: ৳400–1,400
- **Recommendation: KEEP**
- Possible facts: "Occupies the 14th floor of AWR NIB Tower on Road 11"; "The Cielo Rooftop brand previously operated at Paribag, Dhaka (2020)"
  - Wording: "Cielo Rooftop Banani occupies the 14th floor of AWR NIB Tower on Road 11."
    - Type: LOCATION | Confidence: MEDIUM
    - Source: foodpanda — https://www.foodpanda.com.bd/restaurant/hmg8/cielo-rooftop-banani
    - Evidence: Listing address: '14th Floor, AWR NIB Tower, House 99, Block C, Road 11, Banani Model Town, Dhaka - 1213.'
  - Wording: "The Cielo Rooftop brand previously operated at Paribag, Dhaka, before its current Gulshan and Banani rooftops."
    - Type: HISTORY | Confidence: MEDIUM
    - Source: LinkedIn post (2020) — https://www.linkedin.com/posts/hasib-uddin-a-ba519863_cielorooftop-activity-6727814975236161536-xZv3
    - Evidence: 'The beauty reveals at Cielo Rooftop Aquarium side..... at Paribag, Dhaka' (October 2020).
- Note: The 14th-floor detail creates experience value; brand relocation adds useful context.

### 51. Cilantro

- Category: Restaurant
- Signature dishes: Cream of Mushroom Soup,Peruvian Chicken,Nachos,Smoked Chicken Quesadillas,Tacos with Prawns,Beef Quesadillas
- **Recommendation: KEEP**
- Possible facts: "Cilantro and sister restaurant Coentro are named for the Spanish/Portuguese word for coriander"; "Menu identity: Latin American + Mediterranean fare"; "Interior features exposed brick, glass bottles, a central skylight and low shoe-off seating"; "Original Dhanmondi branch operating since around 2013"
  - Wording: "Cilantro and its sister restaurant Coentro take their names from the Spanish and Portuguese words for coriander; Coentro opened as Cilantro's second branch."
    - Type: IDENTITY | Confidence: MEDIUM
    - Source: The Daily Star — https://www.thedailystar.net/lifestyle/restaurant-review/refreshing-coentro-71922
    - Evidence: 'Coentro is basically the second branch of Cilantro. Both words mean coriander: 'coentro' is a Portuguese word while its older counterpart is Spanish.'
  - Wording: "Cilantro's interior is known for exposed brick, glass bottles and a central skylight, with low tables where diners sit cross-legged after removing shoes."
    - Type: EXPERIENCE | Confidence: MEDIUM
    - Source: The Mostly Bangladeshi Kitchen (2016) — http://bangladeshikitchen.blogspot.com/2016/05/review-cilantro.html
    - Evidence: 'The interior is an eclectic affair of exposed brick, glass bottles and a central skylight ... a few lower tables, where you can take off your shoes and sit cross-legged.'
- Note: Name-origin/sister-brand fact and the distinctive seating detail are interesting and defensible; facts are brand-level (Dhanmondi/Coentro family) - confirm the Banani/Gulshan branch belongs to the same family.

### 52. Coal & Coffee

- Category: Coffee shop
- Price range: ৳400–1,400
- **Recommendation: KEEP**
- Possible facts: "coffee-shop-named brand whose Banani menu is built around kebabs/rice/curries rather than coffee"; "Banani branch is the chain's 3rd outlet (opened 2023) - branch count, rejected"
  - Wording: "Coal & Coffee is a local Dhaka coffee-and-food chain, but its Banani branch menu is built around kebabs, rice, breads and curries rather than coffee drinks - delivery platforms list the brand under the 'Kebab' category."
    - Type: IDENTITY | Confidence: MEDIUM
    - Source: foodpanda (Coal & Coffee listings, 2025) - https://www.foodpanda.com.bd/restaurant/mdl2/coal-and-coffee-banani
    - Evidence: foodpanda's Mohakhali Coal & Coffee page carries a 'Kebab' tag; the Banani branch menu categories (dataset) are Rice, Breads, Kebabs, Burgers, Curries, Combos with no beverage category, so despite the 'coffee shop' category it functions as a kebab/curry eatery.
- Note: Unexpected menu identity: a coffee-shop-named venue whose menu sample and delivery categorization are kebab/curry-focused - this is the 'name vs actual menu' inversion that maps do not reveal.

### 53. Cricketer's Kitchen & Cafe

- Category: Restaurant
- Price range: ৳400–1,400
- **Recommendation: KEEP**
- Possible facts: "launched by former Bangladesh cricket captain Akram Khan"; "cricket-themed interior with outdoor seating by the lake"
  - Wording: "Cricketer's Kitchen & Cafe was launched by former Bangladesh cricket captain Akram Khan, and its Gulshan premises are decorated around a cricket theme."
    - Type: HISTORY | Confidence: MEDIUM
    - Source: BDCricTime (2018) - https://bdcrictime.com/akram-khan-launches-his-own-restaurant-cricketers-kitchen; Wanderlog
    - Evidence: BDCricTime headline: 'Akram Khan launches his own restaurant - Cricketers' Kitchen' (published 2018-11-08); Wanderlog review describes 'a cricket-themed dining experience' where 'cricket is all around you.'
  - Wording: "The restaurant has outdoor dining space adjacent to the lake (Hatirjheel/Gulshan lake area), adding a waterside element to the cricket-themed venue."
    - Type: EXPERIENCE | Confidence: MEDIUM
    - Source: Wanderlog - https://wanderlog.com/place/details/3687810/cricketers-kitchen--cafe
    - Evidence: Wanderlog: 'There is also an open space with tables laid out, and which is adjacent to a lake. This adds an extra flavour to the overall ambience.'
- Note: Owner identity (a former national captain) and the cricket-theme + lakeside seating are non-obvious, decision-relevant facts not visible on maps/menu.

### 54. Crowne Plaza Dhaka Gulshan Crowne Plaza Dhaka Gulshan

- Category: Buffet
- Price range: ৳2,000+
- **Recommendation: KEEP**
- Possible facts: "all-day dining buffet 'The Flair' is on the 24th floor with skyline views"; "property launched the Crowne Plaza brand in Bangladesh (2023)"
  - Wording: "The hotel's all-day dining buffet, The Flair, sits on the 24th floor of Crowne Plaza Dhaka Gulshan and overlooks the Dhaka skyline; the property launched the Crowne Plaza brand in Bangladesh in 2023."
    - Type: EXPERIENCE | Confidence: HIGH
    - Source: IHG Crowne Plaza Dhaka Gulshan (official) - https://www.ihg.com/crowneplaza/hotels/us/en/dhaka/daccr/hoteldetail/dining; IHG Newsroom (2023)
    - Evidence: IHG official: 'The Flair... Situated on the 24th floor... provides a captivating view of the city skyline'; IHG press release titled 'Crowne Plaza Hotels & Resorts launches in Bangladesh' (2023).
- Note: The bare Google 'buffet' listing hides the 24th-floor skyline setting and the 2023 first-in-country brand launch - both concrete experience/history facts.

### 55. Dhaba Banani

- Category: Restaurant
- Price range: ৳400–1,400
- **Recommendation: KEEP**
- Possible facts: "Indian street-food eatery operating in Banani since at least 2010, originally on Road 11"; "menu built around chaat/fuchka-style street food"
  - Wording: "Dhaba has served Indian street food in Banani since at least 2010, when it operated on Road 11; it later moved to its current Road 13/C location."
    - Type: HISTORY | Confidence: MEDIUM
    - Source: Ishy's Eats blog (2010) - http://ishyseats.blogspot.com/2010/; Wanderlog (Dhaba Banani)
    - Evidence: The 2010 blog lists 'Dhaba-1, House 100, Rd 11, Block C, Banani' serving dahi fuchka and dahi vada; a Wanderlog review recalls the eatery 'when it was located on Street 11' before it 'migrated to a new location.'
- Note: A 15+ year operating history and the Road-11-to-Road-13 relocation are not shown on maps/menu and signal an established street-food kitchen.

### 56. Domino's Pizza Banani

- Category: Pizza
- Cuisines: Pizza
- Signature dishes: Margherita,Ultimate Beef Pepperoni,Texas BBQ Chicken,Chicken Dominator,Spicy Chicken,Beefy & The Beast 2.0,Beefy Meatzza,Farmhouse,African Peri Peri
- Price range: ৳200–1,400
- **Recommendation: ABSTAIN**
  - No defensible facts (ABSTAIN/REJECT).
- Note: Global franchise; after searching, no decision-changing or defensible non-generic facts could be verified for this outlet.

### 57. DUNE DHAKA

- Category: Restaurant
- Price range: ৳2,000+
- **Recommendation: KEEP**
- Possible facts: "newly opened (2026) Banani restaurant with desert/dune-themed branding"; "higher price range positioning (Tk 2,000+)"
  - Wording: "DUNE is a recently opened restaurant in Banani (opened 2026) whose own promotional copy and branding follow a desert/dune theme - 'beyond the caves, beyond the sand.'"
    - Type: CONCEPT | Confidence: MEDIUM
    - Source: DUNE DHAKA Facebook page (2026) - https://www.facebook.com/dunedhaka/; co-owner Md Zahid on LinkedIn (2026)
    - Evidence: FB post headline: 'Beyond the caves, beyond the sand, an experience begins... Dune finally arrives'; co-owner's LinkedIn post (May 2026) confirms the opening at House 27, Road 12/A, Block H, Banani.
- Note: The themed-concept identity is non-obvious, but the venue is very new, so corroboration is limited and confidence capped at MEDIUM.

### 58. dürüm - Turkish Doner (Banani)

- Category: Takeout restaura
- Signature dishes: Honey Mustard Doner,Peri Peri Doner,Mediterranean Doner,Wasabi Mayo Doner,The Original Chicken Doner
- Price range: ৳200–400
- **Recommendation: KEEP**
- Possible facts: "Banani branch is the brand's original outlet (started 2020)"; "Turkish street-food concept focused on doner wraps; name = Turkish for wrap"
  - Wording: "The Banani branch - on the ground floor of Skylark Mark - is where dürüm started in 2020; the brand later expanded to other Dhaka neighbourhoods."
    - Type: HISTORY | Confidence: HIGH
    - Source: The Daily Star (2022) - https://www.thedailystar.net/life-living/food-recipes/news/durum-turkish-street-food-dhaka-2992576
    - Evidence: The Daily Star: 'The first one is in Banani, Skylark Mark, which started in 2020.'
  - Wording: "dürüm is a Turkish street-food concept built around doner wraps - 'dürüm' is the Turkish word for the wrap."
    - Type: CONCEPT | Confidence: HIGH
    - Source: The Daily Star (2022) - https://www.thedailystar.net/life-living/food-recipes/news/durum-turkish-street-food-dhaka-2992576
    - Evidence: The Daily Star: 'Durum is a street food joint that serves Turkish street food. The name... is inspired by dürüm which is a Turkish wrap that is filled with döner kebab.'
- Note: Origin location (first outlet) and the meaning behind the brand name are defensible, sourced facts a user would not get from maps.

### 59. El Toro Mexican Restaurant

- Category: Mexican
- Cuisines: Mexican
- **Recommendation: KEEP**
- Possible facts: "established mid-1990s; one of Dhaka's longest-running Mexican restaurants, relocated within Gulshan several times"; "Sonora-style Mexican food plus a deep-fried ice cream dessert"
  - Wording: "El Toro has served Mexican food in Dhaka since the mid-1990s (sources cite 1994-95) and has relocated within Gulshan at least three times; it currently operates in Gulshan-2 behind the Westin hotel."
    - Type: HISTORY | Confidence: MEDIUM
    - Source: The Daily Star (2006) - https://archive.thedailystar.net/lifestyle/2006/11/02/page04.htm; Dhaka Tribune (2022) - https://www.dhakatribune.com/business/276022/
    - Evidence: Daily Star 2006: 'Established in 1994 El Toro... serves SONORAN-style Mexican food'; Dhaka Tribune 2022: 'The 1995 establishment witnessed three relocations, and is currently located at Gulshan 2 behind the Westin hotel.' (Founding year conflicts: 1994 vs 1995.)
  - Wording: "El Toro's cooking follows the Sonora (northern Mexico) style, and its menu has long included a deep-fried ice cream dessert."
    - Type: CONCEPT | Confidence: MEDIUM
    - Source: The Daily Star (2006) - https://archive.thedailystar.net/lifestyle/2006/11/02/page04.htm
    - Evidence: Daily Star 2006: 'serves SONORAN-style Mexican food... El Toro is also famous for a unique dessert... Deep Fried Ice-Cream - the ice cream is covered in corn flake crumbs and then deep fried.'
- Note: Three decades of history, the Sonora-style identity and the signature deep-fried ice cream are non-obvious; founding-year discrepancy (1994 vs 1995) is flagged.

### 60. Evviva Italian Ristorante

- Category: Southern Italian
- Cuisines: Italian
- Price range: ৳800–2,000
- **Recommendation: KEEP**
- Possible facts: "dedicated to Southern Italian regional cuisine (olive oil/seafood vs Northern butter-and-cream)"; "chef-owner run since 2022"
  - Wording: "Evviva describes itself as a Southern Italian ristorante, centering its menu on regional Southern Italian cooking (olive oil, seafood, tomato) rather than the butter-and-cream style of Northern Italy."
    - Type: CONCEPT | Confidence: HIGH
    - Source: Evviva official site (eatevviva.com)
    - Evidence: Official site: 'We keep our passion and fascination in Southern Italian fare alive and well. Sun-grown ingredients like tomatoes, olives, citrus... embracing the sea with seafood and olive oil instead of the butter and cream found in the North.'
  - Wording: "Evviva is chef-owned: chef Sera Monira Payal, who opened the restaurant in 2022, runs it as sole proprietor and head of the kitchen."
    - Type: OTHER | Confidence: MEDIUM
    - Source: Sera Monira Payal LinkedIn (2026)
    - Evidence: LinkedIn profile: 'Chef-Owner - Evviva Italian Ristorante, Nov 2022 - Present... She is the sole proprietor and the face of the brand on all media platforms.'
- Note: Southern-Italian regional positioning is a distinctive concept detail, and chef-ownership adds a personal-experience angle neither maps nor menus convey.

### 61. Fakhruddin Biriyani & Restaurant - Gulshan 1

- Category: Restaurant
- Price range: ৳200–400
- **Recommendation: KEEP**
- Possible facts: "grew from a school canteen; founder trained under a Nawab-era chef"; "brand dates to 1966; family-run recipe passed down after founder died in 1997"
  - Wording: "Fakhruddin Biriyani grew out of a school canteen: founder Fakruddin Munshi started by running the kitchen at Viqarunnisa Noon School & College in Dhaka after training under a chef for the Nawabs of Murshidabad; his sons continue serving his kachchi biryani recipe."
    - Type: HISTORY | Confidence: HIGH
    - Source: Dhaka Tribune (2021) - https://www.dhakatribune.com/bangladesh/dhaka/236848/; Fakruddin official company profile (fakruddin.com)
    - Evidence: Dhaka Tribune: 'Starting from a school kitchen of 200 sq feet... founder of Fakruddin Biriyani Late Fakruddin Munshi turned it into a full-fledged business... He died back in 1997 but his sons are still serving his recipe'; official profile: 'young FAKRUDDIN Munshi was picked for apprenticeship under Muslim Miah, a chef for the Nawabs of Murshidabad.'
- Note: The school-canteen-to-household-name origin and Nawab-trained founder are distinctive, well-sourced history facts not available on maps.

### 62. Fish & Co. (Gulshan 1)

- Category: Seafood
- Cuisines: Seafood
- Price range: ৳2,000+
- **Recommendation: KEEP**
- Possible facts: "Singapore-founded seafood chain (1998) with seafood-served-in-a-pan concept"; "not the brand's first Dhaka run - a 2014 outlet closed; brand relaunched in 2022 under a new local operator"
  - Wording: "Fish & Co. is a Singapore-founded seafood chain (est. 1998) whose concept is seafood served straight from the pan, in the manner of Mediterranean fishermen."
    - Type: CONCEPT | Confidence: HIGH
    - Source: Fish & Co. Restaurants Pte Ltd company profile; Jewel Changi Airport official listing (fish-co.com)
    - Evidence: 'Established in 1998, Fish & Co. is a casual, family-friendly restaurant serving fresh seafood in a pan... Inspired by Mediterranean fishermen who cooked their catch straight from the sea.'
  - Wording: "The Gulshan-1 branch is not the brand's first stint in Dhaka: an earlier Fish & Co. outlet opened in Dhaka in 2014 and closed, and the brand relaunched in 2022 under a new local operator at Bay's 23, Gulshan Avenue."
    - Type: HISTORY | Confidence: MEDIUM
    - Source: Daffodil International University case study (Restaurant Business and Operations); Fish & Co. brand owner Ricky Chew on LinkedIn (2022)
    - Evidence: Case study: 'first opened by Orion group in August 2014... on 13th April 2022 Fish & Co. Bangladesh opened again under its new local owner Amra F&C Limited' at 'Bay's 23 Gulshan Avenue'; owner post (Nov 2022) confirms the relaunch. Note: owner post says 'June this year' vs case study's April - month discrepancy.
- Note: The pan-served concept and the 2014-close-2022-relaunch history are non-obvious and decision-relevant; month discrepancy between sources flagged.

### 63. Flambe Restaurant

- Category: Restaurant
- **Recommendation: KEEP**
- Possible facts: "operating since at least 2004 as a continental/steak restaurant"; "lake-view dining corner opposite Gulshan Club; waterfall exterior"
  - Wording: "Flambe has operated as a continental steak restaurant in Gulshan since at least 2004, when The Daily Star described it as sitting opposite Gulshan Club with a lake-view dining corner."
    - Type: HISTORY | Confidence: MEDIUM
    - Source: The Daily Star - Star Weekend (2004) - https://www.thedailystar.net/magazine/2004/12/03/eating.htm
    - Evidence: 2004 review: 'The restaurant at Gulshan... Located just opposite the Gulshan Club, sitting in the Lake View corner of Flambé... sizzling steak and mouth-watering continental cuisine.' Later references (chef profiles 2014, LinkedIn 2018) place it in Gulshan-2, corroborating longevity.
- Note: A 20+ year operating history plus the lakeside position add experience value not visible on Google Maps.

### 64. Food Engineering Banani

- Category: Pan Asian
- Cuisines: Asian
- Price range: ৳1,000–1,200
- **Recommendation: KEEP**
- Possible facts: "founded by an electrical engineer (2018)"; "brand materials describe it as 'an establishment by engineers' - name derives from founders' engineering background"
  - Wording: "Food Engineering is named for its founders' engineering background: it was founded in 2018 by electrical engineer Md. Faisal Al Islam, and the brand's own materials describe it as 'an establishment by engineers.'"
    - Type: CONCEPT | Confidence: MEDIUM
    - Source: Founder Md. Faisal Al Islam LinkedIn (2026); Food Engineering brand page (sites.google.com)
    - Evidence: Founder's LinkedIn: 'Owner - Food Engineering, Jan 2018 - Present... B.Sc. in Electrical & Electronics Engineering'; brand page: 'An Establishment by Engineers, who believe in quality more than quantity.'
- Note: The origin of the unusual brand name is a genuine concept discovery; supported mainly by the founder's own profile and brand page, so confidence is MEDIUM.

### 65. Fools Diner

- Category: Japanese
- Cuisines: Japanese
- Signature dishes: Grilled Squid & Octopus
- Price range: ৳400–1,400
- **Recommendation: KEEP**
- Possible facts: "small Banani diner known for affordable sushi in a city where sushi was mostly high-end"; "part of the Emerald Restaurant group (Thai Emerald, Red Chamber, Kiyoshi, etc.)"
  - Wording: "Fool's Diner is a small Banani diner that brought sushi to a lower price point in Dhaka, where sushi had previously been limited to upscale Japanese restaurants."
    - Type: CONCEPT | Confidence: HIGH
    - Source: The Daily Star (review) - https://www.thedailystar.net/news/fools-diner
    - Evidence: The Daily Star: 'Sushi has always been a high-end food item only available in the most exclusive of Japanese restaurants of Dhaka. Fool's Diner is here to change that.'
  - Wording: "Fool's Diner is part of the Emerald Restaurant group, which also operates Thai Emerald, Red Chamber, Kiyoshi and other Dhaka outlets."
    - Type: OTHER | Confidence: MEDIUM
    - Source: Emerald Restaurants (official) - https://emeraldrestaurants.com/
    - Evidence: 'Emerald Group of Restaurants began its journey with Thai Emerald... we proudly introduced... Fools Diner, Red Chamber, Kiyoshi, Grove Bistro, Gusto, Trouvaille, and Emerald Bakery.'
- Note: Affordable-sushi positioning and group affiliation are concrete, sourced facts that change expectations for a small, easily-missed diner.

### 66. G.O.A.T

- Category: Turkish
- Cuisines: Turkish
- Signature dishes: Chicken Durum,German Doner - Chicken,Chicken Adana,Chicken Wings,German Doner - Beef,Beef Burger
- Price range: ৳400–1,600
- **Recommendation: KEEP**
- Possible facts: "G.O.A.T expands to 'Gourmet Otto Artisan and Tales'"; "Turkish fusion menu with lesser-known Middle Eastern dishes; small space, reservation advised"
  - Wording: "G.O.A.T stands for 'Gourmet, Otto, Artisan and Tales' - a Banani restaurant whose menu mixes Turkish classics with lesser-known Middle Eastern dishes."
    - Type: CONCEPT | Confidence: HIGH
    - Source: The Business Standard (2025) - https://www.tbsnews.net/features/food/bananis-newest-turkish-restaurant-truly-goated-1262646; Dhaka Tribune (2024)
    - Evidence: TBS: 'G.O.A.T - short for Gourmet Otto Artisan and Tales'; Dhaka Tribune: 'Turkish fusion food with... pides, doners, and kebab platters, while also incorporating lesser-known Middle Eastern dishes in a cozy café setting.'
  - Wording: "G.O.A.T's Banani space is small and fills up on weekends and peak hours, so booking ahead is advised."
    - Type: EXPERIENCE | Confidence: MEDIUM
    - Source: The Business Standard (2025) - https://www.tbsnews.net/features/food/bananis-newest-turkish-restaurant-truly-goated-1262646
    - Evidence: TBS: 'due to the small seating capacity and the restaurant getting very crowded, especially during weekends and different peak hours, it's best to book a reservation in advance.'
- Note: The name expansion and Turkish-fusion identity are clean concept facts; the seating/reservation note adds practical decision value.

### 67. Galito's Gulshan-2

- Category: Restaurant
- **Recommendation: KEEP**
- Possible facts: "South African flame-grilled piri-piri franchise; first outlet in Bangladesh (Jan 2023)"; "inaugurated by Bangladesh cricket captain Tamim Iqbal"
  - Wording: "Galito's is a South African flame-grilled piri-piri chicken franchise; its Gulshan-2 outlet, opened in January 2023, was the brand's first in Bangladesh."
    - Type: HISTORY | Confidence: HIGH
    - Source: Galito's International (2023) - https://www.galitos.com/blog/2023/02/23/; The Daily Observer
    - Evidence: Galito's blog: 'officially launched its maiden outlet in Bangladesh on 22 January 2023'; Observer: 'brought the international food chain Gallito's from South Africa, the land of Piri-Piri.'
  - Wording: "The Gulshan-2 outlet was inaugurated at its opening by Bangladesh national cricket team captain Tamim Iqbal."
    - Type: OTHER | Confidence: HIGH
    - Source: Galito's International (2023) - https://www.galitos.com/blog/2023/02/23/; The Daily Observer
    - Evidence: Galito's blog: 'Captain of the Bangladesh national cricket team, Tamim Iqbal Khan... inaugurated Galito's first-ever outlet, in a grand ceremony.'
- Note: South African brand origin, first-in-Bangladesh status and the celebrity inauguration are all non-obvious history facts.

### 68. Garlic 'n Ginger Gulshan

- Category: Buffet
- Price range: ৳1,000–1,800
- **Recommendation: MODIFY**
- Possible facts: "operated by SR Group's hospitality arm"; "10th-floor multi-cuisine Asian buffet at 42 Gulshan Ave"
  - Wording: "Garlic 'n Ginger is operated by SR Group, a Dhaka-based hospitality company whose restaurant portfolio also includes The Great Kebab Factory, Food Village and Sung Garden."
    - Type: OTHER | Confidence: MEDIUM
    - Source: SR Group (official) - https://srgroup-bd.com/services/leisure-hospitality/details
    - Evidence: 'Garlic 'N' Ginger, The Great Kebab Factory, Food Village, Food Village Plus, and Sung Food Garden are few of the top fine dine restaurants... which are owned by SR Group.'
- Note: The SR Group ownership fact is defensible but thin on its own; recommend pairing it with the branch's buffet identity (multi-cuisine Asian buffet on the 10th floor of Jabbar Tower, 42 Gulshan Ave) for user value.

### 69. Ginza

- Category: Restaurant
- Signature dishes: Chicken Nanban,Ebi temper sushi,Ginza Special Seafood Fried Rice
- Price range: ৳400–1,600
- **Recommendation: KEEP**
- Possible facts: "Banani outlet opened in 2017 and is the brand's original location"; "Japanese fusion cuisine with flavours adjusted for Bangladeshi palates"
  - Wording: "Ginza's Banani outlet, which opened in 2017, is the brand's original location (a Dhanmondi branch followed in mid-2023)."
    - Type: HISTORY | Confidence: HIGH
    - Source: Dhaka Tribune (2024) - https://www.dhakatribune.com/business/335805/
    - Evidence: 'After establishing a presence in Banani in 2017, Ginza expanded to Dhanmoni a little over five months ago in June 2023.'
  - Wording: "Ginza serves Japanese fusion food, deliberately adjusting Japanese flavours to appeal to Bangladeshi tastes."
    - Type: CONCEPT | Confidence: HIGH
    - Source: Dhaka Tribune (2024) - https://www.dhakatribune.com/business/335805/
    - Evidence: 'They opted for Japanese fusion cuisine since they knew they would need to make some minor adjustments to the flavours so that they would appeal to the majority of Bangladeshis.'
- Note: Original-outlet history and the local-adaptation positioning are clear, sourced facts maps/menus do not reveal.

### 70. Goong The Castle

- Category: Korean
- Cuisines: Korean
- Price range: ৳2,000+
- **Recommendation: KEEP**
- Possible facts: "formerly named Dae Jang Geum; renamed after a name clash with a nearby restaurant"; "'Goong' means palace; serves Korean palace-style cuisine"
  - Wording: "Goong (Korean for 'palace') was previously named Dae Jang Geum; it changed its name after another Dae Jang Geum opened on the same street, and has served Korean palace-style cuisine in Gulshan for more than a decade."
    - Type: HISTORY | Confidence: MEDIUM
    - Source: M's Adventures food blog (2012-2013) - https://madventures.me/tag/goong/
    - Evidence: 'Goong, the Castle... Previously called Dae Jang Geum until another restaurant named Dae Jang Geum moved in on the same street... Korean palace food.'
- Note: The rename story and palace-cuisine identity are distinctive and defensible; single blogger source over multiple years caps confidence at MEDIUM.

### 71. Grand Buffet

- Category: Buffet
- Price range: ৳1,200–1,400
- **Recommendation: KEEP**
- Possible facts: "13th-floor buffet at ANZ Square, Banani, with city views"; "dinner buffet of ~101 items with live stations; unlimited drinks and tea/coffee included"
  - Wording: "Grand Buffet sits on the 13th floor of ANZ Square in Banani with glass-walled city views; its dinner buffet spans about 101 items, with live dosa and kebab stations and unlimited soft drinks and tea/coffee."
    - Type: EXPERIENCE | Confidence: MEDIUM
    - Source: The Bangladesh Monitor (hotel & restaurant trade publication)
    - Evidence: 'The glass walls around provide you with a mesmerizing city view from the 13th floor... at dinner the restaurant offers 101 items... dosas and kebabs are cooked right in front of the guests... unlimited complimentary soft drinks... tea and coffee as well.'
- Note: Floor-level views, live stations and included drinks are concrete experience facts beyond what maps or a menu show; article date is unstated, so confidence is MEDIUM.

### 72. Grandiose Restaurant

- Category: Restaurant
- **Recommendation: KEEP**
- Possible facts: "all-day multi-cuisine buffet restaurant of Dhaka Regency Hotel & Resort"; "the hotel is on Airport Road, Nikunja-2 - outside the Banani/Gulshan cluster where it appears in listings"
  - Wording: "Grandiose is the all-day multi-cuisine buffet restaurant of Dhaka Regency Hotel & Resort (Level 6); the hotel itself sits on Airport Road in Nikunja-2, near the airport rather than inside the Banani/Gulshan cluster where it appears in listings."
    - Type: LOCATION | Confidence: HIGH
    - Source: Dhaka Regency Hotel & Resort (official) - https://www.dhakaregency.com/dining/grandiose-restuarant
    - Evidence: Official: 'Location: Level: 6... Dhaka Regency Hotel & Resort Ltd. Airport Road, Nikunja 2 Dhaka 1229.'
- Note: Clarifies a likely geographic misassociation in the dataset - the restaurant is near the airport in Nikunja, not in Banani/Gulshan, which is decision-changing for someone planning a visit.

### 73. Great Britain Fish n Chips

- Category: Fish & Chips
- Cuisines: British
- Signature dishes: Garlic Butter Rice Bowl With Chicken Wings (2 Pcs),Seafood Fries Rice Bowl With Juicy Fish Fillet With Crispy Batter,Traditional Fish N Chips (Fish 2 Pcs),Fried Fish Box (All Items 3 Pcs),Seafood Fried Rice
- Price range: ৳200–400
- **Recommendation: KEEP**
- Possible facts: "started early 2023; very small (~7-8 seat) eatery opposite Banani Supermarket"; "seafood priced under Tk300 - well below typical Dhaka fish-and-chips prices"
  - Wording: "Great Britain Fish N Chips opened in early 2023 as a very small eatery (about 7-8 seats) opposite Banani Supermarket."
    - Type: HISTORY | Confidence: HIGH
    - Source: The Business Standard (2024) - https://www.tbsnews.net/features/food/great-britain-fish-n-chips-your-go-spot-seafood-under-tk300-871756
    - Evidence: 'Great Britain Fish N Chips started its journey in early 2023. The restaurant is quite small, accommodating only seven to eight people... opposite Banani Supermarket.'
  - Wording: "Its fish-and-chips and other seafood dishes are priced under Tk300, well below the Tk500-600 a plate of fish and chips typically costs at Dhaka restaurants."
    - Type: OTHER | Confidence: HIGH
    - Source: The Business Standard (2024) - https://www.tbsnews.net/features/food/great-britain-fish-n-chips-your-go-spot-seafood-under-tk300-871756
    - Evidence: 'A plate of fish and chips typically costs at least Tk500 to Tk600 at most restaurants... they offer a wide range of seafood dishes, all priced under Tk300.'
- Note: The budget-seafood positioning and tiny-scale dining are concrete, decision-relevant facts a user cannot infer from maps.

### 74. Green & Pepper

- Category: Restaurant
- Price range: ৳600–1,600
- **Recommendation: KEEP**
- Possible facts: "homegrown Bangladeshi peri-peri brand - a local alternative to international peri-peri chains"; "Gulshan-2 branch (House 19, Road 95) opened December 2023 as the brand's second outlet"
  - Wording: "Green & Pepper is a homegrown Bangladeshi peri-peri chicken brand, built on its own recipe as a local alternative to international peri-peri chains."
    - Type: CONCEPT | Confidence: HIGH
    - Source: Dhaka Tribune (2025) - https://www.dhakatribune.com/business/379597/
    - Evidence: 'a local Bangladeshi restaurant, has aimed to recreate the same flavour for Dhakaites with a local touch... recreating [the] signature taste with [a] unique recipe.'
  - Wording: "Its Gulshan-2 branch (House 19, Road 95) opened in December 2023 as the brand's second outlet, after its first in Bashundhara."
    - Type: HISTORY | Confidence: HIGH
    - Source: Green & Pepper company LinkedIn (2023)
    - Evidence: Company LinkedIn (Dec 2023): 'Green & Pepper Restaurant Limited has just opened its 2nd branch at Gulshan 2, House 19, Road 95.'
- Note: The local-peri-peri positioning is the key concept insight, and the branch opening date is corroborated by the company's own posts.

### 75. Gulshan banani

- Category: Restaurant
- **Recommendation: ABSTAIN**
  - No defensible facts (ABSTAIN/REJECT).
- Note: Entry is too vague (no address, category or menu data); no defensible facts could be identified or verified.

### 76. HAKKA DHAKA

- Category: Cantonese
- Cuisines: Chinese
- **Recommendation: KEEP**
- Possible facts: "specializes in Hakka Chinese cuisine (Google Maps lists it under 'Cantonese')"; "founded in 2014"
  - Wording: "HAKKA DHAKA specializes in Hakka Chinese cuisine - the cooking tradition of the Hakka people - fused with local ingredients; Google Maps lists it under the broader 'Cantonese' category."
    - Type: IDENTITY | Confidence: HIGH
    - Source: HAKKA DHAKA official site (hakkadhaka.page); company LinkedIn
    - Evidence: Official site: 'Hakka Dhaka opened its doors in 2014... We fuse authentic Hakka cuisine with local ingredients and cooking techniques.'
  - Wording: "Hakka Dhaka opened in 2014."
    - Type: HISTORY | Confidence: HIGH
    - Source: HAKKA DHAKA official site (hakkadhaka.page); company LinkedIn
    - Evidence: Official site: 'Hakka Dhaka opened its doors in 2014'; LinkedIn company page: 'founded in 2014.'
- Note: The category mismatch (Hakka vs Cantonese) is a genuine identity discovery, and the founding year is corroborated by first-hand sources.

### 77. Halda Valley Tea Lounge

- Category: Restaurant
- Signature dishes: Loitta Fry,Lemon Dory Delight,Chicken Mushroom Crepe
- Price range: ৳400–1,600
- **Recommendation: KEEP**
- Possible facts: "owned by the tea company behind Halda Valley Tea Garden (Fatikchhari, Chattogram) - the lounge is the estate's urban outlet"; "serves ~30 tea varieties with leaves brewed in full view"
  - Wording: "Halda Valley Tea Lounge is owned by Halda Valley Food & Beverage Ltd, the company behind the Halda Valley Tea Garden in Fatikchhari, Chattogram - a roughly 500-hectare estate established in 2003 - making the Gulshan lounge the tea estate's urban outlet."
    - Type: HISTORY | Confidence: HIGH
    - Source: Halda Valley Tea Lounge official (tealounge.haldavalley.com); Letmibd company profile; RTC Architects
    - Evidence: Letmibd: 'Halda Valley Tea Garden is one of the best Tea estates of Bangladesh, located at Narayanhat, Fatikchhari... around 500 Hecters of Land since its inception on 2003.'
  - Wording: "The lounge serves around 30 varieties of tea, with loose leaves brewed in full view of guests."
    - Type: EXPERIENCE | Confidence: MEDIUM
    - Source: RTC Architects (2018) - https://www.rtcarchitects.com/projects/halda-valley-director-bungalow
    - Evidence: 'People who love tea can have an authentic experience of conventional, as well as 30 different varieties of tea, served here. The customers can see tea leaves in the pots used.'
- Note: The tea-estate-owned concept (a Chattogram tea garden's own café) and the brewing-in-view experience are distinctive and well-sourced.

### 78. Handi (Gulshan Branch)

- Category: Indian
- Cuisines: Indian
- Signature dishes: Tandoori Chicken,Chicken Butter Masala,Chicken Biryani,Yellow Dal Butter Fry
- Price range: ৳400–1,600
- **Recommendation: KEEP**
- Possible facts: "Handi originated in Chittagong and expanded to Dhaka with Gulshan and Dhanmondi branches"; "Handi runs sehri service during Ramadan, drawing hundreds of late-night customers"
  - Wording: "Handi started in Chittagong and later expanded to Dhaka, adding branches in Gulshan and Dhanmondi."
    - Type: HISTORY | Confidence: MEDIUM
    - Source: Petit Futé (2024) — https://www.petitfute.com/v72593-cox-s-bazar/c1165-restaurants/c1031-cuisines-du-monde/c1035-cuisine-d-asie/c54-restaurant-indien/1576866-handi.html
    - Evidence: Petit Futé describes Handi as having its mother restaurant in Chittagong with branches in Dhanmondi and Gulshan before opening in Cox's Bazar.
  - Wording: "During Ramadan, Handi runs sehri service into the early morning, a practice its staff said had been running for about four years as of 2018."
    - Type: OTHER | Confidence: MEDIUM
    - Source: New Age (2018) — https://www.newagebd.net/article/74043/sehri-outings-restaurants-drawing-crowd
    - Evidence: Handi entrepreneur Md Mohiuddin Al Riyad Bappy said 'several hundred people rush to the restaurant from nearby areas for sehri' and cited 'four years of experience in continuing with sehri arrangement.'
- Note: Both facts are sourced and decision-relevant (origin chain and Ramadan operating pattern).

### 79. Haze

- Category: Restaurant
- **Recommendation: KEEP**
- Possible facts: "Haze is a shisha/hookah lounge rather than a conventional restaurant"; "Entry is restricted to those over 21"
  - Wording: "Haze is a shisha (hookah) lounge rather than a conventional restaurant; it runs a 21-and-over entry policy and pairs a small food menu with a broad drinks and shisha selection."
    - Type: IDENTITY | Confidence: MEDIUM
    - Source: Wanderlog reviews (2024) — https://wanderlog.com/place/details/13223461/haze; foodpanda listing — https://www.foodpanda.com.bd/restaurant/no39/haze
    - Evidence: A Wanderlog reviewer states 'It is actually a Hokkah Bar (Sisha Lounge), they don't serve food' and another notes 'you must be over 21 to go to this lounge.'
- Note: Unexpected identity vs. the menu data (soup/appetizers/pasta); user-relevant for age and expectations.

### 80. Hello Dhaka

- Category: Restaurant
- Price range: ৳400–1,600
- **Recommendation: KEEP**
- Possible facts: "Deshi-food specialist despite the English name — khichuri platters, bhorta bhaji, coconut chingri"; "Began late-night delivery after pandemic disruption and still serves until about 1am"
  - Wording: "Hello Dhaka, despite its English name, is a deshi-food specialist whose menu is built around Bangladeshi items such as khichuri platters, bhorta bhaji and coconut chingri."
    - Type: IDENTITY | Confidence: MEDIUM
    - Source: Wheree menu/listing (2025) — https://hello-dhaka.wheree.com/menu
    - Evidence: Listing describes Hello Dhaka as serving 'traditional Bangladeshi favorites, including the highly praised Khichuri platter'; review highlights mention Bhorta Bhaji and Coconut Chingri.
  - Wording: "Hello Dhaka began late-night delivery after pandemic-era disruption to its hours and still serves until around 1am."
    - Type: OTHER | Confidence: HIGH
    - Source: Dhaka Tribune (2022) — https://www.dhakatribune.com/business/264989/midnight-madness-how-these-startups-beat-dhaka
    - Evidence: Director Esha Rushdi said 'the disrupted hours of operations during the pandemic prompted them to begin late-night deliveries.'
- Note: Both facts are sourced and change expectations (cuisine identity and operating window).

### 81. Herfy - Banani

- Category: Fast Food
- Cuisines: Fast Food
- Signature dishes: Crispy & Juicy Chicken Burger,Fried Chicken - 2 pcs,Chicken Nuggets,Turkish Beef Burger,Beef Angus Burger
- Price range: ৳400–1,200
- **Recommendation: KEEP**
- Possible facts: "Herfy is a Saudi fast-food chain founded in Riyadh in 1981"; "The Banani outlet is part of the Saudi brand, not a local restaurant"
  - Wording: "Herfy is a Saudi fast-food chain founded in Riyadh in 1981 by Ahmed Hamad Al-Saeed; the Banani outlet is part of this Saudi-origin brand."
    - Type: HISTORY | Confidence: HIGH
    - Source: NRN (2012) — https://www.nrn.com/quick-service/saudi-arabian-chain-herfy-outlines-growth-plans; Herfy official (2024) — https://herfy.com/
    - Evidence: NRN: 'Since its founding in 1981 by Ahmed Hamad Al Saeed... the now-194-unit Riyadh-based Herfy chain.' Herfy's own site: 'Herfy embarked on its journey in 1981.'
- Note: Brand-origin fact gives context most diners won't have from Google or the menu.

### 82. Herfy Gulshan

- Category: Fast Food
- Cuisines: Fast Food
- Signature dishes: Crispy & Juicy Chicken Burger,Fried Chicken - 2 pcs,Chicken Nuggets,Spicy Chicken Wrap,Fried Chicken - 4 pcs,Chicken Cheese Burger,Turkish Beef Burger,Beef Angus Burger
- Price range: ৳400–1,200
- **Recommendation: KEEP**
- Possible facts: "First Herfy branch outside the Middle East, opened in Gulshan, Dhaka on 22 December 2017"; "Gulshan branch offers a drive-through"
  - Wording: "Herfy opened its first Bangladesh branch — and its first outside the Middle East — in Gulshan, Dhaka, on 22 December 2017."
    - Type: HISTORY | Confidence: HIGH
    - Source: Herfy Bangladesh official About (herfybd.com) — https://herfybd.com/about.ashx
    - Evidence: 'Herfy opened its first branch outside the Middle East in Bangladesh in December 22, 2017... The first branch opened in Gulshan, Dhaka, Bangladesh.'
- Note: First-in-country milestone is a defensible history fact.

### 83. Hungry Rooster - Banani

- Category: Restaurant
- Signature dishes: Loaded Fries
- Price range: ৳400–1,000
- **Recommendation: KEEP**
- Possible facts: "Brand of Devour, a Dhaka cloud-kitchen company"; "Operates from Devour's 'The HIVE' kitchen in Banani; sister brands Pimentos, Jhotpot and Pizzamia"
  - Wording: "Hungry Rooster is a fried-chicken brand operated by Devour, a Dhaka cloud-kitchen company that also runs Pimentos, Jhotpot and Pizzamia; the Banani outlet sits within Devour's 'The HIVE' facility."
    - Type: CONCEPT | Confidence: HIGH
    - Source: Devour official site — https://www.devourworld.com/; Devour LinkedIn (2020)
    - Evidence: 'Devour has a total of four brands under its name: Hungry Rooster, Pimentos, Jhotpot, and Pizzamia... Hungry Rooster specializes in Fried Chicken.' Bank partnership listing places the outlet at 'The HIVE, House:90, Road: 17A, Banani.'
- Note: Cloud-kitchen brand context explains the multi-brand menu model and is not visible on Google Maps.

### 84. Istanbul Restaurant Dhaka

- Category: Turkish
- Cuisines: Turkish
- **Recommendation: KEEP**
- Possible facts: "Operating since 2012 with Turkish chef Ali Gunes as chef and part-owner"; "Relocated in October 2020 after a five-to-six-month pandemic closure"
  - Wording: "Istanbul Restaurant has operated since 2012 and is run with Turkish chef Ali Gunes serving as chef and part-owner."
    - Type: HISTORY | Confidence: HIGH
    - Source: Dhaka Tribune (2023) — https://www.dhakatribune.com/business/334558/experience-the-true-taste-of-turkish-cuisine-in
    - Evidence: 'Chef Ali Gunes, who has served as both chef and part owner since 2012... Having been in operation since 2012.'
- Note: Turkish-chef ownership signals authenticity and longevity beyond typical listing data.

### 85. Izakaya Gulshan

- Category: Japanese
- Cuisines: Japanese
- Signature dishes: Fried Nori Beef Tacos,Chicken Katsu Curry Rice,Hibachi Chicken with Garlic Rice,Dragon Maki Roll,Salmon Sashimi,Fried Nori Prawn Tacos
- **Recommendation: KEEP**
- Possible facts: "Established 2018 as a concern of the Dekko Isho Group"; "Ran Bangladesh's first drone food-delivery trial from its Gulshan outlet in October 2025"; "Intentionally stays off major food-delivery platforms"
  - Wording: "Izakaya launched in 2018 as a Japanese izakaya (pub-style) concept under the Bangladeshi conglomerate Dekko Isho Group."
    - Type: HISTORY | Confidence: HIGH
    - Source: Dekko ISHO Group official — https://dekkoisho.com/buisnesses/izakaya/; The Business Standard (2023) — https://www.tbsnews.net/economy/corporates/izakayas-new-restaurant-uttara-offers-japanese-cuisine-608090
    - Evidence: 'Izakaya was established in 2018, as a concern of Bangladeshi conglomerate, Dekko Isho Group.' TBS: 'Izakaya was launched in 2018 with a vision to introduce a curated selection of Japanese-fusion flavours.'
  - Wording: "In October 2025 Izakaya ran what it described as Bangladesh's first drone food-delivery trial from its Gulshan 2 outlet, dropping meals onto rooftops in the Gulshan-Banani radius."
    - Type: EXPERIENCE | Confidence: HIGH
    - Source: The Daily Star (2025) — https://www.thedailystar.net/life-living/news/can-drone-deliver-dinner-dhaka-izakaya-just-tried-it-4011611
    - Evidence: 'Izakaya conducted Bangladesh's first drone-based food delivery trial from its Gulshan 2 outlet, targeting rooftops within the Gulshan-Banani radius.'
  - Wording: "Izakaya has intentionally stayed off major food-delivery platforms, handling its own delivery instead."
    - Type: OTHER | Confidence: HIGH
    - Source: The Daily Star (2025) — https://www.thedailystar.net/life-living/news/can-drone-deliver-dinner-dhaka-izakaya-just-tried-it-4011611
    - Evidence: 'Izakaya... has intentionally stayed off major food delivery platforms, choosing instead to build more control over its delivery system.'
- Note: All three are sourced, distinctive, and decision-relevant.

### 86. Jadu Bangla Restaurant

- Category: Restaurant
- Price range: ৳1–200
- **Recommendation: ABSTAIN**
  - No defensible facts (ABSTAIN/REJECT).
- Note: Searches returned only generic listings (Toastmasters venue use, aggregator blurb); nothing defensible or decision-changing.

### 87. Japanese Restaurant ICHI in Banani, Dhaka.

- Category: Japanese
- Cuisines: Japanese
- Signature dishes: 300 - Yakitori Moriawase
- **Recommendation: KEEP**
- Possible facts: "Has a Japanese proprietress on site and staff who use some Japanese"; "Yakitori-focused menu with a Japanese pub-style (otsumami) section"
  - Wording: "ICHI in Banani has a Japanese proprietress on site and staff who use some Japanese, an unusual feature for a Dhaka restaurant."
    - Type: EXPERIENCE | Confidence: MEDIUM
    - Source: 4travel.jp Japanese travel review — https://4travel.jp/os_shisetsu/10428702
    - Evidence: A Japanese traveler's review notes 'a Japanese proprietress is resident, so you can feel at ease' and 'some staff also use Japanese.'
- Note: On-site Japanese management is a useful, unusual service fact for diners (especially Japanese speakers).

### 88. Jassica Spa

- Category: Bangladeshi
- Cuisines: Bangladeshi
- Price range: ৳400–600
- **Recommendation: ABSTAIN**
  - No defensible facts (ABSTAIN/REJECT).
- Note: No verifiable restaurant identity or distinctive facts found; the Google category 'Bangladeshi restaurant' conflicts with the 'Spa' name and no sourcing exists.

### 89. Jatra Biroti

- Category: Bengali
- Cuisines: Bengali
- Signature dishes: Dal Puri Platter,Luchi with Alur Dom,Letka Khichuri Platter,Chhita Roti Platter,Fried Veggie Basket (Family Size),Khuder Bhaat Platter
- Price range: ৳200–1,200
- **Recommendation: KEEP**
- Possible facts: "Vegetarian rooftop restaurant of Jatra, the craft/clothing house founded by musician Anusheh Anadil in 2000"; "Rooftop design with red floor and white alpona evoking a traditional Bengali uthaan (courtyard)"; "Plastic-free operations with cloth napkins and free drinking water"
  - Wording: "Jatra Biroti is the rooftop restaurant of Jatra, a craft and clothing house founded in 2000 by artist and musician Anusheh Anadil; it runs a fully vegetarian kitchen."
    - Type: CONCEPT | Confidence: HIGH
    - Source: Jatra Biroti official (our story) — https://www.jatrabiroti.com/our-story; Dhaka Tribune (2025) — https://www.dhakatribune.com/business/376452/jatra-biroti-joyous-celebration-of-all-things
    - Evidence: Official site: 'Jatra was created in year 2000 by artist and musician Anusheh Anadil.' Dhaka Tribune: 'This vegetarian establishment caters to a diverse customer base' and the restaurant serves as a 'biroti' (break) from shopping at the Jatra store.
  - Wording: "The restaurant sits on a rooftop whose red floor and white alpona are designed to evoke a traditional Bengali uthaan (courtyard)."
    - Type: EXPERIENCE | Confidence: HIGH
    - Source: The Business Standard (2025) — https://www.tbsnews.net/features/jatra-cultural-oasis-concrete-jungle-banani-1077276
    - Evidence: 'One of the most iconic features is Jatra Biroti with its red floor and the white alpona on it... creates the imagery of the classic Bangali uthaan or courtyard.'
  - Wording: "Jatra Biroti runs plastic-free operations, using cloth napkins and serving free drinking water as part of its sustainability practices."
    - Type: OTHER | Confidence: HIGH
    - Source: Dhaka Tribune (2025) — https://www.dhakatribune.com/business/376452/jatra-biroti-joyous-celebration-of-all-things
    - Evidence: 'They use cloth napkins instead of paper ones, prohibit plastic items, and offer free water to support environmentally friendly practices.'
- Note: Concept, experience and sustainability facts are all well sourced and distinctive.

### 90. Kacchi Bhai - Gulshan

- Category: Restaurant
- Signature dishes: Basmati Kacchi - 1:1,Mutton Tehari 1:1,Kacchi Khadok - 1:1,Basmati Kacchi - 1:3,Plain Polao with Chicken Roast - 1:1,Beef Chaap with Plain Polao,Malai Lassi,Beef Chui Jhal with Polao Rice
- Price range: ৳200–400
- **Recommendation: KEEP**
- Possible facts: "Brand name fuses 'kacchi' with 'bhai'; first outlet opened at Basundhara Gate"; "Gulshan outlet was fined Tk100,000 in March 2024 for running without required approvals"
  - Wording: "Kacchi Bhai's name fuses 'kacchi' with 'bhai' (brother); the chain's first outlet opened at Basundhara Gate, reportedly without air conditioning due to unreliable power."
    - Type: HISTORY | Confidence: HIGH
    - Source: Kacchi Bhai official About — https://www.kacchibhai.com/about-us
    - Evidence: Founder Shoel Shiraj: the first branch opened at Bashundhara Gate; there was not enough electricity, so it ran without AC — 'প্রথম ব্রাঞ্চ এসি ছাড়া খুলা হয়েছিল.'
- Note: Origin/name story is sourced from the official about page. The 2024 DNCC fine (Tk100,000 for missing approvals) was excluded as a fact because its current status is unverified and it is dated.

### 91. Kareem's Dhaka

- Category: Indian
- Cuisines: Indian
- **Recommendation: ABSTAIN**
- Possible facts: "Possibly linked to a heritage 'Kareem's' brand — a digital-agency case study brands it a 'heritage dining brand'"; "The name collides with Delhi's Karim's (Jama Masjid, est. 1913), which in 2022 obtained a Delhi High Court order against a Mumbai 'Kareem's' chain"
  - No defensible facts (ABSTAIN/REJECT).
- Note: Could not verify any connection between the Dhaka branch and a heritage Kareem's/Karim's brand; the 'heritage' framing is marketing, and the Kareem's name is subject to trademark disputes in India. Nothing defensible.

### 92. Kebabzz Banani

- Category: Restaurant
- **Recommendation: KEEP**
- Possible facts: "Opened in 2024; co-owner Hasan Reza said he launched it to bring Mirpur-style kebabs to Banani"; "Interior uses jharoka-style (Mughal) windows with red-and-beige decor"
  - Wording: "Kebabzz opened in Banani in 2024; co-owner Hasan Reza said he launched it to bring the Mirpur-style kebab taste to Banani diners."
    - Type: HISTORY | Confidence: HIGH
    - Source: Dhaka Tribune (2024) — https://www.dhakatribune.com/business/365441/kebabzz-the-new-kebab-spot-it-a-hit-or-a-miss
    - Evidence: 'I have seen people travel from Gulshan and Banani to Mirpur, so I wanted to bring the taste of Mirpur to Banani,' said co-owner Hasan Reza. The article notes Kebabzz 'launched a couple of months ago.'
- Note: Founder-intent origin story is sourced and distinctive.

### 93. KFC Banani

- Category: Fast Food
- Cuisines: Fast Food
- Signature dishes: Classic Zinger Burger,Popcorn - Large,2 pcs Hot & Crispy Chicken,6 pcs Hot Wings,Tangy Fries - Large,4 pcs Hot & Crispy Chicken,House Party Combo - 1:2,6 pcs Chicken & Wings Meal,Big Deal,2 Classic Zinger Meal
- Price range: ৳200–1,200
- **Recommendation: ABSTAIN**
  - No defensible facts (ABSTAIN/REJECT).
- Note: Global chain; no decision-changing location-specific facts found beyond standard listing data.

### 94. KFD Express

- Category: Chinese
- Cuisines: Chinese
- Signature dishes: Chicken Meat Ball (1:1) (10 Pcs),Chicken Leg With Mushroom Dumpling (1:1),Express Chowmein (1:1),Chicken Curry Onion Dumpling (1:1),Beef Onion Dumpling (1:1)
- Price range: ৳200–600
- **Recommendation: KEEP**
- Possible facts: "Dumpling-centric Chinese fast-food chain; Facebook identity runs as 'KFD Kung Fu Dumplings'"; "Prothom Alo describes the brand as a destination for handmade Chinese dumplings"
  - Wording: "KFD Express is a dumpling-focused Chinese fast-food chain that grew out of a 'Kung Fu Dumplings' brand identity (its Facebook page runs as 'KFD Kung Fu Dumplings')."
    - Type: IDENTITY | Confidence: MEDIUM
    - Source: Prothom Alo English (2025) — https://en.prothomalo.com/lifestyle/w2ql641ket; KFD Express Facebook — https://www.facebook.com/KFDKungfuDumplings
    - Evidence: Prothom Alo: 'KFD Express – A paradise for dumpling lovers, offering a variety of handmade Chinese dumplings alongside classic Chinese favorites.' Facebook handle: KFDKungfuDumplings.
- Note: Brand-origin/identity fact explains the dumpling-heavy menu and is not obvious from listing data.

### 95. Khalifa’s Restaurant

- Category: Asian
- Cuisines: Asian
- Price range: ৳200–400
- **Recommendation: ABSTAIN**
  - No defensible facts (ABSTAIN/REJECT).
- Note: Only generic listings found (dining-guide aggregator, bank discount page); nothing decision-changing or defensible.

### 96. Khana's Banani

- Category: Fast Food
- Cuisines: Fast Food
- Signature dishes: Choco Cold Coffee (Regular),Smoked Chicken Sandwich,Hot Fries,Chicken Sub Sandwich,Masala Wedges
- Price range: ৳200–400
- **Recommendation: KEEP**
- Possible facts: "Started as a food cart and was rebranded from 'Ande Khana' when it moved into the Kazi Food Island food court near Bashundhara"; "Priced its menu around nearby private-university students"
  - Wording: "Khana's began as a food cart and was rebranded from 'Ande Khana' when it moved into the Kazi Food Island food court near Bashundhara, pricing its menu around nearby university students."
    - Type: HISTORY | Confidence: MEDIUM
    - Source: Business Inspection BD (2022) — https://businessinspection.com.bd/khanas-success-story/
    - Evidence: '[It] started its journey from a food cart... rebranding their restaurant as Khana's... Initially, Khana's Bashundhara targeted students of private universities in nearby areas and set their prices accordingly.'
- Note: Single but detailed, interview-based account of the brand's origin; useful context.

### 97. Khao San - Gulshan

- Category: Thai
- Cuisines: Thai
- Price range: ৳400–1,400
- **Recommendation: KEEP**
- Possible facts: "Founded by the same group that runs the fast-food chain Munch Station"; "Gulshan branch opened in 2024; original Dhanmondi outlet launched February 2023"
  - Wording: "Khao San was launched by the same group that runs the fast-food chain Munch Station."
    - Type: HISTORY | Confidence: HIGH
    - Source: The Business Standard (2023) — https://www.tbsnews.net/features/food/khao-san-new-haven-thai-food-lovers-590322
    - Evidence: 'The Khao San in Dhaka, however, is a food dream of the same group that started Munch Station — Syed Sameem Shahriyar, Taposh Ghosh, Mustafid Raiyan Khan and Bushra Haque Sarah.'
- Note: Founder lineage from an established fast-food chain is a sourced, useful origin fact.

### 98. KHAZANA

- Category: Indian
- Cuisines: Indian
- Price range: ৳2,000+
- **Recommendation: KEEP**
- Possible facts: "Opened in Gulshan 2 in the early 2000s as a franchise of Indian celebrity chef Sanjeev Kapoor's 'Khazana' brand"; "Runs a sweets shop, Khazana Mithai, alongside the restaurant"
  - Wording: "KHAZANA opened in Gulshan 2 in the early 2000s as a franchise of Indian celebrity chef Sanjeev Kapoor's 'Khazana' brand."
    - Type: HISTORY | Confidence: HIGH
    - Source: The Daily Star Star Magazine (2004) — https://archive.thedailystar.net/magazine/2004/03/02/venture.htm; Dhaka Tribune (2022) — https://www.dhakatribune.com/business/277193/20-years-later-khazana-is-still-the-best-indian
    - Evidence: 2004 Star Magazine: 'Sanjeev Kapoor's Khazana in Gulshan 2 came into being.' Dhaka Tribune (2022) confirms roughly 20 years of operation for the same brand.
  - Wording: "Khazana operates a sweets shop called Khazana Mithai alongside the restaurant."
    - Type: EXPERIENCE | Confidence: HIGH
    - Source: The Daily Star (2017) — https://online.thedailystar.net/lifestyle/news-flash/khazana-restaurant-returns-hiatus-1483915; Dhaka Tribune (2022)
    - Evidence: Daily Star (2017): 'The new and improved Khazana includes the restaurant, Khazana mithai as well as two large banquet halls.'
- Note: Chef-franchise origin and attached sweets shop are distinctive and well sourced.

### 99. Khichuriwala

- Category: Restaurant
- Price range: ৳400–600
- **Recommendation: ABSTAIN**
- Possible facts: "Khichuri-only concept with variations such as ilish and beef bhuna khichuri"
  - No defensible facts (ABSTAIN/REJECT).
- Note: The khichuri specialization is already visible in the menu data; no additional sourced facts found beyond the foodpanda listing.

### 100. Khushboo Restaurant

- Category: Restaurant
- Price range: ৳200–1,200
- **Recommendation: MODIFY**
- Possible facts: "A Khushboo restaurant has served the Gulshan 1 area since at least 2003 (iftar packages covered by The Daily Star)"; "Current menu focuses on rice and biryani"
  - Wording: "A restaurant named Khushboo has been present in the Gulshan 1 area since at least 2003, when The Daily Star covered its Ramadan iftar packages at Road 132 (the current outlet is listed at Road 131)."
    - Type: HISTORY | Confidence: MEDIUM
    - Source: The Daily Star (2003) — https://archive.thedailystar.net/lifestyle/2003/11/01/page02.htm; vymaps listing — https://vymaps.com/BD/dhaka/point-of-interest/340/
    - Evidence: Daily Star (2003): 'Khushboo, located at House 53/B, Road 132, Gulshan 1, offers three special iftar packages for the holy month.' The current Khushboo Restaurant is listed at House 60/B, Road 131, Gulshan 1.
- Note: Same-name continuity is inferred between the 2003 Road 132 listing and today's Road 131 outlet; wording flags the inference and identity should be confirmed before publishing.

### 101. Kindred Food Garden Banani

- Category: Restaurant
- Price range: ৳200–600
- **Recommendation: ABSTAIN**
  - No defensible facts (ABSTAIN/REJECT).
- Note: No verifiable facts found; search results point only to unrelated 'Kindred' businesses abroad and LinkedIn employees of a Kindred Ltd. bakery.

### 102. Kiva Han

- Category: Cafe
- Price range: ৳400–1,400
- **Recommendation: KEEP**
- Possible facts: "Name means 'coffee house' in Turkish, after the world's first coffee house, which opened in Istanbul in the 16th century"; "First outlet opened in Gulshan-1 in April 2013; founder conceived the idea in 2007 while studying in England"
  - Wording: "Kiva Han takes its name from the Turkish word for 'coffee house' — the name of the world's first coffee house, which opened in Istanbul in the 16th century."
    - Type: CONCEPT | Confidence: HIGH
    - Source: Kiva Han official (kivahancafe.com) — https://kivahancafe.com/about/; The Daily Star (2020) — https://www.thedailystar.net/business/news/inside-look-kiva-han-1992529
    - Evidence: Official site: 'Named after the first coffee house founded back in Istanbul, Turkey around 16th Century.' Founder interview: 'Kiva Han is a Turkish word that means Coffee House, and it was also the name of the first coffee shop in the world.'
  - Wording: "Kiva Han opened its first outlet in Gulshan-1 in April 2013; its founder, an architect who returned from England, had conceived the coffee-house plan in 2007."
    - Type: HISTORY | Confidence: HIGH
    - Source: The Daily Star (2020) — https://www.thedailystar.net/business/news/inside-look-kiva-han-1992529
    - Evidence: 'I wanted to open Kiva Han in 2007, but had to wait until April of 2013... My father helped me out at launching my first outlet in Gulshan-1.'
- Note: Name-origin and founding-story facts are corroborated by the official site and a founder interview.

### 103. Koreana Restaurant

- Category: Korean
- Cuisines: Korean
- Price range: ৳2,000+
- **Recommendation: KEEP**
- Possible facts: "Has been operating in Gulshan 1 since at least 2006"; "Took part in the 2014 Korean-embassy food festival at Gulshan Club"
  - Wording: "Koreana has been serving Korean food in Gulshan 1 since at least 2006, when The Daily Star profiled its menu."
    - Type: HISTORY | Confidence: HIGH
    - Source: The Daily Star archive (2006) — https://archive.thedailystar.net/lifestyle/2006/11/02/page04.htm; The Daily Star (2014) — https://www.thedailystar.net/korean-food-festival-held-at-gulshan-club-13759
    - Evidence: 2006 Star Weekend listing: 'Koreana (Hs 5, Rd 136, Gulshan 1...)' with a review of its Korean menu. A 2014 article confirms Koreana took part in the 'Taste of Korea' festival.
- Note: Long-running (20+ years) Korean presence in Gulshan is a defensible longevity fact.

### 104. Koyla Restaurant & Kebab

- Category: Restaurant
- Price range: ৳400–1,600
- **Recommendation: MODIFY**
- Possible facts: "Sheermal (saffron-infused Mughal-era naan) must be pre-ordered"; "Rumali roti and Mughlai breads"; "Large venue with bar and buffet (~300 capacity, per kitchen-supplier page)"
  - Wording: "Koyla in Banani serves sheermal, a mildly sweet saffron-infused naan from the Mughal era, which must be ordered in advance rather than on the spot."
    - Type: OTHER | Confidence: LOW
    - Source: The Daily Star (2016) — https://www.thedailystar.net/lifestyle/special-feature/breaking-bread-shab-e-barat-1224817
    - Evidence: The Star's Shab-e-Barat feature says "sheermal naan from Koyla in Banani... you have to order them beforehand", priced at Tk 135.
- Note: Identity match between the batch entry (Koyla Restaurant & Kebab, Bir Uttam Mir road) and the Daily Star's 'Koyla in Banani' is plausible but not fully confirmed; keep the pre-order detail, soften the outlet claim.

### 105. Laam

- Category: Restaurant
- Price range: ৳2,000+
- **Recommendation: KEEP**
- Possible facts: "Spanish cuisine restaurant in Gulshan-2"; "Listed in Foods and Wines from Spain certified-restaurant directory"; "Menu centers on tapas, paella and Spanish seafood"
  - Wording: "Laam is one of the few Spanish restaurants in Dhaka, located in Gulshan-2, and is listed in the Foods and Wines from Spain certified-restaurant directory, with a menu centered on tapas, paella and Spanish seafood."
    - Type: IDENTITY | Confidence: MEDIUM
    - Source: Foods and Wines from Spain (Spanish government initiative) — https://www.foodswinesfromspain.com/en/certified-restaurants-from-spain/restaurants/l/laam
    - Evidence: Directory lists 'Laam' as 'Spanish Cuisine, Tapas' in Gulshan-2, Dhaka, offering 'tapas, paella, or fresh seafood from Spain.'

### 106. Lahore by IKitchen

- Category: Restaurant
- Price range: ৳2,000+
- **Recommendation: KEEP**
- Possible facts: "Began as a pandemic-era cloud kitchen (IKitchen, Oct 2020)"; "Dine-in outlet was a response to demand for its Lahori food"; "Menu is deliberately only Lahori, not Indian or Bengali"
  - Wording: "Lahore by IKitchen grew out of IKitchen, a cloud kitchen launched in October 2020 during the pandemic; its Banani dining outlet was opened as a response to demand for the cloud kitchen's Lahori dishes."
    - Type: HISTORY | Confidence: HIGH
    - Source: Dhaka Tribune (2023) — https://www.dhakatribune.com/business/284034/a-taste-of-punjab-at-lahore-by-ikitchen ; The Daily Star — https://www.thedailystar.net/life-living/food-recipes/news/ikitchen-authentic-cuisines-your-doorstep-2941216
    - Evidence: Tribune: IKitchen was 'one of those cloud kitchens born during the pandemic' and the restaurant is 'a gesture of gratitude to the people who developed a taste for Lahori food.' Star: IKitchen 'began their journey on October 2020.'
  - Wording: "The restaurant deliberately serves only Lahori (Pakistani) cuisine rather than adapting its menu to Indian or Bengali tastes."
    - Type: CONCEPT | Confidence: HIGH
    - Source: Dhaka Tribune (2023) — https://www.dhakatribune.com/business/284034/a-taste-of-punjab-at-lahore-by-ikitchen
    - Evidence: Founder Romi F Ahsan: "we're sure to provide just Lahori food, not Indian or Bengali."

### 107. Lakeshore Suites

- Category: 4-star hotel
- **Recommendation: KEEP**
- Possible facts: "Part of a homegrown Dhaka hotel chain operating since 2004"; "Chain traces its origin to the founder's earlier motel, Golden Goose"; "26-suite property in Banani"
  - Wording: "Lakeshore Suites is part of Lakeshore Hotels, a Dhaka hotel group operating since 2004 that traces its origins to the founder's earlier motel, Golden Goose."
    - Type: HISTORY | Confidence: HIGH
    - Source: Lakeshore Hotels (official) — https://www.lakeshorehotels.com/about-us
    - Evidence: Official site: 'Since 2004... Lakeshore stands as the oldest privately-owned hotel business in Dhaka'; 'What began with a modest motel named Golden Goose has grown into one of Bangladesh's most respected hospitality brands.'

### 108. Laughing Buddha

- Category: Thai
- Cuisines: Thai
- Price range: ৳2,000+
- **Recommendation: KEEP**
- Possible facts: "Northern Thai cuisine with chefs from Chiang Mai"; "Opened in Gulshan in early 2020"; "Holds Thai Select Signature certification from the Royal Thai government"
  - Wording: "Laughing Buddha, opened in Gulshan in early 2020, focuses on northern Thai cuisine and has been led by Thai chefs from Chiang Mai."
    - Type: CONCEPT | Confidence: HIGH
    - Source: Showcase (2020) — https://www.showcase.com.bd/indulge-in-the-finest-laughing-buddha/ ; Tinds (2025) — https://tinds.com/where-gulshan-meets-chiang-mai-laughing-buddha-shines/
    - Evidence: Showcase: 'authentic Thai cuisine experience in Dhaka made by their very own Thai chefs, making their way long from Changmai, Thailand.' Tinds: the restaurant 'opened its doors in early 2020.'
  - Wording: "Laughing Buddha holds Thai Select Signature certification, a Thai government accreditation for authentic Thai restaurants abroad."
    - Type: OTHER | Confidence: HIGH
    - Source: The Bangladesh Monitor — https://www.bangladeshmonitor.com.bd/news-details/citys-popular-restaurant-laughing-buddha-crowned-with-thai-select-certificate ; UNB — https://unb.com.bd/category/Bangladesh/thai-select-certificate-award-giving-ceremony-held-in-dhaka/165513
    - Evidence: Bangladesh Monitor: 'Thai Select Signature is the highest level of accreditation, given to restaurants that exceed all of the criteria'; the certificate ceremony was held at the Gulshan outlet. UNB lists Laughing Buddha among currently operating Thai Select certified restaurants.

### 109. Lounge Comida

- Category: Restaurant
- **Recommendation: ABSTAIN**
- Possible facts: "Restaurant at Rafflesia Serviced Apartments (Road 22/23 corner, Gulshan-1)"; "Family-friendly restaurant, opens very early (6 am)"
  - No defensible facts (ABSTAIN/REJECT).
- Note: No decision-changing facts found; external coverage is limited to serviced-apartment restaurant listings and generic hotel reviews.

### 110. Lucknow Dhaka

- Category: Indian
- Cuisines: Indian
- **Recommendation: KEEP**
- Possible facts: "Built its menu around Awadhi (Lucknowi) cuisine, a niche rarely served in Dhaka"; "Menu includes unusual biryani variants (spinach biryani, keema biryani) and galawti kebab"; "Run under the Bengal Express group"
  - Wording: "Lucknow built its menu around Awadhi (Lucknowi) cuisine at a time when, its management says, that style was rarely served in Dhaka's Indian restaurants; it has included unusual variants such as a biryani served with spinach and a keema biryani."
    - Type: CONCEPT | Confidence: MEDIUM
    - Source: ICE Business Times (2016) — https://ibtbd.net/the-dynamics-of-consistency/
    - Evidence: In a 2016 interview, its director Zeenat said 'Awadhi cuisine has not been explored at length. This is what gives us our edge' and cited the spinach biryani and keema biryani as dishes 'not served in other Indian restaurants.'

### 111. Madchef & Cheez! Gulshan 1 (Cloud Kitchen)

- Category: Takeout restaura
- Price range: ৳200–1,000
- **Recommendation: KEEP**
- Possible facts: "Brand grew from a single food cart (2016) to 16 outlets in 8 years"; "This Gulshan-1 location operates as a cloud kitchen (delivery-focused)"; "Cheez pizza brand was born when Madchef moved from Banani Road 17/A"
  - Wording: "Madchef & Cheez grew from a single food cart into a brand with 16 outlets within eight years; this Gulshan-1 location operates as one of the brand's cloud-kitchen (delivery-focused) outlets."
    - Type: HISTORY | Confidence: MEDIUM
    - Source: The Daily Star — https://www.thedailystar.net/lifestyle/food/news/eight-years-connecting-food-enthusiasts-2134276 ; Dhaka Tribune (2020) — https://www.dhakatribune.com/feature/220116/work-hard-until-you-get-lucky
    - Evidence: The Star: 'going from one cart to 16 outlets within eight years.' The Tribune describes Cheez being launched when Madchef moved from its Banani Road 17/A outlet; the outlet's own name and delivery focus identify it as a cloud kitchen.

### 112. Madchef | Banani

- Category: Fast Food
- Cuisines: Fast Food
- Signature dishes: Signature Chicken,Signature Beef,Achari Rice with Katsu Chicken,Roast Chicken Poutine,Chicken Wings,Garlic Gyro Chicken Wrap
- Price range: ৳400–600
- **Recommendation: KEEP**
- Possible facts: "Name combines 'Mad' (Arman Mohammed) + 'Chef' (Labib Tarafdar)"; "Started as food carts at Dhaka colleges around 2016"; "Targeted a youth hangout audience from the start"
  - Wording: "The name 'Madchef' combines the monikers of its two founders — 'Mad' for Arman Mohammed and 'Chef' for Labib Tarafdar — who started selling burgers from food carts at Dhaka colleges around 2016."
    - Type: HISTORY | Confidence: HIGH
    - Source: The Daily Star — https://www.thedailystar.net/star-youth/news/young-foodies-mad-chefs-1679086
    - Evidence: The Star: Arman Mohammed is 'proclaimed as the "Mad" portion of "Madchef"'; 'The "Chef" part of the name is attributed to Labib Tarafdar'; the pair 'started their journey in the food cart business' and 'set up stalls in different educational institutions.'

### 113. Manzar Banani

- Category: Restaurant
- Price range: ৳600–1,600
- **Recommendation: ABSTAIN**
- Possible facts: "Rooftop restaurant on the top floor of BNB Empire building, opposite Point-11"; "Part of the Banani Road 11 high-rise dining cluster"
  - No defensible facts (ABSTAIN/REJECT).
- Note: External coverage only confirms the rooftop location (top floor, BNB Empire building, Banani) that the batch already shows; no distinct concept or verifiable operating detail beyond a single 2024 fire-safety criticism report.

### 114. MANZO Restaurant Dhaka

- Category: Restaurant
- Price range: ৳2,000+
- **Recommendation: KEEP**
- Possible facts: "Fine-dining restaurant opened in 2023 on Gulshan Avenue"; "Seasonal Mediterranean menu built on local and seasonal produce"; "Kitchen led by Bangladeshi executive chef Zohra Maliha"
  - Wording: "MANZO, opened in 2023 on Gulshan Avenue, is a fine-dining restaurant whose menu is built around local and seasonal produce sourced from Bangladeshi vendors."
    - Type: CONCEPT | Confidence: HIGH
    - Source: Dhaka Tribune (2023) — https://www.dhakatribune.com/business/283884/manzo-magnificent-fine-dining-at-dhaka%E2%80%99s-newest ; MANZO (official) — https://manzodhaka.com/
    - Evidence: Tribune: 'Manzo... offers seasonal, Mediterranean food, in a calm environment'; official site: 'We utilise local and seasonal produces through vendors from the Bangladeshi landscape.'
  - Wording: "Its kitchen is led by Bangladeshi executive chef Zohra Maliha, who came to fine dining after being inspired by Bangkok chefs working with local ingredients."
    - Type: OTHER | Confidence: MEDIUM
    - Source: The Daily Star (2023) — https://www.thedailystar.net/life-living/news/culinary-magic-dhaka-chef-zohra-malihas-fine-dining-revolution-3494361
    - Evidence: The Star profiles 'Executive Chef Zohra Maliha' at Manzo, noting she 'was inspired by Bangkok chefs who masterfully utilised local ingredients.'

### 115. Marina Cafe & Restaurant, Gulshan Lake View

- Category: Restaurant
- Price range: ৳200–400
- **Recommendation: ABSTAIN**
- Possible facts: "Small cafe-restaurant near Gulshan Lake (Gudaraghat link road)"; "Budget price range (Tk 200-400)"
  - No defensible facts (ABSTAIN/REJECT).
- Note: Only generic listings found (foodpanda address, hotel reviews); no verifiable decision-changing facts.

### 116. Meat Theory

- Category: Restaurant
- Signature dishes: Baby Back Ribs Half Slab,Cheese Buldak,Fiery Giblets,Frank Bites,Rib Steak
- Price range: ৳2,000+
- **Recommendation: KEEP**
- Possible facts: "Steakhouse that also serves Korean dishes (cheese buldak, gochujang rice)"; "Several cuts seared on a tabletop griddle pan"; "Large mixed-grill sharing platters (Cattle Battle / Parrillada)"; "Operating since around 2019"
  - Wording: "Meat Theory pairs a steakhouse menu — rib steak, picanha, tenderloin — with Korean-accented items such as cheese buldak and gochujang rice, and finishes several cuts on a tabletop griddle pan."
    - Type: IDENTITY | Confidence: MEDIUM
    - Source: Meat Theory (official menu) — https://bestmeatlab.com/
    - Evidence: Official menu lists steaks (Rib Steak, Picanha, Tenderloin) alongside Cheese Buldak and gochujang rice; 'Meat & Marrow' is described as 'seared on the Table Top Griddle Pan.'
  - Wording: "Meat Theory serves large mixed-grill platters intended for sharing, including its 'Cattle Battle' platter."
    - Type: EXPERIENCE | Confidence: MEDIUM
    - Source: Meat Theory (official) — https://bestmeatlab.com/ ; customer reviews on the official site
    - Evidence: Official-site reviewers describe ordering the 'Cattle Battle' platter with portions 'enough for 3 people'; the brand's creative portfolio references a 'Parrillada Challenge' platter.

### 117. Mezbaan Dine

- Category: Restaurant
- Price range: ৳400–1,200
- **Recommendation: ABSTAIN**
- Possible facts: "Bengali restaurant inside Habib Market/Habib Tower, Gulshan Avenue"; "Menu covers curries, kebabs, set menus and desserts"
  - No defensible facts (ABSTAIN/REJECT).
- Note: No unique, verifiable facts found; coverage is limited to generic listings and a 2024 fire-exit criticism report.

### 118. Mezzan Haile Aiun, Dhaka

- Category: Restaurant
- Price range: ৳400–600
- **Recommendation: KEEP**
- Possible facts: "Name means 'come if you want to eat Mezban' in the Chattogram dialect"; "Part of Chattogram-based Barcode Restaurant Group"; "Mezban beef still cooked on a traditional wood stove; one cow per day"; "Makes the ceremonial Mezbani feast available every day"
  - Wording: "The name 'Mezzan Haile Aaiun' translates from the Chattogram dialect to 'come if you want to eat Mezban', referencing the traditional Chittagonian Mezban feast."
    - Type: IDENTITY | Confidence: HIGH
    - Source: bdnews24 (2023) — https://bdnews24.com/hello/cee9cblsvl ; The Business Standard (2021) — https://www.tbsnews.net/features/food/mezban-cuisine-choice-feasts-310606
    - Evidence: bdnews24: 'named "Mezzan Haile Aiyun", which means "come if you want to eat Mezban" in the native dialect.'
  - Wording: "Mezzan Haile Aiun is part of Chattogram-based Barcode Restaurant Group, opened so the ceremonial Mezbani beef dish could be eaten on any day rather than only at feasts; the mezban meat is still cooked on a traditional wood stove."
    - Type: HISTORY | Confidence: HIGH
    - Source: The Daily Star (2023) — https://www.thedailystar.net/business/economy/news/mezzan-restaurant-chain-thrives-ctg-cuisine-3136096 ; The Business Standard (2021) — https://www.tbsnews.net/features/food/mezban-cuisine-choice-feasts-310606
    - Evidence: The Star: Hoque 'decided to open a specialised restaurant named Mezzan Haile Aaiun so that people can celebrate Mezban every day of the week.' TBS: meat is 'cooked on a traditional wood stove' with one cow slaughtered per day.

### 119. Mezzan Haile Aiun, Gulshan

- Category: Restaurant
- Price range: ৳400–600
- **Recommendation: KEEP**
- Possible facts: "Name means 'come if you want to eat Mezban' in the Chattogram dialect"; "Part of Chattogram-based Barcode Restaurant Group"; "Mezban beef still cooked on a traditional wood stove; one cow per day"; "Makes the ceremonial Mezbani feast available every day"
  - Wording: "The name 'Mezzan Haile Aaiun' translates from the Chattogram dialect to 'come if you want to eat Mezban', referencing the traditional Chittagonian Mezban feast."
    - Type: IDENTITY | Confidence: HIGH
    - Source: bdnews24 (2023) — https://bdnews24.com/hello/cee9cblsvl ; The Business Standard (2021) — https://www.tbsnews.net/features/food/mezban-cuisine-choice-feasts-310606
    - Evidence: bdnews24: 'named "Mezzan Haile Aiyun", which means "come if you want to eat Mezban" in the native dialect.'
  - Wording: "Mezzan Haile Aiun is part of Chattogram-based Barcode Restaurant Group, opened so the ceremonial Mezbani beef dish could be eaten on any day rather than only at feasts; the mezban meat is still cooked on a traditional wood stove."
    - Type: HISTORY | Confidence: HIGH
    - Source: The Daily Star (2023) — https://www.thedailystar.net/business/economy/news/mezzan-restaurant-chain-thrives-ctg-cuisine-3136096 ; The Business Standard (2021) — https://www.tbsnews.net/features/food/mezban-cuisine-choice-feasts-310606
    - Evidence: The Star: Hoque 'decided to open a specialised restaurant named Mezzan Haile Aaiun so that people can celebrate Mezban every day of the week.' TBS: meat is 'cooked on a traditional wood stove' with one cow slaughtered per day.

### 120. MOJA Korean Fusion Restaurant

- Category: Restaurant
- Signature dishes: Beef Bulgogi Sandwich,Korean Seasoned Spicy Fried Chicken,Pistachio Cream & Ricotta Cheese Sandwich,Beef Bulgogi & Mushroom Quesadillas,Beef Kimbab,Acai Berry Bowl
- Price range: ৳800–2,000
- **Recommendation: KEEP**
- Possible facts: "Korean fusion with Western breakfast/dessert items"; "Acai berry bowl and ricotta-cream sandwich on the menu"; "Located on the 11th floor of Hamid Tower, Gulshan-2"
  - Wording: "MOJA, on the 11th floor of Hamid Tower in Gulshan-2, combines Korean mains (bulgogi, kimbap, Korean fried chicken) with Western-style breakfast and dessert items such as acai berry bowls and ricotta-cream sandwiches."
    - Type: IDENTITY | Confidence: MEDIUM
    - Source: foodpanda (official delivery menu) — https://www.foodpanda.com.bd/restaurant/p9lb/moja-korean-fusion-restaurant
    - Evidence: The foodpanda menu groups items into Breakfast, Korean Dish, Kimbab, Burger & Sandwich and Sweet Treat categories, including the acai berry bowl and bulgogi sandwiches.

### 121. NAM

- Category: Restaurant
- Price range: ৳2,000+
- **Recommendation: MODIFY**
- Possible facts: "Thai restaurant in Banani"; "Dine-in only (no takeaway or delivery)"
  - Wording: "NAM is a Thai restaurant in Banani whose service is dine-in only, with no takeaway or delivery option."
    - Type: OTHER | Confidence: MEDIUM
    - Source: dohaj.com job posting (2026) — https://dohaj.com/job-details/thai-chef-nam-310964 ; LinkedIn (2026)
    - Evidence: A 2026 'Thai Chef at NAM' posting lists the company in Dhaka (Banani) preparing 'authentic Thai dishes'; LinkedIn profiles reference 'Nam น้ำ' as a Thai fine-dining restaurant in Dhaka. The dine-in-only service option is from the outlet's Google listing.
- Note: Evidence for the Thai identity is indirect (job postings and LinkedIn profiles); confirm via the restaurant's own channels before publishing.

### 122. Nawab Chatga

- Category: Bengali
- Cuisines: Bengali
- Signature dishes: Set Menu - 05
- Price range: ৳200–1,200
- **Recommendation: KEEP**
- Possible facts: "Monthly last-Thursday buffet of 15+ dishes at Tk 799"; "Beef slow-cooked in clay ovens over wood fires; spices from Hathazari bazaar"; "Opened in late 2015 in Gulshan-1, with singer Elita announced at launch"
  - Wording: "On the last Thursday of each month, Nawab Chatga serves a buffet of 15-plus Chittagonian dishes for Tk 799."
    - Type: EXPERIENCE | Confidence: HIGH
    - Source: The Daily Star (2021) — https://www.thedailystar.net/lifestyle/food/news/nawab-chatga-2026049
    - Evidence: 'Push through the doors on the last Thursday of any month and you will be treated to... chafing dishes brimming with 15 plus of Nawab Chatga's specialties. One banquet here will only set you back... Tk 799.'
  - Wording: "Its Chittagonian dishes are cooked the traditional way, with beef slow-cooked in clay ovens over wood fires and spices sourced from Hathazari bazaar."
    - Type: CONCEPT | Confidence: HIGH
    - Source: The Daily Star (2025) — https://online-d11.thedailystar.net/life-living/food-recipes/news/dhakas-food-map-exploring-regional-culinary-gems-3887391
    - Evidence: 'The beef? Cooked slowly and steadily, the traditional way — in clay ovens over wood fires. No shortcuts...'; spices are 'sourced straight from Hathazari Bazar.'
  - Wording: "Nawab Chatga opened in late 2015 in Gulshan-1, with singer Elita announced as a co-founder at launch."
    - Type: HISTORY | Confidence: MEDIUM
    - Source: Prothom Alo (2015) — https://en.prothomalo.com/entertainment/Elita-launches-her-own-restaurant
    - Evidence: Prothom Alo (Dec 2015): 'Nawab Chatga, a newly opened eatery in Gulshan-1, has made the singer a restaurateur.' A 2021 Daily Star interview names Shahidul Islam as owner, so founding roles overlap.

### 123. New Cathay

- Category: Chinese
- Cuisines: Chinese
- Signature dishes: Fried Spring Chicken,American Chopsuey,Stuffed Mushroom
- **Recommendation: KEEP**
- Possible facts: "Revival of an older Chinese restaurant that had closed"; "Peking duck requires a 24-hour advance order"; "Deshi-style Chinese menu"
  - Wording: "New Cathay, on the 4th floor of Rupsha Tower in Banani-11, is the revival of an older Chinese restaurant that had closed, reopening after customer demand."
    - Type: HISTORY | Confidence: MEDIUM
    - Source: The Daily Star — https://www.thedailystar.net/news/new-cathay-restaurant
    - Evidence: The Star describes it as 'the revamped edition or, one could say, resurrection of the restaurant... following a period when the popular eatery was closed.'
  - Wording: "New Cathay's Peking duck must be ordered at least 24 hours in advance."
    - Type: OTHER | Confidence: HIGH
    - Source: The Daily Star — https://www.thedailystar.net/news/new-cathay-restaurant
    - Evidence: 'New Cathay's Peking Duck which the restaurant has titled as its special dish. The Peking Duck has to be ordered at least 24 hours prior to your visit.'

### 124. New Dhansiri Restaurant - Gulshan 2

- Category: Restaurant
- Price range: ৳200–1,400
- **Recommendation: MODIFY**
- Possible facts: "Long-running Mughlai-Bengali kebab house (guides since at least the early 2010s)"; "Late hours, closing around 2 a.m."; "Naan specialty (mint/garlic-chilli naans)"
  - Wording: "New Dhansiri, opposite the Westin in Gulshan-2, is a long-running Mughlai-Bengali eatery — written about in Dhaka dining guides since at least the early 2010s — that keeps hours into the early morning (closing around 2 a.m.)."
    - Type: HISTORY | Confidence: MEDIUM
    - Source: The Daily Star (2016) — https://www.thedailystar.net/lifestyle/special-feature/breaking-bread-shab-e-barat-1224817 ; Outlook Traveller (2014) ; The Gannet (2010)
    - Evidence: Outlook Traveller (2014) lists Dhansiri among chains 'famed for their Mughlai-Bengali food'; the 2016 Star piece notes its naans come 'sprinkled with pudina... covered in garlic and chilli.' Early-morning closing is from the outlet's current listing.
- Note: A 'founding year 1988' claim could not be verified beyond the restaurant's own email address; wording was softened to 'long-running' with documented coverage from the 2010s.

### 125. New Gold Star Restora

- Category: Bangladeshi
- Cuisines: Bangladeshi
- **Recommendation: ABSTAIN**
  - No defensible facts (ABSTAIN/REJECT).
- Note: No relevant external coverage found after searches; nothing defensible.

### 126. Nori

- Category: Asian Fusion
- Cuisines: Asian
- Signature dishes: Xia Sanwen,Chicken Tom Yum Rice Bowl,Haixian Rice Bowl,Seafood Fried Rice,Naga Fried Rice,Corn & Cream Cheese Jiaozi
- **Recommendation: ABSTAIN**
- Possible facts: "Asian fusion / pan-Asian identity (sushi, jiaozi, rice bowls)"; "Located on Level 8 of Bay's Bellavista, Banani"
  - No defensible facts (ABSTAIN/REJECT).
- Note: No verifiable non-generic facts found; the official site is marketing copy and searches surface no independent coverage of the Dhaka outlet.

### 127. O' Play Restaurant

- Category: Italian
- Cuisines: Italian
- **Recommendation: KEEP**
- Possible facts: "Family-focused Italian bistro with a supervised children's play zone (ball pool, jungle gym, sand pit, arcade)"; "Founded in 2019 by four women entrepreneurs, all working mothers"; "Play zone accessible for a small hourly fee"
  - Wording: "O'Play, which opened in 2019, is a family-focused Italian bistro with a supervised children's play zone on its upper floor — ball pool, indoor jungle gym, outdoor sand pit and arcade."
    - Type: EXPERIENCE | Confidence: HIGH
    - Source: Dhaka Tribune (2019) — https://www.dhakatribune.com/magazine-archive/avenue-t/176973/o%E2%80%99play-takes-your-breath-away
    - Evidence: The Tribune: 'The play area above the bistro is equipped with... a ball pool with slides, an indoor jungle gym, an outdoor sand pit and many more kiddy rides... supervised by O'Play appointed nannies.'
  - Wording: "O'Play was founded by four friends, all working mothers, who designed the bistro so parents could eat while their children play."
    - Type: HISTORY | Confidence: HIGH
    - Source: Dhaka Tribune (2019) — https://www.dhakatribune.com/magazine-archive/avenue-t/176973/o%E2%80%99play-takes-your-breath-away
    - Evidence: 'the brainchild of four exceptionally hard-working women who are also dedicated mothers... wanted to create an amusing and friendly environment where families can unwind.'

### 128. Olive Garden

- Category: Chinese
- Cuisines: Chinese
- **Recommendation: KEEP**
- Possible facts: "Chinese restaurant despite its Italian-style name"; "Kitchen led by a chef from Sichuan, China"; "Private karaoke rooms"
  - Wording: "Despite its Italian-style name, Olive Garden in Gulshan is a Chinese restaurant whose kitchen has been led by a chef from Sichuan, China."
    - Type: IDENTITY | Confidence: MEDIUM
    - Source: MyBangla24 (2025) — https://mybangla24.com/chinese-restaurants-dhaka ; M's Adventures (2012) — https://madventures.me/
    - Evidence: MyBangla24 lists 'Olive Garden' among Dhaka Chinese restaurants: 'Their chef is from the Chinese province of Sichuan.' A 2012 blog also identifies 'Olive Garden, Road 24, Gulshan' as Chinese.
  - Wording: "Olive Garden has private karaoke rooms alongside its dining areas."
    - Type: EXPERIENCE | Confidence: MEDIUM
    - Source: MyBangla24 (2025) — https://mybangla24.com/chinese-restaurants-dhaka
    - Evidence: 'There are karaoke rooms as well as private dining rooms.'

### 129. Oro Dhaka

- Category: Restaurant
- Price range: ৳2,000+
- **Recommendation: KEEP**
- Possible facts: "Neighborhood eatery with recipes developed in collaboration with chefs from Argentina, Mexico, Spain, Singapore and Japan"; "Produces bread, cheese, yoghurt, pasta and gelato in-house"; "Open kitchen for an immersive dining experience"
  - Wording: "Oro Dhaka, a neighborhood eatery in Gulshan, developed its recipes in collaboration with chefs from Argentina, Mexico, Spain, Singapore and Japan, and produces its own bread, cheese, yoghurt, pasta and gelato in-house."
    - Type: CONCEPT | Confidence: HIGH
    - Source: Oro Dhaka (official) — https://orodhaka.com/about.html
    - Evidence: Official site: 'serving classic recipes from around the world, using skills, techniques and knowledge developed in collaboration with chefs from Argentina, Mexico, Spain, Singapore and Japan'; 'Our in house team of experts produces world class breads, yoghurt, cheese, pasta and gelato.'

### 130. Pagla Baburchi

- Category: Restaurant
- Signature dishes: Chicken Soup Korma,Shahi Beef Nehari,Plain Shorisha Khichuri,Beef Kolija Bhuna,Kosha Beef Curry,Mogoj Masala
- Price range: ৳400–1,200
- **Recommendation: KEEP**
- Possible facts: "Opened in the space on Banani 11 where Cream & Fudge used to operate"; "Menu runs from breakfast through late night (reportedly open from 7am to 2am)"
  - Wording: "Pagla Baburchi was launched by the team behind Madchef and Cheez, positioning itself as an elevated Bangla-cuisine restaurant rather than a kacchi house."
    - Type: HISTORY | Confidence: MEDIUM
    - Source: The Business Standard (2021)
    - Evidence: TBS reported the founders' connection to Madchef/Cheez and the positioning as upscale Bangla dining, distinct from kacchi restaurants.
  - Wording: "Unlike typical late-night kacchi stops, Pagla Baburchi runs a wide hours span serving an all-day Bangla menu from early morning into the early hours."
    - Type: EXPERIENCE | Confidence: MEDIUM
    - Source: The Business Standard (2021) / official site
    - Evidence: TBS 2021 article and restaurant listing describe the long operating span (roughly 7am-2am), unusual for a Bangla restaurant.
- Note: Founding pedigree (Madchef/Cheez team) and upscale Bangla positioning make it distinct from the kacchi crowd.

### 131. Pan Tao Thai Cuisine

- Category: Thai
- Cuisines: Thai
- Price range: ৳1–200
- **Recommendation: KEEP**
- Possible facts: "Sometimes described as one of Dhaka's oldest Thai restaurants (unsupported superlative - not verified)"; "Offers an extremely spicy 'nuclear hot' / ghost-pepper level"
  - Wording: "Pan Tao's kitchen is led by Thai head chef Pharatee Sakhunsong, who brings about 27 years of Thai cooking experience to Dhaka."
    - Type: EXPERIENCE | Confidence: MEDIUM
    - Source: Wanderlog / DhakaEats
    - Evidence: Restaurant profiles name the head chef and his decades-long Thai culinary background.
  - Wording: "The restaurant keeps a private dining suite that can host groups of up to roughly 40 people."
    - Type: EXPERIENCE | Confidence: MEDIUM
    - Source: Wanderlog / DhakaEats
    - Evidence: Listings describe a private hire suite for larger groups.
  - Wording: "Ingredients are flown in from Thailand to keep the menu authentic."
    - Type: OTHER | Confidence: MEDIUM
    - Source: Wanderlog / DhakaEats
    - Evidence: Profiles state Thai-sourced ingredients imported for the menu.
- Note: Credentialed Thai chef, Thai-imported ingredients and a private group suite give concrete reasons to visit.

### 132. PastaMania Bangladesh

- Category: Restaurant
- Signature dishes: Beef Bolognese Pasta,Pizza Margherita,Carbonara,Creamy Chicken,Chicken Bolognese Pasta,Baked Beef Lasagna
- Price range: ৳400–1,200
- **Recommendation: ABSTAIN**
- Possible facts: "Part of Singapore-based PastaMania chain (founded 2006) with outlets across Asia"
  - No defensible facts (ABSTAIN/REJECT).
- Note: Only generic chain information found (Singapore-based PastaMania brand, outlet at Level 2 Chef's Table, Gulshan 2); no outlet-specific decision-changing fact.

### 133. Paturi Banani

- Category: Bangladeshi
- Cuisines: Bangladeshi
- Signature dishes: Chingri Paturi,Chitol Kofta,Deshi Chicken With Potato,Palong Chingri,Bhetki Fish Paturi,Churi Shutki Bhuna
- **Recommendation: KEEP**
- Possible facts: "Linked to the Bengal Express Ltd food incubator (bdtalika, MEDIUM confidence)"
  - Wording: "Paturi Banani is built around paturi - fish wrapped in banana leaves and steamed - and works to revive traditional, near-forgotten Bengali dishes."
    - Type: CONCEPT | Confidence: MEDIUM
    - Source: bdtalika
    - Evidence: Profile describes the banana-leaf fish paturi specialty and a mission to bring back heritage Bengali recipes.
  - Wording: "The restaurant grew out of the Bengal Express food incubator, which supports new Bangladeshi restaurant concepts."
    - Type: HISTORY | Confidence: MEDIUM
    - Source: bdtalika
    - Evidence: Source ties Paturi Banani to the Bengal Express Ltd incubator started around 2013.
- Note: Heritage paturi concept with revivalist positioning differentiates it from standard Bangladeshi diners.

### 134. Pizza Da Wali

- Category: Italian
- Cuisines: Italian
- Price range: ৳800–2,000
- **Recommendation: KEEP**
- Possible facts: "Introduced cheese-wheel pasta to Bangladesh for the first time"; "Started during COVID-19 selling 'pay-later' pizza boxes before opening the restaurant"
  - Wording: "Pizza Da Wali was founded in 2019 by Chef Wali Ullah, who spent about 15 years cooking in Italy before returning to Dhaka."
    - Type: HISTORY | Confidence: HIGH
    - Source: The Business Standard (2025)
    - Evidence: TBS feature profiles founder Wali Ullah and his ~15 years of Italian kitchen experience.
  - Wording: "The pizzeria is a hidden, signboard-less apartment near the embassies with only about 22 seats across two sittings, and counts over 250 Italian regulars."
    - Type: EXPERIENCE | Confidence: HIGH
    - Source: The Business Standard (2025)
    - Evidence: TBS describes the unmarked location, tight seating and the large Italian clientele.
  - Wording: "About 95% of ingredients are imported from Italy, and the owner travels to Italy roughly every two months to stock up."
    - Type: OTHER | Confidence: HIGH
    - Source: The Business Standard (2025)
    - Evidence: TBS reports the high import ratio and the owner's regular sourcing trips to Italy.
- Note: Founder story, hidden-by-design location, Italian clientele and near-total Italian sourcing make it genuinely distinctive.

### 135. Pizza Guy

- Category: Pizza
- Cuisines: Pizza
- Price range: ৳400–1,200
- **Recommendation: KEEP**
- Possible facts: "Equipment for ovens sourced from Italy"; "Known for its wood-fired oven pizzas"
  - Wording: "Pizza Guy started in 2012 as a home-based pizzeria before becoming a proper restaurant, making it one of the earlier independent pizza ventures in Dhaka."
    - Type: HISTORY | Confidence: MEDIUM
    - Source: moumachi
    - Evidence: moumachi profile gives the 2012 home-kitchen origin.
  - Wording: "Pasta and salami are produced in-house, and herbs come from the restaurant's rooftop garden."
    - Type: CONCEPT | Confidence: MEDIUM
    - Source: moumachi
    - Evidence: Profile highlights in-house pasta/salami production and rooftop-grown herbs.
- Note: Home-grown 2012 origin plus in-house production and rooftop herbs set it apart from chain pizzerias.

### 136. Pizza Hut Banani

- Category: Pizza
- Cuisines: Pizza
- Signature dishes: Double Cheese Pan,My Meal - 2,Beef Supremo Pan,Chicken Classic Pan,BBQ Temptation Pan
- Price range: ৳400–1,600
- **Recommendation: ABSTAIN**
  - No defensible facts (ABSTAIN/REJECT).
- Note: Standard outlet of the global Pizza Hut chain (founded 1958, in Bangladesh since 2013); only generic chain information found.

### 137. Pizza Inn Banani

- Category: Pizza
- Cuisines: Pizza
- Price range: ৳800–1,600
- **Recommendation: ABSTAIN**
  - No defensible facts (ABSTAIN/REJECT).
- Note: Outlet of the US Pizza Inn franchise (founded 1958, entered Bangladesh in 2009); no outlet-specific decision-changing fact.

### 138. Pizza Inn Gulshan 1

- Category: Restaurant
- Price range: ৳400–1,600
- **Recommendation: ABSTAIN**
  - No defensible facts (ABSTAIN/REJECT).
- Note: Another outlet of the same US Pizza Inn franchise; generic chain information only.

### 139. Pizzaburg Gulshan

- Category: Pizza
- Cuisines: Pizza
- Signature dishes: Valentines Special Pizza
- Price range: ৳200–1,200
- **Recommendation: ABSTAIN**
- Possible facts: "Batch data listed 'Korean: 23' menu items - verified as the 'KOKEN' drinks line (milkshakes, mojitos, coffee), not Korean food"; "PizzaBurg is a home-grown chain (foodpanda cuisines: Italian, Pizza, Mediterranean, Western)"
  - No defensible facts (ABSTAIN/REJECT).
- Note: No decision-changing fact found. The apparent 'Korean 23' menu category in the batch data is actually the KOKEN drinks section (shakes/mojitos/coffee) on foodpanda, so no Korean identity angle exists.

### 140. Prego

- Category: Italian
- Cuisines: Italian
- **Recommendation: KEEP**
- Possible facts: "Features a live show kitchen where guests can watch dishes being prepared"; "Italian fine-dining restaurant inside The Westin Dhaka"
  - Wording: "Prego sits on the 23rd floor of The Westin Dhaka, offering skyline views that are rare for an Italian restaurant in the city."
    - Type: EXPERIENCE | Confidence: HIGH
    - Source: The Daily Star / The Westin Dhaka
    - Evidence: Multiple sources describe the 23rd-floor location with panoramic views.
  - Wording: "In 2017 Prego introduced a casual bistro menu alongside its established Italian fine-dining offering."
    - Type: HISTORY | Confidence: MEDIUM
    - Source: The Daily Star
    - Evidence: Daily Star covered the bistro menu launch at the Westin's Italian venue.
- Note: Skyline-level setting and the addition of a bistro format give a concrete, memorable angle.

### 141. Premium Sweets

- Category: Restaurant
- Signature dishes: Ilish Dopiaza (On Clay Pot),Chicken Bhuna (Signature),Shrimp Masala (On Clay Pot),Kaptai Fish Curry (On Plate),Walima Chicken Roast,Mutton Rezala,Beef Aloo Jhol
- **Recommendation: KEEP**
- Possible facts: "Started as a sweet shop and grew into a full Bengali restaurant brand"
  - Wording: "Premium Sweets began in 1999 as a traditional sweet shop and has since expanded into a dine-in Bengali restaurant."
    - Type: HISTORY | Confidence: HIGH
    - Source: premiumsweetsbd.com (official)
    - Evidence: Official site carries 'Since 1999'; history confirmed across brand materials.
  - Wording: "The Gulshan branch pairs over 100 traditional Bengali desserts with clay-pot curries such as Ilish Dopiaza on the same menu."
    - Type: CONCEPT | Confidence: HIGH
    - Source: Official menu / foodpanda listing
    - Evidence: Menu shows 101 dessert items alongside clay-pot fish and meat curries.
- Note: Sweet-shop-to-restaurant evolution plus the unusual sweets-and-clay-pot-curry pairing is distinctive.

### 142. Purnima Restaurant - Gulshan - 1

- Category: Restaurant
- Price range: ৳200–1,000
- **Recommendation: ABSTAIN**
- Possible facts: "'The Pioneers of Bengali Dining' tagline appears to be the restaurant's own marketing claim (findglocal/FB)"
  - No defensible facts (ABSTAIN/REJECT).
- Note: The only notable claim ('Pioneers of Bengali Dining') is the restaurant's own marketing tagline, not independently verifiable.

### 143. QD's

- Category: Restaurant
- **Recommendation: ABSTAIN**
  - No defensible facts (ABSTAIN/REJECT).
- Note: No discoverable information beyond a basic directory listing (DhakaEats); nothing defensible to say.

### 144. Raffinato Ristorante Italiano

- Category: Italian
- Cuisines: Italian
- **Recommendation: ABSTAIN**
- Possible facts: "TripAdvisor mentions an 'award winning' baked portobello (weak/self-reported)"
  - No defensible facts (ABSTAIN/REJECT).
- Note: Findings are generic (fine-dining Italian, wood-fired pizza, hand-cut steaks, flown-in seafood) with an unverifiable 'award winning' claim; nothing decision-changing.

### 145. Roosters Peri Peri-Bangladesh

- Category: Portuguese
- Cuisines: Portuguese
- Signature dishes: Roosters Lovers,Flaming Grilled Peri Peri Chicken,Corn On The Cob,Spicy Rice,Peri Peri Chicken Strips,Peri Peri Fries
- Price range: ৳600–1,400
- **Recommendation: KEEP**
- Possible facts: "Menu lists whole-roast and grilled peri peri chicken combos"; "Owned by the same local group that runs other food brands in Dhaka"
  - Wording: "Roosters Peri Peri-Bangladesh is a local venture founded by Khalid Hasan, who worked at Roosters Piri Piri in the UK - it is not the South African chain operating here."
    - Type: HISTORY | Confidence: MEDIUM
    - Source: findglocal / Facebook
    - Evidence: Source profiles founder Khalid Hasan and his UK experience at Roosters Piri Piri, establishing the local, name-licensed origins.
- Note: Clarifying that this is a local founder-led venture (UK-trained), not the global chain, changes how a visitor reads the brand.

### 146. Ruen Busaba

- Category: Restaurant
- Price range: ৳2,000+
- **Recommendation: KEEP**
- Possible facts: "Describes itself as serving Isan (northeast Thailand) regional cuisine - rare in Dhaka"; "Sourcing of Thai ingredients by import for authenticity"
  - Wording: "Ruen Busaba opened in July 2023 under Sadman Hossain, the restaurateur also behind Haze and Ole."
    - Type: HISTORY | Confidence: HIGH
    - Source: Dhaka Tribune
    - Evidence: Dhaka Tribune covered the opening and the ownership link to Haze and Ole.
  - Wording: "The name 'Ruen Busaba' means 'house of flowers for the lords', and the menu centres on Isan (northeast Thailand) regional cuisine."
    - Type: IDENTITY | Confidence: HIGH
    - Source: Dhaka Tribune / Bangladesh Monitor
    - Evidence: Name meaning and Isan focus reported in coverage of the launch.
  - Wording: "The kitchen is led by two Thai executive chefs, including one described as an 'Iron Master Chef' winner, with ingredients imported from Thailand."
    - Type: EXPERIENCE | Confidence: MEDIUM
    - Source: Dhaka Tribune / Bangladesh Monitor
    - Evidence: Coverage names the two Thai chefs and Thai-imported ingredients; the 'Iron Master Chef' title is per the restaurant's claim.
- Note: Newly opened, name-grounded Thai regional concept with Thai chefs and imported ingredients is a compelling story.

### 147. Rustic Eatery Banani

- Category: Restaurant
- Signature dishes: Korean Chicken Steak,Katsu & Fries,Jamaican Chicken,Calamari Pops,Cream of Mushroom,Stuffed Chicken
- Price range: ৳400–1,200
- **Recommendation: ABSTAIN**
- Possible facts: "Positions itself around 'farm-to-table' sourcing (marketing claim, no independent verification)"
  - No defensible facts (ABSTAIN/REJECT).
- Note: Only generic 'farm-to-table' marketing and multi-branch chain information found; nothing verifiable or decision-changing.

### 148. RUYI BARBECUE

- Category: Restaurant
- Price range: ৳2,000+
- **Recommendation: KEEP**
- Possible facts: "Located on Level 6, Plot-80, Gulshan Avenue (Dhaka Tribune article could not be fetched - 403)"
  - Wording: "RUYI BARBECUE serves authentic Chinese-style tabletop barbecue, where diners grill at their own table, alongside hot pot."
    - Type: CONCEPT | Confidence: MEDIUM
    - Source: Dhaka Tribune / official Facebook
    - Evidence: Facebook and Dhaka Tribune describe the self-grill tabletop barbecue and hot pot format.
- Note: The DIY Chinese tabletop barbecue + hot pot format is an unusual interactive dining experience in Gulshan.

### 149. Sajna Restaurant

- Category: Indian
- Cuisines: Indian
- Price range: ৳800–2,000
- **Recommendation: KEEP**
- Possible facts: "Offers a lunch buffet of Indian dishes"; "One of the older Indian restaurants in the Gulshan/Banani area"
  - Wording: "Sajna has been serving Indian cuisine in Dhaka since 1992 - more than three decades."
    - Type: HISTORY | Confidence: HIGH
    - Source: Official Facebook ('Since 1992')
    - Evidence: Official page states 'Since 1992'; corroborated by multiple listings referencing 22-34 years of operation.
- Note: Three-decade continuity gives it rare provenance among Indian restaurants in the area.

### 150. Salam's Kitchen

- Category: Bangladeshi
- Cuisines: Bangladeshi
- Signature dishes: Achari Khichuri,Shahi Mutton Kacchi Biriyani With Chutney,Zafrani Polao With Roast,Cream Yogurt Borhani Glass,Wedding Chicken Roast,Jali Kebab,Mutton White Bhuna,Shahi Saffron Firni,Shahi Zorda,Wedding Beef Rezala
- Price range: ৳400–600
- **Recommendation: KEEP**
- Possible facts: "Operates three branches (Banani, Panthapath, Uttara)"; "Catering arm handles large events and wedding menus"
  - Wording: "Salam's Kitchen is the restaurant arm of M/S Salam Catering Service, run by Hazi Cook Md Salam Mia, so its menu carries wedding-style dishes like Wedding Chicken Roast and Wedding Beef Rezala as everyday items."
    - Type: IDENTITY | Confidence: MEDIUM
    - Source: Official Facebook / moumachi
    - Evidence: Sources trace the brand to M/S Salam Catering Service and show wedding-menu items on the regular menu.
- Note: The catering-house identity explains its distinctive wedding-menu format - a useful expectation-setting fact.

### 151. Santoor Fusion Dining

- Category: Fusion restauran
- Cuisines: Fusion
- Signature dishes: 122/CR25 - Palak Paneer,70/66 - Chicken Butter Masala,125/114 - Dal Butter Fry,115/106 - Motor Paneer,48/CR18 - Charcoal Chicken Reshmi Kebab
- **Recommendation: KEEP**
- Possible facts: "Now operates only from its Banani outlet after closing earlier branches"
  - Wording: "Santoor has been serving Indian food since 1993, and its original space was designed by architect Enamul Karim Nirjhar."
    - Type: HISTORY | Confidence: HIGH
    - Source: Dhaka Tribune / official Facebook
    - Evidence: Dhaka Tribune and the brand's Facebook describe the 1993 opening and Nirjhar's design of the first outlet.
- Note: Since-1993 heritage plus an architect-designed original space gives a solid legacy angle.

### 152. Seasonal Tastes

- Category: Restaurant
- **Recommendation: KEEP**
- Possible facts: "An award-winning all-day dining venue (self-reported award, rephrase neutrally if used)"; "Open from 6:30am for breakfast through late night"
  - Wording: "Seasonal Tastes, on Level 2 of The Westin Dhaka, is an all-day buffet venue with live cooking stations that include an Italian Molteni range - a rarity in Dhaka."
    - Type: EXPERIENCE | Confidence: MEDIUM
    - Source: The Westin Dhaka (official)
    - Evidence: Official site describes the live stations and Molteni equipment; 'country's only Molteni station' claim rephrased neutrally.
- Note: Live-station buffet with a specialist Molteni range gives a concrete experience hook beyond 'hotel buffet'.

### 153. Secret Recipe Gulshan2 Flagship

- Category: Restaurant
- **Recommendation: ABSTAIN**
  - No defensible facts (ABSTAIN/REJECT).
- Note: Malaysian Secret Recipe chain outlet (flagship store in the CFC building); only generic franchise information found.

### 154. Shaw's Steakhouse

- Category: Steak
- Cuisines: Steakhouse
- Signature dishes: Shaw's Signature Ribeye Steak,Texas T-Bone Steak,Creamy Mushroom Chicken Marsala,Signature Rib-Eye Alfredo Pasta,Alfredo Grilled Chicken Pasta,Loaded Chili Cheese Steak Fries,Mushroom Chicken Piccata,Peri Peri Grilled Chicken,Signature Pepper Herb Grilled Chicken,Lemon Pepper Honey Grilled Chicken,Grilled Fish Fillet with Lemon Butter Sauce,Lemon Pepper Grilled King Prawn,Thermidor Style Grilled King Prawn
- Price range: ৳2,000+
- **Recommendation: ABSTAIN**
  - No defensible facts (ABSTAIN/REJECT).
- Note: No unique or decision-changing information found beyond the standard steakhouse menu and description.

### 155. Shiraj Chuigosto- Banani

- Category: Bangladeshi
- Cuisines: Bangladeshi
- Price range: ৳200–400
- **Recommendation: KEEP**
- Possible facts: "Small local chain with multiple Dhaka outlets"
  - Wording: "Shiraj Chuigosto is built around chui jhal gosht, a fiery chilli beef curry the brand traces to the Khulna region - a specialty rarely found in Dhaka."
    - Type: IDENTITY | Confidence: MEDIUM
    - Source: shirajchuigosto.com (official)
    - Evidence: Official site presents the chui jhal (chilli) gosht specialty and its Khulna regional heritage.
- Note: A Khulna-origin chui jhal curry specialty gives the branch a clear regional identity worth knowing.

### 156. Sky Pool Restaurant

- Category: Continental resta
- **Recommendation: KEEP**
  - Wording: "Rooftop restaurant on the 15th floor of Six Seasons Hotel, built around an infinity pool; the buffet lunch includes free pool access."
    - Type: CONCEPT | Confidence: HIGH
    - Source: https://sixseasonshotel.com/restaurant/sky-pool-international-buffet/ (Six Seasons Hotel, official)
    - Evidence: Official dining page describes the sky pool restaurant on the 15th floor with an infinity pool and pool access included with the buffet.
  - Wording: "Hosts live music performances Thursday through Saturday evenings."
    - Type: EXPERIENCE | Confidence: HIGH
    - Source: https://sixseasonshotel.com/restaurant/sky-pool-international-buffet/ (Six Seasons Hotel, official)
    - Evidence: Official page lists live music on Thursday, Friday and Saturday evenings.
  - Wording: "Rotates a country-themed buffet menu each month."
    - Type: CONCEPT | Confidence: MEDIUM
    - Source: https://sixseasonshotel.com/restaurant/sky-pool-international-buffet/ (Six Seasons Hotel, official)
    - Evidence: Official page promotes a rotating monthly country-themed buffet (e.g., Thai, Japanese, Indian).
- Note: Unique rooftop pool-dining concept plus reliable operational details sourced from the hotel's official site.

### 157. Soi 71

- Category: Thai
- Cuisines: Thai
- Price range: ৳2,000+
- **Recommendation: KEEP**
  - Wording: "Gulshan Thai restaurant in operation since 2010."
    - Type: HISTORY | Confidence: MEDIUM
    - Source: https://wanderlog.com (ratekom/wanderlog listing, 2024)
    - Evidence: Listing self-describes as 'Authentic Thai Restaurant since 2010.'
  - Wording: "Runs a made-to-order kitchen with Thai chefs from Thailand; the menu is fully customizable rather than pre-made."
    - Type: CONCEPT | Confidence: MEDIUM
    - Source: https://wanderlog.com (ratekom/wanderlog listing, 2024)
    - Evidence: Listing states 'nothing pre-made, everything customizable' and Thai chefs from Thailand.
  - Wording: "Provides an on-site play area for children (Soi Kids)."
    - Type: EXPERIENCE | Confidence: MEDIUM
    - Source: https://wanderlog.com (ratekom/wanderlog listing, 2024)
    - Evidence: Listing mentions a kids' play area named Soi Kids.
- Note: Distinct made-to-order Thai concept, longevity claim and family-friendly play area; each is defensible from the listing.

### 158. Spaghetti Jazz, Dhaka

- Category: Restaurant
- Signature dishes: Spaghetti Bolognese,Pepper Steak,Mediterranea,Gamberoni Alla Griglia
- **Recommendation: KEEP**
  - Wording: "Opened in 1994, making it one of Dhaka's oldest Italian restaurants; it was among the first in the city to serve authentic Italian thin-crust pizza."
    - Type: HISTORY | Confidence: MEDIUM
    - Source: https://mybangla24.com (2023)
    - Evidence: 2023 article dates the restaurant to 1994 and credits it with introducing authentic Italian thin-crust pizza to Dhaka.
  - Wording: "Dining room is themed around jazz, with jazz-influenced decor and background music."
    - Type: CONCEPT | Confidence: MEDIUM
    - Source: https://www.tripadvisor.com/Restaurant_Review-g293936-d13197625-Reviews-Spaghetti_Jazz-Dhaka_City_Dhaka_Division.html (Tripadvisor listing)
    - Evidence: Reviews describe the jazz-themed atmosphere and music.
- Note: Longevity (1994) and jazz theme are concrete, decision-relevant facts; 'oldest' claim is qualified by 'one of' and sourced.

### 159. Star Kabab & Restaurant

- Category: Family-friendly
- Signature dishes: Khashir Kacchi Biryani With Kebab,Khashir Kacchi Biryani (Plain)
- Price range: ৳200–400
- **Recommendation: MODIFY**
- Possible facts: "[object Object]"
  - Wording: "Brand traces its origins to 1968, giving it several decades of continuous operation in Dhaka."
    - Type: HISTORY | Confidence: MEDIUM
    - Source: https://bdfoodblog.com/restaurants/star-kabab/ (2022)
    - Evidence: Food blog traces the brand's origins to 1968.
- Note: 1968 origin is a useful longevity fact but rests on a single blog source; keep the date, drop the 'oldest' superlative.

### 160. Steakout

- Category: Steak
- Cuisines: Steakhouse
- Signature dishes: Braised Moroccan Chicken,Chicken Domingo,Mexican Chipotle Chicken,Pepper Flank,T-Bone,Mushroom Flank
- Price range: ৳2,000+
- **Recommendation: KEEP**
  - Wording: "Guests select their cut of meat before it is cooked; the concept is marketed as 'you have the right to choose your own meat.'"
    - Type: EXPERIENCE | Confidence: MEDIUM
    - Source: https://www.tripadvisor.com/Restaurant_Review-g293936-d13197625-Reviews-Steakout-Dhaka_City_Dhaka_Division.html (official Tripadvisor listing)
    - Evidence: Official listing and reviews describe choosing your own cut at the counter before cooking.
  - Wording: "Meats are aged, rubbed and smoked on site rather than delivered pre-prepared."
    - Type: CONCEPT | Confidence: MEDIUM
    - Source: https://www.tripadvisor.com/Restaurant_Review-g293936-d13197625-Reviews-Steakout-Dhaka_City_Dhaka_Division.html (official Tripadvisor listing)
    - Evidence: Listing and reviews mention aged, rubbed and smoked meats prepared in-house.
- Note: Pick-your-own-cut and on-site meat preparation are distinctive experiential facts.

### 161. Sukumvit Thai Restaurant

- Category: Thai
- Cuisines: Thai
- Price range: ৳2,000+
- **Recommendation: ABSTAIN**
  - No defensible facts (ABSTAIN/REJECT).
- Note: Searches returned only recent opening notices and generic Thai-food reviews; no defensible unique fact found.

### 162. Sultan's Dine Gulshan Branch

- Category: Bangladeshi
- Cuisines: Bangladeshi
- Price range: ৳200–600
- **Recommendation: MODIFY**
- Possible facts: "[object Object]"
  - Wording: "Founded in 2017 by Foysal Ahmed, who pivoted the business from fast food to kacchi biryani."
    - Type: HISTORY | Confidence: MEDIUM
    - Source: https://www.sagejournals.com / https://sultansdinebd.com/about-us/ (SAGE journal, 2025; official about page)
    - Evidence: Profile documents a 2017 founding and the pivot from fast food to kacchi biryani.
- Note: Keep the founding/pivot history; the 'popularized basmati kacchi' claim is single-source and dropped from confirmed facts.

### 163. Sura Korean Restaurant

- Category: Korean
- Cuisines: Korean
- Price range: ৳2,000+
- **Recommendation: KEEP**
  - Wording: "Has been serving Korean cuisine continuously since 1989, making it one of Dhaka's longest-established Korean restaurants."
    - Type: HISTORY | Confidence: HIGH
    - Source: https://www.facebook.com/surakorean (official Facebook page)
    - Evidence: Official page states the restaurant has served Korean cuisine since 1989.
- Note: Since-1989 claim from the restaurant's official channel; strong longevity hook.

### 164. Sushi Go

- Category: Sushi
- Cuisines: Japanese
- **Recommendation: KEEP**
  - Wording: "Opened on 21 October 2022."
    - Type: HISTORY | Confidence: HIGH
    - Source: https://www.tbsnews.net/features/food/sushi-go-pick-your-favourite-sushi-running-belt-544134 (The Business Standard, 2022-12-03)
    - Evidence: Article reports the restaurant opened 21 October 2022.
  - Wording: "Serves sushi via a conveyor belt; the bill is tallied from color-coded plates."
    - Type: EXPERIENCE | Confidence: HIGH
    - Source: https://www.tbsnews.net/features/food/sushi-go-pick-your-favourite-sushi-running-belt-544134 (The Business Standard, 2022-12-03)
    - Evidence: Article describes conveyor-belt sushi and color-coded plate pricing.
- Note: Novel kaiten-sushi concept with precise opening date, both well sourced.

### 165. Sushi Samurai

- Category: Sushi
- Cuisines: Japanese
- **Recommendation: ABSTAIN**
  - No defensible facts (ABSTAIN/REJECT).
- Note: Searches returned only reviews, address and hours; no defensible unique fact beyond generic Japanese/sushi positioning.

### 166. Swade Bangladesh - স্বাদে বাংলাদেশ

- Category: Restaurant
- Signature dishes: Vegetable Letka Khichuri,Plain Rice,Mixed Vegetable Curry,Loitta Shutki Bhorta,Bhuna khichuri,Beef Alu Jhol Curry
- Price range: ৳200–1,000
- **Recommendation: KEEP**
  - Wording: "Operates as both a restaurant and a catering business covering weddings, corporate events and yacht or boat parties."
    - Type: CONCEPT | Confidence: MEDIUM
    - Source: https://swadebangladesh.com (official site)
    - Evidence: Official site lists wedding, corporate and yacht/boat party catering alongside the restaurant.
  - Wording: "Serves handi khichuri with the clay handi sealed by an edible naan dough lid."
    - Type: OTHER | Confidence: MEDIUM
    - Source: https://food.pathao.com (Pathao Food menu)
    - Evidence: Menu describes handi khichuri sealed with an edible naan dough cover.
- Note: Dual restaurant-plus-catering model and the sealed-handi khichuri presentation are distinctive and useful.

### 167. Takeout Banani

- Category: Restaurant
- Signature dishes: Fries,Smash Burger,Beef Burger,Chick Got Fried,MADOX,Twister,Chicken Cheese Delight
- Price range: ৳400–600
- **Recommendation: KEEP**
  - Wording: "The brand began as a street-side cart at Shimanto Square in June 2014 before expanding to permanent outlets."
    - Type: HISTORY | Confidence: MEDIUM
    - Source: https://wanderlog.com (wanderlog/ratekom listing, 2024)
    - Evidence: Listing traces the brand's start to a cart at Shimanto Square in June 2014.
- Note: Humble-cart origin story is a compelling, defensible history fact.

### 168. Takeout Gulshan

- Category: Restaurant
- Signature dishes: Chick Got Fried,MADOX,Twister,Beef Cheese Delight,Chicken Cheese Delight,Smash Burger,Double The Smash,Beef & Bacon,Chicken Supreme,Chicken Smash,NashVille Chicken Burger
- Price range: ৳400–600
- **Recommendation: ABSTAIN**
  - No defensible facts (ABSTAIN/REJECT).
- Note: Same brand as Takeout Banani (idx 167); searches found no Gulshan-specific fact beyond a standard address. Brand history is captured under idx 167.

### 169. Takumi

- Category: Japanese
- Cuisines: Japanese
- Signature dishes: Takoyaki,Gyoza (Dumplings),Wakame Udon,Special Iekei Ramen,Shoga Yaki Bento,Karaage
- **Recommendation: KEEP**
  - Wording: "Japanese-owned restaurant run with a Japanese head chef, emphasizing a from-Japan approach to the menu."
    - Type: CONCEPT | Confidence: HIGH
    - Source: https://www.takumi.com.bd (official site / official blog post)
    - Evidence: Official page describes Japanese ownership and a Japanese head chef.
  - Wording: "Contains a mini library for diners and closes on the first Sunday of each month for a full cleaning."
    - Type: OTHER | Confidence: MEDIUM
    - Source: https://www.takumi.com.bd (official site / official blog post)
    - Evidence: Official posts mention the in-house mini library and the monthly cleaning closure.
- Note: Japanese ownership/chef plus the library and monthly closure are concrete, sourced operational facts.

### 170. Tarka

- Category: Restaurant
- **Recommendation: KEEP**
  - Wording: "Opened in 2013; in 2024 it relocated to a larger Banani venue with private dining rooms."
    - Type: HISTORY | Confidence: HIGH
    - Source: https://www.dhakatribune.com (Dhaka Tribune, 2024)
    - Evidence: Dhaka Tribune coverage reports the 2024 move to a larger space with private rooms.
  - Wording: "Interior of the new venue draws on Mughal-inspired decor."
    - Type: EXPERIENCE | Confidence: MEDIUM
    - Source: https://www.dhakatribune.com (Dhaka Tribune, 2024)
    - Evidence: Coverage describes the Mughal-themed interior of the relocated outlet.
- Note: Fresh 2024 relocation with private rooms is timely, decision-relevant information from a major outlet.

### 171. Tehari Baba

- Category: Restaurant
- Price range: ৳200–400
- **Recommendation: ABSTAIN**
  - No defensible facts (ABSTAIN/REJECT).
- Note: No unique fact found; hours conflict across sources (Tripadvisor shows open until 2 AM, Facebook shows 11 AM-11 PM), so even basic operational details are unreliable.

### 172. Teppanyaki Dhaka

- Category: Japanese
- Cuisines: Japanese
- Price range: ৳2,000+
- **Recommendation: KEEP**
  - Wording: "Grand opening held on 1 May 2024."
    - Type: HISTORY | Confidence: HIGH
    - Source: https://www.dhakatribune.com (Dhaka Tribune, 2024)
    - Evidence: Coverage reports the grand opening on 1 May 2024.
  - Wording: "Teppanyaki is cooked live at the table, including knife-flipping performance by the chef."
    - Type: EXPERIENCE | Confidence: HIGH
    - Source: https://www.dhakatribune.com (Dhaka Tribune, 2024)
    - Evidence: Coverage describes live tabletop cooking with chef knife performances; wagyu items also noted.
- Note: Precise opening date and a genuinely novel live-cooking format for Dhaka, well sourced.

### 173. Terra Bistro (Banani)

- Category: Restaurant
- Price range: ৳2,000+
- **Recommendation: KEEP**
  - Wording: "Open 24 hours."
    - Type: OTHER | Confidence: HIGH
    - Source: https://www.facebook.com/terrabistro (official Facebook page); https://www.bizsouthasia.com (directory listing)
    - Evidence: Official page and directory both list 24-hour operation.
  - Wording: "Operated by Platinum Hotels."
    - Type: OTHER | Confidence: MEDIUM
    - Source: https://www.bizsouthasia.com (directory listing); Platinum Hotels portfolio
    - Evidence: Listed as a Platinum Hotels outlet.
- Note: Rare 24-hour service and hotel-group ownership are practical, decision-relevant facts.

### 174. Texas Flame

- Category: Steak
- Cuisines: Steakhouse
- Price range: ৳2,000+
- **Recommendation: KEEP**
  - Wording: "Featured in a Dhaka Tribune steakhouse roundup in July 2024, which noted prices lower than most steakhouses in Banani."
    - Type: OTHER | Confidence: HIGH
    - Source: https://www.dhakatribune.com/feature/food/350938 (Dhaka Tribune, 2024-07-03)
    - Evidence: Roundup notes the venue undercuts most Banani steakhouses on price.
- Note: Relative-affordability signal from a major outlet is a useful practical fact; reworded without superlatives.

### 175. Thai Emerald

- Category: Restaurant
- Signature dishes: Fried Spring Chicken,Chicken with Cashewnut,Chicken Green Curry,Tom Yum Seafood Soup
- **Recommendation: MODIFY**
  - Wording: "The Gulshan-1 branch opened in 2016 as the restaurant's second outlet."
    - Type: HISTORY | Confidence: MEDIUM
    - Source: https://www.thedailystar.net (The Daily Star, 2020)
    - Evidence: The Daily Star dates the Gulshan-1 branch to 2016 and identifies it as the second outlet.
  - Wording: "Interior was designed by architect Rafia Mariam Ahmed and features a koi pond."
    - Type: EXPERIENCE | Confidence: MEDIUM
    - Source: https://www.dhakatribune.com (Dhaka Tribune, 2022)
    - Evidence: Coverage names the interior architect and the koi pond feature.
- Note: Founding dates conflict across sources (2012 Uttara / 2015 Dhanmondi / 2016 Gulshan); use 2016 only for the Gulshan-1 branch and flag the discrepancy.

### 176. The Atrium Restaurant

- Category: Buffet
- Price range: ৳400–1,400
- **Recommendation: MODIFY**
  - Wording: "Established in 2005 in Baridhara."
    - Type: HISTORY | Confidence: MEDIUM
    - Source: https://moumachi.com (food blog listing); https://atrium-bd.com (official site)
    - Evidence: Listing and official site give an establishment year of 2005.
  - Wording: "Serves Thai and Indian cuisine in a garden setting."
    - Type: CONCEPT | Confidence: MEDIUM
    - Source: https://atrium-bd.com (official site)
    - Evidence: Official site describes Thai and Indian dishes in a garden setting.
- Note: Do not conflate with the separate Banani venue also called 'Atrium' (waterfall/indoor-bridge interior); this entry is the Baridhara restaurant at 50 & 52 Pragati Avenue.

### 177. The Beast

- Category: Steak
- Cuisines: Steakhouse
- Price range: ৳2,000+
- **Recommendation: KEEP**
  - Wording: "Set on the 26th floor of Four Points by Sheraton Dhaka with floor-to-ceiling windows and a balcony overlooking the city."
    - Type: LOCATION | Confidence: HIGH
    - Source: https://www.marriott.com / official hotel dining listing (Four Points by Sheraton Dhaka)
    - Evidence: Official listing describes the 26th-floor setting, floor-to-ceiling windows and city-view balcony.
  - Wording: "Includes an 8-person private dining room."
    - Type: EXPERIENCE | Confidence: MEDIUM
    - Source: https://www.marriott.com / official hotel dining listing (Four Points by Sheraton Dhaka)
    - Evidence: Listing mentions a private dining room for eight guests.
- Note: High-floor city-view setting and private dining are concrete, verifiable experiential facts.

### 178. The Cafe Rio (Gulshan - 1)

- Category: Buffet
- Price range: ৳1,000–1,400
- **Recommendation: MODIFY**
  - Wording: "Operates as a buffet-only restaurant, serving buffets for both lunch and dinner rather than an a la carte menu."
    - Type: CONCEPT | Confidence: MEDIUM
    - Source: https://www.bangladeshmonitor.com.bd/en/cafe-rio-dhakas-popular-buffet-only-restaurant (Bangladesh Monitor, 2026-05-02)
    - Evidence: Profile states Cafe Rio serves only buffets for both lunch and dinner, one of the few buffet-only restaurants in Dhaka.
- Note: Buffet-only model is a distinctive concept fact; founding year (LinkedIn shows 2015) is self-reported and not yet corroborated.

### 179. The Garden Kitchen at Sheraton Dhaka

- Category: Restaurant
- Price range: ৳2,000+
- **Recommendation: KEEP**
  - Wording: "Multi-cuisine buffet restaurant at Sheraton Dhaka with an al fresco dining area."
    - Type: CONCEPT | Confidence: HIGH
    - Source: https://www.marriott.com/en-us/hotels/dacsi-sheraton-dhaka/overview/ (Marriott official dining page)
    - Evidence: Official hotel page describes the multi-cuisine buffet restaurant and its al fresco seating.
- Note: Hotel-affiliated buffet with outdoor seating, sourced from the hotel's official page.

### 180. The Grove Bistro

- Category: Restaurant
- Signature dishes: Spaghetti Bolognese,Fried Calamari,Greek Chicken Gyro
- **Recommendation: KEEP**
  - Wording: "Opened in 2019 as part of the Emerald Restaurants group, serving European cuisine."
    - Type: HISTORY | Confidence: HIGH
    - Source: https://www.thedailystar.net (The Daily Star, 2020)
    - Evidence: The Daily Star profiles the 2019 opening under the Emerald Restaurants umbrella.
  - Wording: "Located on Level 12 of Hamid Tower in Gulshan in a rooftop-style setting."
    - Type: LOCATION | Confidence: MEDIUM
    - Source: https://www.kagoz.com (Kagoz listing)
    - Evidence: Listing places the bistro on Level 12 of Hamid Tower in a rooftop-style space.
- Note: Concrete opening history, group affiliation and an unusual high-floor location.

### 181. The New Gulshan Plaza Restaurant

- Category: Restaurant
- Signature dishes: Chicken Biryani With Jali Kebab,Beef Khichuri,Chicken Shawarma Roll
- Price range: ৳200–400
- **Recommendation: MODIFY**
- Possible facts: "[object Object]"
  - Wording: "In business since 1983."
    - Type: HISTORY | Confidence: MEDIUM
    - Source: https://findglocal.com (2025); https://www.shaplakanon.com (2024)
    - Evidence: Listings state the restaurant has been in business since 1983.
- Note: Keep the 1983 founding fact; the 'oldest in Gulshan' superlative is flagged in possible_facts pending corroboration because the two sources may share origin.

### 182. The Red Chamber

- Category: Chinese
- Cuisines: Chinese
- **Recommendation: KEEP**
- Possible facts: "Located on the 13th floor of Hamid Tower in Gulshan 2 (high-floor Chinese dining with views)"; "Menu heavily weighted toward dim sum (18 items) and seafood (17 items)"; "Chinese restaurant featuring Peking duck and dim sum"
  - Wording: "Sits on the 13th floor of Hamid Tower in Gulshan 2, giving a high-rise view while dining on Chinese food"
    - Type: EXPERIENCE | Confidence: MEDIUM
    - Source: https://www.novacircle.com/spots/asia/bangladesh/dhaka-division/dhaka-district/dhaka/the-red-chamber-67e45e (Novacircle, 2026)
    - Evidence: Listed at 13th floor, Hamid Tower, Gulshan 2
  - Wording: "Menu is dominated by dim sum and seafood, which together make up over half the 66 menu items"
    - Type: IDENTITY | Confidence: MEDIUM
    - Source: https://www.tripadvisor.com/Restaurant_Review-g293936-d19756638-Reviews-The_Red_Chamber-Dhaka_City_Dhaka_Division.html (TripAdvisor, 2026); batch menu data (Dim Sum 18, Seafood 17)
    - Evidence: 18 of 66 menu items are dim sum; 17 are seafood
- Note: High-floor Chinese spot with a dim sum/seafood-heavy menu; defensible experience and menu facts found.

### 183. The Secret Garden Banani

- Category: Restaurant
- Price range: ৳800–1,000
- **Recommendation: ABSTAIN**
  - No defensible facts (ABSTAIN/REJECT).
- Note: Two search attempts returned only generic listings and a YouTube 'hidden gem' mention; no decision-changing fact could be verified.

### 184. The White Canary Café

- Category: Cafe
- Signature dishes: Funghi Sausage Omelette,The Harley Quinn,Classic French Toast Strawberry,Tandoori Chicken Sandwich,Alfredo Pasta
- Price range: ৳400–1,400
- **Recommendation: KEEP**
- Possible facts: "Signature coffee drink named after the cafe itself ('The White Canary')"; "Brunch-style menu available all day"
  - Wording: "Has a signature coffee named after the cafe itself, 'The White Canary', anchoring an all-day brunch menu"
    - Type: IDENTITY | Confidence: MEDIUM
    - Source: https://wanderlog.com/place/details/2847339/the-white-canary-caf%C3%A9 (Wanderlog, 2026)
    - Evidence: Review notes the signature coffee named after the cafe; breakfast/brunch menu served all day
  - Wording: "Operates as a brunch cafe in Banani with a menu of breakfast and brunch items served through the day"
    - Type: CONCEPT | Confidence: MEDIUM
    - Source: https://wanderlog.com/place/details/2847339/the-white-canary-caf%C3%A9 (Wanderlog, 2026)
    - Evidence: All-day brunch positioning; breakfast-focused menu categories (Breakfast 8, Popular 5)
- Note: Distinctive signature drink and all-day brunch identity found.

### 185. Time Out

- Category: Restaurant
- **Recommendation: KEEP**
- Possible facts: "Founded 5 November 2000 by two sisters, Sangita Ahmed and Samina Salman"; "Concept: clean entertainment + quality food at low prices for students, families and executives"
  - Wording: "Opened on 5 November 2000 by two sisters, Sangita Ahmed and Samina Salman, making it one of Banani's long-running family restaurants"
    - Type: HISTORY | Confidence: HIGH
    - Source: https://foodoclock.com.bd/restaurants/time-out-banani/ (Foodoclock, 2026); https://www.findglocal.com/BD/Dhaka/255612597918306/Time-Out (Findglocal, 2026)
    - Evidence: Both sources state founding date 5 November 2000 and founders Sangita Ahmed and Samina Salman
  - Wording: "Founded on the concept of clean entertainment with quality food at low prices, aimed at students, families and executives"
    - Type: CONCEPT | Confidence: MEDIUM
    - Source: https://foodoclock.com.bd/restaurants/time-out-banani/ (Foodoclock, 2026)
    - Evidence: Describes 'clean entertainment and good quality food at low price' targeting students/families/executives
- Note: Strong founding-story fact (sisters, 2000) with a clear concept.

### 186. Travel East Banani

- Category: Asian
- Cuisines: Asian
- **Recommendation: KEEP**
- Possible facts: "Started by four friends: Nafeez, Mishu, Kashfica and Linkon"; "Dining room has a grand piano; live music nights accompany the food"
  - Wording: "Pan-Asian restaurant started by four friends - Nafeez, Mishu, Kashfica and Linkon - in Banani"
    - Type: HISTORY | Confidence: HIGH
    - Source: https://www.thedailystar.net/life-living/food-recipes/news/indulge-authentic-pan-asian-cuisine-travel-east-3267031 (The Daily Star, 2023)
    - Evidence: 'the brainchild of four friends - Nafeez, Mishu, Kashfica, and Linkon'
  - Wording: "Its dining room centres on a grand piano and it hosts live music nights along with the food"
    - Type: EXPERIENCE | Confidence: MEDIUM
    - Source: https://www.dhakatribune.com/business/279750/travel-east-serving-asian-fusion-with-a-twist (Dhaka Tribune, 2022); https://www.thedailystar.net/life-living/food-recipes/news/indulge-authentic-pan-asian-cuisine-travel-east-3267031 (The Daily Star, 2023)
    - Evidence: Dhaka Tribune: 'has a grand piano and... music night along with your food'; Daily Star describes the piano as a photo-worthy decor centrepiece
- Note: Verified founder story and distinctive grand-piano/live-music ambience from two major dailies.

### 187. Tree House

- Category: Restaurant
- Signature dishes: Coconut Juice,Tropical Juice
- Price range: ৳600–1,600
- **Recommendation: KEEP**
- Possible facts: "Tree-house-themed steak and seafood restaurant with indoor floor + rooftop smoking area"; "Open until 1am; until sehri (~4am) during Ramadan"
  - Wording: "Tree-house-themed steak and seafood restaurant split across an air-conditioned indoor floor and a breezy rooftop smoking area"
    - Type: CONCEPT | Confidence: MEDIUM
    - Source: https://www.dhakacity.com.bd/best-restaurants-banani-dhaka (Dhaka City, 2026); https://www.moumachi.com.bd/biz/tree-house (Moumachi, 2026)
    - Evidence: 'tree-house-themed approach to steak and seafood, split across an air-conditioned indoor floor and a breezy rooftop smoking area'
  - Wording: "Stays open until 1am most nights, and until sehri (around 4am) during Ramadan, making it a late-night option in Banani"
    - Type: OTHER | Confidence: MEDIUM
    - Source: https://www.dhakacity.com.bd/best-restaurants-banani-dhaka (Dhaka City, 2026)
    - Evidence: 'open late - until 1:00 AM most nights, and until Sehri (roughly 4:00 AM) during Ramadan'
- Note: Distinct tree-house concept and unusually late hours confirmed by a local guide.

### 188. TRIBE Rooftop Lounge

- Category: Restaurant
- Price range: ৳2,000+
- **Recommendation: KEEP**
- Possible facts: "Rooftop lounge on top of Platinum Grand hotel in Gulshan with views over Gulshan Lake and Banani skyline"; "Drinks and entrees format; roughly Tk 2,000-2,500 per person"
  - Wording: "Rooftop lounge at the top of the Platinum Grand hotel in Gulshan, overlooking Gulshan Lake and the Banani skyline"
    - Type: EXPERIENCE | Confidence: MEDIUM
    - Source: https://unb.com.bd/news/tag/92587 (UNB, 2025)
    - Evidence: Described as rooftop of Platinum Grand Hotel Gulshan with views of Gulshan Lake and Banani skyline
  - Wording: "Works as a drinks-and-entrees lounge with a per-person spend of roughly Tk 2,000-2,500"
    - Type: OTHER | Confidence: MEDIUM
    - Source: https://unb.com.bd/news/tag/92587 (UNB, 2025)
    - Evidence: Drinks and entree menus; per person estimate Tk 2000-2500
- Note: Hotel-rooftop setting over Gulshan Lake is a concrete experience fact.

### 189. Tu do Restaurant

- Category: Restaurant
- Signature dishes: Wonton Nachos,FISH & CHIPS WITH TARTAR SAUCE,Kimchi Alfredo
- **Recommendation: KEEP**
- Possible facts: "Name means 'freedom' (Tu Do)"; "Hidden entrance behind a heavy iron gate; duplex styled like a home with rattan furniture and bamboo lanterns"; "Two levels, each with its own menu, priced roughly Tk 350-1,600"
  - Wording: "The name means 'freedom' (Tu Do) and the restaurant hides behind a heavy iron gate, styled as a duplex home with rattan furniture and bamboo lanterns"
    - Type: CONCEPT | Confidence: HIGH
    - Source: https://www.tbsnews.net/features/food/tu-do-flavours-asia-right-heart-banani-1124961 (The Business Standard, 2025)
    - Evidence: TBS: 'Tu Do means freedom'; hidden behind a heavy iron gate; duplex home feel, rattan furniture, bamboo lanterns
  - Wording: "Runs two levels, each with its own menu, at a relatively affordable Tk 350-1,600"
    - Type: OTHER | Confidence: HIGH
    - Source: https://www.tbsnews.net/features/food/tu-do-flavours-asia-right-heart-banani-1124961 (The Business Standard, 2025)
    - Evidence: Two levels each with own menu; dishes priced Tk350-1600
- Note: Rich, sourceable concept facts: name meaning, hidden entrance, duplex layout.

### 190. Turkey Bliss

- Category: Turkish
- Cuisines: Turkish
- **Recommendation: ABSTAIN**
  - No defensible facts (ABSTAIN/REJECT).
- Note: Only generic listings (DhakaEats, RestaurantGuru, foodpanda) surfaced; no decision-changing fact could be verified.

### 191. Turkish Bazaar & Restaurant

- Category: Turkish
- Cuisines: Turkish
- **Recommendation: KEEP**
- Possible facts: "Converted apartment with traditional Turkish decor and music, near Banani Super Market"; "Guests welcomed with complimentary Turkish tea"
  - Wording: "Turkish restaurant styled as a converted apartment with traditional Turkish decor and music, near Banani Super Market"
    - Type: CONCEPT | Confidence: MEDIUM
    - Source: https://www.top-rated.online/cities/Dhaka/place/p/4791132/Turkish+Bazaar+&+Restaurant (Top Rated Online, 2026); https://www.tripadvisor.in/Restaurant_Review-g293936-d7895427-Reviews-Turkish_Bazaar-Dhaka_City_Dhaka_Division.html (TripAdvisor, 2026)
    - Evidence: Described as apartment-style venue with traditional Turkish decor near Banani Super Market
  - Wording: "Welcomes guests with complimentary Turkish tea as part of the dining experience"
    - Type: EXPERIENCE | Confidence: LOW
    - Source: https://www.tripadvisor.in/Restaurant_Review-g293936-d7895427-Reviews-Turkish_Bazaar-Dhaka_City_Dhaka_Division.html (TripAdvisor, 2026)
    - Evidence: Guest reviews mention being served complimentary Turkish tea
- Note: Apartment-style Turkish venue with traditional tea ritual is a defensible concept/experience fact.

### 192. Umai

- Category: Japanese
- Cuisines: Japanese
- Signature dishes: Beef Roll,Dragon Roll,California Roll with Fish Egg,Sweet Tiger Roll,Crispy Prawn Tempura Roll with Philly Cheese,Rainbow California Roll,Assorted Roll Platter,Maguro Katsu Maki,Salmon Katsu Maki,Whitefish Jalapeno,Beef Carpaccio,Salmon Belly New Style Sashimi,Tuna Tataki,Special Salmon Carpaccio,Dragon Eye,Umai Special Creamy Salmon Roll,Devils Breath Spicy Jalapeno Roll,Special Vegetable Roll,Hot & Spicy Tuna Roll,Hot & Spicy Salmon Roll
- Price range: ৳2,000+
- **Recommendation: KEEP**
- Possible facts: "Opened 2015; long-time executive chef Shoji Morita trained at Sushimasa in Japan and trained all kitchen staff"; "Imports salmon directly from Norway and stores it in a -70 degrees C freezer"
  - Wording: "Opened in 2015 with Japanese executive chef Shoji Morita - trained at Sushimasa in Japan - who personally trained the kitchen staff"
    - Type: OTHER | Confidence: HIGH
    - Source: https://www.thedailystar.net/lifestyle/food/news/umai-authentic-japanese-cuisine-2084493 (The Daily Star, 2021)
    - Evidence: 'Shoji Morita... honed his skills at the popular Sushimasa Restaurant in Kudanshita, Japan, had been the Executive Chef at UMAI, since its opening in 2015'
  - Wording: "Imports its salmon directly from Norway and keeps it in a -70 degrees C freezer so the fish stays fresh rather than frozen"
    - Type: OTHER | Confidence: HIGH
    - Source: https://www.thedailystar.net/lifestyle/food/news/umai-authentic-japanese-cuisine-2084493 (The Daily Star, 2021)
    - Evidence: Head Chef Nayeem Ashraf: 'We import our salmon directly from Norway... kept in a special freezer set at -70 degree Celsius'
- Note: Verified chef pedigree and unusual Norway salmon / -70C sourcing chain.

### 193. Uncle Bobo's Banani

- Category: Fried Chicken
- Cuisines: Fast Food
- Price range: ৳200–400
- **Recommendation: KEEP**
- Possible facts: "Launched Feb 2025 as the first jumbo Taiwanese fried chicken in Bangladesh"; "Started as an outdoor kitchen-cart built to test a drive-through-style concept; named after a co-founder's nickname"; "Open until 4am"
  - Wording: "Launched in February 2025 as the first jumbo Taiwanese fried chicken brand in Bangladesh"
    - Type: OTHER | Confidence: HIGH
    - Source: https://www.dhakatribune.com/business/374532/uncle-bobo%E2%80%99s-brings-you-jumbo-taiwanese-fried (Dhaka Tribune, 2025)
    - Evidence: Dhaka Tribune headline and body describe it as the first jumbo Taiwanese fried chicken in Bangladesh, opening Feb 2025
  - Wording: "Started as an outdoor kitchen-cart built to test a drive-through-style concept, and is named after the co-founder's nickname"
    - Type: OTHER | Confidence: HIGH
    - Source: https://www.dhakatribune.com/business/374532/uncle-bobo%E2%80%99s-brings-you-jumbo-taiwanese-fried (Dhaka Tribune, 2025)
    - Evidence: Outdoor kitchen-cart setup aimed at a drive-through concept; brand named after co-founder Aria Tasneem Ahmed's nickname
- Note: First-mover claim and quirky kitchen-cart origin from a major daily.

### 194. Utshob Gulshan

- Category: Asian
- Cuisines: Asian
- Signature dishes: Vegetable Singara
- Price range: ৳400–1,000
- **Recommendation: MODIFY**
- Possible facts: "Founded 2019 at Gulshan 2's Chef's Table food court; focused on district-specific regional Bengali dishes"; "All dishes made from ready-to-cook formulas from a central kitchen in Badda; no branch has its own chef"; "Batch lists cuisine as 'Asian' but the restaurant is actually a Bengali regional specialist"
  - Wording: "Founded in 2019 at Gulshan 2's Chef's Table food court, built around district-specific regional Bengali dishes such as Noakhali's duck curry and Dinajpur's khuder bhaat"
    - Type: HISTORY | Confidence: HIGH
    - Source: https://www.tbsnews.net/features/food/famous-regional-dishes-utshob-offer-authentic-tastes-bangladeshi-cuisine-513874 (The Business Standard, 2022); https://www.thedailystar.net/life-living/food-recipes/news/utshob-celebration-bengali-cuisine-3123106 (The Daily Star, 2021)
    - Evidence: TBS: 'Utshob started its journey in 2019 with an outlet at Gulshan 2 Chef's Table' offering 'Noakhali's haas bhuna (duck curry) and Dinajpur's khuder bhaat'
  - Wording: "Runs its kitchen centrally: every dish is prepared from ready-to-cook formulas made in a central kitchen in Badda, so no branch outlet has its own designated chef"
    - Type: OTHER | Confidence: MEDIUM
    - Source: https://www.tbsnews.net/features/food/famous-regional-dishes-utshob-offer-authentic-tastes-bangladeshi-cuisine-513874 (The Business Standard, 2022)
    - Evidence: 'Utshob does not have a designated chef in any branch. All of their dishes come in formulas... made in its central kitchen in Saatarkul, Badda'
- Note: Strong facts found, but batch entry labels it category/cuisine 'Asian' - it is a Bengali regional specialist; correct cuisine/area fields.

### 195. VAULT | Modern Asian Restaurant

- Category: Restaurant
- Price range: ৳2,000+
- **Recommendation: KEEP**
- Possible facts: "Menu crafted by Michelin Guide-recognized Chef Nan Thaisuchat from Thailand"; "Located in the basement of Autograph Tower, Banani; live music with resident DJs, percussionists, singers and flautists"; "Signature 'Ilish Lollipop' is a modern spin on the national fish; ~Tk 3,500-4,000 per person"
  - Wording: "Serves a contemporary Asian menu crafted by Michelin Guide-recognized Thai chef Nan Thaisuchat"
    - Type: OTHER | Confidence: HIGH
    - Source: https://www.dhakatribune.com/business/369430/vault-dive-into-dhaka%E2%80%99s-newest-sensational (Dhaka Tribune, 2024)
    - Evidence: 'Vault presents a contemporary Asian menu crafted by Michelin Guide-recognized Chef Nan Thaisuchat from Thailand'
  - Wording: "Located in the basement of Autograph Tower, Banani, with live music featuring resident DJs, percussionists, singers and flautists"
    - Type: EXPERIENCE | Confidence: HIGH
    - Source: https://www.dhakatribune.com/business/369430/vault-dive-into-dhaka%E2%80%99s-newest-sensational (Dhaka Tribune, 2024)
    - Evidence: 'The restaurant is located in the basement of the Autograph Tower in Banani'; 'live music with resident DJs, percussionists, singers, and flautists'
  - Wording: "Signature 'Ilish Lollipop' is a modern spin on the traditional ilish fish"
    - Type: IDENTITY | Confidence: MEDIUM
    - Source: https://www.dhakatribune.com/business/369430/vault-dive-into-dhaka%E2%80%99s-newest-sensational (Dhaka Tribune, 2024)
    - Evidence: 'Take our Ilish Lollipop, for example. It is a modern spin on the beloved Ilish'
- Note: Chef pedigree (Michelin-recognized), basement location and live-music format verified by Dhaka Tribune.

### 196. VOCA SILK

- Category: Restaurant
- Price range: ৳800–2,000
- **Recommendation: ABSTAIN**
  - No defensible facts (ABSTAIN/REJECT).
- Note: Very new restaurant; only thin social-media signals (opening, green-plant interior, seafood chowder) found with no reliable source. Nothing defensible.

### 197. Vrinda's Kitchen Gulshan

- Category: Restaurant
- Price range: ৳200–400
- **Recommendation: MODIFY**
- Possible facts: "Hare Krishna-run cafe next to Vatara Kali Mondir temple"; "Advertises 100% vegetarian food; most items are vegan"; "Menu varies daily; small seating (about 3 tables)"
  - Wording: "Hare Krishna-run cafe beside the Vatara Kali Mondir temple that advertises 100% vegetarian food, with most of the menu vegan"
    - Type: CONCEPT | Confidence: MEDIUM
    - Source: https://www.happycow.net/reviews/vrindas-kitchen-dhaka-271166 (HappyCow, 2022); https://wanderlog.com/place/details/12428752/vrindas-kitchen-gulshan (Wanderlog, 2026)
    - Evidence: HappyCow: 'Hare Krishna cafe that advertises itself as 100% vegetarian, yet most of the food is vegan'; located at Vatara Kali Mondir
  - Wording: "Has a small, rotating menu that changes daily with only a few tables - a temple-adjacent, home-cooking style set-up"
    - Type: OTHER | Confidence: MEDIUM
    - Source: https://www.happycow.net/reviews/vrindas-kitchen-dhaka-271166 (HappyCow, 2022); https://wanderlog.com/place/details/12428752/vrindas-kitchen-gulshan (Wanderlog, 2026)
    - Evidence: HappyCow: 'Has a limited menu that varies by day. Has 3 tables.'
- Note: Verified as a Hare Krishna vegetarian/vegan cafe, not a generic 'Restaurant'; batch mealTypes (Dessert, Snacks) understate the menu - refine fields.

### 198. Waffle Up - Banani

- Category: Dessert shop
- **Recommendation: KEEP**
- Possible facts: "Launched 2021 as a Bangladeshi waffle start-up; now a global QSR waffle franchise across Bangladesh, Singapore, Indonesia, Dubai and Thailand"; "First in Bangladesh to serve waffles on a stick"
  - Wording: "Launched in 2021 as a Bangladeshi waffle start-up and has since grown into a global QSR franchise with outlets across Bangladesh, Singapore, Indonesia, Dubai and Thailand"
    - Type: HISTORY | Confidence: HIGH
    - Source: https://www.waffleup.global/ (official site, 2026); https://www.dhakatribune.com/feature/food/385790/bangladesh%E2%80%99s-waffle-up-goes-global (Dhaka Tribune, 2025)
    - Evidence: Official site: 'first baked in Bangladesh and is currently the largest and fastest growing QSR waffle chain'; Dhaka Tribune: opening branches in Singapore, Thailand, Dubai, Indonesia
  - Wording: "Claims to be the first brand in Bangladesh to serve waffles on a stick"
    - Type: OTHER | Confidence: MEDIUM
    - Source: https://www.dhakatribune.com/feature/food/385790/bangladesh%E2%80%99s-waffle-up-goes-global (Dhaka Tribune, 2025)
    - Evidence: 'As the first ones to serve waffles on a stick in Bangladesh'
- Note: Bangladeshi origin story with verified international franchise expansion.

### 199. Waza

- Category: Restaurant
- Price range: ৳2,000+
- **Recommendation: KEEP**
- Possible facts: "One of Dhaka's few dedicated Kashmiri and Awadhi cuisine restaurants"; "Rooftop location in Banani"
  - Wording: "One of Dhaka's few restaurants dedicated to Kashmiri and Awadhi cuisine, operating from a rooftop spot in Banani"
    - Type: OTHER | Confidence: MEDIUM
    - Source: https://tbsgraduates.net/writeup/reviews/food-review/authentic-unfamiliar-and-worth-the-risk-dining-at-waza/ (TBS Graduates, 2026)
    - Evidence: Review describes Waza as serving Kashmiri and Awadhi food in Banani; rooftop setting confirmed in review coverage
- Note: Rare cuisine niche (Kashmiri/Awadhi) is a defensible differentiator.

### 200. Woodhouse Grill Banani

- Category: Steak
- Cuisines: Steakhouse
- Price range: ৳2,000+
- **Recommendation: KEEP**
- Possible facts: "Texas-style grill house open since 2017"; "Known for slow-cooked brisket and Austin-style ribs"; "Steaks mostly imported, which became a challenge during import restrictions"
  - Wording: "Texas-style grill house open in Banani since 2017, known for slow-cooked brisket and Austin-style ribs"
    - Type: HISTORY | Confidence: MEDIUM
    - Source: https://bangladeshpost.net/posts/carnivorous-cravings-at-woodhouse-grill-7323 (Bangladesh Post, 2019); https://www.dhakatribune.com/business/359897/woodhouse-grill-serving-some-scrumptious-steaks (Dhaka Tribune, 2024)
    - Evidence: Bangladesh Post: 'favourite among all since it opened in 2017'; Dhaka Tribune reviews slow-cooked brisket and ribs
  - Wording: "Relies mostly on imported meat for its steaks - a supply line that became a challenge under Bangladesh's import restrictions"
    - Type: OTHER | Confidence: MEDIUM
    - Source: https://www.dhakatribune.com/business/359897/woodhouse-grill-serving-some-scrumptious-steaks (Dhaka Tribune, 2024)
    - Evidence: Manager Leon Stiphen Gomes: 'The steaks were normally imported and imports are restricted by the government, so that's been difficult'
- Note: Verified 2017 opening, Texas-style identity and an import-reliance operating quirk.

### 201. Woodhouse Grill Gulshan

- Category: Steak
- Cuisines: Steakhouse
- Price range: ৳2,000+
- **Recommendation: KEEP**
- Possible facts: "Second outlet of the Woodhouse Grill chain at Bay's 23, Gulshan"; "Same Texas-style grill format as the 2017 Banani original"
  - Wording: "The chain's Gulshan outlet at Bay's 23, sharing the Texas-style grill format of the original Banani branch that opened in 2017"
    - Type: HISTORY | Confidence: MEDIUM
    - Source: https://www.findglocal.com/BD/Dhaka/1557639944255812/Woodhouse-Grill (Findglocal, 2026); https://bangladeshpost.net/posts/carnivorous-cravings-at-woodhouse-grill-7323 (Bangladesh Post, 2019)
    - Evidence: Findglocal lists Gulshan branch at Bay's 23, Plot 6, Level 2, Block SW(i); original Banani branch open since 2017
- Note: Entry is a legitimate second outlet of a verified Texas-style steakhouse chain.

### 202. Yoshi Banani

- Category: Asian
- Cuisines: Asian
- **Recommendation: ABSTAIN**
  - No defensible facts (ABSTAIN/REJECT).
- Note: No strong verifiable decision-changing fact; late-night (4am) claim conflicts with batch hours (closes 11:30pm) and could not be corroborated by a reliable source.

### 203. Yum Cha District

- Category: Chinese
- Cuisines: Chinese
- Price range: ৳400–1,600
- **Recommendation: MODIFY**
- Possible facts: "Established 2017 as 'a modern take on Chinese tea houses'"; "Brand tagline: 'The Pan-Asian Love Affair'; dim sum specialist"; "Batch lists cuisine as 'Chinese' but the brand positions itself as Asian fusion (Pan-Asian)"
  - Wording: "Founded in 2017 as 'a modern take on Chinese tea houses', built around a wide dim sum menu plus a full Asian fusion line"
    - Type: HISTORY | Confidence: HIGH
    - Source: https://www.yumchadistrict.com/ (official site, 2026)
    - Evidence: Official site: 'EST. | 2017'; 'A modern take on Chinese tea houses... a full-course, Asian fusion menu'
  - Wording: "The Gulshan branch (60A, Road 131) is the brand's newer outlet; the original is in Dhanmondi, and the brand calls itself 'The Pan-Asian Love Affair'"
    - Type: CONCEPT | Confidence: MEDIUM
    - Source: https://www.yumchadistrict.com/ (official site, 2026); https://www.facebook.com/YumChaDistrict (Facebook, 2026)
    - Evidence: Official site lists Gulshan and Dhanmondi locations; Facebook intro: 'The Pan-Asian Love Affair'
- Note: Solid facts found, but batch entry lists it as plain 'Chinese' cuisine with lunch-opening hours; it is a Pan-Asian dim sum brand (evening-focused per DhakaEats) - correct fields.

### 204. Yumi at Sheraton Dhaka

- Category: Restaurant
- Price range: ৳2,000+
- **Recommendation: KEEP**
- Possible facts: "Opened March 2022 on level 27, the top floor of Sheraton Dhaka and the highest point in Banani"; "Dinner-only Japanese restaurant (6:30pm-11pm) with nightly Teppanyaki - a format no other five-star hotel in Dhaka offers"; "Panoramic views over Banani and the Dhaka skyline"
  - Wording: "Opened in March 2022 on level 27 - the top floor of Sheraton Dhaka and the highest point in Banani - with panoramic views over the city"
    - Type: LOCATION | Confidence: HIGH
    - Source: https://www.dhakatribune.com/business/265042/yumi-opens-at-top-of-sheraton-dhaka (Dhaka Tribune, 2022)
    - Evidence: 'Located on level 27, at the top of the 5-star hotel and the highest point in Banani'
  - Wording: "Dinner-only Japanese restaurant (6:30pm-11pm) that serves nightly Teppanyaki, a format no other five-star hotel in Dhaka offers"
    - Type: OTHER | Confidence: HIGH
    - Source: https://www.dhakatribune.com/business/265042/yumi-opens-at-top-of-sheraton-dhaka (Dhaka Tribune, 2022); https://www.bangladeshmonitor.com.bd/en/sheraton-dhaka-brings-new-menu-at-restaurant-yumi (Bangladesh Monitor, 2022)
    - Evidence: 'open every day for dinner from 6:30pm till 11pm'; 'It is a unique experience which is offered by no other five-star hotels in Dhaka'
- Note: Top-floor highest-point location and unique Teppanyaki offering verified by Dhaka Tribune.

### 205. Zephyr Restaurant & Lounge

- Category: Restaurant
- **Recommendation: KEEP**
- Possible facts: "Opened 2 September 2022 as a rooftop restaurant-lounge in Banani; 'Zephyr' means the gentle breeze"; "Designed as a rooftop garden escape with wall planters and a green theme"; "No carbonated soft drinks - only smoothies and fresh juices; meals from Tk 450"
  - Wording: "Opened in September 2022 as a rooftop restaurant-lounge in Banani; the name means 'the gentle breeze' and the venue is styled as a rooftop garden with wall planters"
    - Type: CONCEPT | Confidence: HIGH
    - Source: https://www.thedailystar.net/business/news/fine-dine-restaurant-zephyr-starts-journey-dhaka-3138171 (The Daily Star, 2022)
    - Evidence: The Daily Star: 'opened its doors on September 2' with a rooftop view; ''Zephyr' represents the gentle breeze'; 'full of wall planters' with a green theme
  - Wording: "Does not serve carbonated soft drinks - the menu offers only smoothies and fresh juices, with meals starting at Tk 450"
    - Type: OTHER | Confidence: MEDIUM
    - Source: https://www.thedailystar.net/business/news/fine-dine-restaurant-zephyr-starts-journey-dhaka-3138171 (The Daily Star, 2022)
    - Evidence: 'We do not serve carbonated soft drinks. Rather, a wide variety of refreshing smoothies and fresh juices are offered'; 'Meal prices start from Tk 450'
- Note: Founding date, name meaning, rooftop-garden concept and no-carbonated-drinks quirk all from The Daily Star.
