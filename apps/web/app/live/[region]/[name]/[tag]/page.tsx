import LiveScout from "@/components/LiveScout";

export const dynamic = "force-dynamic";

export default async function LivePage({
  params,
}: {
  params: Promise<{ region: string; name: string; tag: string }>;
}) {
  const { region, name, tag } = await params;
  return (
    <LiveScout
      region={region}
      name={decodeURIComponent(name)}
      tag={decodeURIComponent(tag)}
    />
  );
}
