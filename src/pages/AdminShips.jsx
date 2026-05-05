import React, { useState, useEffect } from 'react';
import { apiClient } from '../apis/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Eye, EyeOff, Pencil, RefreshCw, Palette, Rocket } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import ShipPreviewCanvas from '../components/game/ShipPreviewCanvas';

export default function AdminShips() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    model_type: '',
    svg_path: '',
    image_url: '',
    cost: 0,
    colors: { inner: '#00f0ff', mid: '#0088ff', outer: '#004488', aura: 'rgba(0, 240, 255, 0.3)' },
    rarity: 'common',
    stats: { speed: 5, armor: 5, firepower: 5 },
    is_active: true
  });
  const [editingId, setEditingId] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [previewAnimate, setPreviewAnimate] = useState(true);

  const queryClient = useQueryClient();

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const user = await apiClient.auth.me();
        setIsAdmin(user.role === 'admin');
      } catch (e) {
        setIsAdmin(false);
      } finally {
        setCheckingAdmin(false);
      }
    };
    checkAdmin();
  }, []);

  const { data: ships, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['ships'],
    queryFn: async () => {
      console.log("Fetching ships...");
      if (!apiClient.entities?.Ship) {
        console.error("Ship entity definition missing in SDK");
        throw new Error("Ship entity not found");
      }
      try {
        // Use standard positional arguments for list: sort, limit
        const res = await apiClient.entities.Ship.list('-created_date', 100);
        
        // Handle different response structures
        if (Array.isArray(res)) return res;
        if (res && Array.isArray(res.items)) return res.items;
        
        console.log("Ships fetch response:", res);
        return [];
      } catch (err) {
        console.error("Error fetching ships:", err);
        throw err;
      }
    },
    enabled: isAdmin,
    retry: 2
  });

  const regenerateShip = () => {
    const models = ['basic', 'delta', 'arrow', 'falcon', 'viper', 'guardian', 'stealth'];
    const rarities = ['common', 'rare', 'epic', 'legendary'];
    const prefixes = ['Neo', 'Cyber', 'Void', 'Solar', 'Lunar', 'Hyper', 'Omega', 'Alpha', 'Star', 'Dark'];
    const suffixes = ['Interceptor', 'Vanguard', 'Destroyer', 'Stalker', 'Phantom', 'Ranger', 'Guardian', 'Wing'];
    
    const model = models[Math.floor(Math.random() * models.length)];
    const rarity = rarities[Math.floor(Math.random() * rarities.length)];
    const name = `${prefixes[Math.floor(Math.random() * prefixes.length)]} ${suffixes[Math.floor(Math.random() * suffixes.length)]}`;
    
    // Random Hex Color
    const rc = () => '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
    
    setFormData(prev => ({
      ...prev,
      name: name,
      model_type: model,
      cost: (Math.floor(Math.random() * 50) + 10) * 100, // 1000 to 6000
      colors: { inner: rc(), mid: rc(), outer: rc(), aura: rc() },
      rarity: rarity,
      stats: {
        speed: Math.floor(Math.random() * 8) + 2,
        armor: Math.floor(Math.random() * 8) + 2,
        firepower: Math.floor(Math.random() * 8) + 2
      }
    }));
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({
      name: '',
      model_type: '',
      svg_path: '',
      image_url: '',
      cost: 0,
      colors: { inner: '#00f0ff', mid: '#0088ff', outer: '#004488', aura: 'rgba(0, 240, 255, 0.3)' },
      rarity: 'common',
      stats: { speed: 5, armor: 5, firepower: 5 },
      is_active: true
    });
  };

  const createShipMutation = useMutation({
    mutationFn: (shipData) => apiClient.entities.Ship.create(shipData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ships'] });
      resetForm();
    }
  });

  const updateShipMutation = useMutation({
    mutationFn: ({ id, data }) => apiClient.entities.Ship.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ships'] });
      resetForm();
    }
  });

  const deleteShipMutation = useMutation({
    mutationFn: (id) => apiClient.entities.Ship.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ships'] });
    }
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, is_active }) => apiClient.entities.Ship.update(id, { is_active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ships'] });
    }
  });

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setUploading(true);
    try {
      const result = await apiClient.integrations.Core.UploadFile({ file });
      setFormData({ ...formData, image_url: result.file_url });
    } catch (error) {
      console.error('Upload failed', error);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingId) {
      updateShipMutation.mutate({ id: editingId, data: formData });
    } else {
      createShipMutation.mutate(formData);
    }
  };

  const handleEdit = (ship) => {
    setFormData({
      name: ship.name,
      model_type: ship.model_type,
      svg_path: ship.svg_path || '',
      image_url: ship.image_url || '',
      cost: ship.cost || 0,
      colors: ship.colors || { inner: '#00f0ff', mid: '#0088ff', outer: '#004488', aura: 'rgba(0, 240, 255, 0.3)' },
      rarity: ship.rarity || 'common',
      stats: ship.stats || { speed: 5, armor: 5, firepower: 5 },
      is_active: ship.is_active
    });
    setEditingId(ship.id);
    setShowForm(true);
  };

  if (checkingAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black flex items-center justify-center p-4">
        <div className="text-cyan-400 animate-pulse">Verifying access...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black flex items-center justify-center p-4">
        <Card className="bg-gray-800 border-red-500/30 max-w-md">
          <CardContent className="p-6 text-center">
            <h2 className="text-2xl font-bold text-red-400 mb-2">Access Denied</h2>
            <p className="text-gray-400 mb-4">Admin privileges required</p>
            <Link to={createPageUrl('Game')}>
              <Button>Back to Game</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-black text-white mb-2">Ship Management</h1>
            <p className="text-gray-400">Create and manage custom ships</p>
          </div>
          <div className="flex gap-2">
            <Link to={createPageUrl('Game')}>
              <Button variant="outline">Back to Game</Button>
            </Link>
            <Button onClick={() => { resetForm(); setShowForm(!showForm); }} className="bg-cyan-600 hover:bg-cyan-700">
              <Plus className="w-4 h-4 mr-2" />
              Add Ship
            </Button>
          </div>
        </div>

        {showForm && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Editor Column */}
            <Card className="bg-gray-800 border-cyan-500/30 lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Rocket className="w-5 h-5 text-cyan-400" />
                  {editingId ? 'Edit Ship Design' : 'Ship Designer'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Basic Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-gray-400 text-xs uppercase font-bold mb-1 block">Ship Name</label>
                      <Input
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g., Starfire"
                        required
                        className="bg-gray-900 border-gray-700 text-white"
                      />
                    </div>
                    <div>
                      <label className="text-gray-400 text-xs uppercase font-bold mb-1 block">Model ID</label>
                      <Input
                        value={formData.model_type}
                        onChange={(e) => setFormData({ ...formData, model_type: e.target.value })}
                        placeholder="e.g., custom_starfire"
                        required
                        className="bg-gray-900 border-gray-700 text-white"
                      />
                    </div>
                  </div>

                  {/* Shape & Visuals */}
                  <div className="space-y-4 border-t border-gray-700/50 pt-4">
                    <h3 className="text-cyan-400 font-bold text-sm flex items-center gap-2">
                      <Rocket className="w-4 h-4" /> Hull Configuration
                    </h3>
                    
                    <div>
                      <label className="text-gray-400 text-xs uppercase font-bold mb-1 block">Hull Shape</label>
                      <Select 
                        value={['basic', 'delta', 'arrow', 'falcon', 'viper', 'guardian', 'stealth'].includes(formData.model_type) ? formData.model_type : 'custom'} 
                        onValueChange={(value) => {
                          if (value !== 'custom') {
                            setFormData({ ...formData, model_type: value, svg_path: '' });
                          } else if (!formData.model_type.startsWith('custom_')) {
                            setFormData({ ...formData, model_type: 'custom_' + Date.now().toString().slice(-4) });
                          }
                        }}
                      >
                        <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
                          <SelectValue placeholder="Select Hull Shape" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="basic">Phoenix (Basic)</SelectItem>
                          <SelectItem value="delta">Delta Wing</SelectItem>
                          <SelectItem value="arrow">Arrow</SelectItem>
                          <SelectItem value="falcon">Falcon</SelectItem>
                          <SelectItem value="viper">Viper</SelectItem>
                          <SelectItem value="guardian">Guardian</SelectItem>
                          <SelectItem value="stealth">Stealth</SelectItem>
                          <SelectItem value="custom">Custom SVG Shape</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {(!['basic', 'delta', 'arrow', 'falcon', 'viper', 'guardian', 'stealth'].includes(formData.model_type)) && (
                      <div>
                        <label className="text-gray-400 text-xs uppercase font-bold mb-1 block">Custom SVG Path Data</label>
                        <Textarea
                          value={formData.svg_path}
                          onChange={(e) => setFormData({ ...formData, svg_path: e.target.value })}
                          placeholder="e.g., M 0 -40 L 20 20 L -20 20 Z"
                          className="bg-gray-900 border-gray-700 text-white font-mono h-24 text-xs"
                        />
                        <p className="text-[10px] text-gray-500 mt-1">Use standard SVG 'd' attribute path commands (M, L, C, Z). Relative to center (0,0).</p>
                      </div>
                    )}

                    <div>
                      <label className="text-gray-400 text-xs uppercase font-bold mb-1 block">Sprite Overlay (Optional)</label>
                      <div className="flex gap-2 items-center">
                        <Input
                          type="file"
                          accept="image/gif,image/png,image/jpeg"
                          onChange={handleImageUpload}
                          disabled={uploading}
                          className="bg-gray-900 border-gray-700 text-white flex-1"
                        />
                        {formData.image_url && (
                          <Button 
                            type="button" 
                            variant="destructive" 
                            size="icon" 
                            onClick={() => setFormData({ ...formData, image_url: '' })}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                      {uploading && <p className="text-xs text-cyan-400 mt-1">Uploading...</p>}
                    </div>
                  </div>

                  {/* Colors */}
                  <div className="space-y-4 border-t border-gray-700/50 pt-4">
                    <h3 className="text-cyan-400 font-bold text-sm flex items-center gap-2">
                      <Palette className="w-4 h-4" /> Paint & Effects
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="space-y-1">
                        <label className="text-gray-400 text-xs uppercase font-bold block">Primary</label>
                        <div className="flex items-center gap-2 bg-gray-900 p-1 rounded border border-gray-700">
                          <input
                            type="color"
                            value={formData.colors.inner}
                            onChange={(e) => setFormData({ ...formData, colors: { ...formData.colors, inner: e.target.value } })}
                            className="w-8 h-8 rounded bg-transparent cursor-pointer"
                          />
                          <span className="text-xs font-mono text-gray-300">{formData.colors.inner}</span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-gray-400 text-xs uppercase font-bold block">Secondary</label>
                        <div className="flex items-center gap-2 bg-gray-900 p-1 rounded border border-gray-700">
                          <input
                            type="color"
                            value={formData.colors.mid}
                            onChange={(e) => setFormData({ ...formData, colors: { ...formData.colors, mid: e.target.value } })}
                            className="w-8 h-8 rounded bg-transparent cursor-pointer"
                          />
                          <span className="text-xs font-mono text-gray-300">{formData.colors.mid}</span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-gray-400 text-xs uppercase font-bold block">Accent</label>
                        <div className="flex items-center gap-2 bg-gray-900 p-1 rounded border border-gray-700">
                          <input
                            type="color"
                            value={formData.colors.outer}
                            onChange={(e) => setFormData({ ...formData, colors: { ...formData.colors, outer: e.target.value } })}
                            className="w-8 h-8 rounded bg-transparent cursor-pointer"
                          />
                          <span className="text-xs font-mono text-gray-300">{formData.colors.outer}</span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-gray-400 text-xs uppercase font-bold block">Aura</label>
                        <div className="flex items-center gap-2 bg-gray-900 p-1 rounded border border-gray-700">
                          <input
                            type="color"
                            value={formData.colors.aura?.replace(/rgba?\((\d+), (\d+), (\d+).*/, '#$1$2$3') || '#000000'} // Basic hex fallback
                            onChange={(e) => setFormData({ ...formData, colors: { ...formData.colors, aura: e.target.value } })} // Saves as hex, simple
                            className="w-8 h-8 rounded bg-transparent cursor-pointer"
                          />
                          <span className="text-xs font-mono text-gray-300">Glow</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Stats & Meta */}
                  <div className="space-y-4 border-t border-gray-700/50 pt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-gray-400 text-xs uppercase font-bold mb-1 block">Rarity</label>
                        <Select value={formData.rarity} onValueChange={(value) => setFormData({ ...formData, rarity: value })}>
                          <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="common">Common</SelectItem>
                            <SelectItem value="rare">Rare</SelectItem>
                            <SelectItem value="epic">Epic</SelectItem>
                            <SelectItem value="legendary">Legendary</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-gray-400 text-xs uppercase font-bold mb-1 block">Cost (Coins)</label>
                        <Input
                          type="number"
                          value={formData.cost}
                          onChange={(e) => setFormData({ ...formData, cost: parseInt(e.target.value) })}
                          className="bg-gray-900 border-gray-700 text-white"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-4 border-t border-gray-700">
                    <Button type="button" variant="outline" onClick={resetForm}>
                      Cancel
                    </Button>
                    <Button type="button" variant="secondary" onClick={regenerateShip} className="bg-purple-600/20 hover:bg-purple-600/40 text-purple-200 border border-purple-500/30">
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Regenerate
                    </Button>
                    <Button type="submit" className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold shadow-lg shadow-cyan-500/20">
                      {editingId ? 'Update Ship Blueprint' : 'Create Ship Blueprint'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* Preview Column */}
            <div className="lg:col-span-1">
              <div className="sticky top-6 space-y-4">
                <Card className="bg-black/60 border-cyan-500/50 backdrop-blur-sm overflow-hidden">
                  <CardHeader className="bg-cyan-900/20 border-b border-cyan-500/20 py-3">
                    <CardTitle className="text-cyan-400 text-sm flex justify-between items-center">
                      <span>Live Preview</span>
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setPreviewAnimate(!previewAnimate)}>
                        {previewAnimate ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 flex flex-col items-center justify-center bg-gradient-to-b from-gray-900 to-black min-h-[300px]">
                    <div className="relative">
                      <ShipPreviewCanvas
                        model={formData.model_type}
                        colors={{
                          primary: formData.colors.inner,
                          secondary: formData.colors.mid,
                          accent: formData.colors.outer,
                          aura: formData.colors.aura
                        }}
                        customShipImage={formData.image_url}
                        svgPath={formData.svg_path}
                        size={250}
                        animated={previewAnimate}
                      />
                    </div>
                    <div className="mt-4 text-center">
                      <h3 className="text-white font-bold text-lg">{formData.name || 'Ship Name'}</h3>
                      <div className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase mt-1 ${
                        formData.rarity === 'legendary' ? 'bg-yellow-500/20 text-yellow-400' :
                        formData.rarity === 'epic' ? 'bg-purple-500/20 text-purple-400' :
                        formData.rarity === 'rare' ? 'bg-blue-500/20 text-blue-400' :
                        'bg-gray-500/20 text-gray-400'
                      }`}>
                        {formData.rarity}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700 text-xs text-gray-400">
                  <p className="mb-2 font-bold text-white">Preview Controls:</p>
                  <ul className="list-disc pl-4 space-y-1">
                    <li>Edit colors to see changes instantly</li>
                    <li>Toggle animation with the eye icon</li>
                    <li>Valid SVG paths will render automatically</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {isLoading ? (
            <div className="text-gray-400 col-span-full text-center py-8 flex flex-col items-center gap-2">
              <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
              Loading ships...
            </div>
          ) : isError ? (
            <div className="text-red-400 col-span-full text-center py-8 flex flex-col items-center gap-4">
              <p>Failed to load ships.</p>
              <p className="text-xs text-gray-500 font-mono">{error?.message || "Unknown error"}</p>
              <Button onClick={() => refetch()} variant="outline" className="border-red-500/30 hover:bg-red-900/20">
                Try Again
              </Button>
            </div>
          ) : !ships || ships.length === 0 ? (
            <div className="text-gray-400 col-span-full text-center py-8 flex flex-col items-center gap-4">
              <p>No ships found.</p>
              <Button onClick={() => refetch()} variant="ghost" size="sm">
                Refresh List
              </Button>
            </div>
          ) : (
            ships?.map((ship) => (
              <Card key={ship.id} className={`bg-gray-800 border-gray-700 ${!ship.is_active ? 'opacity-50' : ''}`}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-white">{ship.name}</CardTitle>
                      <p className="text-xs text-gray-500 mt-1">{ship.model_type}</p>
                    </div>
                    <div className={`px-2 py-1 rounded text-xs font-bold ${
                      ship.rarity === 'legendary' ? 'bg-yellow-500/20 text-yellow-400' :
                      ship.rarity === 'epic' ? 'bg-purple-500/20 text-purple-400' :
                      ship.rarity === 'rare' ? 'bg-blue-500/20 text-blue-400' :
                      'bg-gray-500/20 text-gray-400'
                    }`}>
                      {ship.rarity}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {ship.image_url && (
                      <div className="flex justify-center bg-gray-900 rounded p-2">
                        <img src={ship.image_url} alt={ship.name} className="w-16 h-16 object-contain" />
                      </div>
                    )}
                    <div className="flex gap-2">
                      <div className="w-8 h-8 rounded" style={{ backgroundColor: ship.colors?.inner || '#00f0ff' }} />
                      <div className="w-8 h-8 rounded" style={{ backgroundColor: ship.colors?.mid || '#0088ff' }} />
                      <div className="w-8 h-8 rounded" style={{ backgroundColor: ship.colors?.outer || '#004488' }} />
                    </div>
                    <div className="text-yellow-400 text-sm">Cost: {ship.cost} coins</div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleActiveMutation.mutate({ id: ship.id, is_active: !ship.is_active })}
                        className="flex-1"
                      >
                        {ship.is_active ? <EyeOff className="w-4 h-4 mr-1" /> : <Eye className="w-4 h-4 mr-1" />}
                        {ship.is_active ? 'Hide' : 'Show'}
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleEdit(ship)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deleteShipMutation.mutate(ship.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
