import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './common/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { UsersModule } from './modules/users/users.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { ProductsModule } from './modules/products/products.module';
import { CustomersModule } from './modules/customers/customers.module';
import { TransactionsModule } from './modules/transactions/transactions.module';
import { ReportsModule } from './modules/reports/reports.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { EmployeesModule } from './modules/employees/employees.module';
import { MailingModule } from './common/mailing/mailing.module';
import { PosDevicesModule } from './modules/pos-devices/pos-devices.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    TenantsModule,
    UsersModule,
    CategoriesModule,
    ProductsModule,
    CustomersModule,
    TransactionsModule,
    ReportsModule,
    InventoryModule,
    EmployeesModule,
    MailingModule,
    PosDevicesModule,
  ],
})
export class AppModule {}
