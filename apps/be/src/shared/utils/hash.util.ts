import bcrypt from "bcryptjs";
import { env } from "../../configs/env";

export const hashPassword = async (password: string): Promise<string> => {
  const rounds = Number(env.BCRYPT_ROUNDS);
  return bcrypt.hash(password, rounds);
};

export const comparePassword = async (
  password: string,
  hashedPassword: string,
): Promise<boolean> => {
  return bcrypt.compare(password, hashedPassword);
};
