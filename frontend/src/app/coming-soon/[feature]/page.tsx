import Link from "next/link";
import { buttonStyles } from "@/components/ui/Button";

// "identity-verification" -> "Identity verification"
const toLabel = (slug: string) => {
  const words = decodeURIComponent(slug).replace(/-/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
};

export default async function ComingSoon({ params }: { params: Promise<{ feature: string }> }) {
  const { feature } = await params;
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-24 text-center md:py-32">
      <h1 className="text-[32px] leading-10 font-semibold">{toLabel(feature)} is coming soon</h1>
      <p className="mt-3 text-secondary">We&apos;re still building this part. Check back later.</p>
      <Link href="/" className={buttonStyles("dark", "md", "mt-8")}>
        Go home
      </Link>
    </div>
  );
}
