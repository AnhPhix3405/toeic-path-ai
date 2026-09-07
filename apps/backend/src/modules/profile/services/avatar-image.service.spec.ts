import { BadRequestException, UnsupportedMediaTypeException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import sharp from 'sharp';
import { AvatarImageService } from './avatar-image.service';

describe('AvatarImageService', () => {
  const values: Record<string, number> = {
    'avatar.maxSizeBytes': 2_097_152,
    'avatar.maxWidth': 2048,
    'avatar.maxHeight': 2048,
    'avatar.outputWidth': 512,
    'avatar.outputHeight': 512,
    'avatar.outputQuality': 85,
  };
  const service = new AvatarImageService({
    getOrThrow: (key: string) => values[key],
  } as ConfigService);

  const file = (buffer: Buffer, mimetype: string): Express.Multer.File => ({
    fieldname: 'avatar',
    originalname: 'untrusted-name.png',
    encoding: '7bit',
    mimetype,
    size: buffer.length,
    buffer,
    destination: '',
    filename: '',
    path: '',
    stream: undefined as never,
  });

  it('decodes and normalizes an allowed image to metadata-free WebP', async () => {
    const input = await sharp({
      create: { width: 20, height: 10, channels: 3, background: '#336699' },
    })
      .png()
      .toBuffer();

    const result = await service.process(file(input, 'image/png'));
    const metadata = await sharp(result.buffer).metadata();

    expect(result.mimeType).toBe('image/webp');
    expect(result.extension).toBe('webp');
    expect(metadata).toEqual(expect.objectContaining({ format: 'webp', width: 512, height: 512 }));
  });

  it('rejects a spoofed MIME type based on decoded content', async () => {
    const jpeg = await sharp({
      create: { width: 2, height: 2, channels: 3, background: '#ffffff' },
    })
      .jpeg()
      .toBuffer();
    await expect(service.process(file(jpeg, 'image/png'))).rejects.toBeInstanceOf(
      UnsupportedMediaTypeException,
    );
  });

  it('rejects absent, undecodable, and oversized-dimension images', async () => {
    await expect(service.process(undefined)).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.process(file(Buffer.from('not-an-image'), 'image/png')),
    ).rejects.toBeInstanceOf(BadRequestException);
    const wide = await sharp({
      create: { width: 2049, height: 1, channels: 3, background: '#ffffff' },
    })
      .png()
      .toBuffer();
    await expect(service.process(file(wide, 'image/png'))).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rejects a file whose reported upload size exceeds the configured limit', async () => {
    const oversized = file(Buffer.from('x'), 'image/png');
    oversized.size = 2_097_153;
    await expect(service.process(oversized)).rejects.toBeInstanceOf(BadRequestException);
  });
});
