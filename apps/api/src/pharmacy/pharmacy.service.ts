import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../prisma.service';
import { MailerService } from '../../mailer/mailer.service';
import { ConnectPharmacyDto } from './dto/connect-pharmacy.dto';
import { CreatePharmacyOrderDto } from './dto/create-pharmacy-order.dto';

@Injectable()
export class PharmacyService {
  private readonly logger = new Logger(PharmacyService.name);
  private readonly orderEmail = 'info@eatsense.ch';
  private readonly apiBaseUrl = process.env.API_BASE_URL || 'https://api.eatsense.ch';

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailer: MailerService,
  ) {}

  // ========== Pharmacy Connection ==========

  async getConnections(userId: string) {
    return this.prisma.pharmacyConnection.findMany({
      where: { userId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async connectPharmacy(userId: string, dto: ConnectPharmacyDto) {
    return this.prisma.pharmacyConnection.create({
      data: {
        userId,
        pharmacyName: dto.pharmacyName,
        pharmacyCode: dto.pharmacyCode || null,
        pharmacyAddress: dto.pharmacyAddress || null,
        pharmacyPhone: dto.pharmacyPhone || null,
        pharmacyEmail: dto.pharmacyEmail || null,
      },
    });
  }

  async updateConnection(userId: string, id: string, dto: Partial<ConnectPharmacyDto>) {
    const existing = await this.prisma.pharmacyConnection.findFirst({
      where: { id, userId },
    });
    if (!existing) throw new NotFoundException('Pharmacy connection not found');

    return this.prisma.pharmacyConnection.update({
      where: { id },
      data: {
        ...(dto.pharmacyName !== undefined ? { pharmacyName: dto.pharmacyName } : {}),
        ...(dto.pharmacyCode !== undefined ? { pharmacyCode: dto.pharmacyCode || null } : {}),
        ...(dto.pharmacyAddress !== undefined ? { pharmacyAddress: dto.pharmacyAddress || null } : {}),
        ...(dto.pharmacyPhone !== undefined ? { pharmacyPhone: dto.pharmacyPhone || null } : {}),
        ...(dto.pharmacyEmail !== undefined ? { pharmacyEmail: dto.pharmacyEmail || null } : {}),
      },
    });
  }

  async disconnectPharmacy(userId: string, id: string) {
    const existing = await this.prisma.pharmacyConnection.findFirst({
      where: { id, userId },
    });
    if (!existing) throw new NotFoundException('Pharmacy connection not found');

    return this.prisma.pharmacyConnection.update({
      where: { id },
      data: { isActive: false },
    });
  }

  // ========== Pharmacy Orders ==========

  async getOrders(userId: string) {
    return this.prisma.pharmacyOrder.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { pharmacyConnection: true },
    });
  }

  async createOrder(userId: string, dto: CreatePharmacyOrderDto) {
    // Get user info for email
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { userProfile: true },
    });

    // Get pharmacy info if connected
    let pharmacyName = 'Not specified';
    let pharmacyEmail: string | null = null;
    if (dto.pharmacyConnectionId) {
      const pharmacy = await this.prisma.pharmacyConnection.findFirst({
        where: { id: dto.pharmacyConnectionId, userId },
      });
      if (pharmacy) {
        pharmacyName = pharmacy.pharmacyName;
        pharmacyEmail = pharmacy.pharmacyEmail;
      }
    }

    // Generate unique status token for email action buttons
    const statusToken = randomBytes(32).toString('hex');

    // Create order in DB
    const order = await this.prisma.pharmacyOrder.create({
      data: {
        userId,
        pharmacyConnectionId: dto.pharmacyConnectionId || null,
        status: 'sent',
        statusToken,
        items: dto.items as any,
        prescriptionUrl: dto.prescriptionUrl || null,
        notes: dto.notes || null,
      },
      include: { pharmacyConnection: true },
    });

    // Build user info
    const userName = user?.userProfile
      ? `${user.userProfile.firstName || ''} ${user.userProfile.lastName || ''}`.trim() || user?.email || 'Customer'
      : user?.email || 'Customer';

    // Extract health profile info if available
    const profile = user?.userProfile as any;
    const healthInfo = this.extractHealthInfo(profile);

    // Build branded HTML email
    const html = this.buildOrderEmail({
      userName,
      userEmail: user?.email || 'N/A',
      pharmacyName,
      orderId: order.id,
      statusToken,
      items: dto.items,
      prescriptionUrl: dto.prescriptionUrl,
      notes: dto.notes,
      healthInfo,
    });

    const text = this.buildOrderEmailText({
      userName,
      userEmail: user?.email || 'N/A',
      pharmacyName,
      orderId: order.id,
      items: dto.items,
      prescriptionUrl: dto.prescriptionUrl,
      notes: dto.notes,
    });

    const subject = `[EatSense] New medication order from ${userName}`;

    // Send to EatSense team (always)
    try {
      await this.mailer.sendEmail({ to: this.orderEmail, subject, text, html });
      this.logger.log(`[Pharmacy] Order email sent to EatSense for order ${order.id}`);
    } catch (err) {
      this.logger.error(`[Pharmacy] Failed to send order email for order ${order.id}:`, err);
    }

    // Also send to pharmacy if they have email configured
    if (pharmacyEmail) {
      try {
        await this.mailer.sendEmail({ to: pharmacyEmail, subject, text, html });
        this.logger.log(`[Pharmacy] Order email sent to pharmacy ${pharmacyEmail} for order ${order.id}`);
      } catch (err) {
        this.logger.error(`[Pharmacy] Failed to send email to pharmacy ${pharmacyEmail}:`, err);
      }
    }

    return order;
  }

  async getOrder(userId: string, id: string) {
    const order = await this.prisma.pharmacyOrder.findFirst({
      where: { id, userId },
      include: { pharmacyConnection: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  // ========== Public Status Update (via email link) ==========

  async updateOrderStatusByToken(token: string, status: string): Promise<string> {
    const order = await this.prisma.pharmacyOrder.findFirst({
      where: { statusToken: token },
      include: { pharmacyConnection: true, user: { include: { userProfile: true } } },
    });

    if (!order) {
      return this.buildStatusPageHtml('Order Not Found', 'This link is invalid or has expired.', 'error');
    }

    const validStatuses = ['processing', 'ready', 'completed'];
    if (!validStatuses.includes(status)) {
      return this.buildStatusPageHtml('Invalid Status', 'The requested status update is not valid.', 'error');
    }

    await this.prisma.pharmacyOrder.update({
      where: { id: order.id },
      data: { status },
    });

    const statusLabels: Record<string, string> = {
      processing: 'Processing',
      ready: 'Ready for Pickup',
      completed: 'Completed',
    };

    return this.buildStatusPageHtml(
      'Status Updated!',
      `Order #${order.id.slice(-8)} has been marked as <strong>${statusLabels[status] || status}</strong>.`,
      'success',
    );
  }

  // ========== Low Stock Notification ==========

  async sendLowStockAlert(userId: string, medicationName: string, dosage: string | null, remainingStock: number, lowStockThreshold: number) {
    // Find user's pharmacy connections
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        userProfile: true,
        pharmacyConnections: { where: { isActive: true } },
      },
    });

    if (!user) return;

    const userName = user.userProfile
      ? `${(user.userProfile as any).firstName || ''} ${(user.userProfile as any).lastName || ''}`.trim() || user.email
      : user.email;

    const subject = `[EatSense] Low stock alert: ${medicationName} for ${userName}`;

    const html = this.buildLowStockEmail({
      userName,
      userEmail: user.email,
      medicationName,
      dosage,
      remainingStock,
      lowStockThreshold,
      pharmacies: user.pharmacyConnections as any[],
    });

    const text = [
      `Low Stock Alert`,
      ``,
      `Customer: ${userName} (${user.email})`,
      `Medication: ${medicationName}${dosage ? ` (${dosage})` : ''}`,
      `Remaining: ${remainingStock} pills`,
      `Threshold: ${lowStockThreshold}`,
      ``,
      `The customer's medication supply is running low.`,
    ].join('\n');

    // Send to EatSense (always)
    try {
      await this.mailer.sendEmail({ to: this.orderEmail, subject, text, html });
      this.logger.log(`[Pharmacy] Low stock alert sent for ${medicationName}`);
    } catch (err) {
      this.logger.error(`[Pharmacy] Failed to send low stock alert:`, err);
    }

    // Send to each connected pharmacy with email
    for (const pharmacy of (user.pharmacyConnections || [])) {
      const p = pharmacy as any;
      if (p.pharmacyEmail) {
        try {
          await this.mailer.sendEmail({ to: p.pharmacyEmail, subject, text, html });
          this.logger.log(`[Pharmacy] Low stock alert sent to pharmacy ${p.pharmacyEmail}`);
        } catch (err) {
          this.logger.error(`[Pharmacy] Failed to send low stock alert to ${p.pharmacyEmail}:`, err);
        }
      }
    }
  }

  // ========== Email Templates ==========

  private extractHealthInfo(profile: any): string {
    if (!profile?.preferences) return '';

    const prefs = typeof profile.preferences === 'string' ? JSON.parse(profile.preferences) : profile.preferences;
    const parts: string[] = [];

    if (prefs?.allergies?.length) {
      parts.push(`<strong>Allergies:</strong> ${prefs.allergies.join(', ')}`);
    }
    if (prefs?.dietaryRestrictions?.length) {
      parts.push(`<strong>Dietary restrictions:</strong> ${prefs.dietaryRestrictions.join(', ')}`);
    }
    if (prefs?.healthConditions?.length) {
      parts.push(`<strong>Health conditions:</strong> ${prefs.healthConditions.join(', ')}`);
    }

    return parts.join('<br>');
  }

  private emailHeader(): string {
    return `
      <div style="background: linear-gradient(135deg, #2563EB 0%, #7C3AED 100%); padding: 28px 24px; border-radius: 16px 16px 0 0; text-align: center;">
        <h1 style="color: #FFFFFF; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">EatSense</h1>
        <p style="color: rgba(255,255,255,0.85); margin: 4px 0 0; font-size: 13px;">Smart Nutrition & Health</p>
      </div>
    `;
  }

  private emailFooter(): string {
    return `
      <div style="border-top: 1px solid #E5E7EB; padding: 20px 24px; text-align: center; background: #F9FAFB; border-radius: 0 0 16px 16px;">
        <p style="color: #9CA3AF; font-size: 12px; margin: 0 0 4px;">EatSense — Smart Nutrition & Health Platform</p>
        <p style="color: #9CA3AF; font-size: 11px; margin: 0;">
          <a href="https://eatsense.ch" style="color: #6B7280; text-decoration: none;">eatsense.ch</a> ·
          <a href="mailto:info@eatsense.ch" style="color: #6B7280; text-decoration: none;">info@eatsense.ch</a>
        </p>
      </div>
    `;
  }

  private buildOrderEmail(params: {
    userName: string;
    userEmail: string;
    pharmacyName: string;
    orderId: string;
    statusToken: string;
    items: Array<{ name: string; dosage?: string; quantity?: string }>;
    prescriptionUrl?: string;
    notes?: string;
    healthInfo: string;
  }): string {
    const { userName, userEmail, pharmacyName, orderId, statusToken, items, prescriptionUrl, notes, healthInfo } = params;
    const baseUrl = this.apiBaseUrl;

    return `
      <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #FFFFFF; border-radius: 16px; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
        ${this.emailHeader()}

        <div style="padding: 28px 24px;">
          <h2 style="color: #111827; margin: 0 0 20px; font-size: 20px;">New Medication Order</h2>

          <!-- Customer info -->
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
            <tr>
              <td style="padding: 6px 0; color: #6B7280; font-size: 14px; width: 100px;">Customer</td>
              <td style="padding: 6px 0; color: #111827; font-size: 14px; font-weight: 600;">${userName}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #6B7280; font-size: 14px;">Email</td>
              <td style="padding: 6px 0; color: #111827; font-size: 14px;">${userEmail}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #6B7280; font-size: 14px;">Pharmacy</td>
              <td style="padding: 6px 0; color: #111827; font-size: 14px; font-weight: 600;">${pharmacyName}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #6B7280; font-size: 14px;">Order ID</td>
              <td style="padding: 6px 0; color: #111827; font-size: 13px; font-family: monospace; background: #F3F4F6; padding: 4px 8px; border-radius: 4px; display: inline-block;">${orderId.slice(-8)}</td>
            </tr>
          </table>

          <!-- Medications table -->
          <h3 style="color: #111827; margin: 0 0 12px; font-size: 16px;">Ordered Medications</h3>
          <table style="width: 100%; border-collapse: collapse; border: 1px solid #E5E7EB; border-radius: 8px; overflow: hidden; margin-bottom: 20px;">
            <thead>
              <tr style="background: #F9FAFB;">
                <th style="padding: 10px 12px; text-align: left; color: #6B7280; font-weight: 600; font-size: 13px; border-bottom: 2px solid #E5E7EB;">#</th>
                <th style="padding: 10px 12px; text-align: left; color: #6B7280; font-weight: 600; font-size: 13px; border-bottom: 2px solid #E5E7EB;">Medication</th>
                <th style="padding: 10px 12px; text-align: left; color: #6B7280; font-weight: 600; font-size: 13px; border-bottom: 2px solid #E5E7EB;">Dosage</th>
                <th style="padding: 10px 12px; text-align: left; color: #6B7280; font-weight: 600; font-size: 13px; border-bottom: 2px solid #E5E7EB;">Qty</th>
              </tr>
            </thead>
            <tbody>
              ${items.map((item, i) => `
                <tr style="background: ${i % 2 === 0 ? '#FFFFFF' : '#FAFAFA'};">
                  <td style="padding: 10px 12px; border-bottom: 1px solid #F3F4F6; color: #9CA3AF; font-size: 13px;">${i + 1}</td>
                  <td style="padding: 10px 12px; border-bottom: 1px solid #F3F4F6; color: #111827; font-weight: 600; font-size: 14px;">${item.name}</td>
                  <td style="padding: 10px 12px; border-bottom: 1px solid #F3F4F6; color: #374151; font-size: 14px;">${item.dosage || '—'}</td>
                  <td style="padding: 10px 12px; border-bottom: 1px solid #F3F4F6; color: #374151; font-size: 14px;">${item.quantity || '—'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          ${prescriptionUrl ? `
            <div style="margin-bottom: 16px; padding: 12px 16px; background: #ECFDF5; border-radius: 8px; border-left: 4px solid #10B981;">
              <p style="color: #065F46; margin: 0; font-size: 14px; font-weight: 500;">
                📋 Prescription attached: <a href="${prescriptionUrl}" style="color: #059669; text-decoration: underline;">View prescription</a>
              </p>
            </div>
          ` : ''}

          ${notes ? `
            <div style="margin-bottom: 16px; padding: 12px 16px; background: #F3F4F6; border-radius: 8px;">
              <p style="color: #6B7280; margin: 0 0 4px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Notes</p>
              <p style="color: #111827; margin: 0; font-size: 14px;">${notes}</p>
            </div>
          ` : ''}

          ${healthInfo ? `
            <div style="margin-bottom: 16px; padding: 12px 16px; background: #FFF7ED; border-radius: 8px; border-left: 4px solid #F59E0B;">
              <p style="color: #92400E; margin: 0 0 6px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">⚠️ Health Information</p>
              <p style="color: #78350F; margin: 0; font-size: 14px; line-height: 1.6;">${healthInfo}</p>
            </div>
          ` : ''}

          <!-- Action buttons -->
          <div style="margin-top: 24px; text-align: center;">
            <p style="color: #6B7280; margin: 0 0 12px; font-size: 13px;">Update order status:</p>
            <a href="${baseUrl}/pharmacy/orders/status?token=${statusToken}&status=processing"
               style="display: inline-block; background: #F59E0B; color: #FFFFFF; padding: 10px 20px; border-radius: 8px; font-weight: 600; font-size: 14px; text-decoration: none; margin: 0 6px 8px;">
              ⏳ Processing
            </a>
            <a href="${baseUrl}/pharmacy/orders/status?token=${statusToken}&status=ready"
               style="display: inline-block; background: #10B981; color: #FFFFFF; padding: 10px 20px; border-radius: 8px; font-weight: 600; font-size: 14px; text-decoration: none; margin: 0 6px 8px;">
              ✅ Ready for Pickup
            </a>
            <a href="${baseUrl}/pharmacy/orders/status?token=${statusToken}&status=completed"
               style="display: inline-block; background: #6B7280; color: #FFFFFF; padding: 10px 20px; border-radius: 8px; font-weight: 600; font-size: 14px; text-decoration: none; margin: 0 6px 8px;">
              ✔ Completed
            </a>
          </div>
        </div>

        ${this.emailFooter()}
      </div>
    `;
  }

  private buildOrderEmailText(params: {
    userName: string;
    userEmail: string;
    pharmacyName: string;
    orderId: string;
    items: Array<{ name: string; dosage?: string; quantity?: string }>;
    prescriptionUrl?: string;
    notes?: string;
  }): string {
    const { userName, userEmail, pharmacyName, orderId, items, prescriptionUrl, notes } = params;
    const itemsList = items
      .map((item, i) => `${i + 1}. ${item.name}${item.dosage ? ` (${item.dosage})` : ''}${item.quantity ? ` — ${item.quantity}` : ''}`)
      .join('\n');

    return [
      `[EatSense] New Medication Order`,
      ``,
      `Customer: ${userName}`,
      `Email: ${userEmail}`,
      `Pharmacy: ${pharmacyName}`,
      `Order ID: ${orderId}`,
      ``,
      `Medications:`,
      itemsList,
      ``,
      ...(prescriptionUrl ? [`Prescription: ${prescriptionUrl}`, ``] : []),
      ...(notes ? [`Notes: ${notes}`, ``] : []),
      `Date: ${new Date().toISOString()}`,
      ``,
      `— EatSense Team`,
    ].join('\n');
  }

  private buildLowStockEmail(params: {
    userName: string;
    userEmail: string;
    medicationName: string;
    dosage: string | null;
    remainingStock: number;
    lowStockThreshold: number;
    pharmacies: Array<{ pharmacyName: string }>;
  }): string {
    const { userName, userEmail, medicationName, dosage, remainingStock, lowStockThreshold, pharmacies } = params;

    return `
      <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #FFFFFF; border-radius: 16px; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
        ${this.emailHeader()}

        <div style="padding: 28px 24px;">
          <div style="background: #FEF2F2; border: 1px solid #FCA5A5; border-radius: 12px; padding: 20px; margin-bottom: 24px; text-align: center;">
            <p style="font-size: 32px; margin: 0 0 8px;">⚠️</p>
            <h2 style="color: #991B1B; margin: 0 0 4px; font-size: 18px;">Low Medication Stock Alert</h2>
            <p style="color: #B91C1C; margin: 0; font-size: 14px;">A customer's medication supply is running low</p>
          </div>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <tr>
              <td style="padding: 8px 0; color: #6B7280; font-size: 14px; width: 120px;">Customer</td>
              <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600;">${userName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">Email</td>
              <td style="padding: 8px 0; color: #111827; font-size: 14px;">${userEmail}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">Medication</td>
              <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600;">${medicationName}${dosage ? ` (${dosage})` : ''}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">Remaining</td>
              <td style="padding: 8px 0;">
                <span style="color: #DC2626; font-size: 18px; font-weight: 700;">${remainingStock}</span>
                <span style="color: #6B7280; font-size: 13px;"> pills left (threshold: ${lowStockThreshold})</span>
              </td>
            </tr>
            ${pharmacies.length > 0 ? `
              <tr>
                <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">Pharmacy</td>
                <td style="padding: 8px 0; color: #111827; font-size: 14px;">${pharmacies.map(p => p.pharmacyName).join(', ')}</td>
              </tr>
            ` : ''}
          </table>

          <div style="background: #F0FDF4; border-radius: 8px; padding: 14px 16px; border-left: 4px solid #22C55E;">
            <p style="color: #166534; margin: 0; font-size: 14px;">
              💡 <strong>Suggested action:</strong> Prepare a refill of ${medicationName}${dosage ? ` (${dosage})` : ''} for this customer.
            </p>
          </div>
        </div>

        ${this.emailFooter()}
      </div>
    `;
  }

  private buildStatusPageHtml(title: string, message: string, type: 'success' | 'error'): string {
    const bgColor = type === 'success' ? '#ECFDF5' : '#FEF2F2';
    const textColor = type === 'success' ? '#065F46' : '#991B1B';
    const icon = type === 'success' ? '✅' : '❌';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>${title} — EatSense</title>
        <style>
          body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #F9FAFB; margin: 0; padding: 40px 16px; }
        </style>
      </head>
      <body>
        <div style="max-width: 480px; margin: 0 auto; background: #FFF; border-radius: 16px; box-shadow: 0 4px 24px rgba(0,0,0,0.08); overflow: hidden;">
          <div style="background: linear-gradient(135deg, #2563EB 0%, #7C3AED 100%); padding: 24px; text-align: center;">
            <h1 style="color: #FFF; margin: 0; font-size: 22px;">EatSense</h1>
          </div>
          <div style="padding: 32px 24px; text-align: center;">
            <div style="background: ${bgColor}; border-radius: 12px; padding: 24px; margin-bottom: 16px;">
              <p style="font-size: 40px; margin: 0 0 12px;">${icon}</p>
              <h2 style="color: ${textColor}; margin: 0 0 8px; font-size: 20px;">${title}</h2>
              <p style="color: ${textColor}; margin: 0; font-size: 15px;">${message}</p>
            </div>
            <p style="color: #9CA3AF; font-size: 13px; margin: 16px 0 0;">You can close this page now.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}
