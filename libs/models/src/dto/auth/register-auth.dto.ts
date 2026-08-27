import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const RegisterAuthSchema = z.object({
  name: z
    .string({ message: 'Name is required' })
    .trim()
    .min(2, 'Tên tối thiểu 2 ký tự'),
  email: z
    .string({ message: 'Email is required' })
    .trim()
    .email('Email không hợp lệ'),
  password: z
    .string({ message: 'Password is required' })
    .min(6, 'Mật khẩu tối thiểu 6 ký tự'),
});

export class RegisterAuthDto extends createZodDto(RegisterAuthSchema) {}
