import { getRecordsWithEmbeddings } from '../db/queries';
import { getAllTags } from '../db/tagsDao';
import type { Tag } from '../types/record';

// 코사인 유사도 계산
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;

  return dotProduct / denominator;
}

// BLOB → Float32Array 변환
function blobToFloat32Array(blob: Uint8Array): number[] {
  const float32 = new Float32Array(blob.buffer);
  return Array.from(float32);
}

// 질의에서 태그 자동 감지
const TAG_KEYWORDS: Record<string, string[]> = {
  '#의료': ['병원', '진료', '열', '체온', '아프', '증상', '의사', '진찰', '검사'],
  '#투약': ['약', '투약', '복용', '먹이', '해열제', '감기약', '알약', '시럽', '처방'],
  '#행동': ['행동', '자해', '발작', '울', '때리', '소리', '감정', '짜증', '흥분'],
  '#일상': ['밥', '식사', '잠', '수면', '산책', '놀이', '목욕', '외출', '배변'],
  '#치료': ['치료', '언어', '물리', '작업', '재활', '상담', '교육', '훈련'],
};

export function detectTagsFromQuery(query: string): string[] {
  const detectedTags: string[] = [];

  for (const [tag, keywords] of Object.entries(TAG_KEYWORDS)) {
    if (keywords.some((kw) => query.includes(kw))) {
      detectedTags.push(tag);
    }
  }

  return detectedTags;
}

// 벡터 유사도 검색 (태그 필터 후 top-k)
export async function vectorSearch(
  queryEmbedding: number[],
  topK: number = 5,
  filterTagIds?: number[],
  childId?: string
): Promise<{ id: string; summary: string; structuredData: string | null; score: number; createdAt: number }[]> {
  const records = await getRecordsWithEmbeddings(filterTagIds, childId);

  const scored = records.map((record) => {
    const embedding = blobToFloat32Array(record.embedding);
    const score = cosineSimilarity(queryEmbedding, embedding);
    return {
      id: record.id,
      summary: record.summary,
      structuredData: record.structuredData,
      score,
      createdAt: record.createdAt,
    };
  });

  // 유사도 높은 순 정렬
  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, topK);
}

// 태그 이름 → ID 변환
export async function getTagIdsByNames(tagNames: string[]): Promise<number[]> {
  if (tagNames.length === 0) return [];

  const allTags = await getAllTags();
  const tagMap = new Map(allTags.map((t) => [t.name, t.id]));

  return tagNames
    .map((name) => tagMap.get(name))
    .filter((id): id is number => id !== undefined);
}
