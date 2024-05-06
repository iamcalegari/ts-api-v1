import { CreateIndexProps, Methods, database } from '@src/database/database';
import { Model, ModelValidationSchema } from '@src/database/model';
import { ObjectId } from 'mongodb';

const allowedMethods = [
  Methods.UPDATE,
  Methods.INSERT,
  Methods.FIND_MANY,
  Methods.FIND,
  Methods.TOTAL,
];

export interface UserSchema {
  _id?: ObjectId | string;
  name: string;
  email: string;
  password: string;
}

const schema: ModelValidationSchema = {
  bsonType: 'object',
  properties: {
    name: {
      bsonType: 'string',
      description: 'The name of the user',
    },
    email: {
      bsonType: 'string',
      description: 'The email of the user',
    },
    password: {
      bsonType: 'string',
      description: 'The password of the user',
    },
  },

  required: ['name', 'email', 'password'],
};

const index: CreateIndexProps[] = [
  {
    key: { email: 1 },
    name: 'email_id',
    unique: true,
  },
];

export const User = database.defineModel<UserSchema>({
  collectionName: 'users',
  schema: schema,
  allowedMethods: allowedMethods,
  indexes: index,
});
