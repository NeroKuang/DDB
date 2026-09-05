import type {
  PeriodStaffInput,
  ShopInputs,
  StaffMaster,
  Venue,
} from "@/compile/types";

import { DEFAULT_COMMISSION_RATE } from "@/lib/commission-rate";

function hourly(
  title: string,
  legalName: string,
  primaryNickname: string,
  hourlyRate: number,
  extras: Partial<StaffMaster> = {}
): StaffMaster {
  return {
    legalName,
    primaryNickname,
    aliases: [],
    title,
    kind: "regular",
    payKind: "hourly",
    hourlyRate,
    monthlyPay: 0,
    commissionRate: DEFAULT_COMMISSION_RATE,
    targetBonusAmount: 0,
    laborHealthInsuranceAmount: 0,
    laborHealthInsuranceMode: "fixed",
    laborHealthInsuranceRatio: 0,
    laborHealthInsuranceCarryOverMonthly: true,
    payNote: "",
    ...extras,
  };
}

function monthly(
  title: string,
  legalName: string,
  primaryNickname: string,
  monthlyPay: number,
  extras: Partial<StaffMaster> = {}
): StaffMaster {
  return {
    ...hourly(title, legalName, primaryNickname, 0, extras),
    payKind: "monthly",
    monthlyPay,
  };
}

function guest(
  primaryNickname: string,
  extras: Partial<StaffMaster> = {}
): StaffMaster {
  return {
    legalName: "",
    primaryNickname,
    aliases: [],
    title: "",
    kind: "guest",
    payKind: "monthly",
    hourlyRate: 0,
    monthlyPay: 2000,
    commissionRate: DEFAULT_COMMISSION_RATE,
    targetBonusAmount: 0,
    laborHealthInsuranceAmount: 0,
    laborHealthInsuranceMode: "fixed",
    laborHealthInsuranceRatio: 0,
    laborHealthInsuranceCarryOverMonthly: true,
    payNote: "麻煩匯給叔叔",
    ...extras,
  };
}

function manuals(partial: {
  demerits?: number;
  ot?: number;
  allowance?: number;
  allowanceNote?: string;
}): {
  demerits: number;
  overtimeWithHoliday: number;
  overtimeWithoutHoliday: number;
  allowance: number;
  allowanceNote: string;
  repayment: number;
  photoCommission: number;
} {
  return {
    demerits: partial.demerits ?? 0,
    overtimeWithHoliday: partial.ot ?? 0,
    overtimeWithoutHoliday: partial.ot ?? 0,
    allowance: partial.allowance ?? 0,
    allowanceNote: partial.allowanceNote ?? "",
    repayment: 0,
    photoCommission: 0,
  };
}

function frontPeriod(
  primaryNickname: string,
  opts: {
    payTarget?: boolean;
    insuranceOn?: Venue;
    demerits?: number;
    ot?: number;
    allowance?: number;
    allowanceNote?: string;
  } = {}
): PeriodStaffInput {
  return {
    primaryNickname,
    addBackOfHouseRow: false,
    landInsuranceOn: opts.insuranceOn ?? "frontOfHouse",
    landTargetOn: "frontOfHouse",
    landMonthlyOn: "frontOfHouse",
    landTaskBonusOn: "frontOfHouse",
    payTargetBonus: opts.payTarget ?? false,
    perRow: {
      frontOfHouse: manuals(opts),
    },
  };
}

export function zhongshanJuly2026Shop(): ShopInputs {
  const staff: StaffMaster[] = [
    hourly("店長", "何思蓉", "祤晞", 230, {
      targetBonusAmount: 8000,
      laborHealthInsuranceAmount: 2100,
    }),
    hourly("公關", "李珮甄", "希海", 230, {
      laborHealthInsuranceAmount: 2100,
    }),
    hourly("", "林玥伶", "鴉", 230, {
      targetBonusAmount: 8000,
      laborHealthInsuranceAmount: 2100,
    }),
    hourly("", "王郁珊", "雪乃", 230),
    hourly("", "楊佳靜", "羊羊", 230),
    hourly("", "林昱樺", "愛野", 230, { laborHealthInsuranceAmount: 2100 }),
    hourly("", "邱霞琳", "Kuruma", 230, { laborHealthInsuranceAmount: 2100 }),
    hourly("", "黃若茵", "譚雅", 230),
    hourly("", "楊舒閔", "茉捺", 230),
    hourly("", "陳筠婷", "優姬", 230),
    hourly("", "彭子寧", "粉冥", 230, {
      targetBonusAmount: 8000,
      laborHealthInsuranceAmount: 2100,
    }),
    hourly("", "謝媐元", "小妍", 230, { targetBonusAmount: 8000 }),
    hourly("", "李垵儀", "茶喵", 230),
    hourly("", "曹幸芳", "恋雪", 230, { targetBonusAmount: 8000 }),
    hourly("", "宋婷", "夢璃", 230),
    hourly("", "林軒如", "乙醚", 200),
    hourly("", "戴佑庭", "久橙", 200, { laborHealthInsuranceAmount: 4200 }),
    hourly("", "黃雨萍", "理奈", 200),
    hourly("", "王靜儀", "小蓮", 200),
    hourly("", "翁靈婷", "黑夢", 200, { aliases: ["黒夢"] }),
    hourly("", "鍾筑亘", "清酒", 200),
    hourly("", "陳子蘐", "小浬", 200),
    hourly("", "梁馨予", "娜比", 200),
    hourly("", "張云嘉", "殘月", 200),
    hourly("不保", "陳泱蓉", "江梨花", 230, { aliases: ["梨花"] }),
    monthly("", "湯禎瑜", "湯圓", 42000, { laborHealthInsuranceAmount: 2542 }),
    hourly("不保", "洪秀芳", "Fanny", 230),
    hourly("契約", "林晏儀", "潔西", 230),
    hourly("", "程鎮浩", "程程", 230),
    monthly("", "羅上鈞", "空想", 38000, { laborHealthInsuranceAmount: 2542 }),
    hourly("排班", "", "夏眠", 0),
    guest("小楓", { targetBonusAmount: 3000 }),
    guest("七津希", { targetBonusAmount: 3000 }),
    guest("偷洗", { targetBonusAmount: 0, payNote: "" }),
    guest("琦玥", { targetBonusAmount: 1000 }),
    guest("小寧", { targetBonusAmount: 1000 }),
  ];

  const periodStaff: PeriodStaffInput[] = [
    frontPeriod("祤晞", {
      payTarget: true,
      demerits: 6,
      ot: 1.5,
      allowance: 10000,
    }),
    frontPeriod("希海", { demerits: 3, ot: 2, allowance: 17462.14 }),
    frontPeriod("鴉", { payTarget: true, demerits: 3, ot: 1.5 }),
    frontPeriod("雪乃"),
    frontPeriod("羊羊"),
    frontPeriod("愛野", { ot: 0.5 }),
    frontPeriod("Kuruma", { demerits: 1 }),
    frontPeriod("譚雅"),
    frontPeriod("茉捺"),
    frontPeriod("優姬"),
    frontPeriod("粉冥", { payTarget: true, ot: 1 }),
    frontPeriod("小妍", { payTarget: true, ot: 1 }),
    frontPeriod("茶喵"),
    frontPeriod("恋雪", { payTarget: true }),
    frontPeriod("夢璃"),
    frontPeriod("乙醚"),
    {
      primaryNickname: "久橙",
      addBackOfHouseRow: true,
      venueSalesSplit: { frontOfHouse: 1150, backOfHouse: 2950 },
      hoursSplit: { frontOfHouse: 11.5, backOfHouse: 60 },
      landInsuranceOn: "backOfHouse",
      landTargetOn: "frontOfHouse",
      landMonthlyOn: "frontOfHouse",
      landTaskBonusOn: "frontOfHouse",
      payTargetBonus: false,
      perRow: {
        frontOfHouse: manuals({ demerits: 1 }),
        backOfHouse: manuals({ ot: 2.5 }),
      },
    },
    frontPeriod("理奈"),
    frontPeriod("小蓮"),
    frontPeriod("黑夢", { demerits: 1 }),
    frontPeriod("清酒"),
    frontPeriod("小浬"),
    frontPeriod("娜比"),
    frontPeriod("殘月", { demerits: 6 }),
    frontPeriod("江梨花"),
    frontPeriod("湯圓", { ot: 12.5 }),
    frontPeriod("Fanny"),
    frontPeriod("潔西", { ot: 2.5 }),
    frontPeriod("程程"),
    frontPeriod("空想"),
    frontPeriod("夏眠", { allowance: 5000, allowanceNote: "行政加給" }),
    frontPeriod("小楓", { payTarget: true, allowance: 14335 }),
    frontPeriod("七津希", { payTarget: true, allowance: 8478 }),
    frontPeriod("偷洗", { allowance: -143 }),
    frontPeriod("琦玥", { payTarget: true, allowance: 3937 }),
    frontPeriod("小寧", { payTarget: true, allowance: 6905 }),
  ];

  return {
    demeritUnitAmount: 230,
    staff,
    periodStaff,
    templateTasks: [],
    adHocTasks: [],
    rollups: {},
  };
}
