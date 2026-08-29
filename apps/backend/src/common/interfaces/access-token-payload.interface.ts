import type { UserRole } from '../enums/user-role.enum';

export interface AccessTokenPayload {
  sub: string;
  sid: string;
  email: string;
  role: UserRole;
  type: 'access';
}
