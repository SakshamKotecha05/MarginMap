import type { Classification } from "@/lib/classify";

const config: Record<Classification, { label: string; dot: string; className: string }> = {
  zombie:  { label: "Zombie",     dot: "bg-red-500",     className: "bg-red-50 text-red-700 ring-1 ring-red-100" },
  gem:     { label: "Hidden Gem", dot: "bg-emerald-500", className: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100" },
  gateway: { label: "Gateway",    dot: "bg-amber-500",   className: "bg-amber-50 text-amber-700 ring-1 ring-amber-100" },
  healthy: { label: "Healthy",    dot: "bg-gray-400",    className: "bg-gray-50 text-gray-600 ring-1 ring-gray-100" },
};

export default function ClassificationBadge({ classification }: { classification: Classification }) {
  const { label, dot, className } = config[classification];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${className}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  );
}
