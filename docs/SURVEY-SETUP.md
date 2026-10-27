# Survey Setup — Live Google Form & Response Sheet

The instrument is a **published 20-item Google Form** in five sections. This document records
the exact live wording (parsed from the published form) and how it maps onto the analytics
engine (`src/lib/schema.ts` is the machine-readable source of truth).

- Responder form: `https://docs.google.com/forms/d/e/1FAIpQLSdFyISogxtArX9oaHMIF03mPneXghtCVjg7-obfVS7nUsiXfg/viewform`
- The form **editor URL is administrative-only and is deliberately not stored in this repository.**
- Response sheet: `https://docs.google.com/spreadsheets/d/1XbjuLmRScPb-GgTAw8W_7cBOBR9CWvugSgk0SppVmDY/edit` (private — currently returns 401 to unauthenticated requests; integrate via Apps Script per `docs/GOOGLE-INTEGRATION.md`).

## Response-sheet schema

Google Forms writes the **exact question text** as the column header (including its leading
`1.`-style number). The platform matches headers case-insensitively against, for each question:
the exact question text, the text without its leading number, or the short column name below.

| Q | Sheet header (exact question text) | Short column | Type | Required |
|---|---|---|---|---|
| — | `Timestamp` | (auto) | — | recommended |
| 1 | `1. What is your role at MSRIT?` | Respondent Category | single | yes |
| 2 | `2. Which department or school do you belong to? (Optional)` | Department or School | single | no |
| 3 | `3. How familiar are you with the term e-waste (electronic waste)?` | Familiarity with E-Waste Term | single | yes |
| 4 | `4. Can you identify common e-waste items, such as old phones, chargers, batteries, cables and computers?` | Ability to Identify E-Waste Items | single | yes |
| 5 | `5. How aware are you of the environmental and health impacts of improper e-waste disposal?` | Awareness of Environmental and Health Impacts | single | yes |
| 6 | `6. Have you attended any e-waste or environmental-awareness training/programme?` | Previous E-Waste Awareness Training | single | yes |
| 7 | `7. How often do you replace or discard an electronic device?` | Device Replacement Frequency | single | yes |
| 8 | `8. What do you typically do with unused or damaged electronics?` | Typical Disposal Method | single | yes |
| 9 | `9. Have you ever used an authorized e-waste recycling facility or take-back scheme?` | Use of Authorized Recycling Facility | single | yes |
| 10 | `10. Do you know of a responsible e-waste disposal location near campus?` | Knowledge of Responsible Disposal Locations | single | yes |
| 11 | `11. Are you aware of any e-waste collection facility on campus?` | Awareness of Campus Collection Facilities | single | yes |
| 12 | `12. Would you use a designated e-waste collection facility on campus if one were available and convenient?` | Willingness to Use Campus Facility | single | yes |
| 13 | `13. What prevents you from disposing of e-waste responsibly? (Select all that apply)` | Barriers to Responsible Disposal | multi | yes |
| 14 | `14. How useful would campus e-waste awareness campaigns be for you?` | Perceived Usefulness of Awareness Campaigns | single | yes |
| 15 | `15. What would improve e-waste management on campus? (Select all that apply)` | Improvement Measures | multi | no |
| 16 | `16. What can happen when e-waste is burned or incinerated under uncontrolled conditions?` | Incineration Risk Awareness | single | yes |
| 17 | `17. How can improper disposal of e-waste in landfills affect the environment?` | Landfill Contamination | single | yes |
| 18 | `18. Which health effects may be associated with exposure to hazardous substances from improperly managed e-waste? (Select all that apply)` | Health Effects of E-Waste Exposure | multi | yes |
| 19 | `19. Which hazardous pollutants or substances may be released during improper e-waste handling or recycling? (Select all that apply)` | Hazardous Pollutants | multi | yes |
| 20 | `20. Which environmental components can be affected by improper e-waste disposal? (Select all that apply)` | Environmental Components Affected | multi | yes |

A worked synthetic example (20 columns) lives at `data/sample-responses.csv` (clearly synthetic).

## Options per question (as published)

1. **What is your role at MSRIT?** *(required)* — Student · Teaching staff · Non-teaching staff
2. **Which department or school do you belong to?** *(optional)* — Computer Science & Engineering · Information Science & Engineering · Electronics & Communication Engineering · Electrical & Electronics Engineering · Mechanical Engineering · Civil Engineering · Mathematics / Sciences · Management Studies · Other · Prefer not to say
3. **Familiarity with the term e-waste** *(required)* — Not at all familiar · Slightly familiar · Moderately familiar · Very familiar · Extremely familiar
4. **Identify common e-waste items** *(required)* — Yes, I can identify most of them · Yes, but only some of them · I am not sure what counts as e-waste · No, I cannot identify them
5. **Awareness of environmental/health impacts** *(required)* — Fully aware · Partially aware · I have heard of it but know little · Not aware at all
6. **Prior e-waste training** *(required)* — Yes · No · I do not remember
7. **Device replacement frequency** *(required)* — Every year or more often · Every 2–3 years · Every 4–5 years · Rarely (more than 5 years) · I have never discarded one
8. **Typical disposal method** *(required)* — Give to an authorized recycler · Deposit at a campus e-waste collection point · Sell or give to a local scrap dealer · Store at home (unused) · Mix with household garbage · Return to manufacturer / exchange offer · Other
9. **Used authorized recycling facility** *(required)* — Yes · No · No — I am not aware of any
10. **Responsible disposal location near campus** *(required)* — Yes, near campus · Yes, elsewhere in the city · No · Not sure
11. **Aware of campus collection facility** *(required)* — Yes, and I know where it is · I have heard of one but do not know where · No, I am not aware of any
12. **Willingness to use a campus facility** *(required)* — Definitely · Probably · Not sure · Probably not · Definitely not
13. **Barriers (checkboxes)** *(required)* — Lack of awareness · No convenient collection point · Facility too far / hard to reach · Concern about personal data on devices · No incentive or compensation · Do not know how to prepare devices · Cost of responsible disposal · No barriers · Other
14. **Campaign usefulness** *(required)* — Very useful · Somewhat useful · Neutral · Not very useful · Not useful at all
15. **Improvement measures (checkboxes)** *(optional)* — Collection drives · Permanent collection bins · Awareness campaigns · Partnerships with authorized recyclers · Device donation programmes · Other
16. **Uncontrolled incineration** *(required)* — Release of toxic fumes and pollutants · Complete removal of all hazardous substances · No environmental impact · I don't know *(correct: first)*
17. **Landfill effects** *(required)* — Hazardous substances may contaminate soil and groundwater · It always improves soil quality · It has no possible environmental impact · I don't know *(correct: first)*
18. **Health effects (checkboxes)** *(required)* — Respiratory problems · Nervous system damage · Kidney or liver damage · Skin irritation · None of these · I don't know
19. **Hazardous pollutants (checkboxes)** *(required)* — Lead · Mercury · Cadmium · Dioxins and furans from certain uncontrolled burning processes · None of these · I don't know
20. **Environmental components (checkboxes)** *(required)* — Air · Soil · Surface water and groundwater · Plants and wildlife · I don't know

## Response targets

Faculty's collection targets (reported separately from achieved samples):
**30 students · 30 teaching staff · 30 non-teaching staff · 90 total** (`RESPONSE_TARGETS` in `schema.ts`).

## Validation behaviour (what the analytics do with imperfect data)

- **Q1 unusable** (blank or unrecognised role) → whole row excluded (`invalidResponses`).
- **Mostly-blank row** (more than half of required answers missing) → excluded as a blank submission.
- **Any other missing required answer** → row stays; that question reports `missingN` (per-question denominators).
- **Unrecognised choice values** → kept visible as `Other:`/`Unexpected:` buckets; original text preserved, never coerced.
- **Google Forms "Other" free text** → mapped to the question's `Other` option (text preserved).
- **Duplicates** → identical timestamp + identical answers collapse to one row.
- **Small groups** → filtered summaries with fewer than 5 valid responses are suppressed.

## Verification checklist

1. Open `/survey` — the embedded form must load from the responder URL.
2. Submit one dry-run response yourself (optional, use "Prefer not to say" for department).
3. After the Apps Script endpoint is deployed, confirm `/api/health` reports
   `connected: true` and `rowCount` grows by 1.
4. Confirm the dashboard shows **LIVE DATA** (not demo) with the new count.
5. Record the collection window and totals for the manuscript's data-availability statement.
