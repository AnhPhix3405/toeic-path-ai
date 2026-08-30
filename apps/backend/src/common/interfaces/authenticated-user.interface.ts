import type { UserRole } from '../enums/user-role.enum';
import type { UserStatus } from '../enums/user-status.enum';

export interface AuthenticatedUser {
  id: string;
  sessionId: string;
  email: string;
  role: UserRole;
  status: UserStatus;
}
