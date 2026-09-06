import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const { programme = 'CEFR' } = await req.json().catch(() => ({ programme: 'CEFR' }));

    // Fetch all questions for the specified programme
    const { data: questions, error } = await supabase
      .from('questions')
      .select('id, text, created_at')
      .eq('programme', programme)
      .order('created_at', { ascending: true }); // older first

    if (error) {
      throw error;
    }

    if (!questions || questions.length === 0) {
      return NextResponse.json({ success: true, deleted: 0 }, { status: 200 });
    }

    // Group by normalized text
    const textGroups: Record<string, string[]> = {};
    for (const q of questions) {
      const normalized = q.text.trim().toLowerCase().replace(/\s+/g, ' ');
      if (!textGroups[normalized]) {
        textGroups[normalized] = [];
      }
      textGroups[normalized].push(q.id);
    }

    // Identify duplicates (keep the first/oldest one, delete the rest)
    const idsToDelete: string[] = [];
    for (const normalizedText in textGroups) {
      const ids = textGroups[normalizedText];
      if (ids.length > 1) {
        // Keep the first element, mark others for deletion
        idsToDelete.push(...ids.slice(1));
      }
    }

    if (idsToDelete.length === 0) {
      return NextResponse.json({ success: true, deleted: 0 }, { status: 200 });
    }

    // Delete duplicates in chunks (Supabase limits URL length for large IN queries, but usually a few hundred is fine)
    const chunkSize = 100;
    let deletedCount = 0;
    for (let i = 0; i < idsToDelete.length; i += chunkSize) {
      const chunk = idsToDelete.slice(i, i + chunkSize);
      const { error: deleteError } = await supabase
        .from('questions')
        .delete()
        .in('id', chunk);

      if (deleteError) {
        throw deleteError;
      }
      deletedCount += chunk.length;
    }

    return NextResponse.json({ success: true, deleted: deletedCount }, { status: 200 });

  } catch (error: any) {
    console.error('Error cleaning duplicates:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
