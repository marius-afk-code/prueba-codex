import Link from "next/link";

const items = [
  ["Dashboard", "/"],
  ["Players", "/players"],
  ["Matches", "/matches"],
  ["Reports", "/reports"],
  ["AI Studio", "/ai"],
  ["Settings", "/settings/workspace"],
] as const;

export function Sidebar() {
  return (
    <aside className="w-64 p-4 border-r border-slate-800 min-h-screen">
      <h1 className="font-semibold text-xl mb-6">ScoutFlow</h1>
      <nav className="space-y-2">
        {items.map(([label, href]) => (
          <Link key={href} href={href} className="block card hover:bg-slate-800 transition">
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
