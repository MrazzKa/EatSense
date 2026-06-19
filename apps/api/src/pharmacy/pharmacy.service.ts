import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import * as QRCode from 'qrcode';
import { PrismaService } from '../../prisma.service';
import { MailerService } from '../../mailer/mailer.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ConnectPharmacyDto } from './dto/connect-pharmacy.dto';
import { CreatePharmacyOrderDto } from './dto/create-pharmacy-order.dto';

// Localized push messages for pharmacy order lifecycle. Recipient's
// preferences.language drives the choice; falls back to English.
type PushLang = 'en' | 'ru' | 'kk' | 'fr' | 'de' | 'es';
const ORDER_PUSH: Record<string, Record<PushLang, { title: string; body: (orderId: string) => string }>> = {
  sent: {
    // Neutral wording: a pilot order may have no connected pharmacy (it routes to
    // the EatSense team), so we don't claim it went "to the pharmacy".
    en: { title: 'Order sent', body: (id) => `Your order #${id} has been sent.` },
    ru: { title: 'Заказ отправлен', body: (id) => `Ваш заказ №${id} отправлен.` },
    kk: { title: 'Тапсырыс жіберілді', body: (id) => `Тапсырысыңыз №${id} жіберілді.` },
    fr: { title: 'Commande envoyée', body: (id) => `Votre commande n°${id} a été envoyée.` },
    de: { title: 'Bestellung gesendet', body: (id) => `Deine Bestellung Nr. ${id} wurde gesendet.` },
    es: { title: 'Pedido enviado', body: (id) => `Tu pedido n.º ${id} ha sido enviado.` },
  },
  processing: {
    en: { title: 'Order in progress', body: (id) => `The pharmacy is preparing your order #${id}.` },
    ru: { title: 'Заказ в работе', body: (id) => `Аптека готовит ваш заказ №${id}.` },
    kk: { title: 'Тапсырыс өңделуде', body: (id) => `Дәріхана №${id} тапсырысыңызды дайындап жатыр.` },
    fr: { title: 'Commande en préparation', body: (id) => `La pharmacie prépare votre commande n°${id}.` },
    de: { title: 'Bestellung wird bearbeitet', body: (id) => `Die Apotheke bereitet deine Bestellung Nr. ${id} vor.` },
    es: { title: 'Pedido en preparación', body: (id) => `La farmacia está preparando tu pedido n.º ${id}.` },
  },
  ready: {
    en: { title: 'Order ready for pickup', body: (id) => `Your order #${id} is ready to pick up at the pharmacy.` },
    ru: { title: 'Заказ готов к выдаче', body: (id) => `Заказ №${id} готов к получению в аптеке.` },
    kk: { title: 'Тапсырыс дайын', body: (id) => `№${id} тапсырыс дәріханада дайын.` },
    fr: { title: 'Commande prête', body: (id) => `Votre commande n°${id} est prête à être récupérée à la pharmacie.` },
    de: { title: 'Bestellung abholbereit', body: (id) => `Deine Bestellung Nr. ${id} ist in der Apotheke abholbereit.` },
    es: { title: 'Pedido listo', body: (id) => `Tu pedido n.º ${id} está listo para retirar en la farmacia.` },
  },
  completed: {
    en: { title: 'Order completed', body: (id) => `Your pharmacy order #${id} is completed.` },
    ru: { title: 'Заказ завершён', body: (id) => `Заказ в аптеке №${id} завершён.` },
    kk: { title: 'Тапсырыс аяқталды', body: (id) => `Дәріханадағы №${id} тапсырыс аяқталды.` },
    fr: { title: 'Commande terminée', body: (id) => `Votre commande à la pharmacie n°${id} est terminée.` },
    de: { title: 'Bestellung abgeschlossen', body: (id) => `Deine Apothekenbestellung Nr. ${id} ist abgeschlossen.` },
    es: { title: 'Pedido completado', body: (id) => `Tu pedido a la farmacia n.º ${id} está completado.` },
  },
};

// Localized push when a tracked medication runs low — nudges the patient to
// request a refill in one tap. {name} = medication name, {days} = days left.
const LOW_STOCK_PUSH: Record<PushLang, { title: string; body: (name: string, days: number) => string }> = {
  en: { title: 'Medication running low', body: (n, d) => `${n} — about ${d} ${d === 1 ? 'day' : 'days'} left. Tap to request a refill.` },
  ru: { title: 'Лекарство заканчивается', body: (n, d) => `${n} — осталось примерно ${d} ${d === 1 ? 'день' : 'дн.'}. Нажмите, чтобы заказать пополнение.` },
  kk: { title: 'Дәрі таусылып барады', body: (n, d) => `${n} — шамамен ${d} күн қалды. Толықтыруға тапсырыс беру үшін басыңыз.` },
  fr: { title: 'Médicament bientôt épuisé', body: (n, d) => `${n} — il reste environ ${d} ${d === 1 ? 'jour' : 'jours'}. Touchez pour demander un réapprovisionnement.` },
  de: { title: 'Medikament geht zur Neige', body: (n, d) => `${n} — noch etwa ${d} ${d === 1 ? 'Tag' : 'Tage'}. Tippen, um Nachschub anzufordern.` },
  es: { title: 'Medicamento por agotarse', body: (n, d) => `${n} — quedan unos ${d} ${d === 1 ? 'día' : 'días'}. Toca para pedir una reposición.` },
};

// Pharmacy-facing email language. Swiss pilot → en | fr | de | it.
type PharmaLang = 'en' | 'fr' | 'de' | 'it';
function normalizePharmacyLang(raw: any): PharmaLang {
  const v = String(raw || '').split('-')[0].toLowerCase();
  return (['fr', 'de', 'it'] as const).includes(v as any) ? (v as PharmaLang) : 'en';
}

// Visible strings for the pharmacy-facing emails + status page. Only the labels
// a pharmacist actually reads are localized; structure/brand stays constant.
const PHARMA_I18N: Record<PharmaLang, Record<string, string>> = {
  en: {
    orderSubject: 'New medication order from', newOrder: 'New Medication Order', customer: 'Customer', email: 'Email',
    pharmacy: 'Pharmacy', orderId: 'Order ID', ordered: 'Ordered Medications', medication: 'Medication', dosage: 'Dosage',
    qty: 'Qty', prescriptionAttached: 'Prescription attached', viewPrescription: 'View prescription', notes: 'Notes',
    healthInfo: 'Health Information', updateStatus: 'Update order status:', processing: 'Processing', ready: 'Ready for Pickup',
    completed: 'Completed', lowStockSubject: 'Low stock alert', lowStockTitle: 'Low Medication Stock Alert',
    lowStockLead: "A customer's medication supply is running low", remaining: 'Remaining', pillsLeft: 'pills left',
    threshold: 'alert threshold', days: 'days', suggested: 'Suggested action', prepareRefill: 'Prepare a refill of',
    forCustomer: 'for this customer.', checkOnline: 'Check pharmacy stock online:', statusUpdated: 'Status Updated!',
    orderMarked: 'has been marked as', closePage: 'You can close this page now.', notFound: 'Order Not Found',
    linkInvalid: 'This link is invalid or has expired.', invalidStatus: 'Invalid Status', invalidStatusBody: 'The requested status update is not valid.',
  },
  fr: {
    orderSubject: 'Nouvelle commande de médicaments de', newOrder: 'Nouvelle commande de médicaments', customer: 'Client', email: 'E-mail',
    pharmacy: 'Pharmacie', orderId: 'N° de commande', ordered: 'Médicaments commandés', medication: 'Médicament', dosage: 'Dosage',
    qty: 'Qté', prescriptionAttached: 'Ordonnance jointe', viewPrescription: "Voir l'ordonnance", notes: 'Remarques',
    healthInfo: 'Informations de santé', updateStatus: 'Mettre à jour le statut :', processing: 'En préparation', ready: 'Prête à être retirée',
    completed: 'Terminée', lowStockSubject: 'Alerte stock bas', lowStockTitle: 'Alerte de stock de médicament bas',
    lowStockLead: "Le stock de médicament d'un client est bientôt épuisé", remaining: 'Restant', pillsLeft: 'comprimés restants',
    threshold: 'seuil d’alerte', days: 'jours', suggested: 'Action suggérée', prepareRefill: 'Préparer un réapprovisionnement de',
    forCustomer: 'pour ce client.', checkOnline: 'Vérifier le stock en ligne :', statusUpdated: 'Statut mis à jour !',
    orderMarked: 'a été marquée comme', closePage: 'Vous pouvez fermer cette page.', notFound: 'Commande introuvable',
    linkInvalid: 'Ce lien est invalide ou a expiré.', invalidStatus: 'Statut invalide', invalidStatusBody: "La mise à jour de statut demandée n'est pas valide.",
  },
  de: {
    orderSubject: 'Neue Medikamentenbestellung von', newOrder: 'Neue Medikamentenbestellung', customer: 'Kunde', email: 'E-Mail',
    pharmacy: 'Apotheke', orderId: 'Bestell-Nr.', ordered: 'Bestellte Medikamente', medication: 'Medikament', dosage: 'Dosierung',
    qty: 'Menge', prescriptionAttached: 'Rezept beigefügt', viewPrescription: 'Rezept ansehen', notes: 'Hinweise',
    healthInfo: 'Gesundheitsinformationen', updateStatus: 'Status aktualisieren:', processing: 'In Bearbeitung', ready: 'Abholbereit',
    completed: 'Abgeschlossen', lowStockSubject: 'Warnung: niedriger Bestand', lowStockTitle: 'Warnung: niedriger Medikamentenbestand',
    lowStockLead: 'Der Medikamentenvorrat eines Kunden geht zur Neige', remaining: 'Verbleibend', pillsLeft: 'Tabletten übrig',
    threshold: 'Warnschwelle', days: 'Tage', suggested: 'Empfohlene Aktion', prepareRefill: 'Nachschub vorbereiten für',
    forCustomer: 'für diesen Kunden.', checkOnline: 'Bestand online prüfen:', statusUpdated: 'Status aktualisiert!',
    orderMarked: 'wurde markiert als', closePage: 'Sie können diese Seite jetzt schließen.', notFound: 'Bestellung nicht gefunden',
    linkInvalid: 'Dieser Link ist ungültig oder abgelaufen.', invalidStatus: 'Ungültiger Status', invalidStatusBody: 'Die angeforderte Statusänderung ist ungültig.',
  },
  it: {
    orderSubject: 'Nuovo ordine di farmaci da', newOrder: 'Nuovo ordine di farmaci', customer: 'Cliente', email: 'E-mail',
    pharmacy: 'Farmacia', orderId: 'N. ordine', ordered: 'Farmaci ordinati', medication: 'Farmaco', dosage: 'Dosaggio',
    qty: 'Q.tà', prescriptionAttached: 'Ricetta allegata', viewPrescription: 'Vedi ricetta', notes: 'Note',
    healthInfo: 'Informazioni sulla salute', updateStatus: "Aggiorna lo stato dell'ordine:", processing: 'In preparazione', ready: 'Pronto per il ritiro',
    completed: 'Completato', lowStockSubject: 'Avviso scorte basse', lowStockTitle: 'Avviso scorte di farmaco basse',
    lowStockLead: 'Le scorte di farmaco di un cliente stanno per esaurirsi', remaining: 'Rimanenti', pillsLeft: 'compresse rimaste',
    threshold: 'soglia di avviso', days: 'giorni', suggested: 'Azione consigliata', prepareRefill: 'Preparare un rifornimento di',
    forCustomer: 'per questo cliente.', checkOnline: 'Controlla le scorte online:', statusUpdated: 'Stato aggiornato!',
    orderMarked: 'è stato contrassegnato come', closePage: 'Puoi chiudere questa pagina.', notFound: 'Ordine non trovato',
    linkInvalid: 'Questo link non è valido o è scaduto.', invalidStatus: 'Stato non valido', invalidStatusBody: "L'aggiornamento di stato richiesto non è valido.",
  },
};

@Injectable()
export class PharmacyService {
  private readonly logger = new Logger(PharmacyService.name);
  private readonly orderEmail = 'info@eatsense.ch';
  private readonly apiBaseUrl = process.env.API_BASE_URL || 'https://api.eatsense.ch';
  // While the partner pilot is finalised, medication orders go to the EatSense team
  // only. Set PHARMACY_FORWARD_ORDERS=true to also email the connected pharmacy.
  private readonly forwardOrdersToPharmacy = process.env.PHARMACY_FORWARD_ORDERS === 'true';
  // Low-stock alerts go to the team only by default. Set PHARMACY_FORWARD_LOW_STOCK=true
  // to also send the connected pharmacy a low-stock heads-up (in its language).
  private readonly forwardLowStockToPharmacy = process.env.PHARMACY_FORWARD_LOW_STOCK === 'true';

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailer: MailerService,
    private readonly notifications: NotificationsService,
  ) {}

  private pickLang(raw: any): PushLang {
    const v = String(raw || '').split('-')[0].toLowerCase();
    return (['ru', 'kk', 'fr', 'de', 'es'] as const).includes(v as any) ? (v as PushLang) : 'en';
  }

  private async notifyUserOrderStatus(userId: string, orderId: string, status: string) {
    const messages = ORDER_PUSH[status];
    if (!messages) return;
    try {
      const profile = await this.prisma.userProfile.findUnique({
        where: { userId },
        select: { preferences: true },
      });
      const lang = this.pickLang((profile?.preferences as any)?.language);
      const m = messages[lang];
      // Show a tidy reference (uppercase) instead of a raw lowercase cuid tail.
      const shortId = orderId.slice(-8).toUpperCase();
      await this.notifications.sendPushNotification(
        userId,
        m.title,
        m.body(shortId),
        { type: 'pharmacy_order_status', orderId, status },
      );
    } catch (err) {
      this.logger.warn(`[Pharmacy] Failed to push order ${status} to user ${userId}: ${(err as any)?.message}`);
    }
  }

  /**
   * Push a low-stock nudge to the patient (localized). Tapping it deep-links to
   * the pharmacy order screen with the medication pre-filled (handled client-side
   * via the `medication_low_stock` notification type + payload).
   */
  async notifyUserLowStock(
    userId: string,
    med: { medicationId: string; name: string; dosage: string | null; remainingStock: number; daysRemaining: number },
  ) {
    try {
      const profile = await this.prisma.userProfile.findUnique({
        where: { userId },
        select: { preferences: true },
      });
      const lang = this.pickLang((profile?.preferences as any)?.language);
      const m = LOW_STOCK_PUSH[lang];
      await this.notifications.sendPushNotification(
        userId,
        m.title,
        m.body(med.name, med.daysRemaining),
        {
          type: 'medication_low_stock',
          medicationId: med.medicationId,
          name: med.name,
          dosage: med.dosage || '',
          remainingStock: String(med.remainingStock),
          daysRemaining: String(med.daysRemaining),
        },
      );
    } catch (err) {
      this.logger.warn(`[Pharmacy] Failed to push low stock to user ${userId}: ${(err as any)?.message}`);
    }
  }

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
        pharmacyWebsite: dto.pharmacyWebsite || null,
        language: normalizePharmacyLang(dto.language),
        source: 'manual',
      },
    });
  }

  // ========== Pharmacy Access Codes ==========

  private normalizeCode(raw: string) {
    return String(raw || '').replace(/[^a-z0-9-]/gi, '').toUpperCase();
  }

  /** Patient links to an admin-provisioned pharmacy by entering its code. */
  async applyPharmacyCode(userId: string, rawCode: string) {
    const code = this.normalizeCode(rawCode);
    if (code.length < 4) throw new NotFoundException('Check the code and try again.');

    const access = await this.prisma.pharmacyAccessCode.findUnique({ where: { code } });
    if (!access || !access.isActive) throw new NotFoundException('Check the code and try again.');

    // Re-linking the same code just reactivates the existing connection.
    const existing = await this.prisma.pharmacyConnection.findFirst({
      where: { userId, pharmacyCode: code },
    });

    const data = {
      pharmacyName: access.pharmacyName,
      pharmacyCode: access.code,
      pharmacyAddress: access.pharmacyAddress,
      pharmacyPhone: access.pharmacyPhone,
      pharmacyEmail: access.pharmacyEmail,
      pharmacyWebsite: access.pharmacyWebsite,
      language: normalizePharmacyLang(access.language),
      source: 'code',
      isActive: true,
    };

    const connection = existing
      ? await this.prisma.pharmacyConnection.update({ where: { id: existing.id }, data })
      : await this.prisma.pharmacyConnection.create({ data: { userId, ...data } });

    if (!existing) {
      await this.prisma.pharmacyAccessCode.update({
        where: { id: access.id },
        data: { usageCount: { increment: 1 } },
      }).catch(() => {});
    }

    return connection;
  }

  // --- Admin code management (called from PharmacyAdminController) ---

  private async generateUniquePharmacyCode() {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    for (let attempt = 0; attempt < 20; attempt += 1) {
      let code = '';
      const bytes = randomBytes(6);
      for (const b of bytes) code += alphabet[b % alphabet.length];
      const exists = await this.prisma.pharmacyAccessCode.findUnique({ where: { code } });
      if (!exists) return code;
    }
    throw new Error('Could not generate unique pharmacy code');
  }

  async adminListPharmacyCodes() {
    return this.prisma.pharmacyAccessCode.findMany({ orderBy: { createdAt: 'desc' }, take: 200 });
  }

  async adminCreatePharmacyCode(input: {
    pharmacyName: string;
    pharmacyEmail?: string;
    pharmacyAddress?: string;
    pharmacyPhone?: string;
    pharmacyWebsite?: string;
    language?: string;
    code?: string;
  }) {
    let code = input.code ? this.normalizeCode(input.code) : await this.generateUniquePharmacyCode();
    if (input.code) {
      if (!/^[A-Z0-9-]{4,32}$/.test(code) || code.startsWith('-') || code.endsWith('-') || code.includes('--')) {
        throw new Error('Invalid code format. Use [A-Z0-9-] 4..32, no leading/trailing/double "-".');
      }
      const exists = await this.prisma.pharmacyAccessCode.findUnique({ where: { code } });
      if (exists) throw new Error('Code already taken');
    }
    return this.prisma.pharmacyAccessCode.create({
      data: {
        code,
        pharmacyName: input.pharmacyName,
        pharmacyEmail: input.pharmacyEmail || null,
        pharmacyAddress: input.pharmacyAddress || null,
        pharmacyPhone: input.pharmacyPhone || null,
        pharmacyWebsite: input.pharmacyWebsite || null,
        language: normalizePharmacyLang(input.language),
      },
    });
  }

  async adminSetPharmacyCodeActive(id: string, isActive: boolean) {
    return this.prisma.pharmacyAccessCode.update({ where: { id }, data: { isActive } });
  }

  // QR (PNG data URL) for the universal link patients scan to link this pharmacy.
  async adminGetPharmacyCodeQr(id: string) {
    const access = await this.prisma.pharmacyAccessCode.findUnique({ where: { id } });
    if (!access) throw new NotFoundException('Pharmacy code not found');
    const base = process.env.PHARMACY_QR_BASE_URL || 'https://eatsense.ch/pharmacy';
    const link = `${base}?code=${encodeURIComponent(access.code)}`;
    const dataUrl = await QRCode.toDataURL(link, { width: 512, margin: 2, errorCorrectionLevel: 'M' });
    return { code: access.code, pharmacyName: access.pharmacyName, link, dataUrl };
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
        ...(dto.pharmacyWebsite !== undefined ? { pharmacyWebsite: dto.pharmacyWebsite || null } : {}),
        ...(dto.language !== undefined ? { language: normalizePharmacyLang(dto.language) } : {}),
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
    let pharmacyLang: PharmaLang = 'en';
    if (dto.pharmacyConnectionId) {
      const pharmacy = await this.prisma.pharmacyConnection.findFirst({
        where: { id: dto.pharmacyConnectionId, userId },
      });
      if (pharmacy) {
        pharmacyName = pharmacy.pharmacyName;
        pharmacyEmail = pharmacy.pharmacyEmail;
        pharmacyLang = normalizePharmacyLang((pharmacy as any).language);
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

    const orderEmailArgs = {
      userName,
      userEmail: user?.email || 'N/A',
      pharmacyName,
      orderId: order.id,
      statusToken,
      items: dto.items,
      prescriptionUrl: dto.prescriptionUrl,
      notes: dto.notes,
      healthInfo,
    };

    // Team copy is always English; the pharmacy copy is in the pharmacy's language.
    const teamHtml = this.buildOrderEmail({ ...orderEmailArgs, lang: 'en' });
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

    // Send to EatSense team (always, English)
    try {
      await this.mailer.sendEmail({ to: this.orderEmail, subject, text, html: teamHtml, category: 'pharmacy' });
      this.logger.log(`[Pharmacy] Order email sent to EatSense for order ${order.id}`);
    } catch (err) {
      this.logger.error(`[Pharmacy] Failed to send order email for order ${order.id}:`, err);
    }

    // Also send to pharmacy if they have email configured (in their language).
    // Gated by PHARMACY_FORWARD_ORDERS so the pilot routes orders to our team first.
    if (pharmacyEmail && this.forwardOrdersToPharmacy) {
      try {
        const pharmaHtml = this.buildOrderEmail({ ...orderEmailArgs, lang: pharmacyLang });
        const pharmaSubject = `[EatSense] ${PHARMA_I18N[pharmacyLang].orderSubject} ${userName}`;
        await this.mailer.sendEmail({ to: pharmacyEmail, subject: pharmaSubject, text, html: pharmaHtml, category: 'pharmacy' });
        this.logger.log(`[Pharmacy] Order email sent to pharmacy ${pharmacyEmail} (${pharmacyLang}) for order ${order.id}`);
      } catch (err) {
        this.logger.error(`[Pharmacy] Failed to send email to pharmacy ${pharmacyEmail}:`, err);
      }
    }

    // Push confirmation to the client. Best-effort, never blocks the response.
    this.notifyUserOrderStatus(userId, order.id, 'sent').catch(() => {});

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
      const T = PHARMA_I18N.en;
      return this.buildStatusPageHtml(T.notFound, T.linkInvalid, 'error', 'en');
    }

    const lang = normalizePharmacyLang((order as any).pharmacyConnection?.language);
    const T = PHARMA_I18N[lang];

    const validStatuses = ['processing', 'ready', 'completed'];
    if (!validStatuses.includes(status)) {
      return this.buildStatusPageHtml(T.invalidStatus, T.invalidStatusBody, 'error', lang);
    }

    await this.prisma.pharmacyOrder.update({
      where: { id: order.id },
      data: { status },
    });

    // Push the new status to the client so they know without opening the app.
    // Best-effort — the status update for the pharmacy already succeeded above.
    this.notifyUserOrderStatus(order.userId, order.id, status).catch(() => {});

    const statusLabels: Record<string, string> = {
      processing: T.processing,
      ready: T.ready,
      completed: T.completed,
    };

    return this.buildStatusPageHtml(
      T.statusUpdated,
      `${T.orderId} #${order.id.slice(-8).toUpperCase()} ${T.orderMarked} <strong>${statusLabels[status] || status}</strong>.`,
      'success',
      lang,
    );
  }

  // ========== Low Stock Notification ==========

  async sendLowStockAlert(userId: string, medicationName: string, dosage: string | null, remainingStock: number, lowStockThreshold: number, daysRemaining?: number) {
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

    const text = [
      `Low Stock Alert`,
      ``,
      `Customer: ${userName} (${user.email})`,
      `Medication: ${medicationName}${dosage ? ` (${dosage})` : ''}`,
      `Remaining: ${remainingStock} pills${daysRemaining != null ? ` (~${daysRemaining} days)` : ''}`,
      `Threshold: ${lowStockThreshold} days`,
      ``,
      `The customer's medication supply is running low.`,
    ].join('\n');

    // Send to EatSense (always, English, lists all pharmacies).
    try {
      const teamHtml = this.buildLowStockEmail({
        userName, userEmail: user.email, medicationName, dosage, remainingStock,
        lowStockThreshold, daysRemaining, pharmacies: user.pharmacyConnections as any[], lang: 'en',
      });
      const subject = `[EatSense] Low stock alert: ${medicationName} for ${userName}`;
      await this.mailer.sendEmail({ to: this.orderEmail, subject, text, html: teamHtml, category: 'pharmacy' });
      this.logger.log(`[Pharmacy] Low stock alert sent for ${medicationName}`);
    } catch (err) {
      this.logger.error(`[Pharmacy] Failed to send low stock alert:`, err);
    }

    // By default we do NOT email the connected pharmacy on a low-stock crossing
    // (confirmation-based pilot: the patient is nudged via push and the pharmacy
    // is contacted only after an explicit refill order). Set
    // PHARMACY_FORWARD_LOW_STOCK=true to also send each connected pharmacy a
    // low-stock heads-up in its own language.
    if (this.forwardLowStockToPharmacy) {
      for (const pharmacy of user.pharmacyConnections as any[]) {
        if (!pharmacy?.pharmacyEmail) continue;
        try {
          const pharmacyLang = normalizePharmacyLang(pharmacy.language);
          const pharmaHtml = this.buildLowStockEmail({
            userName, userEmail: user.email, medicationName, dosage, remainingStock,
            lowStockThreshold, daysRemaining, pharmacies: [pharmacy], lang: pharmacyLang,
          });
          const pharmaSubject = `[EatSense] ${PHARMA_I18N[pharmacyLang].lowStockSubject}: ${medicationName}`;
          await this.mailer.sendEmail({ to: pharmacy.pharmacyEmail, subject: pharmaSubject, text, html: pharmaHtml, category: 'pharmacy' });
          this.logger.log(`[Pharmacy] Low stock alert sent to pharmacy ${pharmacy.pharmacyEmail} (${pharmacyLang}) for ${medicationName}`);
        } catch (err) {
          this.logger.error(`[Pharmacy] Failed to send low stock alert to pharmacy ${pharmacy.pharmacyEmail}:`, err);
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
    // Canonical key is `dietaryPreferences` (unified in 2026-05-30); read
    // legacy `diets` and `dietaryRestrictions` for back-compat with old data.
    const diet = Array.isArray(prefs?.dietaryPreferences) && prefs.dietaryPreferences.length
      ? prefs.dietaryPreferences
      : Array.isArray(prefs?.diets) && prefs.diets.length
        ? prefs.diets
        : Array.isArray(prefs?.dietaryRestrictions) && prefs.dietaryRestrictions.length
          ? prefs.dietaryRestrictions
          : null;
    if (diet) {
      parts.push(`<strong>Diet:</strong> ${diet.join(', ')}`);
    }
    if (prefs?.healthConditions?.length) {
      const conditions = prefs.healthConditions.filter((c: string) => c && c !== 'none');
      if (conditions.length) parts.push(`<strong>Health conditions:</strong> ${conditions.join(', ')}`);
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
    lang?: PharmaLang;
  }): string {
    const { userName, userEmail, pharmacyName, orderId, statusToken, items, prescriptionUrl, notes, healthInfo } = params;
    const baseUrl = this.apiBaseUrl;
    const T = PHARMA_I18N[params.lang || 'en'];

    return `
      <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #FFFFFF; border-radius: 16px; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
        ${this.emailHeader()}

        <div style="padding: 28px 24px;">
          <h2 style="color: #111827; margin: 0 0 20px; font-size: 20px;">${T.newOrder}</h2>

          <!-- Customer info -->
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
            <tr>
              <td style="padding: 6px 0; color: #6B7280; font-size: 14px; width: 100px;">${T.customer}</td>
              <td style="padding: 6px 0; color: #111827; font-size: 14px; font-weight: 600;">${userName}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #6B7280; font-size: 14px;">${T.email}</td>
              <td style="padding: 6px 0; color: #111827; font-size: 14px;">${userEmail}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #6B7280; font-size: 14px;">${T.pharmacy}</td>
              <td style="padding: 6px 0; color: #111827; font-size: 14px; font-weight: 600;">${pharmacyName}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #6B7280; font-size: 14px;">${T.orderId}</td>
              <td style="padding: 6px 0; color: #111827; font-size: 13px; font-family: monospace; background: #F3F4F6; padding: 4px 8px; border-radius: 4px; display: inline-block;">${orderId.slice(-8)}</td>
            </tr>
          </table>

          <!-- Medications table -->
          <h3 style="color: #111827; margin: 0 0 12px; font-size: 16px;">${T.ordered}</h3>
          <table style="width: 100%; border-collapse: collapse; border: 1px solid #E5E7EB; border-radius: 8px; overflow: hidden; margin-bottom: 20px;">
            <thead>
              <tr style="background: #F9FAFB;">
                <th style="padding: 10px 12px; text-align: left; color: #6B7280; font-weight: 600; font-size: 13px; border-bottom: 2px solid #E5E7EB;">#</th>
                <th style="padding: 10px 12px; text-align: left; color: #6B7280; font-weight: 600; font-size: 13px; border-bottom: 2px solid #E5E7EB;">${T.medication}</th>
                <th style="padding: 10px 12px; text-align: left; color: #6B7280; font-weight: 600; font-size: 13px; border-bottom: 2px solid #E5E7EB;">${T.dosage}</th>
                <th style="padding: 10px 12px; text-align: left; color: #6B7280; font-weight: 600; font-size: 13px; border-bottom: 2px solid #E5E7EB;">${T.qty}</th>
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
                📋 ${T.prescriptionAttached}: <a href="${prescriptionUrl}" style="color: #059669; text-decoration: underline;">${T.viewPrescription}</a>
              </p>
            </div>
          ` : ''}

          ${notes ? `
            <div style="margin-bottom: 16px; padding: 12px 16px; background: #F3F4F6; border-radius: 8px;">
              <p style="color: #6B7280; margin: 0 0 4px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">${T.notes}</p>
              <p style="color: #111827; margin: 0; font-size: 14px;">${notes}</p>
            </div>
          ` : ''}

          ${healthInfo ? `
            <div style="margin-bottom: 16px; padding: 12px 16px; background: #FFF7ED; border-radius: 8px; border-left: 4px solid #F59E0B;">
              <p style="color: #92400E; margin: 0 0 6px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">⚠️ ${T.healthInfo}</p>
              <p style="color: #78350F; margin: 0; font-size: 14px; line-height: 1.6;">${healthInfo}</p>
            </div>
          ` : ''}

          <!-- Action buttons -->
          <div style="margin-top: 24px; text-align: center;">
            <p style="color: #6B7280; margin: 0 0 12px; font-size: 13px;">${T.updateStatus}</p>
            <a href="${baseUrl}/pharmacy/orders/status?token=${statusToken}&status=processing"
               style="display: inline-block; background: #F59E0B; color: #FFFFFF; padding: 10px 20px; border-radius: 8px; font-weight: 600; font-size: 14px; text-decoration: none; margin: 0 6px 8px;">
              ⏳ ${T.processing}
            </a>
            <a href="${baseUrl}/pharmacy/orders/status?token=${statusToken}&status=ready"
               style="display: inline-block; background: #10B981; color: #FFFFFF; padding: 10px 20px; border-radius: 8px; font-weight: 600; font-size: 14px; text-decoration: none; margin: 0 6px 8px;">
              ✅ ${T.ready}
            </a>
            <a href="${baseUrl}/pharmacy/orders/status?token=${statusToken}&status=completed"
               style="display: inline-block; background: #6B7280; color: #FFFFFF; padding: 10px 20px; border-radius: 8px; font-weight: 600; font-size: 14px; text-decoration: none; margin: 0 6px 8px;">
              ✔ ${T.completed}
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
    daysRemaining?: number;
    pharmacies: Array<{ pharmacyName: string; pharmacyWebsite?: string | null }>;
    lang?: PharmaLang;
  }): string {
    const { userName, userEmail, medicationName, dosage, remainingStock, lowStockThreshold, daysRemaining, pharmacies } = params;
    const T = PHARMA_I18N[params.lang || 'en'];
    const websiteLinks = pharmacies
      .filter((p) => p.pharmacyWebsite)
      .map((p) => `<a href="${p.pharmacyWebsite}" style="color:#2563EB;text-decoration:underline;">${p.pharmacyName}</a>`)
      .join(' · ');

    return `
      <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #FFFFFF; border-radius: 16px; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
        ${this.emailHeader()}

        <div style="padding: 28px 24px;">
          <div style="background: #FEF2F2; border: 1px solid #FCA5A5; border-radius: 12px; padding: 20px; margin-bottom: 24px; text-align: center;">
            <p style="font-size: 32px; margin: 0 0 8px;">⚠️</p>
            <h2 style="color: #991B1B; margin: 0 0 4px; font-size: 18px;">${T.lowStockTitle}</h2>
            <p style="color: #B91C1C; margin: 0; font-size: 14px;">${T.lowStockLead}</p>
          </div>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <tr>
              <td style="padding: 8px 0; color: #6B7280; font-size: 14px; width: 120px;">${T.customer}</td>
              <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600;">${userName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">${T.email}</td>
              <td style="padding: 8px 0; color: #111827; font-size: 14px;">${userEmail}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">${T.medication}</td>
              <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600;">${medicationName}${dosage ? ` (${dosage})` : ''}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">${T.remaining}</td>
              <td style="padding: 8px 0;">
                <span style="color: #DC2626; font-size: 18px; font-weight: 700;">${remainingStock}</span>
                <span style="color: #6B7280; font-size: 13px;"> ${T.pillsLeft}${daysRemaining != null ? ` (~${daysRemaining} ${T.days})` : ''} — ${T.threshold}: ${lowStockThreshold} ${T.days}</span>
              </td>
            </tr>
            ${pharmacies.length > 0 ? `
              <tr>
                <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">${T.pharmacy}</td>
                <td style="padding: 8px 0; color: #111827; font-size: 14px;">${pharmacies.map(p => p.pharmacyName).join(', ')}</td>
              </tr>
            ` : ''}
          </table>

          <div style="background: #F0FDF4; border-radius: 8px; padding: 14px 16px; border-left: 4px solid #22C55E;">
            <p style="color: #166534; margin: 0; font-size: 14px;">
              💡 <strong>${T.suggested}:</strong> ${T.prepareRefill} ${medicationName}${dosage ? ` (${dosage})` : ''} ${T.forCustomer}
            </p>
          </div>

          ${websiteLinks ? `
            <div style="margin-top: 14px; padding: 12px 16px; background: #EFF6FF; border-radius: 8px;">
              <p style="margin: 0; font-size: 13px; color: #1E40AF;">
                🌐 <strong>${T.checkOnline}</strong> ${websiteLinks}
              </p>
            </div>
          ` : ''}
        </div>

        ${this.emailFooter()}
      </div>
    `;
  }

  private buildStatusPageHtml(title: string, message: string, type: 'success' | 'error', lang: PharmaLang = 'en'): string {
    const bgColor = type === 'success' ? '#ECFDF5' : '#FEF2F2';
    const textColor = type === 'success' ? '#065F46' : '#991B1B';
    const icon = type === 'success' ? '✅' : '❌';
    const closeText = PHARMA_I18N[lang].closePage;

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
            <p style="color: #9CA3AF; font-size: 13px; margin: 16px 0 0;">${closeText}</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}
