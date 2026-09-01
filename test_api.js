const http = require('http');

const data = JSON.stringify({
  updates: [{
    id: "14c9b081-888b-4e1b-b4a8-6b8a8b8b8b8b", // this is a fake ID, we'll see the exact error
    part: "part1_2",
    table_data: { image_url_2: "https://test.com/img.jpg" }
  }]
});

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/admin/questions/bulk-edit',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, res => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => console.log('Response:', body));
});

req.on('error', e => console.error(e));
req.write(data);
req.end();
