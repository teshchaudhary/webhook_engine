import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppController } from './../src/app.controller';
import { AppService } from '../src/app.service';
import { MetricsService } from '../src/common/metrics.service';

describe('AppController (e2e)', () => {
  let app: INestApplication;
  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService, MetricsService],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('composes the root controller', () => {
    expect(app.get(AppController).getRoot()).toEqual({
      name: 'webhook-engine',
      status: 'ok',
      runtime: 'foundation',
    });
  });

  afterEach(async () => {
    if (app) await app.close();
  });
});
