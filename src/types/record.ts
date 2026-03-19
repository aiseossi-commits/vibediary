// 기록 관련 타입 정의

export interface DiaryRecord {
  id: string;
  createdAt: number; // Unix timestamp (ms)
  audioPath: string | null;
  rawText: string | null;
  summary: string;
  structuredData: StructuredData | null;
  embedding: number[] | null; // Float32Array as number[]
  isSynced: boolean;
  aiPending: boolean; // AI 처리 대기 상태
}

export interface StructuredData {
  [key: string]: string | number;
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

// 유사도 점수가 포함된 기록 (AI 등대 검색용)
export interface ScoredRecord extends RecordWithTags {
  score?: number;
}

// 검색 결과 타입
export interface SearchResult {
  answer: string;
  sourceRecords: ScoredRecord[];
}

// AI 등대 채팅 메시지
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  sourceRecords?: ScoredRecord[];
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

// 날짜별 기록 요약 (캘린더용)
export interface DailyRecordSummary {
  date: string; // YYYY-MM-DD
  count: number;
  tags: string[];
}
