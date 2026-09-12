# Vehicle Marketplace --- Web & Mobile Product Functions

The product should be one marketplace with two deliberately different
experiences: **mobile is highly visual, fast and personalised; web is
where buyers can go extremely deep into specifications, comparison and
research.** Sellers get serious performance tooling on both.

## 1. Mobile App --- Buyer Experience

The mobile app should feel closer to **Instagram/Reels for cars** than a
conventional classifieds app.

### Discover Feed

The main screen is a personalised full-screen feed. Each vehicle card
shows large photography/video with the essential information overlaid:
price, make/model/derivative, year, mileage, location/distance, seller
type, price rating and finance estimate.

The fundamental gestures should be:

-   **Swipe up/down → next/previous car**
-   **Swipe left/right → next/previous photo of the same car**
-   **Tap Exterior / Interior → instantly switch photo sets**
-   **Pinch → zoom**
-   **Tap car details → open full vehicle page**

Critically, **users should not have to open a gallery to browse
photographs**. Photos move directly from the main car view.

### Exterior / Interior Photography

Every car has two prominent photo groups:

**Exterior 1/18 \| Interior 1/12**

Exterior is initially selected. The buyer can immediately swipe
left/right through exterior pictures. Selecting Interior instantly
replaces the sequence and left/right swiping continues through the
interior.

The application remembers the position independently:

> Exterior 7/18 → Interior 3/12 → Exterior returns to 7/18.

Additional categories such as **Wheels, Engine, Boot, Damage/Documents**
can exist in the full gallery without cluttering the primary interface.

Images should be preloaded ahead/behind the current image so movement
feels immediate.

## 2. Personalised "For You" Feed

The app should learn what each buyer actually likes.

It should consider explicit signals such as likes, watchlists, searches
and filters, but also behavioural signals such as vehicles opened,
photographs browsed, time spent on a car, specification sections viewed,
comparisons performed and cars immediately skipped.

The main feed could have:

**For You \| Nearby \| Latest \| Price Drops \| Following**

Eventually the system learns preferences such as brand, price range,
mileage, transmission, performance, body style, specification and
distance, then prioritises appropriate inventory.

Recommendations should still occasionally introduce cars outside the
profile to prevent the feed becoming repetitive.

## 3. Like Versus Watch

### ❤️ Like

Low commitment: "I like this."

Primarily helps train recommendations and allows casual browsing.

### 🔖 Watch

Strong buying intent.

Watching a vehicle enables notifications for price reductions, advert
updates, seller changes, vehicle becoming reserved/sold and other
important changes.

### Collections

Users can organise vehicles into collections such as:

-   My shortlist
-   M340i
-   Family cars
-   Weekend cars
-   Maybe
-   Cars for Sarah

Saved content synchronises between web and mobile.

## 4. Traditional Search

There should be an extremely good standard search:

**Make → Model → Generation → Derivative/Trim**

with comprehensive filters including price, finance payment, age,
mileage, location/radius, fuel, transmission, body style, colour, doors,
seats, seller type, service history, number of owners and MOT status.

## 5. Deep Specification Search

This should be one of the product's defining features.

### Performance

-   BHP
-   Torque
-   0--60 / 0--62
-   Top speed
-   Power-to-weight

### Engine

-   Capacity
-   Cylinders
-   Turbo/supercharged
-   Fuel
-   Hybrid type

### Drivetrain

-   FWD
-   RWD
-   AWD
-   Manual/automatic
-   Gear count

### Economy

-   MPG
-   CO₂
-   VED/tax
-   Insurance group
-   ULEZ

### Practicality

-   Boot capacity
-   Seats
-   Doors
-   Vehicle length/width/height
-   Towing capacity
-   Kerb weight

### Equipment

-   Apple CarPlay
-   Android Auto
-   Adaptive cruise
-   360° camera
-   Reversing camera
-   HUD
-   Panoramic roof
-   Heated seats
-   Ventilated seats
-   Memory seats
-   Matrix/LED headlights
-   Premium audio
-   Tow bar
-   Keyless entry

Users should be able to search for combinations such as:

> AWD petrol, minimum 300 bhp, 0--60 below 5 seconds, 2021+, adaptive
> cruise, heated seats, under £35k and within 100 miles.

## 6. Natural-Language AI Search

Beside conventional filters, provide:

### ✨ Ask AI to Find Your Car

Example:

> "I want a fast estate, preferably German, around £30k. Petrol,
> automatic, at least 300 bhp. I do motorway mileage so adaptive cruise
> is important. Nothing older than 2021."

AI converts this into actual structured search criteria.

The user can continue the conversation:

> Make it under £27k.

> I'm happy with a saloon too.

> Remove anything with more than 50k miles.

The existing search updates rather than starting again.

## 7. AI Car Finder

For people who don't know exactly what they want:

### Help Me Choose a Car

AI asks about budget, mileage, family size, commute, driving type,
performance expectations, practicality, preferred features and
priorities.

It can return recommendations such as:

-   **BMW 330i --- 96% match**
-   **Skoda Octavia vRS --- 93%**
-   **Audi A4 45 TFSI --- 89%**

Each recommendation explains why it fits and can lead directly into
actual marketplace inventory.

## 8. Full Vehicle Page

The vehicle page should be considerably richer than a normal classified
advert.

At the top is the interactive photography experience described above,
followed immediately by vehicle identity, asking price, mileage, fuel,
transmission and price assessment.

Example:

**2022 BMW 330i M Sport**

**£24,995**

31,200 miles · Petrol · Automatic

### Great Price

**£1,020 below estimated market value**

Main sections:

**Overview · Specification · Equipment · Performance · Running Costs ·
Dimensions · History · MOT · Price History · Seller**

## 9. AI Vehicle Summary

Near the top of the listing, provide an AI-generated factual summary
covering specification, mileage, market pricing, important equipment and
relevant history.

AI-generated claims must be grounded in available data and must not
invent vehicle condition, equipment, history or seller claims.

## 10. Ask AI About This Car

Every vehicle gets its own AI assistant.

Buyers can ask:

-   Is this good value?
-   What options does this car have that the standard model doesn't?
-   What commonly goes wrong with this engine?
-   Is it suitable for 15,000 motorway miles a year?
-   What should I inspect during a viewing?
-   What will it roughly cost me to run?
-   How does it compare with the Audi I saved?
-   Why is this one cheaper?
-   Which car in my watchlist would you choose for my requirements?

The AI should understand the **specific advertised vehicle**, not just
the general model.

## 11. Complete Specifications

Vehicle specification pages should be unusually detailed.

Include:

-   Engine & drivetrain
-   Performance
-   Fuel economy
-   Emissions
-   Dimensions
-   Weights
-   Boot/storage
-   Wheels/tyres
-   Standard equipment
-   Optional equipment
-   Safety equipment
-   Euro NCAP where applicable
-   Insurance
-   Tax
-   Original list price
-   Model/derivative dates
-   Warranty information

This information can also power standalone research pages on the
website.

## 12. Vehicle History

Where data and licensing permit, include:

-   MOT history
-   Mileage history
-   Outstanding finance
-   Write-off/category
-   Stolen status
-   Import/export
-   Scrapped status
-   Number of owners/keepers where available
-   Plate changes
-   VIN verification
-   Recall information
-   Service history supplied by seller

Present this visually as a **vehicle timeline** rather than only raw
data.

## 13. Price Intelligence

Every listing should be benchmarked.

Example:

### £24,995 --- Great Price

**Estimated market range: £25,400--£27,100**

Based on comparable vehicles.

Explain the assessment using factors such as mileage, specification,
age, derivative, location and current competing inventory.

## 14. Price History

Buyers should see listing price changes.

Example:

-   **02 Sep --- Listed £26,495**
-   **07 Sep --- £25,995 ↓ £500**
-   **11 Sep --- £24,995 ↓ £1,000**

**Total reduction: ↓ £1,500**

This is particularly valuable for watchlist users.

## 15. Vehicle Comparison

Web should offer an exceptional comparison experience, with a simplified
version on mobile.

Allow users to compare up to several cars across:

-   Price
-   Mileage
-   Age
-   Power
-   Torque
-   0--60
-   MPG
-   Tax
-   Insurance
-   Owners
-   MOT
-   Boot capacity
-   Dimensions
-   Equipment
-   History
-   Market valuation
-   Seller
-   Distance

### ✨ AI Comparison

AI can identify:

-   Best value
-   Best performance
-   Best specification
-   Most practical
-   Lowest likely running costs
-   Best overall for the specific user

## 16. Seller Advert Creation

Make selling extremely fast.

The seller enters the registration and the platform retrieves available
vehicle details.

The seller then provides:

-   Mileage
-   Condition
-   Service history
-   Ownership/details required
-   Options
-   Recent maintenance
-   Price
-   Photographs/video

AI handles much of the remaining advert preparation.

## 17. AI Photo Management

The seller should not need to manually categorise 30 photographs.

AI recognises:

-   Front
-   Front ¾
-   Side
-   Rear
-   Rear ¾
-   Wheels
-   Dashboard
-   Front seats
-   Rear seats
-   Boot
-   Engine
-   Damage

It automatically creates:

### Exterior

### Interior

### Other

This directly powers the buyer's Exterior/Interior switching experience.

AI should also identify missing photographs, blurred/poor images and
incomplete coverage.

## 18. AI Cover-Photo Selection

AI recommends the best cover photo based on composition, lighting,
vehicle visibility, image quality and eventually actual marketplace
engagement data.

The seller can override the recommendation.

Once sufficient data exists, the system can learn which types of cover
photographs produce higher click-through rates.

## 19. AI Advert Creation

AI generates the title and description from factual information provided
by the seller and the vehicle database.

It then performs an advert completeness check.

Example:

### Advert Completeness --- 92/100

-   [x] Mileage
-   [x] Service history
-   [x] Specification
-   [x] Recent maintenance
-   [x] Keys
-   ⚠ Tyre condition missing
-   ⚠ Cosmetic condition missing

AI must never invent service history, options or vehicle condition.

## 20. Seller Dashboard

Instead of simply reporting views, provide a proper conversion funnel.

Example:

**14,821 Search appearances**

↓

**4,219 Feed impressions**

↓

**1,382 Advert views**

↓

**214 Likes**

↓

**79 Watchlists**

↓

**31 Enquiries**

↓

**8 Viewing requests**

↓

**SOLD**

This helps sellers understand where their advert is succeeding or
failing.

## 21. Advert Performance Score

Every seller receives an overall score.

### Advert Score --- 84/100

Example breakdown:

-   **Price --- 78**
-   **Photos --- 92**
-   **Description --- 96**
-   **Completeness --- 88**
-   **Engagement --- 71**
-   **Seller responsiveness --- 94**

The platform should not just score the advert; it should tell the seller
exactly how to improve it.

## 22. AI Seller Coach

This should be one of the strongest commercial features.

Example:

> Your advert is getting plenty of exposure but relatively few people
> are opening it.

> 8,420 impressions generated 211 advert views. Similar vehicles average
> approximately 4.1% CTR compared with your 2.5%.

The system then recommends actions such as:

-   Change cover photo
-   Review price
-   Add missing interior photographs
-   Improve description
-   Complete missing specification
-   Respond faster to enquiries

Another scenario:

> Your advert receives above-average views, but enquiry conversion is
> low. Buyers appear interested but aren't progressing.

AI analyses likely reasons and recommends actions.

This turns the platform from an **advertising platform into a selling
tool**.

## 23. Seller Competitor Intelligence

Show sellers how their vehicle compares with the current market.

Example:

### Your Market

**38 comparable cars currently advertised**

-   Your price: **17th cheapest**
-   Your mileage: **8th lowest**
-   Your specification: **Top 15%**
-   Your engagement: **Top 24%**
-   Median days advertised: **23**
-   Your advert: **11 days**

Also show market movements:

> 3 competing cars disappeared this week.

> 8 sellers reduced their price.

> Median asking price decreased £275.

## 24. Predicted Performance

Once enough real marketplace data exists, introduce:

### Estimated Sale Likelihood

**74% probability of selling within 30 days**

The seller could test pricing scenarios:

> Reduce price to **£24,495**

Estimated probability:

**82%**

This should only launch once enough real performance/transaction data
exists to make predictions meaningful.

## 25. Performance Over Time

Seller analytics should include graphs for:

-   Impressions
-   Views
-   Likes
-   Watchlists
-   Enquiries

Across:

**24h · 7d · 30d · Lifetime**

Annotate important changes such as:

> Price reduced £500

This lets sellers see whether their changes actually improved
performance.

## 26. Buyer Alerts

Useful notifications include:

### New Match

> New M340i matching your saved search listed 6 miles away.

### Price Reduction

> A car you're watching dropped from £32,995 to £31,495.

### High Interest

> A car on your watchlist is receiving unusually high interest.

### New Alternative

> A similar car has appeared £1,700 cheaper.

### Availability

> Vehicle you were watching has sold.

## 27. Seller Alerts

Examples:

> Your advert received 14 new watchlists today.

> Traffic is 3× higher than normal today.

> You haven't received an enquiry in seven days. AI has identified three
> improvements.

> Five competing cars reduced their prices this week.

> Someone sent you an enquiry.

Notifications should remain useful rather than becoming spam.

## 28. Messaging

Keep buyer/seller communication within the platform.

Support:

-   Text
-   Photos
-   Attachments
-   Viewing arrangements
-   Quick questions
-   Offers

Useful quick actions:

-   Is this still available?
-   Can I arrange a viewing?
-   Does it have full service history?
-   Make an offer

AI can help sellers draft answers using known advert information, but
the seller remains responsible for sending them.

## 29. Viewing Management

Allow buyers to request a viewing directly.

Example:

**Saturday · 11:00**

Seller can:

**Accept \| Suggest another time**

Both sides receive reminders.

Afterwards:

> Did you view this vehicle?

This provides much better marketplace conversion data than simply
counting leads.

## 30. Social / Discovery Features

Include useful social/discovery mechanics:

-   Likes
-   Watchlists
-   Collections
-   Shares
-   Follow dealer
-   Follow make/model
-   Trending cars
-   Most watched
-   Most liked
-   Recently popular

Example discovery sections:

-   Performance cars under £30k
-   Most watched BMWs
-   Fast estates
-   Best-value EVs

Avoid public comments initially because of the moderation burden and
limited transaction value.

## 31. Mobile Structure

Suggested mobile navigation:

### Discover

Instagram-style personalised feed.

### Search

Conventional + specification + AI search.

### Saved

Likes, Watchlists, Collections and Saved Searches.

### Messages

Conversations and viewings.

### Account

Buying, selling and account activity.

**Sell** should remain permanently easy to reach.

## 32. Web Application

The website should not simply reproduce the mobile UI at desktop width.

Desktop should exploit the additional screen space.

Search results can support:

**Grid \| List \| Detailed \| Compare**

Filters should remain readily accessible.

Hovering a listing could allow the buyer to quickly cycle photographs
without opening the advert.

The full advert uses the same **Exterior / Interior** image separation
and direct previous/next controls.

Desktop controls should support:

**← Previous photo \| Next photo →**

and keyboard arrow navigation.

No gallery-opening requirement should exist for normal photo browsing.

## 33. Research Section

Build a substantial vehicle knowledge system:

**Makes → Models → Generations → Derivatives → Engines**

Example:

**BMW → 3 Series → G20 → 330i → M Sport**

Each research area can contain:

-   Specifications
-   Performance
-   Dimensions
-   Equipment
-   Engines
-   Running costs
-   Reliability information
-   Common issues
-   MOT statistics where appropriate
-   Market pricing
-   Cars currently for sale

This is useful to buyers and provides significant SEO potential for the
web application.

## 34. Dealer Functionality

After private sellers, dealers become an important revenue source.

Dealer dashboard functionality should include:

-   Inventory
-   Advert creation
-   Bulk upload
-   Stock feeds/API
-   Leads
-   Messages
-   Performance
-   Market comparison
-   Pricing intelligence
-   Staff/users
-   Finance
-   Featured listings
-   Boosts
-   Reviews
-   Dealer profile

AI should identify:

> 7 vehicles underperforming.

> 3 potentially overpriced.

> 4 missing important photographs.

> 12 with above-average demand.

Dealers can then drill into individual vehicles.

## 35. Trust and Verification

Make trust highly visible.

### ✓ Verified Vehicle

Potential checks include:

-   Registration verified
-   VIN verified
-   V5C checks where possible
-   Mileage checked
-   History checked

### ✓ Verified Seller

Identity verification.

Dealer verification should be handled separately.

Buyers should eventually be able to filter:

**Verified vehicles only**

## 36. Fraud AI

Behind the scenes, AI and rules should detect:

-   Repeated/stolen photographs
-   Suspiciously low prices
-   VIN/registration mismatches
-   Multiple suspicious accounts
-   Duplicate listings
-   Suspicious messaging patterns
-   Unusual location changes
-   Potential dealers pretending to be private sellers

This does not need to be prominently branded as AI, but it is
operationally important.

## 37. Cross-Device Continuity

Everything synchronises between mobile and web.

Example journey:

1.  User discovers a car on mobile.
2.  User likes or watches it.
3.  Later, the user opens the web application and finds it under
    Recently Viewed/Saved.
4.  User performs a detailed comparison.
5.  Mobile notification reports a £750 price reduction.
6.  User opens the mobile app, messages the seller and requests a
    viewing.

## 38. AI Architecture

Rather than adding one generic chatbot later, design the product around
multiple AI capabilities:

### Buyer Recommendation AI

Learns tastes and personalises discovery.

### Search AI

Converts natural language into structured vehicle queries.

### Vehicle Expert AI

Explains specific vehicles and relevant vehicle knowledge.

### Comparison AI

Analyses shortlisted vehicles.

### Pricing AI

Produces market valuations and price intelligence.

### Seller Coach AI

Identifies advert performance problems and recommends improvements.

### Photo AI

Categorises photographs and assesses quality/completeness.

### Advert AI

Generates and validates descriptions.

### Fraud AI

Identifies suspicious activity.

### Demand AI

Eventually predicts likelihood and time-to-sale.

These systems should share the same underlying structured marketplace
data.

## 39. Five Flagship Features

The product should initially become known for five things rather than
trying to launch every possible feature at once.

### 1. Discover Cars Visually

**↑↓ Cars**

**←→ Photos**

**Exterior \| Interior**

No unnecessary taps.

### 2. Search Cars Properly

Traditional search + extremely detailed specification search +
natural-language AI.

### 3. Know Everything About the Car

Detailed specification, history, price intelligence, ownership
information and **Ask AI**.

### 4. Compare Intelligently

Not just specifications side-by-side:

> Which one is actually better for me?

### 5. Help Sellers Actually Sell

Not simply:

> Your advert had 482 views.

Instead:

> Your advert is underperforming because of X. Do Y to improve it.

The platform should therefore position itself as more than a cheaper
classified advertising service.

For buyers, it is a **visual vehicle discovery and research platform**.

For sellers, it is an **active selling and advert-optimisation tool**.

The combination of **Instagram-style discovery, frictionless
Exterior/Interior photography, unusually deep specification search, AI
vehicle intelligence and seller performance optimisation** should form
the core product identity.
