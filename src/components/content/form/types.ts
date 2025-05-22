
import { z } from "zod";

export interface FormData {
  prompt: string;
  country: string;
  language: string;
  tone: string;
  toneUrl: string;
  toneType: 'description' | 'url';
  useAiMedia: boolean;
  mediaFile: File | null;
  wordCount: number;
}

export const initialFormData: FormData = {
  prompt: '',
  country: '',
  language: 'en',
  tone: '',
  toneUrl: '',
  toneType: 'description',
  useAiMedia: true,
  mediaFile: null,
  wordCount: 1000,
};

export const formSchema = z.object({
  prompt: z.string().min(1, { message: "Please enter an AI prompt to rank for" }),
  country: z.string(),
  language: z.string(),
  tone: z.string().optional(),
  toneUrl: z.string().optional(),
  toneType: z.enum(['description', 'url']),
  useAiMedia: z.boolean(),
  wordCount: z.number().min(300).max(3000),
});
