import React from "react";

interface PageShellProps {
  children: React.ReactNode;
  className?: string;
}

export default function PageShell({ children, className = "" }: PageShellProps) {
  return (
    <div
      className={`flex-1 p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8 max-w-7xl mx-auto w-full min-w-0 relative ${className}`}
    >
      {children}
    </div>
  );
}

interface PageHeaderProps {
  title: string;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="min-w-0">
        <h2 className="font-display font-bold text-2xl sm:text-3xl text-gray-950 tracking-tight">
          {title}
        </h2>
        {subtitle && <p className="text-gray-500 text-sm mt-1">{subtitle}</p>}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">{actions}</div>
      )}
    </div>
  );
}

interface StatCardGridProps {
  children: React.ReactNode;
  columns?: "default" | "compact";
}

export function StatCardGrid({ children, columns = "default" }: StatCardGridProps) {
  const gridClass =
    columns === "compact"
      ? "grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6"
      : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6";

  return <div className={gridClass}>{children}</div>;
}

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  sub?: string;
}

export function StatCard({ label, value, sub }: StatCardProps) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-4 sm:p-5 shadow-sm min-w-0">
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{label}</p>
      <h3 className="font-display font-bold text-2xl sm:text-3xl text-gray-950 mt-1">{value}</h3>
      {sub && <span className="text-[11px] text-gray-400 mt-0.5 block">{sub}</span>}
    </div>
  );
}

interface SectionCardProps {
  children: React.ReactNode;
  className?: string;
}

export function SectionCard({ children, className = "" }: SectionCardProps) {
  return (
    <div
      className={`bg-white border border-gray-100 rounded-3xl overflow-hidden shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}
