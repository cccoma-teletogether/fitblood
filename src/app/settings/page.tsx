"use client";

import { useState, useEffect, type ChangeEvent } from "react";
import { KeyRound, Eye, EyeOff, Check, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { getStoredApiKey, setStoredApiKey, API_KEY_STORAGE } from "@/lib/ocr-client";

export default function SettingsPage() {
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setApiKey(getStoredApiKey());
  }, []);

  function handleSave() {
    setStoredApiKey(apiKey);
    setSaved(true);
    toast.success("API 키가 저장됐습니다");
    setTimeout(() => setSaved(false), 2000);
  }

  function handleClear() {
    localStorage.removeItem(API_KEY_STORAGE);
    setApiKey("");
    toast.success("API 키가 삭제됐습니다");
  }

  return (
    <div className="flex flex-col gap-6 p-4 pt-8">
      <h2 className="text-xl font-semibold">설정</h2>

      {/* API 키 섹션 */}
      <div className="flex flex-col gap-4 p-4 border rounded-xl">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <KeyRound size={18} className="text-primary" />
          </div>
          <div>
            <p className="font-semibold">Anthropic API 키</p>
            <p className="text-xs text-muted-foreground">AI 자동 인식 기능에 필요합니다</p>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 leading-relaxed">
          API 키는 이 기기의 브라우저에만 저장되며 서버로 전송되지 않습니다.
          키는 <a href="https://console.anthropic.com" target="_blank" rel="noopener noreferrer" className="underline">console.anthropic.com</a>에서 발급받을 수 있습니다.
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="apiKey" className="text-xs">API 키</Label>
          <div className="relative">
            <Input
              id="apiKey"
              type={showKey ? "text" : "password"}
              placeholder="sk-ant-..."
              value={apiKey}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setApiKey(e.target.value)}
              className="pr-10 font-mono text-sm"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            className="flex-1 gap-2"
            onClick={handleSave}
            disabled={!apiKey.trim()}
          >
            {saved ? <Check size={16} /> : null}
            {saved ? "저장됨" : "저장"}
          </Button>
          {apiKey && (
            <Button
              variant="outline"
              size="icon"
              onClick={handleClear}
              title="API 키 삭제"
            >
              <Trash2 size={16} />
            </Button>
          )}
        </div>
      </div>

      {/* 면책 고지 */}
      <p className="text-xs text-muted-foreground text-center">
        본 앱은 의료기기가 아니며, 의사의 진단을 대체하지 않습니다.
      </p>
    </div>
  );
}
