// app/api/slack/setup/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { WebClient } from '@slack/web-api';

interface SetupRequest {
  workspaceName: string;
  slackToken: string;
  channels: Array<{
    name: string;
    description: string;
    isPrivate: boolean;
    topic?: string;
    pinnedMessage?: string;
  }>;
  teamMembers: Array<{
    email: string;
  }>;
}

export async function POST(request: NextRequest) {
  try {
    const body: SetupRequest = await request.json();
    const { slackToken, channels, teamMembers, workspaceName } = body;

    // Initialize Slack client
    const slack = new WebClient(slackToken);

    // Verify token
    try {
      await slack.auth.test();
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid Slack token' },
        { status: 401 }
      );
    }

    const results = {
      channels: { created: [], failed: [] },
      invitations: { sent: [], failed: [] }
    };

    // Create channels
    for (const channel of channels) {
      try {
        const response = await slack.conversations.create({
          name: channel.name,
          is_private: channel.isPrivate
        });

        const channelId = response.channel?.id;
        
        if (channelId) {
          // Set channel purpose/description
          if (channel.description) {
            await slack.conversations.setPurpose({
              channel: channelId,
              purpose: channel.description
            });
          }

          // Set topic if provided
          if (channel.topic) {
            await slack.conversations.setTopic({
              channel: channelId,
              topic: channel.topic
            });
          }

          // Post and pin message if provided
          if (channel.pinnedMessage) {
            const message = await slack.chat.postMessage({
              channel: channelId,
              text: channel.pinnedMessage
            });

            if (message.ts) {
              await slack.pins.add({
                channel: channelId,
                timestamp: message.ts
              });
            }
          }

          results.channels.created.push(channel.name);
        }
      } catch (error: any) {
        if (error.data?.error === 'name_taken') {
          results.channels.created.push(`${channel.name} (already exists)`);
        } else {
          results.channels.failed.push({
            name: channel.name,
            error: error.data?.error || 'Unknown error'
          });
        }
      }
    }

    // Add team members to channels
    if (teamMembers.length > 0 && results.channels.created.length > 0) {
      // Get all users in the workspace
      const usersResponse = await slack.users.list();
      const workspaceUsers = usersResponse.members || [];
      
      // Match team members by email
      for (const member of teamMembers) {
        const slackUser = workspaceUsers.find(
          u => u.profile?.email === member.email && !u.is_bot && !u.deleted
        );
        
        if (slackUser) {
          // Add this user to all created channels
          let addedToChannels = 0;
          let failedChannels = 0;
          
          for (const channelName of results.channels.created) {
            try {
              // Get channel ID from name
              const channelsResponse = await slack.conversations.list();
              const channel = channelsResponse.channels?.find(ch => ch.name === channelName.replace(' (already exists)', ''));
              
              if (channel) {
                await slack.conversations.invite({
                  channel: channel.id,
                  users: slackUser.id
                });
                addedToChannels++;
              }
            } catch (error: any) {
              if (error.data?.error !== 'already_in_channel') {
                failedChannels++;
              } else {
                addedToChannels++; // Count as success if already in channel
              }
            }
          }
          
          results.invitations.sent.push({
            email: member.email,
            note: `Added to ${addedToChannels} channels`
          });
        } else {
          results.invitations.failed.push({
            email: member.email,
            error: 'User not found in workspace - invite them first'
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      workspaceName,
      results,
      message: results.invitations.failed.length > 0 
        ? 'Channels created. Some users were not found - make sure they have joined the workspace first.'
        : 'Workspace configured successfully!'
    });

  } catch (error: any) {
    console.error('Setup error:', error);
    return NextResponse.json(
      { error: 'Failed to setup workspace', details: error.message },
      { status: 500 }
    );
  }
}