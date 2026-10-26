import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { CreateOrderDto } from '@app/contracts';

@Controller('orders')
export class OrdersController {
  constructor(
    @Inject('ORDERS_SERVICE')
    private readonly client: ClientProxy,
  ) {}

  @Post()
  create(@Body() dto: CreateOrderDto) {
    return this.client.send('orders.create', dto);
  }

  @Get()
  findAll() {
    return this.client.send('orders.findAll', {});
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.client.send('orders.findOne', id);
  }
}