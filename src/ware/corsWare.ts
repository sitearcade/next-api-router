// import

import {isDev} from '@sitearcade/is-env';
import cors from 'cors';

import type {Ware} from './types';

// vars

const allowOrigins = [/\.sitearcade\.com$/];

// export

export const corsWare = cors;

export const anyCorsWare: Ware = cors();

export const arcCorsWare: Ware = cors({
  // credentials: true, // TODO: Why on or off?
  origin: isDev || allowOrigins, // TODO: What about no origin?
});
