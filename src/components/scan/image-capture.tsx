"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Camera, Upload, Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { saveExam } from "@/lib/exam-store";
import { runOcr, hasApiKey } from "@/lib/ocr-client";
import { runOcrLocal } from "@/lib/ocr-local";
import type { ExamType } from "@/lib/types";
import { EXAM_TYPE_LABELS } from "@/lib/types";
import { Badge } from "@/components/ui/badge";

interface Props {
  examType: ExamType;
  onComplete: (examId: string) => void;
  onBack: () => void;
}

async function compressImage(file: File): Promise<string> {
  const { default: imageCompression } = await import("browser-image-compression");
  const compressed = await imageCompression(file, {
    maxSizeMB: 1,
    maxWidthOrHeight: 2000,
    useWebWorker: true,
  });
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(compressed);
  });
}

export default function ImageCapture({ examType, onComplete, onBack }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [ocrMode, setOcrMode] = useState<"claude" | "local">(hasApiKey() ? "claude" : "local");

  async function handleFile(file: File) {
    const compressed = await compressImage(file);
    setPreview(compressed);
  }

  async function handleAnalyze() {
    if (!preview) return;
    setLoading(true);
    try {
      const raw = ocrMode === "claude"
        ? await runOcr(preview, examType)
        : await runOcrLocal(preview, examType);

      const examDate = raw.exam_date ?? new Date().toISOString().slice(0, 10);
      const items = raw.items.map((item) => ({
        name: item.name,
        nameEn: item.name_en || undefined,
        value: item.value,
        displayValue: item.display_value ?? undefined,
        unit: item.unit,
        refMin: item.ref_min ?? undefined,
        refMax: item.ref_max ?? undefined,
        status: item.status,
        confidence: item.confidence,
      }));

      const examId = await saveExam(
        {
          examType,
          examDate,
          institution: raw.institution ?? undefined,
          bloodType: raw.blood_type ?? undefined,
        },
        items
      );

      toast.success(`${items.length}개 항목 인식 완료`);
      onComplete(examId);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "알 수 없는 오류";
      toast.error(`인식 실패: ${msg}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* 헤더 */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 className="text-xl font-semibold">이미지 촬영·업로드</h2>
          <Badge variant="secondary" className="text-xs mt-0.5">
            {EXAM_TYPE_LABELS[examType]}
          </Badge>
        </div>
      </div>

      {/* 촬영 가이드 (혈액원 앱 화면인 경우) */}
      {(examType === "bloodbank_app_a" || examType === "bloodbank_app_b") && (
        <p className="text-xs text-muted-foreground bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          화면 전체가 프레임 안에 들어오도록 정면에서 촬영하세요
        </p>
      )}

      {/* 이미지 미리보기 */}
      {preview ? (
        <div className="relative w-full aspect-[3/4] bg-muted rounded-xl overflow-hidden">
          <Image src={preview} alt="미리보기" fill className="object-contain" />
        </div>
      ) : (
        <div className="w-full aspect-[3/4] bg-muted rounded-xl flex flex-col items-center justify-center gap-3 border-2 border-dashed border-muted-foreground/30">
          <Camera size={40} className="text-muted-foreground" />
          <p className="text-sm text-muted-foreground">이미지를 선택해 주세요</p>
        </div>
      )}

      {/* 촬영 / 업로드 버튼 */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          className="flex-1 gap-2"
          onClick={() => {
            if (inputRef.current) {
              inputRef.current.removeAttribute("capture");
              inputRef.current.click();
            }
          }}
        >
          <Upload size={16} />
          파일 선택
        </Button>
        <Button
          variant="outline"
          className="flex-1 gap-2"
          onClick={() => {
            if (inputRef.current) {
              inputRef.current.setAttribute("capture", "environment");
              inputRef.current.click();
            }
          }}
        >
          <Camera size={16} />
          카메라
        </Button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />

      {/* OCR 모드 선택 */}
      <div className="flex rounded-lg border overflow-hidden text-sm">
        <button
          className={`flex-1 py-2 transition-colors ${
            ocrMode === "claude"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted"
          }`}
          onClick={() => setOcrMode("claude")}
          disabled={!hasApiKey()}
          title={!hasApiKey() ? "설정에서 API 키를 입력하세요" : ""}
        >
          ✦ Claude AI {!hasApiKey() && "(키 필요)"}
        </button>
        <button
          className={`flex-1 py-2 transition-colors ${
            ocrMode === "local"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted"
          }`}
          onClick={() => setOcrMode("local")}
        >
          브라우저 OCR (무료)
        </button>
      </div>

      {preview && (
        <Button
          size="lg"
          className="w-full gap-2"
          onClick={handleAnalyze}
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              {ocrMode === "local" ? "Tesseract 인식 중..." : "AI 분석 중..."}
            </>
          ) : (
            "분석하기"
          )}
        </Button>
      )}
    </div>
  );
}
