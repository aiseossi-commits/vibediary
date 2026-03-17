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

// 검색 결과 타입
export interface SearchResult {
  answer: string;
  sourceRecords: RecordWithTags[];
}

// 날짜별 기록 요약 (캘린더용)
export interface DailyRecordSummary {
  date: string; // YYYY-MM-DD
  count: number;
  tags: string[];
}
