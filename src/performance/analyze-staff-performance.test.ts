import { zhongshanJuly2026Shop } from "@/compile/zhongshan-july-2026-shop";
import { parseCheckoutFile } from "@/import/parse-checkout";
import {
  itemNameFromDrilldownFilename,
  parseNoteDrilldown,
} from "@/import/parse-note-analysis";
import {
  JULY_2026_PERIOD,
  july2026FixturePaths,
} from "@/lib/july-2026-fixtures";
import {
  analyzeStaffPerformance,
  resolveStaffByNickname,
} from "@/performance/analyze-staff-performance";
import type { CheckoutNoteLine } from "@/import/parse-checkout";

describe("analyzeStaffPerformance", () => {
  const shop = zhongshanJuly2026Shop();
  const fenMing = resolveStaffByNickname(shop.staff, "粉冥");
  if (!fenMing) {
    throw new Error("粉冥 missing from shop master");
  }

  it("sums non-voided 業績注記 into 個人業績 for 粉冥 from July fixtures", async () => {
    const paths = july2026FixturePaths();
    const period = {
      start: new Date(JULY_2026_PERIOD.startIso),
      end: new Date(JULY_2026_PERIOD.endIso),
    };
    const checkoutLines = await parseCheckoutFile(paths.checkout, period);
    const noteClicks = (
      await Promise.all(
        paths.noteDrilldowns.map((filePath) =>
          parseNoteDrilldown(filePath, itemNameFromDrilldownFilename(filePath))
        )
      )
    ).flat();
    const view = analyzeStaffPerformance({
      staff: fenMing,
      checkoutLines,
      noteClicks,
      templateTasks: [{ itemName: "修女貪杯", amountPerClick: 50, tiers: [] }],
    });
    expect(view.personalSales).toEqual({ original: 75685, stored: 75685 });
    expect(view.commission).toEqual({ original: 15137, stored: 15137 });
    expect(view.lineItems.length).toBeGreaterThan(0);
    expect(view.lineItems.every((item) => item.amount >= 0)).toBe(true);
    const rooting = view.noteList.find((row) => row.itemName === "修女貪杯");
    expect(rooting?.clicks).toBe(20);
    expect(rooting?.taskBonus).toEqual({ original: 1000, stored: 1000 });
    expect(rooting?.perClickBonus).toBe(1000);
    expect(rooting?.targetBonus).toBe(0);
    expect(view.taskBonus.original).toBeGreaterThanOrEqual(1000);
  });

  it("adds cumulative 任務達標 on top of 單筆任務獎金", () => {
    const view = analyzeStaffPerformance({
      staff: fenMing,
      checkoutLines: [],
      noteClicks: [
        {
          itemName: "修女貪杯",
          nickname: "粉冥",
          clicks: 20,
        },
      ],
      templateTasks: [
        {
          itemName: "修女貪杯",
          amountPerClick: 50,
          tiers: [
            { minClicks: 10, bonusAmount: 500 },
            { minClicks: 20, bonusAmount: 300 },
          ],
        },
      ],
    });
    const rooting = view.noteList.find((row) => row.itemName === "修女貪杯");
    expect(rooting?.perClickBonus).toBe(1000);
    expect(rooting?.targetBonus).toBe(800);
    expect(rooting?.taskBonus.original).toBe(1800);
    expect(view.taskBonus.original).toBe(1800);
  });

  it("keeps stored overrides while preserving originals", () => {
    const view = analyzeStaffPerformance({
      staff: fenMing,
      checkoutLines: [
        {
          nickname: "粉冥",
          amount: 1000,
          orderer: "A",
          at: new Date("2026-07-10T21:00:00+08:00"),
          voided: false,
        },
      ],
      noteClicks: [],
      storedOverrides: { personalSales: 900, commission: 180 },
    });
    expect(view.personalSales).toEqual({ original: 1000, stored: 900 });
    expect(view.commission).toEqual({ original: 200, stored: 180 });
  });

  it("puts empty-訂購人 lines in 業績項 but not 客人分析", () => {
    const lines: CheckoutNoteLine[] = [
      {
        nickname: "粉冥",
        amount: 1000,
        orderer: "",
        at: new Date("2026-07-10T21:00:00+08:00"),
        voided: false,
      },
      {
        nickname: "粉冥",
        amount: 500,
        orderer: "小美",
        at: new Date("2026-07-11T21:00:00+08:00"),
        voided: false,
      },
      {
        nickname: "粉冥",
        amount: 200,
        orderer: "小美",
        at: new Date("2026-07-12T21:00:00+08:00"),
        voided: false,
      },
      {
        nickname: "粉冥",
        amount: 300,
        orderer: "小美",
        at: new Date("2026-07-12T22:00:00+08:00"),
        voided: true,
      },
    ];
    const view = analyzeStaffPerformance({
      staff: fenMing,
      checkoutLines: lines,
      noteClicks: [],
    });
    expect(view.personalSales.original).toBe(1700);
    expect(view.lineItems).toHaveLength(3);
    expect(view.guestAnalysis).toEqual([
      { orderer: "小美", amount: 700, lineCount: 2 },
    ]);
  });

  it("matches 黒夢 alias onto 黑夢 staff", () => {
    const heiMeng = resolveStaffByNickname(shop.staff, "黒夢");
    expect(heiMeng?.primaryNickname).toBe("黑夢");
    const view = analyzeStaffPerformance({
      staff: heiMeng!,
      checkoutLines: [
        {
          nickname: "黒夢",
          amount: 100,
          orderer: "A",
          at: new Date("2026-07-10T21:00:00+08:00"),
          voided: false,
        },
      ],
      noteClicks: [],
    });
    expect(view.personalSales.original).toBe(100);
    expect(view.primaryNickname).toBe("黑夢");
  });

  it("includes 追加任務 in 任務獎金", () => {
    const view = analyzeStaffPerformance({
      staff: fenMing,
      checkoutLines: [],
      noteClicks: [],
      adHocTasks: [
        { primaryNickname: "粉冥", name: "活動加碼", amount: 1000 },
        { primaryNickname: "黑夢", name: "別人的", amount: 999 },
      ],
    });
    expect(view.adHocTasks).toEqual([{ name: "活動加碼", amount: 1000 }]);
    expect(view.taskBonus.original).toBe(1000);
  });
});
