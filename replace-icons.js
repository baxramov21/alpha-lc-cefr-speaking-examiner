const fs = require('fs');

const file = 'src/app/exam/speaking/session/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// Replace imports
content = content.replace(/import \{ MicrophoneIcon, StopIcon, PlayIcon, ArrowRightIcon, AcademicCapIcon, CheckCircleIcon \} from '@heroicons\/react\/24\/solid';\n/, '');

// Add new lucide imports if needed, but we can just add them to the existing lucide-react import
content = content.replace(/import \{ Bot, Loader2, Sparkles, CheckCircle2, AlertTriangle \} from 'lucide-react';/,
"import { Bot, Loader2, Sparkles, CheckCircle2, AlertTriangle, Mic, Square, Play, ArrowRight, GraduationCap } from 'lucide-react';");

// Replace usages
content = content.replace(/<MicrophoneIcon /g, '<Mic ');
content = content.replace(/<StopIcon /g, '<Square ');
content = content.replace(/<PlayIcon /g, '<Play ');
content = content.replace(/<ArrowRightIcon /g, '<ArrowRight ');
content = content.replace(/<AcademicCapIcon /g, '<GraduationCap ');
content = content.replace(/<CheckCircleIcon /g, '<CheckCircle2 ');

fs.writeFileSync(file, content);
console.log('Replaced heroicons');
