import { PersonalityType } from '@prisma/client';

export interface FriendSummary {
  id: string;
  name: string;
  personality: PersonalityType;
}
