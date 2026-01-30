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

type AnyRecord = Record<string, any>;

const AUTO_MANAGED_FIELDS = new Set([
  `id`,
  `externalUuid`,
  `created`,
  `createdAt`,
  `createdInternally`,
  `updated`,
  `updatedAt`,
  `updatedInternally`,
]);

@Injectable()
export class DatabaseService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  public async upsertOne<T extends HasExternalUuid>(
    repo: Repository<T>,
    record: Record<string, any>,
    idName = `externalUuid`,
    relations?: any,
  ): Promise<T> {
    let existing: T | null = null;

    try {
      existing = await repo.findOne({
        where: { [idName]: record[idName] } as any,
        relations,
      });
    } catch (e) {
      console.error(e);
    }

    function normalizeNumeric(value: any): string | null {
      if (value === null || value === undefined) return null;
      return Number(value).toFixed(2);
    }

    function normalizeDate(value: any): number | null {
      if (value === null || value === undefined) return null;

      const date = value instanceof Date ? value : new Date(value);
      if (isNaN(date.getTime())) return null;

      // 🔑 truncate to millisecond precision
      return Math.floor(date.getTime());
    }

    function isPrimitive(val: any): boolean {
      return (
        val === null ||
        val === undefined ||
        typeof val === `string` ||
        typeof val === `number` ||
        typeof val === `boolean`
      );
    }

    function extractFk(value: any): any {
      if (!value || typeof value !== `object`) return value;

      // Common FK shapes in your codebase
      if (`numericId` in value) return value.numericId;
      if (`id` in value) return value.id;
      if (`externalUuid` in value) return value.externalUuid;

      return undefined;
    }

    function hasMeaningfulChanges<T extends AnyRecord>(
      existing: T,
      incoming: Partial<T>,
    ): boolean {
      return Object.entries(incoming).some(([key, incomingValue]) => {
        // Ignore auto-managed fields
        if (AUTO_MANAGED_FIELDS.has(key)) return false;

        // Ignore missing fields entirely
        if (incomingValue === undefined) return false;

        const existingValue = (existing as any)[key];

        // Treat null and undefined as equal
        if (
          (existingValue === null || existingValue === undefined) &&
          (incomingValue === null || incomingValue === undefined)
        ) {
          return false;
        }

        // FK-aware object comparison
        const existingFk = extractFk(existingValue);
        const incomingFk = extractFk(incomingValue);

        if (existingFk !== undefined || incomingFk !== undefined) {
          return String(existingFk) !== String(incomingFk);
        }

        // Date comparison
        if (
          existingValue instanceof Date ||
          incomingValue instanceof Date ||
          typeof incomingValue === `string`
        ) {
          return normalizeDate(existingValue) !== normalizeDate(incomingValue);
        }

        // Numeric normalization (Postgres numeric)
        if (
          typeof existingValue === `string` &&
          typeof incomingValue === `string` &&
          !isNaN(Number(existingValue)) &&
          !isNaN(Number(incomingValue))
        ) {
          return (
            normalizeNumeric(existingValue) !== normalizeNumeric(incomingValue)
          );
        }

        // Primitive comparison
        if (isPrimitive(existingValue) && isPrimitive(incomingValue)) {
          return existingValue !== incomingValue;
        }

        return false;
      });
    }

    if (existing) {
      const hasChanges = hasMeaningfulChanges(existing, record as any);

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
    relations?: any,
  ): Promise<T[]> {
    const repo = this.dataSource.getRepository(entityClass);
    try {
      return Promise.all(
        records.map((record) =>
          this.upsertOne(repo, record, findById, relations),
        ),
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
