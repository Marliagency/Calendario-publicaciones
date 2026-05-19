import { copyFile, mkdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

/**
 * Storage adapter: localPath → URL servible.
 *
 * Mientras no haya bucket S3-compatible, usamos `file://` URLs (válidas
 * a nivel de schema z.string().url() del ingest). El calendario las
 * persiste pero los publishers reales rechazarán file:// — eso es
 * intencional: en dry-run/test es suficiente para verificar el
 * contrato.
 */

export interface Storage {
  /** Sube `localPath` y devuelve una URL servible. `key` es opcional, default basename. */
  upload(localPath: string, key?: string): Promise<string>;
}

export class FileUrlStorage implements Storage {
  constructor(private readonly stagingDir: string) {}

  async upload(localPath: string, key?: string): Promise<string> {
    await mkdir(this.stagingDir, { recursive: true });
    const finalKey = key ?? path.basename(localPath);
    const dest = path.join(this.stagingDir, finalKey);
    if (path.resolve(localPath) !== path.resolve(dest)) {
      await copyFile(localPath, dest);
    }
    return pathToFileURL(dest).toString();
  }
}

/** Storage que falsifica una URL https (para tests del ingest que requieren `.url()`). */
export class FakeHttpsStorage implements Storage {
  constructor(private readonly baseUrl: string) {}

  async upload(localPath: string, key?: string): Promise<string> {
    const finalKey = key ?? path.basename(localPath);
    return new URL(finalKey, this.baseUrl).toString();
  }
}
