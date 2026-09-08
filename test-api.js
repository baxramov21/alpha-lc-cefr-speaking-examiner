fetch('http://localhost:3001/api/admin/exams/upload-canonical', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: "Test Custom Name",
    exam_type: "CEFR_READING",
    programme: "GRAMMAR",
    grammar_level: "elementary",
    time_limit: 3600,
    parts: [
      {
        part_number: 1,
        title: "Part 1",
        questions: [
          {
            question_number: 1,
            type: "MULTIPLE_CHOICE",
            question_text: "Q1",
            options: ["A", "B", "C"],
            correct_answer: "A"
          }
        ]
      }
    ]
  })
}).then(r => r.json()).then(console.log);
