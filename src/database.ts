import config, { IConfig } from 'config';

import { MongoClient, Db } from 'mongodb';

const dbConfig: IConfig = config.get('App.database');

export class Database {
  protected client: MongoClient | undefined;
  protected db: Db | undefined;

  public async connect(): Promise<void> {
    if (this.isConnected(this.db) && this.client) {
      return;
    }

    this.client = await MongoClient.connect(dbConfig.get('mongoUrl'));
    this.db = this.client.db(dbConfig.get('dbName'));
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
}
