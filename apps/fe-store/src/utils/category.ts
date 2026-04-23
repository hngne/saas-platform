import type { Category } from '@/services/category.service'

export const findCategoryById = (categories: Category[], categoryId?: string | null) =>
  categories.find((category) => category.id === categoryId)

export const buildCategoryPath = (categories: Category[], categoryId?: string | null) => {
  if (!categoryId) return ''

  const labels: string[] = []
  let current = findCategoryById(categories, categoryId)
  const visited = new Set<string>()

  while (current && !visited.has(current.id)) {
    visited.add(current.id)
    labels.unshift(current.name)
    current = current.parent_id ? findCategoryById(categories, current.parent_id) : undefined
  }

  return labels.join(' / ')
}

export const countCategoryDescendants = (categories: Category[], categoryId?: string | null) => {
  if (!categoryId) return 0

  const queue = [categoryId]
  const visited = new Set<string>()
  let count = 0

  while (queue.length) {
    const currentId = queue.shift()
    if (!currentId || visited.has(currentId)) continue
    visited.add(currentId)

    const childIds = categories
      .filter((category) => category.parent_id === currentId)
      .map((category) => category.id)

    count += childIds.length
    queue.push(...childIds)
  }

  return count
}

export const mapCategoryOptionsWithPath = (categories: Category[]) =>
  categories.map((category) => {
    const path = buildCategoryPath(categories, category.id)
    const descendantCount = countCategoryDescendants(categories, category.id)

    return {
      label: descendantCount > 0 ? `${path} (${descendantCount} danh mục con)` : path,
      value: category.id,
      category,
    }
  })
