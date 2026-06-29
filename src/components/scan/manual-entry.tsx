"use client";

import { useState, type ChangeEvent } from "react";
import { ArrowLeft, Plus, Trash2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { saveExam } from "@/lib/exam-store";
import type { ExamType, ExamItem } from "@/lib/types";
import { EXAM_TYPE_LABELS } from "@/lib/types";

interface ItemRow {
  key: number;
  name: string;
  value: string;
  unit: string;
  refMin: string;
  refMax: string;
}

interface Props {
  examType: ExamType;
  onComplete: (examId: string) => void;
  onBack: () => void;
}

let keyCounter = 0;
function newRow(): ItemRow {
  return { key: keyCounter++, name: "", value: "", unit: "", refMin: "", refMax: "" };
}

function determineStatus(
  value: number,
  refMin: number | undefined,
  refMax: number | undefined
): ExamItem["status"] {
  if (refMin == null || refMax == null) return "unknown";
  if (value < refMin || value > refMax) return "caution";
  return "normal";
}

export default function ManualEntry({ examType, onComplete, onBack }: Props) {
  const [examDate, setExamDate] = useState(new Date().toISOString().slice(0, 10));
  const [institution, setInstitution] = useState("");
  const [bloodType, setBloodType] = useState("");
  const [items, setItems] = useState<ItemRow[]>([newRow()]);
  const [saving, setSaving] = useState(false);

  const showBloodType =
    examType === "bloodbank_app_a" || examType === "bloodbank_app_b";

  function updateItem(key: number, field: keyof ItemRow, value: string) {
    setItems((prev) =>
      prev.map((item) => (item.key === key ? { ...item, [field]: value } : item))
    );
  }

  function removeItem(key: number) {
    if (items.length === 1) return;
    setItems((prev) => prev.filter((item) => item.key !== key));
  }

  async function handleSave() {
    const validItems = items.filter((i) => i.name.trim() && i.value.trim());
    if (validItems.length === 0) {
      toast.error("항목을 하나 이상 입력해 주세요");
      return;
    }

    setSaving(true);
    try {
      const examItems = validItems.map((i) => {
        const val = parseFloat(i.value);
        const refMin = i.refMin ? parseFloat(i.refMin) : undefined;
        const refMax = i.refMax ? parseFloat(i.refMax) : undefined;
        return {
          name: i.name.trim(),
          value: isNaN(val) ? 0 : val,
          displayValue: isNaN(val) ? i.value.trim() : undefined,
          unit: i.unit.trim(),
          refMin,
          refMax,
          status: determineStatus(val, refMin, refMax),
        };
      });

      const examId = await saveExam(
        {
          examType,
          examDate,
          institution: institution.trim() || undefined,
          bloodType: showBloodType && bloodType.trim() ? bloodType.trim() : undefined,
        },
        examItems
      );

      toast.success(`${examItems.length}개 항목 저장 완료`);
      onComplete(examId);
    } catch {
      toast.error("저장에 실패했습니다");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* 헤더 */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 className="text-xl font-semibold">직접 입력</h2>
          <Badge variant="secondary" className="text-xs mt-0.5">
            {EXAM_TYPE_LABELS[examType]}
          </Badge>
        </div>
      </div>

      {/* 기본 정보 */}
      <div className="flex flex-col gap-3 p-4 border rounded-xl bg-muted/30">
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="examDate" className="text-xs">검사일</Label>
            <Input
              id="examDate"
              type="date"
              value={examDate}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setExamDate(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="institution" className="text-xs">기관명</Label>
            <Input
              id="institution"
              placeholder="병원·기관 이름"
              value={institution}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setInstitution(e.target.value)}
            />
          </div>
        </div>

        {showBloodType && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="bloodType" className="text-xs">혈액형</Label>
            <Input
              id="bloodType"
              placeholder="예: B+, O-"
              value={bloodType}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setBloodType(e.target.value)}
              className="w-32"
            />
          </div>
        )}
      </div>

      {/* 컬럼 헤더 */}
      <div className="grid grid-cols-[1fr_80px_60px_120px_32px] gap-2 px-1">
        <span className="text-xs text-muted-foreground">항목명</span>
        <span className="text-xs text-muted-foreground">결과값</span>
        <span className="text-xs text-muted-foreground">단위</span>
        <span className="text-xs text-muted-foreground">참고범위 (최소~최대)</span>
        <span />
      </div>

      {/* 항목 행들 */}
      <div className="flex flex-col gap-2">
        {items.map((item) => (
          <div key={item.key} className="grid grid-cols-[1fr_80px_60px_120px_32px] gap-2 items-center">
            <Input
              placeholder="항목명"
              value={item.name}
              onChange={(e: ChangeEvent<HTMLInputElement>) => updateItem(item.key, "name", e.target.value)}
              className="h-9 text-sm"
            />
            <Input
              placeholder="값"
              value={item.value}
              onChange={(e: ChangeEvent<HTMLInputElement>) => updateItem(item.key, "value", e.target.value)}
              className="h-9 text-sm"
            />
            <Input
              placeholder="단위"
              value={item.unit}
              onChange={(e: ChangeEvent<HTMLInputElement>) => updateItem(item.key, "unit", e.target.value)}
              className="h-9 text-sm"
            />
            {/* 참고범위: min ~ max */}
            <div className="flex items-center gap-1">
              <Input
                placeholder="최소"
                value={item.refMin}
                onChange={(e: ChangeEvent<HTMLInputElement>) => updateItem(item.key, "refMin", e.target.value)}
                className="h-9 text-sm w-1/2"
              />
              <span className="text-muted-foreground text-xs">~</span>
              <Input
                placeholder="최대"
                value={item.refMax}
                onChange={(e: ChangeEvent<HTMLInputElement>) => updateItem(item.key, "refMax", e.target.value)}
                className="h-9 text-sm w-1/2"
              />
            </div>
            <button
              onClick={() => removeItem(item.key)}
              className="text-muted-foreground hover:text-destructive transition-colors"
              disabled={items.length === 1}
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>

      {/* 행 추가 */}
      <Button
        variant="outline"
        size="sm"
        className="gap-2 self-start"
        onClick={() => setItems((prev) => [...prev, newRow()])}
      >
        <Plus size={14} />
        항목 추가
      </Button>

      {/* 저장 */}
      <Button size="lg" className="w-full gap-2" onClick={handleSave} disabled={saving}>
        <Save size={18} />
        {saving ? "저장 중..." : "저장하기"}
      </Button>
    </div>
  );
}
