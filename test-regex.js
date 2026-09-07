const str1 = 'className="bg-white/10 backdrop-blur-md"';
const str2 = 'className="bg-white rounded-2xl bg-white"';
const str3 = 'className={`bg-white`}';

const regex = /(^|\s|['"`])(bg-white)(?=$|\s|['"`])/g;

console.log(str1.replace(regex, '$1$2 dark:bg-slate-900'));
console.log(str2.replace(regex, '$1$2 dark:bg-slate-900'));
console.log(str3.replace(regex, '$1$2 dark:bg-slate-900'));
