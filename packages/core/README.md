# @eoffice/core

The document models behind eOffice: spreadsheets, presentations, drive, and the
rest. This file records behaviour that callers depend on and that is not obvious
from the type signatures.

## eSheets formulas

### `DATE(year, month, day)`

Returns a real calendar date formatted as `YYYY-MM-DD`. A month or day outside
its normal range **carries into the next field** rather than being printed as
given, which matches Excel and Google Sheets:

| Formula            | Result       | Why                                 |
|--------------------|--------------|-------------------------------------|
| `=DATE(2024,3,5)`  | `2024-03-05` | In range                            |
| `=DATE(2024,13,1)` | `2025-01-01` | Month 13 carries into the next year |
| `=DATE(2024,0,1)`  | `2023-12-01` | Month 0 is the month before January |
| `=DATE(2024,2,30)` | `2024-03-01` | February 2024 has 29 days           |
| `=DATE(2024,3,0)`  | `2024-02-29` | Day 0 is the day before the 1st     |

Other behaviour:

- A non-integer part is truncated towards zero: `=DATE(2024,1.9,5.7)` is
  `2024-01-05`.
- A year below 100 is kept as written: `=DATE(24,1,1)` is `24-01-01`, not 1924.
- A part that is not a number, or a date outside the range the engine can
  represent (roughly year 275760), returns `#VALUE!`.

Every row above has a matching assertion in
`src/__tests__/spreadsheet-date.test.ts`.
