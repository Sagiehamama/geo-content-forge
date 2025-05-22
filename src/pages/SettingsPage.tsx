import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const SettingsPage = () => {
  const [prompt, setPrompt] = useState('');
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
        .select('id, system_prompt')
        .eq('is_default', true)
        .maybeSingle();
      if (error) {
        setError('Failed to fetch prompt template.');
      } else if (data) {
        setPrompt(data.system_prompt || '');
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
      .update({ system_prompt: prompt, updated_at: new Date().toISOString() })
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
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>System Prompt Template</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div>Loading...</div>
          ) : (
            <>
              <label className="block mb-2 font-medium">Prompt sent to Content Creator Agent:</label>
              <textarea
                className="w-full min-h-[180px] border rounded-md p-2 mb-4 font-mono"
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
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