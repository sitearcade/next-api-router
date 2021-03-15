// import

import {isDev} from '@sitearcade/is-env';

import type {Ware} from './types';

// export

export const devOnlyWare: Ware = () => {
  if (!isDev) {
    throw new Error('Only allowed in dev!');
  }
};

export const prettyJsonWare: Ware = async (req, res, next) => {
  res.json = (json) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.send(JSON.stringify(json, null, 2));
  };

  next();
};
