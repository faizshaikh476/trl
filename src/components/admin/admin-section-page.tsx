import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { AdminShell } from "./admin-shell";

export interface AdminSectionCard {
  title: string;
  description: string;
  meta?: string;
  status?: string;
}

export function AdminSectionPage({
  active,
  eyebrow = "Super Admin",
  title,
  description,
  cards,
  tableTitle,
  tableRows = [],
  children,
}: {
  active: string;
  eyebrow?: string;
  title: string;
  description: string;
  cards: AdminSectionCard[];
  tableTitle?: string;
  tableRows?: Array<Record<string, string | number>>;
  children?: React.ReactNode;
}) {
  const columns = tableRows[0] ? Object.keys(tableRows[0]) : [];

  return (
    <AdminShell active={active}>
      <div className="min-w-0 space-y-6">
        <div>
          <p className="text-sm text-cyan-200">{eyebrow}</p>
          <h1 className="mt-2 text-3xl font-semibold">{title}</h1>
          <p className="mt-2 max-w-3xl text-slate-400">{description}</p>
        </div>

        <section className="grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {cards.map((card) => (
            <Card key={card.title} className="border-cyan-300/10 bg-white/[0.06] text-white">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <h2 className="text-lg font-semibold">{card.title}</h2>
                  {card.status ? (
                    <Badge className="bg-cyan-300 text-slate-950">{card.status}</Badge>
                  ) : null}
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-400">{card.description}</p>
                {card.meta ? <p className="mt-4 text-sm font-medium text-cyan-200">{card.meta}</p> : null}
              </CardContent>
            </Card>
          ))}
        </section>

        {tableRows.length ? (
          <Card className="border-cyan-300/10 bg-white/[0.06] text-white">
            <CardContent className="p-0">
              <div className="border-b border-cyan-300/10 p-5">
                <h2 className="text-xl font-semibold">{tableTitle}</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-white/[0.04] text-slate-400">
                    <tr>
                      {columns.map((column) => (
                        <th key={column} className="px-5 py-3 font-medium capitalize">
                          {column.replaceAll("_", " ")}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tableRows.map((row, index) => (
                      <tr key={index} className="border-t border-cyan-300/10">
                        {columns.map((column) => (
                          <td key={column} className="px-5 py-4 text-slate-200">
                            {row[column]}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {children}
      </div>
    </AdminShell>
  );
}
