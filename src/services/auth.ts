import { compare, hash } from 'bcrypt';

export default class AuthService {
  static async hashPassword(password: string, salt = 10): Promise<string> {
    return hash(password, salt);
  }

  static async comparePasswords(
    password: string,
    hashedPassword: string
  ): Promise<boolean> {
    return await compare(password, hashedPassword);
  }
}
