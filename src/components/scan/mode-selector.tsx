"use client";

import { ArrowLeft, Sparkles, PenLine } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ExamType } from "@/lib/types";
import { EXAM_TYPE_LABELS } from "@/lib/types";
import { hasApiKey } from "@/lib/ocr-client";
import Link from "next/link";

interface Props {
  examType: ExamType;
  onSelect: (mode: "ai" | "manual") => void;
  onBack: () => void;
}

export default function ModeSelector({ examType, onSelect, onBack }: Props) {
  const apiKeySet = hasApiKey();

  return (
    <div className="flex flex-col gap-4">
      {/* 헤더 */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 className="text-xl font-semibold">입력 방법 선택</h2>
          <Badge variant="secondary" className="text-xs mt-0.5">
            {EXAM_TYPE_LABELS[examType]}
          </Badge>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {/* AI 자동 인식 */}
        <Card
          className="cursor-pointer border-2 border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors"
          onClick={() => onSelect("ai")}
        >
          <CardContent className="flex items-start gap-4 py-4 px-4">
            <div className="mt-0.5 p-2 rounded-lg bg-primary/10">
              <Sparkles size={20} className="text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-semibold">이미지 자동 인식</p>
              <p className="text-sm text-muted-foreground mt-0.5">
                결과지를 촬영하면 수치를 자동으로 추출합니다
              </p>
              <p className="text-xs mt-1">
                {apiKeySet ? (
                  <span className="text-green-600">✦ Claude AI 사용 중</span>
                ) : (
                  <span className="text-muted-foreground">
                    브라우저 OCR (무료) · {" "}
                    <Link
                      href="/settings"
                      className="text-primary underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      API 키 설정 시 정확도 향상
                    </Link>
                  </span>
                )}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 직접 입력 */}
        <Card
          className="cursor-pointer border-2 border-muted hover:border-primary/30 hover:bg-muted/50 transition-colors"
          onClick={() => onSelect("manual")}
        >
          <CardContent className="flex items-start gap-4 py-4 px-4">
            <div className="mt-0.5 p-2 rounded-lg bg-muted">
              <PenLine size={20} className="text-foreground" />
            </div>
            <div className="flex-1">
              <p className="font-semibold">직접 입력</p>
              <p className="text-sm text-muted-foreground mt-0.5">
                검사 항목과 수치를 직접 입력합니다 (API 불필요)
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
