import { describe, expect, it } from "vitest";
import { parseTransactionCsv } from "../../src/lib/member4/import/csvParser.js";

describe("Member 4 CSV parser hardening", () => {
  it("parses DD/MM/YYYY without US month/day ambiguity", () => {
    const parsed = parseTransactionCsv(
      "date,symbol,side,quantity,price\n04/05/2026,ASTE,BUY,2,100"
    );
    expect(parsed.invalid).toHaveLength(0);
    expect(parsed.valid[0]?.timestamp).toBe("2026-05-04T00:00:00.000Z");
  });

  it("rejects impossible day-first calendar dates", () => {
    const parsed = parseTransactionCsv(
      "date,symbol,side,quantity,price\n31/02/2026,ASTE,BUY,2,100"
    );
    expect(parsed.valid).toHaveLength(0);
    expect(parsed.invalid[0]?.messages.join(" ")).toMatch(/date format/i);
  });

  it("preserves commas inside quoted fields", () => {
    const parsed = parseTransactionCsv(
      'date,symbol,side,quantity,price,note\n2026-05-04,ASTE,BUY,2,100,"first, long entry"'
    );
    expect(parsed.valid).toHaveLength(1);
    expect(parsed.valid[0]?.note).toBe("first, long entry");
  });
});
