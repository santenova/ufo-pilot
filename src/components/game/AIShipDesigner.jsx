import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Sparkles, Wand2 } from 'lucide-react';
import { apiClient } from '../../apis/client';
import { toast } from 'sonner';

export default function AIShipDesigner({ onClose, onShipCreated, totalCoins, cost = 1000, onDeductCoins }) {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('input'); // input, generating, complete
  const [generatedShip, setGeneratedShip] = useState(null);
  
  const [inputs, setInputs] = useState({
    name: '',
    style: 'Cyberpunk',
    role: 'Balanced', // Balanced, Interceptor, Tank
    weaponPreference: 'Laser',
    colorScheme: 'Neon'
  });

  const generateShip = async () => {
    if (totalCoins < cost) {
      toast.error(`Not enough coins! Need ${cost} coins.`);
      return;
    }
    
    // Optimistic deduction or wait? 
    // Usually pay before service.
    if (onDeductCoins) {
        onDeductCoins(cost);
    }

    setLoading(true);
    setStep('generating');
    try {
      // 1. Generate Ship Stats & Concept
      const conceptPrompt = `
        Design a unique spaceship for a vertical scrolling shooter.
        User Inputs:
        - Name Idea: ${inputs.name || 'Random'}
        - Style: ${inputs.style}
        - Role: ${inputs.role}
        - Weapon Preference: ${inputs.weaponPreference}
        - Color Scheme: ${inputs.colorScheme}

        Output JSON with:
        - name: Creative ship name
        - description: Short lore description
        - visual_prompt: A highly detailed image generation prompt for a top-down spaceship sprite, black background, ${inputs.style} style.
        - stats: { speed: (1-100), armor: (1-100), firepower: (1-100) }
        - colors: { primary: hex, secondary: hex, accent: hex, aura: rgba }
      `;

      const concept = await apiClient.integrations.Core.InvokeLLM({
        prompt: conceptPrompt,
        response_json_schema: {
          type: "object",
          properties: {
            name: { type: "string" },
            description: { type: "string" },
            visual_prompt: { type: "string" },
            stats: { type: "object", properties: { speed: {type: "number"}, armor: {type: "number"}, firepower: {type: "number"} } },
            colors: { type: "object", properties: { primary: {type: "string"}, secondary: {type: "string"}, accent: {type: "string"}, aura: {type: "string"} } }
          }
        }
      });

      // 2. Generate Image
      const imageRes = await apiClient.integrations.Core.GenerateImage({
        prompt: concept.visual_prompt + ", top down view, spaceship sprite, transparent background if possible or solid black, high quality, digital art"
      });

      setGeneratedShip({
        ...concept,
        imageUrl: imageRes.url
      });
      setStep('complete');
    } catch (e) {
      console.error(e);
      toast.error("AI Generation failed. Try again.");
      setStep('input');
    } finally {
      setLoading(false);
    }
  };

  const saveShip = async () => {
    try {
        if (!generatedShip) return;

        // Save to DB
        await apiClient.entities.Ship.create({
            name: generatedShip.name,
            model_type: `custom_ai_${Date.now()}`,
            image_url: generatedShip.imageUrl,
            stats: generatedShip.stats,
            colors: generatedShip.colors,
            rarity: 'legendary',
            cost: 0,
            is_active: true
        });

        // Callback to equip/unlock locally
        onShipCreated(generatedShip);
        toast.success(`${generatedShip.name} saved to hangar!`);
        onClose();
    } catch (e) {
        console.error(e);
        toast.error("Failed to save ship");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
      <Card className="w-full max-w-2xl bg-gray-900 border-cyan-500/50 shadow-2xl shadow-cyan-900/20">
        <CardHeader className="border-b border-gray-800">
          <CardTitle className="flex items-center gap-2 text-2xl text-cyan-400">
            <Sparkles className="w-6 h-6" />
            AI Ship Architect
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {step === 'input' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm text-gray-400">Ship Name (Optional)</label>
                  <Input 
                    placeholder="e.g. Star Fury" 
                    className="bg-gray-800 border-gray-700 text-white"
                    value={inputs.name}
                    onChange={e => setInputs({...inputs, name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-gray-400">Visual Style</label>
                  <Input 
                    placeholder="e.g. Organic, Cyberpunk, Retro" 
                    className="bg-gray-800 border-gray-700 text-white"
                    value={inputs.style}
                    onChange={e => setInputs({...inputs, style: e.target.value})}
                  />
                </div>
              </div>
              
              <div className="space-y-4">
                <label className="text-sm text-gray-400">Ship Role</label>
                <div className="grid grid-cols-3 gap-2">
                  {['Interceptor', 'Balanced', 'Heavy Tank'].map(role => (
                    <Button
                      key={role}
                      variant={inputs.role === role ? "default" : "outline"}
                      onClick={() => setInputs({...inputs, role})}
                      className={inputs.role === role ? "bg-cyan-600" : "border-gray-700 text-gray-400"}
                    >
                      {role}
                    </Button>
                  ))}
                </div>
              </div>

              <Button 
                onClick={generateShip} 
                className={`w-full py-6 text-lg ${
                  totalCoins < cost 
                    ? "bg-gray-700 cursor-not-allowed" 
                    : "bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500"
                }`}
                disabled={loading || totalCoins < cost}
              >
                {loading ? <Loader2 className="w-6 h-6 animate-spin mr-2" /> : <Wand2 className="w-6 h-6 mr-2" />}
                Generate Blueprint ({cost} Coins)
              </Button>
              {totalCoins < cost && (
                <p className="text-center text-red-400 text-sm mt-2">
                  Not enough coins. You have {totalCoins}.
                </p>
              )}
            </div>
          )}

          {step === 'generating' && (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
              <div className="relative">
                <div className="absolute inset-0 bg-cyan-500 blur-xl opacity-20 animate-pulse"></div>
                <Loader2 className="w-16 h-16 text-cyan-400 animate-spin relative z-10" />
              </div>
              <h3 className="text-xl text-white font-medium">Fabricating Hull...</h3>
              <p className="text-gray-400">AI is generating stats, lore, and visuals.</p>
            </div>
          )}

          {step === 'complete' && generatedShip && (
            <div className="space-y-6">
              <div className="flex gap-6">
                <div className="w-1/2 aspect-square bg-black rounded-lg border border-gray-800 flex items-center justify-center overflow-hidden relative group">
                  <img src={generatedShip.imageUrl} alt={generatedShip.name} className="w-full h-full object-contain" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                    <p className="text-white text-sm">{generatedShip.description}</p>
                  </div>
                </div>
                <div className="w-1/2 space-y-4">
                  <div>
                    <h3 className="text-2xl font-bold text-white">{generatedShip.name}</h3>
                    <p className="text-cyan-400 text-sm">{inputs.role} Class</p>
                  </div>
                  
                  <div className="space-y-3">
                    {Object.entries(generatedShip.stats).map(([stat, val]) => (
                      <div key={stat} className="space-y-1">
                        <div className="flex justify-between text-xs uppercase text-gray-500">
                          <span>{stat}</span>
                          <span>{val}/100</span>
                        </div>
                        <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${val}%` }}
                            className="h-full bg-cyan-500"
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button onClick={saveShip} className="flex-1 bg-green-600 hover:bg-green-500">
                      Accept & Save
                    </Button>
                    <Button onClick={() => setStep('input')} variant="outline" className="flex-1">
                      Discard
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
