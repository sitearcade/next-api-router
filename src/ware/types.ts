// import

import type {NextApiRequest, NextApiResponse} from 'next';

// types

export type WareError = Error & {
  status?: number;
  statusText?: string;
};

export type Ware<Req = unknown, Res = unknown> = (
  req: NextApiRequest & Req,
  res: NextApiResponse & Res,
  next: (err?: Error | null) => void
) => void;
