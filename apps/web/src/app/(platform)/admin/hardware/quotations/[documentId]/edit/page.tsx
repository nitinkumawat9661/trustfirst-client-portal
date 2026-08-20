import { redirect } from "next/navigation";

export default async function LegacyEstimateEditPage({ params }: { params: Promise<{ documentId: string }> }) {
  const { documentId } = await params;
  redirect(`/admin/hardware/bills/${documentId}/edit`);
}
