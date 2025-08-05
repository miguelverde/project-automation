// app/api/slack/sync-projects/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { WebClient } from '@slack/web-api';

export async function POST(request: NextRequest) {
  try {
    const { projects } = await request.json();

    if (!projects || !Array.isArray(projects)) {
      return NextResponse.json(
        { error: 'Invalid projects data' },
        { status: 400 }
      );
    }

    const syncResults = await Promise.all(
      projects.map(async (project) => {
        if (!project.slackToken) {
          return { ...project, syncStatus: 'no-token' };
        }

        try {
          const slack = new WebClient(project.slackToken);
          
          // Test if token is still valid
          const authTest = await slack.auth.test();
          
          // Get all channels from Slack
          const channelsResponse = await slack.conversations.list({
            types: 'public_channel,private_channel',
            exclude_archived: false, // Include archived to detect them
            limit: 1000
          });

          const slackChannels = channelsResponse.channels || [];
          
          // Check which project channels still exist
          const existingChannels = project.channels.filter(channelName => {
            const slackChannel = slackChannels.find(ch => ch.name === channelName);
            return slackChannel && !slackChannel.is_archived;
          });

          // Count active channels
          const activeChannelCount = existingChannels.length;
          const archivedCount = project.channels.length - activeChannelCount;

          return {
            ...project,
            channels: existingChannels,
            channelCount: activeChannelCount,
            syncStatus: 'success',
            lastSynced: new Date().toISOString(),
            archivedChannels: archivedCount,
            teamName: authTest.team || project.name,
            status: activeChannelCount > 0 ? 'active' : 'archived'
          };
        } catch (error: any) {
          // Token invalid or workspace deleted
          if (error.data?.error === 'invalid_auth' || 
              error.data?.error === 'account_inactive' ||
              error.data?.error === 'token_revoked') {
            return {
              ...project,
              syncStatus: 'invalid-token',
              status: 'archived',
              lastSynced: new Date().toISOString()
            };
          }
          
          return {
            ...project,
            syncStatus: 'error',
            error: error.message
          };
        }
      })
    );

    return NextResponse.json({
      success: true,
      projects: syncResults,
      summary: {
        total: syncResults.length,
        active: syncResults.filter(p => p.status === 'active').length,
        archived: syncResults.filter(p => p.status === 'archived').length,
        errors: syncResults.filter(p => p.syncStatus === 'error').length
      }
    });

  } catch (error: any) {
    console.error('Sync error:', error);
    return NextResponse.json(
      { error: 'Failed to sync projects', details: error.message },
      { status: 500 }
    );
  }
}