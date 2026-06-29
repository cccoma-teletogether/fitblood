"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronRight } from "lucide-react";
import type { ExamType } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  onSelect: (type: ExamType) => void;
}

const TOP_TYPES = [
  {
    id: "clinic",
    label: "내과",
    desc: "내과·병원 LABORATORY REPORT (A4, 복수 페이지)",
    color: "bg-blue-50 border-blue-200",
    badge: "blue",
  },
  {
    id: "healthcenter",
    label: "보건소",
    desc: "국가 건강검진 Cholestech LDX 출력지",
    color: "bg-green-50 border-green-200",
    badge: "green",
  },
] as const;

const BLOODBANK_SUBTYPES = [
  {
    id: "bloodbank_app_a",
    label: "앱 화면 A",
    desc: "매 헌혈 시 — ALT·혈청단백·혈액형",
  },
  {
    id: "bloodbank_app_b",
    label: "앱 화면 B",
    desc: "연 1회 회원서비스 — 6개 항목",
  },
  {
    id: "bloodbank_print",
    label: "출력 검사지",
    desc: "혈소판 헌혈 전 CBC 결과지",
  },
] as const;

export default function ExamTypeSelector({ onSelect }: Props) {
  const [showBloodbank, setShowBloodbank] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-semibold">검사지 유형 선택</h2>
        <p className="text-sm text-muted-foreground mt-1">
          결과지 종류를 선택하면 AI 인식 정확도가 높아집니다
        </p>
      </div>

      {/* 내과 / 보건소 */}
      <div className="flex flex-col gap-3">
        {TOP_TYPES.map((type) => (
          <Card
            key={type.id}
            className={cn("cursor-pointer border-2 transition-colors hover:opacity-90", type.color)}
            onClick={() => onSelect(type.id as ExamType)}
          >
            <CardContent className="flex items-center justify-between py-4 px-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{type.label}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{type.desc}</p>
              </div>
              <ChevronRight size={18} className="text-muted-foreground flex-shrink-0" />
            </CardContent>
          </Card>
        ))}

        {/* 혈액원 */}
        <Card
          className="cursor-pointer border-2 border-red-200 bg-red-50 transition-colors hover:opacity-90"
          onClick={() => setShowBloodbank(!showBloodbank)}
        >
          <CardContent className="flex items-center justify-between py-4 px-4">
            <div>
              <span className="font-semibold">혈액원</span>
              <p className="text-xs text-muted-foreground mt-0.5">
                대한적십자사 혈액원 검사 결과
              </p>
            </div>
            <ChevronRight
              size={18}
              className={cn(
                "text-muted-foreground flex-shrink-0 transition-transform",
                showBloodbank && "rotate-90"
              )}
            />
          </CardContent>
        </Card>

        {/* 혈액원 서브타입 */}
        {showBloodbank && (
          <div className="flex flex-col gap-2 pl-4 border-l-2 border-red-200 ml-3">
            {BLOODBANK_SUBTYPES.map((sub) => (
              <Card
                key={sub.id}
                className="cursor-pointer border hover:bg-muted transition-colors"
                onClick={() => onSelect(sub.id as ExamType)}
              >
                <CardContent className="flex items-center justify-between py-3 px-4">
                  <div>
                    <p className="text-sm font-medium">{sub.label}</p>
                    <p className="text-xs text-muted-foreground">{sub.desc}</p>
                  </div>
                  <ChevronRight size={16} className="text-muted-foreground flex-shrink-0" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
