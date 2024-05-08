import { ClassMiddleware, Controller, Post } from '@overnightjs/core';
import { Database } from '@src/database/database';
import { authMiddleware } from '@src/middlewares/auth';
import { Beach } from '@src/models/beach';
import { Request, Response } from 'express';
import { MongoError } from 'mongodb';

@Controller('beaches')
@ClassMiddleware(authMiddleware)
export class BeachesController {
  @Post('')
  public async create(req: Request, res: Response): Promise<void> {
    try {
      const beach = await Beach.insert({
        ...req.body,
        user: Database.toObjectId(req.decoded?._id),
      });

      res.status(201).send(beach);
    } catch (err: any) {
      if (err instanceof MongoError) {
        res.status(422).send({
          error: err.message,
        });
      } else {
        res.status(500).send({ error: err.message });
      }
    }
  }
}
