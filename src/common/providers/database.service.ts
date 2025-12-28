// database.service.ts
import { HasExternalUuid } from '@/common/types/common.types';
import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import {
  DataSource,
  DeepPartial,
  FindOptionsOrder,
  In,
  Repository,
} from 'typeorm';
@Injectable()
export class DatabaseService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  public async upsertOne<T extends HasExternalUuid>(
    repo: Repository<T>,
    record: Record<string, any>,
    idName = `externalUuid`,
  ): Promise<T> {
    let existing: T | null = null;

    try {
      existing = await repo.findOne({
        where: { [idName]: record[idName] } as any,
      });
    } catch (e) {
      console.error(e);
    }

    if (existing) {
      const hasChanges = Object.entries(record).some(([key, incomingValue]) => {
        // ignore undefined inputs entirely
        if (incomingValue === undefined) return false;

        const existingValue = (existing as any)[key];

        // Date-safe comparison
        if (existingValue instanceof Date && incomingValue instanceof Date) {
          return existingValue.getTime() !== incomingValue.getTime();
        }

        return existingValue !== incomingValue;
      });

      if (!hasChanges) {
        return existing;
      }

      try {
        return await repo.save(repo.merge(existing, record as DeepPartial<T>));
      } catch (e) {
        console.error(e);
      }
    }

    try {
      return await repo.save(repo.create(record as T));
    } catch (e) {
      console.error(e);
    }
  }

  /**
   * Upsert all records passed in parallel.
   * Batching is now handled outside this service.
   */
  async upsertMany<T>(
    entityClass: new () => T,
    records: Record<string, any>[],
    findById?: string,
  ): Promise<T[]> {
    const repo = this.dataSource.getRepository(entityClass);
    try {
      return Promise.all(
        records.map((record) => this.upsertOne(repo, record, findById)),
      );
    } catch (e) {
      console.error(e);
    }
  }

  async getMany<T>(
    entityClass: new () => T,
    limit: number,
    offset: number,
    where: Record<string, any> = {},
    ignoreOrder?: boolean,
  ): Promise<T[]> {
    const repo = this.dataSource.getRepository(entityClass);

    return repo.find({
      where,
      take: limit,
      skip: offset,
      order: ignoreOrder
        ? undefined
        : ({
            createdInternally: `ASC`,
          } as any),
    });
  }

  async getByProperty<T>(
    entityClass: new () => T,
    property: keyof T,
    valueOrValues: any | readonly any[],
    orderBy?: keyof T,
    orderDirection: `ASC` | `DESC` = `ASC`,
  ): Promise<T[]> {
    const repo = this.dataSource.getRepository(entityClass);

    const whereValue = Array.isArray(valueOrValues)
      ? In(valueOrValues)
      : valueOrValues;

    const order: FindOptionsOrder<T> | undefined = orderBy
      ? ({ [orderBy]: orderDirection } as FindOptionsOrder<T>)
      : undefined;

    return repo.find({
      where: { [property]: whereValue } as any,
      order,
    });
  }

  async count<T>(entityClass: new () => T): Promise<number> {
    return this.dataSource.getRepository(entityClass).count();
  }
}
