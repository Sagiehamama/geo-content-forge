
import { z } from "zod";

export interface FormData {
  prompt: string;
  tone: string;
  toneType: 'description' | 'url';
  toneUrl: string;
  wordCount: number;
  language: string;
  country: string;
  includeImages: boolean;
  includeFrontmatter: boolean;
  useAiMedia: boolean;
  mediaFile: File | null;
  audience: string;
}

export const initialFormData: FormData = {
  prompt: '',
  tone: '',
  toneType: 'description',
  toneUrl: '',
  wordCount: 1000,
  language: 'en',
  country: '',
  includeImages: true,
  includeFrontmatter: true,
  useAiMedia: true,
  mediaFile: null,
  audience: '',
};

export const formSchema = z.object({
  prompt: z.string().min(1, { message: "Please enter an AI prompt to rank for" }),
  tone: z.string().optional(),
  toneType: z.enum(['description', 'url']),
  toneUrl: z.string().optional(),
  wordCount: z.number().min(300).max(3000),
  language: z.string(),
  country: z.string(),
  includeImages: z.boolean(),
  includeFrontmatter: z.boolean(),
  useAiMedia: z.boolean(),
  audience: z.string().optional(),
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
  url: string;
  alt: string;
  caption: string;
}

// Mock content is removed as we now have real data
