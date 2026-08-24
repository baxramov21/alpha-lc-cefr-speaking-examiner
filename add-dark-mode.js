const fs = require('fs');

const files = [
  'src/app/exam/speaking/session/page.tsx',
  'src/app/exam/listening/session/page.tsx',
  'src/app/exam/writing/session/page.tsx',
  'src/app/exam/reading/session/page.tsx'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  
  // Backgrounds
  content = content.replace(/bg-slate-50(?! )/g, 'bg-slate-50 dark:bg-slate-950');
  content = content.replace(/bg-white(?! )/g, 'bg-white dark:bg-slate-900');
  content = content.replace(/bg-slate-100(?! )/g, 'bg-slate-100 dark:bg-slate-800');
  content = content.replace(/bg-slate-200(?! )/g, 'bg-slate-200 dark:bg-slate-700');
  
  // Text colors
  content = content.replace(/text-slate-800(?! )/g, 'text-slate-800 dark:text-slate-200');
  content = content.replace(/text-slate-700(?! )/g, 'text-slate-700 dark:text-slate-300');
  content = content.replace(/text-slate-600(?! )/g, 'text-slate-600 dark:text-slate-300');
  content = content.replace(/text-slate-500(?! )/g, 'text-slate-500 dark:text-slate-400');
  content = content.replace(/text-slate-400(?! )/g, 'text-slate-400 dark:text-slate-500');
  
  // Borders
  content = content.replace(/border-slate-100(?! )/g, 'border-slate-100 dark:border-slate-800');
  content = content.replace(/border-slate-200(?! )/g, 'border-slate-200 dark:border-slate-700');
  
  fs.writeFileSync(file, content);
}
console.log('Added dark mode classes to session pages');
