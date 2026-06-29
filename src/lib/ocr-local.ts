/**
 * 브라우저 내장 OCR (Tesseract.js) — API 키 없이 동작
 * 품질은 Claude보다 낮지만 완전 무료·오프라인
 */
import type { ExamType } from './types';
import type { OcrResult } from './ocr-client';

type TWord = {
  text: string;
  bbox: { x0: number; y0: number; x1: number; y1: number };
  confidence: number;
};

/* ─── Tesseract 실행 ─── */
async function recognize(imageDataUrl: string): Promise<{ words: TWord[]; text: string }> {
  const { createWorker } = await import('tesseract.js');
  const worker = await createWorker(['kor', 'eng'], 1);
  const result = await worker.recognize(imageDataUrl);
  await worker.terminate();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = result.data as any;
  return {
    text: String(data.text ?? ''),
    words: ((data.words ?? []) as TWord[]).filter((w) => w.confidence > 20),
  };
}

/* ─── 단위 정규화 ─── */
function normalizeUnit(raw: string): string {
  const u = raw.trim().toLowerCase();
  if (u === 'mmol/l' || u === 'mmol/i') return 'U/L';     // GOT/GPT 표기 오류 정규화
  if (u === 'cc') return '';                                // HGB/Bilirubin 단위 오류
  if (u === 'mg') return '%';                               // HCT 단위 오류
  if (u === 'iu/l') return 'IU/L';
  if (u === 'u/l') return 'IU/L';
  return raw.trim();
}

/* ─── 참고범위 파싱 ─── */
function parseRef(refStr: string): { refMin: number | null; refMax: number | null } {
  const m = refStr.replace(/\s/g, '').match(/([\d.]+)[~\-–]([\d.]+)/);
  if (!m) return { refMin: null, refMax: null };
  return { refMin: parseFloat(m[1]), refMax: parseFloat(m[2]) };
}

/* ─── 상태 판정 ─── */
function status(v: number, min: number | null, max: number | null) {
  if (min == null || max == null) return 'unknown' as const;
  if (v < min || v > max) return 'caution' as const;
  return 'normal' as const;
}

/* ─── 단어를 Y 좌표 기준으로 행(row) 그룹화 ─── */
function groupRows(words: TWord[], tol = 12): TWord[][] {
  if (!words.length) return [];
  const sorted = [...words].sort((a, b) => a.bbox.y0 - b.bbox.y0);
  const rows: TWord[][] = [[sorted[0]]];
  for (let i = 1; i < sorted.length; i++) {
    const w = sorted[i];
    const last = rows[rows.length - 1];
    const rowY = last[0].bbox.y0;
    if (Math.abs(w.bbox.y0 - rowY) <= tol) {
      last.push(w);
    } else {
      rows.push([w]);
    }
  }
  return rows.map((r) => r.sort((a, b) => a.bbox.x0 - b.bbox.x0));
}

/* ─── 한글/영문 항목명 → nameEn 변환 ─── */
const NAME_MAP: Record<string, string> = {
  'FBS': 'Fasting Glucose',   'fbs': 'Fasting Glucose',
  '공복혈당': 'Fasting Glucose',
  'GOT': 'AST',               'got': 'AST',
  'GPT': 'ALT',               'gpt': 'ALT',
  'GGT': 'GGT',
  'ALP': 'ALP',
  'Total Bilirubin': 'Total Bilirubin',   '총빌리루빈': 'Total Bilirubin',
  'Total Protein': 'Total Protein',       '총단백': 'Total Protein',
  'Albumin': 'Albumin',                   '알부민': 'Albumin',
  'BUN': 'BUN',
  'Creatinine': 'Creatinine',
  'eGFR': 'eGFR',                         'GFR': 'eGFR',
  'WBC': 'WBC',
  'RBC': 'RBC',
  'HGB': 'Hemoglobin',                    'Hgb': 'Hemoglobin',
  'HCT': 'HCT',
  'MCV': 'MCV',
  'MCH': 'MCH',
  'MCHC': 'MCHC',
  'Platelet': 'Platelet',
  'RDW': 'RDW',
  'PDW': 'PDW',
  'Total Cholesterol': 'Total Cholesterol',   '총콜레스테롤': 'Total Cholesterol',
  'Triglyceride': 'Triglycerides',            '중성지방': 'Triglycerides',
  'HDL-Cholesterol': 'HDL Cholesterol',       'HDL': 'HDL Cholesterol',
  'LDL-Cholesterol': 'LDL Cholesterol (calc)', 'LDL': 'LDL Cholesterol (calc)',
  'HbA1c-NGSP': 'HbA1c',                     'HbA1c': 'HbA1c',
  'HbA1c-IFCC': 'HbA1c-IFCC',
  'HbA1c-eAG': 'eAG',
  'Na': 'Sodium',   'Sodium': 'Sodium',
  'K': 'Potassium', 'Potassium': 'Potassium',
  'Uric acid': 'Uric Acid',
  'CPK': 'CPK',
  'TSH': 'TSH',
  'Free T4': 'Free T4',
  'Insulin': 'Insulin',  '인슐린': 'Insulin',
  'C-peptide': 'C-peptide',
  'Stool OB': 'Stool OB',
  // 소변
  'pH': 'Urine pH',
  'protein': 'Urine Protein',   'Protein': 'Urine Protein',
  'glucose': 'Urine Glucose',
  // 혈액원
  'ALT': 'Alanine Aminotransferase',
  'AST': 'Aspartate Aminotransferase',
  '혈청단백': 'Serum Protein',
  // 보건소
  'TC': 'Total Cholesterol',
  'TRG': 'Triglycerides',
  'GLU': 'Fasting Glucose',
  'non-HDL': 'non-HDL Cholesterol',
};

function nameEn(raw: string): string {
  const trimmed = raw.trim();
  return NAME_MAP[trimmed] ?? NAME_MAP[trimmed.toLowerCase()] ?? trimmed;
}

/* ─────────────────────────────────────────
   유형 A: 내과 LABORATORY REPORT
   3컬럼: [항목명] | [결과값(단위)] | [참고치]
───────────────────────────────────────── */
async function parseClinic(imageDataUrl: string): Promise<OcrResult> {
  const { words, text } = await recognize(imageDataUrl);

  // 날짜 추출
  const dateMatch = text.match(/(\d{4})[년\s./-]+(\d{1,2})[월\s./-]+(\d{1,2})/);
  const examDate = dateMatch
    ? `${dateMatch[1]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[3].padStart(2, '0')}`
    : null;

  // 기관명 추출 (한글 + 내과/병원/의원 포함 텍스트)
  const instMatch = text.match(/[\w가-힣]+(?:내과|병원|의원|검진|클리닉)/);
  const institution = instMatch ? instMatch[0] : null;

  const rows = groupRows(words);
  if (!rows.length) return { exam_date: examDate, institution, items: [] };

  // 페이지 너비 추정
  const maxX = Math.max(...words.map((w) => w.bbox.x1));
  const COL2_START = maxX * 0.38;
  const COL3_START = maxX * 0.62;

  // 중복 제거를 위한 이미 추출한 nameEn 추적
  const seen = new Set<string>();
  const items: OcrResult['items'] = [];

  for (const row of rows) {
    const col1 = row.filter((w) => w.bbox.x1 < COL2_START);
    const col2 = row.filter((w) => w.bbox.x0 >= COL2_START && w.bbox.x1 < COL3_START);
    const col3 = row.filter((w) => w.bbox.x0 >= COL3_START);

    const name = col1.map((w) => w.text).join(' ').trim().replace(/[▶→]/g, '').trim();
    const valueRaw = col2.map((w) => w.text).join('').trim();
    const refRaw = col3.map((w) => w.text).join('').trim();

    if (!name || name.length < 2) continue;

    // 스킵: 헤더, 섹션 레이블
    if (['U/A', '4종', '소변현미경검사', '검사항목', '검사결과', '참고치'].includes(name)) continue;

    // 결과값 파싱: 숫자(단위) 또는 정성값
    const numMatch = valueRaw.match(/^([\d.]+)\(?([^)0-9~]*)\)?/);
    if (!numMatch) continue;

    const value = parseFloat(numMatch[1]);
    if (isNaN(value)) continue;

    const unit = normalizeUnit(numMatch[2] ?? '');
    const { refMin, refMax } = parseRef(refRaw);

    // 의미없는 0~0 참고범위 무시
    const isBlankRef = refMin === 0 && refMax === 0;

    const en = nameEn(name);

    // 중복 제거
    if (seen.has(en)) continue;
    seen.add(en);

    items.push({
      name,
      name_en: en,
      value,
      display_value: null,
      unit,
      ref_min: isBlankRef ? null : refMin,
      ref_max: isBlankRef ? null : refMax,
      status: status(value, isBlankRef ? null : refMin, isBlankRef ? null : refMax),
      confidence: 0.6,
    });
  }

  return { exam_date: examDate, institution, items };
}

/* ─────────────────────────────────────────
   유형 B: 보건소 Cholestech LDX (KEY=VALUE)
───────────────────────────────────────── */
async function parseHealthcenter(imageDataUrl: string): Promise<OcrResult> {
  const { text } = await recognize(imageDataUrl);

  const KEY_MAP: Record<string, {
    name: string; nameEn: string; unit: string;
    refMin?: number; refMax?: number;
    // alt: Tesseract가 키를 다르게 읽을 때 대체 패턴
    alt?: string;
  }> = {
    TC:       { name: '총콜레스테롤',        nameEn: 'Total Cholesterol',      unit: 'mg/dL', refMin: 0,  refMax: 199 },
    HDL:      { name: 'HDL 콜레스테롤',      nameEn: 'HDL Cholesterol',        unit: 'mg/dL', refMin: 40, refMax: 999 },
    TRG:      { name: '중성지방',            nameEn: 'Triglycerides',          unit: 'mg/dL', refMin: 0,  refMax: 149 },
    LDL:      { name: 'LDL 콜레스테롤',      nameEn: 'LDL Cholesterol (calc)', unit: 'mg/dL', refMin: 0,  refMax: 129 },
    'non-HDL':{ name: 'non-HDL 콜레스테롤',  nameEn: 'non-HDL Cholesterol',   unit: 'mg/dL', refMin: 0,  refMax: 159, alt: 'non.{0,2}HDL' },
    'TC/HDL': { name: 'TC/HDL 비율',         nameEn: 'TC/HDL Ratio',           unit: '',      refMin: 0,  refMax: 4.9, alt: 'TC.{0,2}HDL' },
    GLU:      { name: '공복혈당',            nameEn: 'Fasting Glucose',        unit: 'mg/dL', refMin: 70, refMax: 100 },
  };

  // 날짜: "YYYY-MM-DD" 또는 "DD Mon YYYY" (Cholestech 출력 형식)
  const MONTHS: Record<string, string> = {
    jan:'01', feb:'02', mar:'03', apr:'04', may:'05', jun:'06',
    jul:'07', aug:'08', sep:'09', oct:'10', nov:'11', dec:'12',
  };
  let examDate: string | null = null;
  const d1 = text.match(/(\d{4})[^\d](\d{2})[^\d](\d{2})/);
  if (d1) {
    examDate = `${d1[1]}-${d1[2]}-${d1[3]}`;
  } else {
    const d2 = text.match(/(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{4})/i);
    if (d2) {
      examDate = `${d2[3]}-${MONTHS[d2[2].toLowerCase()]}-${d2[1].padStart(2, '0')}`;
    }
  }

  const items: OcrResult['items'] = [];
  for (const [key, meta] of Object.entries(KEY_MAP)) {
    // 키 패턴: 지정된 alt 또는 키의 특수문자를 이스케이프
    const keyPat = meta.alt ?? key.replace(/[/\-.]/g, (c) => `\\${c}`);
    // 구분자: = : - – — 를 OCR 오인식 허용
    const re = new RegExp(`${keyPat}\\s*[=:\\-–—]\\s*([\\d.]+)`, 'i');
    const m = text.match(re);
    if (!m) continue;
    const value = parseFloat(m[1]);
    const { refMin, refMax } = meta;
    const itemStatus = (refMin !== undefined && refMax !== undefined)
      ? (value >= refMin && value <= refMax ? 'normal' as const : 'caution' as const)
      : 'unknown' as const;
    items.push({
      name: meta.name,
      name_en: meta.nameEn,
      value,
      display_value: null,
      unit: meta.unit,
      ref_min: refMin ?? null,
      ref_max: refMax !== undefined && refMax >= 900 ? null : (refMax ?? null),
      status: itemStatus,
      confidence: 0.75,
    });
  }

  return { exam_date: examDate, institution: null, items };
}

/* ─────────────────────────────────────────
   유형 C-3: 혈액원 CBC 출력지 (영문 목록)
───────────────────────────────────────── */
async function parseBloodbankPrint(imageDataUrl: string): Promise<OcrResult> {
  const { text } = await recognize(imageDataUrl);
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

  const CBC_ITEMS = [
    'WBC','Lymph#','Mid#','Gran#','Lymph%','Mid%','Gran%',
    'RBC','HGB','HCT','MCV','MCH','MCHC',
    'RDW-CV','RDW-SD','PLT','MPV','PDW','PCT','P-LCC','P-LCR',
  ];

  const items: OcrResult['items'] = [];
  const dateMatch = text.match(/(\d{4})[^\d](\d{2})[^\d](\d{2})/);
  const examDate = dateMatch ? `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}` : null;

  for (const line of lines) {
    for (const itemName of CBC_ITEMS) {
      if (!line.toUpperCase().startsWith(itemName.toUpperCase())) continue;
      const numMatch = line.match(/[\d.]+/g);
      if (!numMatch) continue;
      const value = parseFloat(numMatch[0]);
      const hasFlag = /\bL\b|\bH\b/.test(line);
      items.push({
        name: itemName,
        name_en: itemName,
        value,
        display_value: null,
        unit: '',
        ref_min: null,
        ref_max: null,
        status: hasFlag ? 'caution' : 'unknown',
        confidence: 0.65,
      });
      break;
    }
  }

  return { exam_date: examDate, institution: null, items };
}

/* ─────────────────────────────────────────
   공개 진입점
───────────────────────────────────────── */
export async function runOcrLocal(
  imageDataUrl: string,
  examType: ExamType
): Promise<OcrResult> {
  switch (examType) {
    case 'clinic':
      return parseClinic(imageDataUrl);
    case 'healthcenter':
      return parseHealthcenter(imageDataUrl);
    case 'bloodbank_print':
      return parseBloodbankPrint(imageDataUrl);
    default:
      // bloodbank_app_a/b: 앱 화면 촬영은 Tesseract로 인식률이 낮아 직접 입력 유도
      return {
        exam_date: null,
        institution: '대한적십자사혈액원',
        items: [],
      };
  }
}
