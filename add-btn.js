const fs = require('fs');

const files = [
  'src/app/exam/speaking/results/page.tsx',
  'src/app/exam/listening/results/page.tsx',
  'src/app/exam/writing/results/page.tsx',
  'src/app/exam/reading/results/page.tsx'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  
  if (!content.includes('<div className="flex justify-center pt-8 pb-12">')) {
    // Replace the last closing divs pattern
    // The typical end is something like:
    //       </div>
    //     </div>
    //   );
    // }
    
    // We'll insert it right before `      </main>` or similar if it exists, or just before the second to last `</div>`
    // Let's use a regex that matches the end of the return statement.
    content = content.replace(/(?:\s*<\/main>\s*)?\s*<\/div>\s*<\/div>\s*\);\s*}\s*$/, `
        {/* Bottom Action Bar */}
        <div className="flex justify-center pt-8 pb-12 w-full">
          <FullExamNextAction />
        </div>
      </div>
    </div>
  );
}
`);
    fs.writeFileSync(file, content);
    console.log('Modified', file);
  }
}
