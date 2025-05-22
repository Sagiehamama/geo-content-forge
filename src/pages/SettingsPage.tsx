import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const tooltipStyle = {
  display: 'inline-block',
  marginLeft: '0.5em',
  color: '#888',
  cursor: 'pointer',
  fontSize: '1em',
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
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPrompt = async () => {
      setLoading(true);
      setError(null);
      setSuccess(false);
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
    setSaving(true);
    setError(null);
    setSuccess(false);
    const { error } = await supabase
      .from('content_templates')
      .update({ system_prompt: systemPrompt, user_prompt: userPrompt, media_agent_prompt: mediaAgentPrompt, updated_at: new Date().toISOString() })
      .eq('id', templateId);
    if (error) {
      setError('Failed to save prompt template.');
    } else {
      setSuccess(true);
    }
    setSaving(false);
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
                disabled={saving}
              />
              <label className="block mb-2 font-medium">
                Content - User Prompt Template
                <span style={tooltipStyle} title="This is the template for the specific task given to the AI for content generation. It typically includes placeholders like '{prompt}' for the user's main topic/keyword, '{language}' for output language, and '{word_count}' for article length. It instructs the AI on structure, sections, and specific elements to include based on user input parameters.">ⓘ</span>
              </label>
              <textarea
                className="w-full min-h-[250px] border rounded-md p-2 mb-6 font-mono text-sm"
                value={userPrompt}
                onChange={e => setUserPrompt(e.target.value)}
                disabled={saving}
              />
              <label className="block mb-2 font-medium">
                Media Agent - Image Search Prompt
                <span style={tooltipStyle} title="This prompt instructs the Media Agent AI. It should analyze the generated article (Markdown) and identify optimal locations for images (1-3 spots), then provide search queries for finding those images. The output should be JSON with location tags and search queries. The location tags will be used to place images in the Markdown content.">ⓘ</span>
              </label>
              <textarea
                className="w-full min-h-[250px] border rounded-md p-2 mb-6 font-mono text-sm"
                value={mediaAgentPrompt}
                onChange={e => setMediaAgentPrompt(e.target.value)}
                disabled={saving}
              />
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save'}
              </Button>
              {success && <div className="text-green-600 mt-2">Prompt updated successfully!</div>}
              {error && <div className="text-red-600 mt-2">{error}</div>}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SettingsPage; 