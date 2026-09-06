/** Thin silver corner ticks for dialog / panel frames (no pointed peaks). */
export function FrameCornerTicks({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`pointer-events-none absolute inset-0 h-full w-full text-[var(--silver)] ${className}`}
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden
    >
      <path
        d="M0 6 V0 H6 M94 0 H100 V6 M100 94 V100 H94 M6 100 H0 V94"
        fill="none"
        stroke="currentColor"
        strokeWidth="0.3"
        vectorEffect="non-scaling-stroke"
        opacity="0.55"
      />
    </svg>
  );
}

/** Shared chrome inside `payroll-dialog` (corners + content stack). */
export function DialogShellChrome({ children }: { children: React.ReactNode }) {
  return (
    <>
      <FrameCornerTicks />
      <div className="relative z-[1] space-y-4">{children}</div>
    </>
  );
}
