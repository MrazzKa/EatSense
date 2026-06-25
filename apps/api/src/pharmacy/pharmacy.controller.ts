import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request, Query, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PharmacyService } from './pharmacy.service';
import { ConnectPharmacyDto, ConnectPharmacyByCodeDto } from './dto/connect-pharmacy.dto';
import { CreatePharmacyOrderDto } from './dto/create-pharmacy-order.dto';

@ApiTags('Pharmacy')
@Controller('pharmacy')
export class PharmacyController {
  constructor(private readonly pharmacyService: PharmacyService) {}

  // ========== Public: Status Update via Email Link ==========

  @Get('orders/status')
  @ApiOperation({ summary: 'Update order status via email link (no auth required)' })
  @ApiResponse({ status: 200, description: 'HTML status page' })
  async updateStatusViaLink(
    @Query('token') token: string,
    @Query('status') status: string,
    @Res() res: Response,
  ) {
    const html = await this.pharmacyService.updateOrderStatusByToken(token, status);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  }

  // ========== Public: Message Customer via Email Link ==========

  @Get('orders/message')
  @ApiOperation({ summary: 'Render the compose page for messaging the customer (no auth)' })
  @ApiResponse({ status: 200, description: 'HTML compose page' })
  async renderMessagePage(@Query('token') token: string, @Res() res: Response) {
    const html = await this.pharmacyService.renderMessagePage(token);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  }

  @Post('orders/message')
  @ApiOperation({ summary: 'Submit a message to the customer from the email link (no auth)' })
  @ApiResponse({ status: 200, description: 'HTML confirmation page' })
  async submitMessage(
    @Body() body: { token?: string; reason?: string; text?: string },
    @Res() res: Response,
  ) {
    const html = await this.pharmacyService.submitOrderMessage(
      body?.token || '',
      body?.reason || 'other',
      body?.text || '',
    );
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  }

  // ========== Public: Cancel / Decline Order via Email Link ==========

  @Get('orders/cancel')
  @ApiOperation({ summary: 'Render the cancel page for declining an order (no auth)' })
  @ApiResponse({ status: 200, description: 'HTML cancel page' })
  async renderCancelPage(@Query('token') token: string, @Res() res: Response) {
    const html = await this.pharmacyService.renderCancelPage(token);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  }

  @Post('orders/cancel')
  @ApiOperation({ summary: 'Cancel/decline an order from the email link (no auth)' })
  @ApiResponse({ status: 200, description: 'HTML confirmation page' })
  async submitCancel(
    @Body() body: { token?: string; reason?: string; text?: string },
    @Res() res: Response,
  ) {
    const html = await this.pharmacyService.submitOrderCancel(
      body?.token || '',
      body?.reason || 'other',
      body?.text || '',
    );
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  }

  // ========== Protected: Connections ==========

  @Get('connections')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all pharmacy connections' })
  @ApiResponse({ status: 200, description: 'List of pharmacy connections' })
  async getConnections(@Request() req: any) {
    return this.pharmacyService.getConnections(req.user.id);
  }

  @Post('connections')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Connect to a pharmacy' })
  @ApiResponse({ status: 201, description: 'Pharmacy connected' })
  async connect(@Request() req: any, @Body() dto: ConnectPharmacyDto) {
    return this.pharmacyService.connectPharmacy(req.user.id, dto);
  }

  @Post('connections/code')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Link a pharmacy by entering its access code' })
  @ApiResponse({ status: 201, description: 'Pharmacy linked from code' })
  async connectByCode(@Request() req: any, @Body() dto: ConnectPharmacyByCodeDto) {
    return this.pharmacyService.applyPharmacyCode(req.user.id, dto.code);
  }

  @Put('connections/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update pharmacy connection' })
  @ApiResponse({ status: 200, description: 'Pharmacy connection updated' })
  async updateConnection(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: Partial<ConnectPharmacyDto>,
  ) {
    return this.pharmacyService.updateConnection(req.user.id, id, dto);
  }

  @Delete('connections/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Disconnect from pharmacy' })
  @ApiResponse({ status: 200, description: 'Pharmacy disconnected' })
  async disconnect(@Request() req: any, @Param('id') id: string) {
    await this.pharmacyService.disconnectPharmacy(req.user.id, id);
    return { message: 'Pharmacy disconnected' };
  }

  // ========== Protected: Orders ==========

  @Get('orders')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all pharmacy orders' })
  @ApiResponse({ status: 200, description: 'List of orders' })
  async getOrders(@Request() req: any) {
    return this.pharmacyService.getOrders(req.user.id);
  }

  @Post('orders')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create pharmacy order' })
  @ApiResponse({ status: 201, description: 'Order created and email sent' })
  async createOrder(@Request() req: any, @Body() dto: CreatePharmacyOrderDto) {
    return this.pharmacyService.createOrder(req.user.id, dto);
  }

  @Get('orders/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get order details' })
  @ApiResponse({ status: 200, description: 'Order details' })
  async getOrder(@Request() req: any, @Param('id') id: string) {
    return this.pharmacyService.getOrder(req.user.id, id);
  }

  @Post('orders/:id/reply')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Customer replies to the pharmacy about an order' })
  @ApiResponse({ status: 201, description: 'Reply recorded and forwarded to the pharmacy' })
  async replyToOrder(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { text?: string },
  ) {
    return this.pharmacyService.addClientReply(req.user.id, id, body?.text || '');
  }
}
