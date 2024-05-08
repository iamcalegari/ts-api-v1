import { compare, hash } from 'bcrypt';
import jwt from 'jsonwebtoken';
import config, { IConfig } from 'config';
import { UserSchema } from '@src/models/user';

const authConfig: IConfig = config.get('App.auth');

export interface DecodedUser extends UserSchema {}

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

  static decodeToken(token: string): DecodedUser {
    return jwt.verify(token, authConfig.get('key')!) as DecodedUser;
  }
}
