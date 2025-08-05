// components/ProjectManager.tsx
'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { X, Plus, Trash2, Users, Hash, Loader2 } from 'lucide-react';

interface Project {
  id: string;
  name: string;
  slackToken: string;
  channels: string[];
  channelDetails?: any[];
  channelCount: number;
}

interface ProjectManagerProps {
  project: Project;
  onClose: () => void;
  onUpdate: (updatedProject: Project) => void;
}

export default function ProjectManager({ project, onClose, onUpdate }: ProjectManagerProps) {
  const [activeTab, setActiveTab] = useState<'channels' | 'users'>('channels');
  const [isLoading, setIsLoading] = useState(false);
  
  // Channel management
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelDescription, setNewChannelDescription] = useState('');
  
  // User management
  const [userEmails, setUserEmails] = useState<string[]>(['']);

  const addChannel = async () => {
    if (!newChannelName) {
      toast.error('Please enter a channel name');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/slack/manage-channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slackToken: project.slackToken,
          action: 'create',
          channel: {
            name: newChannelName,
            description: newChannelDescription
          }
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        toast.success(`Channel #${newChannelName} created!`);
        // Only add if not already in the list
        const updatedChannels = project.channels.includes(newChannelName) 
          ? project.channels 
          : [...project.channels, newChannelName];
        
        const updatedProject = {
          ...project,
          channels: updatedChannels,
          channelCount: updatedChannels.length
        };
        onUpdate(updatedProject);
        setNewChannelName('');
        setNewChannelDescription('');
      } else {
        toast.error(data.error || 'Failed to create channel');
      }
    } catch (error) {
      toast.error('Failed to create channel');
    } finally {
      setIsLoading(false);
    }
  };

  const deleteChannel = async (channelName: string) => {
    if (!confirm(`Are you sure you want to archive #${channelName}?`)) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/slack/manage-channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slackToken: project.slackToken,
          action: 'archive',
          channelName
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        toast.success(`Channel #${channelName} archived`);
        const updatedProject = {
          ...project,
          channels: project.channels.filter(ch => ch !== channelName),
          channelCount: project.channels.filter(ch => ch !== channelName).length
        };
        onUpdate(updatedProject);
      } else {
        toast.error(data.error || 'Failed to archive channel');
      }
    } catch (error) {
      toast.error('Failed to archive channel');
    } finally {
      setIsLoading(false);
    }
  };

  const addUsersToChannels = async () => {
    const validEmails = userEmails.filter(email => email.trim());
    if (validEmails.length === 0) {
      toast.error('Please enter at least one email');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/slack/add-users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slackToken: project.slackToken,
          emails: validEmails,
          channels: project.channels
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        if (data.results.failed.length > 0) {
          toast.error(`Failed to add: ${data.results.failed.join(', ')}`);
        }
        if (data.results.success.length > 0) {
          toast.success(`Added ${data.results.success.length} user(s) to channels!`);
          setUserEmails(['']);
        }
      } else {
        toast.error(data.error || 'Failed to add users');
      }
    } catch (error) {
      toast.error('Failed to add users');
    } finally {
      setIsLoading(false);
    }
  };

  const addEmailField = () => {
    setUserEmails([...userEmails, '']);
  };

  const updateEmail = (index: number, value: string) => {
    const updated = [...userEmails];
    updated[index] = value;
    setUserEmails(updated);
  };

  const removeEmail = (index: number) => {
    setUserEmails(userEmails.filter((_, i) => i !== index));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-semibold">Manage: {project.name}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('channels')}
            className={`flex-1 py-3 px-6 font-medium transition-colors ${
              activeTab === 'channels'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Manage Channels
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`flex-1 py-3 px-6 font-medium transition-colors ${
              activeTab === 'users'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Add Users
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 200px)' }}>
          {activeTab === 'channels' ? (
            <div className="space-y-6">
              {/* Add New Channel */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold mb-3">Add New Channel</h3>
                <div className="space-y-3">
                  <input
                    type="text"
                    value={newChannelName}
                    onChange={(e) => setNewChannelName(e.target.value)}
                    placeholder="channel-name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    value={newChannelDescription}
                    onChange={(e) => setNewChannelDescription(e.target.value)}
                    placeholder="Channel description (optional)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={addChannel}
                    disabled={isLoading || !newChannelName}
                    className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}
                    Create Channel
                  </button>
                </div>
              </div>

              {/* Existing Channels */}
              <div>
                <h3 className="font-semibold mb-3">Existing Channels ({project.channels.length})</h3>
                <div className="space-y-2">
                  {project.channels.map((channel) => (
                    <div
                      key={channel}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        <Hash className="w-4 h-4 text-gray-500" />
                        <span>{channel}</span>
                      </div>
                      <button
                        onClick={() => deleteChannel(channel)}
                        disabled={isLoading}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                        title="Archive channel"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  Add existing workspace members to all channels. Make sure they've already joined the workspace.
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold">User Emails</h3>
                  <button
                    onClick={addEmailField}
                    className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    Add Another
                  </button>
                </div>
                
                <div className="space-y-2">
                  {userEmails.map((email, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => updateEmail(index, e.target.value)}
                        placeholder="user@company.com"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                      {userEmails.length > 1 && (
                        <button
                          onClick={() => removeEmail(index)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <button
                  onClick={addUsersToChannels}
                  disabled={isLoading}
                  className="w-full mt-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Adding Users...
                    </>
                  ) : (
                    <>
                      <Users className="w-4 h-4" />
                      Add to All Channels
                    </>
                  )}
                </button>
              </div>

              <div className="text-sm text-gray-600">
                <p className="font-medium mb-1">Channels users will be added to:</p>
                <div className="flex flex-wrap gap-2">
                  {project.channels.map((channel) => (
                    <span key={channel} className="px-2 py-1 bg-gray-100 rounded">
                      #{channel}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}