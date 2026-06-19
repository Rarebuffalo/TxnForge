# Transaction Parser Engine

The parser extracts transaction properties from unstructured bank statement text and normalizes them into structured transaction objects.

## Parser Process Flow

```
[Raw Text Input]
       |
       +---> parseDate() ---------> Normalized Date (JS Date)
       +---> parseAmount() -------> Numeric Amount (signed float)
       +---> parseBalance() ------> Numeric Balance (float)
       +---> parseDescription() --> Merchant/Description String
       |
       v
[Confidence Scoring] -------------> Weighted Confidence Score
       |
       v
[Inferred Category] --------------> Inferred Category String
```

## Parsing Strategies

### Date Extraction (`parseDate`)
The parser detects multiple formats using specialized regular expressions:
- **DD MMM YYYY**: Matches `11 Dec 2025`.
- **MM/DD/YYYY / DD/MM/YYYY**: Matches `12/11/2025`. It normalizes dates by checking if the day value exceeds 12.
- **YYYY-MM-DD**: Matches standard ISO strings like `2025-12-10`.

### Amount Extraction & Sign Determination (`parseAmount`)
Amount extraction cleans currency symbols (like `₹`) and commas, converting numeric parts to floating-point numbers. Sign determination checks:
- **Negative Sign (-)**: Leading minus sign.
- **Debit Suffix**: Presence of terms like `debited`, `Dr`, or `debit` directly following the amount makes the value negative.
- **Credit Suffix**: Terms like `credited`, `Cr`, or `credit` mark the value positive.

### Balance Extraction (`parseBalance`)
Matches numeric sequences following keywords:
- `Balance after transaction:`
- `Available Balance →`
- `Bal`

### Description Extraction (`parseDescription`)
- **Explicit Label**: Captures text immediately following `Description:`.
- **First-Line Match**: In multi-line statements where no explicit labels are present (e.g., Uber), the first line is extracted as the description.
- **In-Line Extract**: In messy single lines (e.g., Amazon), the parser isolates content between the date and the currency symbol.

## Weighted Confidence Calculation

Rather than a binary match, the confidence score is calculated by summing the weights of successfully extracted attributes:

| Field | Weight | Description |
| :--- | :--- | :--- |
| **Amount** | 40% | Core financial field representing the transaction value. |
| **Date** | 25% | Chronological field indicating when the transaction occurred. |
| **Description** | 20% | Information showing the merchant or transaction type. |
| **Balance** | 15% | Auxiliary verification field representing ledger status. |
| **Total** | **100%** | Full confidence score representation. |
