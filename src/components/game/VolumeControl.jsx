import React from 'react';
import { Volume2, VolumeX, Volume1 } from 'lucide-react';
import { Slider } from '@/components/ui/slider';

export default function VolumeControl({ volume, onVolumeChange, className = "" }) {
  const isMuted = volume === 0;

  const Icon = isMuted ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  return (
    <div className={`flex items-center gap-3 bg-black/40 p-2 rounded-full border border-gray-800 ${className}`}>
      <button 
        onClick={() => onVolumeChange(isMuted ? 0.5 : 0)}
        className="text-cyan-400 hover:text-cyan-300 transition-colors"
      >
        <Icon className="w-4 h-4" />
      </button>
      <Slider
        value={[volume]}
        max={1}
        step={0.05}
        onValueChange={([val]) => onVolumeChange(val)}
        className="w-24"
      />
    </div>
  );
}