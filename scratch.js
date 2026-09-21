const fs = require("fs");
const file = "src/app/admin/grammar/upload/page.tsx";
let code = fs.readFileSync(file, "utf8");

// Change type
code = code.replace(/type ExamMode = .*/g, `type ExamMode = "grammar_json" | "grammar_pdf_main" | "reading_native" | "listening_pdf_main";`);
code = code.replace(/useState<ExamMode>\(\x27grammar_pdf\x27\)/g, `useState<ExamMode>("grammar_pdf_main")`);

// Update logic references
code = code.replace(/examMode === \x27grammar_pdf\x27/g, `examMode === 'grammar_pdf_main'`);
code = code.replace(/examMode === \x27reading\x27/g, `examMode === 'reading_native'`);
code = code.replace(/examMode === \x27listening\x27/g, `examMode === 'listening_pdf_main'`);
code = code.replace(/setExamMode\(\x27grammar_pdf\x27\)/g, `setExamMode('grammar_pdf_main')`);
code = code.replace(/setExamMode\(\x27reading\x27\)/g, `setExamMode('reading_native')`);
code = code.replace(/setExamMode\(\x27listening\x27\)/g, `setExamMode('listening_pdf_main')`);

fs.writeFileSync(file, code);
console.log("Replaced strings");
