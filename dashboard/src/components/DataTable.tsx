import type { ReactNode } from "react";

type DataTableProps = {
  title: string;
  description?: string;
  columns: string[];
  rows: ReactNode[][];
  emptyText: string;
  emptyAction?: ReactNode;
};

export function DataTable({
  title,
  description,
  columns,
  rows,
  emptyText,
  emptyAction
}: DataTableProps) {
  return (
    <section className="panel">
      <div className="panel-header-row">
        <h3>{title}</h3>
      </div>
      {description && <p className="muted">{description}</p>}
      {rows.length === 0 ? (
        <div className="empty-state">
          <p>{emptyText}</p>
          {emptyAction}
        </div>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                {columns.map((col) => (
                  <th key={col}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex} data-label={columns[cellIndex] ?? ""}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}