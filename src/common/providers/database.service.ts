// database.service.ts
import { HasExternalUuid } from '@/common/types/common.types';
import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, DeepPartial, Repository } from 'typeorm';

@Injectable()
export class DatabaseService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  private async upsertOne<T extends HasExternalUuid>(
    repo: Repository<T>,
    record: Record<string, any>,
  ): Promise<T> {
    const existing = await repo.findOne({
      where: { externalUuid: record.externalUuid },
    });

    if (existing) {
      return await repo.save(repo.merge(existing, record as DeepPartial<T>));
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

    return Promise.all(records.map((record) => this.upsertOne(repo, record)));
  }
}
