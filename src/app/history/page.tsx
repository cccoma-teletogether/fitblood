"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getExams, getExamById, deleteExam } from "@/lib/exam-store";
import type { ExamRecord, ExamItem } from "@/lib/types";
import { EXAM_TYPE_LABELS } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Camera, Trash2 } from "lucide-react";
import ItemStatusBadge from "@/components/item-status-badge";

const TYPE_BADGE_COLOR: Record<string, string> = {
  clinic: "bg-blue-100 text-blue-700",
  healthcenter: "bg-green-100 text-green-700",
  bloodbank_app_a: "bg-red-100 text-red-700",
  bloodbank_app_b: "bg-red-100 text-red-700",
  bloodbank_print: "bg-red-100 text-red-700",
};

const STATUS_COLOR: Record<string, string> = {
  normal: "text-green-700",
  caution: "text-yellow-700",
  danger: "text-red-700",
  unknown: "text-muted-foreground",
};

function HistoryList() {
  const [exams, setExams] = useState<ExamRecord[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getExams().then((data) => { setExams(data); setLoaded(true); });
  }, []);

  if (!loaded) return null;

  return (
    <div className="flex flex-col gap-4 p-4 pt-8">
      <h2 className="text-xl font-semibold">검사 이력</h2>
      {exams.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-16 text-muted-foreground">
          <Camera size={40} />
          <p className="text-sm">아직 등록된 검사가 없습니다</p>
          <Link href="/scan"><Button size="sm">첫 검사 스캔하기</Button></Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {exams.map((exam) => (
            <Link key={exam.id} href={`/history?id=${exam.id}`}>
              <Card className="cursor-pointer hover:bg-muted transition-colors">
                <CardContent className="flex items-center justify-between py-4 px-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_BADGE_COLOR[exam.examType]}`}>
                        {EXAM_TYPE_LABELS[exam.examType]}
                      </span>
                      {exam.bloodType && (
                        <span className="text-xs text-muted-foreground">{exam.bloodType}</span>
                      )}
                    </div>
                    <p className="font-medium mt-1">{exam.examDate}</p>
                    {exam.institution && (
                      <p className="text-xs text-muted-foreground">{exam.institution}</p>
                    )}
                  </div>
                  <span className="text-muted-foreground text-sm">›</span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function HistoryDetail({ id }: { id: string }) {
  const router = useRouter();
  const [data, setData] = useState<Awaited<ReturnType<typeof getExamById>>>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    getExamById(id).then(setData);
  }, [id]);

  async function handleDelete() {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    await deleteExam(id);
    router.push("/history");
  }

  if (!data) return <div className="p-4 flex items-center justify-center min-h-screen"><p className="text-muted-foreground">불러오는 중...</p></div>;

  const { record, items } = data;
  const abnormal = items.filter((i) => i.status === "caution" || i.status === "danger");

  return (
    <div className="flex flex-col gap-4 p-4 pt-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/history" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{EXAM_TYPE_LABELS[record.examType]}</Badge>
              {record.bloodType && <span className="text-sm font-medium text-blue-600">{record.bloodType}</span>}
            </div>
            <p className="font-semibold mt-0.5">{record.examDate}</p>
            {record.institution && <p className="text-xs text-muted-foreground">{record.institution}</p>}
          </div>
        </div>
        <Button variant={confirmDelete ? "destructive" : "ghost"} size="sm" className="gap-1.5" onClick={handleDelete}>
          <Trash2 size={14} />
          {confirmDelete ? "확인 삭제" : "삭제"}
        </Button>
      </div>

      <div className="flex gap-3">
        <div className="flex-1 bg-muted rounded-xl p-3 text-center">
          <p className="text-2xl font-bold">{items.length}</p>
          <p className="text-xs text-muted-foreground">전체 항목</p>
        </div>
        {abnormal.length > 0 && (
          <div className="flex-1 bg-red-50 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-red-600">{abnormal.length}</p>
            <p className="text-xs text-muted-foreground">이상 항목</p>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {items.map((item) => <ItemRow key={item.id} item={item} />)}
      </div>
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
        {hasRef && <p className="text-xs text-muted-foreground w-20 text-right">{item.refMin}~{item.refMax}</p>}
        <ItemStatusBadge status={item.status} />
      </div>
    </div>
  );
}

function HistoryContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  return id ? <HistoryDetail id={id} /> : <HistoryList />;
}

export default function HistoryPage() {
  return <Suspense fallback={null}><HistoryContent /></Suspense>;
}
