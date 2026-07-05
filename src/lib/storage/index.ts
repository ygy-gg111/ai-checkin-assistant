export type StoredFile = {
  url: string;
  size: number;
  mimeType: string;
};

export interface StorageProvider {
  save(file: File): Promise<StoredFile>;
  remove(url: string): Promise<void>;
}
