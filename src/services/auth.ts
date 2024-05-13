import { compare, hash } from 'bcrypt';
import jwt from 'jsonwebtoken';
import config, { IConfig } from 'config';

const authConfig: IConfig = config.get('App.auth');

export interface JwtToken {
  sub: string;
}

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

  static generateToken(sub: string): string {
    return jwt.sign({ sub }, authConfig.get('key')!, {
      expiresIn: authConfig.get('tokenExpiresIn'),
    });
  }

  static decodeToken(token: string): JwtToken {
    return jwt.verify(token, authConfig.get('key')!) as JwtToken;
  }
}
