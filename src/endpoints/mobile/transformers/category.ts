/**
 * Mobile Category Transformer
 * 
 * Simplified category schema:
 * {
 *   id: string,
 *   title: string,
 *   slug: string,
 *   imageUrl: string | null
 * }
 */

export const transformCategory = (rawCategory: any) => {
  if (!rawCategory) return null;

  let imageUrl = null;
  if (rawCategory.media) {
    imageUrl = typeof rawCategory.media === 'string' ? rawCategory.media : rawCategory.media.url || null;
  }

  return {
    id: rawCategory.id,
    title: rawCategory.title,
    slug: rawCategory.slug || null,
    imageUrl,
  };
};
