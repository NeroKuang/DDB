import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { StaffEditPanel } from "@/components/staff-panels";
import { authOptions } from "@/lib/auth-options";
import { resolvePeriodKey } from "@/lib/resolve-period-key";
import { listPeriodOptions } from "@/pay-period/list-period-options";
import { getStaffById } from "@/staff/manage";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ period?: string }>;
};

export default async function StaffEditPage({
  params,
  searchParams,
}: PageProps) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role === "PERSONAL") {
    redirect("/performance");
  }
  if (session?.user?.role !== "ADMIN") {
    redirect("/staff");
  }

  const { id } = await params;
  const query = await searchParams;
  const person = await getStaffById(id);
  if (!person) {
    notFound();
  }

  const periodKey = await resolvePeriodKey({
    searchParam: query.period,
    storeId: person.storeId,
  });
  const periodOptions = await listPeriodOptions(person.storeId);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={person.primaryNickname} />
      <StaffEditPanel
        person={person}
        storeId={person.storeId}
        periodOptions={periodOptions}
        defaultGuestPeriodKey={periodKey}
      />
    </div>
  );
}
