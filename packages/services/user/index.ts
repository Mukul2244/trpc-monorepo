import { randomBytes, createHmac } from "node:crypto";
import { db, eq } from "@repo/database";
import { usersTable } from "@repo/database/schema";

import {
    createUserWithEmailAndPasswordInput,
    generateUserTokenPayload,
    GenerateUserTokenPayloadType,
    signInUserWithEmailAndPasswordInput,
    SignInUserWithEmailAndPasswordInputType,
    type CreateUserWithEmailAndPasswordInputType,
} from "./model";
import * as JWT from "jsonwebtoken";
import { env } from "../env";

class UserService {

    private async getUserByEmail(email: string) {
        const result = await db.select().from(usersTable).where(eq(usersTable.email, email));
        if (!result || result.length === 0) return null;
        return result[0];
    }
    private async generateUserToken(payload: GenerateUserTokenPayloadType) {
        const { id } = await generateUserTokenPayload.parseAsync(payload);
        const token = JWT.sign({ id }, env.JWT_SECRET);
        return { token };

    }
    private async verifyUserToken(token: string): Promise<GenerateUserTokenPayloadType> {
        try {
            const verficationResult = JWT.verify(token, env.JWT_SECRET) as GenerateUserTokenPayloadType;
            return verficationResult;
        } catch (error) {
            throw new Error("Invalid token");
        }
    }
    public async getUserInfoById(id: string) {
        const user = await db.select({
            id: usersTable.id,
            email: usersTable.email,
            fullName: usersTable.fullName,
            profileImageUrl: usersTable.profileImageUrl
        })
            .from(usersTable)
            .where(eq(usersTable.id, id))
            .then(result => result[0]);
        if (!user) throw new Error("User not found");
        return user;
    }
    private async generateHash(salt: string, password: string) {
        return createHmac("sha256", salt).update(password).digest("hex");
    }
    public async createUserWithEmailAndPassword(payload: CreateUserWithEmailAndPasswordInputType) {
        const { email, fullName, password } = await createUserWithEmailAndPasswordInput.parseAsync(payload);
        const existingUser = await this.getUserByEmail(email);
        if (existingUser) throw new Error(`User with email ${email} already exists`);

        const salt = randomBytes(16).toString("hex");
        const hash = await this.generateHash(salt, password);

        const userInsertResult = await db.insert(usersTable).values({ email, fullName, password: hash, salt, }).returning({
            id: usersTable.id,
        });
        if (!userInsertResult || userInsertResult.length === 0 || !userInsertResult[0]?.id) throw new Error("Failed to create user");
        const userId = userInsertResult[0].id;
        const { token } = await this.generateUserToken({ id: userId });
        return {
            id: userId,
            token,
        }
    }
    public async signInUserWithEmailAndPassword(payload: SignInUserWithEmailAndPasswordInputType) {
        const { email, password } = await signInUserWithEmailAndPasswordInput.parseAsync(payload);
        const existingUser = await this.getUserByEmail(email);
        if (!existingUser) throw new Error(`User with email ${email} does not exist`);

        if (!existingUser.password || !existingUser.salt) throw new Error("Invalid authentication method.");

        const hash = await this.generateHash(existingUser.salt, password);
        if (hash !== existingUser.password) throw new Error("Invalid user credentials");

        const { token } = await this.generateUserToken({ id: existingUser.id });
        return {
            id: existingUser.id,
            token
        };
    }
    public async verifyAndDecodeUserToken(token: string) {
        const { id } = await this.verifyUserToken(token);
        return { id };
    }
}

export default UserService;