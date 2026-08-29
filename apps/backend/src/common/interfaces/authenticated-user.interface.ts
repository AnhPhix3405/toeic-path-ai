import type { UserRole } from '../enums/user-role.enum';

export interface AuthenticatedUser {
  id: string;
  sessionId: string;
  email: string;
  role: UserRole;
}
