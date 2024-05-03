import { Methods, database } from '@src/database/database';
import { Model, ModelValidationSchema } from '@src/database/model';
import { ObjectId } from 'mongodb';

const allowedMethods = [
  Methods.UPDATE,
  Methods.INSERT,
  Methods.INSERT_MANY,
  Methods.FIND_MANY,
  Methods.FIND,
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
