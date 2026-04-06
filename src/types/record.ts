// 기록 관련 타입 정의

export interface DiaryRecord {
  id: string;
  createdAt: number; // Unix timestamp (ms)
  audioPath: string | null;
  rawText: string | null;
  summary: string;
  structuredData: StructuredData | null;
  isSynced: boolean;
  aiPending: boolean; // AI 처리 대기 상태
  source?: 'voice' | 'calendar_text';
  childId?: string | null;
}

export interface StructuredData {
  [key: string]: string | number | boolean | undefined;
  // 기록 유형 분류
  event_type?: 'behavioral_incident' | 'medical' | 'developmental' | 'daily';
  // 행동 사건 ABC
  antecedent?: string;
  behavior?: string;
  consequence?: string;
  // 발달 관찰 영역
  domain?: string;
  // 발달 영역 온톨로지 코드 (GROSS/FINE/LANG_R/LANG_E/COGN/SOCIAL/DAILY/SENSORY)
  ontology_code?: string;
  // 이정표 여부 (첫 성공, 처음 달성 등)
  is_milestone?: boolean;
}

export interface Tag {
  id: number;
  name: string; // "#의료", "#투약" 등
}

export interface RecordWithTags extends DiaryRecord {
  tags: Tag[];
}

// AI 응답 타입
export interface AIProcessingResult {
  summary: string;
  tags: string[];
  structuredData: StructuredData;
}

// STT 결과 타입
export interface STTResult {
  text: string;
  confidence: number;
  source: 'device' | 'whisper';
}

// 검색 결과 타입
export interface SearchResult {
  answer: string;
}

// AI 등대 채팅 메시지
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  createdAt: number;
}

// 항해일지 (AI 등대 검색 로그)
export interface SearchLog {
  id: number;
  childId: string | null;
  query: string;
  answer: string;
  createdAt: number;
}

// Synthesis 아티클 (absorb 결과)
export type SynthesisArticleType = 'weekly_overview' | 'developmental_domain' | 'milestone_timeline' | 'behavioral_pattern' | 'medical_summary' | 'therapy_log';

export interface SynthesisArticle {
  id: number;
  childId: string;
  type: SynthesisArticleType;
  title: string;
  body: string;
  sourceRecordIds: string[] | null;
  periodStart: number | null;
  periodEnd: number | null;
  createdAt: number;
  updatedAt: number;
}

// Absorb 실행 결과
export interface AbsorbResult {
  absorbedCount: number;
  articlesCreated: number;
  articlesUpdated: number;
}

// 날짜별 기록 요약 (캘린더용)
export interface DailyRecordSummary {
  date: string; // YYYY-MM-DD
  count: number;
  tags: string[];
}
