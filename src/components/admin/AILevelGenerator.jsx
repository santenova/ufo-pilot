import React, { useState } from 'react';
import { apiClient } from '../../apis/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Wand2, Play, Save } from 'lucide-react';
import { toast } from 'sonner';

export default function AILevelGenerator({ onLevelGenerated }) {
  const [theme, setTheme] = useState('space_battle');
  const [difficulty, setDifficulty] = useState(3);
  const [duration, setDuration] = useState(180);
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const difficultyText = ['Very Easy', 'Easy', 'Medium', 'Hard', 'Expert'][difficulty - 1];
      
      const response = await apiClient.integrations.Core.InvokeLLM({
        prompt: `Generate a game level configuration for a vertical scrolling shooter.
        Theme: ${theme}.
        Difficulty: ${difficultyText}.
        Duration: ${duration} seconds.
        User description: "${prompt}"
        
        The output must be a valid JSON object matching this structure:
        {
          "name": "Level Title",
          "description": "Brief description",
          "duration": ${duration},
          "difficulty": "${difficultyText}",
          "boss_type": "string (one of: xeno_scout, cerebral_drone, void_walker, hive_commander, neural_overmind)",
          "boss_stats": { "health": number, "damage": number },
          "objective": { 
             "type": "string (one of: survive, kills, speedrun, boss)",
             "target": number,
             "description": "string"
          },
          "story_sequence": [
            { "id": "1", "character": "Commander", "text": "Opening line...", "trigger": "start", "timestamp": 0 }
          ],
          "resources": { "credits": number, "energy": number }
        }
        
        Ensure boss_stats are appropriate for the difficulty.
        `,
        response_json_schema: {
          type: "object",
          properties: {
             name: { type: "string" },
             description: { type: "string" },
             duration: { type: "number" },
             difficulty: { type: "string" },
             boss_type: { type: "string" },
             boss_stats: { 
               type: "object",
               properties: { health: { type: "number" }, damage: { type: "number" } }
             },
             objective: {
               type: "object",
               properties: {
                 type: { type: "string" },
                 target: { type: "number" },
                 description: { type: "string" }
               }
             },
             story_sequence: {
               type: "array",
               items: {
                 type: "object",
                 properties: {
                   id: { type: "string" },
                   character: { type: "string" },
                   text: { type: "string" },
                   trigger: { type: "string" },
                   timestamp: { type: "number" }
                 }
               }
             },
             resources: {
               type: "object",
               properties: { credits: { type: "number" }, energy: { type: "number" } }
             }
          },
          required: ["name", "duration", "difficulty", "boss_type", "objective"]
        }
      });

      const levelConfig = response;
      
      // Save it
      await apiClient.entities.LevelConfig.create({
        ...levelConfig,
        level_order: 99, // Default to end of list
        is_active: false // Require manual activation
      });

      toast.success("Level generated successfully!");
      if (onLevelGenerated) onLevelGenerated();

    } catch (error) {
      console.error("Level generation failed:", error);
      toast.error("Failed to generate level");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Card className="bg-gray-900 border-gray-800 text-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wand2 className="w-5 h-5 text-purple-400" />
          AI Level Generator
        </CardTitle>
        <CardDescription>Generate complete levels based on parameters</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm text-gray-400">Theme / Setting</label>
              <Select value={theme} onValueChange={setTheme}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="space_battle">Deep Space Battle</SelectItem>
                  <SelectItem value="asteroid_field">Asteroid Field</SelectItem>
                  <SelectItem value="cyber_city">Cyber City</SelectItem>
                  <SelectItem value="alien_hive">Alien Hive</SelectItem>
                  <SelectItem value="nebula_storm">Nebula Storm</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
               <label className="text-sm text-gray-400">Difficulty (1-5)</label>
               <Slider 
                 value={[difficulty]} 
                 onValueChange={([v]) => setDifficulty(v)} 
                 min={1} max={5} step={1} 
                 className="py-2"
               />
               <div className="flex justify-between text-xs text-gray-500">
                 <span>Very Easy</span>
                 <span>Expert</span>
               </div>
            </div>

            <div className="space-y-2">
               <label className="text-sm text-gray-400">Duration (Seconds)</label>
               <Input 
                 type="number" 
                 value={duration} 
                 onChange={(e) => setDuration(parseInt(e.target.value))}
                 min={60} max={600}
               />
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm text-gray-400">Additional Instructions</label>
              <textarea 
                className="flex min-h-[120px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="e.g. 'A high-speed chase through a canyon with many small fast enemies and a surprise boss at the end'"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
            </div>

            <Button 
              className="w-full bg-purple-600 hover:bg-purple-700" 
              onClick={handleGenerate}
              disabled={generating}
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating Level...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4 mr-2" />
                  Generate Level
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
