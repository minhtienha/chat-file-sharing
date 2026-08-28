import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const GetChatRoomsQueryDtoSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().max(100).default(''),
});

export class GetChatRoomsQueryDto extends createZodDto(
  GetChatRoomsQueryDtoSchema,
) {}
