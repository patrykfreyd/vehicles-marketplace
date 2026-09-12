# Marketplace Analytics & User Engagement Tracking

## 1. Objective

Analytics should be treated as a **first-class internal system**, not simply as website analytics.

The platform needs to understand:

- Where buyers come from
- Which marketing sources create valuable users
- What users search for
- What cars users actually engage with
- Which behaviour indicates purchase intent
- Which listings perform well or poorly
- Which sellers convert interest into enquiries and sales
- Which catalogue attributes users care about
- Which AI features create meaningful value
- What drives repeat visits
- Where buyers and sellers abandon their journeys
- How marketplace supply compares with buyer demand

The analytics data should ultimately serve three purposes:

```text
Business analytics
Seller performance analytics
Recommendation / personalisation data
```

The most important principle is:

> Capture the important raw events from the first real users. Metrics and scoring models can be changed later, but historical behaviour that was never recorded cannot be reconstructed.

---

# 2. Questions the Analytics System Should Answer

The system should eventually answer questions such as:

```text
Where are buyers coming from?

Which campaigns create:
- registrations
- watchlists
- enquiries
- viewing requests
- sales?

Which makes/models/generations attract organic traffic?

What are users searching for but not finding?

Which cars receive impressions but few clicks?

Which cars receive views but no enquiries?

Which filters do enthusiasts use?

Which price ranges generate the strongest engagement?

What makes users return?

What behaviour predicts an enquiry?

Which users appear to be serious buyers?

Which sellers/listings create engagement?

Where do sellers abandon advert creation?

Does AI Search convert better than conventional search?

Does the Discover/swiping experience create meaningful buying intent?

Which catalogue fields are worth investing effort in?
```

---

# 3. Analytics Layers

The analytics system should initially cover five major areas:

```text
1. Acquisition
2. Session and user behaviour
3. Search and discovery
4. Vehicle/listing engagement
5. Conversion
```

Additional areas include:

```text
Seller behaviour
AI usage
Recommendation performance
Marketplace health
SEO
Retention
```

---

# 4. Traffic Acquisition

Every session should capture traffic attribution where available.

Recommended fields:

```text
utm_source
utm_medium
utm_campaign
utm_content
utm_term

referrer
landing_page

landing_listing_id
landing_vehicle_id
landing_make_id
landing_model_id
landing_generation_id
landing_derivative_id

first_touch_source
first_touch_medium
first_touch_campaign

current_source
current_medium
current_campaign
```

Also capture useful technical context:

```text
platform
device_type
browser
operating_system
app_or_web
app_version
country
region
```

This allows reporting such as:

```text
Google Organic
    ↓
BMW M4 pages
    ↓
8,421 visits
    ↓
1,720 vehicle views
    ↓
340 watchlists
    ↓
76 enquiries
```

This is significantly more useful than simply knowing how many visits Google generated.

---

# 5. First-Touch and Current Attribution

Store both:

```text
FIRST TOUCH
```

and:

```text
CURRENT / SESSION TOUCH
```

Example:

```text
First visit:
Google Organic

Second visit:
Direct

Third visit:
Facebook campaign

Enquiry:
Facebook campaign
```

This allows analysis of both:

```text
How did we originally acquire this buyer?
```

and:

```text
What brought the buyer back immediately before conversion?
```

Do not overwrite the original acquisition source every time the user returns.

---

# 6. Anonymous Users and Registered Users

Users should be tracked before they register.

Core identifiers:

```text
anonymous_id
session_id
user_id
```

A visitor may:

```text
Visit marketplace
Search Audi TT RS
View several listings
Return three days later
Watch two cars
Register
Message seller
```

Where permitted by the platform's consent/privacy design, the earlier anonymous activity should be associated with the registered user after registration.

Conceptually:

```text
anonymous_id
      ↓
registration
      ↓
user_id
```

This gives a much better understanding of the complete buyer journey.

---

# 7. User Segmentation

Useful calculated segments may include:

```text
NEW_VISITOR
RETURNING_VISITOR
REGISTERED_BUYER
ACTIVE_BUYER
SELLER
DEALER
```

These should generally be **derived classifications**, not permanent mutually exclusive account types.

One user may:

```text
Browse cars
Buy a car
Sell their old car
Later become a repeat buyer
```

The account model should remain flexible.

---

# 8. Basic Navigation Events

Basic platform events include:

```text
SESSION_STARTED
SESSION_ENDED

PAGE_VIEW

REGISTER
LOGIN
LOGOUT
```

Do not track every meaningless UI interaction simply because it is technically possible.

Prioritise actions that reveal:

```text
Intent
Engagement
Conversion
Friction
Marketplace demand
```

---

# 9. Search Analytics

Search analytics will be one of the most valuable datasets in the marketplace.

Every search should receive a unique:

```text
search_id
```

Example:

```json
{
  "search_id": "srch_123",
  "user_id": "usr_456",
  "search_type": "FILTER",
  "filters": {
    "make": ["BMW"],
    "model": ["M4"],
    "generation": ["G82"],
    "max_price": 60000,
    "drivetrain": ["AWD"]
  },
  "result_count": 23
}
```

---

# 10. Search Events

Recommended events:

```text
SEARCH_PERFORMED
SEARCH_RESULTS_VIEWED

SEARCH_FILTER_ADDED
SEARCH_FILTER_REMOVED

SEARCH_SORT_CHANGED

SEARCH_RESULT_CLICKED

SEARCH_ZERO_RESULTS

SEARCH_SAVED
```

Distinguish the type of search:

```text
STANDARD_SEARCH
ADVANCED_SEARCH
AI_SEARCH
AI_CAR_FINDER
DISCOVER
```

This allows comparison between different discovery methods.

Example:

| Search Method | Searches | Vehicle Views | Watch Rate | Enquiry Rate |
|---|---:|---:|---:|---:|
| Standard | 42,100 | 18,900 | 8.1% | 1.8% |
| Advanced | 7,800 | 5,200 | 14.7% | 4.1% |
| AI Search | 5,400 | 4,100 | 18.2% | 5.6% |
| Discover | 91,000 | 12,400 | 6.4% | 1.2% |

This tells the business whether AI Search and advanced vehicle search are actually improving marketplace outcomes.

---

# 11. Search Filter Analytics

Record the actual structured filters used.

Examples:

```text
Make
Model
Generation
Derivative
Price
Mileage
Year
Fuel
Transmission
Drivetrain
Power
Engine
Engine family
Manufacturer colour
Equipment
Special edition
Distance
```

This can directly guide catalogue development.

Example report:

```text
Most-used enthusiast filters

Generation             31%
Power                   24%
Drivetrain              19%
Manufacturer colour     16%
Gearbox                 15%
Engine                   11%
Special edition          7%
```

If users frequently search for:

```text
engine_family = S58
```

then engine-family catalogue data has demonstrated value.

Analytics therefore becomes part of the catalogue prioritisation process.

---

# 12. Zero-Result Searches

Track:

```text
SEARCH_ZERO_RESULTS
```

with the complete search criteria.

Example:

```text
Audi
TT RS
8S
Nardo Grey
Under £40,000
```

A zero-result search may mean:

```text
No marketplace supply
```

or:

```text
Catalogue/search mapping problem
```

Repeated zero-result searches can create a **Marketplace Demand Gap** report.

Example:

```text
1. Porsche 911 991.2 Manual
   428 searches
   0 available cars

2. BMW M3 G80 Isle of Man Green
   317 searches
   0 available cars

3. Audi TT RS 8S Nardo Grey
   291 searches
   0 available cars
```

This information can later support:

```text
Seller acquisition
Dealer acquisition
Inventory recommendations
Marketing
Catalogue quality improvements
Saved-search alerts
```

---

# 13. Listing Impression Tracking

The system needs to know when a vehicle was **shown**, not only when it was opened.

Track:

```text
LISTING_IMPRESSION
```

Important properties:

```text
listing_id
vehicle_id

search_id
recommendation_id

surface
position
```

Possible surfaces:

```text
SEARCH
DISCOVER
HOMEPAGE
SIMILAR_CARS
SAVED_SEARCH
DEALER_PAGE
RECOMMENDATION
PRICE_DROP
```

Example:

```json
{
  "event": "LISTING_IMPRESSION",
  "listing_id": "lst_123",
  "surface": "SEARCH",
  "position": 4,
  "search_id": "srch_789"
}
```

This enables:

```text
CTR = listing views / listing impressions
```

which is essential for Seller Performance analytics.

---

# 14. Impression Quality

Avoid counting an advert as an impression merely because it exists somewhere far below the visible screen.

Where practical, define a real impression based on visibility.

For example:

```text
Listing entered viewport
and
was sufficiently visible
```

The exact threshold can be refined later.

The important point is to avoid artificially inflating seller impression counts.

---

# 15. Vehicle Engagement Events

Recommended listing engagement events:

```text
LISTING_VIEW
LISTING_EXIT
LISTING_DWELL_TIME

PHOTO_VIEW
PHOTO_SWIPE
PHOTO_EXTERIOR_VIEW
PHOTO_INTERIOR_VIEW
GALLERY_OPENED

SPECIFICATIONS_VIEWED
EQUIPMENT_VIEWED
HISTORY_VIEWED
PRICE_HISTORY_VIEWED
SELLER_VIEWED

LIKE
UNLIKE

WATCHLIST_ADD
WATCHLIST_REMOVE

COLLECTION_ADD

COMPARE_ADD
COMPARE_VIEW

SHARE
```

These reveal substantially more than simple page-view analytics.

---

# 16. Exterior / Interior Photo Analytics

The marketplace's direct Exterior/Interior photo browsing is a differentiating feature and should be measured.

Track:

```text
EXTERIOR_VIEWED
INTERIOR_VIEWED

PHOTO_COUNT_VIEWED
PHOTO_SWIPE
```

Potential future findings might include:

```text
Buyers who view interior photos are more likely to enquire.
```

or:

```text
Listings with 10+ useful interior images receive more watchlists.
```

This information can later feed the Seller Coach.

---

# 17. Buyer Intent Hierarchy

Not all interactions have equal value.

A useful conceptual hierarchy is:

```text
LOW INTENT

Listing impression
Listing view
Photo interaction
```

then:

```text
MEDIUM INTENT

Specifications viewed
History viewed
Compare
Like
```

then:

```text
HIGH INTENT

Watchlist
Return to same vehicle
Seller profile viewed
Share
```

then:

```text
VERY HIGH INTENT

Message seller
Make offer
Request viewing
Reveal phone number
```

and finally:

```text
CONVERSION

Viewing completed
Vehicle sold
```

---

# 18. Buyer Intent Score

A Buyer Intent Score can eventually be calculated from raw events.

Example only:

```text
Listing view                 +1
View >60 seconds             +2
Interior photos viewed       +1
Specifications viewed        +1
Compare                      +3
Like                         +2
Watch                        +5
Return to listing            +4
Message seller              +10
Viewing request             +20
```

Do not over-invest in the exact scoring model initially.

The important requirement is to store the underlying events.

The scoring model can then evolve without losing historical data.

---

# 19. Repeated Interest

Track repeated engagement with:

```text
Listing
Derivative
Generation
Model
Make
```

Example:

```text
User viewed 14 BMW M4 G82 vehicles over 9 days.
```

This is more meaningful than:

```text
User viewed 14 cars.
```

Because the vehicle catalogue is structured, engagement can be aggregated across catalogue entities.

---

# 20. User Interest Profile

Over time, user behaviour can generate an internal interest profile.

Example:

```json
{
  "makes": {
    "BMW": 0.82,
    "Porsche": 0.41
  },
  "models": {
    "BMW M4": 0.91
  },
  "generations": {
    "G82": 0.94
  },
  "attributes": {
    "AWD": 0.78,
    "500_plus_bhp": 0.71,
    "automatic": 0.64
  }
}
```

Potential signals include:

```text
Makes
Models
Generations
Derivatives
Price ranges
Body styles
Fuel
Transmission
Drivetrain
Power
Colours
Equipment
Distance
```

This can later power:

```text
For You
Recommended cars
Saved-search suggestions
Price-drop recommendations
Similar cars
```

---

# 21. Recommendation Analytics

Every recommendation should have context.

Recommended fields:

```text
recommendation_id
algorithm_version
listing_id
position
surface
```

Events:

```text
RECOMMENDATION_IMPRESSION
RECOMMENDATION_CLICK
RECOMMENDATION_LIKE
RECOMMENDATION_WATCH
RECOMMENDATION_ENQUIRY
```

This allows recommendation algorithms to be compared over time.

Even if the initial recommendation algorithm is simple, collecting this information creates the dataset needed to improve it later.

---

# 22. Discover Feed Analytics

The mobile Discover feed should have dedicated analytics.

Recommended events:

```text
DISCOVER_SESSION_STARTED

CAR_IMPRESSION
CAR_SKIPPED
CAR_DWELL_TIME

PHOTO_SWIPED
INTERIOR_SELECTED

LIKE
WATCH
DETAIL_OPENED
SHARE

DISCOVER_SESSION_ENDED
```

Useful metrics:

```text
Cars viewed per session
Average seconds per car
Skip rate
Like rate
Watch rate
Detail-open rate
Share rate
Enquiry rate
```

Eventually the most valuable question becomes:

> Which Discover behaviour predicts a meaningful marketplace action such as a watchlist, enquiry or viewing request?

That can become an input to recommendation ranking.

---

# 23. Seller Listing Funnel

Each listing should have a measurable funnel.

```text
SEARCH IMPRESSIONS
        ↓
FEED IMPRESSIONS
        ↓
VEHICLE VIEWS
        ↓
LIKES
        ↓
WATCHLISTS
        ↓
ENQUIRIES
        ↓
VIEWING REQUESTS
        ↓
SOLD
```

Metrics can include:

```text
Impression → View CTR
View → Like rate
View → Watch rate
View → Enquiry rate
Enquiry → Viewing rate

Time to first view
Time to first watch
Time to first enquiry
Time to first viewing
Days to sale
```

This becomes the foundation for:

```text
Advert Performance Score
Seller Dashboard
AI Seller Coach
```

---

# 24. Seller Behaviour Tracking

Track the seller journey as well as the buyer journey.

Recommended events:

```text
SELL_STARTED

REGISTRATION_LOOKUP
VEHICLE_CONFIRMED

ADVERT_STEP_STARTED
ADVERT_STEP_COMPLETED
ADVERT_ABANDONED

PHOTO_UPLOADED
PHOTO_DELETED
PHOTO_REORDERED

AI_DESCRIPTION_GENERATED
AI_DESCRIPTION_ACCEPTED
AI_DESCRIPTION_EDITED

AI_PRICE_VIEWED
AI_PRICE_ACCEPTED

ADVERT_PREVIEWED
ADVERT_PUBLISHED

PRICE_CHANGED

ADVERT_PAUSED
ADVERT_BOOSTED

ADVERT_MARKED_RESERVED
ADVERT_MARKED_SOLD
```

This allows funnel analysis such as:

```text
Sell My Car opened
    ↓
Registration entered
    ↓
Vehicle confirmed
    ↓
Details completed
    ↓
Photos uploaded
    ↓
Price set
    ↓
Preview
    ↓
Published
```

You may discover, for example:

```text
27% of sellers abandon during photo upload.
```

That is directly actionable product information.

---

# 25. Advert Creation Step Tracking

Every advert wizard step should have:

```text
step_name
started_at
completed_at
duration
abandoned
```

Suggested steps:

```text
VEHICLE
DETAILS
PHOTOS
EQUIPMENT
HISTORY
DESCRIPTION
PRICE
REVIEW
PUBLISH
```

This makes it possible to optimise the seller experience based on real friction.

---

# 26. AI Analytics

AI is expected to be a major product feature, so AI interactions need dedicated analytics.

Recommended events:

```text
AI_SEARCH_STARTED
AI_SEARCH_COMPLETED
AI_SEARCH_FAILED

AI_QUESTION_ASKED
AI_RESPONSE_SHOWN

AI_ADVERT_GENERATED
AI_ADVERT_ACCEPTED
AI_ADVERT_REGENERATED
AI_ADVERT_EDITED

AI_PRICE_RECOMMENDATION_SHOWN
AI_PRICE_RECOMMENDATION_ACCEPTED

AI_SELLER_RECOMMENDATION_SHOWN
AI_SELLER_RECOMMENDATION_ACTIONED
```

Also record operational metadata where appropriate:

```text
AI feature
Model
Latency
Success/failure
Token usage
Estimated cost
```

This allows analysis such as:

```text
AI Search costs £0.008 per session
and produces significantly more enquiries.
```

or:

```text
A particular AI feature has high cost but very little usage.
```

AI should be evaluated on both:

```text
User value
Cost
```

---

# 27. Marketing Attribution to Meaningful Outcomes

Do not optimise marketing only for:

```text
Clicks
Visitors
Registrations
```

The useful acquisition funnel is closer to:

```text
Campaign
    ↓
Visitor
    ↓
Search
    ↓
Vehicle view
    ↓
Watchlist
    ↓
Enquiry
    ↓
Viewing
    ↓
Sale
```

Example:

```text
Google Ads

£1,000 spend

4,800 visitors
1,400 engaged buyers
410 watchlists
96 enquiries
24 viewing requests
8 attributed sales
```

This is the information needed to decide whether a marketing channel deserves additional budget.

---

# 28. SEO Analytics

The catalogue creates an opportunity for large numbers of useful organic landing pages.

Every landing page should have a page type.

Example:

```text
HOME
SEARCH
MAKE
MODEL
GENERATION
DERIVATIVE
RESEARCH
LISTING
DEALER
```

Associate catalogue pages with their catalogue IDs.

Example reporting:

```text
BMW M4 G82

12,400 organic visits
3,100 search continuations
1,840 listing views
241 watchlists
51 enquiries
```

This helps determine which catalogue and research areas deserve additional content and development.

---

# 29. Retention Metrics

Monitor standard retention:

```text
D1
D7
D30
```

But behavioural retention cohorts are often more useful.

Examples:

```text
Users who added a car to Watchlist:
What percentage return within 7 days?

Users who used AI Search:
What percentage return?

Users who used Discover:
What percentage later perform a conventional search?

Users who sent an enquiry:
What percentage continue browsing?
```

These metrics help distinguish genuine marketplace value from novelty engagement.

---

# 30. Marketplace Health

The internal dashboard should eventually cover four broad groups.

| Acquisition | Buyer | Supply | Marketplace |
|---|---|---|---|
| Visitors | Searches/user | Live listings | Buyer:seller ratio |
| Traffic source | Cars viewed | New listings | Searches/listing |
| Campaign | Watchlists | Advert completion | Enquiries/listing |
| Acquisition cost | Enquiries | Seller retention | Time to first enquiry |
| Organic traffic | D7 retention | Days to sale | Search success |
| Registration rate | Viewing requests | Price changes | Zero-result rate |

Break metrics down by:

```text
Make
Model
Generation
Derivative
Price band
Region
Seller type
Acquisition source
Device
Web/mobile
```

---

# 31. Important Business Metrics

Initial executive/business metrics should include:

```text
Daily active users
Weekly active users
Monthly active users

New visitors
Returning visitors

Registrations

Searches
Search success rate
Zero-result search rate

Live listings
New listings
Listings marked sold

Listing impressions
Listing views

Likes
Watchlists

Enquiries
Viewing requests

Average time to first enquiry
Average days to sale
```

Later add:

```text
Buyer acquisition cost
Seller acquisition cost
Revenue per seller
Revenue per listing
Paid boost conversion
Dealer retention
Buyer retention
Seller retention
```

---

# 32. Raw Analytics Event Table

Do not create a separate database table for every event initially.

Use a flexible central event table.

Example:

```text
analytics_events
```

Suggested structure:

```text
id

event_name
occurred_at

anonymous_id
session_id
user_id

listing_id
vehicle_id

derivative_id
generation_id
model_id
make_id

search_id
recommendation_id

source
medium
campaign

platform
device_type

properties JSONB
```

---

# 33. Example Event

Example listing impression:

```json
{
  "event_name": "LISTING_IMPRESSION",
  "occurred_at": "2026-09-12T10:30:00Z",
  "anonymous_id": "anon_123",
  "session_id": "sess_456",
  "user_id": null,
  "listing_id": "lst_789",
  "vehicle_id": "veh_789",
  "derivative_id": "bmw-m4-g82-competition-xdrive",
  "generation_id": "g82",
  "model_id": "m4",
  "make_id": "bmw",
  "search_id": "srch_123",
  "recommendation_id": null,
  "source": "google",
  "medium": "organic",
  "campaign": null,
  "platform": "web",
  "device_type": "mobile",
  "properties": {
    "surface": "SEARCH",
    "position": 4,
    "sort": "PRICE_ASC"
  }
}
```

---

# 34. Indexed Columns vs JSONB

Do not store everything inside JSONB.

Important dimensions should be real indexed columns.

Examples:

```text
occurred_at
event_name

anonymous_id
session_id
user_id

listing_id
vehicle_id

derivative_id
generation_id
model_id
make_id

search_id
recommendation_id
```

Use:

```text
properties JSONB
```

for secondary event-specific information.

Examples:

```text
position
surface
sort mode
photo number
wizard step
AI model
```

This provides flexibility without making common analytics queries unnecessarily expensive.

---

# 35. Analytics Aggregation

Seller dashboards should not repeatedly scan the entire raw analytics table.

Use BullMQ workers to aggregate events.

Example:

```text
Raw analytics events
        ↓
BullMQ analytics worker
        ↓
Daily aggregate tables
```

---

# 36. Listing Daily Metrics

Create:

```text
listing_metrics_daily
```

Suggested fields:

```text
date
listing_id

search_impressions
feed_impressions
recommendation_impressions

views
unique_viewers

likes
watchlists
shares

messages
viewing_requests

average_dwell_seconds
```

This allows seller dashboards to query small, efficient aggregate tables.

---

# 37. Other Future Aggregate Tables

Potential tables include:

```text
traffic_metrics_daily

search_metrics_daily

catalogue_metrics_daily

seller_metrics_daily

marketplace_metrics_daily

ai_metrics_daily
```

These do not all need to exist in V1.

Create them when reporting requirements justify them.

---

# 38. Analytics Architecture

Recommended initial architecture:

```text
Web ───────┐
           │
Mobile ────┼────► Analytics API
           │             │
Backend ───┘             ▼
                  analytics_events
                     PostgreSQL
                         │
                         ▼
                    BullMQ worker
                         │
                ┌────────┴────────┐
                ▼                 ▼
         Daily aggregates    User signals
                │                 │
                ▼                 ▼
         Admin Analytics     Recommendations
         Seller Analytics    Personalisation
```

This fits the low-cost single-server architecture.

No separate analytics infrastructure is required initially.

---

# 39. Environment Handling

The platform has:

```text
LOCAL
TEST
PRODUCTION
```

Analytics data must remain isolated between environments.

```text
LOCAL
→ development/test analytics only

TEST
→ test analytics only

PRODUCTION
→ real marketplace analytics
```

Never allow Test events to pollute Production reporting.

Every event may also include:

```text
environment
```

as an additional safety/debugging field, although separate databases should already provide environment isolation.

---

# 40. Event Naming

Use consistent event names from the beginning.

Recommended style:

```text
UPPER_SNAKE_CASE
```

Examples:

```text
LISTING_VIEW
WATCHLIST_ADD
SEARCH_PERFORMED
AI_SEARCH_COMPLETED
ADVERT_PUBLISHED
```

Do not allow developers to create variations such as:

```text
carViewed
vehicle_view
view-car
listingOpened
```

for the same logical action.

Maintain a central analytics event definition package.

---

# 41. Shared Analytics Types

Because the platform uses TypeScript, define analytics events centrally.

Example package:

```text
packages/analytics-types
```

Conceptually:

```ts
type AnalyticsEventName =
  | "LISTING_IMPRESSION"
  | "LISTING_VIEW"
  | "WATCHLIST_ADD"
  | "SEARCH_PERFORMED"
  | "SEARCH_ZERO_RESULTS"
  | "MESSAGE_STARTED"
  | "VIEWING_REQUESTED";
```

Web, mobile and backend should use the same definitions.

This reduces analytics-data fragmentation.

---

# 42. Event Versioning

Analytics schemas will evolve.

Consider adding:

```text
event_version
```

Example:

```text
LISTING_VIEW
version 1
```

If the event payload changes substantially later:

```text
LISTING_VIEW
version 2
```

This is preferable to silently changing the meaning of historical events.

---

# 43. Privacy and Data Minimisation

Analytics should be designed with privacy in mind.

General principles:

```text
Collect data that has a clear product/business purpose.

Avoid storing unnecessary personal information inside analytics properties.

Do not put passwords, authentication tokens or private message contents into analytics.

Keep identity information separate where possible.

Define retention rules.

Respect consent requirements for marketing/tracking technologies.

Provide account/data deletion handling where legally required.
```

The marketplace's own operational events and external advertising/marketing tracking may have different legal/consent requirements and should be treated accordingly.

---

# 44. What to Track From Day One

The highest-priority V1 events are:

```text
SESSION_STARTED

PAGE_VIEW

REGISTER
LOGIN

SEARCH_PERFORMED
SEARCH_ZERO_RESULTS
SEARCH_RESULT_CLICKED
SEARCH_SAVED

LISTING_IMPRESSION
LISTING_VIEW

PHOTO_EXTERIOR_VIEW
PHOTO_INTERIOR_VIEW

SPECIFICATIONS_VIEWED
HISTORY_VIEWED

LIKE
WATCHLIST_ADD
COMPARE_ADD
SHARE

MESSAGE_STARTED
VIEWING_REQUESTED

DISCOVER_SESSION_STARTED
CAR_IMPRESSION
CAR_SKIPPED
DETAIL_OPENED

SELL_STARTED
REGISTRATION_LOOKUP
VEHICLE_CONFIRMED

ADVERT_STEP_STARTED
ADVERT_STEP_COMPLETED
ADVERT_ABANDONED

PHOTO_UPLOADED

AI_ADVERT_GENERATED
AI_ADVERT_ACCEPTED

ADVERT_PUBLISHED
PRICE_CHANGED
ADVERT_MARKED_SOLD

AI_SEARCH_STARTED
AI_SEARCH_COMPLETED
AI_SEARCH_FAILED
```

Also capture attribution and catalogue IDs with these events wherever relevant.

---

# 45. What Can Wait

Do not delay launch because every possible interaction is not tracked.

Lower-priority analytics can be added later, such as:

```text
Every individual UI button click
Detailed mouse movement
Heatmaps
Session replay
Extremely detailed photo swipe telemetry
Complex attribution modelling
Sophisticated ML intent scoring
Advanced recommendation models
Separate analytics warehouse
Real-time streaming analytics
```

Start with meaningful marketplace events.

---

# 46. Recommended V1 Analytics Stack

For the low-cost initial architecture:

```text
EVENT COLLECTION
Own NestJS analytics endpoint/service

EVENT TYPES
Shared TypeScript package

VALIDATION
Zod

RAW STORAGE
PostgreSQL

FLEXIBLE EVENT PROPERTIES
JSONB

AGGREGATION
BullMQ worker

QUEUE
Redis

SELLER REPORTING
PostgreSQL aggregate tables

ADMIN REPORTING
Internal web dashboard

PERSONALISATION
Derived user-interest signals

EXTERNAL ANALYTICS PLATFORM
Not required initially
```

This keeps the analytics system inside the existing infrastructure.

---

# 47. Strategic Value of the Dataset

The analytics dataset becomes more valuable as the marketplace grows.

It can eventually power:

```text
Seller Performance Score

AI Seller Coach

Price recommendations

Demand analysis

Inventory recommendations

Personalised Discover feed

Similar-car recommendations

Buyer Intent Score

Search improvements

Catalogue prioritisation

Dealer intelligence

Marketing optimisation

Fraud detection signals

Vehicle demand forecasting
```

The combination of:

```text
Vehicle catalogue
+
Search behaviour
+
Listing impressions
+
Buyer engagement
+
Seller performance
+
Enquiries
+
Sales outcomes
```

can become one of the marketplace's most important proprietary assets.

---

# 48. Core Recommendation

The V1 analytics system should focus especially on:

```text
Traffic attribution

Searches
Search criteria
Zero-result searches

Listing impressions
Listing views

Photo engagement
Exterior vs Interior behaviour

Likes
Watchlists
Comparisons

Enquiries
Viewing requests

Seller advert funnel

AI feature usage

Discover feed behaviour

Repeat engagement

Catalogue entity engagement
```

These events provide enough information to understand:

```text
How traffic reaches the marketplace
What buyers actually want
What inventory is missing
What makes users engage
What creates enquiries
What makes listings successful
What catalogue data matters
Which AI features work
How recommendations should improve
Where marketing money should be spent
```

The guiding principle is:

> **Store meaningful raw behavioural events early, derive business metrics from them later, and avoid unnecessary analytics infrastructure until real scale requires it.**
