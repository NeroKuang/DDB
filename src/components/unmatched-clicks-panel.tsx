"use client";

import { useState } from "react";

const PREVIEW_LIMIT = 40;

export type UnmatchedClickRow = {
  itemName: string;
  nickname: string;
  clicks: number;
};

export function UnmatchedClicksPanel({
  unmatchedClicks,
}: {
  unmatchedClicks: UnmatchedClickRow[];
}) {
  const [showAll, setShowAll] = useState(false);

  if (unmatchedClicks.length === 0) {
    return null;
  }

  const visible = showAll
    ? unmatchedClicks
    : unmatchedClicks.slice(0, PREVIEW_LIMIT);
  const hiddenCount = unmatchedClicks.length - visible.length;

  return (
    <section
      id="unmatched-clicks"
      className="card-surface scroll-mt-24 space-y-2 p-4"
    >
      <h2 className="text-base font-medium">未對上的點選</h2>
      <p className="text-xs text-muted">
        來自注記分析；不擋鎖定。共 {unmatchedClicks.length} 筆。
      </p>
      <ul className="list-inside list-disc text-sm opacity-80">
        {visible.map((item) => (
          <li key={`${item.itemName}-${item.nickname}-${item.clicks}`}>
            {item.itemName}／{item.nickname}：{item.clicks} 次
          </li>
        ))}
      </ul>
      {unmatchedClicks.length > PREVIEW_LIMIT ? (
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="btn-secondary px-2.5 py-1 text-xs"
            onClick={() => setShowAll((value) => !value)}
            aria-expanded={showAll}
          >
            {showAll ? "收合列表" : `列出全部（另 ${hiddenCount} 筆）`}
          </button>
          {!showAll ? (
            <span className="text-xs text-muted">
              目前顯示前 {PREVIEW_LIMIT} 筆。
            </span>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
