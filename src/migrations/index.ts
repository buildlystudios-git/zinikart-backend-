import * as migration_20261113_195253_init from './20261113_195253_init';

export const migrations = [
  {
    up: migration_20261113_195253_init.up,
    down: migration_20261113_195253_init.down,
    name: '20261113_195253_init'
  },
];
