// Para adicionar o alias de module-alias nos diretorios do projeto
import { Server } from "@overnightjs/core";
import "./utils/module-alias";
import bodyParser from "body-parser";
import { ForecastController } from "./controlles/forecast";

export class SetupServer extends Server {
  constructor(private port = 3000) {
    super();
  }

  public init(): void {
    this.setupExpress();
    this.setupControllers();
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
}
