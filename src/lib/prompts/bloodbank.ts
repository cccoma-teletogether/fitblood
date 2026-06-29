export const BLOODBANK_APP_A_PROMPT = `당신은 대한적십자사혈액원 앱 화면을 카메라로 촬영한 이미지를 분석합니다.
화면 촬영이므로 반사광·기울기·모아레가 있을 수 있습니다. 텍스트를 최대한 인식하세요.

[추출 항목]
- ALT → name: "ALT", name_en: "Alanine Aminotransferase", unit: "IU/L" (IU/L와 U/L 동일 취급)
- 혈청단백 → name: "혈청단백", name_en: "Serum Protein", unit: "g/dL"

[혈액형] — blood_type 별도 필드
- ABO식(A/B/AB/O) + Rh식(+/-) 형식으로 반환 (예: "B+", "O-")

[응답 형식]
JSON만 반환하세요.
{
  "exam_date": null,
  "institution": "대한적십자사혈액원",
  "blood_type": "혈액형 또는 null",
  "items": [
    {
      "name": "항목명",
      "name_en": "영문명",
      "value": 숫자,
      "display_value": null,
      "unit": "단위",
      "ref_min": null,
      "ref_max": null,
      "status": "normal|caution|danger|unknown",
      "confidence": 0.0~1.0
    }
  ]
}`;

export const BLOODBANK_APP_B_PROMPT = `당신은 대한적십자사혈액원 앱 화면을 카메라로 촬영한 이미지를 분석합니다. 연 1회 회원서비스 검사 화면입니다.
화면 촬영이므로 반사광·기울기가 있을 수 있습니다.

[추출 항목 6종]
- ALT → name_en: "Alanine Aminotransferase", unit: "IU/L"
- 혈청단백 → name_en: "Serum Protein", unit: "g/dL"
- AST → name_en: "Aspartate Aminotransferase", unit: "IU/L"
- 알부민 → name_en: "Albumin", unit: "g/dL"
- 총콜레스테롤 → name_en: "Total Cholesterol", unit: "mg/dL"
- 혈중요소질소(BUN) → name_en: "BUN", unit: "mg/dL"

[이상값 판단]
- 빨간 원 → status: "caution"
- 초록 원 → status: "normal"

[응답 형식]
JSON만 반환하세요.
{
  "exam_date": null,
  "institution": "대한적십자사혈액원",
  "items": [...]
}`;

export const BLOODBANK_PRINT_PROMPT = `당신은 혈소판 헌혈(성분헌혈) 전 적합성 확인을 위해 혈액 분석기에서 출력된 영수증형 CBC 결과지를 분석합니다.
모든 항목명은 영문입니다. 열감지 용지 특성상 대비가 낮을 수 있습니다.

[추출 항목]
WBC(×10³/μL), Lymph#(×10³/μL), Mid#(×10³/μL), Gran#(×10³/μL),
Lymph%(%), Mid%(%), Gran#(%),
RBC(×10⁶/μL), HGB(g/dL), HCT(%), MCV(fL), MCH(pg), MCHC(g/dL),
RDW-CV(%), RDW-SD(fL),
PLT(×10³/μL), MPV(fL), PDW, PCT(%),
P-LCC(×10³/μL), P-LCR(%)

[단위 정규화]
- 10^3/uL → ×10³/μL
- 10^6/uL → ×10⁶/μL

[이상 플래그]
- 항목 옆 "L" 또는 "H" 텍스트 → status: "caution"
- 참고범위는 결과지에 없으므로 ref_min: null, ref_max: null

[응답 형식]
JSON만 반환하세요.
{
  "exam_date": "YYYY-MM-DD 또는 null",
  "institution": "혈액원 기관명 또는 null",
  "items": [...]
}`;
