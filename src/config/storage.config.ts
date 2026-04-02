import { registerAs } from '@nestjs/config';

export default registerAs('storage', () => ({
  region: process.env.STORAGE_REGION || 'ap-southeast-1',
  accessKeyId: process.env.STORAGE_ACCESS_KEY_ID,
  secretAccessKey: process.env.STORAGE_SECRET_ACCESS_KEY,
  bucketName: process.env.STORAGE_BUCKET_NAME || 'ecommerce-media',
  publicUrl: process.env.STORAGE_PUBLIC_URL,
}));
