import { IsString, MaxLength, MinLength } from 'class-validator';

export class AddFriendshipDto {
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  friendCode!: string;
}
