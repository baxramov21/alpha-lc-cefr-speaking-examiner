import { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';

export function handleExamCompletion(router: AppRouterInstance, fallbackRoute: string) {
  const stateStr = sessionStorage.getItem('fullExamState');
  if (stateStr) {
    try {
      const state = JSON.parse(stateStr);
      if (state && Array.isArray(state.sequence) && typeof state.currentIndex === 'number') {
        const nextIndex = state.currentIndex + 1;
        if (nextIndex < state.sequence.length) {
          // Move to next exam in sequence
          sessionStorage.setItem('fullExamState', JSON.stringify({
            ...state,
            currentIndex: nextIndex
          }));
          router.replace(`/exam/${state.sequence[nextIndex]}/setup`);
          return true;
        } else {
          // Finished the entire sequence
          sessionStorage.removeItem('fullExamState');
          router.replace('/dashboard');
          return true;
        }
      }
    } catch (e) {
      console.error('Error parsing fullExamState', e);
    }
  }
  
  // Not in full exam mode, or parsing failed, use fallback
  router.replace(fallbackRoute);
  return false;
}
