import Link from "next/link";
import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { StaffEditPanel } from "@/components/staff-panels";
import { authOptions } from "@/lib/auth-options";
import { ensureAppBootstrap } from "@/lib/ensure-bootstrap";
import { getStaffById } from "@/staff/manage";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function StaffEditPage({ params }: PageProps) {
  await ensureAppBootstrap();
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login");
  }
  if (session.user.role === "PERSONAL") {
    redirect("/performance");
  }
  if (session.user.role !== "ADMIN") {
    redirect("/staff");
  }

  const { id } = await params;
  const person = await getStaffById(id);
  if (!person) {
    notFound();
  }

  return (
    <main className="mx-auto flex min-h-full max-w-3xl flex-col gap-6 px-4 py-10 sm:px-6">
      <header className="space-y-2">
        <p className="text-sm text-zinc-500">
          <Link href="/staff" className="underline underline-offset-2">
            店員主檔
          </Link>
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">
          {person.primaryNickname}
        </h1>
      </header>
      <StaffEditPanel person={person} storeId={person.storeId} />
    </main>
  );
}
