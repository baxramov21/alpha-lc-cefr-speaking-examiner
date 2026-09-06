'use client';
import AdminQuestionsManager from '@/components/AdminQuestionsManager';

export default function IELTSQuestionsPage() {
  return (
    <AdminQuestionsManager 
      programme="IELTS" 
      availableSkills={['speaking', 'writing']} 
    />
  );
}
