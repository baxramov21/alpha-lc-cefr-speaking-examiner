const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
      walkDir(dirPath, callback);
    } else {
      callback(path.join(dir, f));
    }
  });
}

function processFile(file) {
  if (!file.endsWith('.tsx') && !file.endsWith('.ts')) return;
  
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;
  
  // Backgrounds
  content = content.replace(/bg-slate-50(?! )/g, 'bg-slate-50 dark:bg-slate-950');
  content = content.replace(/bg-white(?! )/g, 'bg-white dark:bg-slate-900');
  content = content.replace(/bg-slate-100(?! )/g, 'bg-slate-100 dark:bg-slate-800');
  content = content.replace(/bg-slate-200(?! )/g, 'bg-slate-200 dark:bg-slate-700');
  content = content.replace(/bg-indigo-50(?! )/g, 'bg-indigo-50 dark:bg-indigo-950');
  content = content.replace(/bg-emerald-50(?! )/g, 'bg-emerald-50 dark:bg-emerald-950');
  content = content.replace(/bg-amber-50(?! )/g, 'bg-amber-50 dark:bg-amber-950');
  content = content.replace(/bg-red-50(?! )/g, 'bg-red-50 dark:bg-red-950');
  
  // Text colors
  content = content.replace(/text-slate-800(?! )/g, 'text-slate-800 dark:text-slate-200');
  content = content.replace(/text-slate-700(?! )/g, 'text-slate-700 dark:text-slate-300');
  content = content.replace(/text-slate-600(?! )/g, 'text-slate-600 dark:text-slate-300');
  content = content.replace(/text-slate-500(?! )/g, 'text-slate-500 dark:text-slate-400');
  content = content.replace(/text-slate-400(?! )/g, 'text-slate-400 dark:text-slate-500');
  
  // Borders
  content = content.replace(/border-slate-100(?! )/g, 'border-slate-100 dark:border-slate-800');
  content = content.replace(/border-slate-200(?! )/g, 'border-slate-200 dark:border-slate-700');
  content = content.replace(/border-slate-300(?! )/g, 'border-slate-300 dark:border-slate-600');
  
  if (content !== originalContent) {
    fs.writeFileSync(file, content);
    console.log(`Updated ${file}`);
  }
}

walkDir('./src', processFile);
console.log('Finished adding dark mode variants.');
