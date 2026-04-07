import type { ReactNode } from "react";

type Color = "red" | "green" | "amber" | "blue" | "gray";

const dots: Record<Color, string> = {
  red:   "bg-red-500",
  green: "bg-emerald-500",
  amber: "bg-amber-500",
  blue:  "bg-blue-500",
  gray:  "bg-gray-400",
};

const cardBgs: Record<Color, string> = {
  red:   "bg-gradient-to-br from-red-100/65 to-white",
  green: "bg-gradient-to-br from-emerald-100/65 to-white",
  amber: "bg-gradient-to-br from-amber-100/65 to-white",
  blue:  "bg-gradient-to-br from-blue-100/65 to-white",
  gray:  "bg-white",
};

const iconBgs: Record<Color, string> = {
  red:   "bg-red-50 text-red-500",
  green: "bg-emerald-50 text-emerald-500",
  amber: "bg-amber-50 text-amber-500",
  blue:  "bg-blue-50 text-blue-500",
  gray:  "bg-gray-50 text-gray-500",
};

interface KPICardProps {
  title: string;
  value: string;
  subtitle?: string;
  color?: Color;
  icon?: ReactNode;
}

export default function KPICard({ title, value, subtitle, color = "blue", icon }: KPICardProps) {
  return (
    <div className={`${cardBgs[color]} rounded-2xl shadow-md p-4 sm:p-6 card-hover`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-slate-400 mb-1.5 sm:mb-2">{title}</p>
          <p className="text-xl sm:text-2xl lg:text-3xl font-bold tabular leading-tight text-slate-900">{value}</p>
          {subtitle && (
            <div className="flex items-center gap-1.5 mt-2">
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dots[color]}`} />
              <p className="text-[11px] text-slate-400 leading-relaxed">{subtitle}</p>
            </div>
          )}
        </div>
        {icon && (
          <div className={`hidden sm:flex w-10 h-10 rounded-xl items-center justify-center flex-shrink-0 text-lg ${iconBgs[color]}`}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
