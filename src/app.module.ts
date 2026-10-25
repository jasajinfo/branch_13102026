import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AlunosModule } from './alunos/alunos.module.js';

@Module({
  controllers: [AppController],
  providers: [AppService],
  imports: [AlunosModule],
})
export class AppModule {}