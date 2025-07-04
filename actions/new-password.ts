'use server';
import z from 'zod';
import bcrypt from 'bcryptjs';

import { NewPasswordSchema } from '@/schemas';
import { getPasswordResetTokenByToken } from '@/data/password-reset-token';
import { getUserByEmail } from '@/data/user';
import { db } from '@/lib/prismaDB';

export const newPassword = async (
    values: z.infer<typeof NewPasswordSchema>,
    token?: string | null,
) => {
    if (!token) {
        return { error: 'Token no encontrado' };
    }

    const validatedFields = NewPasswordSchema.safeParse(values);

    if (!validatedFields.success) {
        return { error: 'Campos invalidos!' };
    }

    const { password } = validatedFields.data;
    const existingToken = await getPasswordResetTokenByToken(token);

    if (!existingToken) {
        return { error: 'Token invalido!' };
    }

    const hasExpired = new Date(existingToken.expires) < new Date();

    if (hasExpired) {
        return { error: 'Token expirado!' };
    }

    const existingUser = await getUserByEmail(existingToken.email);

    if (!existingUser) {
        return { error: 'Mail inexistente!' };
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await db.user.update({
        where: { id: existingUser.id },
        data: {
            password: hashedPassword,
        },
    });

    await db.passwordResetToken.delete({
        where: { id: existingToken.id },
    });

    return { success: 'Contraseña actualizada!' };
};
