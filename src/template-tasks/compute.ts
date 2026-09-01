import { roundMoney } from "@/lib/money";

export type TaskTargetTier = {
  minClicks: number;
  bonusAmount: number;
};

export type TemplateTaskBonusInput = {
  amountPerClick: number;
  tiers?: TaskTargetTier[];
};

export type TemplateTaskBonusBreakdown = {
  perClickBonus: number;
  targetBonus: number;
  total: number;
};

/**
 * 單筆任務獎金 and 任務達標 can run together.
 * 任務達標 tiers are cumulative: every tier with minClicks <= clicks is added.
 */
export function computeTemplateTaskBonus(
  clicks: number,
  task: TemplateTaskBonusInput
): TemplateTaskBonusBreakdown {
  const safeClicks = clicks > 0 ? clicks : 0;
  const perClickBonus = roundMoney(safeClicks * (task.amountPerClick || 0));
  const tiers = [...(task.tiers ?? [])].sort(
    (a, b) => a.minClicks - b.minClicks
  );
  let targetBonus = 0;
  for (const tier of tiers) {
    if (safeClicks >= tier.minClicks) {
      targetBonus = roundMoney(targetBonus + tier.bonusAmount);
    }
  }
  return {
    perClickBonus,
    targetBonus,
    total: roundMoney(perClickBonus + targetBonus),
  };
}
