// components/WorkspaceSetup.tsx
'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Plus, Trash2, Users, Hash, Lock } from 'lucide-react';

interface Channel {
  id: string;
  name: string;
  description: string;
  isPrivate: boolean;
  topic?: string;
  pinnedMessage?: string;
}

interface TeamMember {
  id: string;
  email: string;
}

interface WorkspaceSetupProps {
  onComplete?: () => void;
}

export default function WorkspaceSetup({ onComplete }: WorkspaceSetupProps) {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isTestingToken, setIsTestingToken] = useState(false);
  const [tokenStatus, setTokenStatus] = useState<'untested' | 'valid' | 'invalid'>('untested');
  const [workspaceInfo, setWorkspaceInfo] = useState<{ team: string; user: string } | null>(null);
  
  // Form data
  const [workspaceName, setWorkspaceName] = useState('');
  const [slackToken, setSlackToken] = useState('');
  const [channels, setChannels] = useState<Channel[]>([
    { 
      id: '1', 
      name: 'general', 
      description: 'General discussions and team-wide updates', 
      isPrivate: false,
      pinnedMessage: `Welcome to the project! 👋\n\n📚 Important Links:\n- Project Documentation: [Update with your link]\n- Project Timeline: [Update with your link]\n- Contact List: [Update with your link]\n\nPlease update your profile and set up notifications!`
    },
    { 
      id: '2', 
      name: 'project-management', 
      description: 'Project planning, timelines, and task coordination', 
      isPrivate: false, 
      topic: 'Integrated with Trello for task tracking',
      pinnedMessage: '📋 Trello Board: [Your Trello Link]\nAll tasks and project cards are tracked in Trello.'
    },
    { 
      id: '3', 
      name: 'development', 
      description: 'Technical discussions and development updates', 
      isPrivate: false, 
      topic: 'Integrated with GitHub for code updates',
      pinnedMessage: `🔧 Development Resources:\n- GitHub Repo: [Your GitHub Link]\n- Dev Environment Setup: [Documentation Link]\n- Coding Standards: [Standards Link]`
    },
    { id: '4', name: 'bugs', description: 'Bug reports and issue tracking', isPrivate: false, topic: 'Report bugs here - include steps to reproduce' },
    { id: '5', name: 'knowledgebase', description: 'Project documentation, guides, and resources', isPrivate: false, topic: 'Centralized knowledge and documentation' },
    { id: '6', name: 'meetings', description: 'Meeting schedules, agendas, and notes', isPrivate: false, topic: 'All meeting-related discussions and scheduling' },
    { id: '7', name: 'launch', description: 'Launch planning and coordination', isPrivate: false, topic: 'Everything related to project launch and go-live' },
    { id: '8', name: 'testing', description: 'QA, testing procedures, and test results', isPrivate: false, topic: 'Testing coordination and bug verification' },
    { id: '9', name: 'ui-ux', description: 'Design discussions, mockups, and UX decisions', isPrivate: false, topic: 'UI/UX design collaboration and feedback' },
    { id: '10', name: 'demos', description: 'Demo schedules, recordings, and feedback', isPrivate: false, topic: 'Product demonstrations and client presentations' },
    { id: '11', name: 'documentation', description: 'Technical documentation and API references', isPrivate: false, topic: 'Project technical documentation and guides' },
  ]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([
    { id: '1', email: '' }
  ]);

  const testSlackToken = async () => {
    if (!slackToken) {
      toast.error('Please enter a token first');
      return;
    }

    setIsTestingToken(true);
    setTokenStatus('untested');
    
    try {
      const response = await fetch('/api/slack/test-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slackToken })
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        setTokenStatus('valid');
        setWorkspaceInfo({
          team: data.team,
          user: data.user
        });
        toast.success(`Token valid! Connected to ${data.team}`);
      } else {
        setTokenStatus('invalid');
        setWorkspaceInfo(null);
        toast.error(data.error || 'Invalid token');
      }
    } catch (error) {
      setTokenStatus('invalid');
      setWorkspaceInfo(null);
      toast.error('Failed to test token');
    } finally {
      setIsTestingToken(false);
    }
  };

  const addChannel = () => {
    const newChannel: Channel = {
      id: Date.now().toString(),
      name: '',
      description: '',
      isPrivate: false
    };
    setChannels([...channels, newChannel]);
  };

  const updateChannel = (id: string, updates: Partial<Channel>) => {
    setChannels(channels.map(ch => 
      ch.id === id ? { ...ch, ...updates } : ch
    ));
  };

  const removeChannel = (id: string) => {
    setChannels(channels.filter(ch => ch.id !== id));
  };

  const addTeamMember = () => {
    const newMember: TeamMember = {
      id: Date.now().toString(),
      email: ''
    };
    setTeamMembers([...teamMembers, newMember]);
  };

  const updateTeamMember = (id: string, updates: Partial<TeamMember>) => {
    setTeamMembers(teamMembers.map(member => 
      member.id === id ? { ...member, ...updates } : member
    ));
  };

  const removeTeamMember = (id: string) => {
    setTeamMembers(teamMembers.filter(member => member.id !== id));
  };

  // Check for existing project
  const checkExistingProject = () => {
    const existingProjects = JSON.parse(localStorage.getItem('slackProjects') || '[]');
    return existingProjects.find(
      (p: any) => p.name === workspaceName || (slackToken && p.slackToken === slackToken)
    );
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/slack/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceName,
          slackToken,
          channels: channels.filter(ch => ch.name),
          teamMembers: teamMembers.filter(tm => tm.email)
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        // Show appropriate success message based on results
        const { results } = data;
        
        if (results.invitations?.failed?.length > 0) {
          toast.error(`Some users not found: ${results.invitations.failed.map((f: any) => f.email).join(', ')}`, {
            duration: 6000,
          });
        }
        
        if (results.invitations?.sent?.length > 0) {
          const successCount = results.invitations.sent.length;
          toast.success(`Added ${successCount} user(s) to all channels!`, {
            duration: 5000,
          });
        } else if (teamMembers.filter(tm => tm.email).length === 0) {
          toast.success('Workspace channels configured successfully!');
        }
        
        // Save project to localStorage
        const existingProjects = JSON.parse(localStorage.getItem('slackProjects') || '[]');
        
        // Check if a project with the same name already exists
        const existingProjectIndex = existingProjects.findIndex(
          (p: any) => p.name === workspaceName || p.slackToken === slackToken
        );
        
        const project = {
          id: existingProjectIndex >= 0 ? existingProjects[existingProjectIndex].id : Date.now().toString(),
          name: workspaceName,
          createdAt: existingProjectIndex >= 0 ? existingProjects[existingProjectIndex].createdAt : new Date().toISOString(),
          channelCount: channels.filter(ch => ch.name).length,
          memberCount: teamMembers.filter(tm => tm.email).length,
          status: 'active' as const,
          channels: data.results.channels.created.map((ch: string) => ch.replace(' (already exists)', '')),
          teamMembers: teamMembers.filter(tm => tm.email),
          slackToken: slackToken,
          channelDetails: channels.filter(ch => ch.name)
        };
        
        if (existingProjectIndex >= 0) {
          // Update existing project
          existingProjects[existingProjectIndex] = project;
          toast.info('Updated existing project configuration');
        } else {
          // Add new project
          existingProjects.push(project);
        }
        
        localStorage.setItem('slackProjects', JSON.stringify(existingProjects));
        
        // Reset form
        setStep(1);
        setWorkspaceName('');
        setSlackToken('');
        setTokenStatus('untested');
        setWorkspaceInfo(null);
        
        // Switch to existing projects tab
        if (onComplete) {
          onComplete();
        }
      } else {
        toast.error(data.error || 'Setup failed');
      }
    } catch (error) {
      toast.error('Failed to setup workspace');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-5xl mx-auto">
      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center">
              <div className={`
                w-10 h-10 rounded-full flex items-center justify-center font-medium
                ${step >= i ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}
              `}>
                {i}
              </div>
              {i < 4 && (
                <div className={`w-full h-1 mx-2 ${
                  step > i ? 'bg-blue-600' : 'bg-gray-200'
                }`} />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-2">
          <span className="text-sm text-gray-600">Basics</span>
          <span className="text-sm text-gray-600">Channels</span>
          <span className="text-sm text-gray-600">Team</span>
          <span className="text-sm text-gray-600">Review</span>
        </div>
      </div>

      {/* Step 1: Basic Info */}
      {step === 1 && (
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold mb-4">Basic Information</h2>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Project/Workspace Name
            </label>
            <input
              type="text"
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., Client Project Alpha"
            />
            {workspaceName && checkExistingProject() && (
              <p className="mt-1 text-sm text-amber-600">
                ⚠️ A project with this name already exists. It will be updated.
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Slack Bot Token
            </label>
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="password"
                  value={slackToken}
                  onChange={(e) => {
                    setSlackToken(e.target.value);
                    setTokenStatus('untested'); // Reset status when token changes
                  }}
                  className={`flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    tokenStatus === 'valid' ? 'border-green-500 bg-green-50' : 
                    tokenStatus === 'invalid' ? 'border-red-500 bg-red-50' : 
                    'border-gray-300'
                  }`}
                  placeholder="xoxb-your-token-here"
                />
                <button
                  onClick={testSlackToken}
                  disabled={isTestingToken || !slackToken}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isTestingToken ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    'Test Token'
                  )}
                </button>
              </div>
              
              {tokenStatus === 'valid' && workspaceInfo && (
                <div className="bg-green-100 border border-green-300 rounded-lg p-3">
                  <p className="text-sm text-green-800">
                    ✅ Token valid! Connected to <strong>{workspaceInfo.team}</strong> as <strong>{workspaceInfo.user}</strong>
                  </p>
                </div>
              )}
              
              {tokenStatus === 'invalid' && (
                <div className="bg-red-100 border border-red-300 rounded-lg p-3">
                  <p className="text-sm text-red-800">
                    ❌ Invalid token. Please check your token and try again.
                  </p>
                </div>
              )}
              
              <p className="text-sm text-gray-500">
                Get this from your Slack app settings. Testing is optional but recommended.
              </p>
            </div>
          </div>

          <button
            onClick={() => setStep(2)}
            disabled={!workspaceName || !slackToken}
            className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next: Configure Channels
          </button>
        </div>
      )}

      {/* Step 2: Channels */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold">Configure Channels</h2>
            <button
              onClick={addChannel}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Channel
            </button>
          </div>

          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
            {channels.map((channel) => (
              <div key={channel.id} className="border border-gray-200 rounded-lg p-6 bg-gray-50">
                <div className="space-y-4">
                  {/* Header Row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {channel.isPrivate ? (
                        <Lock className="w-5 h-5 text-gray-600" />
                      ) : (
                        <Hash className="w-5 h-5 text-gray-600" />
                      )}
                      <input
                        type="text"
                        value={channel.name}
                        onChange={(e) => updateChannel(channel.id, { name: e.target.value })}
                        className="text-lg font-semibold px-3 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                        placeholder="channel-name"
                      />
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={channel.isPrivate}
                          onChange={(e) => updateChannel(channel.id, { isPrivate: e.target.checked })}
                          className="rounded text-blue-600"
                        />
                        <span className="text-sm">Private</span>
                      </label>
                      
                      <button
                        onClick={() => removeChannel(channel.id)}
                        className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={channel.description}
                      onChange={(e) => updateChannel(channel.id, { description: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
                      placeholder="What's this channel for?"
                      rows={2}
                    />
                  </div>

                  {/* Topic */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Channel Topic
                    </label>
                    <input
                      type="text"
                      value={channel.topic || ''}
                      onChange={(e) => updateChannel(channel.id, { topic: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Brief topic that appears at the top of the channel"
                    />
                  </div>

                  {/* Pinned Message */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Pinned Message (Optional)
                    </label>
                    <textarea
                      value={channel.pinnedMessage || ''}
                      onChange={(e) => updateChannel(channel.id, { pinnedMessage: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none font-mono text-sm"
                      placeholder="Important message to pin in this channel"
                      rows={3}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-4 sticky bottom-0 bg-white pt-4">
            <button
              onClick={() => setStep(1)}
              className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
            >
              Back
            </button>
            <button
              onClick={() => setStep(3)}
              className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Next: Add Team
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Team Members */}
      {step === 3 && (
        <div className="space-y-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold">Add Team Members to Channels</h2>
            <button
              onClick={addTeamMember}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Users className="w-4 h-4" />
              Add Member
            </button>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <h3 className="font-semibold text-blue-900 mb-2">How this works:</h3>
            <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
              <li>First, invite users to your Slack workspace manually</li>
              <li>Once they've joined, enter their email addresses here</li>
              <li>This tool will automatically add them to ALL channels created</li>
            </ol>
            <p className="text-sm text-blue-700 mt-2 font-medium">
              ⚠️ Make sure users have already joined the workspace before adding them here!
            </p>
          </div>

          <div className="space-y-3">
            {teamMembers.map((member) => (
              <div key={member.id} className="flex gap-2">
                <input
                  type="email"
                  value={member.email}
                  onChange={(e) => updateTeamMember(member.id, { email: e.target.value })}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="user@company.com (must match their Slack email)"
                />
                <button
                  onClick={() => removeTeamMember(member.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => setStep(2)}
              className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
            >
              Back
            </button>
            <button
              onClick={() => setStep(4)}
              className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Review Setup
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Review */}
      {step === 4 && (
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold mb-4">Review & Deploy</h2>
          
          <div className="bg-gray-50 rounded-lg p-6 space-y-4">
            <div>
              <h3 className="font-semibold text-gray-700">Workspace</h3>
              <p className="text-gray-600">{workspaceName}</p>
            </div>
            
            <div>
              <h3 className="font-semibold text-gray-700">Channels ({channels.filter(ch => ch.name).length})</h3>
              <div className="mt-2 space-y-3">
                {channels.filter(ch => ch.name).map(ch => (
                  <div key={ch.id} className="bg-white p-3 rounded-lg border border-gray-200">
                    <div className="font-medium text-gray-900">
                      {ch.isPrivate ? '🔒' : '#'} {ch.name}
                    </div>
                    {ch.description && (
                      <p className="text-sm text-gray-600 mt-1">{ch.description}</p>
                    )}
                    {ch.topic && (
                      <p className="text-sm text-gray-500 mt-1">
                        <span className="font-medium">Topic:</span> {ch.topic}
                      </p>
                    )}
                    {ch.pinnedMessage && (
                      <p className="text-sm text-gray-500 mt-1">
                        <span className="font-medium">Pinned:</span> {ch.pinnedMessage.substring(0, 50)}...
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <h3 className="font-semibold text-gray-700">Team Members to Add ({teamMembers.filter(tm => tm.email).length})</h3>
              {teamMembers.filter(tm => tm.email).length > 0 ? (
                <>
                  <ul className="text-gray-600 list-disc list-inside">
                    {teamMembers.filter(tm => tm.email).map(tm => (
                      <li key={tm.id}>{tm.email}</li>
                    ))}
                  </ul>
                  <p className="text-sm text-gray-500 mt-2">
                    These users will be added to ALL channels if they exist in the workspace
                  </p>
                </>
              ) : (
                <p className="text-gray-500 text-sm">No team members to add</p>
              )}
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => setStep(3)}
              className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
            >
              Back
            </button>
            <button
              onClick={handleSubmit}
              disabled={isLoading}
              className="flex-1 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Configuring...
                </>
              ) : (
                'Configure Workspace & Add Users'
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}