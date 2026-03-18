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
  Fingerprint
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI, Type } from "@google/genai";
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { SOCIAL_FORMATS, type BrandProfile, type SocialFormat, type AspectRatio, type FormatCategory, type GeneratedCopy, type HistoryItem, type BrandAsset } from './types';

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

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}

function AppContent() {
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
  const [activeTab, setActiveTab] = useState<'generate' | 'brand' | 'history'>('generate');
  const [selectedCategory, setSelectedCategory] = useState<FormatCategory>('Social Media');
  const [selectedFormat, setSelectedFormat] = useState<SocialFormat>(SOCIAL_FORMATS[0]);
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [uploadingAsset, setUploadingAsset] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [generatedCopy, setGeneratedCopy] = useState<GeneratedCopy | null>(null);
  const [tempAsset, setTempAsset] = useState<BrandAsset | null>(null);
  const [error, setError] = useState<string | null>(null);
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
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = (event.target?.result as string).split(',')[1];
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

        try {
          if (!response.candidates || response.candidates.length === 0) {
            throw new Error('No candidates returned from AI');
          }
          const extracted = JSON.parse(response.text);
          setBrand({ ...brand, ...extracted, pdfContext: 'Guidelines extracted from PDF', assets: brand.assets });
          setError(null);
        } catch (parseError) {
          console.error('Failed to parse brand guidelines from AI response:', parseError, response.candidates?.[0]?.content?.parts?.[0]?.text);
          setError('Could not parse the brand guidelines from the PDF. Please try a different file or enter details manually.');
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('PDF extraction failed:', error);
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
      
      const brandParts: any[] = [
        { text: `Create a professional ${selectedFormat.name} (${selectedFormat.ratio}) for a brand called "${brand.name}".` },
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

      brandParts.push({ text: `Specific Image Content: ${prompt}\n\nEnsure the image is high-quality, perfectly framed for ${selectedFormat.ratio} aspect ratio, and strictly follows the brand aesthetic.` });

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: [{ parts: brandParts }],
        config: {
          imageConfig: {
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

      // Generate Copy
      let copy: GeneratedCopy | undefined;
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
  }, [prompt, selectedFormat, brand, tempAsset]);

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
                        {(['Social Media', 'Website'] as FormatCategory[]).map(cat => (
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
                </div>

                {/* PDF Import Section */}
                <div className="bg-indigo-600 rounded-[40px] p-8 text-white shadow-xl shadow-indigo-200 flex flex-col md:flex-row items-center gap-8">
                  <div className="flex-1 space-y-2">
                    <h3 className="text-2xl font-semibold flex items-center gap-2">
                      <FileText className="w-6 h-6" /> Import Brand Book
                    </h3>
                    <p className="text-indigo-100 text-sm">Upload a PDF of your brand guidelines and we'll automatically extract the details for you.</p>
                  </div>
                  <label className={cn(
                    "flex items-center gap-3 px-8 py-4 bg-white text-indigo-600 rounded-2xl font-bold cursor-pointer hover:bg-indigo-50 transition-all shadow-lg",
                    extracting && "opacity-50 cursor-not-allowed"
                  )}>
                    {extracting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Extracting...
                      </>
                    ) : (
                      <>
                        <Upload className="w-5 h-5" />
                        Upload PDF
                      </>
                    )}
                    <input type="file" accept=".pdf" className="hidden" onChange={handlePdfUpload} disabled={extracting} />
                  </label>
                </div>

                {/* Brand Assets Section */}
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
