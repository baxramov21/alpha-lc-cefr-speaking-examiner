import { NextRequest, NextResponse } from 'next/server';
import { getModelConfig, updateModelConfig } from '@/lib/modelHelper';

export async function GET() {
  try {
    const config = await getModelConfig();
    return NextResponse.json(config);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch model config' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Basic validation
    if (!body.part_model || !body.final_model) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await updateModelConfig({
      part_model: body.part_model,
      final_model: body.final_model,
      writing_time_minutes: body.writing_time_minutes ? parseInt(body.writing_time_minutes, 10) : 60,
      reading_time_minutes: body.reading_time_minutes ? parseInt(body.reading_time_minutes, 10) : 60,
      listening_repetitions: body.listening_repetitions ? parseInt(body.listening_repetitions, 10) : 2,
      full_exam_mode_enabled: body.full_exam_mode_enabled ?? false,
      full_exam_sequence: body.full_exam_sequence || ['speaking', 'listening', 'reading', 'writing']
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating model config:', error);
    return NextResponse.json({ error: 'Failed to update model config' }, { status: 500 });
  }
}
