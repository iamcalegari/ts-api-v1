/*
  Devido a configuracao do jest, em: setupFilesAfterEnv: ["<rootDir>/test/jest-setup.ts"]
  esse arquivo vai ser executado antes de todos os testes
*/

import { SetupServer } from "@src/server";
import supertest from "supertest";

beforeAll(() => {
  const server = new SetupServer();
  server.init();

  // Setando globalmente o server para ser usado em todos os testes utilizando o supertest
  global.testRequest = supertest(server.getApp());
});
