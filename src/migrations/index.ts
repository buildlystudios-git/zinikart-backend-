import * as migration_20260530_185313 from './20260530_185313';
import * as migration_20260618_162511 from './20260618_162511';
import * as migration_20260618_181810 from './20260618_181810';
import * as migration_20261113_183238_add_missing_collections from './20261113_183238_add_missing_collections';

export const migrations = [
  {
    up: migration_20260530_185313.up,
    down: migration_20260530_185313.down,
    name: '20260530_185313',
  },
  {
    up: migration_20260618_162511.up,
    down: migration_20260618_162511.down,
    name: '20260618_162511',
  },
  {
    up: migration_20260618_181810.up,
    down: migration_20260618_181810.down,
    name: '20260618_181810',
  },
  {
    up: migration_20261113_183238_add_missing_collections.up,
    down: migration_20261113_183238_add_missing_collections.down,
    name: '20261113_183238_add_missing_collections'
  },
];
