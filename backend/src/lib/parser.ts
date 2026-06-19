interface ParsedTransaction {
  date: Date | null;
  amount: number | null;
  balance: number | null;
  description: string | null;
  category: string | null;
  confidence: number;
}

/**
 * Parses a date string from the transaction text and normalizes it.
 */
export function parseDate(text: string): Date | null {
  // Pattern 1: DD Dec YYYY (e.g., 11 Dec 2025)
  const ddmmyyyyText = text.match(/Date:\s*(\d{1,2}\s+[A-Za-z]{3}\s+\d{4})/i);
  if (ddmmyyyyText) {
    const parsed = Date.parse(ddmmyyyyText[1]);
    if (!isNaN(parsed)) return new Date(parsed);
  }

  // Pattern 2: MM/DD/YYYY or DD/MM/YYYY (e.g., 12/11/2025)
  const slashDate = text.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (slashDate) {
    const val1 = parseInt(slashDate[1], 10);
    const val2 = parseInt(slashDate[2], 10);
    const year = parseInt(slashDate[3], 10);

    // In Indian formats, it can be DD/MM/YYYY, but Sample 2 is 12/11/2025.
    // Let's assume standard JS parsing or context clues. If val1 > 12, it is DD/MM/YYYY.
    // Let's normalize it. For 12/11/2025, we will construct Nov 12, 2025 or Dec 11, 2025.
    // Standardizing on Date(year, monthIndex, day)
    // We treat 12/11/2025 as Dec 11, 2025 (MM/DD/YYYY) based on test requirements.
    // If val1 > 12, then val1 is the day, val2 is the month.
    if (val1 > 12) {
      return new Date(year, val2 - 1, val1);
    } else {
      return new Date(year, val1 - 1, val2);
    }
  }

  // Pattern 3: YYYY-MM-DD (e.g., 2025-12-10)
  const isoDate = text.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (isoDate) {
    const parsed = Date.parse(isoDate[0]);
    if (!isNaN(parsed)) return new Date(parsed);
  }

  return null;
}

/**
 * Parses the transaction amount, handling positive/negative indicators.
 */
export function parseAmount(text: string): number | null {
  // Pattern 1: Amount: -420.00
  const amountLabel = text.match(/Amount:\s*(-?₹?\s*[0-9,.]+)/i);
  if (amountLabel) {
    const clean = amountLabel[1].replace(/[₹,\s]/g, "");
    const value = parseFloat(clean);
    if (!isNaN(value)) return value;
  }

  // Pattern 2: ₹1,250.00 debited or ₹2,999.00 Dr
  const currencyAmount = text.match(/₹?\s*([0-9,.]+)\s*(debited|credited|Dr|Cr|-|\+)?/i);
  if (currencyAmount) {
    const clean = currencyAmount[1].replace(/[,\s]/g, "");
    let value = parseFloat(clean);
    if (!isNaN(value)) {
      const suffix = currencyAmount[2]?.toLowerCase();
      // If suffix indicates debit (debit, Dr, -), make it negative.
      if (suffix === "debited" || suffix === "dr" || suffix === "-") {
        value = -Math.abs(value);
      }
      return value;
    }
  }

  // Fallback direct match for negative/positive floats
  const fallback = text.match(/-?[0-9,]+\.[0-9]{2}/);
  if (fallback) {
    const clean = fallback[0].replace(/[,\s]/g, "");
    const value = parseFloat(clean);
    if (!isNaN(value)) return value;
  }

  return null;
}

/**
 * Parses the available balance after transaction.
 */
export function parseBalance(text: string): number | null {
  // Pattern 1: Balance after transaction: 18,420.50
  const afterTxn = text.match(/Balance after transaction:\s*([0-9,.]+)/i);
  if (afterTxn) {
    const value = parseFloat(afterTxn[1].replace(/[,\s]/g, ""));
    if (!isNaN(value)) return value;
  }

  // Pattern 2: Available Balance → ₹17,170.50
  const availBal = text.match(/Available Balance\s*(?:→)?\s*₹?\s*([0-9,.]+)/i);
  if (availBal) {
    const value = parseFloat(availBal[1].replace(/[,\s]/g, ""));
    if (!isNaN(value)) return value;
  }

  // Pattern 3: Bal 14171.50
  const shortBal = text.match(/Bal\s*₹?\s*([0-9,.]+)/i);
  if (shortBal) {
    const value = parseFloat(shortBal[1].replace(/[,\s]/g, ""));
    if (!isNaN(value)) return value;
  }

  return null;
}

/**
 * Extracts the transaction description / merchant name.
 */
export function parseDescription(text: string): string | null {
  // Pattern 1: Description: STARBUCKS COFFEE MUMBAI
  const labelDesc = text.match(/Description:\s*(.*)/i);
  if (labelDesc && labelDesc[1]) {
    return labelDesc[1].trim();
  }

  // Pattern 2: First line as description (e.g., Uber Ride * Airport Drop)
  // Ensure we don't pick up a line that is primarily numbers/dates.
  const lines = text.split("\n").map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length > 0) {
    const firstLine = lines[0];
    // If it's not a generic label or format, return it.
    if (!firstLine.startsWith("Date:") && !firstLine.startsWith("txn")) {
      return firstLine;
    }
  }

  // Pattern 3: Messy single line (e.g., txn123 2025-12-10 Amazon.in Order #403-1234567-8901234 ₹2,999.00 Dr Bal 14171.50 Shopping)
  // Extract content between date and amount currency symbol.
  const dateMatch = text.match(/(\d{4}-\d{2}-\d{2})/);
  const currencyMatch = text.match(/₹/);
  if (dateMatch && currencyMatch && dateMatch.index !== undefined && currencyMatch.index !== undefined) {
    if (currencyMatch.index > dateMatch.index) {
      const start = dateMatch.index + dateMatch[0].length;
      const end = currencyMatch.index;
      const parsed = text.slice(start, end).trim();
      if (parsed.length > 0) return parsed;
    }
  }

  return null;
}

/**
 * Dynamically infers a category based on the description or raw text keywords.
 */
export function inferCategory(text: string, description: string | null = null): string | null {
  const content = (description || text).toLowerCase();
  
  if (content.includes("starbucks") || content.includes("coffee") || content.includes("cafe") || content.includes("food")) {
    return "Food/Beverage";
  }
  if (content.includes("uber") || content.includes("ola") || content.includes("ride") || content.includes("cab") || content.includes("transport") || content.includes("airport")) {
    return "Travel";
  }
  if (content.includes("amazon") || content.includes("flipkart") || content.includes("shopping") || content.includes("order")) {
    return "Shopping";
  }

  // If the messy string specifies a category at the end (Sample 3 ends with "Shopping")
  const words = text.split(/\s+/);
  if (words.length > 0) {
    const lastWord = words[words.length - 1];
    if (["shopping", "food", "travel", "entertainment", "bills"].includes(lastWord.toLowerCase())) {
      // Capitalize first letter
      return lastWord.charAt(0).toUpperCase() + lastWord.slice(1).toLowerCase();
    }
  }

  return null;
}

/**
 * Calculates a weighted confidence score based on the extracted fields.
 * Amount: 40%
 * Date: 25%
 * Description: 20%
 * Balance: 15%
 */
export function calculateConfidence(parsed: {
  date: Date | null;
  amount: number | null;
  description: string | null;
  balance: number | null;
}): number {
  let score = 0;
  if (parsed.amount !== null) score += 0.40;
  if (parsed.date !== null) score += 0.25;
  if (parsed.description !== null) score += 0.20;
  if (parsed.balance !== null) score += 0.15;
  
  // Format to two decimal places.
  return Math.round(score * 100) / 100;
}

/**
 * Core parsing entry point.
 */
export function parseTransaction(text: string): ParsedTransaction {
  const date = parseDate(text);
  const amount = parseAmount(text);
  const balance = parseBalance(text);
  const description = parseDescription(text);
  const category = inferCategory(text, description);

  const confidence = calculateConfidence({ date, amount, description, balance });

  return {
    date,
    amount,
    balance,
    description,
    category,
    confidence,
  };
}
