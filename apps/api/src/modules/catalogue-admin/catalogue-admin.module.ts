import { Module } from '@nestjs/common';
import { CatalogueAdminController } from './catalogue-admin.controller';
import { CatalogueAdminService } from './catalogue-admin.service';

@Module({
  controllers: [CatalogueAdminController],
  providers: [CatalogueAdminService],
})
export class CatalogueAdminModule {}
