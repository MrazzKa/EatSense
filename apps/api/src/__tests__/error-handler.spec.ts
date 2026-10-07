/// <reference types="jest" />

import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AllExceptionsFilter } from '../core/middleware/error-handler.middleware';

/**
 * The filter shapes every error the API returns. Clients branch on `code`, so it
 * must arrive — but only application codes, and never stack traces in production.
 */
function run(exception: unknown, env = 'production') {
  const previous = process.env.NODE_ENV;
  process.env.NODE_ENV = env;
  const json = jest.fn();
  const response = { status: jest.fn(() => ({ json })) };
  const host: any = {
    switchToHttp: () => ({
      getResponse: () => response,
      getRequest: () => ({ url: '/auth/verify?token=secret', method: 'POST' }),
    }),
  };
  const filter = new AllExceptionsFilter();
  (filter as any).logger = { error: jest.fn() };
  try {
    filter.catch(exception, host);
  } finally {
    process.env.NODE_ENV = previous;
  }
  return { status: response.status.mock.calls[0][0], body: json.mock.calls[0][0] };
}

describe('AllExceptionsFilter', () => {
  it('passes an application error code through to the client', () => {
    const { status, body } = run(
      new BadRequestException({ message: 'Verification code expired.', code: 'OTP_EXPIRED' }),
    );
    expect(status).toBe(400);
    expect(body.code).toBe('OTP_EXPIRED');
    expect(body.message).toEqual(['Verification code expired.']);
  });

  it('keeps the existing shape when there is no code', () => {
    const { body } = run(new NotFoundException('Request not found.'));
    expect(Object.keys(body).sort()).toEqual(['message', 'path', 'statusCode', 'timestamp']);
  });

  it('never forwards driver or runtime codes wrapped in an HttpException', () => {
    for (const code of ['P2002', 'ECONNREFUSED', 'otp_expired', '', 'A'.repeat(3)]) {
      const { body } = run(new BadRequestException({ message: 'x', code }));
      expect(body).not.toHaveProperty('code');
    }
  });

  it('exposes neither the code nor the message of a non-HTTP error', () => {
    const internal = Object.assign(new Error('relation "users" does not exist'), { code: 'P2010' });
    const { status, body } = run(internal);
    expect(status).toBe(500);
    expect(body).not.toHaveProperty('code');
    expect(body).not.toHaveProperty('error');
    expect(body.message).toEqual(['Internal server error']);
  });

  it('masks sensitive query parameters in the echoed path', () => {
    const { body } = run(new NotFoundException());
    expect(body.path).toBe('/auth/verify?token=***');
  });
});
