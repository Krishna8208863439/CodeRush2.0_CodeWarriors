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
  }

  async getPresignedUrl(key: string, expiresInSeconds: number = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });
    return getSignedUrl(this.client, command, { expiresIn: expiresInSeconds });
  }
}

export const minioClient = new MinIOClient();
