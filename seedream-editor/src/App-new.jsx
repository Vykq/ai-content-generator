import { useState } from 'react';
import { isApiKeyConfigured } from './services/falService';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './components/ui/tabs';
import { Button } from './components/ui/button';
import { Alert, AlertDescription } from './components/ui/alert';
import SeedDreamEditor from './components/SeedDreamEditor';
import NanoBananaEditor from './components/NanoBananaEditor';
import './App.css';

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-500 via-purple-600 to-indigo-700 p-6">
      <div className="max-w-[1800px] mx-auto">
        {/* Header with tabs */}
        <header className="bg-white rounded-t-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">AI Image Editor</h1>
              <p className="text-gray-600">Powered by fal.ai</p>
            </div>
            {!isApiKeyConfigured() && (
              <Alert className="max-w-md" variant="destructive">
                <AlertDescription>
                  ⚠️ API key not configured. Please set <code className="bg-red-100 px-2 py-1 rounded">VITE_FAL_KEY</code> in your <code>.env</code> file.
                </AlertDescription>
              </Alert>
            )}
          </div>

          <Tabs defaultValue="seedream" className="w-full">
            <TabsList className="w-full justify-start">
              <TabsTrigger value="seedream">SeeD Dream v4.5</TabsTrigger>
              <TabsTrigger value="nanobanana">Nano Banana Pro</TabsTrigger>
            </TabsList>

            <TabsContent value="seedream" className="mt-0">
              <SeedDreamEditor />
            </TabsContent>

            <TabsContent value="nanobanana" className="mt-0">
              <NanoBananaEditor />
            </TabsContent>
          </Tabs>
        </header>
      </div>
    </div>
  );
}

export default App;
