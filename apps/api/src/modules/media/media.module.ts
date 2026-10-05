import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ListingsModule } from '../listings/listings.module';
import { IMAGE_PROCESSING_QUEUE } from './media.constants';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';

@Module({
  imports: [ListingsModule, BullModule.registerQueue({ name: IMAGE_PROCESSING_QUEUE })],
  controllers: [MediaController],
  providers: [MediaService],
})
export class MediaModule {}
