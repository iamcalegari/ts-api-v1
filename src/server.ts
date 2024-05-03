// Para adicionar o alias de module-alias nos diretorios do projeto
import { Server } from '@overnightjs/core';
import './utils/module-alias';
import bodyParser from 'body-parser';
import { ForecastController } from './controllers/forecast';
import { Application } from 'express';
import { Database, database } from './database/database';
import { BeachesController } from './controllers/beaches';

export class SetupServer extends Server {
  protected database: Database = database;

  constructor(private port = 3000) {
    super();
  }

  public async init(): Promise<void> {
    this.setupExpress();

    this.setupControllers();

    await this.setupDatabase();
  }

  public async close(): Promise<void> {
    await this.database.disconnect();
  }

  public getApp(): Application {
    return this.app;
  }

  private setupExpress(): void {
    // Passando um middleware para o express
    this.app.use(bodyParser.json()); // Usando o body-parser para o express para tratar o body da requisição em JSON
  }

  private setupControllers(): void {
    const forecastController = new ForecastController();
    const beachesController = new BeachesController();

    // Passando o controller para o express via overnight
    this.addControllers([forecastController, beachesController]);
  }

  private async setupDatabase(): Promise<void> {
    await this.database.connect();
  }
}
