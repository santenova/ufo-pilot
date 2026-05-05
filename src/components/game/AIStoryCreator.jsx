import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, BookOpen, Scroll } from 'lucide-react';
import { apiClient } from '../../apis/client';
import { toast } from 'sonner';

export default function AIStoryCreator({ onClose, onStoryCreated }) {
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState('');
  const [difficulty, setDifficulty] = useState('Normal');

  const generateStory = async () => {
    if (!theme) return toast.error("Please enter a theme");
    
    setLoading(true);
    try {
      const prompt = `
        Create a 5-level campaign story for a space shooter game.
        Theme: ${theme}
        Difficulty: ${difficulty}

        Output JSON format:
        {
          "title": "Campaign Title",
          "description": "Campaign overview",
          "levels": [
            { "id": 1, "title": "Level Name", "briefing": "Mission briefing text", "boss_name": "Boss Name" }
            ... (5 levels)
          ]
        }
      `;

      const story = await apiClient.integrations.Core.InvokeLLM({
        prompt: prompt,
        response_json_schema: {
          type: "object",
          properties: {
            title: { type: "string" },
            description: { type: "string" },
            levels: { 
              type: "array", 
              items: {
                type: "object",
                properties: {
                  id: { type: "number" },
                  title: { type: "string" },
                  briefing: { type: "string" },
                  boss_name: { type: "string" }
                }
              }
            }
          }
        }
      });

      // Save as a pseudo-story object
      const storyId = `custom_${Date.now()}`;
      const newStory = {
        id: storyId,
        ...story,
        isCustom: true,
        generatedAt: new Date().toISOString()
      };
      
      onStoryCreated(newStory);
      onClose();
      toast.success("Campaign Generated!");

    } catch (e) {
      console.error(e);
      toast.error("Story generation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
      <Card className="w-full max-w-lg bg-gray-900 border-purple-500/50 shadow-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl text-purple-400">
            <BookOpen className="w-6 h-6" />
            AI Story Generator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm text-gray-400">Campaign Theme</label>
            <Input 
              placeholder="e.g. Rise of the Machines, Cosmic Horror, Retro Arcade" 
              className="bg-gray-800 border-gray-700 text-white"
              value={theme}
              onChange={e => setTheme(e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm text-gray-400">Difficulty Setting</label>
            <div className="flex gap-2">
              {['Easy', 'Normal', 'Hardcore'].map(d => (
                <Button
                  key={d}
                  variant={difficulty === d ? 'default' : 'outline'}
                  onClick={() => setDifficulty(d)}
                  className={difficulty === d ? 'bg-purple-600' : 'border-gray-700'}
                >
                  {d}
                </Button>
              ))}
            </div>
          </div>

          <Button 
            onClick={generateStory} 
            className="w-full bg-purple-600 hover:bg-purple-500 py-6"
            disabled={loading}
          >
            {loading ? <Loader2 className="animate-spin mr-2" /> : <Scroll className="mr-2" />}
            Generate Campaign
          </Button>
          
          <Button variant="ghost" className="w-full" onClick={onClose}>Cancel</Button>
        </CardContent>
      </Card>
    </div>
  );
}
