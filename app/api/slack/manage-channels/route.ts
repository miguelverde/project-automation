// app/api/slack/manage-channels/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { WebClient } from '@slack/web-api';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { slackToken, action, channel, channelName } = body;

    if (!slackToken) {
      return NextResponse.json(
        { error: 'No token provided' },
        { status: 400 }
      );
    }

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

    if (action === 'create') {
      // Create new channel
      try {
        const response = await slack.conversations.create({
          name: channel.name,
          is_private: false
        });

        const channelId = response.channel?.id;
        
        if (channelId && channel.description) {
          await slack.conversations.setPurpose({
            channel: channelId,
            purpose: channel.description
          });
        }

        return NextResponse.json({
          success: true,
          channel: response.channel
        });
        
      } catch (error: any) {
        if (error.data?.error === 'name_taken') {
          return NextResponse.json(
            { error: 'Channel already exists' },
            { status: 400 }
          );
        }
        throw error;
      }
      
    } else if (action === 'archive') {
      // Archive channel
      try {
        // First, find the channel ID
        const channelsList = await slack.conversations.list();
        const channelToArchive = channelsList.channels?.find(
          ch => ch.name === channelName
        );

        if (!channelToArchive) {
          return NextResponse.json(
            { error: 'Channel not found' },
            { status: 404 }
          );
        }

        await slack.conversations.archive({
          channel: channelToArchive.id
        });

        return NextResponse.json({
          success: true,
          message: 'Channel archived'
        });
        
      } catch (error: any) {
        if (error.data?.error === 'already_archived') {
          return NextResponse.json(
            { error: 'Channel is already archived' },
            { status: 400 }
          );
        }
        throw error;
      }
      
    } else {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      );
    }

  } catch (error: any) {
    console.error('Channel management error:', error);
    return NextResponse.json(
      { error: 'Failed to manage channel', details: error.message },
      { status: 500 }
    );
  }
}