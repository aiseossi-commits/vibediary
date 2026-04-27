import { supabase } from '../lib/supabase';
import { getDatabase } from '../db/database';

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export interface FamilyRoom {
  id: string;
  invite_code: string;
  member_count: number;
}

export async function createFamilyRoom(): Promise<FamilyRoom> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('인증이 필요합니다');

  let family = null;
  let attempts = 0;

  while (!family && attempts < 5) {
    const code = generateInviteCode();
    const { data, error } = await supabase
      .from('families')
      .insert({ invite_code: code, created_by: user.id })
      .select()
      .single();

    if (!error) {
      family = data;
    } else if (error.code !== '23505') {
      throw error;
    }
    attempts++;
  }

  if (!family) throw new Error('가족방 생성에 실패했습니다');

  await supabase.from('family_members').insert({ family_id: family.id, user_id: user.id });

  return { id: family.id, invite_code: family.invite_code, member_count: 1 };
}

export async function joinFamilyRoom(code: string): Promise<FamilyRoom> {
  const { data, error } = await supabase.rpc('join_family_by_code', { p_code: code });

  if (error) {
    if (error.message.includes('INVALID_CODE')) throw new Error('유효하지 않은 초대코드입니다');
    if (error.message.includes('ALREADY_MEMBER')) throw new Error('이미 참여 중인 가족방입니다');
    if (error.message.includes('UNAUTHENTICATED')) throw new Error('인증이 필요합니다');
    throw error;
  }

  return { id: data.family_id, invite_code: data.invite_code, member_count: data.member_count };
}

export async function getMyFamilyRoom(): Promise<FamilyRoom | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: membership } = await supabase
    .from('family_members')
    .select('family_id')
    .eq('user_id', user.id)
    .single();

  if (!membership) return null;

  const { data: family } = await supabase
    .from('families')
    .select('id, invite_code')
    .eq('id', membership.family_id)
    .single();

  if (!family) return null;

  const { count } = await supabase
    .from('family_members')
    .select('*', { count: 'exact', head: true })
    .eq('family_id', family.id);

  return { id: family.id, invite_code: family.invite_code, member_count: count ?? 1 };
}

const PROMOTE_TABLES = [
  'children', 'records', 'tags', 'active_events', 'event_daily_logs',
  'event_name_presets', 'hidden_default_event_names', 'synthesis_articles',
  'wiki_pages', 'search_logs',
];

// 가족방 생성/참여 직후: 로컬 rows에 family_id + created_by/updated_by 백필 후 dirty 마킹
export async function promoteLocalDataToFamily(familyId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const db = await getDatabase();
  const now = Date.now();
  for (const table of PROMOTE_TABLES) {
    try {
      await db.runAsync(
        `UPDATE ${table}
         SET family_id = ?,
             created_by = COALESCE(created_by, ?),
             updated_by = ?,
             is_synced = 0,
             updated_at = ?
         WHERE family_id IS NULL`,
        familyId, user.id, user.id, now
      );
    } catch {
      // 컬럼이 없는 경우(v24 미적용) 무시
    }
  }
}

export async function leaveFamilyRoom(familyId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('인증이 필요합니다');

  const { error } = await supabase
    .from('family_members')
    .delete()
    .eq('family_id', familyId)
    .eq('user_id', user.id);

  if (error) throw error;
}
