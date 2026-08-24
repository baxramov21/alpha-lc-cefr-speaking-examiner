import { supabase } from './supabase';

interface QuestionData {
  id: string;
  text: string;
  imageUrl?: string;
  part?: string;
}

interface AudioFile {
  buffer: Buffer;
  mimeType: string;
  groupId: string;
}

// Helper to retry fetch on network failures (e.g. ETIMEDOUT)
async function fetchWithRetry(url: string, options: any, retries = 3): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      // 30 second timeout per attempt
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      
      const res = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeoutId);
      
      if (!res.ok) {
        console.warn(`Telegram fetch non-ok status: ${res.status} on attempt ${i + 1}`);
      }
      return res;
    } catch (err: any) {
      if (i === retries - 1) throw err;
      console.log(`Telegram fetch failed, retrying (${i + 1}/${retries})... Error: ${err.message}`);
      await new Promise(resolve => setTimeout(resolve, 2000 * (i + 1)));
    }
  }
  throw new Error('Unreachable');
}

export async function sendFinalSpeakingEvaluationToTelegram(
  studentName: string,
  evaluationJSON: any,
  questions: QuestionData[],
  audioFiles: AudioFile[]
) {
  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'telegram_config')
      .single();

    if (error || !data || !data.value) {
      console.warn('Telegram Dispatch: Config not found or DB error.', error?.message);
      return;
    }

    const { telegram_bot_token, telegram_chat_id } = data.value;
    if (!telegram_bot_token || !telegram_chat_id) return;

    const totalScore = evaluationJSON.total_score || 0;
    const fluency = evaluationJSON.fluency_score || 0;
    const lexical = evaluationJSON.lexical_score || 0;
    const grammar = evaluationJSON.grammar_score || 0;
    const pronunciation = evaluationJSON.pronunciation_score || 0;

    // 1. Build summary caption
    let caption = `🎙 <b>Speaking Exam Final</b>\n👤 <b>Student:</b> ${studentName}\n📝 <b>Total Score:</b> ${totalScore}/75\n`;
    caption += `📊 <b>F:</b> ${fluency} | <b>L:</b> ${lexical} | <b>G:</b> ${grammar} | <b>P:</b> ${pronunciation}\n`;
    caption += `⏰ <b>Time:</b> ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Tashkent' })}\n`;
    
    // 2. Determine if we have an image
    const questionWithImage = questions.find(q => q.imageUrl);
    let summaryMessageId: string | undefined;

    if (questionWithImage) {
      // Send Photo
      const formData = new FormData();
      formData.append('chat_id', telegram_chat_id);
      formData.append('photo', questionWithImage.imageUrl!);
      formData.append('caption', caption);
      formData.append('parse_mode', 'HTML');

      const res = await fetchWithRetry(`https://api.telegram.org/bot${telegram_bot_token}/sendPhoto`, {
        method: 'POST',
        body: formData
      });
      const resJson = await res.json();
      if (resJson.ok) summaryMessageId = resJson.result.message_id;
    } else {
      // Send Text Message
      const res = await fetchWithRetry(`https://api.telegram.org/bot${telegram_bot_token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: telegram_chat_id,
          text: caption,
          parse_mode: 'HTML'
        })
      });
      const resJson = await res.json();
      if (resJson.ok) summaryMessageId = resJson.result.message_id;
    }

    // 3. Send Voice Notes
    // The audios are grouped. For each grouped audio, we find the corresponding questions.
    for (const audio of audioFiles) {
      const extension = 'ogg';
      const filename = `${studentName.replace(/[^a-z0-9]/gi, '_')}_${audio.groupId}.${extension}`;
      
      const getGroupId = (q: any) => `${q.part}_${q.imageUrl ? 'withImage' : 'noImage'}`;
      const groupQuestions = questions.filter(q => getGroupId(q) === audio.groupId);
      
      let audioCaption = `🎙 <b>Speaking Recording</b>\n`;
      audioCaption += `👤 <b>Student:</b> ${studentName}\n`;
      if (groupQuestions.length > 0) {
        audioCaption += `📝 <b>Part:</b> ${groupQuestions[0].part || '?'}\n`;
        audioCaption += `<b>Questions:</b>\n`;
        for (const q of groupQuestions) {
          audioCaption += `- ${q.text}\n`;
        }
      }
      audioCaption += `⏰ <b>Time:</b> ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Tashkent' })}`;

      let targetReplyId = summaryMessageId;

      // Find if any question in this group has an image
      const firstImageQ = groupQuestions.find(q => q.imageUrl);

      // If the group has an image, send it as a Photo message first
      if (firstImageQ) {
        const photoFormData = new FormData();
        photoFormData.append('chat_id', telegram_chat_id);
        photoFormData.append('photo', firstImageQ.imageUrl as string);
        photoFormData.append('caption', audioCaption);
        photoFormData.append('parse_mode', 'HTML');
        if (summaryMessageId) {
          photoFormData.append('reply_to_message_id', summaryMessageId.toString());
        }

        try {
          const photoRes = await fetchWithRetry(`https://api.telegram.org/bot${telegram_bot_token}/sendPhoto`, {
            method: 'POST',
            body: photoFormData
          });
          const photoResJson = await photoRes.json();
          if (photoResJson.ok) {
            // Now we will reply to this newly sent photo with the voice note
            targetReplyId = photoResJson.result.message_id;
            // Clear the caption for the voice note since it's already on the photo
            audioCaption = '';
          }
        } catch (e) {
          console.error("Failed to send photo for individual question", e);
        }
      }

      // Send the Voice Note
      const audioFormData = new FormData();
      audioFormData.append('chat_id', telegram_chat_id);
      if (targetReplyId) {
        audioFormData.append('reply_to_message_id', targetReplyId.toString());
      }
      
      if (audioCaption) {
        audioFormData.append('caption', audioCaption);
        audioFormData.append('parse_mode', 'HTML');
      }
      
      const audioBlob = new Blob([new Uint8Array(audio.buffer)], { type: 'audio/ogg' });
      audioFormData.append('voice', audioBlob, filename);

      await fetchWithRetry(`https://api.telegram.org/bot${telegram_bot_token}/sendVoice`, {
        method: 'POST',
        body: audioFormData
      });
    }

  } catch (err) {
    console.error('Telegram Dispatch Error:', err);
  }
}
