# Next 16.3「destination stream closed early」視為良性中斷

App Router RSC 串流若客戶端先離開（換頁、重新整理、代理關閉連線），Next 16.3 可能把此記成 render error。見 vercel/next.js#96704。DDB 用 `src/instrumentation.ts` 的 `onRequestError` 降成 warn，不當成業務失敗。真正取數錯誤仍看 `runWebFetchJob` 的 JSON error。
