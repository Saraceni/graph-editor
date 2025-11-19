import express from 'express';
import cors from 'cors';

export function createServer() {
  const app = express();

  // Enable CORS for all routes
  app.use(cors({
    origin: '*', // In production, specify your frontend URL
    credentials: true,
  }));

  // Parse JSON bodies
  app.use(express.json());

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  return app;
}

