import { createRecord } from './recordsDao';
import { generateEmbedding } from '../services/aiProcessor';

const SEED_RECORDS = [
  {
    daysAgo: 0,
    rawText: '오늘 지원이가 작업치료 잘 받았어요. 선생님이 칭찬 많이 해주셨고 블록 쌓기도 혼자서 세 개나 했대요. 점심은 밥이랑 국 다 먹었고 낮잠도 한 시간 잤어요.',
    summary: '작업치료에서 블록 쌓기 3개를 혼자 완수함. 선생님 칭찬. 점심 식사 완료, 낮잠 1시간.',
    mood: '😊',
    structuredData: { activities: ['작업치료', '블록쌓기', '낮잠'], emotions: ['기쁨'], meals: ['점심 완료'] },
  },
  {
    daysAgo: 1,
    rawText: '언어치료 오늘도 갔어요. 발음 연습 많이 했는데 "엄마" 소리를 조금 더 또렷하게 했어요. 집에 와서 좀 피곤했는지 칭얼거렸는데 간식 먹고 나서 괜찮아졌어요.',
    summary: '"엄마" 발음이 이전보다 또렷해짐. 언어치료 후 피로감으로 칭얼거림, 간식 후 진정.',
    mood: '😌',
    structuredData: { activities: ['언어치료', '간식'], emotions: ['피로', '안정'], progress: ['발음 개선'] },
  },
  {
    daysAgo: 2,
    rawText: '오늘은 기관 안 가는 날이라 집에 있었어요. 오전에 산책 나갔는데 강아지 보고 엄청 좋아했어요. 점심 먹고 나서 블록 놀이 혼자서 한 30분 했어요. 저녁에 좀 과자 먹고 싶어했는데 참았어요.',
    summary: '휴식일. 오전 산책 중 강아지에 긍정 반응. 블록 놀이 30분 독립 놀이. 저녁 과자 요구했으나 조절.',
    mood: '😊',
    structuredData: { activities: ['산책', '블록놀이'], emotions: ['기쁨', '흥분'], independentPlay: '30분' },
  },
  {
    daysAgo: 3,
    rawText: '오늘 지원이 컨디션이 별로 안 좋았어요. 아침부터 짜증을 많이 냈고 밥도 반만 먹었어요. 치료 가는 차 안에서 내내 울었는데 치료 시작하고 나서는 좀 나아졌대요. 선생님 말로는 집중이 좀 떨어졌다고 했어요.',
    summary: '컨디션 저조. 아침 짜증, 식사량 감소(반공기). 이동 중 울음. 치료 후 호전되었으나 집중력 저하.',
    mood: '😔',
    structuredData: { activities: ['작업치료'], emotions: ['짜증', '울음'], meals: ['점심 반공기'], concerns: ['집중력 저하'] },
  },
  {
    daysAgo: 4,
    rawText: '오늘은 어린이집 운동회가 있었어요. 달리기 했는데 넘어지지 않고 끝까지 뛰었어요. 친구들이랑 같이 있는 거 좋아하는 것 같았고 선생님이 사교성이 늘었다고 하셨어요. 돌아와서 엄청 피곤했는지 저녁도 못 먹고 일찍 잠들었어요.',
    summary: '어린이집 운동회. 달리기 완주. 또래 상호작용 긍정적, 교사 "사교성 향상" 평가. 귀가 후 피로로 조기 취침, 저녁 결식.',
    mood: '🎉',
    structuredData: { activities: ['운동회', '달리기'], emotions: ['기쁨', '피로'], socialInteraction: '긍정', meals: ['저녁 결식'] },
  },
  {
    daysAgo: 5,
    rawText: '감각통합치료 처음으로 받았어요. 그네 타고 모래 만지는 거 했는데 처음엔 싫어하다가 나중엔 괜찮아했어요. 치료사 선생님이 감각 방어가 있는 것 같다고 하셨어요. 다음 주에도 예약했어요.',
    summary: '감각통합치료 첫 회기. 초기 거부감 후 점진적 수용. 치료사 "감각 방어 소견". 다음 주 예약 완료.',
    mood: '🤔',
    structuredData: { activities: ['감각통합치료', '그네', '모래놀이'], emotions: ['거부', '수용'], newActivity: true, nextAppointment: true },
  },
  {
    daysAgo: 6,
    rawText: '오늘 지원이가 처음으로 혼자서 신발을 신었어요. 시간이 좀 걸렸는데 끝까지 포기 안 하고 혼자 했어요. 칭찬해줬더니 엄청 좋아했어요. 오후에 비가 와서 집에만 있었는데 동화책 읽어주니까 집중해서 들었어요.',
    summary: '처음으로 신발 독립 착용 성공. 칭찬에 긍정 반응. 우천으로 실내 활동. 동화책 집중해서 청취.',
    mood: '⭐',
    structuredData: { activities: ['독립생활기술', '독서'], emotions: ['성취감', '기쁨'], milestone: '신발 혼자 신기 첫 성공' },
  },
  {
    daysAgo: 7,
    rawText: '오늘 병원 정기검진 갔어요. 체중은 늘었고 키도 컸대요. 발달 평가 했는데 언어는 조금 느리지만 운동 발달은 또래 수준이라고 했어요. 의사 선생님이 지금처럼 꾸준히 치료받으면 된다고 하셨어요.',
    summary: '정기검진. 체중·신장 성장 확인. 발달평가: 언어 지연, 운동발달 또래 수준. 의사 "현행 치료 지속" 권고.',
    mood: '😊',
    structuredData: { activities: ['정기검진'], health: { weightGain: true, heightGain: true }, developmentalAssessment: { language: '지연', motor: '또래수준' } },
  },
  {
    daysAgo: 8,
    rawText: '오늘 지원이가 밥 먹다가 수저를 계속 던졌어요. 세 번이나 던졌는데 왜 그러는지 모르겠어요. 화가 난 건지 장난인지. 치료사 선생님께 여쭤봐야 할 것 같아요. 저녁에는 괜찮았어요.',
    summary: '식사 중 수저 던지기 행동 3회 반복. 원인 불명(분노 또는 장난). 치료사 상담 필요. 저녁에는 문제행동 없음.',
    mood: '😟',
    structuredData: { activities: ['식사'], behaviors: ['수저 던지기'], concernLevel: 'medium', followUp: '치료사 상담 필요' },
  },
  {
    daysAgo: 9,
    rawText: '오늘 할머니 댁 갔어요. 할머니 할아버지 되게 좋아하고 많이 안겨있었어요. 평소보다 말도 좀 더 많이 한 것 같아요. 친숙한 환경이 편한가봐요. 저녁에 김치찌개 잘 먹었어요.',
    summary: '조부모 방문. 애착 인물 앞에서 언어 표현 증가. 친숙 환경에서 안정된 모습. 저녁 김치찌개 잘 섭취.',
    mood: '🥰',
    structuredData: { activities: ['가족방문'], emotions: ['안정', '애정'], socialInteraction: '긍정', meals: ['저녁 완료'], observation: '친숙환경에서 언어 증가' },
  },
];

export async function seedDemoData(childId: string): Promise<void> {
  const now = Date.now();
  const DAY_MS = 24 * 60 * 60 * 1000;

  for (const record of SEED_RECORDS) {
    const createdAt = now - record.daysAgo * DAY_MS;
    const embedding = await generateEmbedding(record.summary);
    await createRecord({
      rawText: record.rawText,
      summary: record.summary,
      mood: record.mood,
      structuredData: record.structuredData as any,
      embedding,
      aiPending: false,
      createdAt,
      childId,
    });
  }
}
