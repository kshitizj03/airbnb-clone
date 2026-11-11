import { ListingEditor } from "@/components/hosting/ListingEditor";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ListingEditor id={id} />;
}
