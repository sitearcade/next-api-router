// import

import request from '@sitearcade/request';

import type {Ware} from './types';

// vars

const secretKey = process.env.RECAPTCHA_SECRET_KEY;

// fns

const isRecapOk = ({headers, body}) =>
  request({
    path: 'https://www.google.com/recaptcha/api/siteverify',
    query: {
      secret: secretKey,
      response: body.recaptcha,
      remoteip: headers['x-forwarded-for'],
    },
  }).then((res) => res?.body?.success);

// export

export const recaptchaWare: Ware = async (req, res, next) => (
  next(await isRecapOk(req) ? null : new Error('ReCAPTCHA says no.'))
);
