// database.service.ts
import { HasExternalUuid } from '@/common/types/common.types';
import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, DeepPartial, Repository } from 'typeorm';

@Injectable()
export class DatabaseService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  public async upsertOne<T extends HasExternalUuid>(
    repo: Repository<T>,
    record: Record<string, any>,
  ): Promise<T> {
    const existing = await repo.findOne({
      where: { externalUuid: record.externalUuid },
    });

    if (existing) {
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
  async upsertMany<T extends HasExternalUuid>(
    entityClass: new () => T,
    records: Record<string, any>[],
  ): Promise<T[]> {
    const repo = this.dataSource.getRepository(entityClass);
    try {
      return Promise.all(records.map((record) => this.upsertOne(repo, record)));
    } catch (e) {
      console.error(e);
    }
  }

  async getMany<T>(
    entityClass: new () => T,
    limit: number,
    offset: number,
    where: Record<string, any> = {},
  ): Promise<T[]> {
    const repo = this.dataSource.getRepository(entityClass);

    return repo.find({
      where,
      take: limit,
      skip: offset,
      order: {
        createdInternally: `ASC`,
      } as any,
    });
  }

  async getByProperty<T>(
    entityClass: new () => T,
    property: keyof T,
    value: any,
  ): Promise<T[]> {
    const repo = this.dataSource.getRepository(entityClass);
    return repo.find({
      where: { [property]: value } as any,
    });
  }

  async count<T>(entityClass: new () => T): Promise<number> {
    return this.dataSource.getRepository(entityClass).count();
  }
}
