export default function Home() {
  return (
    <main className="mx-auto flex min-h-full max-w-xl flex-col justify-center gap-4 px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">DDB 業績補償</h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        本機開發伺服器 port 5003。登入、匯入與薪資報表尚未接上，請先看{" "}
        <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-sm dark:bg-zinc-800">
          README.md
        </code>{" "}
        與規格。
      </p>
    </main>
  );
}
