import { Controller, Post } from '@overnightjs/core';
import { Request, Response } from 'express';
import { User, UserSchema } from '@src/models/user';

@Controller('users')
export class UsersController {
  @Post('')
  public async create(req: Request, res: Response): Promise<void> {
    if (await this.hasUser(req.body)) {
      res.status(409).send({
        error: 'User with given email already exists',
      });
      return;
    }

    const newUser = await User.insert(req.body);
    res.status(201).send(newUser);
  }

  private async hasUser(newUser: UserSchema): Promise<boolean> {
    const user = await User.total({ email: newUser.email });

    return !!user;
  }
}
