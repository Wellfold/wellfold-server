import { Member, Transaction } from '@/common/entities';
import { DatabaseService } from '@/common/providers/database.service';
import { HasExternalUuid } from '@/common/types/common.types';
import { OliveService } from '@/olive/olive.service';
import { Command, Console } from 'nestjs-console';
import { DeepPartial } from 'typeorm';

@Console()
export class SyncManagerService {
  constructor(
    protected olive: OliveService,
    protected dbService: DatabaseService,
  ) {}

  @Command({
    alias: `rii`,
    command: `run-initial-import`,
  })
  async runInitialImport() {
    await this.importMembers();
    await this.importTransactions();
  }

  /**
   * Generic method shared across objects
   *
   * Calls the given oliveFetcher(pageSize, pageNumber)
   * Applies chunking + mapping (externalUuid)
   * Upserts batches into DB
   */
  private async importPaginated<
    TRecord extends { id: string },
    TEntity extends HasExternalUuid,
  >(
    oliveFetcher: (
      pageSize: number,
      pageNumber: number,
    ) => Promise<{ items: TRecord[] }>,
    entityClass: new () => TEntity,
  ): Promise<void> {
    const pageSize = 1000;
    const batchSize = 250;
    let pageNumber = 1;

    while (true) {
      const { items } = await oliveFetcher(pageSize, pageNumber);
      console.log(
        `Fetched page ${pageNumber}: ${
          items.length
        } ${entityClass.name.toLowerCase()}s`,
      );

      if (!items.length) break;

      for (let i = 0; i < items.length; i += batchSize) {
        const chunk = items.slice(i, i + batchSize);

        const mapped = chunk.map((record) => {
          const { id, ...rest } = record;
          return {
            externalUuid: id,
            ...rest,
          } as unknown as DeepPartial<TEntity>;
        });

        console.log(
          `Upserting chunk ${i / batchSize + 1} of ${Math.ceil(
            items.length / batchSize,
          )}`,
        );

        await this.dbService.upsertMany(entityClass, mapped);
      }

      if (items.length < pageSize) break;
      pageNumber++;
    }

    console.log(`${entityClass.name} import completed.`);
  }

  /**
   * Import Members using shared logic
   */
  async importMembers(): Promise<void> {
    console.log(`Importing members.`);
    return this.importPaginated(
      (pageSize, pageNumber) => this.olive.pullMembers(pageSize, pageNumber),
      Member,
    );
  }

  /**
   * Import Transactions using shared logic
   */
  async importTransactions(): Promise<void> {
    console.log(`Importing transactions.`);
    return this.importPaginated(
      (pageSize, pageNumber) =>
        this.olive.pullTransactions(pageSize, pageNumber),
      Transaction,
    );
  }
}
