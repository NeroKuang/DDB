import { isInPayPeriod, parseIchefDateTime } from "@/lib/business-day";
import { readFirstSheetRows } from "@/import/read-xlsx-sheet";

const SECTION_MARKERS = new Set(["無下班記錄", "無上班記錄"]);
const SKIP_HEADERS = new Set(["admin"]);

export type PunchPair = {
  nickname: string;
  clockIn: Date;
  clockOut: Date;
  hours: number;
};

export type UnpairedPunch = {
  nickname: string;
  at: Date;
  kind: "clockIn" | "clockOut";
};

export type ParsedPunches = {
  pairs: PunchPair[];
  unpaired: UnpairedPunch[];
};

function parseHoursLabel(raw: string): number | null {
  const match = raw.match(/^(\d+)小時(\d+)分$/);
  if (!match) {
    return null;
  }
  return Number(match[1]) + Number(match[2]) / 60;
}

export async function parsePunchFile(
  filePath: string,
  period: { start: Date; end: Date }
): Promise<ParsedPunches> {
  const rows = await readFirstSheetRows(filePath);
  const pairs: PunchPair[] = [];
  const unpaired: UnpairedPunch[] = [];
  let nickname = "";
  let pendingIn: Date | null = null;

  const flushUnpairedIn = () => {
    if (pendingIn && nickname) {
      unpaired.push({ nickname, at: pendingIn, kind: "clockIn" });
    }
    pendingIn = null;
  };

  for (const row of rows) {
    const c1 = (row[0] ?? "").trim();
    const c2 = (row[1] ?? "").trim();
    const c3 = (row[2] ?? "").trim();
    if (!c1) {
      continue;
    }
    if (SKIP_HEADERS.has(c1) || c1.startsWith("總時數")) {
      continue;
    }
    if (SECTION_MARKERS.has(c1) && !c2) {
      flushUnpairedIn();
      continue;
    }
    if (c1 === "上班") {
      flushUnpairedIn();
      pendingIn = parseIchefDateTime(c2);
      continue;
    }
    if (c1 === "下班") {
      const clockOut = parseIchefDateTime(c2);
      if (pendingIn && clockOut && nickname) {
        const labeled = parseHoursLabel(c3);
        const hours =
          labeled ?? (clockOut.getTime() - pendingIn.getTime()) / 3_600_000;
        if (isInPayPeriod(pendingIn, period.start, period.end)) {
          pairs.push({
            nickname,
            clockIn: pendingIn,
            clockOut,
            hours,
          });
        }
      } else if (clockOut && nickname) {
        unpaired.push({ nickname, at: clockOut, kind: "clockOut" });
      }
      pendingIn = null;
      continue;
    }
    if (!c2) {
      flushUnpairedIn();
      nickname = c1;
    }
  }
  flushUnpairedIn();
  return { pairs, unpaired };
}
