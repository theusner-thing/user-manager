import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import dotenv from 'dotenv';

dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Enable CORS so frontend (served from localhost:4200) can call this API
  app.enableCors();
  const port = process.env.PORT || 3333;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`Server listening on http://localhost:${port}`);
}

bootstrap();
