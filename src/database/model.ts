import { JSONSchema4 } from 'json-schema';
import { CreateIndexProps, Database, Methods, database } from './database';
import { deleteUndefinedData } from '../utils/object';
import {
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
  MongoError,
} from 'mongodb';
interface ModelDbValidationProps {
  validationAction: string;
  validationLevel: string;
  validator: {
    $jsonSchema: ModelValidationSchema;
  };
}

interface CreateModelProps {
  collectionName: string;
  schema: ModelValidationSchema;
  indexes: CreateIndexProps[];
  allowedMethods: Methods[];
  documentDefaults: Record<string, any>;
  validationQueryExpressions?: ValidationQueryExpressions;
  validity?: boolean;
}

export interface ValidationQueryExpressions extends Filter<Document> {}

export interface ModelSetup {
  allowedMethods?: Methods[];
  indexes?: CreateIndexProps[];
  schema: ModelValidationSchema;
  collectionName: string;
  documentDefaults?: Record<string, any>;
  validationQueryExpressions?: ValidationQueryExpressions;
  validity?: boolean;
}

export interface ModelValidationSchema extends JSONSchema4 {
  bsonType: string | string[];
  items?: ModelValidationSchema;
  properties?: {
    [k: string]: ModelValidationSchema;
  };
}

export class Model<ModelType extends Document> {
  collectionName: string;

  indexes: CreateIndexProps[];

  validator: { $jsonSchema: ModelValidationSchema };

  validationAction: string;

  validationLevel: string;

  methods: string[];

  allowedMethods: Methods[];

  documentDefaults: Record<string, any>;

  preMethod: Record<Methods, Function> = {
    [Methods.UPDATE]: () => {},
    [Methods.INSERT]: () => {},
    [Methods.FIND_MANY]: () => {},
    [Methods.FIND]: () => {},
    [Methods.TOTAL]: () => {},
    [Methods.FIND_BY_ID]: () => {},
    [Methods.DELETE]: () => {},
    [Methods.AGGREGATE]: () => {},
    [Methods.INSERT_MANY]: () => {},
    [Methods.DELETE_MANY]: () => {},
    [Methods.BULK_WRITE]: () => {},
  };

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

    this.methods = Object.values(Methods);
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

  pre<T extends ModelType>(
    methodName: Methods,
    transformer: (this: T, ...args: any[]) => void
  ) {
    this.preMethod[methodName] = transformer;
  }

  agregar(pipeline: Document[], options: AggregateOptions = {}) {
    const collection = database.getCollection<ModelType>(
      this.collectionName
    ) as Collection<ModelType>;

    return collection.aggregate(pipeline, options).toArray();
  }

  async update(
    filter: Filter<ModelType>,
    update: UpdateFilter<ModelType>,
    options: FindOneAndUpdateOptions = {}
  ) {
    await this.preMethod[Methods.INSERT_MANY].bind(update.$set)();

    const cleanedUpdate = {
      ...update,
      ...(update.$set && { $set: deleteUndefinedData(update.$set) }),
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

  findMany(filter: Filter<ModelType>, options: FindOptions = {}) {
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

  async insert(
    document: OptionalUnlessRequiredId<ModelType>,
    options: InsertOneOptions = {}
  ) {
    const shallowCopy = { ...document };

    await this.preMethod[Methods.INSERT].bind(shallowCopy)();

    const _document = deleteUndefinedData({
      ...this.documentDefaults,
      ...deleteUndefinedData(shallowCopy),
    }) as OptionalUnlessRequiredId<ModelType>;
    const collection = database.getCollection<ModelType>(
      this.collectionName
    ) as Collection<ModelType>;

    try {
      const { insertedId } = await collection.insertOne(
        { ..._document },
        options
      );

      return { _id: insertedId, ..._document } as WithId<ModelType>;
    } catch (err: any) {
      throw new MongoError(err.message);
    }
  }

  async insertMany(
    documents: OptionalUnlessRequiredId<ModelType>[],
    options: BulkWriteOptions = {}
  ) {
    await this.preMethod[Methods.INSERT_MANY].bind(documents)();

    const _documents = documents.map((doc) => ({
      ...this.documentDefaults,
      ...deleteUndefinedData(doc),
    }));
    const collection = database.getCollection<ModelType>(
      this.collectionName
    ) as Collection<ModelType>;

    return collection.insertMany(
      _documents as OptionalUnlessRequiredId<ModelType>[],
      options
    );
  }

  find(
    filter: Filter<ModelType>,
    options?: FindOptions
  ): Promise<WithId<ModelType> | null> | null {
    const collection = database.getCollection<ModelType>(
      this.collectionName
    ) as Collection<ModelType>;

    return collection.findOne(filter, options) ?? null;
  }

  findById(documentId: ObjectId | string, options?: FindOptions) {
    return this.find(
      { _id: Database.toObjectId(documentId) } as unknown as Filter<ModelType>,
      options
    );
  }

  async delete(filter: Filter<ModelType>, options?: FindOneAndDeleteOptions) {
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

  bulkWrite(
    operations: AnyBulkWriteOperation<ModelType>[],
    options?: BulkWriteOptions
  ) {
    const _operations = operations.map((operation) => {
      const anyOperarion = operation as any;

      if (anyOperarion.insertOne) {
        anyOperarion.insertOne.document = {
          ...this.documentDefaults,
          ...deleteUndefinedData(anyOperarion.insertOne.document),
        };
      }

      if (anyOperarion.updateOne && anyOperarion.updateOne.update.$set) {
        anyOperarion.updateOne.update.$set = deleteUndefinedData(
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
