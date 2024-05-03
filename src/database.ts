import config, { IConfig } from 'config';
import { JSONSchema4 } from 'json-schema';

import {
  MongoClient,
  Db,
  IndexSpecification,
  CreateIndexesOptions,
  Document,
  Filter,
  AnyBulkWriteOperation,
  BulkWriteOptions,
  Collection,
  AggregateOptions,
  UpdateFilter,
  FindOneAndUpdateOptions,
  FindOptions,
  OptionalUnlessRequiredId,
  InsertOneOptions,
  DeleteOptions,
  ObjectId,
  WithId,
  FindOneAndDeleteOptions,
  CountDocumentsOptions,
} from 'mongodb';
import { removerDadosIndefinidos } from './utils/object';

export type CreateIndexProps = {
  key: IndexSpecification;
} & CreateIndexesOptions;

export type ModelValidationSchema = JSONSchema4 & {
  bsonType: string | string[];
  items?: ModelValidationSchema;
  properties?: {
    [k: string]: ModelValidationSchema;
  };
};

type ModelDbValidationProps = {
  validationAction: string;
  validationLevel: string;
  validator: {
    $jsonSchema: ModelValidationSchema;
  };
};

type CreateModelProps = {
  collectionName: string;
  schema: ModelValidationSchema;
  indexes: CreateIndexProps[];
  allowedMethods: MetodosEnum[];
  documentDefaults: Record<string, any>;
  validationQueryExpressions?: ValidationQueryExpressions;
  validity?: boolean;
};

export enum MetodosEnum {
  AGREGAR = 'agregar',
  ATUALIZAR = 'atualizar',
  CADASTRAR = 'cadastrar',
  CADASTRAR_VARIOS = 'cadastrarVarios',
  CONSULTAR = 'consultar',
  DELETAR = 'deletar',
  ESCRITA_LOTE = 'escritaLote',
  RECUPERAR = 'recuperar',
  RECUPERAR_POR_ID = 'recuperarPorId',
  REMOVER = 'remover',
  TOTAL = 'total',
}

export type ValidationQueryExpressions = Filter<Document>;

type IModelSetup = {
  allowedMethods?: MetodosEnum[];
  indexes?: CreateIndexProps[];
  schema: ModelValidationSchema;
  collectionName: string;
  documentDefaults?: Record<string, any>;
  validationQueryExpressions?: ValidationQueryExpressions;
  validity?: boolean;
};

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
  }: IModelSetup): Model<ModelType> {
    const model = Database.modelMap.get(collectionName) as Model<ModelType>;

    if (model !== undefined) {
      return model;
    }

    const _allowedMethods = validity
      ? [
          MetodosEnum.ATUALIZAR,
          MetodosEnum.CADASTRAR,
          MetodosEnum.CONSULTAR,
          MetodosEnum.RECUPERAR,
          MetodosEnum.RECUPERAR_POR_ID,
          MetodosEnum.REMOVER,
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
      get(target: Model<Document>, prop: MetodosEnum, receiver: unknown) {
        if (
          target.methods.includes(prop) &&
          !target.allowedMethods.includes(prop)
        ) {
          throw new Error(
            `o método "${prop}" não está disponível para a collection "${target.collectionName}"`
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
}

export const database = new Database();

export class Model<ModelType extends Document> {
  collectionName: string;

  indexes: CreateIndexProps[];

  validator: { $jsonSchema: ModelValidationSchema };

  validationAction: string;

  validationLevel: string;

  methods: string[];

  allowedMethods: MetodosEnum[];

  documentDefaults: Record<string, any>;

  static create<ModelType extends Document>(
    props: CreateModelProps
  ): Model<ModelType> {
    return new Model(props);
  }

  constructor(props: CreateModelProps) {
    const {
      allowedMethods,
      collectionName,
      documentDefaults,
      indexes,
      schema,
      validationQueryExpressions,
    } = props;

    this.collectionName = collectionName;
    this.indexes = indexes;
    this.allowedMethods = allowedMethods;
    this.documentDefaults = documentDefaults;

    const { validationAction, validationLevel, validator } =
      this.schemaValidatorBuilder({
        schema,
        validationQueryExpressions,
      });

    this.validator = validator;
    this.validationAction = validationAction;
    this.validationLevel = validationLevel;

    this.methods = Object.values(MetodosEnum);
  }

  private schemaValidatorBuilder({
    schema,
    validationQueryExpressions = {},
  }: {
    schema: ModelValidationSchema;
    validationQueryExpressions?: ValidationQueryExpressions;
    validity?: boolean;
  }): ModelDbValidationProps {
    return {
      validationAction: 'error',
      validationLevel: 'strict',
      validator: {
        $jsonSchema: {
          additionalProperties: false,
          bsonType: 'object',
          properties: {
            _id: {
              bsonType: 'objectId',
              description: 'Identificador único do registro na base de dados',
            },
            ...this.includeAdditionalPropertiesFalse(schema).properties,
          },
          required: [...((schema.required as string[]) ?? []), '_id'],
        },
        ...validationQueryExpressions,
      },
    };
  }

  private includeAdditionalPropertiesFalse(
    schema: ModelValidationSchema
  ): ModelValidationSchema {
    if (schema.bsonType === 'object' && !schema.additionalProperties) {
      schema.additionalProperties = false;
    }

    if (schema.items) {
      this.includeAdditionalPropertiesFalse(schema.items);
    }

    if (schema.properties) {
      Object.keys(schema.properties).forEach((key) => {
        this.includeAdditionalPropertiesFalse((schema.properties ?? {})[key]);
      });
    }

    return schema;
  }

  agregar(pipeline: Document[], options: AggregateOptions = {}) {
    const collection = database.getCollection<ModelType>(
      this.collectionName
    ) as Collection<ModelType>;

    return collection.aggregate(pipeline, options).toArray();
  }

  async atualizar(
    filter: Filter<ModelType>,
    update: UpdateFilter<ModelType>,
    options: FindOneAndUpdateOptions = {}
  ) {
    const cleanedUpdate = {
      ...update,
      ...(update.$set && { $set: removerDadosIndefinidos(update.$set) }),
    };

    const collection = database.getCollection<ModelType>(
      this.collectionName
    ) as Collection<ModelType>;

    const { value: doc } = (await collection.findOneAndUpdate(
      filter,
      cleanedUpdate as UpdateFilter<ModelType>,
      {
        ...options,
        returnDocument: 'after',
      }
    ))!;

    return doc;
  }

  consultar(filter: Filter<ModelType>, options: FindOptions = {}) {
    const collection = database.getCollection<ModelType>(
      this.collectionName
    ) as Collection<ModelType>;

    return collection.find(filter, options).toArray() ?? [];
  }

  deletar(filter: Filter<ModelType>, options: DeleteOptions = {}) {
    const collection = database.getCollection<ModelType>(
      this.collectionName
    ) as Collection<ModelType>;

    return collection.deleteMany(filter, options);
  }

  async cadastrar(
    document: OptionalUnlessRequiredId<ModelType>,
    options: InsertOneOptions = {}
  ) {
    const _document = removerDadosIndefinidos({
      ...this.documentDefaults,
      ...removerDadosIndefinidos(document),
    }) as OptionalUnlessRequiredId<ModelType>;
    const collection = database.getCollection<ModelType>(
      this.collectionName
    ) as Collection<ModelType>;

    const { insertedId } = await collection.insertOne(
      { ..._document },
      options
    );

    return { _id: insertedId, ..._document } as WithId<ModelType>;
  }

  cadastrarVarios(
    documents: OptionalUnlessRequiredId<ModelType>[],
    options: BulkWriteOptions = {}
  ) {
    const _documents = documents.map((doc) => ({
      ...this.documentDefaults,
      ...removerDadosIndefinidos(doc),
    }));
    const collection = database.getCollection<ModelType>(
      this.collectionName
    ) as Collection<ModelType>;

    return collection.insertMany(
      _documents as OptionalUnlessRequiredId<ModelType>[],
      options
    );
  }

  recuperar(
    filter: Filter<ModelType>,
    options?: FindOptions
  ): Promise<WithId<ModelType> | null> | null {
    const collection = database.getCollection<ModelType>(
      this.collectionName
    ) as Collection<ModelType>;

    return collection.findOne(filter, options) ?? null;
  }

  recuperarPorId(documentId: ObjectId | string, options?: FindOptions) {
    return this.recuperar(
      { _id: Database.toObjectId(documentId) } as unknown as Filter<ModelType>,
      options
    );
  }

  async remover(filter: Filter<ModelType>, options?: FindOneAndDeleteOptions) {
    const collection = database.getCollection<ModelType>(
      this.collectionName
    ) as Collection<ModelType>;

    const { value: doc } = (await collection.findOneAndDelete(
      filter,
      options ?? {}
    ))!;

    return doc;
  }

  total(filter: Filter<ModelType>, options: CountDocumentsOptions = {}) {
    const collection = database.getCollection<ModelType>(
      this.collectionName
    ) as Collection<ModelType>;

    return collection.countDocuments(filter, options);
  }

  escritaLote(
    operations: AnyBulkWriteOperation<ModelType>[],
    options?: BulkWriteOptions
  ) {
    const _operations = operations.map((operation) => {
      const anyOperarion = operation as any;

      if (anyOperarion.insertOne) {
        anyOperarion.insertOne.document = {
          ...this.documentDefaults,
          ...removerDadosIndefinidos(anyOperarion.insertOne.document),
        };
      }

      if (anyOperarion.updateOne && anyOperarion.updateOne.update.$set) {
        anyOperarion.updateOne.update.$set = removerDadosIndefinidos(
          anyOperarion.updateOne.update.$set ?? {}
        );
      }

      return operation;
    });

    const collection = database.getCollection<ModelType>(
      this.collectionName
    ) as Collection<ModelType>;

    return collection.bulkWrite(_operations, options ?? {});
  }
}
