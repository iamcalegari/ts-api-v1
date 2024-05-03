/*
  Devido a configuracao do jest, em: setupFilesAfterEnv: ["<rootDir>/test/jest-setup.ts"]
  esse arquivo vai ser executado antes de todos os testes
*/

import { SetupServer } from '@src/server';
import supertest from 'supertest';
import { database } from '@src/database/database';

let server: SetupServer;

const setupTestingDbs = async () => {
  // await import('@src/models/index');

  await database.setupCollections();
};
jest.setTimeout(0);
beforeAll(async () => {
  server = new SetupServer();
  await server.init();
  await setupTestingDbs();

  // Setando globalmente o server para ser usado em todos os testes utilizando o supertest
  global.testRequest = supertest(server.getApp());
});

beforeEach(async () => {
  await database.cleanCollections();
});

afterAll(async () => {
  await server.close();
});
