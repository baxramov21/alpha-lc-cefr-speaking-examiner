import { NextResponse } from 'next/server';
import { getModelConfig } from '@/lib/modelHelper';

export async function GET() {
  try {
    const config = await getModelConfig();
    return NextResponse.json({
      writing_time_minutes: config.writing_time_minutes || 60,
      listening_repetitions: config.listening_repetitions || 2
    });
  } catch (error) {
    return NextResponse.json({
      writing_time_minutes: 60,
      listening_repetitions: 2
    });
  }
}
