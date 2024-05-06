import AuthService from '@src/services/auth';

describe('Users functional tests', () => {
  describe('When creating an user', () => {
    it('Should create an user with success with encrypted password', async () => {
      const newUser = {
        name: 'John Doe',
        email: 'john@mail.com',
        password: '1234',
      };

      const response = await global.testRequest.post('/users').send(newUser);

      expect(response.status).toBe(201);

      expect(response.body).toEqual(
        expect.objectContaining({ ...newUser, password: expect.any(String) })
      );

      await expect(
        AuthService.comparePasswords(newUser.password, response.body.password)
      ).resolves.toBeTruthy();
    });

    it('Should return 422 if there is a validation error', async () => {
      const newUser = {
        email: 'john@mailcom',
        password: '1234',
      };

      const response = await global.testRequest.post('/users').send(newUser);

      expect(response.status).toBe(422);
      expect(response.body).toEqual({
        code: 422,
        error: 'Document failed validation',
      });
    });

    it('Should return 409 if the email already exists', async () => {
      const newUser = {
        name: 'John Doe',
        email: 'john@mail.com',
        password: '1234',
      };

      await global.testRequest.post('/users').send(newUser);

      const response = await global.testRequest.post('/users').send(newUser);

      expect(response.status).toBe(409);
      expect(response.body).toEqual({
        code: 409,
        error:
          'E11000 duplicate key error collection: surf-forecast.users index: email_id dup key: { email: "john@mail.com" }',
      });
    });
  });
});
