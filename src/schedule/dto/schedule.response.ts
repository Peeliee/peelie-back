import { PersonalityType } from '@prisma/client';

export interface ScheduleResponse {
  id: string;
  meetDate: Date;
  description: string;
  createdAt: Date;
  friendUser: {
    id: string;
    name: string;
    personality: PersonalityType;
  };
  chatRoom: {
    id: string;
  };
}
