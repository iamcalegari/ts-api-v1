import {
  MetodosEnum,
  Model,
  ModelValidationSchema,
  database,
} from '@src/database';
import { ObjectId } from 'mongodb';

const allowedMethods = [
  MetodosEnum.ATUALIZAR,
  MetodosEnum.CADASTRAR,
  MetodosEnum.CADASTRAR_VARIOS,
  MetodosEnum.CONSULTAR,
  MetodosEnum.RECUPERAR,
];

export enum BeachPosition {
  S = 'S',
  E = 'E',
  W = 'W',
  N = 'N',
}

export interface BeachSchema {
  _id?: ObjectId | string;
  lat: number;
  lng: number;
  name: string;
  position: BeachPosition;
}

const schema: ModelValidationSchema = {
  bsonType: 'object',
  properties: {
    lat: {
      bsonType: 'number',
      description: 'The latitude coordinate of the beach',
    },
    lng: {
      bsonType: 'number',
      description: 'The longitude coordinate of the beach',
    },
    name: {
      bsonType: 'string',
      description: 'The name of the beach',
    },
    position: {
      bsonType: 'string',
      enum: ['S', 'E', 'N', 'W'],
      description: 'The position of the beach is facing on the map',
    },
  },
  required: ['lat', 'lng', 'name', 'position'],
};

interface BeachModel extends Model<BeachSchema> {}

export const Beach: BeachModel = database.defineModel<BeachSchema>({
  collectionName: 'beaches',
  schema: schema,
  allowedMethods: allowedMethods,
});
