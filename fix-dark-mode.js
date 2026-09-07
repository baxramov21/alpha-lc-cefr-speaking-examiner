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
  
  // Use (?![\\w\\-]) to ensure we don't match partial class names (like bg-white-500 when looking for bg-white),
  // but we DO match it even if it is followed by a space.
  
  // Also, because the previous script ran and matched some things (the ones at the end of strings),
  // we first clean up duplicates just in case we add them twice.
  
  const replacements = [
    { from: /bg-slate-50(?![\\w\\-])/g, to: 'bg-slate-50 dark:bg-slate-950' },
    { from: /bg-white(?![\\w\\-])/g, to: 'bg-white dark:bg-slate-900' },
    { from: /bg-slate-100(?![\\w\\-])/g, to: 'bg-slate-100 dark:bg-slate-800' },
    { from: /bg-slate-200(?![\\w\\-])/g, to: 'bg-slate-200 dark:bg-slate-700' },
    { from: /bg-indigo-50(?![\\w\\-])/g, to: 'bg-indigo-50 dark:bg-indigo-950' },
    { from: /bg-emerald-50(?![\\w\\-])/g, to: 'bg-emerald-50 dark:bg-emerald-950' },
    { from: /bg-amber-50(?![\\w\\-])/g, to: 'bg-amber-50 dark:bg-amber-950' },
    { from: /bg-red-50(?![\\w\\-])/g, to: 'bg-red-50 dark:bg-red-950' },
    
    { from: /text-slate-800(?![\\w\\-])/g, to: 'text-slate-800 dark:text-slate-200' },
    { from: /text-slate-700(?![\\w\\-])/g, to: 'text-slate-700 dark:text-slate-300' },
    { from: /text-slate-600(?![\\w\\-])/g, to: 'text-slate-600 dark:text-slate-300' },
    { from: /text-slate-500(?![\\w\\-])/g, to: 'text-slate-500 dark:text-slate-400' },
    { from: /text-slate-400(?![\\w\\-])/g, to: 'text-slate-400 dark:text-slate-500' },
    
    { from: /border-slate-100(?![\\w\\-])/g, to: 'border-slate-100 dark:border-slate-800' },
    { from: /border-slate-200(?![\\w\\-])/g, to: 'border-slate-200 dark:border-slate-700' },
    { from: /border-slate-300(?![\\w\\-])/g, to: 'border-slate-300 dark:border-slate-600' },
  ];
  
  // First, remove existing dark: variants for these specific targets so we don't double them up
  content = content.replace(/ dark:bg-slate-950/g, '');
  content = content.replace(/ dark:bg-slate-900/g, '');
  content = content.replace(/ dark:bg-slate-800/g, '');
  content = content.replace(/ dark:bg-slate-700/g, '');
  content = content.replace(/ dark:bg-indigo-950/g, '');
  content = content.replace(/ dark:bg-emerald-950/g, '');
  content = content.replace(/ dark:bg-amber-950/g, '');
  content = content.replace(/ dark:bg-red-950/g, '');
  
  content = content.replace(/ dark:text-slate-200/g, '');
  content = content.replace(/ dark:text-slate-300/g, '');
  content = content.replace(/ dark:text-slate-400/g, '');
  content = content.replace(/ dark:text-slate-500/g, '');
  
  content = content.replace(/ dark:border-slate-800/g, '');
  content = content.replace(/ dark:border-slate-700/g, '');
  content = content.replace(/ dark:border-slate-600/g, '');

  for (const rep of replacements) {
    content = content.replace(rep.from, rep.to);
  }
  
  if (content !== originalContent) {
    fs.writeFileSync(file, content);
    console.log(`Updated ${file}`);
  }
}

walkDir('./src', processFile);
console.log('Finished fixing dark mode variants.');
