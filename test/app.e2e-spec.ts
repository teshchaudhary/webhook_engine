import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from './../src/app.module';
import { AppController } from './../src/app.controller';

describe('AppController (e2e)', () => {
  let app: INestApplication;
  let controller: AppController;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    controller = app.get(AppController);
  });

  it('/ (GET)', () => {
    expect(controller.getRoot()).toEqual({
      name: 'webhook-engine',
      status: 'ok',
      runtime: 'foundation',
    });
  });

  afterEach(async () => {
    await app.close();
  });
});
