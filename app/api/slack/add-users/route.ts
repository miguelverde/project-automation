// app/api/slack/add-users/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { WebClient } from '@slack/web-api';

export async function POST(request: NextRequest) {
  try {
    const { slackToken, emails, channels } = await request.json();

    if (!slackToken || !emails || !channels) {
      return NextResponse.json(
        { error: 'Missing required fields' },
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

    const results = {
      success: [] as string[],
      failed: [] as string[]
    };

    // Get all users in workspace
    const usersResponse = await slack.users.list();
    const workspaceUsers = usersResponse.members || [];

    // Get all channels
    const channelsList = await slack.conversations.list();
    const workspaceChannels = channelsList.channels || [];

    // Process each email
    for (const email of emails) {
      const user = workspaceUsers.find(
        u => u.profile?.email === email && !u.is_bot && !u.deleted
      );

      if (!user) {
        results.failed.push(email);
        continue;
      }

      let addedToAnyChannel = false;

      // Add user to each channel
      for (const channelName of channels) {
        const channel = workspaceChannels.find(ch => ch.name === channelName);
        
        if (channel) {
          try {
            await slack.conversations.invite({
              channel: channel.id,
              users: user.id
            });
            addedToAnyChannel = true;
          } catch (error: any) {
            // Already in channel is not an error
            if (error.data?.error === 'already_in_channel') {
              addedToAnyChannel = true;
            }
          }
        }
      }

      if (addedToAnyChannel) {
        results.success.push(email);
      } else {
        results.failed.push(email);
      }
    }

    return NextResponse.json({
      success: true,
      results,
      message: results.failed.length > 0
        ? `Added ${results.success.length} users. Failed: ${results.failed.join(', ')}`
        : `Successfully added ${results.success.length} users to channels`
    });

  } catch (error: any) {
    console.error('Add users error:', error);
    return NextResponse.json(
      { error: 'Failed to add users', details: error.message },
      { status: 500 }
    );
  }
}