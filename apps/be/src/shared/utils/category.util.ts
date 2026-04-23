import { PrismaClient as RetailClient } from "../../../generated/retail-client";

export const getCategoryScopeIds = async (
  db: RetailClient,
  categoryIdentifier?: string,
): Promise<string[]> => {
  if (!categoryIdentifier) return [];

  const categories = await db.category.findMany({
    select: {
      id: true,
      slug: true,
      parent_id: true,
    },
  });

  const matchedCategory = categories.find(
    (category) =>
      category.id === categoryIdentifier || category.slug === categoryIdentifier,
  );

  if (!matchedCategory) return [];

  const descendants = new Set<string>([matchedCategory.id]);
  const queue = [matchedCategory.id];

  while (queue.length) {
    const currentId = queue.shift()!;
    const childIds = categories
      .filter((category) => category.parent_id === currentId)
      .map((category) => category.id);

    childIds.forEach((childId) => {
      if (descendants.has(childId)) return;
      descendants.add(childId);
      queue.push(childId);
    });
  }

  return Array.from(descendants);
};
