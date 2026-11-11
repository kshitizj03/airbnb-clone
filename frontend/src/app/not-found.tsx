import Link from "next/link";

const links = [
  { href: "/", label: "Home" },
  { href: "/wishlists", label: "Wishlists" },
  { href: "/trips", label: "Trips" },
  { href: "/become-a-host", label: "Become a host" },
];

export default function NotFound() {
  return (
    <div className="mx-auto max-w-[1760px] px-4 py-16 md:px-20 md:py-24">
      <h1 className="text-[64px] leading-none font-bold md:text-[140px]">Oops!</h1>
      <h2 className="mt-6 text-section">We can&apos;t seem to find the page you&apos;re looking for.</h2>
      <p className="mt-4 text-sm text-secondary">Error code: 404</p>
      <p className="mt-8 text-sm">Here are some helpful links instead:</p>
      <ul className="mt-3 space-y-2 text-sm">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="text-legal hover:underline">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
