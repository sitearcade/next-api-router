// import

import {createMockProxy} from '@sitearcade/jest-preset/tools';

import {router, route} from './index';

// config

const res = createMockProxy();

// fns

const sendRes = (req, res) => res.send('ok');
const sendErr = () => throw new Error('Fail!');
const useResWare = (req, res) => res.use();
const nextResWare = (req, res, next) => next(null);
const nextErrWare = (req, res, next) => next(new Error('Fail!'));

// test

describe('router(routes[, opts])', () => {
  it('creates an api handler for multiple routes', async () => {
    const handler = router([
      {methods: 'GET', ware: sendRes},
      {methods: ['POST', 'PUT'], ware: [sendRes]},
      {methods: 'PATCH', ware: sendErr},
    ]);

    await handler({method: 'GET', url: '/api/route'}, res);
    await handler({method: 'POST', url: '/api/route'}, res);
    await handler({method: 'PUT', url: '/api/route'}, res);

    expect(res.send).toHaveBeenCalledTimes(3);
    expect(res.send).toHaveBeenCalledWith('ok');

    res.mockClear();

    await handler({method: 'DELETE', url: '/api/route'}, res);

    expect(res.status).toHaveBeenCalledWith(404);

    res.mockClear();

    await handler({method: 'PATCH', url: '/api/route'}, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('support chaining middleware', async () => {
    const handler = router([
      {methods: 'GET', ware: [useResWare, sendRes]},
      {methods: 'POST', ware: [nextResWare, sendRes]},
      {methods: 'ANY', ware: [nextErrWare, sendRes]},
    ]);

    await handler({method: 'GET', url: '/api/route'}, res);

    expect(res.use).toHaveBeenCalled();
    expect(res.send).toHaveBeenCalledWith('ok');

    res.mockClear();

    await handler({method: 'POST', url: '/api/route'}, res);

    expect(res.use).not.toHaveBeenCalled();
    expect(res.send).toHaveBeenCalledWith('ok');

    res.mockClear();

    await handler({method: 'PUT', url: '/api/route'}, res);

    expect(res.use).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('route([method, [path,]] ...ware)', () => {
  it('creates an api handler for a single route', async () => {
    const handler = route('GET', sendRes);

    await handler({method: 'GET', url: '/api/route'}, res);
    await handler({method: 'POST', url: '/api/route'}, res);

    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith('ok');
  });

  it('matches routes with wildcards', async () => {
    const handler = route('ANY', '/route/*', sendRes);

    await handler({method: 'GET', url: '/api/route/cool'}, res);
    await handler({method: 'POST', url: '/api/elsewise'}, res);

    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith('ok');
  });
});
