import { supabase } from './supabase';
import type { BrandProfile, SharedBrandPreset, MemberPermissions, CompanyMember } from '../types';

// ── Shared Brand Presets ──

export async function fetchCompanyPresets(companyId: string): Promise<SharedBrandPreset[]> {
  const { data, error } = await supabase
    .from('brand_presets')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data || []).map(mapRowToPreset);
}

export async function saveCompanyPreset(
  companyId: string,
  userId: string,
  brand: BrandProfile
): Promise<SharedBrandPreset> {
  const { data, error } = await supabase
    .from('brand_presets')
    .insert({
      company_id: companyId,
      created_by: userId,
      name: brand.name,
      industry: brand.industry,
      colors: brand.colors,
      style: brand.style,
      target_audience: brand.targetAudience,
      tone_of_voice: brand.toneOfVoice,
      typography: brand.typography,
      logo_description: brand.logoDescription,
      guidelines: brand.guidelines,
      pdf_context: brand.pdfContext || null,
      assets: brand.assets,
    })
    .select()
    .single();

  if (error) throw error;
  return mapRowToPreset(data);
}

export async function updateCompanyPreset(
  presetId: string,
  brand: BrandProfile
): Promise<SharedBrandPreset> {
  const { data, error } = await supabase
    .from('brand_presets')
    .update({
      name: brand.name,
      industry: brand.industry,
      colors: brand.colors,
      style: brand.style,
      target_audience: brand.targetAudience,
      tone_of_voice: brand.toneOfVoice,
      typography: brand.typography,
      logo_description: brand.logoDescription,
      guidelines: brand.guidelines,
      pdf_context: brand.pdfContext || null,
      assets: brand.assets,
      updated_at: new Date().toISOString(),
    })
    .eq('id', presetId)
    .select()
    .single();

  if (error) throw error;
  return mapRowToPreset(data);
}

export async function deleteCompanyPreset(presetId: string): Promise<void> {
  const { error } = await supabase
    .from('brand_presets')
    .delete()
    .eq('id', presetId);

  if (error) throw error;
}

// ── Company Members & Permissions ──

export async function fetchCompanyMembers(companyId: string): Promise<CompanyMember[]> {
  const { data, error } = await supabase
    .from('company_members')
    .select(`
      id,
      user_id,
      role,
      permissions,
      profiles ( full_name )
    `)
    .eq('company_id', companyId);

  if (error) throw error;
  return (data || []) as unknown as CompanyMember[];
}

export async function updateMemberPermissions(
  memberId: string,
  permissions: MemberPermissions
): Promise<void> {
  const { error } = await supabase
    .from('company_members')
    .update({ permissions })
    .eq('id', memberId);

  if (error) throw error;
}

export async function fetchMyPermissions(
  userId: string,
  companyId: string
): Promise<{ role: string; permissions: MemberPermissions }> {
  const { data, error } = await supabase
    .from('company_members')
    .select('role, permissions')
    .eq('user_id', userId)
    .eq('company_id', companyId)
    .single();

  if (error) throw error;
  return {
    role: data.role,
    permissions: data.permissions as MemberPermissions,
  };
}

// ── Helpers ──

function mapRowToPreset(row: Record<string, unknown>): SharedBrandPreset {
  return {
    id: row.id as string,
    company_id: row.company_id as string,
    created_by: row.created_by as string | null,
    name: row.name as string,
    industry: row.industry as string,
    colors: (row.colors as string[]) || [],
    style: row.style as string,
    targetAudience: row.target_audience as string,
    toneOfVoice: row.tone_of_voice as string,
    typography: row.typography as string,
    logoDescription: row.logo_description as string,
    guidelines: row.guidelines as string,
    pdfContext: (row.pdf_context as string) || undefined,
    assets: (row.assets as SharedBrandPreset['assets']) || [],
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

export function presetToBrandProfile(preset: SharedBrandPreset): BrandProfile {
  return {
    name: preset.name,
    industry: preset.industry,
    colors: preset.colors,
    style: preset.style,
    targetAudience: preset.targetAudience,
    toneOfVoice: preset.toneOfVoice,
    typography: preset.typography,
    logoDescription: preset.logoDescription,
    guidelines: preset.guidelines,
    pdfContext: preset.pdfContext,
    assets: preset.assets,
  };
}
