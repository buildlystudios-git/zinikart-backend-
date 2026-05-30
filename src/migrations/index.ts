import * as migration_20260530_185313 from './20260530_185313';

export const migrations = [
  {
    up: migration_20260530_185313.up,
    down: migration_20260530_185313.down,
    name: '20260530_185313'
  },
];
