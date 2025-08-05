// app/page.tsx
'use client';

import { useState } from 'react';
import { Toaster } from 'sonner';
import WorkspaceSetup from '@/components/WorkspaceSetup';
import ProjectList from '@/components/ProjectList';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'new' | 'existing'>('new');

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <Toaster position="top-right" />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">
            Slack Automation Hub
          </h1>
          <p className="text-slate-600">
            Create and manage Slack workspaces with one click
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="max-w-5xl mx-auto mb-8">
          <div className="flex space-x-1 bg-slate-200 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('new')}
              className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
                activeTab === 'new'
                  ? 'bg-white text-slate-900 shadow'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              New Setup
            </button>
            <button
              onClick={() => setActiveTab('existing')}
              className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
                activeTab === 'existing'
                  ? 'bg-white text-slate-900 shadow'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Existing Projects
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-5xl mx-auto">
          {activeTab === 'new' ? (
            <WorkspaceSetup onComplete={() => setActiveTab('existing')} />
          ) : (
            <ProjectList />
          )}
        </div>
      </div>
    </main>
  );
}