import { compare, hash } from 'bcrypt';
import jwt from 'jsonwebtoken';
import config, { IConfig } from 'config';

const authConfig: IConfig = config.get('App.auth');

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

  static generateToken(payload: object): string {
    return jwt.sign(payload, authConfig.get('key')!, {
      expiresIn: authConfig.get('tokenExpiresIn'),
    });
  }
}
