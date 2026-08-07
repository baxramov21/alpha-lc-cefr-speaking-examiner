const fs = require('fs');

async function test() {
  const formData = new FormData();
  // We'll just create a tiny fake webm blob by writing a string
  const fakeAudio = new Blob(['fake audio content'], { type: 'audio/webm' });
  formData.append('audio', fakeAudio);
  formData.append('questionText', 'What is your favorite color?');

  try {
    const res = await fetch('http://localhost:3002/api/evaluate', {
      method: 'POST',
      body: formData
    });
    const text = await res.text();
    console.log('Status:', res.status);
    console.log('Response:', text);
  } catch (err) {
    console.error(err);
  }
}

test();
