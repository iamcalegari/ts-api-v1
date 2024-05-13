import { Beach } from '@src/models';
import { BeachPosition } from '@src/models/beach';
import stormGlassWeather3HoursFixture from '@test/fixtures/stormglass_weather_3_hours.json';
import apiForecastResponse1BeachFixture from '@test/fixtures/api_forecast_response_1_beach.json';

import nock from 'nock';
import { User } from '@src/models/user';
import AuthService from '@src/services/auth';

describe('Beach forecast functional tests', () => {
  let token: string;
  beforeEach(async () => {
    const deafultUser = {
      name: 'John Doe',
      email: 'john@mail',
      password: '1234',
    };

    const user = await User.insert(deafultUser);

    const defaultBeach = {
      lat: -33.792726,
      lng: 151.289824,
      name: 'Manly',
      position: BeachPosition.E,
      user: user._id,
    };

    await Beach.insert(defaultBeach);
    token = AuthService.generateToken(user._id.toString());
  });

  it('should return a forecast with just a few times', async () => {
    nock('https://api.stormglass.io:443', {
      encodedQueryParams: true,
      reqheaders: {
        Authorization: (): boolean => true,
      },
    })
      // .defaultReplyHeaders({ 'access-control-allow-origin': '*' })
      .get('/v2/weather/point')
      .query({
        lat: '-33.792726',
        lng: '151.289824',
        params: /(.*)/,
        source: 'noaa',
        end: /(.*)/,
      })
      .reply(200, stormGlassWeather3HoursFixture);

    const { body, status } = await global.testRequest.get('/forecast').set({
      'x-access-token': token,
    });

    expect(status).toBe(200);
    expect(body).toEqual(apiForecastResponse1BeachFixture);
  });

  it('should return 500 if something goes wrong during the processing', async () => {
    nock('https://api.stormglass.io:443', {
      encodedQueryParams: true,
      reqheaders: {
        Authorization: (): boolean => true,
      },
    })
      .get('/v2/weather/point')
      .query({
        lat: '-33.792726',
        lng: '151.289824',
        params: /(.*)/,
        source: 'noaa',
        end: /(.*)/,
      })
      .replyWithError('Something went wrong');

    const { status } = await global.testRequest.get('/forecast').set({
      'x-access-token': token,
    });
    expect(status).toBe(500);
  });
});
