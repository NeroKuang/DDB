import Link from "next/link";

export type PayrollStep = "fetch" | "compile" | "review" | "lock";

export function resolvePayrollStep(input: {
  locked: boolean;
  fetchRunning: boolean;
  hasImport: boolean;
  compileError: boolean;
  lockEligible: boolean;
}): PayrollStep {
  if (input.locked) {
    return "lock";
  }
  if (input.fetchRunning) {
    return "fetch";
  }
  if (!input.hasImport || input.compileError) {
    return "fetch";
  }
  if (!input.lockEligible) {
    return "review";
  }
  return "lock";
}

const STEPS: { id: PayrollStep; label: string }[] = [
  { id: "fetch", label: "① 取數／匯入" },
  { id: "compile", label: "② 編成" },
  { id: "review", label: "③ 核對" },
  { id: "lock", label: "④ 鎖定" },
];

export function PayrollStepper({ current }: { current: PayrollStep }) {
  const currentIndex = STEPS.findIndex((step) => step.id === current);

  return (
    <nav aria-label="月結流程" className="stepper-bar flex flex-wrap gap-2">
      {STEPS.map((step, index) => {
        const done = index < currentIndex;
        const active = step.id === current;
        const className = active
          ? "stepper-step--active"
          : done
            ? "stepper-step--done"
            : "stepper-step--pending";
        return (
          <span key={step.id} className={className}>
            {step.label}
            {done ? " ✓" : ""}
          </span>
        );
      })}
      <Link
        href="/"
        className="ml-auto self-center text-xs text-[var(--accent)] underline underline-offset-2"
      >
        回中控台
      </Link>
    </nav>
  );
}
