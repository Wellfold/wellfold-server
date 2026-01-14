import { DefaultNamingStrategy, NamingStrategyInterface } from 'typeorm';
import { snakeCase } from 'typeorm/util/StringUtils';

export class PrefixNamingStrategy
  extends DefaultNamingStrategy
  implements NamingStrategyInterface
{
  constructor(private readonly prefix: string) {
    super();
  }

  tableName(className: string, customName: string): string {
    const raw = customName || snakeCase(className);
    if (className === `AuthUser`) {
      return customName || `users`;
    }
    return `${this.prefix}${raw}`;
  }
}
