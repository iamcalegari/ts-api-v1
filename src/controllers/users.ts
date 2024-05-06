import { Controller, Post } from '@overnightjs/core';
import { Request, Response } from 'express';
import { User } from '@src/models/user';
import { BaseController } from '.';
import { CUSTOM_VALIDATION } from '@src/database/database';

@Controller('users')
export class UsersController extends BaseController {
  @Post('')
  public async create(req: Request, res: Response): Promise<void> {
    try {
      const newUser = await User.insert(req.body);
      res.status(201).send(newUser);
    } catch (err: any) {
      if (await this.hasDuplicatedEmail(req.body.email)) {
        err.kind = CUSTOM_VALIDATION.UNIQUE;

        this.sendCreatedUpdatedErrorResponse(res, err, 409);
        return;
      }
      this.sendCreatedUpdatedErrorResponse(res, err);
    }
  }

  private async hasDuplicatedEmail(email: string): Promise<boolean> {
    const user = await User.total({ email });

    return user !== 0;
  }
}
