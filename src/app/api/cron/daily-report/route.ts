import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    // 1. Verify CRON_SECRET
    const authHeader = req.headers.get('authorization');
    const expectedSecret = process.env.CRON_SECRET;
    
    if (!expectedSecret) {
      return NextResponse.json({ error: 'CRON_SECRET is not configured on the server.' }, { status: 500 });
    }
    
    if (authHeader !== `Bearer ${expectedSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Fetch today's submissions
    // We want submissions from the beginning of today (local time/UTC depending on how DB stores it).
    // Supabase stores timestamps in UTC.
    // Let's get the last 24 hours to be safe.
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: submissions, error: submissionsError } = await supabaseAdmin
      .from('submissions')
      .select('id, created_at, overall_score, evaluation_data')
      .gte('created_at', oneDayAgo);

    if (submissionsError) {
      throw submissionsError;
    }

    // 3. Calculate statistics
    const totalExams = submissions?.length || 0;
    
    let totalScore = 0;
    let speakingCount = 0;
    let readingCount = 0;
    let writingCount = 0;
    let listeningCount = 0;

    submissions?.forEach(sub => {
      totalScore += (sub.overall_score || 0);
      
      const examType = sub.evaluation_data?.examType || 'speaking'; // default to speaking for older records
      if (examType === 'speaking') speakingCount++;
      else if (examType === 'reading') readingCount++;
      else if (examType === 'writing') writingCount++;
      else if (examType === 'listening') listeningCount++;
    });

    const averageScore = totalExams > 0 ? (totalScore / totalExams).toFixed(1) : 0;

    // 4. Fetch Telegram config from app_settings
    const { data: configData, error: configError } = await supabaseAdmin
      .from('app_settings')
      .select('value')
      .eq('key', 'telegram_config')
      .single();

    if (configError || !configData || !configData.value) {
      console.warn('Daily Report: Telegram config not found.');
      return NextResponse.json({ error: 'Telegram config not found in DB.' }, { status: 400 });
    }

    const { telegram_bot_token, telegram_chat_id } = configData.value;
    if (!telegram_bot_token || !telegram_chat_id) {
      return NextResponse.json({ error: 'Incomplete Telegram config.' }, { status: 400 });
    }

    // 5. Format the message
    let message = `📈 <b>Daily Exam Report</b>\n`;
    message += `📅 <b>Date:</b> ${new Date().toLocaleDateString('en-US', { timeZone: 'Asia/Tashkent' })}\n\n`;
    message += `👥 <b>Total Exams Today:</b> ${totalExams}\n`;
    if (totalExams > 0) {
      message += `🎯 <b>Average Score:</b> ${averageScore}\n\n`;
      message += `<b>Breakdown by Type:</b>\n`;
      message += `🗣 Speaking: ${speakingCount}\n`;
      message += `📖 Reading: ${readingCount}\n`;
      message += `🎧 Listening: ${listeningCount}\n`;
      message += `✍️ Writing: ${writingCount}\n`;
    } else {
      message += `\nNo exams were taken today.`;
    }

    // 6. Send to Telegram
    const res = await fetch(`https://api.telegram.org/bot${telegram_bot_token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: telegram_chat_id,
        text: message,
        parse_mode: 'HTML'
      })
    });

    const resJson = await res.json();
    if (!resJson.ok) {
      throw new Error(`Telegram API Error: ${resJson.description}`);
    }

    return NextResponse.json({ success: true, message: 'Report sent successfully' });
  } catch (error: any) {
    console.error('Daily Report Error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
