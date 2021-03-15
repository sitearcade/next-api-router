// import

import helmet from 'helmet';
import * as R from 'ramda';

import type {Ware} from './types';

// types

type HelmetOptions = Parameters<typeof helmet>[0];

// config

const helmetDefs: HelmetOptions = {};

// export

export const helmetWare = (opts?: HelmetOptions): Ware =>
  helmet(
    opts ?
      R.mergeDeepRight(helmetDefs, opts) as HelmetOptions :
      helmetDefs,
  ) as Ware;
