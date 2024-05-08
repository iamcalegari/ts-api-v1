import AuthService from '@src/services/auth';
import { authMiddleware } from '../auth';
import { Request } from 'express';

describe('Auth middleware', () => {
  it('Should verify if JWT token and call next middleware', async () => {
    const jwtToken = AuthService.generateToken({ data: 'fake' });

    const reqFake = {
      headers: {
        'x-access-token': jwtToken,
      },
    };

    const resFake = {};

    const nextFake = jest.fn();

    authMiddleware(reqFake, resFake, nextFake);

    expect(nextFake).toHaveBeenCalled();
  });

  it('Should return UNAUTHORIZED if there is a problem with the token', async () => {
    const reqFake = {
      headers: {
        'x-access-token': 'invalid_token',
      },
    };

    const sendMock = jest.fn();

    const resFake = {
      // status().send()
      status: jest.fn(() => ({
        send: sendMock,
      })),
    };

    const nextFake = jest.fn();

    authMiddleware(reqFake, resFake as object, nextFake);

    expect(resFake.status).toHaveBeenCalledWith(401);

    expect(sendMock).toHaveBeenCalledWith({
      code: 401,
      error: 'jwt malformed',
    });
  });

  it('Should return UNAUTHORIZED if there is no token', async () => {
    const reqFake = {
      headers: {},
    };

    const sendMock = jest.fn();

    const resFake = {
      status: jest.fn(() => ({
        send: sendMock,
      })),
    };

    const nextFake = jest.fn();

    authMiddleware(reqFake as object, resFake as object, nextFake);

    expect(resFake.status).toHaveBeenCalledWith(401);
    expect(sendMock).toHaveBeenCalledWith({
      code: 401,
      error: 'jwt must be provided',
    });
  });
});
