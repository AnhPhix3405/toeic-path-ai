import { BadRequestException } from '@nestjs/common';
import AdmZip from 'adm-zip';
import { ZipExtractorService } from './zip-extractor.service';

const AdmZipConstructor = (AdmZip as unknown as { default?: typeof AdmZip }).default ?? AdmZip;

describe('ZipExtractorService', () => {
  let service: ZipExtractorService;

  beforeEach(() => {
    service = new ZipExtractorService();
  });

  it('should extract zip with excel and media files successfully', async () => {
    const zip = new AdmZipConstructor();
    zip.addFile('questions.xlsx', Buffer.from('mock-excel-content'));
    zip.addFile('media/audio1.mp3', Buffer.from('mock-audio-content'));
    const zipBuffer = zip.toBuffer();

    const result = await service.extractZipPackage(zipBuffer);
    expect(result.excelFileName).toBe('questions.xlsx');
    expect(result.excelBuffer.toString()).toBe('mock-excel-content');
    expect(result.mediaFiles.has('audio1.mp3')).toBe(true);
  });

  it('should throw BadRequestException when zip contains path traversal (Zip Slip defense)', async () => {
    const zip = new AdmZipConstructor();
    zip.addFile('questions.xlsx', Buffer.from('mock-excel-content'));
    const zipBuffer = zip.toBuffer();
    jest.spyOn(service as any, 'getZipEntries').mockReturnValue([
      {
        entryName: 'questions.xlsx',
        isDirectory: false,
        getData: () => Buffer.from('mock-excel-content'),
      },
      {
        entryName: '../../etc/passwd',
        isDirectory: false,
        getData: () => Buffer.from('malicious-content'),
      },
    ]);

    await expect(service.extractZipPackage(zipBuffer)).rejects.toThrow(
      new BadRequestException('Phát hiện đường dẫn tệp không an toàn trong gói nén (Zip Slip)'),
    );
  });

  it('should throw BadRequestException when uncompressed size exceeds 150MB (Zip Bomb defense)', async () => {
    const zip = new AdmZipConstructor();
    zip.addFile('questions.xlsx', Buffer.from('mock-excel-content'));
    const zipBuffer = zip.toBuffer();
    jest.spyOn(service as any, 'getZipEntriesTotalSize').mockReturnValue(160 * 1024 * 1024);

    await expect(service.extractZipPackage(zipBuffer)).rejects.toThrow(
      new BadRequestException('Kích thước giải nén của gói tệp vượt quá giới hạn an toàn (150MB).'),
    );
  });

  it('should throw BadRequestException when zip has more than 500 entries', async () => {
    const zip = new AdmZipConstructor();
    zip.addFile('questions.xlsx', Buffer.from('mock-excel-content'));
    const zipBuffer = zip.toBuffer();
    jest.spyOn(service as any, 'getZipEntriesCount').mockReturnValue(501);

    await expect(service.extractZipPackage(zipBuffer)).rejects.toThrow(
      new BadRequestException('Số lượng tệp trong gói nén vượt quá giới hạn cho phép (500 tệp).'),
    );
  });

  it('should throw BadRequestException when zip has no excel file', async () => {
    const zip = new AdmZipConstructor();
    zip.addFile('media/audio1.mp3', Buffer.from('mock-audio-content'));
    const zipBuffer = zip.toBuffer();

    await expect(service.extractZipPackage(zipBuffer)).rejects.toThrow(
      new BadRequestException('Gói nén không chứa bất kỳ tệp Excel (.xlsx) hợp lệ nào'),
    );
  });
});
