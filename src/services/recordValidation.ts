import { DEFAULT_TAGS } from '../db/schema';
import type { AIProcessingResult } from '../types/record';

// 하위 태그 → 부모 태그 자동 매핑 (온톨로지 계층 강제)
const PARENT_TAG_MAP: Record<string, string> = {
  // 치료 계열
  '#언어치료': '#치료', '#작업치료': '#치료', '#감각통합치료': '#치료',
  '#ABA치료': '#치료', '#놀이치료': '#치료', '#물리치료': '#치료',
  '#뇌파치료': '#치료', '#한의학': '#치료',
  // 투약 계열
  '#처방약': '#투약', '#보충제': '#투약', '#동종요법': '#투약', '#패치': '#투약',
  // 행동/정서 계열
  '#기분': '#행동', '#상동행동': '#행동', '#자해': '#행동', '#공격행동': '#행동',
};

// 후처리 검증: AI 응답 정제 (consequence 정제, tags 정규화, 부모 태그 자동 보정, #행동 배치)
export function validateAndCleanStructuredData(result: AIProcessingResult, customTagNames: string[]): AIProcessingResult {
  const allowedTags = new Set([...DEFAULT_TAGS, ...customTagNames]);

  // 1. consequence 정제: 의료/신체손상 정보 제거 (consequence는 보호자 대응만 포함)
  if (result.structuredData && 'consequence' in result.structuredData && typeof result.structuredData.consequence === 'string') {
    const consequence = result.structuredData.consequence!;
    // 의료인 개입 키워드 (병원/처치 명확)
    const medicalKeywords = [
      '병원', '응급실', '의원', '응급', '수술', '발작',
      '처방', '진료', '입원', '외래',
    ];
    // 신체 손상 키워드 (상처/멍/출혈)
    const injuryKeywords = [
      '상처', '멍', '출혈', '붓기', '부음', '찢어',
      '밴드', '연고', '붕대', '소독',
    ];
    // '피'는 단독 매칭 시 오탐(피규어/피곤 등) 우려 — 출혈 표현은 '출혈'/'피남'/'피가' 등으로 매칭
    const bleedingPatterns = ['피남', '피가', '피난', '피흘'];
    const hasMatch =
      medicalKeywords.some(p => consequence.includes(p)) ||
      injuryKeywords.some(p => consequence.includes(p)) ||
      bleedingPatterns.some(p => consequence.includes(p));
    if (hasMatch) {
      (result.structuredData as any).consequence = '';
    }
    // 주의: '검사'는 발달검사(ATEC/CARS) 문맥과 겹쳐 의도치 않은 정제 우려로 제외
  }

  // 2. tags 정규화: 콜론 제거, 정의되지 않은 태그 필터링, 중복 제거
  if (Array.isArray(result.tags)) {
    result.tags = [
      ...new Set(
        result.tags
          .map(tag => {
            const cleanTag = tag.split(':')[0].split('(')[0].trim();
            return cleanTag.startsWith('#') ? cleanTag : `#${cleanTag}`;
          })
          .filter(tag => allowedTags.has(tag))
      )
    ];
  }

  // 3. 하위 태그 → 부모 태그 자동 보정 (모델이 부모를 빠뜨려도 강제 추가)
  const tagSet = new Set(result.tags);
  for (const tag of result.tags) {
    const parent = PARENT_TAG_MAP[tag];
    if (parent && !tagSet.has(parent)) {
      tagSet.add(parent);
    }
  }
  result.tags = Array.from(tagSet);

  // 4. behavioral_incident이면 #행동 반드시 맨 앞에
  if (result.structuredData?.event_type === 'behavioral_incident') {
    result.tags = result.tags.filter(t => t !== '#행동');
    result.tags.unshift('#행동');
  }

  return result;
}
