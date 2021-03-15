// import

import {initAuth0} from '@auth0/nextjs-auth0';

import type {Ware} from './types';

// config

const {
  withApiAuthRequired,
} = initAuth0({baseURL: process.env.RESOLVED_URL}); // TODO: Document required env vars!

// export

export const authWare: Ware = (req, res, next) =>
  withApiAuthRequired(() => next())(req, res); // TODO: Keep auth0 stuff together?
