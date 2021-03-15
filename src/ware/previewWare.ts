// import

import type {Ware} from './types';

// vars

const accessToken = process.env.ARC_PREVIEW_TOKEN;

// export

export const previewWare: Ware = async ({body, query}, res, next) =>
  next(
    accessToken === (body.token ?? query.token) ?
      null : new Error('Token mismatch.'),
  );
