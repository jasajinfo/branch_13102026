import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
} from '@nestjs/common';

import { AlunosService } from './alunos.service.js';

@Controller('alunos')
export class AlunosController {
  constructor(
    private readonly alunosService: AlunosService,
  ) {}

  @Get()
  findAll() {
    return this.alunosService.findAll();
  }

  @Get(':id')
  findById(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.alunosService.findById(id);
  }

  @Post()
  create(
    @Body() body: {
      nome: string;
      curso: string;
    },
  ) {
    return this.alunosService.create(
      body.nome,
      body.curso,
    );
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: {
      nome: string;
      curso: string;
    },
  ) {
    return this.alunosService.update(
      id,
      body.nome,
      body.curso,
    );
  }

  @Delete(':id')
  delete(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.alunosService.delete(id);
  }
}