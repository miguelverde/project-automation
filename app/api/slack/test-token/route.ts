// app/api/slack/test-token/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { WebClient } from '@slack/web-api';

export async function POST(request: NextRequest) {
  try {
    const { slackToken } = await request.json();

    if (!slackToken) {
      return NextResponse.json(
        { success: false, error: 'No token provided' },
        { status: 400 }
      );
    }

    // Initialize Slack client
    const slack = new WebClient(slackToken);

    // Test the token
    try {
      const authResult = await slack.auth.test();
      
      return NextResponse.json({
        success: true,
        team: authResult.team || 'Unknown Team',
        user: authResult.user || 'Unknown User',
        team_id: authResult.team_id,
        user_id: authResult.user_id
      });
    } catch (error: any) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid token or insufficient permissions' 
        },
        { status: 401 }
      );
    }

  } catch (error: any) {
    console.error('Token test error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to test token',
        details: error.message 
      },
      { status: 500 }
    );
  }
}