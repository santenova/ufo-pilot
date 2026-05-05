import React, { useState, useEffect } from 'react';
import { apiClient } from '../apis/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { 
  Plus, Save, Trash2, MoveUp, MoveDown, Clock, 
  Sword, Target, Coins, MessageSquare, Play, 
  LayoutGrid, List, Search, Eye, AlertTriangle, User, Wand2
} from 'lucide-react';
import AILevelGenerator from '@/components/admin/AILevelGenerator';

const BOSS_TYPES = [
  { id: 'xeno_scout', name: 'Xeno Scout (Lvl 1)', hp: 3000, dmg: 50 },
  { id: 'cerebral_drone', name: 'Cerebral Drone (Lvl 2)', hp: 4000, dmg: 60 },
  { id: 'void_walker', name: 'Void Walker (Lvl 3)', hp: 5000, dmg: 70 },
  { id: 'hive_commander', name: 'Hive Commander (Lvl 4)', hp: 6000, dmg: 80 },
  { id: 'neural_overmind', name: 'Neural Overmind (Lvl 5)', hp: 7000, dmg: 90 },
  { id: 'cyber_lich', name: 'Cyber Lich (Lvl 6)', hp: 8000, dmg: 100 },
  { id: 'solar_guardian', name: 'Solar Guardian (Lvl 7)', hp: 9000, dmg: 110 },
  { id: 'nebula_stalker', name: 'Nebula Stalker (Lvl 8)', hp: 10000, dmg: 120 },
  { id: 'quantum_brain', name: 'Quantum Brain (Lvl 9)', hp: 11000, dmg: 130 },
  { id: 'the_omniscient', name: 'The Omniscient (Lvl 10)', hp: 15000, dmg: 150 },
  // Legacy
  { id: 'mothership', name: 'Mothership (Legacy)', hp: 5000, dmg: 100 },
  { id: 'dreadnought', name: 'Dreadnought (Legacy)', hp: 8000, dmg: 150 },
];

const OBJECTIVE_TYPES = [
  { id: 'survive', name: 'Survive Time' },
  { id: 'kills', name: 'Eliminate Enemies' },
  { id: 'boss', name: 'Defeat Boss' },
  { id: 'escort', name: 'Escort Payload' },
  { id: 'collect', name: 'Collect Resources' },
];

const PREVIEW_ASSETS = {
  enemies: [
    { id: 'scout', name: 'Scout', type: 'Air', hp: 50, icon: '🛸' },
    { id: 'fighter', name: 'Fighter', type: 'Air', hp: 120, icon: '✈️' },
    { id: 'bomber', name: 'Bomber', type: 'Air', hp: 250, icon: '💣' },
    { id: 'tank', name: 'Hover Tank', type: 'Ground', hp: 400, icon: '🚜' },
    { id: 'turret', name: 'Laser Turret', type: 'Ground', hp: 300, icon: '🔫' },
  ],
  items: [
    { id: 'health', name: 'Health Pack', type: 'Pickup', effect: 'Heal 50%', icon: '❤️' },
    { id: 'shield', name: 'Shield Boost', type: 'Pickup', effect: '+100 Shield', icon: '🛡️' },
    { id: 'damage', name: 'Damage Amp', type: 'Powerup', effect: '2x Dmg (10s)', icon: '⚡' },
    { id: 'nuke', name: 'Nuke', type: 'Powerup', effect: 'Clear Screen', icon: '☢️' },
  ]
};

export default function AdminStory() {
  const { toast } = useToast();
  const [levels, setLevels] = useState([]);
  const [selectedLevelId, setSelectedLevelId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('config');
  const [selectedEventId, setSelectedEventId] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    duration: 300,
    difficulty: 'Medium',
    boss_type: '',
    boss_stats: { health: 1000, damage: 50 },
    objective: { type: 'survive', target: 120, description: '' },
    resources: { credits: 0, energy: 0 },
    story_sequence: [],
    thumbnail_url: '',
    is_active: true
  });

  useEffect(() => {
    fetchLevels();
  }, []);

  useEffect(() => {
    if (selectedLevelId) {
      const level = levels.find(l => l.id === selectedLevelId);
      if (level) {
        setFormData({
          name: level.name || '',
          description: level.description || '',
          duration: level.duration || 300,
          difficulty: level.difficulty || 'Medium',
          boss_type: level.boss_type || '',
          boss_stats: level.boss_stats || { health: 1000, damage: 50 },
          objective: level.objective || { type: 'survive', target: 120, description: '' },
          resources: level.resources || { credits: 0, energy: 0 },
          story_sequence: level.story_sequence || [],
          thumbnail_url: level.thumbnail_url || '',
          is_active: level.is_active !== false
        });
      }
    }
  }, [selectedLevelId, levels]);

  const fetchLevels = async () => {
    try {
      setLoading(true);
      const res = await apiClient.entities.LevelConfig.list('level_order', 100);
      setLevels(res.items || res || []);
      if (res.items?.length > 0 && !selectedLevelId) {
        setSelectedLevelId(res.items[0].id);
      } else if (res.length > 0 && !selectedLevelId) {
        setSelectedLevelId(res[0].id);
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to fetch levels', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLevel = async () => {
    try {
      const newOrder = levels.length > 0 ? Math.max(...levels.map(l => l.level_order || 0)) + 1 : 1;
      const newLevel = await apiClient.entities.LevelConfig.create({
        name: `New Level ${newOrder}`,
        level_order: newOrder,
        description: 'New level description',
        duration: 300,
        difficulty: 'Medium',
        story_sequence: [],
        objective: { type: 'survive', target: 120, description: 'Survive' }
      });
      setLevels([...levels, newLevel]);
      setSelectedLevelId(newLevel.id);
      toast({ title: 'Success', description: 'Level created successfully' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to create level', variant: 'destructive' });
    }
  };

  const handleSave = async () => {
    if (!selectedLevelId) return;
    try {
      await apiClient.entities.LevelConfig.update(selectedLevelId, formData);
      setLevels(prev => prev.map(l => l.id === selectedLevelId ? { ...l, ...formData } : l));
      toast({ title: 'Saved', description: 'Level configuration saved' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to save level', variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    if (!selectedLevelId || !confirm('Are you sure you want to delete this level?')) return;
    try {
      await apiClient.entities.LevelConfig.delete(selectedLevelId);
      const newLevels = levels.filter(l => l.id !== selectedLevelId);
      setLevels(newLevels);
      setSelectedLevelId(newLevels.length > 0 ? newLevels[0].id : null);
      toast({ title: 'Deleted', description: 'Level deleted successfully' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete level', variant: 'destructive' });
    }
  };

  const handleMoveOrder = async (direction) => {
    const currentIndex = levels.findIndex(l => l.id === selectedLevelId);
    if (currentIndex === -1) return;
    
    const newIndex = currentIndex + direction;
    if (newIndex < 0 || newIndex >= levels.length) return;

    const levelA = levels[currentIndex];
    const levelB = levels[newIndex];

    // Swap orders locally
    const newLevels = [...levels];
    newLevels[currentIndex] = { ...levelB, level_order: levelA.level_order };
    newLevels[newIndex] = { ...levelA, level_order: levelB.level_order };
    
    // Sort by order
    newLevels.sort((a, b) => a.level_order - b.level_order);
    setLevels(newLevels);

    // Save changes
    try {
      await Promise.all([
        apiClient.entities.LevelConfig.update(levelA.id, { level_order: levelB.level_order }),
        apiClient.entities.LevelConfig.update(levelB.id, { level_order: levelA.level_order })
      ]);
    } catch (e) {
      console.error("Failed to update order", e);
    }
  };

  // Story Sequence Helpers
  const addStoryEvent = () => {
    const newEvent = {
      id: Date.now().toString(),
      character: 'Commander',
      text: '',
      trigger: 'time',
      timestamp: 0
    };
    setFormData(prev => ({
      ...prev,
      story_sequence: [...prev.story_sequence, newEvent]
    }));
    setSelectedEventId(newEvent.id);
  };

  const updateStoryEvent = (id, field, value) => {
    const newSequence = formData.story_sequence.map(event => 
      event.id === id ? { ...event, [field]: value } : event
    );
    setFormData(prev => ({ ...prev, story_sequence: newSequence }));
  };

  const deleteStoryEvent = (id) => {
    const newSequence = formData.story_sequence.filter(e => e.id !== id);
    setFormData(prev => ({ ...prev, story_sequence: newSequence }));
    if (selectedEventId === id) setSelectedEventId(null);
  };

  const getSortedEvents = () => {
    return [...formData.story_sequence].sort((a, b) => {
      // Sort priority: Start > Time (sorted) > Boss > End
      const getPriority = (t) => {
        if (t === 'start') return 0;
        if (t === 'time') return 1;
        if (t === 'boss') return 2;
        if (t === 'end') return 3;
        return 4;
      };
      
      const pA = getPriority(a.trigger);
      const pB = getPriority(b.trigger);
      
      if (pA !== pB) return pA - pB;
      if (a.trigger === 'time') return a.timestamp - b.timestamp;
      return 0;
    });
  };

  if (loading && levels.length === 0) {
    return <div className="p-8 text-center text-white">Loading Editor...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center border-b border-gray-800 pb-6">
          <div>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-600">
              Admin Story Editor
            </h1>
            <p className="text-gray-400">Manage campaign levels, story, and assets</p>
          </div>
          <div className="flex gap-4">
            <Button variant="outline" onClick={() => window.open('/game?mode=campaign', '_blank')}>
              <Play className="w-4 h-4 mr-2" /> Test Campaign
            </Button>
            <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700">
              <Save className="w-4 h-4 mr-2" /> Save Changes
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-6 h-[800px]">
          {/* Sidebar - Level List */}
          <Card className="col-span-3 bg-gray-900/50 border-gray-800 flex flex-col h-full">
            <CardHeader className="pb-4">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg">Levels ({levels.length})</CardTitle>
                <Button size="sm" onClick={handleCreateLevel}><Plus className="w-4 h-4" /></Button>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden p-0">
              <ScrollArea className="h-full px-4">
                <div className="space-y-2">
                  {levels.map((level) => (
                    <div 
                      key={level.id}
                      onClick={() => setSelectedLevelId(level.id)}
                      className={`p-3 rounded-lg cursor-pointer transition-colors flex justify-between items-center group ${
                        selectedLevelId === level.id 
                          ? 'bg-cyan-900/30 border border-cyan-500/50' 
                          : 'hover:bg-gray-800 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-800 flex items-center justify-center text-xs font-bold text-gray-400">
                          {level.level_order}
                        </div>
                        <div className="truncate">
                          <div className="font-medium truncate">{level.name}</div>
                          <div className="text-xs text-gray-500 flex items-center gap-2">
                            {level.duration}s • {level.difficulty}
                          </div>
                        </div>
                      </div>
                      {selectedLevelId === level.id && (
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); handleMoveOrder(-1); }}>
                            <MoveUp className="w-3 h-3" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); handleMoveOrder(1); }}>
                            <MoveDown className="w-3 h-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Main Editor Area */}
          <div className="col-span-9 flex flex-col h-full overflow-hidden">
            {selectedLevelId ? (
              <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
                <div className="flex justify-between items-center mb-4">
                  <TabsList className="bg-gray-900 border border-gray-800">
                    <TabsTrigger value="config" className="gap-2"><LayoutGrid className="w-4 h-4"/> Configuration</TabsTrigger>
                    <TabsTrigger value="story" className="gap-2"><MessageSquare className="w-4 h-4"/> Story Editor</TabsTrigger>
                    <TabsTrigger value="assets" className="gap-2"><Eye className="w-4 h-4"/> Preview Assets</TabsTrigger>
                    <TabsTrigger value="ai_gen" className="gap-2 text-purple-400"><Wand2 className="w-4 h-4"/> AI Generator</TabsTrigger>
                  </TabsList>
                  <Button variant="destructive" size="sm" onClick={handleDelete}>
                    <Trash2 className="w-4 h-4 mr-2" /> Delete Level
                  </Button>
                </div>

                {/* AI Generator Tab */}
                <TabsContent value="ai_gen" className="flex-1 overflow-auto p-4">
                   <AILevelGenerator onLevelGenerated={() => {
                     fetchLevels();
                     setActiveTab('config');
                   }} />
                </TabsContent>

                {/* Configuration Tab */}
                <TabsContent value="config" className="flex-1 overflow-auto">
                  <div className="grid grid-cols-2 gap-6">
                    {/* Basic Info */}
                    <Card className="bg-gray-900/50 border-gray-800">
                      <CardHeader><CardTitle>General Settings</CardTitle></CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <Label className="text-white font-bold">Level Name</Label>
                          <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="bg-gray-950 text-white" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-white font-bold">Description</Label>
                          <Textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="bg-gray-950 text-white" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-white font-bold">Difficulty</Label>
                            <Select value={formData.difficulty} onValueChange={v => setFormData({...formData, difficulty: v})}>
                              <SelectTrigger className="bg-gray-950 text-white"><SelectValue /></SelectTrigger>
                              <SelectContent className="bg-gray-800 border-gray-700 text-white">
                                {['Easy', 'Medium', 'Hard', 'Expert'].map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-white font-bold">Duration (sec)</Label>
                            <Input type="number" value={formData.duration} onChange={e => setFormData({...formData, duration: parseInt(e.target.value)})} className="bg-gray-950 text-white" />
                          </div>
                        </div>
                        <div className="flex items-center justify-between p-2 border border-gray-800 rounded-md bg-gray-950/50">
                          <Label className="text-white font-bold">Active Level</Label>
                          <Switch checked={formData.is_active} onCheckedChange={v => setFormData({...formData, is_active: v})} />
                        </div>
                      </CardContent>
                    </Card>

                    {/* Objectives & Boss */}
                    <Card className="bg-gray-900/50 border-gray-800">
                      <CardHeader><CardTitle>Objectives & Boss</CardTitle></CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <Label className="text-white font-bold">Objective Type</Label>
                          <Select 
                            value={formData.objective.type} 
                            onValueChange={v => setFormData({...formData, objective: {...formData.objective, type: v}})}
                          >
                            <SelectTrigger className="bg-gray-950 text-white"><SelectValue /></SelectTrigger>
                            <SelectContent className="bg-gray-800 border-gray-700 text-white">
                              {OBJECTIVE_TYPES.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-white font-bold">Target Value</Label>
                          <Input 
                            type="number" 
                            value={formData.objective.target} 
                            onChange={e => setFormData({...formData, objective: {...formData.objective, target: parseInt(e.target.value)}})} 
                            className="bg-gray-950 text-white" 
                          />
                        </div>
                        
                        <div className="pt-4 border-t border-gray-800">
                          <Label className="mb-2 block text-white font-bold">Boss Configuration</Label>
                          <div className="space-y-2 mb-2">
                            <Select 
                              value={formData.boss_type} 
                              onValueChange={v => {
                                const boss = BOSS_TYPES.find(b => b.id === v);
                                setFormData({
                                  ...formData, 
                                  boss_type: v,
                                  boss_stats: boss ? { health: boss.hp, damage: boss.dmg } : formData.boss_stats
                                });
                              }}
                            >
                              <SelectTrigger className="bg-gray-950 text-white"><SelectValue placeholder="Select Boss" /></SelectTrigger>
                              <SelectContent className="bg-gray-800 border-gray-700 text-white">
                                <SelectItem value="none">No Boss</SelectItem>
                                {BOSS_TYPES.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          {formData.boss_type && formData.boss_type !== 'none' && (
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label className="text-white font-bold text-xs">Health</Label>
                                <Input 
                                  type="number" 
                                  value={formData.boss_stats.health} 
                                  onChange={e => setFormData({...formData, boss_stats: {...formData.boss_stats, health: parseInt(e.target.value)}})} 
                                  className="bg-gray-950 h-8 text-white" 
                                  />
                              </div>
                              <div>
                                <Label className="text-white font-bold text-xs">Damage</Label>
                                <Input 
                                  type="number" 
                                  value={formData.boss_stats.damage} 
                                  onChange={e => setFormData({...formData, boss_stats: {...formData.boss_stats, damage: parseInt(e.target.value)}})} 
                                  className="bg-gray-950 h-8 text-white" 
                                  />
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Resources */}
                    <Card className="col-span-2 bg-gray-900/50 border-gray-800">
                      <CardHeader><CardTitle>Rewards & Resources</CardTitle></CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-3 gap-6">
                           <div className="space-y-2">
                             <Label className="text-white font-bold">Credits Reward</Label>
                             <div className="relative">
                               <Coins className="absolute left-2 top-2.5 h-4 w-4 text-yellow-500" />
                               <Input 
                                 type="number" 
                                 className="pl-8 bg-gray-950 text-white" 
                                 value={formData.resources.credits} 
                                 onChange={e => setFormData({...formData, resources: {...formData.resources, credits: parseInt(e.target.value)}})} 
                               />
                             </div>
                           </div>
                           <div className="col-span-2 space-y-2">
                             <Label className="text-white font-bold">Thumbnail URL</Label>
                             <Input 
                               value={formData.thumbnail_url} 
                               onChange={e => setFormData({...formData, thumbnail_url: e.target.value})} 
                               className="bg-gray-950 text-white" 
                               placeholder="https://..."
                             />
                           </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                {/* Story Editor Tab */}
                <TabsContent value="story" className="flex-1 overflow-hidden h-full flex flex-col min-h-0 animate-in fade-in duration-500">
                  <div className="flex flex-1 gap-6 overflow-hidden h-full">
                    {/* Left: Timeline List */}
                    <Card className="w-1/3 flex flex-col bg-gray-800 border-cyan-500/30 overflow-hidden h-full">
                      <CardHeader className="py-4 border-b border-gray-700 bg-gray-800">
                         <div className="flex justify-between items-center">
                           <CardTitle className="text-white flex items-center gap-2 text-base">
                             <List className="w-4 h-4 text-cyan-400" /> Timeline
                           </CardTitle>
                           <Button 
                             onClick={addStoryEvent} 
                             size="sm" 
                             className="bg-cyan-600 hover:bg-cyan-700 text-white h-7 text-xs"
                           >
                             <Plus className="w-3 h-3 mr-1" /> Add Event
                           </Button>
                         </div>
                      </CardHeader>
                      
                      <CardContent className="flex-1 p-0 overflow-hidden bg-gray-800">
                         <ScrollArea className="h-full w-full">
                          <div className="p-4 space-y-3">
                            {getSortedEvents().map((event, idx) => {
                              const isSelected = selectedEventId === event.id;
                              return (
                                <div 
                                  key={event.id}
                                  onClick={() => setSelectedEventId(event.id)}
                                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                                    isSelected 
                                      ? 'bg-gray-900 border-cyan-500 shadow-md' 
                                      : 'bg-gray-900/50 border-gray-700 hover:bg-gray-700'
                                  }`}
                                >
                                  <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-2">
                                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-auto border-0 ${
                                        event.trigger === 'start' ? 'bg-green-500/20 text-green-400' :
                                        event.trigger === 'boss' ? 'bg-purple-500/20 text-purple-400' :
                                        event.trigger === 'end' ? 'bg-red-500/20 text-red-400' :
                                        'bg-blue-500/20 text-blue-400'
                                      }`}>
                                        {event.trigger === 'time' ? `${String(event.timestamp).padStart(3, '0')}s` : event.trigger.toUpperCase()}
                                      </Badge>
                                    </div>
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-5 w-5 text-gray-500 hover:text-red-400"
                                      onClick={(e) => { e.stopPropagation(); deleteStoryEvent(event.id); }}
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  </div>
                                  
                                  <div className="font-bold text-white text-sm mb-1">
                                      {event.character || <span className="text-gray-500 italic">No Speaker</span>}
                                  </div>
                                  <div className="text-xs text-gray-400 line-clamp-2">
                                    {event.text || <span className="italic text-gray-600">No content...</span>}
                                  </div>
                                </div>
                              );
                            })}
                            
                            {formData.story_sequence.length === 0 && (
                              <div className="text-center py-10 text-gray-500">
                                <p className="text-sm">No events in timeline.</p>
                                <Button variant="link" onClick={addStoryEvent} className="text-cyan-400 text-xs">
                                  Add your first event
                                </Button>
                              </div>
                            )}
                          </div>
                        </ScrollArea>
                      </CardContent>
                    </Card>

                    {/* Right: Editor Panel */}
                    <Card className="flex-1 bg-gray-800 border-cyan-500/30 overflow-hidden flex flex-col h-full">
                      {selectedEventId ? (
                        <>
                          <CardHeader className="py-4 border-b border-gray-700">
                            <CardTitle className="text-white flex items-center gap-2 text-base">
                              <MessageSquare className="w-4 h-4 text-cyan-400" /> Event Editor
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="flex-1 overflow-y-auto p-6">
                            <div className="space-y-6 max-w-2xl">
                              
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                  <label className="text-white text-xs uppercase font-bold block">Trigger</label>
                                  <Select 
                                    value={formData.story_sequence.find(e => e.id === selectedEventId)?.trigger || 'time'} 
                                    onValueChange={v => updateStoryEvent(selectedEventId, 'trigger', v)}
                                  >
                                    <SelectTrigger className="bg-gray-900 border-gray-700 text-white h-9">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-gray-800 border-gray-700 text-white">
                                      <SelectItem value="start">Game Start</SelectItem>
                                      <SelectItem value="time">Time Elapsed</SelectItem>
                                      <SelectItem value="boss">Boss Appears</SelectItem>
                                      <SelectItem value="end">Level Complete</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                
                                <div className="space-y-1">
                                  <label className="text-white text-xs uppercase font-bold block">Timing (Seconds)</label>
                                  <Input 
                                    type="number" 
                                    className="bg-gray-900 border-gray-700 text-white h-9"
                                    value={formData.story_sequence.find(e => e.id === selectedEventId)?.timestamp || 0}
                                    onChange={e => updateStoryEvent(selectedEventId, 'timestamp', parseInt(e.target.value))}
                                    disabled={formData.story_sequence.find(e => e.id === selectedEventId)?.trigger !== 'time'}
                                  />
                                </div>
                              </div>

                              <div className="space-y-1">
                                <label className="text-white text-xs uppercase font-bold block">Character Name</label>
                                <Input 
                                  className="bg-gray-900 border-gray-700 text-white h-9"
                                  value={formData.story_sequence.find(e => e.id === selectedEventId)?.character || ''}
                                  onChange={e => updateStoryEvent(selectedEventId, 'character', e.target.value)}
                                  placeholder="e.g. Commander"
                                />
                              </div>

                              <div className="space-y-1">
                                <label className="text-white text-xs uppercase font-bold block">Dialogue Text</label>
                                <Textarea 
                                  className="bg-gray-900 border-gray-700 text-white min-h-[150px] resize-none"
                                  value={formData.story_sequence.find(e => e.id === selectedEventId)?.text || ''}
                                  onChange={e => updateStoryEvent(selectedEventId, 'text', e.target.value)}
                                  placeholder="Enter dialogue..."
                                />
                                <div className="text-right text-xs text-gray-500">
                                    {formData.story_sequence.find(e => e.id === selectedEventId)?.text?.length || 0} chars
                                </div>
                              </div>

                              <div className="flex justify-end pt-4">
                                <Button 
                                  variant="destructive" 
                                  size="sm" 
                                  onClick={() => deleteStoryEvent(selectedEventId)}
                                >
                                  <Trash2 className="w-4 h-4 mr-2" /> Delete Event
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </>
                      ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
                          <MessageSquare className="w-12 h-12 opacity-20 mb-2" />
                          <p>Select an event to edit</p>
                        </div>
                      )}
                    </Card>
                  </div>
                </TabsContent>

                {/* Assets Tab */}
                <TabsContent value="assets" className="flex-1 overflow-auto">
                  <div className="space-y-8">
                    <div>
                      <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Sword className="w-5 h-5 text-red-400"/> Enemies</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {PREVIEW_ASSETS.enemies.map(enemy => (
                          <div key={enemy.id} className="p-4 bg-gray-900 border border-gray-800 rounded-lg hover:border-red-500/50 transition-colors">
                            <div className="text-4xl mb-2 text-center">{enemy.icon}</div>
                            <div className="font-bold text-center">{enemy.name}</div>
                            <div className="flex justify-between mt-2 text-xs text-gray-400">
                              <span>HP: {enemy.hp}</span>
                              <span>{enemy.type}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-purple-400"/> Bosses</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4">
                        {BOSS_TYPES.map(boss => (
                          <div key={boss.id} className="p-4 bg-gray-900 border border-purple-900/30 rounded-lg hover:border-purple-500/50 transition-colors">
                            <div className="text-4xl mb-2 text-center">👾</div>
                            <div className="font-bold text-center text-purple-200">{boss.name}</div>
                            <div className="flex justify-between mt-2 text-xs text-gray-400">
                              <span>HP: {boss.hp}</span>
                              <span>DMG: {boss.dmg}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Target className="w-5 h-5 text-green-400"/> Items & Powerups</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {PREVIEW_ASSETS.items.map(item => (
                          <div key={item.id} className="p-4 bg-gray-900 border border-gray-800 rounded-lg hover:border-green-500/50 transition-colors">
                            <div className="text-4xl mb-2 text-center">{item.icon}</div>
                            <div className="font-bold text-center">{item.name}</div>
                            <div className="text-xs text-center text-green-400 mt-1">{item.effect}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500 flex-col gap-4">
                <LayoutGrid className="w-16 h-16 opacity-20" />
                <p>Select a level from the sidebar or create a new one</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
