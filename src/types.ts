export type AspectRatio = "1:1" | "3:4" | "4:3" | "9:16" | "16:9" | "2:3" | "4:5";

export type FormatCategory = 'Social Media' | 'Website';

export interface SocialFormat {
  id: string;
  name: string;
  platform: string;
  category: FormatCategory;
  ratio: AspectRatio;
  description: string;
}

export interface BrandAsset {
  id: string;
  name: string;
  data: string; // base64
  mimeType: string;
}

export interface GeneratedCopy {
  headline?: string;
  caption: string;
  hashtags: string[];
}

export interface HistoryItem {
  url: string;
  prompt: string;
  format: string;
  date: string;
  copy?: GeneratedCopy;
}

export interface BrandProfile {
  name: string;
  industry: string;
  colors: string[]; // Up to 4 colors
  style: string;
  targetAudience: string;
  toneOfVoice: string;
  typography: string;
  logoDescription: string;
  guidelines: string;
  pdfContext?: string;
  assets: BrandAsset[];
}

export interface MemberPermissions {
  can_edit_brand: boolean;
  can_generate: boolean;
}

export interface SharedBrandPreset {
  id: string;
  company_id: string;
  created_by: string | null;
  name: string;
  industry: string;
  colors: string[];
  style: string;
  targetAudience: string;
  toneOfVoice: string;
  typography: string;
  logoDescription: string;
  guidelines: string;
  pdfContext?: string;
  assets: BrandAsset[];
  created_at: string;
  updated_at: string;
}

export interface CompanyMember {
  id: string;
  user_id: string;
  role: string;
  permissions: MemberPermissions;
  profiles: {
    full_name: string | null;
  } | null;
}

export const SOCIAL_FORMATS: SocialFormat[] = [
  // Instagram
  { id: 'ig-post', name: 'Instagram Post', platform: 'Instagram', category: 'Social Media', ratio: '1:1', description: 'Standard square post' },
  { id: 'ig-portrait', name: 'Instagram Portrait', platform: 'Instagram', category: 'Social Media', ratio: '4:5', description: 'Vertical feed post' },
  { id: 'ig-story', name: 'Instagram Story', platform: 'Instagram', category: 'Social Media', ratio: '9:16', description: 'Full-screen vertical content' },
  { id: 'ig-reel', name: 'Instagram Reel', platform: 'Instagram', category: 'Social Media', ratio: '9:16', description: 'Short-form video cover' },
  
  // Facebook
  { id: 'fb-post', name: 'Facebook Post', platform: 'Facebook', category: 'Social Media', ratio: '4:3', description: 'Standard feed update' },
  { id: 'fb-cover', name: 'Facebook Cover', platform: 'Facebook', category: 'Social Media', ratio: '16:9', description: 'Page header banner' },
  { id: 'fb-story', name: 'Facebook Story', platform: 'Facebook', category: 'Social Media', ratio: '9:16', description: 'Vertical story content' },
  
  // LinkedIn
  { id: 'li-post', name: 'LinkedIn Post', platform: 'LinkedIn', category: 'Social Media', ratio: '4:3', description: 'Professional feed update' },
  { id: 'li-cover', name: 'LinkedIn Cover', platform: 'LinkedIn', category: 'Social Media', ratio: '16:9', description: 'Professional profile banner' },
  
  // Twitter (X)
  { id: 'tw-post', name: 'Twitter Post', platform: 'Twitter', category: 'Social Media', ratio: '16:9', description: 'In-feed image' },
  { id: 'tw-header', name: 'Twitter Header', platform: 'Twitter', category: 'Social Media', ratio: '16:9', description: 'Profile banner' },
  
  // YouTube
  { id: 'yt-thumb', name: 'YouTube Thumbnail', platform: 'YouTube', category: 'Social Media', ratio: '16:9', description: 'Video preview image' },
  { id: 'yt-banner', name: 'YouTube Banner', platform: 'YouTube', category: 'Social Media', ratio: '16:9', description: 'Channel header' },
  
  // TikTok
  { id: 'tt-video', name: 'TikTok Video', platform: 'TikTok', category: 'Social Media', ratio: '9:16', description: 'Vertical video content' },
  
  // Pinterest
  { id: 'pin-standard', name: 'Pinterest Pin', platform: 'Pinterest', category: 'Social Media', ratio: '2:3', description: 'Standard vertical pin' },
  
  // Website
  { id: 'web-hero', name: 'Website Hero', platform: 'Website', category: 'Website', ratio: '16:9', description: 'Main landing page banner' },
  { id: 'web-blog', name: 'Blog Header', platform: 'Website', category: 'Website', ratio: '16:9', description: 'Article featured image' },
  { id: 'web-product', name: 'Product Image', platform: 'Website', category: 'Website', ratio: '1:1', description: 'E-commerce product shot' },
  { id: 'web-sidebar', name: 'Sidebar Ad', platform: 'Website', category: 'Website', ratio: '3:4', description: 'Vertical display advertisement' },
  { id: 'web-footer', name: 'Footer Banner', platform: 'Website', category: 'Website', ratio: '16:9', description: 'Bottom of page call-to-action' },
  { id: 'web-favicon', name: 'Favicon', platform: 'Website', category: 'Website', ratio: '1:1', description: 'Browser tab icon' },
];
