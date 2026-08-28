import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { Types } from 'mongoose';

const objectIdSchema = z
  .string({ message: 'ID thành viên là bắt buộc' })
  .refine((value) => Types.ObjectId.isValid(value), {
    message: 'ID của thành viên không hợp lệ',
  });

const CreateChatRoomSchema = z.object({
  name: z
    .string({ message: 'Name là bắt buộc' })
    .trim()
    .min(2, 'Tên phòng chat tối thiểu 2 ký tự')
    .max(100, 'Tên phòng chat tối đa 100 ký tự'),

  memberIds: z.array(objectIdSchema).min(1, 'Phải có ít nhất 1 thành viên'),
});

export class CreateChatRoomDto extends createZodDto(CreateChatRoomSchema) {}
