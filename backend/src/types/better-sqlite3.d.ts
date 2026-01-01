declare module 'better-sqlite3' {
  export interface Statement<TRun = any, TGet = any, TAll = any> {
    run(...params: any[]): { changes: number; lastInsertRowid: number };
    get(...params: any[]): TGet;
    all(...params: any[]): TAll[];
  }

  export default class Database {
    constructor(filename: string, options?: any);
    prepare<TGet = any, TAll = any>(sql: string): Statement<any, TGet, TAll>;
    exec(sql: string): void;
    close(): void;
    pragma(source: string): void;
  }
}
