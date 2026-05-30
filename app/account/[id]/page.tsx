import AccountDetail from "@/components/AccountDetail";

export default async function AccountPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AccountDetail accountId={id} />;
}
