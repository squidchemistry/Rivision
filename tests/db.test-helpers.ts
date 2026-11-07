import { prisma } from '@/lib/prisma';

let counter = 0;

/** Creates a throwaway user; its rows cascade-delete with it */
export async function makeUser(overrides: { role?: string; plan?: string; planExpiresAt?: Date | null } = {}) {
    const email = `test-${Date.now()}-${counter++}-${Math.random().toString(36).slice(2, 8)}@example.test`;
    return prisma.user.create({ data: { email, name: 'Test', password: 'x', ...overrides } });
}

export async function deleteUsers(ids: string[]) {
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
}
