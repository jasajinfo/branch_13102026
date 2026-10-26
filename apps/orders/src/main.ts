import { NestFactory } from '@nestjs/core';
import { OrdersModule } from './orders.module.js';

async function bootstrap() {
  const app = await NestFactory.create(OrdersModule);
  await app.listen(process.env.port ?? 3000);
}
await bootstrap();
