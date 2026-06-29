import type { ItemStatus } from "@/lib/types";

const CONFIG: Record<ItemStatus, { label: string; className: string }> = {
  normal: { label: "정상", className: "bg-green-100 text-green-700" },
  caution: { label: "주의", className: "bg-yellow-100 text-yellow-700" },
  danger: { label: "위험", className: "bg-red-100 text-red-700" },
  unknown: { label: "-", className: "bg-muted text-muted-foreground" },
};

export default function ItemStatusBadge({ status }: { status: ItemStatus }) {
  const { label, className } = CONFIG[status];
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${className}`}>
      {label}
    </span>
  );
}
