/*
  Se importar aqui o js vai tratar esse arquivo .d.ts como um modulo local e nao global
  import { Agent } from "supertest"
  
  Para que o js trate o .d.ts como um modulo global, deve-se realizar o import inline
*/

declare var testRequest: import("supertest").Agent;
