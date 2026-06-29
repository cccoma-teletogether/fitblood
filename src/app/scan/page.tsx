"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ExamTypeSelector from "@/components/scan/exam-type-selector";
import ModeSelector from "@/components/scan/mode-selector";
import ImageCapture from "@/components/scan/image-capture";
import ManualEntry from "@/components/scan/manual-entry";
import type { ExamType } from "@/lib/types";

type Step = "type" | "mode" | "capture" | "manual";

export default function ScanPage() {
  const [step, setStep] = useState<Step>("type");
  const [examType, setExamType] = useState<ExamType | null>(null);
  const router = useRouter();

  function handleTypeSelect(type: ExamType) {
    setExamType(type);
    setStep("mode");
  }

  function handleModeSelect(mode: "ai" | "manual") {
    setStep(mode === "ai" ? "capture" : "manual");
  }

  function handleComplete(examId: string) {
    router.push(`/scan/review?id=${examId}`);
  }

  return (
    <div className="p-4 pt-8">
      {step === "type" && (
        <ExamTypeSelector onSelect={handleTypeSelect} />
      )}
      {step === "mode" && examType && (
        <ModeSelector
          examType={examType}
          onSelect={handleModeSelect}
          onBack={() => setStep("type")}
        />
      )}
      {step === "capture" && examType && (
        <ImageCapture
          examType={examType}
          onComplete={handleComplete}
          onBack={() => setStep("mode")}
        />
      )}
      {step === "manual" && examType && (
        <ManualEntry
          examType={examType}
          onComplete={handleComplete}
          onBack={() => setStep("mode")}
        />
      )}
    </div>
  );
}
