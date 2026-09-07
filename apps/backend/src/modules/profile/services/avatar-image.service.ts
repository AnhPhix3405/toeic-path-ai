import { BadRequestException, Injectable, UnsupportedMediaTypeException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import sharp from 'sharp';

const MIME_BY_FORMAT: Readonly<Record<string, string>> = {
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

export interface ProcessedAvatar {
  buffer: Buffer;
  mimeType: 'image/webp';
  extension: 'webp';
}

@Injectable()
export class AvatarImageService {
  constructor(private readonly configService: ConfigService) {}

  async process(file: Express.Multer.File | undefined): Promise<ProcessedAvatar> {
    if (!file?.buffer?.length) throw new BadRequestException('A non-empty avatar file is required');

    const allowedMimeTypes = Object.values(MIME_BY_FORMAT);
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new UnsupportedMediaTypeException('Avatar must be a JPEG, PNG, or WebP image');
    }
    const maxSize = this.configService.getOrThrow<number>('avatar.maxSizeBytes');
    if (file.size > maxSize) throw new BadRequestException('Avatar exceeds the size limit');

    try {
      const image = sharp(file.buffer, { failOn: 'error', limitInputPixels: false });
      const metadata = await image.metadata();
      const detectedMime = metadata.format ? MIME_BY_FORMAT[metadata.format] : undefined;
      if (!detectedMime || detectedMime !== file.mimetype) {
        throw new UnsupportedMediaTypeException('Avatar content does not match its MIME type');
      }
      if (!metadata.width || !metadata.height) throw new Error('Missing image dimensions');
      if (
        metadata.width > this.configService.getOrThrow<number>('avatar.maxWidth') ||
        metadata.height > this.configService.getOrThrow<number>('avatar.maxHeight')
      ) {
        throw new BadRequestException('Avatar dimensions exceed the allowed limit');
      }
      const buffer = await image
        .rotate()
        .resize(
          this.configService.getOrThrow<number>('avatar.outputWidth'),
          this.configService.getOrThrow<number>('avatar.outputHeight'),
          { fit: 'cover', position: 'centre' },
        )
        .webp({ quality: this.configService.getOrThrow<number>('avatar.outputQuality') })
        .toBuffer();
      return { buffer, mimeType: 'image/webp', extension: 'webp' };
    } catch (error: unknown) {
      if (error instanceof BadRequestException || error instanceof UnsupportedMediaTypeException) {
        throw error;
      }
      throw new BadRequestException('Avatar is not a valid decodable image');
    }
  }
}
