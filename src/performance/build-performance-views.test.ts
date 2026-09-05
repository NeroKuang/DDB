import { zhongshanJuly2026Shop } from "@/compile/zhongshan-july-2026-shop";
import {
  buildStaffPerformanceViews,
  pickStaffPerformanceView,
} from "@/performance/build-performance-views";
import type { PerformancePeriodInput } from "@/performance/load-performance-input";

describe("buildStaffPerformanceViews", () => {
  const shop = zhongshanJuly2026Shop();
  const fenMing = shop.staff.find((s) => s.primaryNickname === "粉冥");
  if (!fenMing) {
    throw new Error("粉冥 missing");
  }

  it("list row matches detail pick for the same staff", () => {
    const input: PerformancePeriodInput = {
      periodLabel: "test",
      periodKey: "2026-07",
      source: "fixture",
      noteDrilldownsFromFixtureFallback: false,
      period: {
        start: new Date("2026-07-01T00:00:00+08:00"),
        end: new Date("2026-07-31T23:59:59+08:00"),
      },
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
      itemUnitPrices: new Map(),
      posItemCatalog: new Map(),
      periodNicknameAttributions: new Map(),
      staff: shop.staff,
      templateTasks: [],
      adHocTasks: [],
    };
    const views = buildStaffPerformanceViews(input);
    const picked = pickStaffPerformanceView(views, fenMing);
    expect(picked).toBeDefined();
    expect(picked!.personalSales.original).toBe(1000);
    expect(
      views.find((v) => v.primaryNickname === "粉冥")?.personalSales
    ).toEqual(picked!.personalSales);
  });
});
