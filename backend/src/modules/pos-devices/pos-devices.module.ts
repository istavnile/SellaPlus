import { Module } from '@nestjs/common';
import { PosDevicesController } from './pos-devices.controller';
import { PosDevicesService } from './pos-devices.service';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PosDevicesController],
  providers: [PosDevicesService],
})
export class PosDevicesModule {}
