// Para adicionar o alias de module-alias nos diretorios do projeto
import { Server } from '@overnightjs/core';
import './utils/module-alias';
import bodyParser from 'body-parser';
import { ForecastController } from './controlles/forecast';
import { Application } from 'express';
import { Database } from './database';

export class SetupServer extends Server {
  protected database: Database | undefined;

  constructor(private port = 3000) {
    super();
  }

  public async init(): Promise<void> {
    this.setupExpress();

    this.setupControllers();

    await this.setupDatabase();
  }

  public async close(): Promise<void> {
    await this.database!.disconnect();

    this.database = undefined;
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

    // Passando o controller para o express via overnight
    this.addControllers([forecastController]);
  }

  private async setupDatabase(): Promise<void> {
    this.database = new Database();

    await this.database.connect();
  }
}
