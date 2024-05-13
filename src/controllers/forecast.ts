import { ClassMiddleware, Controller, Get } from '@overnightjs/core';
import { Database } from '@src/database/database';
import { authMiddleware } from '@src/middlewares/auth';
import { Beach } from '@src/models';
import { Forecast } from '@src/services/forecast';
import { Request, Response } from 'express';

const forecast = new Forecast();

@Controller('forecast')
@ClassMiddleware(authMiddleware)
export class ForecastController {
  @Get('')
  public async getForecastForLoggedUser(
    req: Request,
    res: Response
  ): Promise<void> {
    // Retorna void porque rotas do express utilizam res.send()
    try {
      const userId = Database.toObjectId(req.context?.userId);
      const beaches = await Beach.findMany({ user: userId });

      const forecastData = await forecast.processForecastForBeaches(beaches);
      res.status(200).send(forecastData);
    } catch (err: any) {
      res.status(500).send({
        error: 'Something went wrong',
      });
    }
  }
}
