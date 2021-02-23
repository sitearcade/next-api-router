// import

import {proxyMock} from '@sitearcade/jest-preset/tools';

import {router, route, setTestingEnv, resetTestingEnv} from './index';

// config

const res = proxyMock.createMockProxy();

// fns

const sendRes = (req, res) => res.send('ok');
const sendParams = (req, res) => res.send(req.params);
const sendErr = () => throw new Error('Fail!');
const useResWare = (req, res) => res.use();
const nextResWare = (req, res, next) => next(null);
const nextErrWare = (req, res, next) => next(new Error('Fail!'));

const createErr = (msg = 'Fail!', props = {}) =>
  Object.assign(new Error(msg), props);

// test

beforeEach(() => setTestingEnv({wildcard: 'test'}));

afterEach(() => resetTestingEnv());

describe('router(routes)', () => {
  it('creates an api handler for multiple routes', async () => {
    const handler = router({
      GET: sendRes,
      POST: [sendRes],
      PATCH: sendErr,
    });

    await handler({method: 'GET'}, res);
    await handler({method: 'POST'}, res);

    expect(res.send).toHaveBeenCalledTimes(2);
    expect(res.send).toHaveBeenCalledWith('ok');

    res.mockClear();

    await handler({method: 'DELETE'}, res);

    expect(res.status).toHaveBeenCalledWith(404);

    res.mockClear();

    await handler({method: 'PATCH'}, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('support chaining middleware', async () => {
    const handler = router({
      GET: [useResWare, sendRes],
      POST: [nextResWare, sendRes],
      ANY: [nextErrWare, sendRes],
    });

    await handler({method: 'GET'}, res);

    expect(res.use).toHaveBeenCalled();
    expect(res.send).toHaveBeenCalledWith('ok');

    res.mockClear();

    await handler({method: 'POST'}, res);

    expect(res.use).not.toHaveBeenCalled();
    expect(res.send).toHaveBeenCalledWith('ok');

    res.mockClear();

    await handler({method: 'PUT'}, res);

    expect(res.use).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('sends reasonable error response', async () => {
    const handler = router({
      'ANY /err/default': () => throw createErr('Default!', {}),
      'ANY /err/status': () => throw createErr('410!', {status: 410}),
    });

    await handler({params: {test: ['err', 'default']}}, res);

    expect(res.json).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json.mock.calls[0][0]).toHaveProperty('error', 'Default!');
    expect(res.json.mock.calls[0][0].stack).toBeArray();

    res.mockClear();

    await handler({params: {test: ['err', 'status']}}, res);

    expect(res.json).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(410);
    expect(res.json.mock.calls[0][0]).toHaveProperty('error', '410!');
    expect(res.json.mock.calls[0][0].stack).toBeArray();
  });
});

describe('route([method, [path,]] ...ware)', () => {
  it('creates an api handler for a single route', async () => {
    const handler = route('GET', sendRes);

    await handler({method: 'GET'}, res);
    await handler({method: 'POST'}, res);

    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith('ok');
  });

  it('matches routes with wildcards', async () => {
    const handler = route('ANY /*', sendRes);

    await handler({method: 'GET', params: {test: ['cool']}}, res);
    await handler({method: 'PUT', params: {test: ['cool', 'er']}}, res);
    await handler({method: 'POST', params: {test: ['cool', 'est']}}, res);
    await handler({method: 'PATCH', params: {}}, res);

    expect(res.send).toHaveBeenCalledTimes(3);
    expect(res.send).toHaveBeenCalledWith('ok');
  });

  it('collects matching and optional params', async () => {
    const handler = route('ANY /:req(/:opt)', sendParams);

    await handler({method: 'GET', params: {}}, res);

    expect(res.send).not.toHaveBeenCalled();

    res.mockClear();

    await handler({method: 'GET', params: {test: ['req']}}, res);

    expect(res.send).toHaveBeenCalledWith({
      req: 'req',
      test: ['req'],
    });

    res.mockClear();

    await handler({method: 'GET', params: {test: ['req', 'opt']}}, res);

    expect(res.send).toHaveBeenCalledWith({
      req: 'req',
      opt: 'opt',
      test: ['req', 'opt'],
    });
  });

  it('prevents broken routes', async () => {
    expect(() => route()).toThrowErrorMatchingInlineSnapshot(
      '"No sense having a route without any middleware!"',
    );

    expect(() => route('FAKE')).toThrowErrorMatchingInlineSnapshot(
      '"No such method: \\"FAKE\\""',
    );

    expect(() => route(false)).toThrowErrorMatchingInlineSnapshot(
      '"Not a function: \\"false\\""',
    );

    expect(() => route('GET POST', sendRes)).toThrowErrorMatchingInlineSnapshot(
      '"Only one method (or \\"ANY\\") allowed per route definition at \\"GET POST\\""',
    );

    expect(() => route('/route PUT', sendRes)).toThrowErrorMatchingInlineSnapshot(
      '"Must match format \\"[METHOD] [/PATTERN]\\" at \\"/route PUT"',
    );

    expect(() => route('GET /route /other', sendRes)).toThrowErrorMatchingInlineSnapshot(
      '"Only one path pattern allowed per route at \\"GET /route /other"',
    );

    resetTestingEnv();

    expect(() => route('ANY /*', sendRes)).toThrowErrorMatchingInlineSnapshot(
      '"Path contains no [[...wildcard]] to match URI \\"/*\\" against."',
    );
  });
});
