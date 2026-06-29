// 브라우저에서 직접 Anthropic API 호출 (서버 불필요)
// anthropic-dangerous-direct-browser-access 헤더로 CORS 허용

import type { ExamType, ExamItem } from './types';
import { CLINIC_PROMPT } from './prompts/clinic';
import { HEALTHCENTER_PROMPT } from './prompts/healthcenter';
import {
  BLOODBANK_APP_A_PROMPT,
  BLOODBANK_APP_B_PROMPT,
  BLOODBANK_PRINT_PROMPT,
} from './prompts/bloodbank';

const PROMPTS: Record<ExamType, string> = {
  clinic: CLINIC_PROMPT,
  healthcenter: HEALTHCENTER_PROMPT,
  bloodbank_app_a: BLOODBANK_APP_A_PROMPT,
  bloodbank_app_b: BLOODBANK_APP_B_PROMPT,
  bloodbank_print: BLOODBANK_PRINT_PROMPT,
};

export const API_KEY_STORAGE = 'fitblood_api_key';

export function getStoredApiKey(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(API_KEY_STORAGE) ?? '';
}

export function setStoredApiKey(key: string) {
  localStorage.setItem(API_KEY_STORAGE, key.trim());
}

export function hasApiKey(): boolean {
  return getStoredApiKey().length > 0;
}

export interface OcrResult {
  exam_date: string | null;
  institution: string | null;
  blood_type?: string | null;
  items: Array<{
    name: string;
    name_en: string;
    value: number;
    display_value: string | null;
    unit: string;
    ref_min: number | null;
    ref_max: number | null;
    status: ExamItem['status'];
    confidence: number;
  }>;
}

export async function runOcr(
  imageDataUrl: string,
  examType: ExamType
): Promise<OcrResult> {
  const apiKey = getStoredApiKey();
  if (!apiKey) throw new Error('API 키가 설정되지 않았습니다');

  const match = imageDataUrl.match(/^data:(.+?);base64,(.+)$/);
  if (!match) throw new Error('이미지 형식이 올바르지 않습니다');
  const mediaType = match[1] as 'image/jpeg' | 'image/png' | 'image/webp';
  const base64Data = match[2];

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: PROMPTS[examType],
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType, data: base64Data },
            },
            {
              type: 'text',
              text: '이 검사 결과지를 분석하여 지시된 JSON 형식으로만 반환하세요.',
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    const msg = (err as { error?: { message?: string } }).error?.message ?? `HTTP ${response.status}`;
    throw new Error(`API 오류: ${msg}`);
  }

  const data = await response.json() as {
    content: Array<{ type: string; text: string }>;
  };
  const rawText = data.content[0]?.type === 'text' ? data.content[0].text : '';

  // 마크다운 코드블록 제거 후 JSON 파싱
  const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]+?)```/) ?? rawText.match(/(\{[\s\S]+\})/);
  const jsonText = jsonMatch ? jsonMatch[1] : rawText;
  return JSON.parse(jsonText.trim()) as OcrResult;
}
