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

/* ─── 이미지 전처리: 3배 확대 + 적응형 이진화 ─── */
// brightness를 올리면 열화인쇄의 연한 텍스트(하단 행)가 흰색으로 날아감.
// 대신 로컬 밴드 평균을 기준으로 적응형 임계값을 적용해 연한 텍스트도 보존한다.
async function preprocessForOcr(dataUrl: string): Promise<string> {
  if (typeof document === 'undefined') return dataUrl;
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width * 3;
      canvas.height = img.height * 3;
      const ctx = canvas.getContext('2d')!;
      // brightness 올리지 않음 — 연한 인쇄 보존
      ctx.filter = 'grayscale(100%) contrast(180%)';
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // 적응형 이진화: 20개 수평 밴드 각각 로컬 평균으로 임계값 결정
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const { data } = imageData;
      const W = canvas.width;
      const H = canvas.height;
      const BAND = Math.ceil(H / 20);

      for (let bandY = 0; bandY < H; bandY += BAND) {
        const endY = Math.min(bandY + BAND, H);
        let sum = 0, count = 0;
        for (let y = bandY; y < endY; y++) {
          for (let x = 0; x < W; x++) { sum += data[(y * W + x) * 4]; count++; }
        }
        const localAvg = count > 0 ? sum / count : 200;
        // 밝은 밴드(연한 인쇄)일수록 임계값을 더 낮춰 희미한 텍스트도 검은색으로 처리
        const thresh = localAvg > 220 ? localAvg * 0.75 : localAvg * 0.85;
        for (let y = bandY; y < endY; y++) {
          for (let x = 0; x < W; x++) {
            const i = (y * W + x) * 4;
            data[i] = data[i + 1] = data[i + 2] = data[i] < thresh ? 0 : 255;
          }
        }
      }
      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.src = dataUrl;
  });
}

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
   3단계 전략:
   1) 행별 퍼지 매칭 (=부호 독립)
   2) 전체 텍스트 regex 보완
   3) 순수 위치 기반 (키 레이블 인식 실패 대비)
───────────────────────────────────────── */
async function parseHealthcenter(imageDataUrl: string): Promise<OcrResult> {
  const processed = await preprocessForOcr(imageDataUrl);
  const { words, text } = await recognize(processed);

  console.debug('[OCR-B raw]', text);

  // Cholestech는 항상 이 순서로 7개 항목 출력
  const KEY_ORDER = ['TC', 'HDL', 'TRG', 'LDL', 'non-HDL', 'TC/HDL', 'GLU'] as const;
  type ItemKey = typeof KEY_ORDER[number];

  const META: Record<ItemKey, {
    name: string; nameEn: string; unit: string; refMin: number; refMax: number;
    // 퍼지 패턴 — OCR 오인식 허용 (LDL→LBI, LDI 등)
    patterns: RegExp[];
  }> = {
    'TC':     { name: '총콜레스테롤',         nameEn: 'Total Cholesterol',      unit: 'mg/dL', refMin: 0,  refMax: 199, patterns: [/\bTC\b/i] },
    'HDL':    { name: 'HDL 콜레스테롤',       nameEn: 'HDL Cholesterol',        unit: 'mg/dL', refMin: 40, refMax: 999, patterns: [/\bH[DO]L\b/i] },
    'TRG':    { name: '중성지방',             nameEn: 'Triglycerides',          unit: 'mg/dL', refMin: 0,  refMax: 149, patterns: [/\bTR[GC6Q]\b/i] },
    'LDL':    { name: 'LDL 콜레스테롤',       nameEn: 'LDL Cholesterol (calc)', unit: 'mg/dL', refMin: 0,  refMax: 129,
      // D→B/O/0, L→I/1, 모든 조합 허용
      patterns: [/\bLDL\b/i, /\bL[DB0O][LI1]\b/i, /\bLD[I1]\b/i] },
    'non-HDL':{ name: 'non-HDL 콜레스테롤',  nameEn: 'non-HDL Cholesterol',   unit: 'mg/dL', refMin: 0,  refMax: 159, patterns: [/non.{0,3}H[DO]L/i] },
    'TC/HDL': { name: 'TC/HDL 비율',          nameEn: 'TC/HDL Ratio',           unit: '',      refMin: 0,  refMax: 4.9, patterns: [/TC.{0,3}H[DO]L/i] },
    'GLU':    { name: '공복혈당',             nameEn: 'Fasting Glucose',        unit: 'mg/dL', refMin: 70, refMax: 100, patterns: [/\bGL[UO0]\b/i] },
  };

  // TC/HDL·non-HDL을 TC·HDL보다 먼저 체크해야 부분문자열 충돌 없음
  const MATCH_ORDER: ItemKey[] = ['TC/HDL', 'non-HDL', 'TC', 'HDL', 'TRG', 'LDL', 'GLU'];

  // 날짜 파싱: "DD Mon YYYY" 또는 "YYYY-MM-DD"
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

  const found = new Map<string, number>();

  // ── 1단계: bounding-box 행별 퍼지 매칭 ──
  const rows = groupRows(words, 30); // 2x 전처리 이미지 기준 30px
  for (const row of rows) {
    const rowText = row.map((w) => w.text).join(' ');
    // 소수(TC/HDL용) 우선, 없으면 2-3자리 정수
    const decNum = rowText.match(/\b(\d{1,3}\.\d+)\b/);
    const intNums = (rowText.match(/\b\d{2,3}\b/g) ?? []).filter(n => {
      const v = parseInt(n); return v > 0 && v < 2000;
    });
    const rowValue = decNum ? parseFloat(decNum[1]) : (intNums.length ? parseFloat(intNums[0]) : NaN);
    if (isNaN(rowValue)) continue;

    for (const key of MATCH_ORDER) {
      if (found.has(key)) continue;
      if (META[key].patterns.some(p => p.test(rowText))) {
        found.set(key, rowValue);
        break;
      }
    }
  }

  // ── 2단계: 전체 텍스트 regex 보완 ──
  for (const key of MATCH_ORDER) {
    if (found.has(key)) continue;
    for (const pat of META[key].patterns) {
      const re = new RegExp(`(?:${pat.source})[^a-zA-Z\\d]{0,4}(\\d[\\d.]*)`, 'i');
      const m = text.match(re);
      if (m) { found.set(key, parseFloat(m[1])); break; }
    }
    if (!found.has(key)) console.debug(`[OCR-B miss after stage2] ${key}`);
  }

  // ── 3단계: 순수 위치 기반 추출 (키 레이블 인식 완전 실패 대비) ──
  // Cholestech는 TC,HDL,TRG,LDL,non-HDL,TC/HDL,GLU 순서가 고정됨
  // → "Name/ID" 구분선 이하, 왼쪽 60% 영역의 숫자를 Y 순서대로 7개 키에 매핑
  if (found.size < KEY_ORDER.length) {
    // 구분선 Y 위치 추정: "Name", "ID", "------" 키워드 또는 기인식 항목 최소 Y
    let valAreaTopY = 0;
    for (const w of words) {
      const t = w.text.trim().toLowerCase();
      // "Name/" 또는 "Name" 등 다양한 형태 허용
      if (t.startsWith('name') || t === 'id' || t === 'sample' || /^[-─_]{3,}$/.test(t)) {
        valAreaTopY = Math.max(valAreaTopY, w.bbox.y1);
      }
    }
    // 기인식 항목이 있으면 그 중 최소 Y를 기준으로 보정
    for (const row of rows) {
      const rowText = row.map(w => w.text).join(' ');
      for (const key of MATCH_ORDER) {
        if (!found.has(key)) continue;
        if (META[key].patterns.some(p => p.test(rowText))) {
          const rowTop = Math.min(...row.map(w => w.bbox.y0));
          if (rowTop > valAreaTopY) valAreaTopY = rowTop - 2; // 첫 값 행 직전
        }
      }
    }
    // 아직도 0이면 전체 Y 범위의 상위 25% 컷
    if (valAreaTopY === 0) {
      const ys = words.map(w => w.bbox.y0);
      valAreaTopY = Math.min(...ys) + (Math.max(...ys) - Math.min(...ys)) * 0.25;
    }

    const maxX = Math.max(...words.map(w => w.bbox.x1), 1);

    // 값 영역 숫자 수집 (오른쪽 mg/dL 컬럼 제외, 연도 제외)
    // "TC=143" 형태도 처리: =뒤 숫자를 가상 단어로 추가
    const expandedWords: (TWord & { numVal: number })[] = [];
    for (const w of words) {
      if (w.bbox.y0 < valAreaTopY || w.bbox.x1 >= maxX * 0.65) continue;
      const t = w.text.trim();
      // 순수 숫자
      if (/^\d[\d.]*$/.test(t)) {
        const v = parseFloat(t);
        if (v > 0 && !(v >= 2020 && v <= 2030)) expandedWords.push({ ...w, numVal: v });
        continue;
      }
      // KEY=VALUE 또는 KEY=VALUE 패턴에서 숫자 추출
      const eqMatch = t.match(/=(\d+(?:\.\d+)?)$/);
      if (eqMatch) {
        const v = parseFloat(eqMatch[1]);
        if (v > 0 && !(v >= 2020 && v <= 2030)) expandedWords.push({ ...w, numVal: v });
      }
    }
    const candidateNums = expandedWords.sort((a, b) => a.bbox.y0 - b.bbox.y0);

    console.debug('[OCR-B pos-candidates]', candidateNums.map(w => `${w.text}@y${w.bbox.y0}`));

    // KEY_ORDER 인덱스(0~6)로 Y-정렬된 숫자에 직접 매핑
    KEY_ORDER.forEach((key, idx) => {
      if (found.has(key)) return;
      const cand = candidateNums[idx];
      if (cand) {
        found.set(key, cand.numVal);
        console.debug(`[OCR-B pos] ${key}[${idx}] = ${cand.numVal} (from "${cand.text}")`);
      }
    });
  }

  console.debug('[OCR-B result]', Object.fromEntries(found));

  // ── 결과 조립 (KEY_ORDER 순서 유지) ──
  const items: OcrResult['items'] = [];
  for (const key of KEY_ORDER) {
    const value = found.get(key);
    if (value === undefined) continue;
    const { name, nameEn, unit, refMin, refMax } = META[key];
    const itemStatus = (value >= refMin && value <= refMax) ? 'normal' as const : 'caution' as const;
    items.push({
      name, name_en: nameEn, value,
      display_value: null, unit,
      ref_min: refMin,
      ref_max: refMax >= 900 ? null : refMax,
      status: itemStatus,
      confidence: found.size >= 7 ? 0.88 : 0.72,
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
