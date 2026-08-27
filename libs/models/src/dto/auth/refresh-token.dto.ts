import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const RefreshTokenSchema = z.object({
  refreshToken: z
    .string({ message: 'Refresh token is required' })
    .min(1, 'Refresh token không được để trống'),
});

export class RefreshTokenDto extends createZodDto(RefreshTokenSchema) {}
