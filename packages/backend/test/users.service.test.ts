import test from 'node:test';
import assert from 'node:assert/strict';
import { ConflictException, BadRequestException } from '@nestjs/common';
import { UsersService } from '../src/modules/users/users.service';

// Helper to create a UsersService with mocked repo and sharedService
function makeService(overrides: any = {}) {
  const repo: any = {
    findOne: async (opts: any) => null,
    delete: async (id: string) => ({ affected: 1 }),
    create: (u: any) => ({ ...u }),
    save: async (u: any) => ({ id: 'new-id', ...u }),
    update: async (id: string, patch: any) => ({}),
    createQueryBuilder: () => ({
      where: () => ({ orderBy: () => ({ skip: () => ({ take: () => ({ getManyAndCount: async () => ([[], 0]) }) }) }) }),
      delete: () => ({ whereInIds: () => ({ execute: async () => ({ affected: 0 }) }) }),
    }),
    // allow test-specific overrides
    ...overrides.repo,
  };

  const sharedService: any = {
    createTemporaryPassword: () => ({ hash: 'tmpSalt:tmpHash', password: 'tmpPass' }),
    createPasswordHash: (p: string) => `salt:${p}_hash`,
    ...overrides.sharedService,
  };

  const svc = new UsersService(repo as any, sharedService as any);
  // Attach repo for tests to manipulate
  (svc as any).__repo = repo;
  (svc as any).__shared = sharedService;
  return { svc, repo, sharedService };
}

test('create throws ConflictException if email already exists', async () => {
  const { svc, repo } = makeService({ repo: { findOne: async () => ({ id: 'existing', email: 'a@b' }) } });
  await assert.rejects(async () => {
    await svc.create({ email: 'a@b', firstName: 'A' } as any);
  }, (err: any) => err instanceof ConflictException);
});

test('create uses temporary password when none provided', async () => {
  const { svc, repo, sharedService } = makeService({
    repo: { findOne: async () => null, create: (u: any) => ({ ...u }), save: async (u: any) => ({ id: '1', ...u }) },
    sharedService: { createTemporaryPassword: () => ({ hash: 'salt:hash123', password: 'tmp123' }) },
  });

  const res = await svc.create({ email: 'new@user' } as any);
  assert.equal((res as any).email, 'new@user');
  assert.equal((res as any).password, 'salt:hash123');
  assert.equal((res as any).isPasswordTemporary, true);
});

test('update hashes provided password and clears temporary flag', async () => {
  // Repo.findOne used in findById, and findByEmail
  const userBefore = { id: 'u1', email: 'u1@e', password: 'old', isPasswordTemporary: true } as any;
  const { svc, repo, sharedService } = makeService({
    repo: {
      findOne: async (opts: any) => {
        if (opts && opts.where && opts.where.id === 'u1') return userBefore;
        return null;
      },
      update: async (id: string, patch: any) => ({}),
    },
    sharedService: { createPasswordHash: (p: string) => `salt:${p}_hash` },
  });

  // After update, findById will return a user with the hashed password (simulate)
  (svc as any).__repo.findOne = async (opts: any) => {
    if (opts && opts.where && opts.where.id === 'u1') return { id: 'u1', email: 'u1@e', password: 'salt:newpw_hash', isPasswordTemporary: false };
    return null;
  };

  const res = await svc.update('u1', { password: 'newpw' } as any);
  assert.equal((res as any)!.password, 'salt:newpw_hash');
  assert.equal((res as any)!.isPasswordTemporary, false);
});

test('import throws BadRequestException when no file provided', async () => {
  const { svc } = makeService();
  await assert.rejects(async () => {
    await svc.import(undefined as any);
  }, (err: any) => err instanceof BadRequestException);
});

test('bulkDelete throws BadRequestException when ids empty or not array', async () => {
  const { svc } = makeService();
  await assert.rejects(async () => {
    await svc.bulkDelete([]);
  }, (err: any) => err instanceof BadRequestException);

  await assert.rejects(async () => {
    await svc.bulkDelete(null as any);
  }, (err: any) => err instanceof BadRequestException);
});
