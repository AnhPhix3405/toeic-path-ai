import { IsNotEmpty, IsString } from 'class-validator';

export class HealthCheckDto {
  // Comment ở đây sẽ thành môt tả trên Swagger
  @IsString()
  @IsNotEmpty()
  status: string;
}
