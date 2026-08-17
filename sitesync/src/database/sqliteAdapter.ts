import { open as openOpSqlite } from '@op-engineering/op-sqlite';
import type { DB as OpSqliteDB, Transaction as OpSqliteTransaction } from '@op-engineering/op-sqlite';

type Scalar = string | number | boolean | null | ArrayBuffer | ArrayBufferView;

type Row = Record<string, Scalar>;

type RowCollection = Row[] & {
  item(index: number): Row;
};

export interface QueryResult {
  rows: RowCollection;
  rowsAffected: number;
  insertId?: number;
}

function wrapRows(rows: Row[] | undefined): RowCollection {
  const collection = (rows ?? []) as RowCollection;
  collection.item = (index: number) => collection[index];
  return collection;
}

function wrapResult(result: { rows: Row[]; rowsAffected: number; insertId?: number }): QueryResult {
  return {
    rows: wrapRows(result.rows),
    rowsAffected: result.rowsAffected,
    insertId: result.insertId,
  };
}

export interface Transaction {
  executeSql(query: string, params?: Scalar[]): Promise<QueryResult>;
}

export interface SQLiteDatabase {
  execute(query: string, params?: Scalar[]): Promise<QueryResult>;
  transactionAsync<T>(callback: (tx: Transaction) => Promise<T>): Promise<T>;
}

export async function open(options: { name: string }): Promise<SQLiteDatabase> {
  const db = openOpSqlite({ name: options.name });
  return adaptDatabase(db);
}

export async function close(db: SQLiteDatabase): Promise<void> {
  const native = (db as SQLiteDatabaseAdapter)._native;
  await native.closeAsync();
}

interface SQLiteDatabaseAdapter extends SQLiteDatabase {
  _native: OpSqliteDB;
}

function adaptDatabase(db: OpSqliteDB): SQLiteDatabaseAdapter {
  const adapted: SQLiteDatabaseAdapter = {
    _native: db,
    execute: async (query, params) => wrapResult(await db.execute(query, params)),
    transactionAsync: async <T>(callback: (tx: Transaction) => Promise<T>) => {
      let result!: T;
      await db.transaction(async (nativeTx: OpSqliteTransaction) => {
        const tx: Transaction = {
          executeSql: async (query, params) => wrapResult(await nativeTx.execute(query, params)),
        };
        result = await callback(tx);
      });
      return result;
    },
  };
  return adapted;
}
