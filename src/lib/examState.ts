import { get, set, del } from 'idb-keyval';

export async function saveExamState(sessionToken: string, examType: 'speaking' | 'writing' | 'listening' | 'reading', state: any) {
  try {
    await set(`exam_state_${examType}_${sessionToken}`, state);
  } catch (error) {
    console.error('Failed to save exam state to IndexedDB', error);
  }
}

export async function loadExamState(sessionToken: string, examType: 'speaking' | 'writing' | 'listening' | 'reading') {
  try {
    return await get(`exam_state_${examType}_${sessionToken}`);
  } catch (error) {
    console.error('Failed to load exam state from IndexedDB', error);
    return null;
  }
}

export async function clearExamState(sessionToken: string, examType: 'speaking' | 'writing' | 'listening' | 'reading') {
  try {
    await del(`exam_state_${examType}_${sessionToken}`);
  } catch (error) {
    console.error('Failed to clear exam state from IndexedDB', error);
  }
}
