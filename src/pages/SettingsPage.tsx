import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const tooltipStyle = {
  display: 'inline-block',
  marginLeft: '0.5em',
  color: '#888',
  cursor: 'pointer',
  fontSize: '1em',
};

// Validation function for user prompt template
const validateUserPrompt = (template: string) => {
  // Test 1: Empty template check
  if (!template || template.trim().length === 0) {
    return { 
      valid: false, 
      error: 'User prompt template cannot be empty. Please enter a valid template.' 
    };
  }

  // Test 2: Required placeholder exists
  if (!template.includes('${prompt}')) {
    return { 
      valid: false, 
      error: 'Missing ${prompt} placeholder - content generation will fail. Please include ${prompt} in your template.' 
    };
  }

  // Test 3: Company conditional syntax check (common error source)
  if (template.includes('${company') && !template.includes('${company ?')) {
    return {
      valid: false,
      error: 'Company variable found but missing conditional syntax. Use: ${company ? "text when company exists" : ""}'
    };
  }

  // Test 4: Template literal syntax works
  try {
    const testFunction = new Function(
      'prompt', 
      'company', 
      'includeFrontmatter', 
      'includeImages', 
      'return `' + template + '`;'
    );
    // Test with mock data
    testFunction('test prompt', 'TestCorp', true, false);
    testFunction('test prompt', '', false, true); // Test with empty company
  } catch (error) {
    // Make error message more user-friendly
    let friendlyError = error.message;
    if (friendlyError.includes('Unexpected token')) {
      friendlyError = 'Invalid template syntax - check for unmatched brackets, quotes, or conditional statements';
    } else if (friendlyError.includes('Unterminated')) {
      friendlyError = 'Unclosed template expression - check for missing closing brackets }';
    }
    
    return { 
      valid: false, 
      error: `Template syntax error: ${friendlyError}. Please check your template literal syntax and conditional statements.` 
    };
  }

  return { valid: true };
};

// Default media agent prompt if none exists
const DEFAULT_MEDIA_AGENT_PROMPT = `You are a specialized Media Selection Agent for a content creation platform. Your task is to analyze Markdown content and identify 1-3 optimal spots where images would enhance the article.

INSTRUCTIONS:
1. Analyze the provided Markdown article thoroughly
2. Identify 1-3 strategic locations where images would enhance reader engagement and understanding
3. For each location, create a descriptive tag (e.g., "after_introduction", "climate_change_graph", "sustainable_practices")
4. Generate a specific image search query that would find highly relevant, visually appealing images for that location
5. Return your analysis as a properly formatted JSON array

FORMAT YOUR RESPONSE AS JSON:
[
  {
    "location": "descriptive_tag_for_location", 
    "query": "specific search query for relevant image"
  },
  // Additional locations if appropriate
]

GUIDELINES FOR GOOD LOCATIONS:
- Article introduction (create visual interest)
- Between major sections (break up text)
- To illustrate complex concepts
- For key statistics or data points
- For emotional impact at critical points

GUIDELINES FOR GOOD SEARCH QUERIES:
- Be specific rather than generic
- Include style terms like "professional photo", "infographic", or "illustration" when appropriate
- Consider both literal and conceptual imagery that relates to the content
- Prioritize searches that will yield high-quality, appropriate images

Always return valid, properly formatted JSON. The location tags you create will be used to place images in the Markdown.`;

const SettingsPage = () => {
  const [systemPrompt, setSystemPrompt] = useState('');
  const [userPrompt, setUserPrompt] = useState('');
  const [mediaAgentPrompt, setMediaAgentPrompt] = useState('');
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [buttonState, setButtonState] = useState<'save' | 'validating' | 'saved'>('save');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPrompt = async () => {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from('content_templates')
        .select('id, system_prompt, user_prompt, media_agent_prompt')
        .eq('is_default', true)
        .maybeSingle();
      if (error) {
        setError('Failed to fetch prompt template.');
      } else if (data) {
        setSystemPrompt(data.system_prompt || '');
        setUserPrompt(data.user_prompt || '');
        setMediaAgentPrompt(data.media_agent_prompt || DEFAULT_MEDIA_AGENT_PROMPT);
        setTemplateId(data.id);
      }
      setLoading(false);
    };
    fetchPrompt();
  }, []);

  const handleSave = async () => {
    if (!templateId) return;
    
    // Set validating state
    setButtonState('validating');
    setError(null);

    // Validate user prompt template
    const validation = validateUserPrompt(userPrompt);
    if (!validation.valid) {
      toast.error(validation.error);
      setButtonState('save');
      return;
    }

    // If validation passes, save to database
    const { error } = await supabase
      .from('content_templates')
      .update({ 
        system_prompt: systemPrompt, 
        user_prompt: userPrompt, 
        media_agent_prompt: mediaAgentPrompt, 
        updated_at: new Date().toISOString() 
      })
      .eq('id', templateId);

    if (error) {
      toast.error('Failed to save prompt template.');
      setButtonState('save');
    } else {
      // Success: show "Saved" for 2 seconds
      setButtonState('saved');
      toast.success('Prompt templates saved successfully!');
      setTimeout(() => {
        setButtonState('save');
      }, 2000);
    }
  };

  const getButtonText = () => {
    switch (buttonState) {
      case 'validating':
        return 'Validating...';
      case 'saved':
        return 'Saved';
      default:
        return 'Save';
    }
  };

  return (
    <div className="container py-8">
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>Prompt Templates</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div>Loading...</div>
          ) : (
            <>
              <label className="block mb-2 font-medium">
                Content - System Prompt
                <span style={tooltipStyle} title="Sets the AI's core persona, context, rules, and overarching instructions for generating the main article content. Define the AI's character, expertise, and any specific output formats or constraints it should always follow. This establishes the foundation for how the AI approaches all content generation.">ⓘ</span>
              </label>
              <textarea
                className="w-full min-h-[250px] border rounded-md p-2 mb-6 font-mono text-sm"
                value={systemPrompt}
                onChange={e => setSystemPrompt(e.target.value)}
                disabled={buttonState === 'validating'}
              />
              <label className="block mb-2 font-medium">
                Content - User Prompt Template
                <span style={tooltipStyle} title="This is the template for the specific task given to the AI for content generation. It includes placeholders like '${prompt}' for the user's main topic/keyword, '${company}' for company/brand context, '${includeFrontmatter}' and '${includeImages}' for content options. It instructs the AI on structure, sections, and specific elements to include based on user input parameters.">ⓘ</span>
              </label>
              <textarea
                className="w-full min-h-[250px] border rounded-md p-2 mb-6 font-mono text-sm"
                value={userPrompt}
                onChange={e => setUserPrompt(e.target.value)}
                disabled={buttonState === 'validating'}
              />
              <label className="block mb-2 font-medium">
                Media Agent - Image Search Prompt
                <span style={tooltipStyle} title="This prompt instructs the Media Agent AI. It should analyze the generated article (Markdown) and identify optimal locations for images (1-3 spots), then provide search queries for finding those images. The output should be JSON with location tags and search queries. The location tags will be used to place images in the Markdown content.">ⓘ</span>
              </label>
              <textarea
                className="w-full min-h-[250px] border rounded-md p-2 mb-6 font-mono text-sm"
                value={mediaAgentPrompt}
                onChange={e => setMediaAgentPrompt(e.target.value)}
                disabled={buttonState === 'validating'}
              />
              <Button 
                onClick={handleSave} 
                disabled={buttonState === 'validating'}
                className={buttonState === 'saved' ? 'bg-green-600 hover:bg-green-700' : ''}
              >
                {getButtonText()}
              </Button>
              {error && <div className="text-red-600 mt-2">{error}</div>}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SettingsPage; 