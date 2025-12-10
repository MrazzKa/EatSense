export interface MediaFile {
  id: string;
  userId: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  thumbnailUrl?: string;
  metadata?: {
    width?: number;
    height?: number;
    duration?: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface UploadProgress {
  fileId: string;
  progress: number;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  error?: string;
}

export const uploadFile = async (
  file: File | Blob,
  userId: string,
  onProgress?: (_progress: UploadProgress) => void
): Promise<MediaFile> => {
  // Mock implementation
  const fileId = Math.random().toString(36).substr(2, 9);
  
  // Simulate upload progress
  for (let i = 0; i <= 100; i += 10) {
    onProgress?.({
      fileId,
      progress: i,
      status: i < 100 ? 'uploading' : 'completed',
    });
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  return {
    id: fileId,
    userId,
    filename: `file_${fileId}.jpg`,
    originalName: 'image.jpg',
    mimeType: 'image/jpeg',
    size: 1024000,
    url: `https://example.com/files/${fileId}.jpg`,
    thumbnailUrl: `https://example.com/thumbnails/${fileId}.jpg`,
    metadata: {
      width: 1920,
      height: 1080,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };
};

export const deleteFile = async (fileId: string): Promise<void> => {
  // Mock implementation
  console.log(`Deleted file ${fileId}`);
};

export const getFile = async (fileId: string): Promise<MediaFile | null> => {
  // Mock implementation
  return {
    id: fileId,
    userId: '1',
    filename: `file_${fileId}.jpg`,
    originalName: 'image.jpg',
    mimeType: 'image/jpeg',
    size: 1024000,
    url: `https://example.com/files/${fileId}.jpg`,
    thumbnailUrl: `https://example.com/thumbnails/${fileId}.jpg`,
    metadata: {
      width: 1920,
      height: 1080,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };
};
