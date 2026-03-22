import { PrismaClient as RetailClient } from "../../generated/retail-client";
import { env } from "./env";

export const clients = new Map<string, RetailClient>();
const MAX_CLIENTS = 50;

export const getTenantDB = (dbName: string): RetailClient => {
  if (clients.has(dbName)) {
    return clients.get(dbName)!;
  }

  if (clients.size >= MAX_CLIENTS) {
    const firstKey = clients.keys().next().value!;
    clients.get(firstKey)?.$disconnect();
    clients.delete(firstKey);
  }

  const client = new RetailClient({
    datasources: {
      db: {
        url: `mysql://${env.DB_USER}:${env.DB_PASS}@${env.DB_HOST}:${env.DB_PORT}/${dbName}`,
      },
    },
  });
  clients.set(dbName, client);
  return client;
};
