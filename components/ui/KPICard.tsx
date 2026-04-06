import type { ReactNode } from "react";

type Color = "red" | "green" | "amber" | "blue" | "gray";

const styles: Record<Color, { border: string; value: string; iconBg: string; glow: string }> = {
  red:   { border: "border-l-red-500",     value: "text-red-600",     iconBg: "bg-red-50 text-red-500",     glow: "glow-red" },
  green: { border: "border-l-emerald-500", value: "text-emerald-600", iconBg: "bg-emerald-50 text-emerald-500", glow: "glow-green" },
  amber: { border: "border-l-amber-500",   value: "text-amber-600",   iconBg: "bg-amber-50 text-amber-500",   glow: "glow-amber" },
  blue:  { border: "border-l-blue-500",    value: "text-blue-600",    iconBg: "bg-blue-50 text-blue-500",    glow: "glow-blue" },
  gray:  { border: "border-l-gray-400",    value: "text-gray-700",    iconBg: "bg-gray-50 text-gray-500",    glow: "" },
};

interface KPICardProps {
  title: string;
  value: string;
  subtitle?: string;
  color?: Color;
  icon?: ReactNode;
}

export default function KPICard({ title, value, subtitle, color = "blue", icon }: KPICardProps) {
  const s = styles[color];
  return (
    <div className={`bg-white rounded-2xl shadow-sm p-5 border-l-4 ${s.border} card-hover`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1.5">{title}</p>
          <p className={`text-2xl lg:text-3xl font-bold tabular leading-tight ${s.value}`}>{value}</p>
          {subtitle && (
            <p className="text-[11px] text-gray-400 mt-1.5 leading-relaxed">{subtitle}</p>
          )}
        </div>
        {icon && (
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-lg ${s.iconBg}`}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
