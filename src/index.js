// import

import * as R from 'ramda';
import Pattern from 'url-pattern';

// vars

const queryRx = /\?.+$/;

const anyMethods = [
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

// fns

const isFunction = R.is(Function);

const cleanMethod = (m) => m.trim().toUpperCase();

const cleanMethods = (methods) => {
  if (!Array.isArray(methods)) {
    methods = [methods];
  }

  return methods.includes('ANY') ? anyMethods :
    methods.map(cleanMethod);
};

const isMatch = (req, {methods, pattern}) => (
  (methods ? methods.includes(req.method) : true) &&
  (pattern ? pattern.match(req.url.replace(queryRx, '')) : {})
);

const isFinal = ({methods, pattern}) => methods && pattern;

const promisifyWare = (fn) => (
  fn.length < 3 ? fn :
  (req, res) => new Promise((resolve, reject) => (
    fn(req, res, (result) => (
      result instanceof Error ? reject(result) : resolve(result)
    ))
  ))
);

// export

export function router(routes, {prefix = '/api'} = {}) {
  routes = routes.map(({methods, path, ware}) => ({
    methods: methods ? cleanMethods(methods) : null,
    pattern: path ? new Pattern(prefix + path) : null,
    ware: Array.isArray(ware) ? ware : ware ? [ware] : [],
  }));

  return async function handler(req, res) {
    try {
      const {ware, params} = R.reduce((acc, thisRoute) => {
        const matchParams = isMatch(req, thisRoute);
        const finish = isFinal(thisRoute) ? R.reduced : R.identity;

        if (!matchParams) {
          return acc;
        }

        return finish({
          ware: [...acc.ware, ...thisRoute.ware],
          params: {...acc.params, matchParams},
        });
      }, {ware: [], params: {}}, routes);

      if (!ware.length) {
        res.status(404);
        res.json({
          error: 'Route does not exist',
          method: req.method,
          path: req.url.replace(queryRx, ''),
        });

        return;
      }

      req.params = {...req.params || {}, ...params};

      await ware.reduce((prev, fn) => (
        prev.then(() => (
          res.writableEnded === true ? null : promisifyWare(fn)(req, res)
        ))
      ), Promise.resolve(null));
    } catch (err) {
      res.status(500);
      res.json({
        error: err.message,
        stack: err.stack,
      });
    }
  };
}

export function route(...args) {
  const [ware, [methods = 'ANY', path = null]] = R.partition(isFunction, args);

  return router([{methods, path, ware}]);
}
