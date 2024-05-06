import { CUSTOM_VALIDATION } from '@src/database/database';
import { Response } from 'express';
import { MongoError } from 'mongodb';

export interface MongoClientError extends MongoError {
  kind?: string;
}

export abstract class BaseController {
  protected sendCreatedUpdatedErrorResponse(
    res: Response,
    error: MongoError | Error,
    statusCode?: number
  ): void {
    if (error instanceof MongoError) {
      const clientError = this.handleClientErrors(error);

      res
        .status(clientError.code)
        .send({ code: clientError.code, error: clientError.message });
    } else {
      res
        .status(statusCode || 500)
        .send({ code: statusCode || 500, error: 'Something went wrong!' });
    }
  }

  private handleClientErrors(error: MongoClientError): {
    code: number;
    message: string;
  } {
    if (error.kind === CUSTOM_VALIDATION.UNIQUE) {
      return { code: 409, message: error.message };
    }

    return { code: 422, message: error.message };
  }
}
