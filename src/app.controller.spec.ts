import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RedisService } from './common/redis.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        {
          provide: RedisService,
          useValue: {
            status: 'end',
            connect: jest.fn(),
            ping: jest.fn(),
            set: jest.fn(),
          },
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return foundation metadata', () => {
      expect(appController.getRoot()).toEqual({
        name: 'webhook-engine',
        status: 'ok',
        runtime: 'foundation',
      });
    });
  });
});
