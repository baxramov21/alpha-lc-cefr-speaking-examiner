const fs = require('fs');
const path = require('path');

function walk(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walk(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      // Regex to match dark:<something> 
      // where <something> can be letters, numbers, dashes, slashes, square brackets, or percentages
      const newContent = content.replace(/dark:[a-zA-Z0-9_\-\/\[\]#%:]+/g, '');
      
      if (newContent !== content) {
        // Also clean up multiple spaces created by the removal
        const cleanedContent = newContent.replace(/\s+(?=["'])/g, ''); // spaces before ending quote
        // Actually it's safer just to write it back and let prettier/formatter or just browser handle spaces
        fs.writeFileSync(fullPath, newContent);
        console.log('Cleaned', fullPath);
      }
    }
  }
}

walk('./src');
