import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const CreateMessageSchema = z.object({
  content: z
    .string({ message: 'Nội dung tin nhắn là bắt buộc' })
    .trim()
    .min(2, 'Nội dung tin nhắn tối thiểu 2 ký tự')
    .max(500, 'Nội dung tin nhắn tối đa 500 ký tự'),

  type: z.enum(['TEXT', 'FILE'], {
    message: 'Loại tin nhắn không hợp lệ',
  }),
});

export class CreateMessageDto extends createZodDto(CreateMessageSchema) {}
