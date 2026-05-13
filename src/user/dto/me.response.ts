import { PersonalityType } from '@prisma/client';

export interface MeResponse {
  id: string;
  name: string;
  personality: PersonalityType;
  friendCode: string;
  createdAt: Date;
}
