export type SortFilterItem = {
  reverse: boolean
  slug: null | string
  title: string
}

export const defaultSort: SortFilterItem = {
  slug: null,
  reverse: false,
  title: 'Alphabetic A-Z',
}

export const sorting: SortFilterItem[] = [
  defaultSort,
  { slug: '-createdAt', reverse: true, title: 'Latest arrivals' },
  { slug: 'priceInINR', reverse: false, title: 'Price: Low to high' }, // asc
  { slug: '-priceInINR', reverse: true, title: 'Price: High to low' },
]
