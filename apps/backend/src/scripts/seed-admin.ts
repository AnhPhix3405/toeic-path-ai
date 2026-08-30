import 'reflect-metadata';
import { hash } from 'bcrypt';
import { config } from 'dotenv';
import dataSource from '../database/data-source';
import { UserRole } from '../common/enums/user-role.enum';
import { UserStatus } from '../common/enums/user-status.enum';
import { User } from '../modules/users/entities/user.entity';

config();

async function seedAdmin(): Promise<void> {
  const email = process.env.INITIAL_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.INITIAL_ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error('INITIAL_ADMIN_EMAIL and INITIAL_ADMIN_PASSWORD are required');
  }
  if (password.length < 12) {
    throw new Error('INITIAL_ADMIN_PASSWORD must be at least 12 characters');
  }

  await dataSource.initialize();
  try {
    const users = dataSource.getRepository(User);
    const existing = await users.findOne({ where: { email } });
    if (existing) {
      if (existing.role !== UserRole.ADMIN) {
        throw new Error('A non-admin account already uses INITIAL_ADMIN_EMAIL');
      }
      process.stdout.write('Initial administrator already exists.\n');
      return;
    }

    const passwordHash = await hash(password, Number(process.env.BCRYPT_SALT_ROUNDS ?? 12));
    await users.save(
      users.create({
        email,
        passwordHash,
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
      }),
    );
    process.stdout.write('Initial administrator created.\n');
  } finally {
    await dataSource.destroy();
  }
}

void seedAdmin().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown seed error';
  process.stderr.write(`Admin seed failed: ${message}\n`);
  process.exitCode = 1;
});
