import { Controller, Post } from '@overnightjs/core';
import { Request, Response } from 'express';
import { User, hasDuplicatedEmail } from '@src/models/user';
import { BaseController } from '.';
import { CUSTOM_VALIDATION } from '@src/database/database';
import AuthService from '@src/services/auth';

@Controller('users')
export class UsersController extends BaseController {
  @Post('')
  public async create(req: Request, res: Response): Promise<void> {
    try {
      const newUser = await User.insert(req.body);

      res.status(201).send(newUser);
    } catch (err: any) {
      if (await hasDuplicatedEmail(req.body.email)) {
        err.kind = CUSTOM_VALIDATION.UNIQUE;

        this.sendCreatedUpdatedErrorResponse(res, err, 409);
        return;
      }
      this.sendCreatedUpdatedErrorResponse(res, err);
    }
  }

  @Post('authenticate')
  public async authenticate(req: Request, res: Response): Promise<Response> {
    const { email, password } = req.body;

    const user = await User.find({ email: email });

    if (!user) {
      return res.status(401).send({
        code: 401,
        error: 'User not found!',
      });
    }

    if (!(await AuthService.comparePasswords(password, user.password))) {
      return res.status(401).send({
        code: 401,
        error: 'Password does not match!',
      });
    }

    const token = AuthService.generateToken(user);

    return res.status(200).send({ token: token });
  }
}
