import { Member } from '@/common/entities';
import { OliveService } from '@/olive/olive.service';
import { Command, Console } from 'nestjs-console';
import { DatabaseService } from './../../common/providers/database.service';
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
    console.log(`Running initial import.`);
    await this.importMembers();
  }
  async importMembers(): Promise<void> {
    const pageSize = 1000;
    const batchSize = 100;
    let pageNumber = 1;

    while (true) {
      const { items } = await this.olive.pullMembers(pageSize, pageNumber);
      console.log(`Fetched page ${pageNumber}: ${items.length} members`);

      if (!items.length) break;
      for (let i = 0; i < items.length; i += batchSize) {
        const chunk = items.slice(i, i + batchSize);

        const mapped = chunk.map((member) => {
          const { id, ...rest } = member;
          return {
            externalUuid: id,
            ...rest,
          };
        });

        console.log(
          `Upserting chunk: ${i / batchSize + 1} of ${Math.ceil(
            items.length / batchSize,
          )}`,
        );

        await this.dbService.upsertMany(Member, mapped);
      }

      // If last page, break
      if (items.length < pageSize) break;

      pageNumber++;
    }

    console.log(`Member import completed.`);
  }
}
