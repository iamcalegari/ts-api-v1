import { Controller, Get } from '@overnightjs/core';
import { Beach } from '@src/models';
import { Forecast } from '@src/services/forecast';
import { Request, Response } from 'express';

const forecast = new Forecast();

@Controller('forecast')
export class ForecastController {
  @Get('')
  public async getForecastForLoggedUser(
    _: Request,
    res: Response
  ): Promise<void> {
    // Retorna void porque rotas do express utilizam res.send()
    try {
      const beaches = await Beach.findMany({});

      const forecastData = await forecast.processForecastForBeaches(beaches);
      res.status(200).send(forecastData);
    } catch (err: any) {
      res.status(500).send({
        error: 'Something went wrong',
      });
    }
  }
}
