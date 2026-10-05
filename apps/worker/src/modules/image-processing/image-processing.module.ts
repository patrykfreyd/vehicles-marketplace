import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import type { Env } from '@vehicles-marketplace/config';
import { IMAGE_PROCESSING_QUEUE } from './image-processing.constants';
import { ImageProcessingProcessor } from './image-processing.processor';
import { buildVisionAiClient } from './vision-ai/vision-ai-client.factory';
import { VISION_AI_CLIENT } from './vision-ai/vision-ai-client.tokens';

@Module({
  imports: [BullModule.registerQueue({ name: IMAGE_PROCESSING_QUEUE })],
  providers: [
    ImageProcessingProcessor,
    {
      provide: VISION_AI_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) =>
        buildVisionAiClient({
          apiKey: config.get('OPENAI_API_KEY', { infer: true }),
          model: config.get('OPENAI_VISION_MODEL', { infer: true }),
        }),
    },
  ],
})
export class ImageProcessingModule {}
