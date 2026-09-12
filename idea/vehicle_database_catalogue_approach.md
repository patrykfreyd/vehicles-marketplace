# Vehicle Database & Catalogue Approach

## 1. Objective

The vehicle database should support two types of users at the same time:

-   A normal buyer who wants to search simply, for example: **black Audi
    TT, automatic, under £25,000**.
-   A car enthusiast who wants to search much more precisely, for
    example: **G82 BMW M4 Competition xDrive, Marina Bay Blue, S58,
    carbon bucket seats**.

The goal is **not** to create an enormous technical database containing
every possible factory specification from day one. The goal is to create
a manageable catalogue with enough enthusiast-level detail to make the
marketplace feel as though it genuinely understands cars.

The approach should also keep external vehicle-data costs as close to
**£0** as practical.

------------------------------------------------------------------------

# 2. Core Design Principle

Separate three different types of data.

## 2.1 Vehicle Catalogue

This describes a type/version of car.

Example:

``` text
BMW
M4
G82
M4 Competition xDrive
3.0 Twin Turbo Petrol
S58
503 bhp
650 Nm
Automatic
AWD
```

This information is shared by every vehicle of that derivative.

## 2.2 Physical Vehicle

This describes the actual individual car.

Example:

``` text
2023
22,150 miles
Marina Bay Blue Metallic
Silverstone interior
2 owners
Full service history
Carbon bucket seats
```

This information belongs to the actual vehicle being sold.

## 2.3 Marketplace Listing

This describes the advert.

Example:

``` text
Price: £56,995
Seller: Private
Status: Live
Location: SK
Description
Photos
Advert performance
```

These should remain separate concepts in the database.

A **BMW M4 Competition xDrive** is a derivative.

A particular registered BMW M4 is a **vehicle**.

The advert created to sell that vehicle is a **listing**.

------------------------------------------------------------------------

# 3. Recommended Catalogue Hierarchy

Keep the initial hierarchy simple:

``` text
Make
└── Model
    └── Generation
        └── Derivative
```

Example:

``` text
BMW
└── M4
    ├── F82
    │   ├── M4
    │   ├── M4 Competition
    │   └── M4 CS
    │
    └── G82
        ├── M4
        ├── M4 Competition
        ├── M4 Competition xDrive
        ├── M4 CS
        └── M4 CSL
```

Generation is particularly important for enthusiast users.

Examples include:

``` text
BMW M3: E46 / E90 / F80 / G80
BMW M4: F82 / G82
Audi TT: 8N / 8J / 8S
Porsche 911: 997 / 991 / 992
Volkswagen Golf: Mk6 / Mk7 / Mk7.5 / Mk8
```

------------------------------------------------------------------------

# 4. Basic Enthusiast-Friendly Catalogue Fields

Do not attempt to catalogue hundreds of attributes per derivative.

A good V1 target is approximately **25--35 meaningful fields per
derivative**.

## 4.1 Identity

Store:

``` text
Make
Model
Generation
Facelift / revision
Derivative
Trim where useful
Production start year
Production end year
Special edition flag/name
```

Example:

``` text
Make: BMW
Model: M4
Generation: G82
Revision: Pre-LCI
Derivative: M4 Competition xDrive
Production start: 2021
```

## 4.2 Body

Store:

``` text
Body style
Doors
Seats
```

Examples:

``` text
Coupe
Saloon
Estate
Hatchback
Convertible
SUV
```

## 4.3 Engine

Store:

``` text
Fuel type
Engine capacity cc
Cylinders
Configuration
Aspiration
Engine family/code where useful
Power bhp
Torque Nm
```

Example:

``` text
Fuel: Petrol
Capacity: 2993 cc
Cylinders: 6
Configuration: Inline-6
Aspiration: Twin Turbo
Engine family: S58
Power: 503 bhp
Torque: 650 Nm
```

Engine family is especially useful to enthusiasts.

Examples:

``` text
BMW B58
BMW S58
BMW S65
Honda K20
Toyota 2JZ
VW EA888
Mercedes M177
```

There is no need initially to catalogue bore, stroke, compression ratio,
turbo model or other very deep engine engineering data.

## 4.4 Transmission

Store:

``` text
Transmission type
Number of gears
```

Controlled types should include:

``` text
MANUAL
AUTOMATIC
DCT
CVT
```

Do not initially worry about exact gearbox codes.

## 4.5 Drivetrain

Store a controlled value:

``` text
FWD
RWD
AWD
```

Optionally also store the manufacturer's name:

``` text
Canonical: AWD
Manufacturer name: M xDrive
```

This enables enthusiast searches such as:

``` text
Manual
RWD
300+ bhp
```

## 4.6 Performance

For V1, store:

``` text
0–62 mph
Top speed
```

Power and torque already sit with the engine data.

Do not initially spend time cataloguing quarter-mile times, 100--200
km/h, Nürburgring times or braking distances.

------------------------------------------------------------------------

# 5. Colour Approach

Colour deserves slightly more detail because it provides a noticeable
enthusiast benefit for relatively little catalogue effort.

Store two main levels.

## 5.1 Basic Colour Family

Examples:

``` text
Black
White
Blue
Red
Green
Grey
Silver
Yellow
Orange
Purple
Brown
Beige
```

This supports normal searches such as:

> Blue BMW M4

## 5.2 Manufacturer Paint Name

Also store the actual manufacturer colour where known.

Example:

``` text
Colour family: Blue
Manufacturer colour: Marina Bay Blue Metallic
Paint code: C1K
```

This supports enthusiast searches such as:

> Marina Bay Blue M4 Competition

Use aliases where helpful:

``` text
Marina Bay Blue Metallic
Marina Bay Blue
MBB
C1K
```

All can resolve to the same canonical colour.

## 5.3 Keep Paint Separate From Derivatives Initially

Do not initially try to catalogue exactly which paint was available on
every derivative in every production month.

Instead maintain manufacturer colour catalogues.

Example:

``` text
BMW Colours
Audi Colours
Mercedes-Benz Colours
Porsche Colours
```

The seller can select the exact paint for the physical vehicle.

Availability-by-derivative can be added later if required.

------------------------------------------------------------------------

# 6. Interior Data

Keep this simple as well.

For the physical vehicle, store:

``` text
Interior colour
Upholstery/material
Manufacturer upholstery name where available
```

Example:

``` text
Colour: Silverstone
Upholstery: Full Merino Leather
Manufacturer name: Silverstone / Black Full Merino Leather
```

This allows searches such as:

> Marina Bay Blue M4 with Silverstone interior

without requiring a complete factory interior database from day one.

------------------------------------------------------------------------

# 7. Equipment Strategy

Do **not** catalogue every standard feature for every derivative
initially.

This would create a huge amount of work.

Instead create a global catalogue of approximately **20--30
desirable/searchable features**.

Examples:

``` text
Carbon bucket / sports seats
Heated front seats
Ventilated seats
Memory seats
Adaptive cruise control
Head-up display
Apple CarPlay
Android Auto
Premium audio
Panoramic roof / sunroof
Matrix / laser headlights
Reverse camera
360 camera
Parking assist
Adaptive suspension
Limited-slip differential
Carbon ceramic brakes
Performance / sports exhaust
Tow bar
Keyless entry
Wireless charging
Heated steering wheel
Rear-wheel steering
Driver assistance package
```

The catalogue does not initially need to know whether every feature was
standard or optional for a particular derivative.

Instead:

``` text
Catalogue tells us:
BMW M4 Competition xDrive
G82
S58
503 bhp
AWD
Automatic
```

The seller tells us:

``` text
Marina Bay Blue
Silverstone interior
Carbon bucket seats
Harman Kardon
Head-up display
360 camera
```

This significantly reduces catalogue-building effort.

------------------------------------------------------------------------

# 8. Manufacturer Equipment Names

Keep a canonical equipment name while allowing manufacturer-specific
names.

Example:

``` text
Canonical feature:
premium_audio

BMW name:
Harman Kardon Surround Sound System
```

Another example:

``` text
Canonical feature:
carbon_bucket_seats

BMW names:
M Carbon Bucket Seats
M Carbon Seats
```

This allows consistent search while still displaying terminology
enthusiasts recognise.

------------------------------------------------------------------------

# 9. Vehicle-Specific Data

The following information should normally come from the seller,
government lookup, history data or the physical vehicle rather than the
master derivative catalogue:

``` text
Registration
Year / first registration
Mileage
Basic colour
Manufacturer paint colour
Interior colour
Upholstery
Important equipment
Owners / keepers
Service history
Import status
Modifications
MOT information
Accident/write-off information where available
```

This distinction is one of the biggest ways to reduce catalogue
workload.

------------------------------------------------------------------------

# 10. Modifications

For enthusiast vehicles, modifications are useful, but they should not
overwrite factory specifications.

Example:

``` text
Factory power: 503 bhp
Seller claimed current power: 580 bhp
Modified: Yes
```

A simple modification structure is enough initially:

``` text
ECU / tune
Exhaust
Intake
Turbo / supercharger
Suspension
Brakes
Wheels
Bodywork
Interior
Audio
Other
```

For each modification, optionally store:

``` text
Category
Brand
Product/name
Description
```

------------------------------------------------------------------------

# 11. Vehicle History

Keep the V1 history fields practical:

``` text
Mileage
Owners / previous keepers
Service history type
Main dealer history yes/no
Service records available
Imported yes/no
Import country where relevant
Accident declared
Write-off category
```

Possible service history values:

``` text
Full
Partial
None
Unknown
```

Do not make the master catalogue responsible for this data.

------------------------------------------------------------------------

# 12. What to Postpone

The following are interesting but should **not** be part of the initial
catalogue-building workload:

``` text
Bore and stroke
Compression ratio
Turbo model
Differential model/code
Suspension geometry
Damper model
Brake disc diameter
Caliper piston count
Wheel offset
Exact factory tyre model
Gearbox code
Final drive ratio
Production factory
Production volumes
Original option prices
Original MSRP
Exact factory option codes
Wheel design codes
Homologation details
100–200 km/h
Quarter-mile
Nürburgring times
Detailed chassis engineering
```

These can be added selectively later.

------------------------------------------------------------------------

# 13. Search Experience Enabled by the Basic Catalogue

Even this simplified catalogue supports significantly better search than
a conventional marketplace.

## Normal Buyer

A normal user could search:

``` text
Audi TT
Black
Automatic
Under £25,000
Under 50,000 miles
```

## Interested Buyer

A more knowledgeable buyer could search:

``` text
BMW M4 Competition
2022+
Blue
xDrive
Under 30,000 miles
```

## Enthusiast

An enthusiast could search:

``` text
BMW
M4
G82
Competition xDrive
S58
500+ bhp
AWD
Marina Bay Blue
Carbon bucket seats
```

Another enthusiast search could be:

``` text
Manual
RWD
Coupe
6 cylinders
300+ bhp
Under £40,000
```

This is the level of enthusiast functionality to target for V1.

------------------------------------------------------------------------

# 14. Normal Search vs Enthusiast Search

Do not expose every technical field in the normal search interface.

Use two levels.

## Standard Filters

Examples:

``` text
Make
Model
Price
Year
Mileage
Distance
Fuel
Transmission
Body style
Colour
```

## Advanced / Enthusiast Filters

Examples:

``` text
Generation
Derivative
Facelift/revision
Engine family
Engine capacity
Cylinder count
Aspiration
Power
Torque
Drivetrain
0–62
Manufacturer paint colour
Interior colour
Selected equipment
Modifications
```

This keeps the marketplace approachable while still providing
significant depth.

------------------------------------------------------------------------

# 15. Zero/Low-Cost Catalogue Source Strategy

The catalogue should be built using a combination of:

``` text
Open/public vehicle datasets
UK government vehicle data
DVLA vehicle lookup
DVSA/MOT data where available and appropriate
Open-source vehicle databases
Manufacturer information
AI-assisted research/extraction
Seller-supplied information
Your own corrections and marketplace data
```

The aim is to avoid depending on expensive commercial vehicle-data APIs
during the initial stage.

------------------------------------------------------------------------

# 16. Open Data as the Bootstrap

Start with open-source/public data to generate the basic:

``` text
Makes
Models
Basic fuel information
Body styles where available
Production/year information where available
UK vehicle prevalence where available
```

Treat imported data as **raw source material**, not as your final
taxonomy.

The process should be:

``` text
Open dataset
      ↓
Raw import
      ↓
Cleaning
      ↓
Normalisation
      ↓
Canonical catalogue
```

Keep the original source files so imports can be reproduced or corrected
later.

------------------------------------------------------------------------

# 17. Role of DVLA

DVLA should be used as a **vehicle lookup and validation/enrichment
source**, not as the entire vehicle catalogue.

It can help identify/validate information such as:

``` text
Registration
Make
Fuel
Engine capacity
First registration
Colour
CO2 / other available vehicle facts
```

But it will not provide the full enthusiast structure required for:

``` text
G82
M4 Competition xDrive
S58
503 bhp
Carbon bucket seats
Marina Bay Blue
```

Therefore the architecture should be:

``` text
Your catalogue
+
DVLA lookup/validation
```

rather than:

``` text
DVLA = catalogue
```

------------------------------------------------------------------------

# 18. Seller Vehicle Identification

A zero/low-cost seller flow does not need perfect automatic derivative
identification.

Use:

``` text
Seller enters registration
        ↓
DVLA lookup
        ↓
Identify basic vehicle facts
        ↓
Match against your catalogue
        ↓
Produce likely derivatives
        ↓
Seller confirms correct version
```

Example:

DVLA/basic matching identifies:

``` text
BMW
3 Series
2022
2998 cc
Petrol
```

Your catalogue may produce:

``` text
M340i xDrive
M340i xDrive M Sport
M340i xDrive M Sport Pro
```

Ask:

> Which version is your car?

If uncertain, provide an **I'm not sure** option and ask simple
distinguishing questions.

Seller confirmation becomes useful data for improving the matcher later.

------------------------------------------------------------------------

# 19. Build Manufacturer by Manufacturer

Do not attempt to perfect the entire vehicle market simultaneously.

Build manufacturers progressively.

Example order could be based on likely UK marketplace volume:

``` text
BMW
Audi
Mercedes-Benz
Volkswagen
Ford
Toyota
Vauxhall
Nissan
Kia
Hyundai
Skoda
Volvo
Porsche
Tesla
...
```

Within each manufacturer:

``` text
Manufacturer
      ↓
Models
      ↓
Generations
      ↓
Derivatives
      ↓
Core technical fields
```

Prioritise common vehicles and enthusiast-relevant models before obscure
low-volume derivatives.

------------------------------------------------------------------------

# 20. Catalogue Completeness Levels

A useful way to control workload is to classify catalogue records by
completeness.

## Level 1 --- Basic Identity

``` text
Make
Model
Generation
Production years
Fuel
Body
```

Enough to identify/list a vehicle.

## Level 2 --- Enthusiast Derivative

Add:

``` text
Exact derivative
Engine capacity
Cylinders
Aspiration
Engine family where known
Power
Torque
Transmission
Drivetrain
```

This should be the main V1 target.

## Level 3 --- Enhanced

Add:

``` text
0–62
Top speed
Facelift/revision
Doors
Seats
```

## Level 4 --- Rich

Later add selectively:

``` text
Detailed factory equipment
Option packages
Dimensions
Economy
Weights
More detailed engineering data
```

The marketplace does not need Level 4 coverage for every vehicle before
launch.

------------------------------------------------------------------------

# 21. Use AI to Build the Catalogue

AI should significantly reduce manual catalogue work.

However, AI should be used for:

``` text
Research assistance
Data extraction
Normalisation
Generating candidate derivatives
Mapping aliases
Identifying probable duplicates
Converting manufacturer data into your schema
Finding missing fields
```

AI should **not** be treated as the factual source of truth.

A good workflow is:

``` text
Source information
      ↓
AI extraction
      ↓
Structured JSON
      ↓
Validation
      ↓
Human/source review
      ↓
Approved catalogue
```

------------------------------------------------------------------------

# 22. AI Catalogue Status

Every AI-created or imported record should have data-quality metadata.

Example:

``` json
{
  "status": "draft",
  "confidence": 0.92,
  "reviewed": false,
  "source_refs": []
}
```

Possible statuses:

``` text
IMPORTED
AI_DRAFT
REVIEW_REQUIRED
SOURCE_CONFIRMED
APPROVED
DEPRECATED
```

This prevents AI-generated information from silently becoming trusted
production data.

------------------------------------------------------------------------

# 23. JSON as the Catalogue Staging Format

JSON is a good format for building the catalogue because it is:

-   Human readable
-   Easy for AI to generate/edit
-   Version-control friendly
-   Easy to validate
-   Easy to import
-   Portable

Use JSON as the **source/staging format**, not as the production
marketplace database.

Suggested repository structure:

``` text
catalogue/
│
├── schema/
│   └── catalogue.schema.json
│
├── shared/
│   ├── equipment.json
│   ├── body-types.json
│   ├── fuel-types.json
│   └── transmission-types.json
│
├── bmw/
│   ├── manufacturer.json
│   ├── colours.json
│   ├── 1-series.json
│   ├── 3-series.json
│   ├── m3.json
│   └── m4.json
│
├── audi/
│   ├── manufacturer.json
│   ├── colours.json
│   ├── a3.json
│   ├── a4.json
│   ├── tt.json
│   └── rs3.json
│
└── ...
```

Avoid one enormous JSON file containing the entire vehicle market.

------------------------------------------------------------------------

# 24. Example Model Catalogue JSON

A simplified BMW M4 catalogue file could look like:

``` json
{
  "make": "BMW",
  "model": "M4",
  "generations": [
    {
      "code": "F82",
      "start_year": 2014,
      "end_year": 2020,
      "derivatives": [
        {
          "name": "M4",
          "fuel": "PETROL",
          "engine_capacity_cc": 2979,
          "engine_family": "S55",
          "cylinders": 6,
          "configuration": "INLINE_6",
          "aspiration": "TWIN_TURBO",
          "power_bhp": 425,
          "torque_nm": 550,
          "transmissions": ["MANUAL", "DCT"],
          "drivetrain": "RWD"
        },
        {
          "name": "M4 Competition",
          "fuel": "PETROL",
          "engine_capacity_cc": 2979,
          "engine_family": "S55",
          "cylinders": 6,
          "configuration": "INLINE_6",
          "aspiration": "TWIN_TURBO",
          "power_bhp": 444,
          "torque_nm": 550,
          "drivetrain": "RWD"
        }
      ]
    },
    {
      "code": "G82",
      "start_year": 2021,
      "end_year": null,
      "derivatives": [
        {
          "name": "M4 Competition xDrive",
          "fuel": "PETROL",
          "engine_capacity_cc": 2993,
          "engine_family": "S58",
          "cylinders": 6,
          "configuration": "INLINE_6",
          "aspiration": "TWIN_TURBO",
          "power_bhp": 503,
          "torque_nm": 650,
          "transmissions": ["AUTOMATIC"],
          "drivetrain": "AWD"
        }
      ]
    }
  ]
}
```

------------------------------------------------------------------------

# 25. Controlled Values

Do not allow imported data or AI to create many different names for the
same concept.

For example, drivetrain should not become:

``` text
AWD
All Wheel Drive
Four Wheel Drive
4WD
4x4
M xDrive
```

Internally use:

``` text
FWD
RWD
AWD
```

and optionally store:

``` text
manufacturer_name: "M xDrive"
```

Use controlled values for important searchable fields.

## Fuel

``` text
PETROL
DIESEL
HYBRID
PHEV
ELECTRIC
HYDROGEN
```

## Transmission

``` text
MANUAL
AUTOMATIC
DCT
CVT
```

## Body

``` text
HATCHBACK
SALOON
ESTATE
COUPE
CONVERTIBLE
SUV
MPV
PICKUP
```

This makes filtering and AI search much more reliable.

------------------------------------------------------------------------

# 26. Aliases

Aliases should exist from the beginning.

Example generation:

``` json
{
  "name": "G82",
  "aliases": [
    "BMW G82",
    "G82 M4",
    "M4 G82"
  ]
}
```

Example derivative:

``` json
{
  "name": "M4 Competition xDrive",
  "aliases": [
    "M4 Comp xDrive",
    "M4 Competition AWD",
    "G82 Comp xDrive"
  ]
}
```

Example engine:

``` json
{
  "name": "S58",
  "aliases": [
    "BMW S58",
    "S58B30"
  ]
}
```

Example paint:

``` json
{
  "name": "Marina Bay Blue Metallic",
  "aliases": [
    "Marina Bay Blue",
    "MBB",
    "C1K"
  ]
}
```

Aliases make normal text search and future natural-language AI search
significantly better.

------------------------------------------------------------------------

# 27. Database From the Beginning

Do not build JSON for months and only then design the database.

JSON and the database should coexist from the beginning.

Recommended process:

``` text
Define JSON schema
      ↓
Define DB schema
      ↓
Build BMW JSON
      ↓
Validate
      ↓
Import into DB
      ↓
Test marketplace/search
      ↓
Build Audi JSON
      ↓
Validate
      ↓
Import into DB
      ↓
Repeat
```

JSON is the catalogue-building/staging representation.

PostgreSQL is the production catalogue.

------------------------------------------------------------------------

# 28. Database Structure

A practical relational structure could include:

``` text
manufacturers
models
generations
derivatives
engines
transmissions

colours
manufacturer_colours

equipment
manufacturer_equipment_aliases

vehicles
vehicle_equipment
vehicle_modifications

listings

catalogue_sources
catalogue_aliases
catalogue_imports
catalogue_validation_issues
```

The important searchable fields should exist as normal relational
columns/tables rather than one enormous JSON blob.

JSON/JSONB can still be used for flexible metadata where appropriate.

------------------------------------------------------------------------

# 29. Permanent Internal IDs

Every catalogue entity should have its own permanent internal ID.

Examples:

``` text
make_id
model_id
generation_id
derivative_id
engine_id
colour_id
equipment_id
```

Do not rely on the displayed name as the identifier.

For example:

``` text
ID:
der_bmw_m4_g82_comp_xdrive

Display name:
M4 Competition xDrive
```

If the display name changes later, existing listings remain connected to
the same derivative.

UUIDs can also be used internally.

------------------------------------------------------------------------

# 30. JSON Schema Validation

Create an actual JSON Schema for catalogue files.

Example:

``` text
catalogue.schema.json
```

Use it to validate:

-   Required fields
-   Allowed enum values
-   Data types
-   Production years
-   Numeric fields
-   Fuel values
-   Drivetrain values
-   Transmission values
-   Duplicate IDs
-   Required relationships

This prevents invalid AI output from entering the database.

For example:

Invalid:

``` json
{
  "power_bhp": "lots"
}
```

Valid:

``` json
{
  "power_bhp": 503
}
```

------------------------------------------------------------------------

# 31. Catalogue Importer

Build a repeatable importer.

Conceptually:

``` text
import_catalogue bmw/m4.json
```

The importer should:

``` text
Read JSON
      ↓
Validate schema
      ↓
Check IDs
      ↓
Check controlled values
      ↓
Detect duplicates
      ↓
Validate relationships
      ↓
Insert/update database
      ↓
Produce validation report
```

Example output:

``` text
BMW M4

2 generations
7 derivatives

✓ F82
✓ G82

Warnings:
- G82 M4 CS missing torque
- F82 M4 Competition missing top speed

0 fatal errors
```

------------------------------------------------------------------------

# 32. Catalogue Admin

Build an internal Catalogue Admin relatively early.

Example manufacturer view:

``` text
BMW                 92%
Audi                76%
Mercedes-Benz       61%
Porsche             42%
```

BMW:

``` text
1 Series            Complete
2 Series            Complete
3 Series            Complete
4 Series            Complete
5 Series            In Progress
M2                  Complete
M3                  Complete
M4                  Complete
X3                  Partial
```

M4:

``` text
F82   2014–2020   4 derivatives   Complete
G82   2021–       5 derivatives   Warning
```

An administrator should be able to:

``` text
View
Edit
Approve
Reject
Merge duplicates
Add aliases
Correct specifications
Add sources
See validation warnings
```

This will eventually be easier than editing JSON directly for every
correction.

------------------------------------------------------------------------

# 33. Catalogue Completeness Score

Track completeness per derivative.

Example:

``` text
BMW G82 M4 Competition xDrive

Identity              ✓
Generation            ✓
Production years      ✓
Engine                ✓
Power                 ✓
Torque                ✓
Transmission          ✓
Drivetrain            ✓
0–62                  ✓
Top speed             ✓
Engine family         ✓
Body                  ✓

Completeness: 100%
```

Another record might show:

``` text
Audi A4 35 TFSI

Completeness: 74%

Missing:
- Torque
- Engine family
- 0–62
```

This creates a clear catalogue improvement backlog.

------------------------------------------------------------------------

# 34. Prioritising Catalogue Work

Do not work alphabetically.

Prioritise based on:

``` text
UK prevalence
Marketplace popularity
Enthusiast interest
Expected listing volume
Catalogue incompleteness
```

A useful conceptual priority score is:

``` text
UK vehicle population
×
expected marketplace demand
×
catalogue incompleteness
```

This prevents spending significant time cataloguing extremely rare
vehicles while common models remain incomplete.

------------------------------------------------------------------------

# 35. Seller Feedback as Catalogue Data

Every seller confirmation can improve your catalogue and matching.

Store:

``` text
DVLA/basic lookup result
Candidate derivatives shown
Derivative predicted
Derivative selected by seller
Seller changed prediction yes/no
Confidence score
```

Example:

``` text
System prediction:
BMW M340i xDrive

Seller selection:
BMW M340i xDrive

Confirmed: Yes
```

Over time this becomes valuable training/validation data.

If many sellers repeatedly correct the same prediction, flag that area
for catalogue review.

------------------------------------------------------------------------

# 36. Full Example of a Listed Car

A practical API representation for a listed enthusiast vehicle could
look like:

``` json
{
  "vehicle": {
    "id": "veh_01HZX82K7Q4M",
    "registration": "AB23 XYZ",
    "year": 2023,
    "mileage_miles": 22150,
    "owners": 2,
    "uk_supplied": true,
    "imported": false
  },

  "catalogue": {
    "make": {
      "id": "bmw",
      "name": "BMW"
    },

    "model": {
      "id": "m4",
      "name": "M4"
    },

    "generation": {
      "id": "g82",
      "name": "G82",
      "revision": "Pre-LCI",
      "production_start_year": 2021,
      "production_end_year": null
    },

    "derivative": {
      "id": "bmw-m4-g82-competition-xdrive",
      "name": "M4 Competition xDrive",
      "trim": "Competition",
      "special_edition": false
    },

    "body": {
      "body_style": "Coupe",
      "doors": 2,
      "seats": 4
    },

    "engine": {
      "fuel_type": "Petrol",
      "capacity_cc": 2993,
      "capacity_litres": 3.0,
      "cylinders": 6,
      "configuration": "Inline-6",
      "aspiration": "Twin Turbo",
      "engine_family": "S58",
      "power_bhp": 503,
      "torque_nm": 650
    },

    "performance": {
      "zero_to_62_mph_seconds": 3.5,
      "top_speed_mph": 155
    },

    "transmission": {
      "type": "Automatic",
      "gears": 8
    },

    "drivetrain": {
      "type": "AWD",
      "manufacturer_name": "M xDrive"
    }
  },

  "appearance": {
    "exterior": {
      "colour_family": "Blue",
      "manufacturer_colour": "Marina Bay Blue Metallic",
      "paint_code": "C1K"
    },

    "interior": {
      "colour_family": "Silverstone",
      "manufacturer_colour": "Silverstone / Black",
      "upholstery": "Full Merino Leather"
    }
  },

  "equipment": [
    {
      "id": "carbon_bucket_seats",
      "name": "M Carbon Bucket Seats",
      "category": "Seats"
    },
    {
      "id": "head_up_display",
      "name": "Head-Up Display",
      "category": "Technology"
    },
    {
      "id": "premium_audio",
      "name": "Harman Kardon Surround Sound",
      "category": "Audio"
    },
    {
      "id": "camera_360",
      "name": "360° Camera",
      "category": "Parking"
    },
    {
      "id": "adaptive_cruise",
      "name": "Adaptive Cruise Control",
      "category": "Driver Assistance"
    },
    {
      "id": "heated_front_seats",
      "name": "Heated Front Seats",
      "category": "Comfort"
    }
  ],

  "history": {
    "service_history": {
      "type": "Full",
      "main_dealer": true,
      "records_available": true
    },

    "accident_declared": false,
    "writeoff_category": null
  },

  "modifications": {
    "modified": false,
    "items": []
  },

  "listing": {
    "id": "lst_01HZYC421Q",
    "price_gbp": 56995,
    "status": "Live",

    "seller": {
      "type": "Private",
      "verified": true
    },

    "description": "2023 BMW M4 Competition xDrive in Marina Bay Blue Metallic with Silverstone Merino leather and M Carbon Bucket Seats.",

    "location": {
      "postcode_area": "SK",
      "country": "GB"
    }
  },

  "search": {
    "keywords": [
      "BMW M4",
      "G82",
      "M4 Competition",
      "M4 Competition xDrive",
      "S58",
      "Marina Bay Blue",
      "Marina Bay Blue Metallic",
      "MBB",
      "Carbon Buckets"
    ],

    "tags": [
      "performance",
      "sports_coupe",
      "awd",
      "500_plus_bhp",
      "six_cylinder",
      "twin_turbo",
      "enthusiast",
      "carbon_bucket_seats"
    ]
  }
}
```

This is a useful API representation, but the production database should
remain relational for important searchable data.

------------------------------------------------------------------------

# 37. Overall Catalogue-Building Workflow

The complete low-cost process should be:

``` text
OPEN / PUBLIC DATA
        │
        ▼
RAW DATA STORE
CSV / JSON / source files
        │
        ▼
NORMALISATION
        │
   ┌────┴────┐
   │         │
 Rules       AI
   │         │
   └────┬────┘
        ▼
DRAFT CATALOGUE JSON
        │
        ▼
Manufacturer/source research
        │
        ▼
AI enrichment
        │
        ▼
Validation / review
        │
        ▼
APPROVED CATALOGUE JSON
        │
        ▼
Schema validation
        │
        ▼
DB IMPORTER
        │
        ▼
POSTGRESQL CATALOGUE
        │
   ┌────┼─────────┐
   ▼    ▼         ▼
Search Seller     AI Search
       Listing
```

DVLA sits alongside this process as a lookup/validation source for
individual UK vehicles.

------------------------------------------------------------------------

# 38. Recommended Implementation Order

Build the catalogue system in this order:

1.  Define the simplified V1 catalogue fields.
2.  Define controlled enums for fuel, body, transmission and drivetrain.
3.  Define the catalogue JSON Schema.
4.  Define the PostgreSQL schema.
5.  Download/import useful open/public make/model datasets.
6.  Normalise manufacturer and model names.
7.  Create your canonical Make → Model → Generation → Derivative
    structure.
8.  Select one manufacturer as the test case.
9.  BMW is a good initial test because generation codes, performance
    derivatives and enthusiast terminology stress-test the model well.
10. Build BMW model/generation/derivative JSON files.
11. Use AI to assist with derivative creation and core specification
    extraction.
12. Validate AI-generated data against reliable source material.
13. Import approved JSON into PostgreSQL.
14. Build the Catalogue Admin.
15. Build catalogue completeness reporting.
16. Add manufacturer colours.
17. Add the small global desirable-equipment taxonomy.
18. Repeat manufacturer by manufacturer based on UK importance.
19. Add DVLA registration lookup.
20. Build basic matching from DVLA result → candidate catalogue
    derivatives.
21. Let sellers confirm the exact derivative.
22. Record seller corrections and use them to improve matching.
23. Add more detailed catalogue information only where it provides
    measurable user value.

------------------------------------------------------------------------

# 39. Recommended V1 Philosophy

The V1 database should **not try to know everything about every car**.

It should know enough about the derivative to understand what the car
fundamentally is:

``` text
Make
Model
Generation
Derivative
Body
Production years
Fuel
Engine capacity
Cylinders
Aspiration
Engine family where useful
Power
Torque
Transmission
Drivetrain
0–62 where available
Top speed where available
```

Then let the individual vehicle/listing provide:

``` text
Year
Mileage
Manufacturer paint
Interior
Important equipment
Owners
Service history
Import status
Modifications
Condition/history
```

This is the best balance between:

``` text
Low data cost
Low catalogue workload
Good normal-user search
Strong enthusiast search
Scalable database design
Future AI search
Future marketplace intelligence
```

The most important differentiating combination is:

> **Generation + exact derivative + engine + power + gearbox +
> drivetrain + manufacturer paint + selected desirable equipment**

If those areas are handled well, enthusiasts should already feel that
the marketplace understands cars without requiring an enormous
commercial-grade automotive specification database.
