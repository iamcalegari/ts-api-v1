import { ForecastPoint, StormGlass } from '@src/clients/stormGlass';
import { BeachSchema } from '@src/models/beach';
import { InternalError } from '@src/utils/errors/internal-error';

export interface BeachForecast
  extends Omit<BeachSchema, 'user'>,
    ForecastPoint {}

export interface TimeForecast {
  time: string;
  forecast: BeachForecast[];
}

export class ForecastProcessingInternalError extends InternalError {
  constructor(message: string) {
    super(`Unexpected error during the forecast processing: ${message}`);
  }
}

export class Forecast {
  constructor(protected stormGlass = new StormGlass()) {}

  public async processForecastForBeaches(
    beaches: BeachSchema[]
  ): Promise<TimeForecast[]> {
    const pointsWithCorrectSources: BeachForecast[] = [];
    try {
      for (const beach of beaches) {
        const points = await this.stormGlass.fetchPoints(beach.lat, beach.lng);
        const enrichedBeachData = this.enrichBeachData(points, beach);

        pointsWithCorrectSources.push(...enrichedBeachData);
      }
    } catch (err: any) {
      throw new ForecastProcessingInternalError(err.message);
    }
    return this.mapForecastByTime(pointsWithCorrectSources);
  }

  private enrichBeachData(
    points: ForecastPoint[],
    beach: BeachSchema
  ): BeachForecast[] {
    return points.map((e) => ({
      lat: beach.lat,
      lng: beach.lng,
      name: beach.name,
      position: beach.position,
      rating: 1,
      ...e,
    }));
  }

  private mapForecastByTime(points: BeachForecast[]): TimeForecast[] {
    const forecastByTime: TimeForecast[] = [];

    for (const point of points) {
      const timePoint = forecastByTime.find((f) => f.time === point.time);

      if (timePoint) {
        timePoint.forecast.push(point);
      } else {
        forecastByTime.push({
          time: point.time,
          forecast: [point],
        });
      }
    }

    return forecastByTime;
  }
}
