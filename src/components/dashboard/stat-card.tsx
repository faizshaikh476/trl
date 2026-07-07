import { Card, CardContent } from "@/components/ui/card";

export function StatCard({
  label,
  value,
  detail,
  tone = "dark",
}: {
  label: string;
  value: string | number;
  detail: string;
  tone?: "dark" | "light";
}) {
  if (tone === "light") {
    return (
      <Card className="border-stone-200 bg-white text-stone-950 shadow-sm shadow-stone-200/60">
        <CardContent className="p-5">
          <p className="text-sm font-medium text-stone-500">{label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight">{value}</p>
          <p className="mt-2 text-xs text-stone-500">{detail}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-white/10 bg-white/[0.06] text-white">
      <CardContent className="p-5">
        <p className="text-sm text-zinc-400">{label}</p>
        <p className="mt-2 text-3xl font-semibold">{value}</p>
        <p className="mt-2 text-xs text-zinc-500">{detail}</p>
      </CardContent>
    </Card>
  );
}
