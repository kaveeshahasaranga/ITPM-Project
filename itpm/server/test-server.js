import express from 'express';

const app = express();

app.get('/test', (req, res) => {
  res.json({ message: 'Test server works!' });
});

const server = app.listen(4000, () => {
  console.log('Test server listening on port 4000');
});

server.on('error', (err) => {
  console.error('Error:', err);
});
