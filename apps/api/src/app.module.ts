import { Module } from '@nestjs/common';
import { AppController } from './app.controller';

// Deliberately minimal — a single controller, no services/DI yet. Real
// module structure (feature modules, DI-heavy services) is Plan 05's job
// (Backend API Foundation); this plan only needs the app to boot.
@Module({
  controllers: [AppController],
})
export class AppModule {}
