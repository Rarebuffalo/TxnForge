import { parseTransaction } from "../src/lib/parser.js";

describe("Modular Parsing Engine Tests", () => {
  
  test("Sample 1: Starbucks (Structured Format)", () => {
    const rawText = `Date: 11 Dec 2025\nDescription: STARBUCKS COFFEE MUMBAI\nAmount: -420.00\nBalance after transaction: 18,420.50`;
    const result = parseTransaction(rawText);

    expect(result.amount).toBe(-420.00);
    expect(result.description).toBe("STARBUCKS COFFEE MUMBAI");
    expect(result.balance).toBe(18420.50);
    expect(result.date).toBeInstanceOf(Date);
    expect(result.date?.getFullYear()).toBe(2025);
    expect(result.date?.getMonth()).toBe(11); // December (0-indexed is 11)
    expect(result.date?.getDate()).toBe(11);
    expect(result.category).toBe("Food/Beverage");
    expect(result.confidence).toBe(1.0); // 100% confidence
  });

  test("Sample 2: Uber (Arrow Format)", () => {
    const rawText = `Uber Ride * Airport Drop\n12/11/2025 → ₹1,250.00 debited\nAvailable Balance → ₹17,170.50`;
    const result = parseTransaction(rawText);

    expect(result.amount).toBe(-1250.00); // Converted to negative on 'debited'
    expect(result.description).toBe("Uber Ride * Airport Drop");
    expect(result.balance).toBe(17170.50);
    expect(result.date).toBeInstanceOf(Date);
    // 12/11/2025 -> MM/DD/YYYY is Dec 11, 2025
    expect(result.date?.getFullYear()).toBe(2025);
    expect(result.date?.getMonth()).toBe(11); // December (0-indexed is 11)
    expect(result.date?.getDate()).toBe(11);
    expect(result.category).toBe("Travel");
    expect(result.confidence).toBe(1.0); // 100% confidence
  });

  test("Sample 3: Amazon (Messy Single-Line Format)", () => {
    const rawText = `txn123 2025-12-10 Amazon.in Order #403-1234567-8901234 ₹2,999.00 Dr Bal 14171.50 Shopping`;
    const result = parseTransaction(rawText);

    expect(result.amount).toBe(-2999.00); // Converted to negative on 'Dr'
    expect(result.description).toBe("Amazon.in Order #403-1234567-8901234");
    expect(result.balance).toBe(14171.50);
    expect(result.date).toBeInstanceOf(Date);
    expect(result.date?.getFullYear()).toBe(2025);
    expect(result.date?.getMonth()).toBe(11); // December (0-indexed is 11)
    expect(result.date?.getDate()).toBe(10);
    expect(result.category).toBe("Shopping");
    expect(result.confidence).toBe(1.0); // 100% confidence
  });

  test("Partial Match: Missing Balance", () => {
    const rawText = `Date: 11 Dec 2025\nDescription: STARBUCKS COFFEE MUMBAI\nAmount: -420.00`;
    const result = parseTransaction(rawText);

    expect(result.amount).toBe(-420.00);
    expect(result.description).toBe("STARBUCKS COFFEE MUMBAI");
    expect(result.balance).toBeNull();
    expect(result.confidence).toBe(0.85); // Amount (40%) + Date (25%) + Description (20%) = 85%
  });
});
