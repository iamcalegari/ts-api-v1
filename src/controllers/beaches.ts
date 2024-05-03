import { Controller, Post } from '@overnightjs/core';
import { Beach } from '@src/models/beach';
import { Request, Response } from 'express';
import { MongoError } from 'mongodb';

@Controller('beaches')
export class BeachesController {
  @Post('')
  public async create(req: Request, res: Response): Promise<void> {
    try {
      const beach = await Beach.cadastrar(req.body);

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
