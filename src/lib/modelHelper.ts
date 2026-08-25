import { supabaseAdmin } from '@/lib/supabase';

export interface ModelConfig {
  part_model: string;
  final_model: string;
  writing_time_minutes?: number;
  reading_time_minutes?: number;
  listening_repetitions?: number;
  full_exam_mode_enabled?: boolean;
  full_exam_sequence?: string[];
  tts_voice?: string;
}

export async function getModelConfig(): Promise<ModelConfig> {
  try {
    const { data, error } = await supabaseAdmin
      .from('app_settings')
      .select('value')
      .eq('key', 'model_config')
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching model config from Supabase:', error);
    }

    if (data?.value) {
      return applyFallbackLogic(data.value as ModelConfig);
    }
  } catch (error) {
    console.error('Failed to get model config from Supabase:', error);
  }

  // Return defaults if database record is missing or error occurs
  return applyFallbackLogic({
    part_model: 'gemini-2.5-flash',
    final_model: 'gemini-2.5-flash',
    writing_time_minutes: 60,
    reading_time_minutes: 60,
    listening_repetitions: 2,
    full_exam_mode_enabled: false,
    full_exam_sequence: ['speaking', 'listening', 'reading', 'writing'],
    tts_voice: 'uk_male'
  });
}

export async function updateModelConfig(config: ModelConfig): Promise<void> {
  const { error } = await supabaseAdmin
    .from('app_settings')
    .upsert({
      key: 'model_config',
      value: config,
      updated_at: new Date().toISOString()
    }, { onConflict: 'key' });

  if (error) {
    console.error('Error saving model config to Supabase:', error);
    throw new Error('Failed to save to database');
  }
}

function applyFallbackLogic(config: ModelConfig): ModelConfig {
  return {
    ...config,
    writing_time_minutes: config.writing_time_minutes || 60,
    reading_time_minutes: config.reading_time_minutes || 60,
    listening_repetitions: config.listening_repetitions || 2,
    full_exam_mode_enabled: config.full_exam_mode_enabled ?? false,
    full_exam_sequence: config.full_exam_sequence || ['speaking', 'listening', 'reading', 'writing'],
    tts_voice: config.tts_voice || 'uk_male'
  };
}
