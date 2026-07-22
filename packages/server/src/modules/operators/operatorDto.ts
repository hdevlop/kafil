import {
  createUserDto,
  updateUserDto,
} from "najm-auth";
import { z } from "zod";
import { phoneDto } from "../access/phone";

const operatorProfileDto = z.object({
  phone: phoneDto,
  cin: z.string().trim().min(8).max(20).toUpperCase(),
  gender: z.enum(["M", "F"]),
  address: z.string().trim().min(1).max(500),
  dateOfBirth: z.iso.date(),
  jobTitle: z.string().trim().min(1).max(120).nullish(),
  notes: z.string().trim().max(2_000).nullish(),
});

export const createOperatorDto = createUserDto
  .omit({
    emailVerified: true,
    password: true,
    roleId: true,
    status: true,
  })
  .extend({
    id: z.string().uuid().optional(),
    userId: z.string().min(1).optional(),
    ...operatorProfileDto.shape,
  });
export const updateOperatorDto = updateUserDto
  .omit({
    emailVerified: true,
    password: true,
    roleId: true,
    status: true,
  })
  .extend({
    ...operatorProfileDto.partial().shape,
  });
export const operatorIdParams = z.object({
  id: z.string().uuid(),
});
export const operatorListQuery = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export type CreateOperatorDto = z.input<typeof createOperatorDto>;
export type UpdateOperatorDto = z.input<typeof updateOperatorDto>;
export type OperatorListQuery = z.input<typeof operatorListQuery>;
