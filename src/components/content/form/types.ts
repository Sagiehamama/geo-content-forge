import { z } from "zod";

export interface FormData {
  id?: string;
  prompt: string;
  company: string;
  country: string;
  language: string;
  tone: string;
  toneUrl: string;
  toneType: 'description' | 'url';
  mediaMode: 'auto' | 'manual';
  mediaFile: File | null;
  wordCount: number;
  includeFrontmatter: boolean;
  includeImages?: boolean;
}

export const initialFormData: FormData = {
  prompt: '',
  company: '',
  country: '',
  language: 'en',
  tone: '',
  toneUrl: '',
  toneType: 'description',
  mediaMode: 'auto',
  mediaFile: null,
  wordCount: 1000,
  includeFrontmatter: true,
  includeImages: false,
};

export const formSchema = z.object({
  prompt: z.string().min(1, { message: "Please enter an AI prompt to rank for" }),
  company: z.string().optional(),
  country: z.string(),
  language: z.string(),
  tone: z.string().optional(),
  toneUrl: z.string().optional(),
  toneType: z.enum(['description', 'url']),
  mediaMode: z.enum(['auto', 'manual']),
  wordCount: z.number().min(300).max(3000),
  includeFrontmatter: z.boolean(),
});

export interface GeneratedContent {
  id?: string;
  title: string;
  content: string;
  frontmatter: ContentFrontmatter;
  images: ContentImage[];
  readingTime: number;
  wordCount: number;
  prompt?: string;
  language?: string;
}

// For the content history
export interface ContentHistoryItem extends GeneratedContent {
  generatedAt: string;
}

export interface ContentFrontmatter {
  title: string;
  description: string;
  tags: string[];
  slug: string;
  author: string;
  date: string;
  featuredImage?: string;
}

export interface ContentImage {
  location: string;
  url: string;
  alt: string;
  caption: string;
  source?: string;
}

// Mock content is removed as we now have real data
