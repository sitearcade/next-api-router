// import

import * as R from 'ramda';
import Pattern from 'url-pattern';

// vars

const cwdRx = new RegExp(process.cwd());

const spaceRx = /\s+/;
const queryRx = /\?.+$/;
const stackLineRx = /\n\s+at\s+/g;
const wildRx = /\/\[\[\.\.\.(\w+)]]/;

const validMethods = [
  'GET',
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
  'HEAD',
  'OPTIONS',
  'CONNECT',
  'TRACE',
];

let _testingEnv = {};

// fns

const isString = R.is(String);
const isFunction = R.is(Function);

function ensureArray(maybeArr) {
  return Array.isArray(maybeArr) ? maybeArr : [maybeArr];
}

function cleanMethod(method) {
  method = method.trim().toUpperCase();

  if (method === 'ANY') {
    return null;
  }

  if (!validMethods.includes(method)) {
    throw new Error(`No such method: "${method}"`);
  }

  return method;
}

function cleanPattern(wildcard, pattern) {
  if (!wildcard) {
    throw new Error(`Path contains no [[...wildcard]] to match URI "${pattern}" against.`);
  }

  pattern = new Pattern(pattern);

  return function matchPattern(req) {
    return req?.params?.[wildcard] ?
      pattern.match(`/${req.params[wildcard].join('/')}`) : null;
  };
}

function cleanWare(fn) {
  if (!isFunction(fn)) {
    throw new Error(`Not a function: "${fn}"`);
  }

  if (fn.length < 3) {
    return fn;
  }

  return async function promisifiedWare(req, res) {
    return new Promise((resolve, reject) => fn(req, res, (result) => (
      result instanceof Error ? reject(result) : resolve(result)
    )));
  };
}

export function setTestingEnv(env) {
  _testingEnv = env;
}

export function resetTestingEnv() {
  _testingEnv = {};
}

function getRouteWildcard() {
  if (_testingEnv.wildcard) {
    return _testingEnv.wildcard;
  }

  const originalFunc = Error.prepareStackTrace;
  Error.prepareStackTrace = (_, stack) => stack;

  let callFile = null;

  try {
    const err = new Error();
    callFile = R.reduce((prev, next) => {
      const file = next.getFileName();

      return file === prev ? file : R.reduced(file);
    }, err.stack.shift().getFileName(), err.stack);
  } catch (err) {}

  Error.prepareStackTrace = originalFunc;

  return wildRx.exec(callFile)?.[1] ?? null;
}

function parseRoute(wildcard, ...ware) {
  let method = null;
  let pattern = null;

  if (isString(ware[0])) {
    ware[0].trim().split(spaceRx).forEach((str) => {
      if (str.startsWith('/')) {
        if (pattern) {
          throw new Error(`Only one path pattern allowed per route at "${ware[0]}`);
        }

        pattern = cleanPattern(wildcard, str);

        return;
      }

      if (method) {
        throw new Error(`Only one method (or "ANY") allowed per route definition at "${ware[0]}"`);
      }

      if (pattern) {
        throw new Error(`Must match format "[METHOD] [/PATTERN]" at "${ware[0]}`);
      }

      method = cleanMethod(str);
    });

    ware.shift();
  }

  if (!ware.length) {
    throw new Error('No sense having a route without any middleware!');
  }

  return {method, pattern, ware: ware.map(cleanWare)};
}

function matchRoute(req, {method, pattern, ware}) {
  if (method && req.method !== method) {
    return null;
  }

  const params = pattern ? pattern(req) : {};

  if (!params) {
    return null;
  }

  return {params, ware};
}

async function handleRoute(req, res, match) {
  if (!match) {
    const err = new Error('Route does not exist');
    err.status = 404;
    err.method = req.method;
    err.path = req?.url?.replace(queryRx, '');

    throw err;
  }

  req.params = {...req.params || {}, ...match.params};

  return match.ware.reduce((prev, fn) => prev.then(() => (
    res.writableEnded === true ? null : fn(req, res)
  )), Promise.resolve(null));
}

function handleError(res, err) {
  res.status(err.status || 500);
  res.json({
    error: err.message,
    stack: err?.stack?.replace(cwdRx, '').split(stackLineRx),
    ...R.map(R.identity, err),
  });
}

// export

export function router(routeMap) {
  const wildcard = getRouteWildcard();
  const routes = Object.keys(routeMap)
    .map((k) => parseRoute(wildcard, k, ...ensureArray(routeMap[k])));

  return async function handler(req, res) {
    const match = R.reduce((acc, thisRoute) => (
      acc ? R.reduced(acc) : matchRoute(req, thisRoute)
    ), null, routes);

    try {
      await handleRoute(req, res, match);
    } catch (err) {
      handleError(res, err);
    }
  };
}

export function route(...args) {
  const wildcard = getRouteWildcard();
  const thisRoute = parseRoute(wildcard, ...args);

  return async function handler(req, res) {
    const match = matchRoute(req, thisRoute);

    try {
      await handleRoute(req, res, match);
    } catch (err) {
      handleError(res, err);
    }
  };
}
