// import

import crypto from 'crypto';

import type {Ware} from './types';

// vars

const secret = process.env.GITHUB_HOOK_SECRET;

// export

export const githubHookWare: Ware = (req) => {
  if (!req.headers['x-hub-signature']) {
    throw new Error('No X-Hub-Signature found on request');
  }

  if (!req.headers['x-github-event']) {
    throw new Error('No X-Github-Event found on request');
  }

  if (!req.headers['x-github-delivery']) {
    throw new Error('No X-Github-Delivery found on request');
  }

  const received = req.headers['x-hub-signature'] as string;
  const computed = crypto
    .createHmac('sha1', secret ?? '')
    .update(JSON.stringify(req.body))
    .digest('hex');
  const match = crypto.timingSafeEqual(
    Buffer.from(received),
    Buffer.from(`sha1=${computed}`),
  );

  if (!match) {
    throw new Error('Invalid Signature');
  }
};
