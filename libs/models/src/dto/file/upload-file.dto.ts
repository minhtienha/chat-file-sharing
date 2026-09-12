import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const UploadFileQuerySchema = z.object({
  scope: z.enum(['drive', 'chat', 'avatar']).optional().default('drive'),
});

export class UploadFileQueryDto extends createZodDto(UploadFileQuerySchema) {}
