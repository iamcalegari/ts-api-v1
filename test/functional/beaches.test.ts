import { User } from '@src/models/user';
import AuthService from '@src/services/auth';

describe('Beaches functional tests', () => {
  const defaultUser = {
    name: 'John Doe',
    email: 'john@mail',
    password: '1234',
  };

  let token: string;

  beforeEach(async () => {
    const user = await User.insert(defaultUser);
    token = AuthService.generateToken(user);
  });
  describe('When creating a beach', () => {
    it('Should create a beach with success', async () => {
      const newBeach = {
        lat: -33.792726,
        lng: 151.289824,
        name: 'Manly',
        position: 'E',
      };

      const response = await global.testRequest
        .post('/beaches')
        .set({
          'x-access-token': token,
        })
        .send(newBeach);

      expect(response.status).toBe(201);
      expect(response.body).toEqual(expect.objectContaining(newBeach));
    });

    it('Should return 422 if there is a validation error', async () => {
      const newBeach = {
        lat: 'invalid_string',
        lng: 151.289824,
        name: 'Manly',
        position: 'E',
      };

      const response = await global.testRequest
        .post('/beaches')
        .set({
          'x-access-token': token,
        })
        .send(newBeach);

      expect(response.status).toBe(422);
      expect(response.body).toEqual({
        error: 'Document failed validation',
      });
    });

    it.skip('Should return 500 if something goes wrong during the creation of a beach', async () => {
      //TODO
    });
  });
});
