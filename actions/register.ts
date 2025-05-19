'use server';

import bcrypt from 'bcryptjs';
import { RegisterSchema } from '@/schemas';
import { z } from 'zod';
import { db } from '@/lib/prismaDB';
import { getUserByEmail } from '@/data/user';
import { generateVerificationToken } from '@/lib/tokens';
import { sendVerificationEmail } from '@/lib/mail';

export const register = async (values: z.infer<typeof RegisterSchema>) => {
    const validatedFields = RegisterSchema.safeParse(values);

    if (!validatedFields.success) {
        return { error: 'Campos invalidos!' };
    }

    const { name, email, password } = validatedFields.data;
    const hashedPassword = await bcrypt.hash(password, 10);

    const existingUser = await getUserByEmail(email);

    if (existingUser) {
        return { error: 'Mail ya registrado' };
    }

    await db.user.create({
        data: {
            name,
            email,
            password: hashedPassword,
            emailVerified: null,
        },
    });

    const verificationToken = await generateVerificationToken(email);

    await sendVerificationEmail(verificationToken.email, verificationToken.token);

    return {
        success: 'Hemos enviado un correo de confirmación. Recuerda checar tu folder de spam.',
    };
};
