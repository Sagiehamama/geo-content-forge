import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Network, BrainCircuit, Layers } from 'lucide-react';

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

  // Test 2: Required placeholder exists (handle both quoted and unquoted)
  if (!template.includes('${prompt}') && !template.includes('"${prompt}"')) {
    return { 
      valid: false, 
      error: 'Missing ${prompt} placeholder - content generation will fail. Please include ${prompt} in your template.' 
    };
  }

  // Test 3: Company conditional syntax check (common error source)
  if ((template.includes('${company') || template.includes('"${company"')) && 
      !template.includes('${company ?') && !template.includes('"${company ?"')) {
    return {
      valid: false,
      error: 'Company variable found but missing conditional syntax. Use: ${company ? "text when company exists" : ""}'
    };
  }

  // Test 4: Template literal syntax works
  try {
    // Remove any quotes around template variables for evaluation
    const cleanTemplate = template
      .replace(/"(\${[^}]+})"/g, '$1')
      .replace(/'(\${[^}]+})'/g, '$1');
      
    const testFunction = new Function(
      'prompt', 
      'company', 
      'includeFrontmatter', 
      'includeImages',
      'wordCount',
      'return `' + cleanTemplate + '`;'
    );
    // Test with mock data
    testFunction('test prompt', 'TestCorp', true, false, 1000);
    testFunction('test prompt', '', false, true, 3000); // Test with empty company
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

// Default research agent prompts if none exist
const DEFAULT_RESEARCH_CLASSIFICATION_PROMPT = `Analyze these Reddit posts for the topic "{{prompt}}" and company "{{company_description}}".

Select up to 3 posts that contain:
- Original insights, pain points, or novel perspectives
- Relevance to the given prompt and company context
- Non-generic content not widely covered elsewhere

Posts to analyze:
{{posts_batch}}

Return as JSON array:
[
  {
    "post_id": "abc123",
    "insight_summary": "Brief summary of the insight",
    "selection_reason": "Why this post was selected",
    "relevance_score": 8.5
  }
]`;

const DEFAULT_RESEARCH_ENRICHMENT_PROMPT = `Analyze this Reddit thread for powerful insights to form a blog post core.

Original prompt: {{original_prompt}}
Company context: {{company_description}}

Reddit thread:
{{full_thread}}

Generate a detailed blog prompt including user insights. Return as JSON:
{
  "enriched_prompt": "The detailed enriched prompt text",
  "key_insights": ["insight1", "insight2"],
  "user_language": ["term1", "term2"],
  "sentiment": "frustrated/excited/concerned/etc",
  "confidence_score": 8.5
}`;

const DEFAULT_RESEARCH_SUBREDDIT_DISCOVERY_PROMPT = `Given the following topic and company, which active subreddits are most relevant for finding original perspectives?

Topic: {{prompt}}
Company: {{company_description}}

Return top 10 subreddits with:
- Relevance score (1-10)
- Recent activity level
- Primary discussion themes
- Expected insight quality

Format as JSON array with this structure:
[
  {
    "name": "subreddit_name",
    "relevance_score": 8,
    "activity_level": "high",
    "themes": ["theme1", "theme2"],
    "expected_quality": "high"
  }
]`;

const DEFAULT_RESEARCH_SUBREDDIT_DISCOVERY_SYSTEM = `You are a Reddit research expert. Your job is to identify the most relevant subreddits for finding original insights on a given topic. Always respond with valid JSON only.`;

const DEFAULT_RESEARCH_CLASSIFICATION_SYSTEM = `You are an expert at analyzing Reddit posts to identify valuable insights for content creation. Always respond with valid JSON only.`;

const DEFAULT_RESEARCH_ENRICHMENT_SYSTEM = `You are an expert content strategist who enriches content prompts with authentic user insights. Always respond with valid JSON only.`;

// Default media agent prompt if none exists
const DEFAULT_MEDIA_AGENT_PROMPT = `You are a specialized Media Selection Agent for a content creation platform. Your task is to analyze Markdown content and identify 1-3 optimal spots where images would enhance the article.

INSTRUCTIONS:
1. Analyze the provided Markdown article thoroughly
2. Identify 1-3 strategic locations where images would enhance reader engagement and understanding
3. For each location, create a descriptive tag (e.g., "after_introduction", "smartphone_comparison", "budget_phones")
4. Generate a SIMPLE, DIRECT search query (1-3 words max) that would find highly relevant images
5. Return your analysis as a properly formatted JSON array

FORMAT YOUR RESPONSE AS JSON:
[
  {
    "location_tag": "descriptive_tag_for_location", 
    "search_query": "simple search term"
  }
]

GUIDELINES FOR GOOD LOCATIONS:
- Article introduction (create visual interest)
- Between major sections (break up text)
- To illustrate main topics or concepts
- For key product mentions or comparisons
- For emotional impact at critical points

CRITICAL GUIDELINES FOR SEARCH QUERIES:
- Use ONLY 1-3 simple, direct words (e.g., "smartphone", "budget phone", "mobile device")
- DO NOT use style terms like "professional photo", "infographic", or "illustration"
- DO NOT use complex phrases or sentences
- Focus on the main subject/object being discussed
- Examples: "smartphone" NOT "professional smartphone photography"
- Examples: "pizza" NOT "delicious pizza on wooden board"
- Examples: "mountains" NOT "scenic mountain landscape photography"

TOPIC-SPECIFIC EXAMPLES:
- For smartphone articles: "smartphone", "mobile phone", "phone comparison"
- For food articles: "pizza", "vegan food", "restaurant"
- For travel articles: "mountains", "beach", "city"
- For tech articles: "laptop", "computer", "technology"

Always return valid, properly formatted JSON with simple search queries. Complex queries will fail to find relevant images.`;

// Agent configuration matching XRAY page
const agentConfig = {
  research_agent: {
    icon: Network,
    label: 'Research Agent',
    description: 'Reddit insights & subreddit discovery',
    color: 'bg-blue-500',
    model: 'GPT-4o-mini'
  },
  content_generator: {
    icon: BrainCircuit,
    label: 'Content Generator', 
    description: 'AI-powered content creation',
    color: 'bg-green-500',
    model: 'GPT-4o'
  },
  media_agent: {
    icon: Layers,
    label: 'Media Agent',
    description: 'Image suggestions & placement',
    color: 'bg-purple-500',
    model: 'GPT-4'
  }
} as const;

// Agent Tab Component
const AgentTab: React.FC<{
  agentKey: keyof typeof agentConfig;
  children: React.ReactNode;
}> = ({ agentKey, children }) => {
  const config = agentConfig[agentKey];
  const Icon = config.icon;
  
  return (
    <div className="space-y-6">
      {/* Agent Header */}
      <div className="flex items-center gap-3 p-4 border rounded-lg bg-muted/50">
        <div className={`p-2 rounded-lg ${config.color} text-white`}>
          <Icon size={20} />
        </div>
        <div>
          <h3 className="font-semibold text-lg">{config.label}</h3>
          <p className="text-sm text-muted-foreground">{config.description} • {config.model}</p>
        </div>
      </div>
      
      {/* Agent Prompts */}
      <div className="space-y-6">
        {children}
      </div>
    </div>
  );
};

const SettingsPage = () => {
  const [systemPrompt, setSystemPrompt] = useState('');
  const [userPrompt, setUserPrompt] = useState('');
  const [mediaAgentPrompt, setMediaAgentPrompt] = useState('');
  // Research Agent prompts
  const [researchClassificationPrompt, setResearchClassificationPrompt] = useState('');
  const [researchEnrichmentPrompt, setResearchEnrichmentPrompt] = useState('');
  const [researchSubredditDiscoveryPrompt, setResearchSubredditDiscoveryPrompt] = useState('');
  const [researchSubredditDiscoverySystemPrompt, setResearchSubredditDiscoverySystemPrompt] = useState('');
  const [researchClassificationSystemPrompt, setResearchClassificationSystemPrompt] = useState('');
  const [researchEnrichmentSystemPrompt, setResearchEnrichmentSystemPrompt] = useState('');
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [buttonState, setButtonState] = useState<'save' | 'validating' | 'saved'>('save');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPrompt = async () => {
      setLoading(true);
      setError(null);
      
      // Fetch main content template and other templates
      const [mainTemplateResult, otherTemplatesResult] = await Promise.all([
        // Get the default content template (same logic as Content Generator)
        supabase
          .from('content_templates')
          .select('*')
          .eq('is_default', true)
          .single(),
        // Get other named templates
        supabase
          .from('content_templates')
          .select('*')
          .in('name', [
            'research_insight_classification',
            'research_prompt_enrichment',
            'research_subreddit_discovery',
            'research_subreddit_discovery_system',
            'research_classification_system',
            'research_enrichment_system',
            'media_agent_prompt'
          ])
      ]);
      
      const error = mainTemplateResult.error || otherTemplatesResult.error;
      const data = otherTemplatesResult.data || [];
      const mainTemplate = mainTemplateResult.data;
        
      if (error) {
        setError('Failed to fetch prompt template.');
      } else if (mainTemplate && data) {
        // Use the default template (same as Content Generator)
        setSystemPrompt(mainTemplate.system_prompt || '');
        setUserPrompt(mainTemplate.user_prompt || '');
        setTemplateId(mainTemplate.id);
        
        // Set other templates
        setMediaAgentPrompt(data.find(item => item.name === 'media_agent_prompt')?.media_agent_prompt || DEFAULT_MEDIA_AGENT_PROMPT);
        setResearchClassificationPrompt(data.find(item => item.name === 'research_insight_classification')?.user_prompt || DEFAULT_RESEARCH_CLASSIFICATION_PROMPT);
        setResearchEnrichmentPrompt(data.find(item => item.name === 'research_prompt_enrichment')?.user_prompt || DEFAULT_RESEARCH_ENRICHMENT_PROMPT);
        setResearchSubredditDiscoveryPrompt(data.find(item => item.name === 'research_subreddit_discovery')?.user_prompt || DEFAULT_RESEARCH_SUBREDDIT_DISCOVERY_PROMPT);
        setResearchSubredditDiscoverySystemPrompt(data.find(item => item.name === 'research_subreddit_discovery_system')?.system_prompt || DEFAULT_RESEARCH_SUBREDDIT_DISCOVERY_SYSTEM);
        setResearchClassificationSystemPrompt(data.find(item => item.name === 'research_classification_system')?.system_prompt || DEFAULT_RESEARCH_CLASSIFICATION_SYSTEM);
        setResearchEnrichmentSystemPrompt(data.find(item => item.name === 'research_enrichment_system')?.system_prompt || DEFAULT_RESEARCH_ENRICHMENT_SYSTEM);
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
    const { error: mainError } = await supabase
      .from('content_templates')
      .update({ 
        system_prompt: systemPrompt, 
        user_prompt: userPrompt, 
        media_agent_prompt: mediaAgentPrompt, 
        updated_at: new Date().toISOString() 
      })
      .eq('id', templateId);

    // Save research agent templates
    const researchUpdates = [
      {
        name: 'research_insight_classification',
        user_prompt: researchClassificationPrompt
      },
      {
        name: 'research_prompt_enrichment', 
        user_prompt: researchEnrichmentPrompt
      },
      {
        name: 'research_subreddit_discovery',
        user_prompt: researchSubredditDiscoveryPrompt
      }
    ];

    // Save research agent system prompts
    const systemPromptUpdates = [
      {
        name: 'research_subreddit_discovery_system',
        system_prompt: researchSubredditDiscoverySystemPrompt
      },
      {
        name: 'research_classification_system',
        system_prompt: researchClassificationSystemPrompt
      },
      {
        name: 'research_enrichment_system',
        system_prompt: researchEnrichmentSystemPrompt
      }
    ];

    // Update each research template individually
    const researchErrors = [];
    for (const update of researchUpdates) {
      const { error } = await supabase
        .from('content_templates')
        .update({
          user_prompt: update.user_prompt,
          updated_at: new Date().toISOString()
        })
        .eq('name', update.name);
      
      if (error) researchErrors.push(error);
    }

    // Update each system prompt template individually
    for (const update of systemPromptUpdates) {
      const { error } = await supabase
        .from('content_templates')
        .update({
          system_prompt: update.system_prompt,
          updated_at: new Date().toISOString()
        })
        .eq('name', update.name);
      
      if (error) researchErrors.push(error);
    }

    if (mainError || researchErrors.length > 0) {
      const errors = [mainError, ...researchErrors].filter(Boolean);
      console.error('Save errors:', errors);
      toast.error('Failed to save prompt templates.');
      setButtonState('save');
    } else {
      toast.success('Settings saved successfully!');
      // Success: show "Saved" for 2 seconds
      setButtonState('saved');
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
          <CardTitle>Agent Prompt Templates</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div>Loading...</div>
          ) : (
            <div className="space-y-0">
              <Tabs defaultValue="research_agent" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  {Object.entries(agentConfig).map(([key, config]) => {
                    const Icon = config.icon;
                    return (
                      <TabsTrigger 
                        key={key} 
                        value={key}
                        className="flex items-center gap-2"
                      >
                        <Icon size={16} />
                        <span className="hidden sm:inline">{config.label}</span>
                        <span className="sm:hidden">{config.label.split(' ')[0]}</span>
                      </TabsTrigger>
                    );
                  })}
                </TabsList>
                
                <TabsContent value="research_agent" className="mt-6">
                  <AgentTab agentKey="research_agent">
                    <div className="space-y-8">
                      {/* Subreddit Discovery */}
                      <div className="border rounded-lg p-4 space-y-4">
                        <h4 className="font-semibold text-blue-600">🔍 Subreddit Discovery</h4>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          <div>
                            <label className="block mb-2 font-medium text-sm">
                              System Prompt
                              <span style={tooltipStyle} title="Defines the AI's role and behavior for subreddit discovery">ⓘ</span>
                            </label>
                            <textarea
                              className="w-full min-h-[200px] border rounded-md p-2 font-mono text-xs"
                              value={researchSubredditDiscoverySystemPrompt}
                              onChange={e => setResearchSubredditDiscoverySystemPrompt(e.target.value)}
                              disabled={buttonState === 'validating'}
                              placeholder="System prompt for subreddit discovery..."
                            />
                          </div>
                          <div>
                            <label className="block mb-2 font-medium text-sm">
                              User Prompt Template
                              <span style={tooltipStyle} title="Uses GPT-4o-mini to identify relevant subreddits. Placeholders: {{prompt}}, {{company_description}}">ⓘ</span>
                            </label>
                            <textarea
                              className="w-full min-h-[200px] border rounded-md p-2 font-mono text-xs"
                              value={researchSubredditDiscoveryPrompt}
                              onChange={e => setResearchSubredditDiscoveryPrompt(e.target.value)}
                              disabled={buttonState === 'validating'}
                              placeholder="User prompt template for subreddit discovery..."
                            />
                          </div>
                        </div>
                      </div>

                      {/* Post Classification */}
                      <div className="border rounded-lg p-4 space-y-4">
                        <h4 className="font-semibold text-blue-600">📋 Post Classification</h4>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          <div>
                            <label className="block mb-2 font-medium text-sm">
                              System Prompt
                              <span style={tooltipStyle} title="Defines the AI's role for analyzing and classifying Reddit posts">ⓘ</span>
                            </label>
                            <textarea
                              className="w-full min-h-[200px] border rounded-md p-2 font-mono text-xs"
                              value={researchClassificationSystemPrompt}
                              onChange={e => setResearchClassificationSystemPrompt(e.target.value)}
                              disabled={buttonState === 'validating'}
                              placeholder="System prompt for post classification..."
                            />
                          </div>
                          <div>
                            <label className="block mb-2 font-medium text-sm">
                              User Prompt Template
                              <span style={tooltipStyle} title="Analyzes Reddit posts and selects relevant ones. Placeholders: {{prompt}}, {{company_description}}, {{posts_batch}}">ⓘ</span>
                            </label>
                            <textarea
                              className="w-full min-h-[200px] border rounded-md p-2 font-mono text-xs"
                              value={researchClassificationPrompt}
                              onChange={e => setResearchClassificationPrompt(e.target.value)}
                              disabled={buttonState === 'validating'}
                              placeholder="User prompt template for post classification..."
                            />
                          </div>
                        </div>
                      </div>

                      {/* Prompt Enrichment */}
                      <div className="border rounded-lg p-4 space-y-4">
                        <h4 className="font-semibold text-blue-600">✨ Prompt Enrichment</h4>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          <div>
                            <label className="block mb-2 font-medium text-sm">
                              System Prompt
                              <span style={tooltipStyle} title="Defines the AI's role for enriching prompts with Reddit insights">ⓘ</span>
                            </label>
                            <textarea
                              className="w-full min-h-[200px] border rounded-md p-2 font-mono text-xs"
                              value={researchEnrichmentSystemPrompt}
                              onChange={e => setResearchEnrichmentSystemPrompt(e.target.value)}
                              disabled={buttonState === 'validating'}
                              placeholder="System prompt for prompt enrichment..."
                            />
                          </div>
                          <div>
                            <label className="block mb-2 font-medium text-sm">
                              User Prompt Template
                              <span style={tooltipStyle} title="Enriches prompts with thread insights. Placeholders: {{original_prompt}}, {{company_description}}, {{full_thread}}">ⓘ</span>
                            </label>
                            <textarea
                              className="w-full min-h-[200px] border rounded-md p-2 font-mono text-xs"
                              value={researchEnrichmentPrompt}
                              onChange={e => setResearchEnrichmentPrompt(e.target.value)}
                              disabled={buttonState === 'validating'}
                              placeholder="User prompt template for prompt enrichment..."
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </AgentTab>
                </TabsContent>
                
                <TabsContent value="content_generator" className="mt-6">
                  <AgentTab agentKey="content_generator">
                    <div className="space-y-6">
                      <div>
              <label className="block mb-2 font-medium">
                          System Prompt
                          <span style={tooltipStyle} title="Sets the AI's core persona, context, rules, and overarching instructions for generating the main article content. Define the AI's character, expertise, and any specific output formats or constraints it should always follow.">ⓘ</span>
              </label>
              <textarea
                          className="w-full min-h-[250px] border rounded-md p-2 font-mono text-sm"
                value={systemPrompt}
                onChange={e => setSystemPrompt(e.target.value)}
                disabled={buttonState === 'validating'}
              />
                      </div>
                      <div>
              <label className="block mb-2 font-medium">
                          User Prompt Template
                          <span style={tooltipStyle} title="Template for the specific task given to the AI for content generation. Includes placeholders like '${prompt}' for the user's main topic, '${company}' for company context, and conditional statements for content options.">ⓘ</span>
              </label>
              <textarea
                          className="w-full min-h-[250px] border rounded-md p-2 font-mono text-sm"
                value={userPrompt}
                onChange={e => setUserPrompt(e.target.value)}
                disabled={buttonState === 'validating'}
              />
                      </div>
                    </div>
                  </AgentTab>
                </TabsContent>
                
                <TabsContent value="media_agent" className="mt-6">
                  <AgentTab agentKey="media_agent">
                    <div>
              <label className="block mb-2 font-medium">
                        Image Search Prompt
                        <span style={tooltipStyle} title="Instructs the Media Agent to analyze generated articles and identify optimal locations for images (1-3 spots), then provide search queries for finding those images. Output should be JSON with location tags and search queries.">ⓘ</span>
              </label>
              <textarea
                        className="w-full min-h-[250px] border rounded-md p-2 font-mono text-sm"
                value={mediaAgentPrompt}
                onChange={e => setMediaAgentPrompt(e.target.value)}
                disabled={buttonState === 'validating'}
              />
                    </div>
                  </AgentTab>
                </TabsContent>
              </Tabs>

              {/* Save Button */}
              <div className="pt-6">
              <Button 
                onClick={handleSave} 
                disabled={buttonState === 'validating'}
                  className={`w-full ${buttonState === 'saved' ? 'bg-green-600 hover:bg-green-700' : ''}`}
              >
                {getButtonText()}
              </Button>
              {error && <div className="text-red-600 mt-2">{error}</div>}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SettingsPage; 