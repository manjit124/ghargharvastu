import fs from 'fs';
import path from 'path';

export interface StorageProviderMetadata {
  providerName: 'atomic_file' | 'firestore' | 'cloud_sql';
  isCloudReady: boolean;
  persistenceMode: string;
}

/**
 * Common Storage Provider Interface for VastuVision Data Persistence
 * Ensures smooth transition between local atomic file store and managed Cloud Database (Firestore / Cloud SQL).
 */
export interface IAdminStorageProvider {
  loadData(): Promise<any> | any;
  saveData(data: any): Promise<void> | void;
  getMetadata(): StorageProviderMetadata;
}

/**
 * Resilient Atomic File Storage Provider
 * Uses POSIX atomic rename (.tmp -> destination) to prevent file corruption during sudden Cloud Run container lifecycle events.
 */
export class AtomicFileStorageProvider implements IAdminStorageProvider {
  private filePath: string;
  private backupPath: string;

  constructor(customPath?: string) {
    this.filePath = customPath || path.join(process.cwd(), 'server', 'data', 'admin_store.json');
    this.backupPath = `${this.filePath}.backup`;
  }

  public getMetadata(): StorageProviderMetadata {
    return {
      providerName: 'atomic_file',
      isCloudReady: true,
      persistenceMode: 'Atomic POSIX File Write with Snapshot Backup',
    };
  }

  public loadData(): any {
    try {
      if (fs.existsSync(this.filePath)) {
        const content = fs.readFileSync(this.filePath, 'utf-8');
        return JSON.parse(content);
      }
    } catch (err) {
      console.error('[StorageProvider] Primary file corrupted, attempting backup recovery...', err);
      if (fs.existsSync(this.backupPath)) {
        try {
          const backupContent = fs.readFileSync(this.backupPath, 'utf-8');
          return JSON.parse(backupContent);
        } catch (backupErr) {
          console.error('[StorageProvider] Backup load failed:', backupErr);
        }
      }
    }
    return null;
  }

  public saveData(data: any): void {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const payload = JSON.stringify(data, null, 2);
    const tmpPath = `${this.filePath}.${Date.now()}.${Math.random().toString(36).substring(7)}.tmp`;

    try {
      // 1. Write to atomic temporary file
      fs.writeFileSync(tmpPath, payload, 'utf-8');

      // 2. Rotate current to backup if it exists
      if (fs.existsSync(this.filePath)) {
        try {
          fs.copyFileSync(this.filePath, this.backupPath);
        } catch {
          // Non-blocking backup copy
        }
      }

      // 3. Atomically rename tmp file to target destination
      fs.renameSync(tmpPath, this.filePath);
    } catch (err) {
      console.error('[StorageProvider] Atomic write failed:', err);
      // Clean up orphaned tmp file if exists
      if (fs.existsSync(tmpPath)) {
        try {
          fs.unlinkSync(tmpPath);
        } catch {
          // ignore
        }
      }
      throw err;
    }
  }
}
