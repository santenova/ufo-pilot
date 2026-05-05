import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Save, Rocket, Trash2, Edit2, Check, X, Lock, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ShipLoadout({ 
  loadouts, 
  maxSlots, 
  currentLoadout, 
  currentCustomization, 
  onSaveLoadout, 
  onLoadLoadout, 
  onDeleteLoadout,
  onTestFlight,
  onPurchaseSlot,
  totalCoins
}) {
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [savingNew, setSavingNew] = useState(false);
  const [newLoadoutName, setNewLoadoutName] = useState('');

  const SLOT_COST = 300;
  const canAffordSlot = totalCoins >= SLOT_COST;

  const handleSave = () => {
    if (newLoadoutName.trim()) {
      onSaveLoadout(newLoadoutName.trim(), currentCustomization);
      setNewLoadoutName('');
      setSavingNew(false);
    }
  };

  const handleRename = (id) => {
    if (editName.trim()) {
      const loadout = loadouts.find(l => l.id === id);
      onSaveLoadout(editName.trim(), loadout.customization, id);
      setEditingId(null);
      setEditName('');
    }
  };

  const getLoadoutPreview = (customization) => {
    const colorVal = customization?.equipped?.colors;
    return {
      model: customization?.equipped?.models || 'basic',
      color: typeof colorVal === 'object' ? 'Custom' : (colorVal || 'cyan'),
      trail: customization?.equipped?.trails || 'none',
      effect: customization?.equipped?.effects || 'standard'
    };
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-black text-white">SHIP LOADOUTS</h3>
          <p className="text-sm text-gray-400">Save and switch between configurations</p>
        </div>
        <div className="text-sm text-gray-400">
          Slots: {loadouts.length}/{maxSlots}
        </div>
      </div>

      {/* Current Loadout */}
      <Card className="bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Rocket className="w-5 h-5 text-cyan-400" />
              <span className="text-white font-bold">Current Configuration</span>
            </div>
            <Button
              onClick={() => onTestFlight(currentCustomization)}
              size="sm"
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Rocket className="w-4 h-4 mr-2" />
              Test Flight
            </Button>
          </div>
          <div className="flex gap-2 text-xs text-gray-300">
            <span>Model: {getLoadoutPreview(currentCustomization).model}</span>
            <span>•</span>
            <span>Color: {getLoadoutPreview(currentCustomization).color}</span>
            <span>•</span>
            <span>Trail: {getLoadoutPreview(currentCustomization).trail}</span>
          </div>
        </CardContent>
      </Card>

      {/* Save New Loadout */}
      {loadouts.length < maxSlots && (
        <AnimatePresence>
          {savingNew ? (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <Card className="bg-black/50 border border-yellow-500/30">
                <CardContent className="p-4">
                  <div className="flex gap-2">
                    <Input
                      value={newLoadoutName}
                      onChange={(e) => setNewLoadoutName(e.target.value)}
                      placeholder="Loadout name..."
                      className="bg-black/30 border-gray-700 text-white"
                      onKeyPress={(e) => e.key === 'Enter' && handleSave()}
                      autoFocus
                    />
                    <Button onClick={handleSave} size="icon" className="bg-green-600 hover:bg-green-700">
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button onClick={() => setSavingNew(false)} size="icon" variant="outline">
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <Button
              onClick={() => setSavingNew(true)}
              className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400"
            >
              <Save className="w-4 h-4 mr-2" />
              Save Current Configuration
            </Button>
          )}
        </AnimatePresence>
      )}

      {/* Saved Loadouts */}
      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
        {loadouts.map((loadout) => {
          const preview = getLoadoutPreview(loadout.customization);
          const isCurrent = currentLoadout === loadout.id;

          return (
            <Card
              key={loadout.id}
              className={`bg-gradient-to-br from-gray-800/50 to-gray-900/50 border transition-all ${
                isCurrent ? 'border-cyan-400 shadow-lg shadow-cyan-400/20' : 'border-gray-700'
              }`}
            >
              <CardContent className="p-3">
                {editingId === loadout.id ? (
                  <div className="flex gap-2 mb-2">
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="bg-black/30 border-gray-700 text-white text-sm"
                      onKeyPress={(e) => e.key === 'Enter' && handleRename(loadout.id)}
                      autoFocus
                    />
                    <Button onClick={() => handleRename(loadout.id)} size="icon" className="h-8 w-8 bg-green-600">
                      <Check className="w-3 h-3" />
                    </Button>
                    <Button onClick={() => setEditingId(null)} size="icon" variant="outline" className="h-8 w-8">
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-bold">{loadout.name}</span>
                      {isCurrent && (
                        <span className="text-xs text-cyan-400 bg-cyan-500/20 px-2 py-0.5 rounded-full">
                          Active
                        </span>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        onClick={() => {
                          setEditingId(loadout.id);
                          setEditName(loadout.name);
                        }}
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                      >
                        <Edit2 className="w-3 h-3" />
                      </Button>
                      <Button
                        onClick={() => onDeleteLoadout(loadout.id)}
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                )}

                <div className="flex gap-2 text-xs text-gray-400 mb-2">
                  <span>🛸 {preview.model}</span>
                  <span>•</span>
                  <span>🎨 {preview.color}</span>
                  <span>•</span>
                  <span>✨ {preview.trail}</span>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => onLoadLoadout(loadout.id)}
                    disabled={isCurrent}
                    size="sm"
                    className={`flex-1 ${isCurrent ? 'bg-gray-700' : 'bg-cyan-600 hover:bg-cyan-700'}`}
                  >
                    <Rocket className="w-3 h-3 mr-2" />
                    {isCurrent ? 'Equipped' : 'Equip'}
                  </Button>
                  <Button
                    onClick={() => onTestFlight(loadout.customization)}
                    size="sm"
                    variant="outline"
                    className="border-purple-500 text-purple-400 hover:bg-purple-500/20"
                  >
                    Test
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Purchase Additional Slot */}
      {loadouts.length >= maxSlots && (
        <Card className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border border-yellow-500/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-white font-bold mb-1">Unlock More Slots</div>
                <div className="text-xs text-gray-400">Save additional loadout configurations</div>
              </div>
              <Button
                onClick={() => onPurchaseSlot()}
                disabled={!canAffordSlot}
                className={`${canAffordSlot ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-gray-700'}`}
              >
                <Plus className="w-4 h-4 mr-2" />
                {SLOT_COST} coins
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}