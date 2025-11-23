import { Generated, Kysely, Selectable, sql } from "kysely";

export interface DB {
  search: {
    id: string;
    metadata: string;
    createAt: Generated<Date>; // TODO: make as iso string
    updateAt: Generated<Date>; // TODO: make as iso string
  };
  metadata: {
    id: string;
    title: string;
    uploadedBy: string;
    description: string;
    capturedImages: string[];
    cover: string;
    summary: string;
    scenes: Array<{
      keywords: string[];
      description: string;
    }>;
    createAt: Generated<Date>;
    updateAt: Generated<Date>;
  };
}

export type SearchTable = Selectable<DB["search"]>;
export type MetadataTable = Selectable<DB["metadata"]>;

export const syncSchema = async (db: Kysely<DB>) => {
  const tables = await db.introspection.getTables();
  const hasSearchTable = tables.some((t) => t.name === "search");
  const hasMetadataTable = tables.some((t) => t.name === "metadata");

  if (!hasSearchTable) {
    await db.schema
      .createTable("search")
      .addColumn("id", "text", (col) => col.notNull().unique())
      .addColumn("metadata", "text", (col) => col.notNull())
      .addColumn("createAt", "timestamp", (col) =>
        col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull()
      )
      .addColumn("updateAt", "timestamp", (col) =>
        col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull()
      )
      .execute();
  }

  if (!hasMetadataTable) {
    await db.schema
      .createTable("metadata")
      .addColumn("id", "text", (col) => col.notNull().unique())
      .addColumn("title", "text", (col) => col.notNull())
      .addColumn("uploadedBy", "text", (col) => col.notNull())
      .addColumn("description", "text", (col) => col.notNull())
      .addColumn("capturedImages", "jsonb", (col) => col.notNull())
      .addColumn("cover", "text", (col) => col.notNull())
      .addColumn("summary", "text", (col) => col.notNull())
      .addColumn("scenes", "jsonb", (col) => col.notNull())
      .addColumn("createAt", "timestamp", (col) =>
        col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull()
      )
      .addColumn("updateAt", "timestamp", (col) =>
        col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull()
      )
      .execute();
  }
};
