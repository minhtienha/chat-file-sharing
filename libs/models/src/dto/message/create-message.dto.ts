import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const AttachmentSchema = z.object({
  gridfsFileId: z.string(),
  name: z.string(),
  contentType: z.string().optional(),
  size: z.number().optional(),
});

const CreateMessageSchema = z.object({
  content: z
    .string()
    .trim()
    .max(2000, 'Nội dung tin nhắn tối đa 2000 ký tự')
    .optional()
    .or(z.literal('')),

  type: z.enum(['TEXT', 'FILE']).optional().default('TEXT'),
  
  attachments: z.array(AttachmentSchema).optional(),
}).refine(data => (data.content && data.content.trim().length > 0) || (data.attachments && data.attachments.length > 0), {
  message: 'Phải có nội dung hoặc tệp đính kèm',
  path: ['content'],
});

export class CreateMessageDto extends createZodDto(CreateMessageSchema) {}
