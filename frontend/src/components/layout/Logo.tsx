/** Our own simple take on the Airbnb loop mark, drawn as an outline in rausch. */
export function Logo({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="#ff385c"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M12 2.6c-1 0-1.7.7-2.1 1.6L4.6 15.4c-1.3 2.7.5 5.2 3 5.2 1.6 0 3.2-1.2 4.4-3 1.2 1.8 2.8 3 4.4 3 2.5 0 4.3-2.5 3-5.2L14.1 4.2c-.4-.9-1.1-1.6-2.1-1.6z" />
      <path d="M12 17.2c-1.8-2.2-2.6-4-2.2-5.4.2-.9.9-1.6 2.2-1.6s2 .7 2.2 1.6c.4 1.4-.4 3.2-2.2 5.4z" />
    </svg>
  );
}
