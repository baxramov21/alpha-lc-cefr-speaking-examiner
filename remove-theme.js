const fs = require('fs');

const files = [
  'src/app/exam/listening/session/page.tsx',
  'src/app/exam/writing/session/page.tsx',
  'src/app/exam/reading/session/page.tsx',
  'src/app/exam/speaking/session/page.tsx',
  'src/app/dashboard/page.tsx'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/import \{ ThemeToggle \} from '@\/components\/ThemeToggle';\n/g, '');
  content = content.replace(/<ThemeToggle \/>/g, '');
  fs.writeFileSync(file, content);
}

// Remove from layout
let layout = fs.readFileSync('src/app/layout.tsx', 'utf8');
layout = layout.replace(/import \{ ThemeProvider \} from '@\/components\/ThemeProvider';\n/g, '');
layout = layout.replace(/<ThemeProvider[\s\S]*?>/g, '');
layout = layout.replace(/<\/ThemeProvider>/g, '');
fs.writeFileSync('src/app/layout.tsx', layout);
console.log('Removed ThemeToggle and ThemeProvider');
