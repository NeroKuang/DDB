import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { StaffEditPanel } from "@/components/staff-panels";
import { authOptions } from "@/lib/auth-options";
import { getStaffById } from "@/staff/manage";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function StaffEditPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role === "PERSONAL") {
    redirect("/performance");
  }
  if (session?.user?.role !== "ADMIN") {
    redirect("/staff");
  }

  const { id } = await params;
  const person = await getStaffById(id);
  if (!person) {
    notFound();
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <PageHeader title={person.primaryNickname} />
      <StaffEditPanel person={person} storeId={person.storeId} />
    </div>
  );
}
