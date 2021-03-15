// import

import type {NextApiRequest, NextApiResponse} from 'next';
import type {Options} from 'next-connect';
import connect from 'next-connect';
import * as R from 'ramda';

// vars

const cwdRx = new RegExp(process.cwd());

const queryRx = /\?.+$/;
const stackLineRx = /\n\s+at\s+/g;

// config

class RouteError extends Error {
  status: number;
  method?: string;
  path?: string;

  constructor(message: string, req: NextApiRequest, status = 404) {
    super(message);

    this.status = status;
    this.method = req.method;
    this.path = req?.url?.replace(queryRx, '');
  }
}

const opts: Options<NextApiRequest, NextApiResponse> = {
  attachParams: true,

  onNoMatch(req) {
    throw new RouteError('Route does not exist', req);
  },

  onError(err, req, res) {
    res.status(err.status || 500);
    res.json({
      error: err.message,
      stack: err?.stack?.replace(cwdRx, '').split(stackLineRx),
      ...R.map(R.identity, err),
    });
  },
};

// export

export const router = () => connect(opts);
