import dotenv from 'dotenv';
import path from 'path';

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/interview-prep-kit',
  },
  
  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-change-me',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || '',
    model: process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite',
  },
  
  scraping: {
    maxCrawlPages: parseInt(process.env.MAX_CRAWL_PAGES || '10', 10),
    fetchTimeout: parseInt(process.env.FETCH_TIMEOUT || '10000', 10),
    maxResponseSize: parseInt(process.env.MAX_RESPONSE_SIZE || '5242880', 10),
  },

  isProduction: process.env.NODE_ENV === 'production',
};
