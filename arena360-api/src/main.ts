import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { Logger, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true, // for Stripe webhook signature verification
  });
  const config = app.get(ConfigService);

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Arena360 API')
    .setDescription('Project management and operations platform API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api-docs', app, document);

  const origins = config.get<string>('ALLOWED_ORIGINS');
  const nodeEnv = config.get<string>('NODE_ENV', 'development');

  if (!origins && nodeEnv === 'production') {
    logger.error('ALLOWED_ORIGINS is required in production! FAILED TO START.');
    process.exit(1);
  }

  app.enableCors({
    origin: origins ? origins.split(',').map(o => o.trim()) : true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
  }));

  const port = config.get<number>('PORT', 3000);
  await app.listen(port);

  if (nodeEnv === 'production') {
    logger.log(`Arena OS Backend [PROD] listening on port ${port}`);
    logger.log('Structured JSON logging is enabled via standard output');
  } else {
    logger.log(`Application is running on: http://localhost:${port}`);
  }
}
bootstrap();
