import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { passRoutes } from './routes/passes.js';
import { appleWebServiceRoutes } from './routes/appleWebService.js';
import { googleRoutes } from './routes/google.js';
import { pushRoutes } from './routes/push.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/passes', passRoutes);
app.use('/api/google', googleRoutes);
app.use('/api/push', pushRoutes);

// Apple Wallet Web Service (required for pass updates)
// Apple expects these at /v1/... path
app.use('/v1', appleWebServiceRoutes);

// Error handler
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Pass Generation Service running on port ${PORT}`);
  console.log(`Public URL: ${process.env.PUBLIC_URL || `http://localhost:${PORT}`}`);
});
