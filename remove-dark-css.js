const fs = require('fs');

let css = fs.readFileSync('src/app/globals.css', 'utf8');

// Remove @custom-variant dark
css = css.replace(/@custom-variant dark \(&:is\(\.dark \*\)\);\n/, '');

// Remove .dark block
const darkBlockRegex = /\.dark\s*\{[\s\S]*?\n\}\n/m;
css = css.replace(darkBlockRegex, '');

// Remove dark autofill rules
const autofillRegex = /\.dark input:-webkit-autofill,[\s\S]*?\n\}\n/m;
css = css.replace(autofillRegex, '');

fs.writeFileSync('src/app/globals.css', css);
console.log('Removed dark mode CSS');
