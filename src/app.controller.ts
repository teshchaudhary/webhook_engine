import { Controller, Get, Post, Body, Logger, HttpCode } from "@nestjs/common";
import { AppService } from "./app.service";

@Controller()
export class AppController {
  private readonly logger = new Logger("TestWebhookReceiver");

  constructor(private readonly appService: AppService) {}

  @Get()
  getRoot() {
    return this.appService.getRoot();
  }

  @Get("health")
  getHealth() {
    return this.appService.getHealth();
  }

  @Post("test-webhook")
  @HttpCode(200)
  receiveTestWebhook(@Body() payload: any) {
    this.logger.log(
      `Received test webhook! Payload: ${JSON.stringify(payload)}`,
    );
    return { status: "success", message: "Webhook received" };
  }
}
