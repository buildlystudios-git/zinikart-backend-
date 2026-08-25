/**
 * Mobile Brand Transformer
 * 
 * Simplified brand schema:
 * {
 *   id: string,
 *   name: string,
 *   logoUrl: string | null
 * }
 */

export const transformBrand = (rawBrand: any) => {
  if (!rawBrand) return null;

  let logoUrl = null;
  if (rawBrand.logo) {
    logoUrl = typeof rawBrand.logo === 'string' ? rawBrand.logo : rawBrand.logo.url || null;
  }

  return {
    id: rawBrand.id,
    name: rawBrand.name,
    logoUrl,
  };
};
