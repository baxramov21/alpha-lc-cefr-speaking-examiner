import fs from 'fs/promises';
import path from 'path';

export interface ModelConfig {
  part_model: string;
  final_model: string;
  writing_time_minutes?: number;
  reading_time_minutes?: number;
  listening_repetitions?: number;
}

const CONFIG_PATH = path.join(process.cwd(), 'src', 'config', 'models.json');

export async function getModelConfig(): Promise<ModelConfig> {
  try {
    const fileContents = await fs.readFile(CONFIG_PATH, 'utf-8');
    const config = JSON.parse(fileContents) as ModelConfig;
    return applyFallbackLogic(config);
  } catch (error) {
    // Return defaults if file is missing or unreadable
    return applyFallbackLogic({
      part_model: 'gemini-2.5-flash-lite',
      final_model: 'gemini-2.5-flash',
      writing_time_minutes: 60,
      reading_time_minutes: 60,
      listening_repetitions: 2
    });
  }
}

export async function updateModelConfig(config: ModelConfig): Promise<void> {
  await fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
}

function applyFallbackLogic(config: ModelConfig): ModelConfig {
  // Auto-fallback to 3.5 series on October 19, 2026
  const fallbackDate = new Date('2026-10-19T00:00:00Z');
  const now = new Date();

  if (now >= fallbackDate) {
    return {
      part_model: 'gemini-3.5-flash-lite',
      final_model: 'gemini-3.5-flash-lite',
      writing_time_minutes: config.writing_time_minutes || 60,
      reading_time_minutes: config.reading_time_minutes || 60,
      listening_repetitions: config.listening_repetitions || 2
    };
  }

  return {
    ...config,
    writing_time_minutes: config.writing_time_minutes || 60,
    reading_time_minutes: config.reading_time_minutes || 60,
    listening_repetitions: config.listening_repetitions || 2
  };
}
