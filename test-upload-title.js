const previewData = { title: "Extracted Exam" };
let customExamName = "Unit 1 Test";
let finalPayload = { ...previewData };
if (customExamName) finalPayload.title = customExamName;
console.log(JSON.stringify(finalPayload));
