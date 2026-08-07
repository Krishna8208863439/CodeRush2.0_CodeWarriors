import {
  S3Client,
  CreateBucketCommand,
  HeadBucketCommand,
  PutObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { config } from '../config';

export class MinIOClient {
  private client: S3Client;
  private bucketName: string;

  constructor() {
    this.bucketName = config.MINIO_BUCKET_NAME;
    this.client = new S3Client({
      endpoint: `http://${config.MINIO_ENDPOINT}:${config.MINIO_PORT}`,
      region: 'us-east-1',
      credentials: {
        accessKeyId: config.MINIO_ACCESS_KEY,
        secretAccessKey: config.MINIO_SECRET_KEY,
      },
      forcePathStyle: true, // Necessary for MinIO
    });
  }

  async ensureBucketExists(): Promise<void> {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucketName }));
    } catch (err: any) {
      if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 444 || err.$metadata?.httpStatusCode === 404) {
        await this.client.send(new CreateBucketCommand({ Bucket: this.bucketName }));
        console.log(`MinIO bucket '${this.bucketName}' created successfully.`);
      }
    }
  }

  async uploadFile(buffer: Buffer, key: string, mimeType: string): Promise<string> {
    try {
      await this.ensureBucketExists();
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: key,
          Body: buffer,
          ContentType: mimeType,
        })
      );
      return key;
    } catch (err: any) {
      console.warn(`[MinIO Storage Unavailable]: ${err.message} — saving attachment to local uploads directory.`);
      const fs = require('fs');
      const path = require('path');
      const localDir = path.join(__dirname, '../../uploads', path.dirname(key));
      if (!fs.existsSync(localDir)) fs.mkdirSync(localDir, { recursive: true });
      const filePath = path.join(__dirname, '../../uploads', key);
      fs.writeFileSync(filePath, buffer);
      return `local://${key}`;
    }
  }

  async getPresignedUrl(key: string, expiresInSeconds: number = 3600): Promise<string> {
    if (key.startsWith('local://')) {
      return `http://localhost:3001/uploads/${key.replace('local://', '')}`;
    }
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });
      return getSignedUrl(this.client, command, { expiresIn: expiresInSeconds });
    } catch {
      return `http://localhost:3001/uploads/${key.replace('local://', '')}`;
    }
  }
}

export const minioClient = new MinIOClient();
