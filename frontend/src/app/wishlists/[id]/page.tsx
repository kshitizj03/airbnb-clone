import { WishlistDetailPage } from "@/components/wishlist/WishlistDetailPage";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <WishlistDetailPage id={id} />;
}
