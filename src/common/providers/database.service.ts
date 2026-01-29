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

const AUTO_TIMESTAMP_FIELDS = new Set([
  `created`,
  `createdInternally`,
  `createdAt`,
  `updated`,
  `updatedInternally`,
  `updatedAt`,
]);

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
        // Ignore undefined inputs entirely
        if (incomingValue === undefined) return false;

        // Ignore auto-managed timestamp fields
        // UNLESS the incoming payload explicitly includes them
        if (AUTO_TIMESTAMP_FIELDS.has(key)) return false;

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
    limit?: number,
    offset?: number,
    where: Record<string, any> = {},
    order?: any,
    relations?: any,
  ): Promise<T[]> {
    const repo = this.dataSource.getRepository(entityClass);

    return repo.find({
      where,
      take: limit ?? undefined,
      skip: offset ?? undefined,
      order: !order ? undefined : (order as any),
      relations,
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

  async getPropertyValues<T, K extends keyof T>(
    entityClass: new () => T,
    selectProperty: K,
    where: Partial<Record<keyof T, any>> = {},
    distinct = false,
  ): Promise<T[K][]> {
    const repo = this.dataSource.getRepository(entityClass);

    const qb = repo
      .createQueryBuilder(`e`)
      .select(`e.${String(selectProperty)}`, String(selectProperty));

    Object.entries(where).forEach(([key, value], index) => {
      qb.andWhere(`e.${key} = :value${index}`, {
        [`value${index}`]: value,
      });
    });

    if (distinct) {
      qb.distinct(true);
    }

    const rows = await qb.getRawMany();

    return rows.map((row) => row[selectProperty as string]);
  }

  async getPropertyValuesMany<T, K extends readonly (keyof T)[]>(
    entityClass: new () => T,
    selectProperties: K,
    where: Partial<Record<keyof T, any>> = {},
    distinct = false,
  ): Promise<Array<Pick<T, K[number]>>> {
    const repo = this.dataSource.getRepository(entityClass);

    const qb = repo.createQueryBuilder(`e`);

    selectProperties.forEach((prop) => {
      qb.addSelect(`e.${String(prop)}`, String(prop));
    });

    Object.entries(where).forEach(([key, value], index) => {
      qb.andWhere(`e.${key} = :value${index}`, {
        [`value${index}`]: value,
      });
    });

    if (distinct) {
      qb.distinct(true);
    }

    const rows = await qb.getRawMany();

    return rows.map((row) => {
      const result: Partial<T> = {};
      selectProperties.forEach((prop) => {
        result[prop] = row[String(prop)];
      });
      return result as Pick<T, K[number]>;
    });
  }
}
