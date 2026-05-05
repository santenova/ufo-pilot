import React, { useState } from 'react';
import { apiClient } from '../apis/client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Trash2, Box, Ghost } from 'lucide-react';
import AIAssetCreator from '@/components/admin/AIAssetCreator';

export default function AdminAssets() {
  const { data: items = [], refetch: refetchItems, isFetching: isFetchingItems } = useQuery({
    queryKey: ['customItems'],
    queryFn: async () => {
      try {
        const res = await apiClient.entities.CustomItem.list('-created_date', 50);
        return Array.isArray(res) ? res : (res?.items || []);
      } catch (e) {
        console.error("Failed to fetch items:", e);
        return [];
      }
    },
    initialData: []
  });

  const handleDeleteItem = async (id) => {
    if (confirm('Delete this item?')) {
      await apiClient.entities.CustomItem.delete(id);
      refetchItems();
    }
  };

  const onAssetCreated = () => {
    refetchItems();
  };

  return (
    <div className="min-h-screen bg-[#0a0a1a] p-8 text-white">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-cyan-400">AI Asset Manager</h1>
        </div>

        <AIAssetCreator onAssetCreated={onAssetCreated} />

        <Tabs defaultValue="items" className="w-full">
          <TabsList className="bg-gray-900 border border-gray-800">
            <TabsTrigger value="items" className="flex gap-2">
              Custom Items ({items?.length || 0})
              {isFetchingItems && <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="items" className="space-y-4 mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(items || []).map(item => (
                <Card key={item.id} className="bg-gray-900 border-gray-800 text-white overflow-hidden">
                   <div className="aspect-video bg-black relative">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.name} className="w-full h-full object-contain p-4" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-700">
                        <Box className="w-12 h-12" />
                      </div>
                    )}
                    <div className="absolute top-2 right-2">
                       <Button variant="destructive" size="icon" className="h-8 w-8" onClick={() => handleDeleteItem(item.id)}>
                         <Trash2 className="w-4 h-4" />
                       </Button>
                    </div>
                  </div>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex justify-between">
                      {item.name}
                      <span className="text-xs px-2 py-1 bg-purple-900 rounded text-purple-200">{item.type}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-gray-400">
                     <div className="mb-2 text-yellow-500 capitalize">{item.rarity}</div>
                    <p className="line-clamp-2">{item.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
