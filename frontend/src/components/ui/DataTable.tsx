import { cn } from "~/ui";
import type { ReactNode } from "react";

export type DataTableColumn<Row> = {
  cellClassName?: string;
  className?: string;
  header: ReactNode;
  key: string;
  render: (row: Row) => ReactNode;
};

export function DataTable<Row>({
  className,
  columns,
  getRowKey,
  minWidth = 720,
  rows,
}: {
  className?: string;
  columns: Array<DataTableColumn<Row>>;
  getRowKey: (row: Row) => string;
  minWidth?: number;
  rows: Row[];
}) {
  return (
    <div
      className={cn(
        "overflow-x-auto rounded-[14px] border border-border bg-card",
        className,
      )}
    >
      <table className="w-full border-collapse" style={{ minWidth }}>
        <thead>
          <tr className="border-b border-border bg-background">
            {columns.map((column) => (
              <th
                key={column.key}
                className={cn(
                  `
                    px-4 py-3 text-left text-xs font-medium
                    text-muted-foreground
                  `,
                  column.className,
                )}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={getRowKey(row)}
              className="border-b border-border last:border-b-0"
            >
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={cn("px-4 py-3 text-sm", column.cellClassName)}
                >
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
