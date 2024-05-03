export class InternalError extends Error {
  constructor(
    message: string,
    protected code: number = 500,
    protected description?: string
  ) {
    super(message);
    this.name = this.constructor.name; // Quem irá debugar a classe irá ver o nome dela corretamente
    Error.captureStackTrace(this, this.constructor); // Boa pratica para delete essa classe de stacktrace do erro
  }
}
