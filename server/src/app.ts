import express, { Application, Request, Response } from 'express';
import { createServer, Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { setupSocketHandlers } from './socket/socketHandler.js';
import routes from './routes/index.js';

dotenv.config();

const app: Application = express();
const httpServer: HttpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
});

// CORS Configuration
const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    if (!origin) {
      callback(null, true);
      return;
    }
    
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5173',
      process.env.CLIENT_URL,
      process.env.CORS_ORIGIN,
      'https://mazendeebo.github.io'
    ].filter(Boolean) as string[];
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(null, true);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(express.json());

// Routes
app.use('/api', routes);

// Root route
app.get('/', (_req: Request, res: Response) => {
  res.json({ 
    name: 'Matterport Smart Tour API',
    status: 'running',
    endpoints: {
      health: '/health',
      api: '/api/*'
    }
  });
});

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// Setup Socket.io handlers
setupSocketHandlers(io);

// Store io instance
app.set('io', io);

// Connect to MongoDB (optional)
const connectDB = async (): Promise<void> => {
  try {
    if (process.env.MONGODB_URI) {
      await mongoose.connect(process.env.MONGODB_URI);
      console.log('MongoDB connected');
    }
  } catch (error) {
    console.log('MongoDB not connected - running without database');
  }
};

const PORT = process.env.PORT || 3001;

connectDB().then(() => {
  httpServer.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📡 Socket.io ready`);
    console.log(`🏠 Matterport Model: ${process.env.MATTERPORT_MODEL_ID}`);
  });
});

export { io };
