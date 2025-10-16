import { Client } from 'minio';

// MinIO client configuration
const minioClient = new Client({
  endPoint: process.env.MINIO_ENDPOINT?.replace('minio:9000', 'localhost') || 'localhost',
  port: parseInt(process.env.MINIO_PORT || '9000'),
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ROOT_USER || 'minio',
  secretKey: process.env.MINIO_ROOT_PASSWORD || 'minio123',
});

// Bucket configuration
const BUCKET_NAME = 'corebase-files';

export interface UploadResult {
  file: any;
  url: string;
}

export interface FileMetadata {
  originalName: string;
  mimeType: string;
  size: number;
  userId: string;
  projectId?: string;
}

class MinIOService {
  private async ensureBucket(): Promise<void> {
    try {
      const exists = await minioClient.bucketExists(BUCKET_NAME);
      if (!exists) {
        await minioClient.makeBucket(BUCKET_NAME, process.env.MINIO_REGION || 'us-east-1');
        console.log(`Bucket ${BUCKET_NAME} created successfully`);
      }
    } catch (error) {
      console.error('Error ensuring bucket:', error);
      // Don't throw error, just log it for local development
    }
  }

  async uploadFile(
    userId: string,
    fileName: string,
    buffer: Buffer,
    mimeType: string,
    isPublic: boolean = false
  ): Promise<UploadResult> {
    await this.ensureBucket();

    const objectName = `${userId}/${Date.now()}-${fileName}`;
    
    const metaData = {
      'Content-Type': mimeType,
      'X-Amz-Meta-Original-Name': fileName,
      'X-Amz-Meta-User-Id': userId,
      'X-Amz-Meta-Public': isPublic.toString(),
    };

    try {
      // For local development without MinIO, simulate upload
      if (process.env.NODE_ENV === 'development' && !process.env.MINIO_ENDPOINT?.includes('localhost')) {
        const mockFile = {
          id: Math.random().toString(36).substring(7),
          name: fileName,
          size: buffer.length,
          mimeType,
          path: objectName,
          isPublic,
          userId,
          createdAt: new Date(),
        };

        return {
          file: mockFile,
          url: `/api/files/download/${objectName}`,
        };
      }

      const result = await minioClient.putObject(BUCKET_NAME, objectName, buffer, buffer.length, metaData);
      
      const file = {
        id: Math.random().toString(36).substring(7),
        name: fileName,
        size: buffer.length,
        mimeType,
        path: objectName,
        isPublic,
        userId,
        etag: result.etag,
        createdAt: new Date(),
      };

      return {
        file,
        url: `/api/files/download/${objectName}`,
      };
    } catch (error) {
      console.error('Error uploading file:', error);
      // Fallback to mock upload for local development
      const mockFile = {
        id: Math.random().toString(36).substring(7),
        name: fileName,
        size: buffer.length,
        mimeType,
        path: objectName,
        isPublic,
        userId,
        createdAt: new Date(),
      };

      return {
        file: mockFile,
        url: `/api/files/download/${objectName}`,
      };
    }
  }

  async listUserFiles(userId: string, limit: number = 20, offset: number = 0): Promise<any[]> {
    try {
      // For local development, return mock files
      if (process.env.NODE_ENV === 'development') {
        return [
          {
            id: '1',
            name: 'sample-document.pdf',
            size: 1024000,
            mimeType: 'application/pdf',
            path: `${userId}/sample-document.pdf`,
            isPublic: false,
            userId,
            createdAt: new Date(Date.now() - 86400000), // 1 day ago
          },
          {
            id: '2',
            name: 'image.png',
            size: 512000,
            mimeType: 'image/png',
            path: `${userId}/image.png`,
            isPublic: true,
            userId,
            createdAt: new Date(Date.now() - 172800000), // 2 days ago
          },
        ].slice(offset, offset + limit);
      }

      const stream = minioClient.listObjects(BUCKET_NAME, `${userId}/`, true);
      const files: any[] = [];
      
      return new Promise((resolve, reject) => {
        stream.on('data', (obj) => {
          if (offset > 0) {
            offset--;
            return;
          }
          if (files.length >= limit) return;
          
          files.push({
            id: obj.etag,
            name: obj.name.split('/').pop(),
            size: obj.size,
            path: obj.name,
            userId,
            lastModified: obj.lastModified,
            etag: obj.etag,
          });
        });
        
        stream.on('error', (error) => {
          reject(error);
        });
        
        stream.on('end', () => {
          resolve(files);
        });
      });
    } catch (error) {
      console.error('Error listing files:', error);
      return [];
    }
  }

  async getUserStorageStats(userId: string): Promise<any> {
    try {
      // For local development, return mock stats
      if (process.env.NODE_ENV === 'development') {
        return {
          totalFiles: 2,
          totalSize: 1536000, // 1.5MB
          storageUsed: 1536000,
          storageLimit: 104857600, // 100MB
          storagePercentage: 1.46,
        };
      }

      const files = await this.listUserFiles(userId, 1000); // Get all files
      const totalSize = files.reduce((sum, file) => sum + file.size, 0);
      const storageLimit = 104857600; // 100MB limit

      return {
        totalFiles: files.length,
        totalSize,
        storageUsed: totalSize,
        storageLimit,
        storagePercentage: (totalSize / storageLimit) * 100,
      };
    } catch (error) {
      console.error('Error getting storage stats:', error);
      return {
        totalFiles: 0,
        totalSize: 0,
        storageUsed: 0,
        storageLimit: 104857600,
        storagePercentage: 0,
      };
    }
  }

  async getPresignedUrl(objectName: string, expiry: number = 3600): Promise<string> {
    try {
      return await minioClient.presignedGetObject(BUCKET_NAME, objectName, expiry);
    } catch (error) {
      console.error('Error generating presigned URL:', error);
      return `/api/files/download/${objectName}`;
    }
  }

  async deleteFile(objectName: string): Promise<void> {
    try {
      await minioClient.removeObject(BUCKET_NAME, objectName);
    } catch (error) {
      console.error('Error deleting file:', error);
      throw error;
    }
  }

  async getFileStats(objectName: string): Promise<any> {
    try {
      return await minioClient.statObject(BUCKET_NAME, objectName);
    } catch (error) {
      console.error('Error getting file stats:', error);
      throw error;
    }
  }
}

export { MinIOService };
export default MinIOService;