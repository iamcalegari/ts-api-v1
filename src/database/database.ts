import config, { IConfig } from 'config';

import {
  MongoClient,
  Db,
  IndexSpecification,
  CreateIndexesOptions,
  Document,
  ObjectId,
} from 'mongodb';
import { ModelSetup, Model } from './model';

export type CreateIndexProps = {
  key: IndexSpecification;
} & CreateIndexesOptions;

export enum Methods {
  AGGREGATE = 'aggregate',
  UPDATE = 'update',
  INSERT = 'insert',
  INSERT_MANY = 'insertMany',
  FIND_MANY = 'findMany',
  DELETE_MANY = 'deletar',
  BULK_WRITE = 'bulkWrite',
  FIND = 'find',
  FIND_BY_ID = 'findById',
  DELETE = 'delete',
  TOTAL = 'total',
}

export enum CUSTOM_VALIDATION {
  UNIQUE = 'unique',
}

const dbConfig: IConfig = config.get('App.database');

export class Database {
  protected client: MongoClient | undefined;
  protected db: Db | undefined;
  private static modelMap: Map<string, Model<Document>> = new Map();

  public async connect(): Promise<void> {
    if (this.isConnected(this.db) && this.client) {
      return;
    }

    this.client = await MongoClient.connect(dbConfig.get('mongoUrl'));
    this.db = this.client.db(dbConfig.get('dbName'));
  }

  public defineModel<ModelType extends Document>({
    allowedMethods = [],
    indexes = [],
    schema,
    collectionName,
    documentDefaults = {},
    validationQueryExpressions,
    validity = false,
  }: ModelSetup): Model<ModelType> {
    const model = Database.modelMap.get(collectionName) as Model<ModelType>;

    if (model !== undefined) {
      return model;
    }

    const _allowedMethods = validity
      ? [
          Methods.UPDATE,
          Methods.INSERT,
          Methods.FIND_MANY,
          Methods.FIND,
          Methods.FIND_BY_ID,
          Methods.DELETE,
        ]
      : allowedMethods;

    const newModel = Model.create({
      allowedMethods: _allowedMethods,
      collectionName,
      documentDefaults,
      indexes,
      schema,
      validationQueryExpressions,
      validity,
    });
    const modelValue = new Proxy(newModel, this.modelProxyHandler());

    Database.modelMap.set(collectionName, modelValue);

    return modelValue as Model<ModelType>;
  }

  private modelProxyHandler() {
    return {
      get(target: Model<Document>, prop: Methods, receiver: unknown) {
        if (
          target.methods.includes(prop) &&
          !target.allowedMethods.includes(prop)
        ) {
          throw new Error(
            `The method "${prop}" is not allowed in "${target.collectionName}"`
          );
        }

        const originalMethod = target[prop as unknown as keyof typeof target];

        if (typeof originalMethod === 'function') {
          Reflect.get(target, prop, receiver).bind(target);
        }

        return Reflect.get(target, prop, receiver);
      },
    };
  }

  public async disconnect(): Promise<void> {
    if (!this.isConnected(this.db) || !this.client) {
      console.log('alo');
      return;
    }

    await this.client.close();

    this.db = undefined;
    this.client = undefined;
  }

  private isConnected(db: Db | undefined): Boolean {
    return !!db;
  }

  public getCollection<T extends Document>(collectionName: string) {
    return this.db?.collection<T>(collectionName);
  }

  static toObjectId(objectId?: string | ObjectId): ObjectId {
    return new ObjectId(objectId);
  }

  static objectId(): ObjectId {
    return new ObjectId();
  }

  static async loadModels(modelsPath: string) {
    await import(modelsPath);
  }

  async setupCollections(): Promise<void> {
    const modelArray = Database.modelMap.values();

    for (const model of modelArray) {
      await this.setupCollection(model);
    }
  }

  async setupCollection(model: Model<Document>): Promise<void> {
    const collectionExists = await this.collectionExists(model.collectionName);

    if (!collectionExists) {
      await this.db?.createCollection(model.collectionName);
    }

    if (model.validator) {
      await this.setupValidators(model);
    }

    await this.setupIndexes(model);
  }

  private async collectionExists(collectionName: string): Promise<boolean> {
    const collectionNames = await this.db
      ?.listCollections()
      .map((collInfo) => collInfo.name)
      .toArray();

    return Boolean(
      collectionNames?.some((collName) => collName === collectionName)
    );
  }

  private async setupValidators(model: Model<Document>) {
    const validators = {
      validator: model.validator,
      validationAction: model.validationAction,
      validationLevel: model.validationLevel,
    };

    await this.db?.command({
      collMod: model.collectionName,
      ...validators,
    });
  }

  private async setupIndexes(model: Model<Document>) {
    const collection = this.db?.collection(model.collectionName);

    await collection?.dropIndexes();

    const newIndexes = model.indexes;

    for (const newIndex of newIndexes) {
      const { key, ...options } = newIndex;

      await collection?.createIndex(key, options);
    }
  }

  async cleanCollections() {
    if (!this.db) {
      return;
    }

    const collectionsInfo = await this.db.collections();

    if (!collectionsInfo) {
      return;
    }

    for (const { collectionName } of collectionsInfo) {
      const collection = this.db?.collection(collectionName);
      const count = (await collection?.countDocuments()) ?? 0;

      if (count <= 0) {
        continue;
      }

      await collection?.deleteMany({});
    }
  }
}

export const database = new Database();
