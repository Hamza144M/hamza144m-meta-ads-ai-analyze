import Link from "next/link";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link href="/" className={`flex items-center gap-2 font-semibold text-slate-900 dark:text-white ${className}`}>
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-brand-500 to-indigo-600 text-white shadow-lift">
        <svg
          viewBox="0 0 24 24"
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M3 17l5-5 4 4 8-9" />
          <path d="M15 7h5v5" />
        </svg>
      </span>
      <span>
        Meta Ads <span className="text-brand-600 dark:text-brand-400">AI</span> Analyzer
      </span>
    </Link>
  );
}
