import { supabase } from '../lib/supabase';

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
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('인증이 필요합니다');

  const { data: family, error: findError } = await supabase
    .from('families')
    .select('id, invite_code')
    .eq('invite_code', code.toUpperCase().trim())
    .single();

  if (findError || !family) throw new Error('유효하지 않은 초대코드입니다');

  const { error: joinError } = await supabase
    .from('family_members')
    .insert({ family_id: family.id, user_id: user.id });

  if (joinError) {
    if (joinError.code === '23505') throw new Error('이미 참여 중인 가족방입니다');
    throw joinError;
  }

  const { count } = await supabase
    .from('family_members')
    .select('*', { count: 'exact', head: true })
    .eq('family_id', family.id);

  return { id: family.id, invite_code: family.invite_code, member_count: count ?? 1 };
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
