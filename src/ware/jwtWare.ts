// import

import {JwtVerifier, removeNamespaces, claimToArray, getTokenFromHeader} from '@serverless-jwt/jwt-verifier';

import type {Ware, WareError} from './types';

// types

type JwtClaims = {
  scope: string[];
  roles: string[];
};

type JwtApiRequest = {
  identityContext: {
    token: string;
    claims: JwtClaims;
  };
};

// vars

const issuer = process.env.AUTH0_ISSUER_BASE_URL;
const audience = process.env.AUTH0_AUDIENCE as string;
const orNull = () => null;

// config

const jwt = new JwtVerifier({
  issuer: `${issuer}/`,
  audience,
  async mapClaims(claims) {
    claims = removeNamespaces(audience, claims);
    claims.scope = claimToArray(claims.scope as string);
    claims.roles = claimToArray(claims.roles as string);

    return claims;
  },
});

// export

export const jwtWare = (scope?: string): Ware<JwtApiRequest> =>
  async (req, res, next) => {
    const token = getTokenFromHeader(req.headers.authorization as string);
    const claims = await jwt.verifyAccessToken(token).catch(orNull) as JwtClaims;
    req.identityContext = {token, claims};

    if (!claims) {
      const err = new Error('JWT token missing or corrupt') as WareError;
      err.status = 403;
      throw err;
    }

    if (scope && !claims.scope.includes(scope)) {
      const err = new Error(`Token does not contain scope '${scope}'`) as WareError;
      err.status = 403;
      throw err;
    }

    next();
  };
