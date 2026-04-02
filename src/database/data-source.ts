import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { join } from 'path';

// Load .env manually since NestJS ConfigModule isn't available here
config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  entities: [join(__dirname, '..', 'modules', '**', '*.entity.{ts,js}')],
  migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
  synchronize: false, // NEVER true here
  logging: true,
});