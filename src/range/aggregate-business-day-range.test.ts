import { describe, expect, it } from "vitest";
import { parseIchefDateTime } from "@/lib/business-day";
import { aggregateBusinessDayRange } from "@/range/aggregate-business-day-range";

const staff = [
  {
    primaryNickname: "粉冥",
    legalName: "測試粉冥",
    kind: "REGULAR" as const,
    aliases: ["粉冥別名"],
    payKind: "hourly" as const,
    hourlyRate: 200,
    commissionRate: 0.2,
    storeDefaultCommissionRate: 0.2,
  },
];

describe("aggregateBusinessDayRange", () => {
  it("AC-1: bounds and overnight checkout attribution", () => {
    const overnight = parseIchefDateTime("2026/10/11 02:30:00")!;
    const result = aggregateBusinessDayRange({
      storeId: "store-1",
      startBusinessDate: "2026-10-10",
      endBusinessDate: "2026-10-12",
      coverage: [
        { businessDate: "2026-10-10", status: "ready" },
        { businessDate: "2026-10-11", status: "ready" },
        { businessDate: "2026-10-12", status: "ready" },
      ],
      staff,
      nicknameAttributions: new Map(),
      checkoutLines: [
        {
          businessDate: "2026-10-10",
          nickname: "粉冥",
          amount: 1000,
          orderer: "",
          voided: false,
          occurredAt: overnight,
        },
      ],
      punchPairs: [],
    });

    expect(result.bounds).toEqual({
      startIso: "2026-10-10T12:00:00+08:00",
      endIso: "2026-10-13T12:00:00+08:00",
    });
    expect(result.complete).toBe(true);
    expect(result.rows[0]?.sales).toBe(1000);
    expect(result.rows[0]?.commissionEstimate).toBe(200);
    expect(
      result.rows[0]?.perDay.find((d) => d.businessDate === "2026-10-10")?.sales
    ).toBe(1000);
  });

  it("AC-2/AC-3: hours null when any day missing; punches by clock-in business date", () => {
    const result = aggregateBusinessDayRange({
      storeId: "store-1",
      startBusinessDate: "2026-10-12",
      endBusinessDate: "2026-10-13",
      coverage: [
        { businessDate: "2026-10-12", status: "ready" },
        { businessDate: "2026-10-13", status: "missing" },
      ],
      staff,
      nicknameAttributions: new Map(),
      checkoutLines: [
        {
          businessDate: "2026-10-12",
          nickname: "粉冥",
          amount: 500,
          orderer: "",
          voided: false,
          occurredAt: parseIchefDateTime("2026/10/12 20:00:00")!,
        },
      ],
      punchPairs: [
        {
          businessDate: "2026-10-12",
          nickname: "粉冥",
          hours: 9,
          clockInAt: parseIchefDateTime("2026/10/12 18:00:00")!,
        },
      ],
    });

    expect(result.complete).toBe(false);
    expect(result.rows[0]?.sales).toBe(500);
    expect(result.rows[0]?.hours).toBeNull();
    expect(result.rows[0]?.hourlyBasePayEstimate).toBeNull();
  });

  it("excludes voided lines and tracks unmatched nicknames", () => {
    const result = aggregateBusinessDayRange({
      storeId: "store-1",
      startBusinessDate: "2026-10-10",
      endBusinessDate: "2026-10-10",
      coverage: [{ businessDate: "2026-10-10", status: "ready" }],
      staff,
      nicknameAttributions: new Map(),
      checkoutLines: [
        {
          businessDate: "2026-10-10",
          nickname: "粉冥",
          amount: 100,
          orderer: "",
          voided: true,
          occurredAt: parseIchefDateTime("2026/10/10 20:00:00")!,
        },
        {
          businessDate: "2026-10-10",
          nickname: "未知客",
          amount: 300,
          orderer: "",
          voided: false,
          occurredAt: parseIchefDateTime("2026/10/10 21:00:00")!,
        },
      ],
      punchPairs: [],
    });

    expect(result.rows).toHaveLength(0);
    expect(result.unmatchedNicknames).toEqual([
      { nickname: "未知客", amount: 300 },
    ]);
  });

  it("personalView strips hours fields", () => {
    const result = aggregateBusinessDayRange({
      storeId: "store-1",
      startBusinessDate: "2026-10-10",
      endBusinessDate: "2026-10-10",
      coverage: [{ businessDate: "2026-10-10", status: "ready" }],
      staff,
      nicknameAttributions: new Map(),
      checkoutLines: [
        {
          businessDate: "2026-10-10",
          nickname: "粉冥",
          amount: 1000,
          orderer: "",
          voided: false,
          occurredAt: parseIchefDateTime("2026/10/10 20:00:00")!,
        },
      ],
      punchPairs: [
        {
          businessDate: "2026-10-10",
          nickname: "粉冥",
          hours: 5,
          clockInAt: parseIchefDateTime("2026/10/10 18:00:00")!,
        },
      ],
      personalView: true,
    });

    expect(result.rows[0]?.hours).toBeNull();
    expect(result.rows[0]?.hourlyBasePayEstimate).toBeNull();
    expect(result.rows[0]?.sales).toBe(1000);
  });
});
