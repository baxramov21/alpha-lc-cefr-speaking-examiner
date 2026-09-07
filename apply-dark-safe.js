const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    if (fs.statSync(dirPath).isDirectory()) {
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
  
  // Safe Regex function generator: exactly matches the class name
  const safeReplace = (target, replacement) => {
    // Regex matches the target class only if it's surrounded by boundaries (space, quote, backtick, start/end of string)
    // We use a replacer function to loop over all matches because overlapping matches might be missed by global regex
    let newContent = content;
    const regex = new RegExp(`(^|\\s|['"\`])(${target})(?=$|\\s|['"\`])`, 'g');
    
    // We run it twice just in case there are adjacent classes that share a space
    newContent = newContent.replace(regex, `$1$2 ${replacement}`);
    newContent = newContent.replace(regex, `$1$2 ${replacement}`);
    
    content = newContent;
  };

  // Remove any previously broken dark classes that might have been accidentally saved
  // (We just reverted the commits, so the files should be clean, but just in case)
  content = content.replace(/ dark:bg-[^\s'"`]+/g, '');
  content = content.replace(/ dark:text-[^\s'"`]+/g, '');
  content = content.replace(/ dark:border-[^\s'"`]+/g, '');
  
  // Backgrounds
  safeReplace('bg-slate-50', 'dark:bg-slate-950');
  safeReplace('bg-white', 'dark:bg-slate-900');
  safeReplace('bg-slate-100', 'dark:bg-slate-800');
  safeReplace('bg-slate-200', 'dark:bg-slate-700');
  safeReplace('bg-indigo-50', 'dark:bg-indigo-950');
  safeReplace('bg-emerald-50', 'dark:bg-emerald-950');
  safeReplace('bg-amber-50', 'dark:bg-amber-950');
  safeReplace('bg-red-50', 'dark:bg-red-950');
  
  // Text colors
  safeReplace('text-slate-800', 'dark:text-slate-200');
  safeReplace('text-slate-700', 'dark:text-slate-300');
  safeReplace('text-slate-600', 'dark:text-slate-300');
  safeReplace('text-slate-500', 'dark:text-slate-400');
  safeReplace('text-slate-400', 'dark:text-slate-500');
  
  // Borders
  safeReplace('border-slate-100', 'dark:border-slate-800');
  safeReplace('border-slate-200', 'dark:border-slate-700');
  safeReplace('border-slate-300', 'dark:border-slate-600');
  
  if (content !== originalContent) {
    fs.writeFileSync(file, content);
    console.log(`Updated ${file}`);
  }
}

walkDir('./src', processFile);
console.log('Finished safe dark mode replacements.');
