"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getExamById } from "@/lib/exam-store";
import type { ExamItem } from "@/lib/types";
import { EXAM_TYPE_LABELS } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Check } from "lucide-react";
import ItemStatusBadge from "@/components/item-status-badge";

const STATUS_COLOR: Record<string, string> = {
  normal: "text-green-700",
  caution: "text-yellow-700",
  danger: "text-red-700",
  unknown: "text-muted-foreground",
};

function ReviewContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = searchParams.get("id") ?? "";
  const [data, setData] = useState<Awaited<ReturnType<typeof getExamById>>>(null);

  useEffect(() => {
    if (id) getExamById(id).then(setData);
  }, [id]);

  if (!data) return (
    <div className="p-4 flex items-center justify-center min-h-screen">
      <p className="text-muted-foreground">불러오는 중...</p>
    </div>
  );

  const { record, items } = data;
  const abnormal = items.filter((i) => i.status === "caution" || i.status === "danger");

  return (
    <div className="flex flex-col gap-4 p-4 pt-6">
      <div className="flex items-center gap-3">
        <Link href="/history" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1">
          <h2 className="text-xl font-semibold">인식 결과 확인</h2>
          <div className="flex items-center gap-2 mt-0.5">
            <Badge variant="secondary">{EXAM_TYPE_LABELS[record.examType]}</Badge>
            <span className="text-xs text-muted-foreground">{record.examDate}</span>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <div className="flex-1 bg-muted rounded-xl p-3 text-center">
          <p className="text-2xl font-bold">{items.length}</p>
          <p className="text-xs text-muted-foreground">전체 항목</p>
        </div>
        <div className="flex-1 bg-red-50 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-red-600">{abnormal.length}</p>
          <p className="text-xs text-muted-foreground">이상 항목</p>
        </div>
        {record.bloodType && (
          <div className="flex-1 bg-blue-50 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-blue-600">{record.bloodType}</p>
            <p className="text-xs text-muted-foreground">혈액형</p>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {items.map((item) => <ItemRow key={item.id} item={item} />)}
      </div>

      <Button size="lg" className="w-full gap-2 mt-2" onClick={() => router.push("/history")}>
        <Check size={18} />
        저장 완료 — 이력 보기
      </Button>
    </div>
  );
}

function ItemRow({ item }: { item: ExamItem }) {
  const displayVal = item.displayValue ?? String(item.value);
  const hasRef = item.refMin != null && item.refMax != null;
  return (
    <div className="flex items-center justify-between border rounded-xl px-4 py-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{item.name}</p>
        {item.nameEn && <p className="text-xs text-muted-foreground truncate">{item.nameEn}</p>}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0 ml-3">
        <div className="text-right">
          <p className={`text-sm font-semibold ${STATUS_COLOR[item.status]}`}>{displayVal}</p>
          <p className="text-xs text-muted-foreground">{item.unit}</p>
        </div>
        {hasRef && <p className="text-xs text-muted-foreground w-20 text-right">{item.refMin} ~ {item.refMax}</p>}
        <ItemStatusBadge status={item.status} />
      </div>
    </div>
  );
}

export default function ReviewPage() {
  return <Suspense fallback={null}><ReviewContent /></Suspense>;
}
