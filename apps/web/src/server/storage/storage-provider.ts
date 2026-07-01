export type StorageObject = {
  contentType: string;
  key: string;
  size: number;
};

export type UploadRequest = {
  body: Blob | ArrayBuffer | Uint8Array;
  contentType: string;
  key: string;
  metadata?: Record<string, string>;
};

export interface StorageProvider {
  deleteObject(key: string): Promise<void>;
  getSignedReadUrl(key: string, expiresInSeconds: number): Promise<string>;
  putObject(request: UploadRequest): Promise<StorageObject>;
}

class UnconfiguredStorageProvider implements StorageProvider {
  async deleteObject(): Promise<void> {
    throw new Error("Storage provider is not configured.");
  }

  async getSignedReadUrl(): Promise<string> {
    throw new Error("Storage provider is not configured.");
  }

  async putObject(): Promise<StorageObject> {
    throw new Error("Storage provider is not configured.");
  }
}

const storageProvider = new UnconfiguredStorageProvider();

export function getStorageProvider(): StorageProvider {
  return storageProvider;
}
