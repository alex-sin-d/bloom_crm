# Bloom Boys Phase 1 Data Audit

Date prepared: 2026-06-27

## Scope and Stop Point

This audit covers the existing Bloom Boys research inputs in `/Users/alex/Developer/bloom_crm`. It does not build CRM pages, Supabase migrations, import scripts, seed scripts, authentication, UI components, or environment files.

The folders `phase-1/` and `phase-2/` are the physical source folders and were read only. They must remain unmodified. The unpacked CSV files in those folders are the primary import source. ZIP files are backup packages only and must not be inventoried or imported alongside the unpacked CSVs. XLSX files were used only as validation cross-checks.

No separate original Phase 1 or Phase 2 specification file was present in the repo. The available requirement/specification material is:

- `docs/crm-requirements.md`
- `docs/opportunity-scoring.md`
- `docs/outreach-workflow.md`
- `phase-1/Bloom_Boys_SK_K12_Research_Phase_1_Summary.txt`
- `phase-2/Bloom_Boys_SK_Postsecondary_Trades_Phase_2_Summary.txt`

## Source File Inventory

| phase | csv_file | rows | cols | xlsx |
| --- | --- | --- | --- | --- |
| phase-1 | P1_SCHOOL_DIVISIONS.csv | 33 | 25 | match |
| phase-1 | P1_HIGH_SCHOOLS.csv | 123 | 27 | match |
| phase-1 | P1_CONTACTS.csv | 445 | 32 | match |
| phase-1 | P1_TRUSTEES.csv | 118 | 16 | match |
| phase-1 | P1_GRADUATIONS_AND_VENUES.csv | 123 | 21 | match |
| phase-1 | P1_POLICIES_AND_APPROVAL_PROCESSES.csv | 37 | 14 | match |
| phase-1 | P1_RESEARCH_GAPS.csv | 168 | 9 | match |
| phase-1 | P1_PRIORITY_OUTREACH_LIST.csv | 100 | 18 | match |
| phase-1 | P1_FINAL_SUMMARY.csv | 19 | 2 | review |
| phase-2 | P2_INSTITUTIONS.csv | 24 | 27 | match |
| phase-2 | P2_CONTACTS.csv | 141 | 32 | match |
| phase-2 | P2_CONVOCATIONS_AND_CEREMONIES.csv | 44 | 24 | match |
| phase-2 | P2_VENUES.csv | 17 | 21 | match |
| phase-2 | P2_STUDENT_ORGANIZATIONS.csv | 13 | 18 | match |
| phase-2 | P2_TRADES_AND_PROFESSIONAL_BODIES.csv | 20 | 20 | match |
| phase-2 | P2_PROCUREMENT_AND_POLICIES.csv | 17 | 15 | match |
| phase-2 | P2_SENIOR_INFLUENCERS.csv | 25 | 15 | match |
| phase-2 | P2_RESEARCH_GAPS.csv | 32 | 9 | match |
| phase-2 | P2_PRIORITY_OUTREACH_LIST.csv | 100 | 19 | match |
| phase-2 | P2_PHASE_1_CONNECTIONS.csv | 20 | 11 | match |
| phase-2 | P2_FINAL_SUMMARY.csv | 19 | 2 | match |

Detailed inventory is in `audit-output/source-file-inventory.csv`.

Total CSV rows: 1638 across 21 CSV files.

- Phase 1 (`phase-1/`) rows: 1166
- Phase 2 (`phase-2/`) rows: 472
- Duplicate source IDs within the same file: 0

## XLSX Cross-Check

The XLSX workbooks contain the same data tabs as the unpacked CSV source set. All data sheets match CSV row counts and headers except Phase 1 `SUMMARY`, where the workbook tab contains extra formatted summary rows/columns beyond the two-column CSV summary.

Import should use the unpacked CSV files in `phase-1/` and `phase-2/`. ZIP packages are backups only and must not be double-counted. The workbooks should be retained only as a human-readable validation reference.

## Data Quality Findings

- Every CSV cell is populated with either a value or an explicit research-status note.
- Status prose such as `Not publicly available`, `Not publicly identified`, `requires confirmation`, `pending reconciliation`, and estimated/historical date text is intentional source data and must not be converted to blanks or assumed facts.
- `audit-output/import-issues.csv` flags 50 email-named fields containing status or routing prose instead of parseable email addresses.
- Original scores and tiers are present in research files and must be preserved separately from any future standardized CRM score.
- Date verification values use ISO date format where present. Event dates frequently mix confirmed, estimated, historical, or status wording and must retain that label.

Opportunity tier counts across rows that include tiers:

| tier | count |
| --- | --- |
| Tier 1 | 196 |
| Tier 2 | 237 |
| Tier 3 | 94 |
| Tier 4 | 7 |

Opportunity score ranges:

| range | count |
| --- | --- |
| 00-44 | 1 |
| 45-64 | 84 |
| 65-79 | 178 |
| 80-100 | 271 |

Email-status counts:

| email_status | count |
| --- | --- |
| General organization email | 29 |
| Not publicly available | 474 |
| Verified departmental email | 47 |
| Verified general organization email | 7 |
| Verified personal email | 29 |

Confidence-level counts:

| confidence | count |
| --- | --- |
| High | 124 |
| Medium | 516 |

## Duplicate Themes

Duplicate candidates must enter a review queue. They must not be merged automatically.

| candidate_type | count |
| --- | --- |
| same_normalized_name_and_organization | 125 |
| same_parseable_email | 33 |
| same_phone_number | 55 |

Important patterns:

- Shared venue contacts appear in both phases, especially TCU Place, Merlis Belsher Place, Prairieland Park, and Conexus Arts Centre.
- Trustee rows often overlap with Phase 1 contact rows by same name, organization, and sometimes email.
- Same phone number is a weak duplicate signal because many rows use shared offices or switchboards.
- Departmental contacts must remain distinct from named people unless reviewed.
- Legitimate multiple roles must be preserved through `contact_roles`, not collapsed.

The full candidate list is in `audit-output/duplicate-report.csv`.

## Organization Aliases and Relationships

The relationship audit found 187 unresolved or provisional relationship values. Common cases include:

- Abbreviations: `SIIT`, `SATCC`, `APEGS`, `USask`, `U of R`
- Venue aliases or sublocations: `CKHS Main Gym`, `University of Regina CKHS Main Gym`, `Hildebrand Chapel/campus`
- Operator/venue variants must be split into canonical records: `Regina Exhibition Association Limited (REAL)` as operator, `REAL District` as venue complex, and `Queensbury Convention Centre` as a specific venue within REAL District.
- Provisional Phase 1 connection text such as `Saskatoon-area high schools - exact rows pending`
- Faculty or subunit names that need explicit child organization records
- Generic venue values such as `Institution/faculty venue not publicly captured`

Sample unresolved rows:

| csv_file | row | field | raw_value | suggestion |
| --- | --- | --- | --- | --- |
| Bloom_Boys_SK_K12_Research_Phase_1_GRADUATIONS_AND_VENUES.csv | 17 | Venue operator | TCU Place / City of Saskatoon | Split into multiple relationships when the value names more than one organizatio |
| Bloom_Boys_SK_Postsecondary_Trades_Phase_2_INSTITUTIONS.csv | 6 | Venue | U of R CKHS Main Gym and FNUniv event spaces | Split into multiple relationships when the value names more than one organizatio |
| Bloom_Boys_SK_Postsecondary_Trades_Phase_2_INSTITUTIONS.csv | 15 | Venue | U of R CKHS and Campion spaces | Split into multiple relationships when the value names more than one organizatio |
| Bloom_Boys_SK_Postsecondary_Trades_Phase_2_INSTITUTIONS.csv | 16 | Venue | U of R CKHS and Luther spaces | Split into multiple relationships when the value names more than one organizatio |
| Bloom_Boys_SK_Postsecondary_Trades_Phase_2_CONTACTS.csv | 36 | Organization | University of Regina CKHS Main Gym | Create or confirm alias to suggested canonical record. |
| Bloom_Boys_SK_Postsecondary_Trades_Phase_2_CONTACTS.csv | 39 | Organization | APEGS | Create or confirm alias to suggested canonical record. |
| Bloom_Boys_SK_Postsecondary_Trades_Phase_2_CONVOCATIONS_AND_CEREMONIES.csv | 11 | Venue | CKHS Main Gym | Create or confirm alias to suggested canonical record. |
| Bloom_Boys_SK_Postsecondary_Trades_Phase_2_CONVOCATIONS_AND_CEREMONIES.csv | 12 | Venue | CKHS Main Gym | Create or confirm alias to suggested canonical record. |
| Bloom_Boys_SK_Postsecondary_Trades_Phase_2_CONVOCATIONS_AND_CEREMONIES.csv | 13 | Venue | CKHS Main Gym | Create or confirm alias to suggested canonical record. |
| Bloom_Boys_SK_Postsecondary_Trades_Phase_2_CONVOCATIONS_AND_CEREMONIES.csv | 14 | Venue | CKHS Main Gym | Create or confirm alias to suggested canonical record. |
| Bloom_Boys_SK_Postsecondary_Trades_Phase_2_CONVOCATIONS_AND_CEREMONIES.csv | 15 | Venue | CKHS Main Gym | Create or confirm alias to suggested canonical record. |
| Bloom_Boys_SK_Postsecondary_Trades_Phase_2_CONVOCATIONS_AND_CEREMONIES.csv | 21 | Venue operator | TCU Place / City of Saskatoon | Split into multiple relationships when the value names more than one organizatio |

Full alias recommendations are in `audit-output/organization-aliases.csv`. Full unresolved relationships are in `audit-output/unresolved-relationships.csv`.

Approved canonical records for implementation planning:

- `Saskatchewan Indian Institute of Technologies`; alias `SIIT`
- `Saskatchewan Apprenticeship and Trade Certification Commission`; alias `SATCC`
- `Association of Professional Engineers and Geoscientists of Saskatchewan`; alias `APEGS`
- `Centre for Kinesiology, Health and Sport`; `CKHS Main Gym` is a facility subspace/alias
- `Regina Exhibition Association Limited (REAL)` as operator
- `REAL District` as venue complex
- `Queensbury Convention Centre` as a specific venue within REAL District

## Implementation Blockers Before CRM Build

- Review duplicate candidates before any automatic merge is enabled.
- Resolve or explicitly stage provisional `PHASE_1_CONNECTIONS` rows now that Phase 1 data is available.
- Apply the approved canonical records above and update any audit-output alias/reconciliation rows before implementation if needed.
- Keep research-only records out of the active pipeline until Alex or Sam manually selects `Add to pipeline`.
- Preserve original source rows, original scores, original tiers, source URLs, verification dates, and confidence values.
- Treat trustees and senior influencers as referral/influence contacts unless source evidence proves operational authority.

## Source Summary Notes

Phase 1 summary excerpt:

```text
Bloom Boys Saskatchewan K–12 Education Outreach Research — Phase 1
Verified: 2026-06-26

VALIDATION
- Every required CSV cell is populated.
- Unavailable fields contain an explicit research-status note; personal emails were not inferred.
- Historical or estimated dates are labelled and are not presented as current confirmed events.
- Trustee coverage contains complete or near-complete current rosters for major/verified boards and current-chair baseline records plus follow-up gaps for remaining divisions.

COUNTS
- Date verified: 2026-06-26
- Official Saskatchewan school divisions researched: 27
- Equivalent Indigenous education authorities researched: 6
- Total organization rows: 33
- High schools and senior-secondary programs researched: 123
- Contact records: 445
- Named contacts: 194
- Operational/routing/procurement/venue/communications contacts: 287
- Trustee records: 118
- Verified personal emails: 20
- Verified departmental emails: 2
- General organization email routes: 6
- Contacts requiring phone/contact-form research: 417
- Confirmed 2026 or 2027 graduation events: 11
- Outside venues/contact routes identified: 12
- Tier 1 school opportunities: 40
- Tier 2 school opportunities: 45
- Research gaps documented: 168
- Priority outreach contacts ranked: 100

TOP 20 SCHOOL OPPORTUNITIES
1. Walter Murray Collegiate — Saskatoon — Tier 1 — score 94
2. St. Joseph High School — Saskatoon — Tier 1 — score 94
3. Tommy Douglas Collegiate — Saskatoon — Tier 1 — score 93
4. Holy Cross High School — Saskatoon — Tier 1 — score 93
5. Campbell Collegiate — Regina — Tier 1 — score 93
6. Centennial Collegiate — Saskatoon — Tier 1 — score 92
7. Winston Knoll Collegiate — Regina — Tier 1 — score 92
8. Dr. Martin LeBoldus Catholic High School — Regina — Tier 1 — score 92
9. Michael A. Riffel Catholic High School — Regina — Tier 1 — score 92
10. Miller Comprehensive Catholic High School — Regina — Tier 1 — score 92
11. Evan Hardy Collegiate — Saskatoon — Tier 1 — score 91
12. Marion M. Graham Collegiate — Saskatoon — Tier 1 — score 91
13. Bethlehem Catholic High School — Saskatoon — Tier 1 — score 91
14. Sheldon-Williams Collegiate — Regina — Tier 1 — score 90
15. Archbishop M.C. O’Neill Catholic High School — Regina — Tier 1 — score 90
16. Carlton Comprehensive High School — Prince Albert — Tier 1 — score 90
17. Bishop James Mahoney High School — Saskatoon — Tier 1 — score 89
18. F.W. Johnson Collegiate — Regina — Tier 1 — score 89
19. Aden Bowman Collegiate — Saskatoon — Tier 1 — score 88
20. Yorkton Regional High School — Yorkton — Tier 1 — score 88

TOP 20 OPERATIONAL CONTACTS
1. TCU Place Event Sales — TCU Place — Venue Sales and Event Planning — score 96
2. TCU Place Client Services — TCU Place — Client Services — score 96
3. Merlis Belsher Place Event Booking — Merlis Belsher Place — Venue Booking — score 96
4. Prairieland Park Event Booking — Prairieland Park — Events and Sales — score 96
5. Conexus Arts Centre Event Spaces — Conexus Arts Centre — Venue Sales / Events — score 96
6. Art Hauser Centre Facility Booking — Art Hauser Centre — Municipal Facility Booking — score 96
7. EA Rawlinson Centre Event Booking — EA Rawlinson Centre — Venue Booking — score 96
8. Dekker Centre Event Sales — Dekker Centre — Venue Booking — score 96
9. Gallagher Centre Facility Booking — Gallagher Centre — Municipal Facility Booking — score 96
10. InnovationPlex Facility Booking — InnovationPlex — Municipal Facility Booking — score 96
11. Kerry Vickar Centre Facility Booking — Kerry Vickar Centre — Municipal Facility Booking — score 96
12. Queensbury Convention Centre Event Sales — REAL District / Queensbury Convention Centre — Venue Sales — score 96
13. Ryan Brimacombe — Aden Bowman Collegiate — Principal — score 88
14. Sarah Nahachewsky — Bedford Road Collegiate — Principal — score 85
15. Wendy Benson — Centennial Collegiate — Principal — score 92
16. Karen Peterson — Evan Hardy Collegiate — Principal — score 91
17. Jay Harvey — Marion M. Graham Collegiate — Principal — score 91
18. Scott Ferguson — Mount Royal Collegiate — Principal — score 86
19. Kevin McNarland — Tommy Douglas Collegiate — Principal — score 93
20. Dave Fisher — Walter Murray Collegiate — Principal — score 94

DIVISIONS WHERE DIVISION-LEVEL APPROVAL APPEARS MOST LIKELY
- Saskatoon Public Schools and Greater Saskatoon Catholic Schools for multi-school or branded/revenue-sharing arrangements.
- Regina Public Schools and Regina Catholic Schools for city-wide outreach and events at Conexus Arts Centre.
- Prairie Spirit, Prairie Valley, Prairie South and Saskatchewan Rivers for multi-community pilots.
- Any division where Bloom Boys signs a contract, uses school logos, receives school-generated funds or operates across several schools.

SCHOOLS WHERE VENUE APPROVAL APPEARS ESPECIALLY IMPORTANT
- Oskāyak High School at TCU Place.
- Campbell, F.W. Johnson, Sheldon-Williams and Winston Knoll at Conexus Arts Centre.
- Archbishop M.C. O’Neill, Dr. Martin LeBoldus, Michael A. Riffel and Miller Comprehensive at Conexus Arts Centre.
- Greenall High School at Conexus Arts Centre.

FIRST TEN CONTACTS TO APPROACH
1. TCU Place Event Sales — TCU Place
2. TCU Place Client Services — TCU Place
3. Merlis Belsher Place Event Booking — Merlis Belsher Place
4. Prairieland Park Event Booking — Prairieland Park
5. Conexus Arts Centre Event Spaces — Conexus Arts Centre
6. Art Hauser Centre Facility Booking — Art Hauser Centre
7. EA Rawlinson Centre Event Booking — EA Rawlinson Centre
8. Dekker Centre Event Sales — Dekker Centre
9. Gallagher Centre Facility Booking — Gallagher Centre
10. InnovationPlex Facility Booking — InnovationPlex

RECOMMENDED OUTREACH ORDER
1. Current principals and school offices at the largest Saskatoon schools where Bloom Boys already has local credibility.
2. TCU Place, Merlis Belsher Place and Prairieland Park to clarify one-to-many Saskatoon venue rules.
3. Regina schools with confirmed Conexus Arts Centre dates, followed by Conexus event management.
4. Saskatchewan Polytechnic/Phase 2 venue relationships that overlap with school ceremonies.
5. Prairie Spirit growth-corridor schools in Warman and Martensville.
6. Large regional comprehensive schools in Prince Albert, North Battleford, Yorkton, Swift Current, Lloydminster, Moose Jaw, Weyburn and Estevan.
7. Division operations/procurement only when a school requests formal review or a multi-school agreement becomes realistic.
8. Trustees and directors as referral/escalation contacts, not the first operational ask.
```

Phase 2 summary excerpt:

```text
Bloom Boys Saskatchewan Postsecondary, Trades and Ceremony Research — Phase 2
Verified: 2026-06-26

VALIDATION
- Every required CSV data cell is populated.
- Unavailable fields contain an explicit research-status note; no silent blanks are used.
- No email address was inferred from a naming pattern.
- Historical and estimated event timing is labelled.
- The original Phase 1 workbook was not present; PHASE 1 CONNECTIONS is provisional pending reconciliation.

COUNTS
- Date verified: 2026-06-26
- Institutions and major organizations researched: 24
- Contacts: 141
- Named contacts: 65
- Operational/venue/procurement/partnership contacts: 87
- Senior influence records: 25
- Verified personal emails: 9
- Verified departmental emails: 45
- Departmental/general email routes: 75
- Contacts requiring phone/contact-form research: 57
- Convocations and ceremonies identified: 44
- Venues identified: 17
- Student organizations identified: 13
- Trades and professional bodies identified: 20
- Tier 1 institution/organization opportunities: 4
- Tier 2 institution/organization opportunities: 10
- Priority outreach contacts ranked: 100
- Research gaps documented: 32
- Phase 1 connections: 20

FIRST TEN CONTACTS TO APPROACH
1. University of Regina Convocation Coordinator — University of Regina — Convocation Coordinator — score 100
2. USask Convocation Office — University of Saskatchewan — Convocation departmental contact — score 99
3. SIIT Advancement Office — Saskatchewan Indian Institute of Technologies — Advancement departmental contact — score 99
4. TCU Place Event Sales — TCU Place — Venue sales contact — score 99
5. Saskatchewan Polytechnic Campus Store — Saskatchewan Polytechnic — Official campus retail contact — score 98
6. Merlis Belsher Place Event Booking — Merlis Belsher Place — Venue booking contact — score 98
7. Saskatchewan Polytechnic Convocation Office — Saskatchewan Polytechnic — Convocation departmental contact — score 97
8. Prairieland Park Event Booking — Prairieland Park — Venue booking contact — score 97
9. First Nations University Convocation Office — First Nations University of Canada — Convocation departmental contact — score 96
10. University of Regina Graduation Office — University of Regina — Graduation departmental contact — score 95

RECOMMENDED OUTREACH ORDER
1. University of Regina Convocation Coordinator and Graduation Office.
2. SIIT Advancement and Prairieland Park Event Booking.
3. TCU Place Event Sales and Merlis Belsher Place Event Booking.
4. Saskatchewan Polytechnic Convocation and Campus Store as a supplier/white-label partnership.
5. First Nations University Convocation to clarify its current product operator.
6. SATCC Celebration Dinner and CPA Saskatchewan.
7. Suncrest, Carlton Trail, North West and Great Plains College.
8. Faculty-level Nursing, Medicine, Veterinary Medicine, Engineering and JSGS ceremonies.

SCORING
Scores are practical prioritization judgments using scale, attendance, product fit, decision-maker access, approval likelihood, annual value, travel, venue feasibility, incumbent risk, preorder potential and information quality.
```
