import React, { useState } from 'react';
import { apiClient } from '../../apis/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Wand2, Save, Trash2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

export default function AIAssetCreator({ onAssetCreated }) {
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [assetType, setAssetType] = useState('item'); // 'item'
  const [generatedAsset, setGeneratedAsset] = useState(null);
  const [generatedImage, setGeneratedImage] = useState(null);

  const handleGenerate = async () => {
    if (!prompt) return;
    setGenerating(true);
    setGeneratedAsset(null);
    setGeneratedImage(null);

    try {
      // 1. Generate Asset Data
      const schema = {
        type: "object",
        properties: {
          name: { type: "string" },
          description: { type: "string" },
          type: { type: "string", enum: ["weapon", "powerup", "currency"] },
          rarity: { type: "string", enum: ["common", "rare", "epic", "legendary"] },
          effect_config: {
            type: "object",
            properties: {
              value: { type: "number" },
              duration: { type: "number" },
              effectType: { type: "string" }
            }
          },
          visual_style: { type: "string", description: "Detailed visual description for image generation" }
        },
        required: ["name", "type", "rarity", "visual_style"]
      };

      const dataRes = await apiClient.integrations.Core.InvokeLLM({
        prompt: `Create a game ${assetType} based on this description: "${prompt}". Return JSON matching the schema.`,
        response_json_schema: schema
      });

      const assetData = dataRes;
      setGeneratedAsset(assetData);

      // 2. Generate Image
      const imageRes = await apiClient.integrations.Core.GenerateImage({
        prompt: `Game sprite icon for a sci-fi space shooter, ${assetType}: ${assetData.visual_style}. Transparent background, digital art, high quality, neon style.`,
      });

      setGeneratedImage(imageRes.url);

    } catch (error) {
      console.error("Generation failed:", error);
      toast.error("Failed to generate asset");
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!generatedAsset || !generatedImage) return;

    try {
      await apiClient.entities.CustomItem.create({
        ...generatedAsset,
        image_url: generatedImage,
        visual_prompt: generatedAsset.visual_style
      });
      toast.success(`${assetType} saved successfully!`);
      if (onAssetCreated) onAssetCreated();
      setGeneratedAsset(null);
      setGeneratedImage(null);
      setPrompt('');
    } catch (error) {
      console.error("Save failed:", error);
      toast.error("Failed to save asset");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-4">
        <Select value={assetType} onValueChange={setAssetType}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Asset Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="item">Item</SelectItem>
          </SelectContent>
        </Select>
        <Input 
          placeholder={`Describe your ${assetType}... (e.g., "A fast crystallized drone that shoots ice shards")`}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
        />
        <Button onClick={handleGenerate} disabled={generating || !prompt}>
          {generating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Wand2 className="w-4 h-4 mr-2" />}
          Generate
        </Button>
      </div>

      {generatedAsset && (
        <Card className="bg-gray-900 border-gray-800 text-white">
          <CardHeader>
            <CardTitle>{generatedAsset.name}</CardTitle>
            <CardDescription>{generatedAsset.description}</CardDescription>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="aspect-square bg-black/50 rounded-lg flex items-center justify-center border border-gray-700 overflow-hidden relative">
                {generatedImage ? (
                  <img src={generatedImage} alt={generatedAsset.name} className="w-full h-full object-contain p-4" />
                ) : (
                  <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
                )}
              </div>
            </div>
            <div className="space-y-4">
              <div className="p-4 bg-black/30 rounded-lg space-y-2">
                <h3 className="font-semibold text-cyan-400">Stats & Config</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>Type: <span className="text-white">{generatedAsset.type}</span></div>
                  <div>Rarity: <span className="text-white">{generatedAsset.rarity}</span></div>
                  <div className="col-span-2">
                    Effect: <span className="text-white">{JSON.stringify(generatedAsset.effect_config)}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button className="flex-1 bg-green-600 hover:bg-green-700" onClick={handleSave} disabled={!generatedImage}>
                  <Save className="w-4 h-4 mr-2" />
                  Save Asset
                </Button>
                <Button variant="outline" className="flex-1" onClick={handleGenerate}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Regenerate
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
