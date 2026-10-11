import dotenv from 'dotenv';
dotenv.config();

import app from './app.js';

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`🚀 Mirai MSOT Course Progression API running on port ${PORT}`);
  console.log(`👉 Health check: http://localhost:${PORT}/api/health`);
});

process.on('SIGINT', () => {
  console.log('Shutting down backend server...');
  server.close(() => {
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('Terminating backend server...');
  server.close(() => {
    process.exit(0);
  });
});
