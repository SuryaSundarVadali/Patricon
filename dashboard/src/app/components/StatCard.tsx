import type { ReactNode } from "react";

type StatCardProps = {
  label: string;
  value: string;
  hint?: ReactNode;
};

export function StatCard({ label, value, hint }: StatCardProps) {
  return (
    <article className="app-card stat-card">
      <p className="app-label">{label}</p>
      <h3 className="app-value">{value}</h3>
      {hint ? <p className="app-hint">{hint}</p> : null}
    </article>
  );
}
