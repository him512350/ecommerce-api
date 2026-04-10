import { DefaultNamingStrategy, NamingStrategyInterface } from 'typeorm';

function snakeCase(str: string): string {
  return str
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase()
    .replace(/^_/, '');
}

/**
 * Converts TypeORM's default camelCase join-column names to snake_case,
 * matching the column names created by our migrations.
 *
 * e.g. @ManyToOne parent → join column "parent_id" (not "parentId")
 */
export class SnakeCaseNamingStrategy
  extends DefaultNamingStrategy
  implements NamingStrategyInterface
{
  columnName(propertyName: string, customName: string, embeddedPrefixes: string[]): string {
    return customName || snakeCase(embeddedPrefixes.concat(propertyName).join('_'));
  }

  joinColumnName(relationName: string, referencedColumnName: string): string {
    return snakeCase(`${relationName}_${referencedColumnName}`);
  }

  joinTableName(firstTableName: string, secondTableName: string): string {
    return snakeCase(`${firstTableName}_${secondTableName}`);
  }

  joinTableColumnName(tableName: string, propertyName: string, columnName?: string): string {
    return snakeCase(`${tableName}_${columnName ?? propertyName}`);
  }
}
