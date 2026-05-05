import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { X, Download, Trash2, Circle, Square, Triangle } from 'lucide-react';
import { motion } from 'framer-motion';

export default function VinylEditor({ onSave, onClose, initialDecals = [] }) {
  const canvasRef = useRef(null);
  const [decals, setDecals] = useState(initialDecals);
  const [selectedDecal, setSelectedDecal] = useState(null);
  const [currentTool, setCurrentTool] = useState('circle');
  const [currentColor, setCurrentColor] = useState('#ff0000');

  const tools = [
    { id: 'circle', name: 'Circle', icon: Circle },
    { id: 'square', name: 'Square', icon: Square },
    { id: 'triangle', name: 'Triangle', icon: Triangle }
  ];

  const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#ffffff', '#000000'];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    
    // Clear canvas
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw ship silhouette
    ctx.fillStyle = '#333';
    ctx.beginPath();
    ctx.moveTo(200, 50);
    ctx.lineTo(250, 150);
    ctx.lineTo(150, 150);
    ctx.closePath();
    ctx.fill();

    // Draw decals
    decals.forEach((decal, index) => {
      ctx.fillStyle = decal.color;
      ctx.globalAlpha = selectedDecal === index ? 0.8 : 0.6;
      
      ctx.beginPath();
      switch(decal.type) {
        case 'circle':
          ctx.arc(decal.x, decal.y, decal.size, 0, Math.PI * 2);
          break;
        case 'square':
          ctx.rect(decal.x - decal.size, decal.y - decal.size, decal.size * 2, decal.size * 2);
          break;
        case 'triangle':
          ctx.moveTo(decal.x, decal.y - decal.size);
          ctx.lineTo(decal.x + decal.size, decal.y + decal.size);
          ctx.lineTo(decal.x - decal.size, decal.y + decal.size);
          break;
      }
      ctx.closePath();
      ctx.fill();
      
      ctx.globalAlpha = 1;
    });
  }, [decals, selectedDecal]);

  const handleCanvasClick = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const newDecal = {
      type: currentTool,
      x,
      y,
      size: 15,
      color: currentColor
    };

    setDecals([...decals, newDecal]);
  };

  const handleSave = () => {
    onSave(decals);
    onClose();
  };

  const handleClear = () => {
    setDecals([]);
    setSelectedDecal(null);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-gradient-to-b from-gray-900 to-black border border-cyan-500/30 rounded-3xl p-6 max-w-3xl w-full"
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-black text-white">VINYL EDITOR</h2>
          <Button onClick={onClose} variant="ghost" size="icon">
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2">
            <canvas
              ref={canvasRef}
              width={400}
              height={200}
              onClick={handleCanvasClick}
              className="border border-cyan-500/30 rounded-lg cursor-crosshair w-full"
            />
          </div>

          <div className="space-y-4">
            <Card className="bg-black/40">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Tools</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {tools.map(tool => {
                  const Icon = tool.icon;
                  return (
                    <Button
                      key={tool.id}
                      onClick={() => setCurrentTool(tool.id)}
                      variant={currentTool === tool.id ? 'default' : 'outline'}
                      className="w-full justify-start"
                    >
                      <Icon className="w-4 h-4 mr-2" />
                      {tool.name}
                    </Button>
                  );
                })}
              </CardContent>
            </Card>

            <Card className="bg-black/40">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Colors</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-2">
                  {colors.map(color => (
                    <button
                      key={color}
                      onClick={() => setCurrentColor(color)}
                      className={`w-10 h-10 rounded-lg border-2 ${
                        currentColor === color ? 'border-white' : 'border-gray-600'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <Button onClick={handleClear} variant="outline" className="flex-1">
            <Trash2 className="w-4 h-4 mr-2" />
            Clear
          </Button>
          <Button onClick={handleSave} className="flex-1 bg-cyan-600">
            <Download className="w-4 h-4 mr-2" />
            Save Vinyl
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}