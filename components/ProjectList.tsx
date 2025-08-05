// components/ProjectList.tsx
'use client';

import { useState, useEffect } from 'react';
import { Calendar, Users, Hash, Trash2, Settings, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import ProjectManager from './ProjectManager';
import { toast } from 'sonner';

interface Project {
  id: string;
  name: string;
  createdAt: string;
  channelCount: number;
  memberCount: number;
  status: 'active' | 'archived';
  slackToken?: string;
  channels?: string[];
  lastSynced?: string;
  archivedChannels?: number;
  syncStatus?: 'success' | 'error' | 'invalid-token' | 'no-token';
}

export default function ProjectList() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  useEffect(() => {
    // Load projects from localStorage
    const savedProjects = JSON.parse(localStorage.getItem('slackProjects') || '[]');
    setProjects(savedProjects);
    
    // Load last sync time
    const savedSyncTime = localStorage.getItem('lastProjectSync');
    if (savedSyncTime) {
      setLastSyncTime(savedSyncTime);
    }
    
    // Auto-sync on load if it's been more than 5 minutes
    const lastSync = savedSyncTime ? new Date(savedSyncTime).getTime() : 0;
    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
    if (lastSync < fiveMinutesAgo && savedProjects.length > 0) {
      syncProjects();
    }
  }, []);

  const syncProjects = async () => {
    if (projects.length === 0) return;
    
    setIsSyncing(true);
    const toastId = toast.loading('Syncing projects with Slack...');
    
    try {
      const response = await fetch('/api/slack/sync-projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projects })
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        const syncedProjects = data.projects;
        
        // Update projects and save to localStorage
        setProjects(syncedProjects);
        localStorage.setItem('slackProjects', JSON.stringify(syncedProjects));
        
        // Save sync time
        const syncTime = new Date().toISOString();
        setLastSyncTime(syncTime);
        localStorage.setItem('lastProjectSync', syncTime);
        
        // Show summary
        const { summary } = data;
        toast.success(
          `Sync complete: ${summary.active} active, ${summary.archived} archived projects`,
          { id: toastId }
        );
        
        // Show specific warnings
        const invalidTokenProjects = syncedProjects.filter(
          p => p.syncStatus === 'invalid-token'
        );
        if (invalidTokenProjects.length > 0) {
          toast.warning(
            `${invalidTokenProjects.length} project(s) have invalid tokens and may have been deleted`
          );
        }
      } else {
        toast.error('Failed to sync projects', { id: toastId });
      }
    } catch (error) {
      toast.error('Error syncing projects', { id: toastId });
      console.error('Sync error:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  const deleteProject = (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent opening the manager
    if (!confirm('Are you sure you want to delete this project record?')) {
      return;
    }
    
    const updatedProjects = projects.filter(p => p.id !== id);
    setProjects(updatedProjects);
    localStorage.setItem('slackProjects', JSON.stringify(updatedProjects));
    toast.success('Project record deleted');
  };

  const updateProject = (updatedProject: Project) => {
    const updatedProjects = projects.map(p => 
      p.id === updatedProject.id ? updatedProject : p
    );
    setProjects(updatedProjects);
    localStorage.setItem('slackProjects', JSON.stringify(updatedProjects));
  };

  const formatSyncTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <>
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-semibold">Existing Projects</h2>
            {lastSyncTime && (
              <p className="text-sm text-gray-500 mt-1">
                Last synced: {formatSyncTime(lastSyncTime)}
              </p>
            )}
          </div>
          <button
            onClick={syncProjects}
            disabled={isSyncing || projects.length === 0}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors
              ${isSyncing || projects.length === 0
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'}
            `}
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing...' : 'Sync with Slack'}
          </button>
        </div>
        
        {projects.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-2">No projects yet. Create your first one!</p>
            <p className="text-sm text-gray-400">Projects you create will appear here for future reference.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {projects.map((project) => (
              <div
                key={project.id}
                className={`
                  border rounded-lg p-4 transition-all cursor-pointer group
                  ${project.status === 'archived' 
                    ? 'border-gray-200 bg-gray-50 opacity-75' 
                    : 'border-gray-200 hover:shadow-md'}
                `}
                onClick={() => project.slackToken && project.status === 'active' && setSelectedProject(project)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {project.name}
                      </h3>
                      {project.slackToken && project.status === 'active' && (
                        <Settings className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      )}
                      {project.syncStatus === 'invalid-token' && (
                        <AlertCircle className="w-4 h-4 text-red-500" title="Invalid token - workspace may be deleted" />
                      )}
                      {project.syncStatus === 'success' && project.lastSynced && (
                        <CheckCircle2 className="w-4 h-4 text-green-500" title="Successfully synced" />
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(project.createdAt).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <Hash className="w-4 h-4" />
                        {project.channelCount} channels
                        {project.archivedChannels && project.archivedChannels > 0 && (
                          <span className="text-amber-600">
                            ({project.archivedChannels} archived)
                          </span>
                        )}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {project.memberCount} members added
                      </span>
                    </div>
                    {project.slackToken && project.status === 'active' && (
                      <p className="text-xs text-green-600 mt-2">
                        ✓ Token saved - Click to manage channels and users
                      </p>
                    )}
                    {project.syncStatus === 'invalid-token' && (
                      <p className="text-xs text-red-600 mt-2">
                        ⚠️ Token invalid or workspace deleted
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`
                      px-3 py-1 rounded-full text-xs font-medium
                      ${project.status === 'active' 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-gray-100 text-gray-700'}
                    `}>
                      {project.status}
                    </span>
                    <button
                      onClick={(e) => deleteProject(project.id, e)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                      title="Delete project record"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {projects.length > 0 && (
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Tip:</strong> Use "Sync with Slack" to check if your projects still exist and update channel counts. 
              Projects deleted in Slack will be marked as archived.
            </p>
          </div>
        )}
      </div>

      {/* Project Manager Modal */}
      {selectedProject && selectedProject.slackToken && selectedProject.status === 'active' && (
        <ProjectManager
          project={selectedProject}
          onClose={() => setSelectedProject(null)}
          onUpdate={(updatedProject) => {
            updateProject(updatedProject);
            setSelectedProject(updatedProject);
          }}
        />
      )}
    </>
  );
}