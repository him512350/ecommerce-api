import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import { extname } from 'path';

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];
const MAX_FILE_SIZE_MB = 5;

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly publicUrl: string;

  constructor(private readonly config: ConfigService) {
    this.bucket = config.get<string>('storage.bucketName') ?? 'ecommerce-media';
    this.publicUrl = config.get<string>('storage.publicUrl') ?? '';

    this.s3 = new S3Client({
      region: config.get<string>('storage.region') ?? 'ap-southeast-1',
      credentials: {
        accessKeyId: config.get<string>('storage.accessKeyId') ?? '',
        secretAccessKey: config.get<string>('storage.secretAccessKey') ?? '',
      },
    });
  }

  async uploadFile(
    file: Express.Multer.File,
    folder: 'products' | 'categories' | 'avatars' = 'products',
  ): Promise<{ url: string; key: string }> {
    this.validateFile(file);

    const ext = extname(file.originalname).toLowerCase();
    const key = `${folder}/${randomUUID()}${ext}`;

    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        ContentLength: file.size,
        ACL: 'public-read', // AWS S3 public bucket
      }),
    );

    const url = `${this.publicUrl}/${key}`;
    this.logger.log(`Uploaded: ${key} (${(file.size / 1024).toFixed(1)} KB)`);
    return { url, key };
  }

  async uploadMultiple(
    files: Express.Multer.File[],
    folder: 'products' | 'categories' | 'avatars' = 'products',
  ): Promise<{ url: string; key: string }[]> {
    return Promise.all(files.map((file) => this.uploadFile(file, folder)));
  }

  async deleteFile(key: string): Promise<void> {
    try {
      await this.s3.send(
        new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      this.logger.log(`Deleted: ${key}`);
    } catch (error) {
      this.logger.error(`Failed to delete ${key}: ${error.message}`);
    }
  }

  private validateFile(file: Express.Multer.File): void {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`,
      );
    }
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      throw new BadRequestException(
        `File too large. Max size is ${MAX_FILE_SIZE_MB}MB`,
      );
    }
  }
}
