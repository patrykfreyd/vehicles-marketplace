import { Module } from '@nestjs/common';
import { VehiclesModule } from '../vehicles/vehicles.module';
import { ListingsController } from './listings.controller';
import { ListingsService } from './listings.service';

@Module({
  imports: [VehiclesModule],
  controllers: [ListingsController],
  providers: [ListingsService],
})
export class ListingsModule {}
