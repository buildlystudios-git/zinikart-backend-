/**
 * Mobile Product Transformer
 *
 * Transforms verbose, deeply nested Payload CMS product documents into flat,
 * mobile-friendly JSON objects. Removes all CMS internal fields.
 *
 * ## Summary Schema (returned by list & detail endpoints)
 * {
 *   id: string,
 *   title: string,
 *   slug: string,
 *   price: number | null,          // maps from priceInINR; null for variant products (use variant.price)
 *   discountedPrice: number | null, // auto-calculated server-side; null if no discount applied
 *   discountPercent: number | null, // auto-calculated server-side
 *   inventory: number,             // always 0 for variant products (use variant.inventory per variant)
 *   hasVariants: boolean,
 *   images: string[],              // array of image URLs from the gallery
 *   thumbnailUrl: string | null,   // first gallery image URL, or meta image as fallback
 *   brand: { id: string, name: string, logoUrl: string | null } | null,
 *   categories: { id: string, title: string }[],
 *   averageRating: number,
 *   ratingCount: number,
 *   warranty: string | null,
 *   specifications: { key: string, value: string, type: string }[],
 *   status: 'published' | 'draft',
 *   createdAt: string,             // ISO 8601 timestamp
 * }
 *
 * ## Detail-only Extra Fields (returned only by /mobile/products/:id)
 * {
 *   ...summary,
 *   description: string,           // plain text, extracted from Lexical rich text JSON
 *   variants: [                    // only present when hasVariants is true
 *     {
 *       id: string,
 *       options: { name: string, value: string }[], // e.g. [{ name: "Color", value: "Red" }]
 *       price: number | null,      // variant-specific price; falls back to product price if null
 *       discountedPrice: number | null,
 *       inventory: number,
 *       status: 'published' | 'draft',
 *       imageUrl: string | null,   // variant-specific image; falls back to product thumbnailUrl
 *     }
 *   ]
 * }
 */

// Helper to extract plain text from Lexical JSON AST
const extractLexicalText = (node: any): string => {
  if (!node) return '';
  if (typeof node === 'string') return node;
  if (node.type === 'text') return node.text || '';
  if (Array.isArray(node.children)) {
    return node.children.map(extractLexicalText).join(node.type === 'paragraph' ? '\n' : ' ');
  }
  return '';
};

// Helper to extract image URL from gallery/media items
const getImageUrl = (item: any): string | null => {
  if (!item) return null;
  if (typeof item === 'string') return item;
  if (item.image && typeof item.image === 'object' && item.image.url) return item.image.url;
  if (item.url) return item.url;
  return null;
};

// Main product transformer for list views
export const transformProductSummary = (rawProduct: any) => {
  if (!rawProduct) return null;

  const images = Array.isArray(rawProduct.gallery) 
    ? rawProduct.gallery.map(getImageUrl).filter(Boolean) 
    : [];
  
  // Try to use gallery image or meta image as thumbnail
  let thumbnailUrl = images.length > 0 ? images[0] : null;
  if (!thumbnailUrl && rawProduct.meta?.image?.url) {
    thumbnailUrl = rawProduct.meta.image.url;
    images.push(thumbnailUrl);
  }

  const brand = typeof rawProduct.brand === 'object' && rawProduct.brand !== null ? {
    id: rawProduct.brand.id,
    name: rawProduct.brand.name,
    logoUrl: getImageUrl(rawProduct.brand.logo),
  } : null;

  const categories = Array.isArray(rawProduct.categories) 
    ? rawProduct.categories.map((c: any) => typeof c === 'object' ? { id: c.id, title: c.title } : { id: c }).filter((c: any) => c.title)
    : [];

  return {
    id: rawProduct.id,
    title: rawProduct.title,
    slug: rawProduct.slug,
    price: rawProduct.priceInINR || null,
    discountedPrice: rawProduct.discountedPrice || null,
    discountPercent: rawProduct.discountPercent || null,
    inventory: rawProduct.enableVariants ? 0 : (rawProduct.inventory || 0),
    hasVariants: Boolean(rawProduct.enableVariants),
    images,
    thumbnailUrl,
    brand,
    categories,
    averageRating: rawProduct.averageRating || 0,
    ratingCount: rawProduct.ratingCount || 0,
    warranty: rawProduct.warranty || null,
    specifications: Array.isArray(rawProduct.specifications) ? rawProduct.specifications : [],
    status: rawProduct._status || 'published',
    createdAt: rawProduct.createdAt,
    retailerOnlineStatus: typeof rawProduct.retailer === 'object' && rawProduct.retailer !== null
      ? (rawProduct.retailer.retailerOnlineStatus || 'online')
      : 'online',
  };
};

// Product transformer for detail views
export const transformProductDetail = (rawProduct: any, variantTypesMap?: Record<string, string>) => {
  const summary = transformProductSummary(rawProduct);
  if (!summary) return null;

  // Extract description text
  let description = '';
  if (rawProduct.description?.root) {
    description = extractLexicalText(rawProduct.description.root).trim();
  }

  // Format variants
  const variants = [];
  if (rawProduct.enableVariants && rawProduct.variants?.docs) {
    for (const v of rawProduct.variants.docs) {
      // Find variant options
      const options = [];
      if (Array.isArray(v.options)) {
        for (const opt of v.options) {
          if (opt && typeof opt === 'object') {
            // Check if it's wrapped in an array item (e.g. { option: { ... } })
            const actualOpt = opt.value !== undefined ? opt : (opt.option || opt);
            
            if (actualOpt && typeof actualOpt === 'object') {
              let variantTypeName = 'Option';
              if (actualOpt.variantType && typeof actualOpt.variantType === 'object') {
                variantTypeName = actualOpt.variantType.name || actualOpt.variantType.label || 'Option';
              } else if (actualOpt.variantType && typeof actualOpt.variantType === 'string' && variantTypesMap) {
                variantTypeName = variantTypesMap[actualOpt.variantType] || 'Option';
              }

              options.push({
                name: variantTypeName,
                value: actualOpt.value || actualOpt.label || String(actualOpt),
              });
            }
          }
        }
      }

      variants.push({
        id: v.id,
        options,
        price: v.priceInINR || summary.price,
        discountedPrice: v.discountedPrice != null ? v.discountedPrice : summary.discountedPrice,
        inventory: v.inventory || 0,
        status: v._status || 'published',
        imageUrl: getImageUrl(v.image) || summary.thumbnailUrl,
      });
    }
  }

  return {
    ...summary,
    description,
    variants,
  };
};
