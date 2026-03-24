/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Sparkles, 
  Settings, 
  Image as ImageIcon, 
  Layout, 
  Download, 
  RefreshCw, 
  Plus, 
  Check, 
  ChevronRight,
  Palette,
  Target,
  Briefcase,
  Type as TypeIcon,
  Trash2,
  ExternalLink,
  History as HistoryIcon,
  FileText,
  Upload,
  Loader2,
  MessageSquare,
  PenTool,
  Fingerprint,
  RotateCcw,
  CheckCircle2,
  LogOut,
  Users,
  Send,
  Share2,
  Shield,
  ShieldCheck,
  Lock,
  Save
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI, Type } from "@google/genai";
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { SOCIAL_FORMATS, type BrandProfile, type SocialFormat, type AspectRatio, type FormatCategory, type GeneratedCopy, type HistoryItem, type BrandAsset, type SharedBrandPreset, type MemberPermissions, type CompanyMember } from './types';
import { supabase } from './lib/supabase';
import { fetchCompanyPresets, saveCompanyPreset, deleteCompanyPreset, fetchCompanyMembers, updateMemberPermissions, fetchMyPermissions, presetToBrandProfile } from './lib/presets';
import { type Session, type User } from '@supabase/supabase-js';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const DEFAULT_BRAND: BrandProfile = {
  name: 'BrandGenius',
  industry: 'Creative Technology',
  colors: ['#6366f1', '#ec4899', '#10b981', '#f59e0b'],
  style: 'Modern, Minimalist, High-Tech',
  targetAudience: 'Content Creators, Marketers, Designers',
  toneOfVoice: 'Professional, Visionary, Friendly',
  typography: 'Inter, Sans-serif',
  logoDescription: 'A stylized spark or lightning bolt',
  guidelines: 'Clean layouts, vibrant gradients, professional yet approachable vibe.',
  pdfContext: '',
  assets: []
};

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: any;
}

// Error Boundary Component
class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-8">
          <div className="max-w-md w-full bg-white rounded-[40px] p-10 shadow-2xl border border-zinc-200 text-center space-y-6">
            <div className="w-20 h-20 bg-red-50 text-red-600 rounded-3xl flex items-center justify-center mx-auto">
              <Trash2 className="w-10 h-10" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-zinc-900">Something went wrong</h2>
              <p className="text-zinc-500 text-sm">The application encountered an unexpected error. Please try refreshing the page.</p>
            </div>
            <button 
              onClick={() => window.location.reload()}
              className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all"
            >
              Refresh App
            </button>
            {this.state.error && (
              <pre className="text-[10px] text-left bg-zinc-100 p-4 rounded-xl overflow-auto max-h-40 text-zinc-400 font-mono">
                {this.state.error.toString()}
              </pre>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function LoginScreen({ onLoginSuccess }: { onLoginSuccess: () => void }) {
  const [isRegister, setIsRegister] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [accountType, setAccountType] = useState<'private'|'company'>('private');
  const [companyName, setCompanyName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      });
      if (error) throw error;
      setSuccess('Password reset email sent! Check your inbox.');
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (isRegister) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              account_type: accountType,
              company_name: accountType === 'company' ? (companyName || `${fullName}'s Company`) : undefined,
              email: email // stored to help with invite acceptance
            }
          }
        });
        if (signUpError) throw signUpError;
        
        // Company + admin membership is now handled by the database trigger (handle_new_user)
        // so it works even when email confirmation is required
        
        if (data.session) {
          onLoginSuccess();
        } else {
          setSuccess('Registration successful! Please check your email to verify.');
        }
      } else {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        if (signInError) throw signInError;
        if (data.session) onLoginSuccess();
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const title = isForgotPassword ? 'Reset Password' : isRegister ? 'Create Account' : 'Welcome Back';
  const subtitle = isForgotPassword ? 'Enter your email to receive a reset link.' : isRegister ? 'Join BrandGen to start creating.' : 'Sign in to access your brands.';

  return (
    <div className="min-h-screen bg-[#fafafa] flex items-center justify-center p-8">
      <div className="max-w-md w-full bg-white rounded-[40px] p-10 shadow-2xl border border-zinc-200 text-center space-y-6 relative overflow-hidden">
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-indigo-100 rounded-full blur-3xl opacity-50" />
        
        <div className="relative z-10 w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center mx-auto shadow-xl shadow-indigo-200">
          <Sparkles className="w-10 h-10 text-white" />
        </div>
        
        <div className="relative z-10 space-y-3">
          <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">{title}</h1>
          <p className="text-zinc-500">{subtitle}</p>
        </div>

        {error && (
          <div className="relative z-10 bg-red-50 text-red-600 text-sm p-3 rounded-xl">{error}</div>
        )}
        {success && (
          <div className="relative z-10 bg-green-50 text-green-600 text-sm p-3 rounded-xl">{success}</div>
        )}

        {isForgotPassword ? (
          <form onSubmit={handleForgotPassword} className="relative z-10 space-y-4 text-left">
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">Email</label>
              <input required type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <button type="submit" disabled={loading} className="w-full py-4 mt-2 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg flex justify-center items-center gap-2 disabled:opacity-50">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Send Reset Link'}
            </button>
            <div className="text-center pt-2">
              <button type="button" onClick={() => { setIsForgotPassword(false); setError(''); setSuccess(''); }} className="text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors">
                Back to Sign In
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="relative z-10 space-y-4 text-left">
            {isRegister && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">Full Name</label>
                  <input required type="text" value={fullName} onChange={e => setFullName(e.target.value)} className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div className="flex gap-2 p-1 bg-zinc-100 rounded-xl">
                  <button type="button" onClick={() => setAccountType('private')} className={cn("flex-1 py-2 rounded-lg text-sm font-semibold transition-all", accountType==='private'?"bg-white text-indigo-600 shadow-sm":"text-zinc-500")}>Private</button>
                  <button type="button" onClick={() => setAccountType('company')} className={cn("flex-1 py-2 rounded-lg text-sm font-semibold transition-all", accountType==='company'?"bg-white text-indigo-600 shadow-sm":"text-zinc-500")}>Company</button>
                </div>
                {accountType === 'company' && (
                  <motion.div initial={{opacity:0, height:0}} animate={{opacity:1, height:'auto'}}>
                    <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">Company Name</label>
                    <input required type="text" value={companyName} onChange={e => setCompanyName(e.target.value)} className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" />
                  </motion.div>
                )}
              </div>
            )}
            
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">Email</label>
              <input required type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">Password</label>
              <input required type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            
            <button type="submit" disabled={loading} className="w-full py-4 mt-2 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg flex justify-center items-center gap-2 disabled:opacity-50">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isRegister ? 'Sign Up' : 'Sign In')}
            </button>
            
            <div className="text-center pt-2 space-y-2">
              {!isRegister && (
                <button type="button" onClick={() => { setIsForgotPassword(true); setError(''); setSuccess(''); }} className="block w-full text-sm text-zinc-400 hover:text-indigo-600 font-medium transition-colors">
                  Forgot your password?
                </button>
              )}
              <button type="button" onClick={() => { setIsRegister(!isRegister); setError(''); setSuccess(''); }} className="text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors">
                {isRegister ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function ResetPasswordScreen({ onComplete }: { onComplete: () => void }) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setSuccess(true);
      setTimeout(() => onComplete(), 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fafafa] flex items-center justify-center p-8">
      <div className="max-w-md w-full bg-white rounded-[40px] p-10 shadow-2xl border border-zinc-200 text-center space-y-6 relative overflow-hidden">
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-indigo-100 rounded-full blur-3xl opacity-50" />

        <div className="relative z-10 w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center mx-auto shadow-xl shadow-indigo-200">
          <Sparkles className="w-10 h-10 text-white" />
        </div>

        <div className="relative z-10 space-y-3">
          <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">Set New Password</h1>
          <p className="text-zinc-500">Enter your new password below.</p>
        </div>

        {error && <div className="relative z-10 bg-red-50 text-red-600 text-sm p-3 rounded-xl">{error}</div>}
        {success && <div className="relative z-10 bg-green-50 text-green-600 text-sm p-3 rounded-xl">Password updated! Redirecting...</div>}

        {!success && (
          <form onSubmit={handleReset} className="relative z-10 space-y-4 text-left">
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">New Password</label>
              <input required type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">Confirm Password</label>
              <input required type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <button type="submit" disabled={loading} className="w-full py-4 mt-2 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg flex justify-center items-center gap-2 disabled:opacity-50">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Update Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [authInitialized, setAuthInitialized] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthInitialized(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecovery(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (!authInitialized) return null;

  return (
    <ErrorBoundary>
      {isRecovery && session ? (
        <ResetPasswordScreen onComplete={() => { setIsRecovery(false); }} />
      ) : session && session.user ? (
        <AppContent 
          user={session.user} 
          onLogout={() => supabase.auth.signOut()} 
        />
      ) : (
        <LoginScreen onLoginSuccess={() => {}} />
      )}
    </ErrorBoundary>
  );
}

function AppContent({ user, onLogout }: { user: User; onLogout: () => void }) {
  const [brand, setBrand] = useState<BrandProfile>(() => {
    try {
      const saved = localStorage.getItem('brand_profile');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Migration: if old profile had primaryColor/secondaryColor, convert to colors array
        if (parsed.primaryColor && !parsed.colors) {
          parsed.colors = [parsed.primaryColor, parsed.secondaryColor || '#ec4899', '#10b981', '#f59e0b'];
          delete parsed.primaryColor;
          delete parsed.secondaryColor;
        }
        return parsed;
      }
    } catch (e) {
      console.error('Failed to parse brand profile from localStorage', e);
    }
    return DEFAULT_BRAND;
  });
  const [activeTab, setActiveTab] = useState<'generate' | 'brand' | 'history' | 'team'>('generate');
  const [userRole, setUserRole] = useState<{ role: string, companyId: string, companyName: string } | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteMsg, setInviteMsg] = useState('');
  const [sharedPresets, setSharedPresets] = useState<SharedBrandPreset[]>([]);
  const [myPermissions, setMyPermissions] = useState<{ role: string; permissions: MemberPermissions } | null>(null);
  const [loadingSharedPresets, setLoadingSharedPresets] = useState(false);
  const [savingSharedPreset, setSavingSharedPreset] = useState(false);
  const [companyMembers, setCompanyMembers] = useState<CompanyMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [showMigrationBanner, setShowMigrationBanner] = useState(false);
  const [migratingPresets, setMigratingPresets] = useState(false);
  
  // Company Settings Mode
  const [companyNameInput, setCompanyNameInput] = useState('');
  const [updatingCompany, setUpdatingCompany] = useState(false);
  const [updateCompanyMsg, setUpdateCompanyMsg] = useState('');

  useEffect(() => {
    // Check if user is part of a company
    const checkCompany = async () => {
      const { data, error } = await supabase
        .from('company_members')
        .select(`
          role,
          company_id,
          companies ( name )
        `)
        .eq('user_id', user.id)
        .single();
        
      if (data) {
        const cName = (data.companies as any)?.name || 'Your Company';
        setUserRole({
          role: data.role,
          companyId: data.company_id,
          companyName: cName
        });
        setCompanyNameInput(cName);
      }
    };
    checkCompany();
  }, [user.id]);

  // Fetch shared presets and permissions when company is known
  useEffect(() => {
    if (!userRole) return;
    const loadSharedData = async () => {
      setLoadingSharedPresets(true);
      try {
        const [presetsData, permsData] = await Promise.all([
          fetchCompanyPresets(userRole.companyId),
          fetchMyPermissions(user.id, userRole.companyId),
        ]);
        setSharedPresets(presetsData);
        setMyPermissions(permsData);
        // Show migration banner if admin has local presets but no shared ones
        if (
          permsData.role === 'admin' &&
          presetsData.length === 0 &&
          presets.length > 0 &&
          !localStorage.getItem('presets_migrated_dismissed')
        ) {
          setShowMigrationBanner(true);
        }
      } catch (err) {
        console.error('Failed to load shared presets:', err);
      } finally {
        setLoadingSharedPresets(false);
      }
    };
    loadSharedData();
  }, [userRole, user.id]);

  // Fetch company members for the Team tab
  useEffect(() => {
    if (!userRole || userRole.role !== 'admin') return;
    const loadMembers = async () => {
      setLoadingMembers(true);
      try {
        const members = await fetchCompanyMembers(userRole.companyId);
        setCompanyMembers(members);
      } catch (err) {
        console.error('Failed to load company members:', err);
      } finally {
        setLoadingMembers(false);
      }
    };
    loadMembers();
  }, [userRole]);

  const canEditBrand = !userRole || myPermissions?.role === 'admin' || myPermissions?.permissions.can_edit_brand === true;
  const canGenerate = !userRole || myPermissions?.role === 'admin' || myPermissions?.permissions.can_generate === true;

  const saveSharedPreset = async () => {
    if (!userRole) return;
    setSavingSharedPreset(true);
    try {
      if (sharedPresets.some(p => p.name === brand.name)) {
        setError("A shared preset with this brand name already exists.");
        return;
      }
      const newPreset = await saveCompanyPreset(userRole.companyId, user.id, brand);
      setSharedPresets(prev => [newPreset, ...prev]);
    } catch (err: any) {
      setError(err.message || 'Failed to share preset.');
    } finally {
      setSavingSharedPreset(false);
    }
  };

  const removeSharedPreset = async (presetId: string) => {
    try {
      await deleteCompanyPreset(presetId);
      setSharedPresets(prev => prev.filter(p => p.id !== presetId));
    } catch (err: any) {
      setError(err.message || 'Failed to delete shared preset.');
    }
  };

  const loadSharedPreset = (preset: SharedBrandPreset) => {
    setBrand(presetToBrandProfile(preset));
    setError(null);
  };

  const handleMigratePresets = async () => {
    if (!userRole) return;
    setMigratingPresets(true);
    try {
      for (const preset of presets) {
        const saved = await saveCompanyPreset(userRole.companyId, user.id, preset);
        setSharedPresets(prev => [saved, ...prev]);
      }
      setPresets([]);
      localStorage.removeItem('brand_presets');
      setShowMigrationBanner(false);
    } catch (err: any) {
      setError(err.message || 'Failed to migrate presets.');
    } finally {
      setMigratingPresets(false);
    }
  };

  const dismissMigrationBanner = () => {
    setShowMigrationBanner(false);
    localStorage.setItem('presets_migrated_dismissed', 'true');
  };

  const handlePermissionToggle = async (memberId: string, field: keyof MemberPermissions, currentValue: boolean) => {
    const member = companyMembers.find(m => m.id === memberId);
    if (!member) return;
    const newPermissions = { ...member.permissions, [field]: !currentValue };
    try {
      await updateMemberPermissions(memberId, newPermissions);
      setCompanyMembers(prev =>
        prev.map(m => m.id === memberId ? { ...m, permissions: newPermissions } : m)
      );
    } catch (err: any) {
      setError(err.message || 'Failed to update permissions.');
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userRole || !inviteEmail) return;
    setInviting(true);
    setInviteMsg('');
    try {
      // Step 1: Save invite to database (upsert so re-inviting the same email works)
      const { error } = await supabase.from('company_invites').upsert([{
        company_id: userRole.companyId,
        email: inviteEmail,
        invited_by: user.id
      }], { onConflict: 'company_id,email' });
      if (error) throw error;

      // Step 2: Send the invite email via Edge Function (non-blocking)
      try {
        const { data: fnData, error: fnError } = await supabase.functions.invoke('send-invite', {
          body: {
            email: inviteEmail,
            companyName: userRole.companyName,
            inviterName: user.user_metadata?.full_name || 'A team member'
          }
        });

        if (fnError) {
          console.error('Email delivery failed:', fnError);
          setInviteMsg('Invite saved, but the email could not be sent. The user can still join by signing up.');
        } else {
          setInviteMsg('Invite sent successfully!');
        }
      } catch (emailErr: any) {
        console.error('Email delivery error:', emailErr);
        setInviteMsg('Invite saved, but the email could not be sent. The user can still join by signing up.');
      }

      setInviteEmail('');
    } catch (err: any) {
      setInviteMsg(err.message || 'Failed to send invite');
    } finally {
      setInviting(false);
    }
  };

  const handleUpdateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userRole || companyNameInput.trim() === '' || companyNameInput === userRole.companyName) return;
    setUpdatingCompany(true);
    setUpdateCompanyMsg('');
    try {
      const { error } = await supabase
        .from('companies')
        .update({ name: companyNameInput })
        .eq('id', userRole.companyId);
        
      if (error) throw error;
      
      setUserRole(prev => prev ? { ...prev, companyName: companyNameInput } : null);
      setUpdateCompanyMsg('Company name updated successfully!');
      setTimeout(() => setUpdateCompanyMsg(''), 3000);
    } catch (err: any) {
      console.error('Failed to update company name:', err);
      setUpdateCompanyMsg('Failed to update company name. Ensure you are an admin.');
    } finally {
      setUpdatingCompany(false);
    }
  };

  const [selectedCategory, setSelectedCategory] = useState<FormatCategory>('Social Media');
  const [selectedFormat, setSelectedFormat] = useState<SocialFormat>(SOCIAL_FORMATS[0]);
  const [customWidth, setCustomWidth] = useState<number>(1080);
  const [customHeight, setCustomHeight] = useState<number>(1080);
  const [generateCopyEnabled, setGenerateCopyEnabled] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [pdfSuccess, setPdfSuccess] = useState(false);
  const [uploadingAsset, setUploadingAsset] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [generatedCopy, setGeneratedCopy] = useState<GeneratedCopy | null>(null);
  const [tempAsset, setTempAsset] = useState<BrandAsset | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [presets, setPresets] = useState<BrandProfile[]>(() => {
    try {
      const saved = localStorage.getItem('brand_presets');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error('Failed to parse brand presets from localStorage', e);
      return [];
    }
  });
  const [history, setHistory] = useState<HistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem('gen_history');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error('Failed to parse history from localStorage', e);
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('brand_profile', JSON.stringify(brand));
      setStorageError(null);
    } catch (e) {
      if (e instanceof Error && (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
        console.warn('Brand profile storage quota exceeded. Trimming assets...');
        setStorageError('Storage limit reached. Some assets could not be saved locally.');
        if (brand.assets && brand.assets.length > 0) {
          setBrand(prev => ({
            ...prev,
            assets: prev.assets.slice(0, -1)
          }));
        }
      }
    }
  }, [brand]);

  useEffect(() => {
    try {
      localStorage.setItem('gen_history', JSON.stringify(history));
    } catch (e) {
      if (e instanceof Error && (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
        console.warn('History storage quota exceeded. Trimming history...');
        if (history.length > 0) {
          setHistory(prev => prev.slice(0, -1));
        }
      }
    }
  }, [history]);

  useEffect(() => {
    try {
      localStorage.setItem('brand_presets', JSON.stringify(presets));
    } catch (e) {
      if (e instanceof Error && (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
        console.warn('Brand presets storage quota exceeded. Trimming assets from presets...');
        setStorageError('Storage limit reached. Some assets in your presets could not be saved.');
        
        // Strategy: Find the preset with the most assets and remove one
        setPresets(prev => {
          if (prev.length === 0) return prev;
          
          // Find index of preset with most assets
          let maxAssetsIdx = -1;
          let maxAssetsCount = 0;
          
          prev.forEach((p, idx) => {
            const count = p.assets?.length || 0;
            if (count > maxAssetsCount) {
              maxAssetsCount = count;
              maxAssetsIdx = idx;
            }
          });
          
          if (maxAssetsIdx === -1) {
            // If no assets to trim, we might have to remove a whole preset
            return prev.slice(0, -1);
          }
          
          const newPresets = [...prev];
          newPresets[maxAssetsIdx] = {
            ...newPresets[maxAssetsIdx],
            assets: newPresets[maxAssetsIdx].assets.slice(0, -1)
          };
          return newPresets;
        });
      } else {
        console.error('Failed to save brand presets to localStorage', e);
      }
    }
  }, [presets]);

  const saveAsPreset = () => {
    if (presets.length >= 5) {
      setError("Maximum of 5 brand presets reached.");
      return;
    }
    // Check if current brand is already saved (by name)
    if (presets.some(p => p.name === brand.name)) {
      setError("A preset with this brand name already exists.");
      return;
    }
    setPresets(prev => [...prev, { ...brand }]);
  };

  const deletePreset = (index: number) => {
    setPresets(prev => prev.filter((_, i) => i !== index));
  };

  const loadPreset = (preset: BrandProfile) => {
    setBrand({ ...preset });
    setError(null);
  };

  const resetBrand = () => {
    setBrand(DEFAULT_BRAND);
    setError(null);
    setPdfSuccess(false);
  };

  const handleAssetUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Check total size or individual file size
    const largeFiles = Array.from(files).filter(f => f.size > 1024 * 1024); // > 1MB
    if (largeFiles.length > 0) {
      setStorageError('Some files are too large (>1MB). Please use smaller images for brand assets.');
    }

    setUploadingAsset(true);
    try {
      const newAssets = await Promise.all(Array.from(files).map(async (file: File) => {
        return new Promise<any>((resolve) => {
          const reader = new FileReader();
          reader.onload = (event) => {
            const base64 = (event.target?.result as string).split(',')[1];
            resolve({
              id: Math.random().toString(36).substring(2, 11),
              name: file.name,
              data: base64,
              mimeType: file.type
            });
          };
          reader.readAsDataURL(file);
        });
      }));

      setBrand(prev => ({
        ...prev,
        assets: [...(prev.assets || []), ...newAssets].slice(0, 10)
      }));
    } catch (error) {
      console.error('Asset upload failed:', error);
    } finally {
      setUploadingAsset(false);
    }
  };

  const removeAsset = (id: string) => {
    setBrand(prev => ({
      ...prev,
      assets: prev.assets.filter(a => a.id !== id)
    }));
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || file.type !== 'application/pdf') return;

    setExtracting(true);
    setPdfSuccess(false);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => resolve((event.target?.result as string).split(',')[1]);
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(file);
      });

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        setError('Gemini API Key is missing. Please set it in the AI Studio Secrets.');
        setExtracting(false);
        return;
      }
      const ai = new GoogleGenAI({ apiKey });
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [
          {
            parts: [
              { inlineData: { data: base64, mimeType: 'application/pdf' } },
              { text: 'Extract the brand guidelines from this PDF. Return a JSON object with fields: name, industry, colors (array of up to 4 hex codes), style, targetAudience, toneOfVoice, typography, logoDescription, guidelines.' }
            ]
          }
        ],
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              industry: { type: Type.STRING },
              colors: { type: Type.ARRAY, items: { type: Type.STRING } },
              style: { type: Type.STRING },
              targetAudience: { type: Type.STRING },
              toneOfVoice: { type: Type.STRING },
              typography: { type: Type.STRING },
              logoDescription: { type: Type.STRING },
              guidelines: { type: Type.STRING },
            }
          }
        }
      });

      if (!response.candidates || response.candidates.length === 0) {
        throw new Error('No candidates returned from AI');
      }
      const extracted = JSON.parse(response.text);
      setBrand({ ...brand, ...extracted, pdfContext: 'Guidelines extracted from PDF', assets: brand.assets });
      setPdfSuccess(true);
      setError(null);
      
      // Clear success message after 5 seconds
      setTimeout(() => setPdfSuccess(false), 5000);
    } catch (err: any) {
      console.error('PDF extraction failed:', err);
      const msg = err?.message || String(err);
      if (msg.includes('API key') || msg.includes('API Key')) {
        setError('Gemini API Key is missing or invalid. Please check your configuration.');
      } else {
        setError(`PDF extraction failed: ${msg}`);
      }
    } finally {
      setExtracting(false);
    }
  };

  const handleTempAssetUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setError('Reference image must be under 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = (event.target?.result as string).split(',')[1];
      setTempAsset({
        id: Math.random().toString(36).substr(2, 9),
        name: file.name,
        data: base64,
        mimeType: file.type
      });
    };
    reader.readAsDataURL(file);
  };

  const generateImage = useCallback(async () => {
    if (!prompt) return;
    setGenerating(true);
    setGeneratedImage(null);
    setGeneratedCopy(null);

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        setError('Gemini API Key is missing. Please set it in the AI Studio Secrets.');
        setGenerating(false);
        return;
      }
      const ai = new GoogleGenAI({ apiKey });
      
      const isCustom = selectedCategory === 'Custom';
      const dimensionLabel = isCustom ? `${customWidth}x${customHeight}px` : `${selectedFormat.ratio}`;
      const formatLabel = isCustom ? 'Custom Size' : selectedFormat.name;
      
      const brandParts: any[] = [
        { text: `Create a professional ${formatLabel} (${dimensionLabel}) for a brand called "${brand.name}".` },
        { text: `Brand Context:\n- Industry: ${brand.industry}\n- Target Audience: ${brand.targetAudience}\n- Visual Style: ${brand.style}\n- Tone of Voice: ${brand.toneOfVoice}\n- Typography: ${brand.typography}\n- Logo/Iconography: ${brand.logoDescription}\n- Color Palette: ${brand.colors.join(', ')}\n- Guidelines: ${brand.guidelines}` }
      ];

      if (brand.pdfContext) {
        brandParts.push({ text: `Additional context from brand book: ${brand.pdfContext}` });
      }

      // Add brand assets (logos, etc.) as visual context
      if (brand.assets && brand.assets.length > 0) {
        brandParts.push({ text: "Use the following brand assets (logos, icons, elements) as visual reference for the generation. Incorporate them naturally into the design if appropriate, or strictly follow their style." });
        brand.assets.forEach(asset => {
          brandParts.push({
            inlineData: {
              data: asset.data,
              mimeType: asset.mimeType
            }
          });
        });
      }

      // Add temporary reference asset if provided
      if (tempAsset) {
        brandParts.push({ text: "Use the following temporary asset as a specific visual reference for this generation. This could be a product photo, a specific layout sketch, or a reference image for the content." });
        brandParts.push({
          inlineData: {
            data: tempAsset.data,
            mimeType: tempAsset.mimeType
          }
        });
      }

      brandParts.push({ text: `Specific Image Content: ${prompt}\n\nEnsure the image is high-quality, perfectly framed for ${dimensionLabel} dimensions, and strictly follows the brand aesthetic.` });

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: [{ parts: brandParts }],
        config: {
          imageConfig: isCustom ? {} : {
            aspectRatio: selectedFormat.ratio as any,
          }
        }
      });

      let imageUrl = '';
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          imageUrl = `data:image/png;base64,${part.inlineData.data}`;
          break;
        }
      }

      // Generate Copy (only if checkbox is enabled)
      let copy: GeneratedCopy | undefined;
      if (generateCopyEnabled) {
        try {
          const copyResponse = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: [
              { text: `Generate social media copy for a ${selectedFormat.name} on ${selectedFormat.platform}.` },
              { text: `Brand: ${brand.name}\nTone: ${brand.toneOfVoice}\nAudience: ${brand.targetAudience}\nPrompt: ${prompt}` },
              { text: 'Return a JSON object with: headline (optional), caption (the main post text), and hashtags (array of strings).' }
            ],
            config: {
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  headline: { type: Type.STRING },
                  caption: { type: Type.STRING },
                  hashtags: { type: Type.ARRAY, items: { type: Type.STRING } }
                },
                required: ['caption', 'hashtags']
              }
            }
          });
          copy = JSON.parse(copyResponse.text);
          setGeneratedCopy(copy || null);
        } catch (copyErr) {
          console.error('Copy generation failed:', copyErr);
        }
      }

      if (imageUrl) {
        setGeneratedImage(imageUrl);
        setHistory(prev => [{
          url: imageUrl,
          prompt,
          format: selectedFormat.name,
          date: new Date().toLocaleString(),
          copy
        }, ...prev].slice(0, 8));
      }
    } catch (error) {
      console.error('Generation failed:', error);
    } finally {
      setGenerating(false);
    }
  }, [prompt, selectedFormat, brand, tempAsset, customWidth, customHeight, selectedCategory, generateCopyEnabled]);

  return (
    <div className="min-h-screen bg-[#fafafa] text-zinc-900 font-sans selection:bg-indigo-100">
      {/* Error Toast */}
      <AnimatePresence>
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-8 right-8 z-[100] bg-red-600 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3"
          >
            <div className="flex-1 text-sm font-medium">{error}</div>
            <button onClick={() => setError(null)} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
              <Trash2 className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar Navigation */}
      <nav className="fixed left-0 top-0 h-full w-20 bg-white border-r border-zinc-200 flex flex-col items-center py-8 gap-8 z-50">
        <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
          <Sparkles className="w-6 h-6" />
        </div>
        
        <div className="flex flex-col gap-4 flex-1">
          <NavButton 
            active={activeTab === 'generate'} 
            onClick={() => setActiveTab('generate')} 
            icon={<ImageIcon />} 
            label="Generate" 
          />
          <NavButton 
            active={activeTab === 'brand'} 
            onClick={() => setActiveTab('brand')} 
            icon={<Settings />} 
            label="Brand" 
          />
          <NavButton 
            active={activeTab === 'history'} 
            onClick={() => setActiveTab('history')} 
            icon={<HistoryIcon />} 
            label="History" 
          />
          {userRole?.role === 'admin' && (
            <NavButton 
              active={activeTab === 'team'} 
              onClick={() => setActiveTab('team')} 
              icon={<Users />} 
              label="Team" 
            />
          )}
        </div>

        <div className="mt-auto mb-4">
          <button
            onClick={onLogout}
            title="Log Out"
            className="w-12 h-12 flex items-center justify-center rounded-2xl text-zinc-400 hover:text-red-500 hover:bg-red-50 transition-all"
          >
            <LogOut className="w-6 h-6" />
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="pl-20 min-h-screen">
        <div className="max-w-6xl mx-auto px-8 py-12">
          <AnimatePresence mode="wait">
            {activeTab === 'generate' && (
              <motion.div 
                key="generate"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-12"
              >
                {/* Left Column: Controls */}
                <div className="lg:col-span-5 space-y-8">
                  <div>
                    <h1 className="text-4xl font-semibold tracking-tight text-zinc-900 mb-2">Create Content</h1>
                    <p className="text-zinc-500">Generate brand-aligned assets for any platform.</p>
                  </div>

                  {/* Format Selector */}
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <label className="text-sm font-medium text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                        <Layout className="w-4 h-4" /> 1. Select Category
                      </label>
                      <div className="flex gap-2 p-1 bg-zinc-100 rounded-2xl">
                        {(['Social Media', 'Website', 'Custom'] as FormatCategory[]).map(cat => (
                          <button
                            key={cat}
                            onClick={() => {
                              setSelectedCategory(cat);
                              // Auto-select first format of new category
                              const firstOfCat = SOCIAL_FORMATS.find(f => f.category === cat);
                              if (firstOfCat) setSelectedFormat(firstOfCat);
                            }}
                            className={cn(
                              "flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all",
                              selectedCategory === cat 
                                ? "bg-white text-indigo-600 shadow-sm" 
                                : "text-zinc-500 hover:text-zinc-700"
                            )}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-sm font-medium text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                        <Check className="w-4 h-4" /> 2. Select Format
                      </label>
                      <div className="grid grid-cols-2 gap-3 max-h-[320px] overflow-y-auto pr-2 custom-scrollbar">
                        {SOCIAL_FORMATS.filter(f => f.category === selectedCategory).map(format => (
                          <button
                            key={format.id}
                            onClick={() => setSelectedFormat(format)}
                            className={cn(
                              "p-4 rounded-2xl border text-left transition-all duration-200",
                              selectedFormat.id === format.id 
                                ? "bg-white border-indigo-600 ring-4 ring-indigo-50 shadow-sm" 
                                : "bg-white border-zinc-200 hover:border-zinc-300"
                            )}
                          >
                            <div className="flex justify-between items-start mb-2">
                              <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                                {format.ratio}
                              </span>
                              {selectedFormat.id === format.id && <Check className="w-4 h-4 text-indigo-600" />}
                            </div>
                            <div className="font-medium text-zinc-900 text-sm">{format.name}</div>
                            <div className="text-[10px] text-zinc-400">{format.platform}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Custom Dimensions (shown when Custom category selected) */}
                  {selectedCategory === 'Custom' && (
                    <div className="space-y-3">
                      <label className="text-sm font-medium text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                        <Layout className="w-4 h-4" /> Custom Dimensions (px)
                      </label>
                      <div className="flex gap-3 items-center">
                        <div className="flex-1">
                          <label className="text-[10px] font-bold text-zinc-400 uppercase">Width</label>
                          <input
                            type="number"
                            min={64}
                            max={4096}
                            value={customWidth}
                            onChange={e => setCustomWidth(Math.max(64, parseInt(e.target.value) || 64))}
                            className="w-full p-3 bg-white border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
                          />
                        </div>
                        <span className="text-zinc-300 font-bold mt-4">×</span>
                        <div className="flex-1">
                          <label className="text-[10px] font-bold text-zinc-400 uppercase">Height</label>
                          <input
                            type="number"
                            min={64}
                            max={4096}
                            value={customHeight}
                            onChange={e => setCustomHeight(Math.max(64, parseInt(e.target.value) || 64))}
                            className="w-full p-3 bg-white border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Temporary Asset Upload */}
                  <div className="space-y-3">
                      <label className="text-sm font-medium text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                        <Upload className="w-4 h-4" /> 3. Reference Image (Optional)
                      </label>
                      
                      {!tempAsset ? (
                        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-zinc-200 rounded-3xl cursor-pointer hover:bg-zinc-50 hover:border-indigo-300 transition-all group">
                          <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <Plus className="w-8 h-8 text-zinc-300 group-hover:text-indigo-500 transition-colors mb-2" />
                            <p className="text-xs text-zinc-400">Add a product or reference photo</p>
                          </div>
                          <input type="file" className="hidden" accept="image/*" onChange={handleTempAssetUpload} />
                        </label>
                      ) : (
                        <div className="relative group aspect-video bg-zinc-50 rounded-2xl border border-zinc-200 overflow-hidden">
                          <img 
                            src={`data:${tempAsset.mimeType};base64,${tempAsset.data}`} 
                            alt="Reference" 
                            className="w-full h-full object-contain p-2"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <button 
                              onClick={() => setTempAsset(null)}
                              className="bg-red-500 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg"
                            >
                              <Trash2 className="w-3 h-3" /> Remove Reference
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Prompt Input */}
                    <div className="space-y-4">
                      <label className="text-sm font-medium text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                        <TypeIcon className="w-4 h-4" /> 4. Prompt
                      </label>
                    <textarea
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="Describe the image you want to create..."
                      className="w-full h-40 p-5 bg-white border border-zinc-200 rounded-3xl focus:ring-4 focus:ring-indigo-50 focus:border-indigo-600 outline-none transition-all resize-none text-zinc-800 placeholder:text-zinc-300"
                    />
                  </div>

                  {/* Generate Copy Checkbox */}
                  <label className="flex items-center gap-3 p-4 bg-white border border-zinc-200 rounded-2xl cursor-pointer hover:border-indigo-300 transition-all group">
                    <input
                      type="checkbox"
                      checked={generateCopyEnabled}
                      onChange={e => setGenerateCopyEnabled(e.target.checked)}
                      className="w-5 h-5 rounded-lg border-zinc-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                    <div>
                      <div className="text-sm font-semibold text-zinc-700 group-hover:text-indigo-600 transition-colors flex items-center gap-1.5">
                        <MessageSquare className="w-4 h-4" /> Generate Copy
                      </div>
                      <div className="text-[10px] text-zinc-400">Include headline, caption & hashtags</div>
                    </div>
                  </label>

                  {!canGenerate ? (
                    <div className="w-full py-5 bg-zinc-100 text-zinc-400 rounded-3xl font-semibold flex items-center justify-center gap-3 border border-zinc-200">
                      <Lock className="w-5 h-5" />
                      Generation not permitted. Contact your team admin.
                    </div>
                  ) : (
                    <button
                      onClick={generateImage}
                      disabled={generating || !prompt}
                      className="w-full py-5 bg-indigo-600 text-white rounded-3xl font-semibold flex items-center justify-center gap-3 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xl shadow-indigo-200"
                    >
                      {generating ? (
                        <>
                          <RefreshCw className="w-5 h-5 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-5 h-5" />
                          Generate Asset
                        </>
                      )}
                    </button>
                  )}
                </div>

                {/* Right Column: Preview */}
                <div className="lg:col-span-7">
                  <div className="sticky top-12">
                    <div className="aspect-square lg:aspect-auto lg:h-[700px] bg-zinc-100 rounded-[40px] border-4 border-white shadow-2xl overflow-hidden relative flex items-center justify-center group">
                      {generatedImage ? (
                        <>
                          <img 
                            src={generatedImage} 
                            alt="Generated" 
                            className="w-full h-full object-contain"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                            <a 
                              href={generatedImage} 
                              download={`brandgen-${selectedFormat.id}.png`}
                              className="bg-white/90 backdrop-blur px-6 py-3 rounded-2xl text-zinc-900 font-medium flex items-center gap-2 hover:bg-white transition-colors shadow-lg"
                            >
                              <Download className="w-4 h-4" /> Download
                            </a>
                          </div>
                        </>
                      ) : generating ? (
                        <div className="text-center space-y-4">
                          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
                          <p className="text-zinc-400 font-medium">Crafting your brand asset...</p>
                        </div>
                      ) : (
                        <div className="text-center p-12 space-y-4">
                          <div className="w-20 h-20 bg-zinc-200 rounded-3xl flex items-center justify-center mx-auto text-zinc-400">
                            <ImageIcon className="w-10 h-10" />
                          </div>
                          <div className="space-y-1">
                            <p className="text-zinc-900 font-semibold text-xl">Preview Area</p>
                            <p className="text-zinc-400 max-w-xs mx-auto">Your generated image will appear here, perfectly formatted for {selectedFormat.name}.</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Generated Copy Section */}
                    {generatedCopy && (
                      <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-8 bg-white rounded-[40px] border border-zinc-200 p-8 shadow-sm space-y-6"
                      >
                        <div className="flex justify-between items-center">
                          <h3 className="text-xl font-semibold flex items-center gap-2">
                            <MessageSquare className="w-5 h-5 text-indigo-600" /> Generated Copy
                          </h3>
                          <button 
                            onClick={() => {
                              const text = `${generatedCopy.headline ? generatedCopy.headline + '\n\n' : ''}${generatedCopy.caption}\n\n${generatedCopy.hashtags.join(' ')}`;
                              navigator.clipboard.writeText(text);
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl font-bold hover:bg-indigo-100 transition-all text-sm"
                          >
                            <Plus className="w-4 h-4" /> Copy Text
                          </button>
                        </div>

                        <div className="space-y-4">
                          {generatedCopy.headline && (
                            <div className="space-y-1">
                              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Headline</p>
                              <p className="text-lg font-semibold text-zinc-900">{generatedCopy.headline}</p>
                            </div>
                          )}
                          <div className="space-y-1">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Caption</p>
                            <p className="text-zinc-700 leading-relaxed whitespace-pre-wrap">{generatedCopy.caption}</p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {generatedCopy.hashtags.map((tag, i) => (
                              <span key={i} className="text-sm font-medium text-indigo-600">#{tag.replace(/^#/, '')}</span>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'brand' && (
              <motion.div 
                key="brand"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="max-w-4xl mx-auto space-y-12"
              >
                <div className="text-center space-y-4">
                  <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-[32px] flex items-center justify-center mx-auto">
                    <Settings className="w-10 h-10" />
                  </div>
                  <h2 className="text-4xl font-semibold tracking-tight">Brand Guidelines</h2>
                  <p className="text-zinc-500">Define your brand's DNA or import from a brand book.</p>
                  <div className="flex justify-center">
                    <button 
                      onClick={resetBrand}
                      className="text-xs font-medium text-zinc-400 hover:text-red-500 transition-colors flex items-center gap-1.5"
                    >
                      <RotateCcw className="w-3 h-3" /> Reset to Default
                    </button>
                  </div>
                </div>

                {/* Migration Banner */}
                {showMigrationBanner && (
                  <div className="bg-amber-50 border border-amber-200 rounded-[40px] p-8 shadow-sm flex flex-col md:flex-row items-center gap-6">
                    <div className="flex-1 space-y-1">
                      <h3 className="text-lg font-semibold text-amber-900 flex items-center gap-2">
                        <Share2 className="w-5 h-5" /> Share your presets with your team?
                      </h3>
                      <p className="text-amber-700 text-sm">You have {presets.length} local preset{presets.length !== 1 ? 's' : ''}. Migrate them to the cloud so your team members can use them.</p>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={handleMigratePresets}
                        disabled={migratingPresets}
                        className="px-6 py-3 bg-amber-600 text-white rounded-2xl font-bold hover:bg-amber-700 transition-all disabled:opacity-50 flex items-center gap-2"
                      >
                        {migratingPresets ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
                        Migrate
                      </button>
                      <button
                        onClick={dismissMigrationBanner}
                        className="px-6 py-3 bg-white text-amber-700 rounded-2xl font-bold border border-amber-200 hover:bg-amber-50 transition-all"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                )}

                {/* Team Presets Section (company users) */}
                {userRole && (
                  <div className="bg-white rounded-[40px] border border-zinc-200 p-10 shadow-sm space-y-8">
                    <div className="flex justify-between items-end">
                      <div className="space-y-1">
                        <h3 className="text-2xl font-semibold flex items-center gap-2">
                          <Share2 className="w-6 h-6 text-indigo-600" /> Team Presets
                        </h3>
                        <p className="text-zinc-500 text-sm">Shared brand configurations for {userRole.companyName}.</p>
                      </div>
                      {canEditBrand && (
                        <button
                          onClick={saveSharedPreset}
                          disabled={savingSharedPreset}
                          className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {savingSharedPreset ? <Loader2 className="w-5 h-5 animate-spin" /> : <Share2 className="w-5 h-5" />} Share to Team
                        </button>
                      )}
                    </div>

                    {loadingSharedPresets ? (
                      <div className="py-12 text-center">
                        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mx-auto" />
                      </div>
                    ) : sharedPresets.length === 0 ? (
                      <div className="py-12 text-center border-2 border-dashed border-zinc-100 rounded-3xl">
                        <p className="text-zinc-400 text-sm italic">
                          {canEditBrand ? "No team presets yet. Configure your brand and share it!" : "No team presets shared yet. Ask your admin to share brand presets."}
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                        {sharedPresets.map(preset => (
                          <div
                            key={preset.id}
                            className={cn(
                              "group relative p-4 rounded-3xl border transition-all cursor-pointer",
                              brand.name === preset.name
                                ? "bg-indigo-50 border-indigo-200 ring-2 ring-indigo-100"
                                : "bg-white border-zinc-100 hover:border-zinc-200"
                            )}
                            onClick={() => loadSharedPreset(preset)}
                          >
                            <div className="flex flex-col gap-2">
                              <div className="flex justify-between items-start">
                                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm border border-zinc-100">
                                  <Palette className="w-5 h-5" style={{ color: preset.colors[0] || '#6366f1' }} />
                                </div>
                                {canEditBrand && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      removeSharedPreset(preset.id);
                                    }}
                                    className="opacity-0 group-hover:opacity-100 p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                              <div>
                                <div className="font-bold text-zinc-900 truncate">{preset.name}</div>
                                <div className="text-[10px] text-zinc-500 truncate">{preset.industry}</div>
                              </div>
                              <div className="flex gap-1">
                                {preset.colors.slice(0, 4).map((c, i) => (
                                  <div key={i} className="w-3 h-3 rounded-full border border-white" style={{ backgroundColor: c }} />
                                ))}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Local Brand Presets Section (private users or fallback) */}
                {!userRole && (
                  <div className="bg-white rounded-[40px] border border-zinc-200 p-10 shadow-sm space-y-8">
                    <div className="flex justify-between items-end">
                      <div className="space-y-1">
                        <h3 className="text-2xl font-semibold flex items-center gap-2">
                          <Briefcase className="w-6 h-6 text-indigo-600" /> Brand Presets
                        </h3>
                        <p className="text-zinc-500 text-sm">Save up to 5 brand configurations for quick switching.</p>
                      </div>
                      <button
                        onClick={saveAsPreset}
                        disabled={presets.length >= 5}
                        className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Plus className="w-5 h-5" /> Save Current
                      </button>
                    </div>

                    {presets.length === 0 ? (
                      <div className="py-12 text-center border-2 border-dashed border-zinc-100 rounded-3xl">
                        <p className="text-zinc-400 text-sm italic">No presets saved yet. Configure your brand below and save it!</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                        {presets.map((preset, idx) => (
                          <div
                            key={idx}
                            className={cn(
                              "group relative p-4 rounded-3xl border transition-all cursor-pointer",
                              brand.name === preset.name
                                ? "bg-indigo-50 border-indigo-200 ring-2 ring-indigo-100"
                                : "bg-white border-zinc-100 hover:border-zinc-200"
                            )}
                            onClick={() => loadPreset(preset)}
                          >
                            <div className="flex flex-col gap-2">
                              <div className="flex justify-between items-start">
                                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm border border-zinc-100">
                                  <Palette className="w-5 h-5 text-indigo-600" style={{ color: preset.colors[0] }} />
                                </div>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deletePreset(idx);
                                  }}
                                  className="opacity-0 group-hover:opacity-100 p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                              <div>
                                <div className="font-bold text-zinc-900 truncate">{preset.name}</div>
                                <div className="text-[10px] text-zinc-500 truncate">{preset.industry}</div>
                              </div>
                              <div className="flex gap-1">
                                {preset.colors.slice(0, 4).map((c, i) => (
                                  <div key={i} className="w-3 h-3 rounded-full border border-white" style={{ backgroundColor: c }} />
                                ))}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Read-only notice for members without edit permission */}
                {userRole && !canEditBrand && (
                  <div className="bg-zinc-50 border border-zinc-200 rounded-[40px] p-8 flex items-center gap-4">
                    <Lock className="w-6 h-6 text-zinc-400 shrink-0" />
                    <div>
                      <p className="font-semibold text-zinc-700">View-only access</p>
                      <p className="text-zinc-500 text-sm">You can load and use shared presets for generation, but cannot modify brand settings. Contact your admin to get edit access.</p>
                    </div>
                  </div>
                )}

                {/* PDF Import Section (edit permission required) */}
                {canEditBrand && <div className={cn(
                  "rounded-[40px] p-8 text-white shadow-xl transition-all duration-500 flex flex-col md:flex-row items-center gap-8",
                  pdfSuccess ? "bg-emerald-600 shadow-emerald-200" : "bg-indigo-600 shadow-indigo-200"
                )}>
                  <div className="flex-1 space-y-2">
                    <h3 className="text-2xl font-semibold flex items-center gap-2">
                      {pdfSuccess ? <CheckCircle2 className="w-6 h-6" /> : <FileText className="w-6 h-6" />}
                      {pdfSuccess ? "Guidelines Extracted!" : "Import Brand Book"}
                    </h3>
                    <p className="text-indigo-100 text-sm">
                      {pdfSuccess 
                        ? "We've successfully updated your brand profile with the details from your PDF." 
                        : "Upload a PDF of your brand guidelines and we'll automatically extract the details for you."}
                    </p>
                  </div>
                  <label className={cn(
                    "flex items-center gap-3 px-8 py-4 bg-white text-indigo-600 rounded-2xl font-bold cursor-pointer hover:bg-indigo-50 transition-all shadow-lg min-w-[180px] justify-center",
                    extracting && "opacity-50 cursor-not-allowed"
                  )}>
                    {extracting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Extracting...
                      </>
                    ) : pdfSuccess ? (
                      <span className="text-emerald-600">Success!</span>
                    ) : (
                      <>
                        <Upload className="w-5 h-5" />
                        Upload PDF
                      </>
                    )}
                    <input type="file" accept=".pdf" className="hidden" onChange={handlePdfUpload} disabled={extracting} />
                  </label>
                </div>}

                {/* Brand Assets Section (edit permission required) */}
                {canEditBrand && <>
                <div className="bg-white rounded-[40px] border border-zinc-200 p-10 shadow-sm space-y-8">
                  <div className="flex justify-between items-end">
                    <div className="space-y-1">
                      <h3 className="text-2xl font-semibold flex items-center gap-2">
                        <Fingerprint className="w-6 h-6 text-indigo-600" /> Brand Assets
                      </h3>
                      <p className="text-zinc-500 text-sm">Upload logos, icons, or key visual elements (max 10).</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {storageError && (
                        <span className="text-[10px] font-medium text-red-500 bg-red-50 px-2 py-1 rounded-lg animate-pulse">
                          {storageError}
                        </span>
                      )}
                      <label className={cn(
                        "flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl font-bold cursor-pointer hover:bg-indigo-100 transition-all",
                        (uploadingAsset || (brand.assets?.length || 0) >= 10) && "opacity-50 cursor-not-allowed"
                      )}>
                        {uploadingAsset ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                        Add Asset
                        <input 
                          type="file" 
                          accept="image/*" 
                          multiple 
                          className="hidden" 
                          onChange={handleAssetUpload} 
                          disabled={uploadingAsset || (brand.assets?.length || 0) >= 10} 
                        />
                      </label>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                    {brand.assets?.map((asset) => (
                      <div key={asset.id} className="relative group aspect-square bg-zinc-50 rounded-2xl border border-zinc-100 overflow-hidden">
                        <img 
                          src={`data:${asset.mimeType};base64,${asset.data}`} 
                          alt={asset.name} 
                          className="w-full h-full object-contain p-2"
                          referrerPolicy="no-referrer"
                        />
                        <button 
                          onClick={() => removeAsset(asset.id)}
                          className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    {(!brand.assets || brand.assets.length === 0) && (
                      <div className="col-span-full py-8 text-center text-zinc-300 border-2 border-dashed border-zinc-100 rounded-2xl">
                        No assets uploaded yet.
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-white rounded-[40px] border border-zinc-200 p-10 shadow-sm space-y-10">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <BrandInput 
                      label="Brand Name" 
                      icon={<Briefcase />} 
                      value={brand.name} 
                      onChange={(v) => setBrand({...brand, name: v})} 
                    />
                    <BrandInput 
                      label="Industry" 
                      icon={<Target />} 
                      value={brand.industry} 
                      onChange={(v) => setBrand({...brand, industry: v})} 
                    />
                  </div>

                  <div className="space-y-4">
                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                      <Palette className="w-4 h-4" /> Color Palette (Up to 4)
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {brand.colors.map((color, index) => (
                        <div key={index} className="space-y-2">
                          <div className="flex gap-2 items-center">
                            <input 
                              type="color" 
                              value={color} 
                              onChange={(e) => {
                                const newColors = [...brand.colors];
                                newColors[index] = e.target.value;
                                setBrand({...brand, colors: newColors});
                              }}
                              className="w-10 h-10 rounded-lg border-none cursor-pointer"
                            />
                            <input 
                              type="text" 
                              value={color} 
                              onChange={(e) => {
                                const newColors = [...brand.colors];
                                newColors[index] = e.target.value;
                                setBrand({...brand, colors: newColors});
                              }}
                              className="flex-1 p-2 bg-zinc-50 border border-zinc-200 rounded-lg font-mono text-xs"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <BrandInput 
                      label="Tone of Voice" 
                      icon={<MessageSquare />} 
                      value={brand.toneOfVoice} 
                      onChange={(v) => setBrand({...brand, toneOfVoice: v})} 
                    />
                    <BrandInput 
                      label="Typography" 
                      icon={<PenTool />} 
                      value={brand.typography} 
                      onChange={(v) => setBrand({...brand, typography: v})} 
                    />
                  </div>

                  <BrandTextArea 
                    label="Visual Style" 
                    placeholder="e.g. Minimalist, Bauhaus, Cyberpunk..." 
                    value={brand.style} 
                    onChange={(v) => setBrand({...brand, style: v})} 
                  />
                  
                  <BrandTextArea 
                    label="Logo & Iconography Description" 
                    placeholder="Describe your logo and key visual elements..." 
                    value={brand.logoDescription} 
                    onChange={(v) => setBrand({...brand, logoDescription: v})} 
                  />

                  <BrandTextArea 
                    label="Target Audience" 
                    placeholder="Who are we talking to?" 
                    value={brand.targetAudience} 
                    onChange={(v) => setBrand({...brand, targetAudience: v})} 
                  />

                  <BrandTextArea 
                    label="Detailed Guidelines" 
                    placeholder="Any specific rules? (e.g. No human faces, always use gradients...)" 
                    value={brand.guidelines} 
                    onChange={(v) => setBrand({...brand, guidelines: v})} 
                  />
                </div>
                </>}
              </motion.div>
            )}

            {activeTab === 'history' && (
              <motion.div 
                key="history"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-12"
              >
                <div className="flex justify-between items-end">
                  <div>
                    <h2 className="text-4xl font-semibold tracking-tight">Generation History</h2>
                    <p className="text-zinc-500">Your recent brand assets.</p>
                  </div>
                  <button 
                    onClick={() => setHistory([])}
                    className="flex items-center gap-2 text-zinc-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" /> Clear History
                  </button>
                </div>

                {history.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {history.map((item, i) => (
                      <motion.div 
                        key={i}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.05 }}
                        className="bg-white rounded-[32px] border border-zinc-200 overflow-hidden shadow-sm group"
                      >
                        <div className="aspect-square bg-zinc-100 relative overflow-hidden">
                          <img 
                            src={item.url} 
                            alt={item.prompt} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                            <button 
                              onClick={() => {
                                setGeneratedImage(item.url);
                                setGeneratedCopy(item.copy || null);
                                setActiveTab('generate');
                              }}
                              className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-zinc-900 hover:bg-indigo-50 hover:text-indigo-600 transition-all"
                            >
                              <ExternalLink className="w-5 h-5" />
                            </button>
                            <a 
                              href={item.url} 
                              download="brand-asset.png"
                              className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-zinc-900 hover:bg-indigo-50 hover:text-indigo-600 transition-all"
                            >
                              <Download className="w-5 h-5" />
                            </a>
                          </div>
                        </div>
                        <div className="p-6 space-y-2">
                          <div className="flex justify-between items-start">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                              {item.format}
                            </span>
                            <span className="text-[10px] text-zinc-400">{item.date}</span>
                          </div>
                          <p className="text-sm text-zinc-600 line-clamp-2 italic">"{item.prompt}"</p>
                          {item.copy && (
                            <div className="flex items-center gap-1 text-[10px] font-semibold text-indigo-500 mt-2">
                              <MessageSquare className="w-3 h-3" /> Includes Copy
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-32 bg-white rounded-[40px] border border-dashed border-zinc-300">
                    <HistoryIcon className="w-12 h-12 text-zinc-200 mx-auto mb-4" />
                    <p className="text-zinc-400 font-medium">No history yet. Start generating!</p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
          {activeTab === 'team' && userRole?.role === 'admin' && (
            <motion.div 
              key="team"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-4xl mx-auto space-y-8"
            >
              <div>
                <h2 className="text-4xl font-semibold tracking-tight">Team Management</h2>
                <p className="text-zinc-500">Manage {userRole.companyName}'s settings and team members.</p>
              </div>
              
              {/* Company Settings */}
              <div className="bg-white rounded-[40px] border border-zinc-200 p-10 shadow-sm space-y-6">
                <h3 className="text-2xl font-semibold flex items-center gap-2">
                  <Fingerprint className="w-6 h-6 text-indigo-600" /> Company Settings
                </h3>
                <p className="text-sm text-zinc-500">
                  Update your organization's core details.
                </p>
                <form onSubmit={handleUpdateCompany} className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <input 
                      type="text" 
                      required 
                      value={companyNameInput}
                      onChange={e => setCompanyNameInput(e.target.value)}
                      placeholder="Company Name..." 
                      className="w-full p-4 bg-zinc-50 border border-zinc-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <button 
                    type="submit" 
                    disabled={updatingCompany || companyNameInput === userRole.companyName}
                    className="px-8 py-4 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 transition flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {updatingCompany ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    Save Changes
                  </button>
                </form>
                {updateCompanyMsg && (
                  <div className={cn("text-sm font-medium p-4 rounded-xl", updateCompanyMsg.includes('success') ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600")}>
                    {updateCompanyMsg}
                  </div>
                )}
              </div>
              
              <div className="bg-white rounded-[40px] border border-zinc-200 p-10 shadow-sm space-y-6">
                <h3 className="text-2xl font-semibold flex items-center gap-2">
                  <Users className="w-6 h-6 text-indigo-600" /> Invite Members
                </h3>
                <p className="text-sm text-zinc-500">
                  Send an invite link to their email address. When they sign up, they will automatically be added to your company space.
                </p>
                <form onSubmit={handleInvite} className="flex flex-col md:flex-row gap-4">
                  <input 
                    type="email" 
                    required 
                    value={inviteEmail}
                    onChange={e => setInviteEmail(e.target.value)}
                    placeholder="Email address..." 
                    className="flex-1 p-4 bg-zinc-50 border border-zinc-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button 
                    type="submit" 
                    disabled={inviting}
                    className="px-8 py-4 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 transition flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {inviting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                    Send Invite
                  </button>
                </form>
                {inviteMsg && (
                  <div className={cn("text-sm font-medium p-4 rounded-xl", inviteMsg.includes('success') ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600")}>
                    {inviteMsg}
                  </div>
                )}
              </div>

              {/* Team Members & Permissions */}
              <div className="bg-white rounded-[40px] border border-zinc-200 p-10 shadow-sm space-y-6">
                <h3 className="text-2xl font-semibold flex items-center gap-2">
                  <Shield className="w-6 h-6 text-indigo-600" /> Member Permissions
                </h3>
                <p className="text-sm text-zinc-500">
                  Control what each team member can do. Admins always have full access.
                </p>

                {loadingMembers ? (
                  <div className="py-8 text-center">
                    <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mx-auto" />
                  </div>
                ) : companyMembers.length === 0 ? (
                  <div className="py-8 text-center border-2 border-dashed border-zinc-100 rounded-3xl">
                    <p className="text-zinc-400 text-sm italic">No team members yet. Invite someone above!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {companyMembers.map(member => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-5 rounded-2xl border border-zinc-100 bg-zinc-50/50"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm">
                            {(member.profiles?.full_name || '?')[0].toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-zinc-900">{member.profiles?.full_name || 'Unknown'}</div>
                            <div className="text-xs text-zinc-500 capitalize flex items-center gap-1">
                              {member.role === 'admin' ? <ShieldCheck className="w-3 h-3" /> : null}
                              {member.role}
                            </div>
                          </div>
                        </div>

                        {member.role === 'admin' ? (
                          <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg">Full Access</span>
                        ) : (
                          <div className="flex items-center gap-6">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <span className="text-xs font-medium text-zinc-600">Edit Brand</span>
                              <button
                                onClick={() => handlePermissionToggle(member.id, 'can_edit_brand', member.permissions.can_edit_brand)}
                                className={cn(
                                  "relative w-10 h-6 rounded-full transition-colors",
                                  member.permissions.can_edit_brand ? "bg-indigo-600" : "bg-zinc-300"
                                )}
                              >
                                <div className={cn(
                                  "absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform",
                                  member.permissions.can_edit_brand ? "translate-x-4.5" : "translate-x-0.5"
                                )} />
                              </button>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <span className="text-xs font-medium text-zinc-600">Generate</span>
                              <button
                                onClick={() => handlePermissionToggle(member.id, 'can_generate', member.permissions.can_generate)}
                                className={cn(
                                  "relative w-10 h-6 rounded-full transition-colors",
                                  member.permissions.can_generate ? "bg-indigo-600" : "bg-zinc-300"
                                )}
                              >
                                <div className={cn(
                                  "absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform",
                                  member.permissions.can_generate ? "translate-x-4.5" : "translate-x-0.5"
                                )} />
                              </button>
                            </label>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </div>
      </main>
    </div>
  );
}

function NavButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative w-12 h-12 flex items-center justify-center rounded-2xl transition-all group",
        active ? "bg-indigo-50 text-indigo-600" : "text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
      )}
    >
      {icon}
      <span className="absolute left-full ml-4 px-2 py-1 bg-zinc-900 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
        {label}
      </span>
      {active && (
        <motion.div 
          layoutId="nav-indicator"
          className="absolute -left-4 w-1 h-6 bg-indigo-600 rounded-full"
        />
      )}
    </button>
  );
}

function BrandInput({ label, icon, value, onChange }: { label: string; icon: React.ReactNode; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-3">
      <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
        {icon} {label}
      </label>
      <input 
        type="text" 
        value={value} 
        onChange={(e) => onChange(e.target.value)}
        className="w-full p-4 bg-zinc-50 border border-zinc-200 rounded-2xl focus:ring-4 focus:ring-indigo-50 focus:border-indigo-600 outline-none transition-all"
      />
    </div>
  );
}

function BrandTextArea({ label, placeholder, value, onChange }: { label: string; placeholder: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-3">
      <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
        {label}
      </label>
      <textarea 
        value={value} 
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full p-4 bg-zinc-50 border border-zinc-200 rounded-2xl focus:ring-4 focus:ring-indigo-50 focus:border-indigo-600 outline-none transition-all h-24 resize-none"
      />
    </div>
  );
}
