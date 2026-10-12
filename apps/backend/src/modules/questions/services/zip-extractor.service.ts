import { BadRequestException, Injectable } from '@nestjs/common';
import AdmZip, { IZipEntry } from 'adm-zip';
import * as path from 'path';
import { IMPORT_LIMITS } from '../../../config/import.config';

const AdmZipConstructor = (AdmZip as unknown as { default?: typeof AdmZip }).default ?? AdmZip;

export interface ZipExtractResult {
  excelBuffer: Buffer;
  excelFileName: string;
  mediaFiles: Map<string, { buffer: Buffer; mimeType: string; size: number }>;
}

@Injectable()
export class ZipExtractorService {
  private getMimeType(fileName: string): string {
    const ext = path.extname(fileName).toLowerCase();
    switch (ext) {
      case '.mp3':
        return 'audio/mpeg';
      case '.wav':
        return 'audio/wav';
      case '.ogg':
        return 'audio/ogg';
      case '.m4a':
        return 'audio/mp4';
      case '.jpg':
      case '.jpeg':
        return 'image/jpeg';
      case '.png':
        return 'image/png';
      case '.gif':
        return 'image/gif';
      case '.webp':
        return 'image/webp';
      default:
        return 'application/octet-stream';
    }
  }

  protected getZipEntriesCount(entries: IZipEntry[]): number {
    return entries.length;
  }

  protected getZipEntriesTotalSize(entries: IZipEntry[]): number {
    return entries.reduce((total, entry) => total + (entry.header?.size || 0), 0);
  }

  protected getZipEntries(zip: AdmZip): IZipEntry[] {
    return zip.getEntries();
  }

  async extractZipPackage(buffer: Buffer): Promise<ZipExtractResult> {
    await Promise.resolve();
    let zip: AdmZip;
    try {
      zip = new AdmZipConstructor(buffer);
    } catch {
      throw new BadRequestException('Không thể mở tệp ZIP. Tệp bị hỏng hoặc không đúng định dạng.');
    }

    const entries = this.getZipEntries(zip);

    // 1. Check entry count
    if (this.getZipEntriesCount(entries) > IMPORT_LIMITS.MAX_ZIP_ENTRIES_COUNT) {
      throw new BadRequestException(
        `Số lượng tệp trong gói nén vượt quá giới hạn cho phép (${IMPORT_LIMITS.MAX_ZIP_ENTRIES_COUNT} tệp).`,
      );
    }

    // 2. Check total uncompressed size (Zip Bomb defense)
    const totalUncompressedSize = this.getZipEntriesTotalSize(entries);
    if (totalUncompressedSize > IMPORT_LIMITS.MAX_UNCOMPRESSED_SIZE_BYTES) {
      throw new BadRequestException(
        'Kích thước giải nén của gói tệp vượt quá giới hạn an toàn (150MB).',
      );
    }

    let excelBuffer: Buffer | null = null;
    let excelFileName: string | null = null;
    const mediaFiles = new Map<string, { buffer: Buffer; mimeType: string; size: number }>();

    for (const entry of entries) {
      // 3. Zip Slip defense: Check path traversal
      const normalizedPath = path.normalize(entry.entryName).replace(/\\/g, '/');
      if (
        entry.entryName.includes('..') ||
        normalizedPath.startsWith('../') ||
        normalizedPath.startsWith('/..') ||
        normalizedPath === '..'
      ) {
        throw new BadRequestException(
          'Phát hiện đường dẫn tệp không an toàn trong gói nén (Zip Slip)',
        );
      }

      if (entry.isDirectory) {
        continue;
      }

      const lowerName = entry.entryName.toLowerCase();
      if (lowerName.endsWith('.xlsx')) {
        if (!excelBuffer) {
          excelBuffer = entry.getData();
          excelFileName = path.basename(entry.entryName);
        }
      } else {
        const fileData = entry.getData();
        const mimeType = this.getMimeType(entry.entryName);
        const fileObj = {
          buffer: fileData,
          mimeType,
          size: fileData.length,
        };
        // Store by entryName, normalizedPath, and basename
        mediaFiles.set(entry.entryName, fileObj);
        mediaFiles.set(normalizedPath, fileObj);
        mediaFiles.set(path.basename(entry.entryName), fileObj);
      }
    }

    if (!excelBuffer || !excelFileName) {
      throw new BadRequestException('Gói nén không chứa bất kỳ tệp Excel (.xlsx) hợp lệ nào');
    }

    return {
      excelBuffer,
      excelFileName,
      mediaFiles,
    };
  }
}
