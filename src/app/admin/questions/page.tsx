'use client';
import AdminQuestionsManager from '@/components/AdminQuestionsManager';

export default function CEFRQuestionsPage() {
  return (
    <AdminQuestionsManager 
      programme="CEFR" 
      availableSkills={['speaking', 'writing', 'listening', 'reading']} 
    />
  );
}
