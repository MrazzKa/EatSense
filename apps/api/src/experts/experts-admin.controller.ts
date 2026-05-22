import {
    Controller,
    Get,
    Post,
    Patch,
    Param,
    Body,
    Headers,
    Query,
    Req,
    UnauthorizedException,
    BadRequestException,
    Logger,
} from '@nestjs/common';
import type { Request } from 'express';
import * as crypto from 'crypto';
import { AdminCreateExpertDto, AdminUpdateNotesDto } from './dto/experts.dto';
import { PrismaService } from '../../prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ExpertsService } from './experts.service';
import { MediaService } from '../../media/media.service';
import { AuthService } from '../../auth/auth.service';

@Controller('admin/experts')
export class ExpertsAdminController {
    private readonly logger = new Logger(ExpertsAdminController.name);

    constructor(
        private prisma: PrismaService,
        private notifications: NotificationsService,
        private expertsService: ExpertsService,
        private media: MediaService,
        private auth: AuthService,
    ) {}

    private validateAdmin(adminSecret: string) {
        const expectedSecret = process.env.ADMIN_SECRET;
        if (!expectedSecret) throw new UnauthorizedException('Invalid admin credentials');
        const a = Buffer.from(String(adminSecret || ''));
        const b = Buffer.from(expectedSecret);
        // Equal lengths required for timingSafeEqual; fail fast but uniformly.
        if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
            throw new UnauthorizedException('Invalid admin credentials');
        }
    }

    private async writeAudit(
        action: string,
        targetType: string,
        targetId: string | null,
        payload: Record<string, any> | null,
        req?: Request,
    ) {
        try {
            await this.prisma.adminAuditLog.create({
                data: {
                    action,
                    targetType,
                    targetId: targetId ?? undefined,
                    payload: payload ?? undefined,
                    adminIdentifier: 'env-admin',
                    ipAddress: req?.ip ?? req?.headers?.['x-forwarded-for']?.toString() ?? null,
                },
            });
        } catch (err: any) {
            // Never let audit logging break the actual admin action.
            this.logger.warn(`Audit log write failed: ${err?.message}`);
        }
    }

    @Get()
    async list(
        @Headers('x-admin-secret') adminSecret: string,
        @Query('status') status?: string,
    ) {
        this.validateAdmin(adminSecret);

        const where: any = {};

        if (status === 'pending') {
            // Fresh applications awaiting initial review (never verified yet).
            // Excludes approved-then-unpublished experts (those keep isVerified=true).
            where.isPublished = false;
            where.isActive = true;
            where.isVerified = false;
        } else if (status === 'approved') {
            where.isPublished = true;
            where.isVerified = true;
        } else if (status === 'unpublished') {
            where.isActive = true;
            where.isPublished = false;
            where.isVerified = true;
        } else if (status === 'rejected') {
            where.isActive = false;
        }

        return this.prisma.expertProfile.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: {
                credentials: true,
                educationEntries: {
                    orderBy: { createdAt: 'asc' },
                },
                offers: {
                    orderBy: { sortOrder: 'asc' },
                },
                user: {
                    select: {
                        id: true,
                        email: true,
                        userProfile: {
                            select: { firstName: true, lastName: true },
                        },
                    },
                },
                accessCode: true,
                _count: {
                    select: { reviews: true, conversations: true },
                },
            },
        });
    }

    @Get('audit-log')
    async listAuditLogStatic(
        @Headers('x-admin-secret') adminSecret: string,
        @Query('limit') limit?: string,
        @Query('targetId') targetId?: string,
    ) {
        this.validateAdmin(adminSecret);
        const take = Math.min(parseInt(limit ?? '100', 10) || 100, 500);
        return this.prisma.adminAuditLog.findMany({
            where: targetId ? { targetId } : undefined,
            orderBy: { createdAt: 'desc' },
            take,
        });
    }

    @Get(':id/access-code')
    async getAccessCode(
        @Headers('x-admin-secret') adminSecret: string,
        @Param('id') id: string,
    ) {
        this.validateAdmin(adminSecret);
        const code = await this.expertsService.ensureAccessCodeForExpert(id);
        const usage = await this.expertsService.listAccessCodeUsageForExpert(id, 50);
        return { code, usage };
    }

    @Post(':id/access-code/regenerate')
    async regenerateAccessCode(
        @Headers('x-admin-secret') adminSecret: string,
        @Param('id') id: string,
        @Req() req: Request,
    ) {
        this.validateAdmin(adminSecret);
        const code = await this.expertsService.regenerateAccessCodeForExpert(id);
        await this.writeAudit('regenerate_expert_access_code', 'expert', id, null, req);
        return { success: true, code };
    }

    @Get(':id')
    async getById(
        @Headers('x-admin-secret') adminSecret: string,
        @Param('id') id: string,
    ) {
        this.validateAdmin(adminSecret);

        return this.prisma.expertProfile.findUnique({
            where: { id },
            include: {
                credentials: true,
                educationEntries: {
                    orderBy: { createdAt: 'asc' },
                },
                offers: true,
                user: {
                    select: {
                        id: true,
                        email: true,
                        createdAt: true,
                        userProfile: {
                            select: { firstName: true, lastName: true, avatarUrl: true },
                        },
                    },
                },
                reviews: {
                    take: 5,
                    orderBy: { createdAt: 'desc' },
                },
                accessCode: true,
                _count: {
                    select: { reviews: true, conversations: true },
                },
            },
        });
    }

    private async getUserLanguage(userId: string): Promise<string> {
        const supported = new Set(['en', 'ru', 'kk', 'fr', 'de', 'es']);
        try {
            const profile = await this.prisma.userProfile.findUnique({
                where: { userId },
                select: { preferences: true },
            });
            const prefs = profile?.preferences as Record<string, any> | null;
            const preferred = String(prefs?.language || prefs?.locale || '').split('-')[0].toLowerCase();
            if (supported.has(preferred)) {
                return preferred;
            }

            const expert = await this.prisma.expertProfile.findFirst({
                where: { userId },
                select: { languages: true },
                orderBy: { createdAt: 'desc' },
            });
            const expertLanguage = (expert?.languages || [])
                .map((lang) => String(lang).split('-')[0].toLowerCase())
                .find((lang) => supported.has(lang));
            return expertLanguage || 'en';
        } catch {
            return 'en';
        }
    }

    @Post(':id/approve')
    async approve(
        @Headers('x-admin-secret') adminSecret: string,
        @Param('id') id: string,
        @Req() req: Request,
    ) {
        this.validateAdmin(adminSecret);

        const credentialCount = await this.prisma.expertCredential.count({
            where: { expertId: id },
        });
        if (credentialCount < 1) {
            throw new BadRequestException(
                'Cannot approve expert without at least one uploaded credential. Reject and ask the expert to re-submit with documents.',
            );
        }

        const expert = await this.prisma.expertProfile.update({
            where: { id },
            data: {
                isPublished: true,
                isVerified: true,
                isActive: true,
                verifiedAt: new Date(),
                rejectedAt: null,
                rejectionReason: null,
            },
        });
        await this.expertsService.ensureAccessCodeForExpert(id);
        await this.writeAudit('approve_expert', 'expert', id, null, req);

        // Approve all pending credentials
        await this.prisma.expertCredential.updateMany({
            where: { expertId: id, status: 'pending' },
            data: { status: 'approved' },
        });

        // Send push notification (localized)
        const APPROVE_TITLE: Record<string, string> = {
            en: 'Profile Approved!', ru: 'Профиль одобрен!', kk: 'Профиль мақұлданды!',
            fr: 'Profil approuvé !', de: 'Profil genehmigt!', es: '¡Perfil aprobado!',
        };
        const APPROVE_BODY: Record<string, string> = {
            en: 'Your expert profile has been approved and is now visible to clients.',
            ru: 'Ваш профиль эксперта одобрен и теперь виден клиентам.',
            kk: 'Сарапшы профиліңіз мақұлданып, енді клиенттерге көрінеді.',
            fr: 'Votre profil d\'expert a été approuvé et est désormais visible par les clients.',
            de: 'Ihr Expertenprofil wurde genehmigt und ist jetzt für Kunden sichtbar.',
            es: 'Tu perfil de experto ha sido aprobado y ahora es visible para los clientes.',
        };
        const lang = await this.getUserLanguage(expert.userId);
        this.notifications.sendPushNotification(
            expert.userId,
            APPROVE_TITLE[lang] || APPROVE_TITLE.en,
            APPROVE_BODY[lang] || APPROVE_BODY.en,
            { type: 'expert_approved' },
        ).catch((err) => this.logger.error(`Push failed: ${err.message}`));

        this.logger.log(`Expert approved: id=${id}`);
        return { success: true, expert };
    }

    @Post(':id/reject')
    async reject(
        @Headers('x-admin-secret') adminSecret: string,
        @Param('id') id: string,
        @Body() body: { reason?: string },
        @Req() req?: Request,
    ) {
        this.validateAdmin(adminSecret);

        const expert = await this.prisma.expertProfile.update({
            where: { id },
            data: {
                isPublished: false,
                isVerified: false,
                isActive: false,
                rejectedAt: new Date(),
                rejectionReason: body.reason ?? null,
            },
        });
        await this.writeAudit('reject_expert', 'expert', id, { reason: body.reason ?? null }, req);

        // Reject all credentials that aren't already rejected — including those
        // auto-approved by manual creation. Expert is rejected, so no docs are valid.
        await this.prisma.expertCredential.updateMany({
            where: { expertId: id, status: { in: ['pending', 'approved'] } },
            data: { status: 'rejected' },
        });

        // Send push notification (localized)
        const REJECT_TITLE: Record<string, string> = {
            en: 'Profile Not Approved', ru: 'Профиль не одобрен', kk: 'Профиль мақұлданбады',
            fr: 'Profil non approuvé', de: 'Profil nicht genehmigt', es: 'Perfil no aprobado',
        };
        const REJECT_BODY_NO_REASON: Record<string, string> = {
            en: 'Your expert profile was not approved. Please review your profile and try again.',
            ru: 'Ваш профиль эксперта не был одобрен. Проверьте профиль и попробуйте снова.',
            kk: 'Сарапшы профиліңіз мақұлданбады. Профиліңізді тексеріп, қайта көріңіз.',
            fr: 'Votre profil d\'expert n\'a pas été approuvé. Vérifiez votre profil et réessayez.',
            de: 'Ihr Expertenprofil wurde nicht genehmigt. Bitte prüfen Sie Ihr Profil und versuchen Sie es erneut.',
            es: 'Tu perfil de experto no fue aprobado. Revisa tu perfil e inténtalo de nuevo.',
        };
        const REJECT_BODY_WITH_REASON: Record<string, string> = {
            en: 'Your expert profile was not approved. Reason: ',
            ru: 'Ваш профиль эксперта не был одобрен. Причина: ',
            kk: 'Сарапшы профиліңіз мақұлданбады. Себеп: ',
            fr: 'Votre profil d\'expert n\'a pas été approuvé. Raison : ',
            de: 'Ihr Expertenprofil wurde nicht genehmigt. Grund: ',
            es: 'Tu perfil de experto no fue aprobado. Motivo: ',
        };
        const lang = await this.getUserLanguage(expert.userId);
        const pushBody = body.reason
            ? (REJECT_BODY_WITH_REASON[lang] || REJECT_BODY_WITH_REASON.en) + body.reason
            : (REJECT_BODY_NO_REASON[lang] || REJECT_BODY_NO_REASON.en);

        this.notifications.sendPushNotification(
            expert.userId,
            REJECT_TITLE[lang] || REJECT_TITLE.en,
            pushBody,
            { type: 'expert_rejected', reason: body.reason },
        ).catch((err) => this.logger.error(`Push failed: ${err.message}`));

        this.logger.log(`Expert rejected: id=${id}, reason=${body.reason}`);
        return { success: true, expert };
    }

    @Post(':id/unpublish')
    async unpublish(
        @Headers('x-admin-secret') adminSecret: string,
        @Param('id') id: string,
        @Req() req: Request,
    ) {
        this.validateAdmin(adminSecret);

        const expert = await this.prisma.expertProfile.update({
            where: { id },
            data: { isPublished: false },
        });
        await this.writeAudit('unpublish_expert', 'expert', id, null, req);

        this.logger.log(`Expert unpublished: id=${id}`);
        return { success: true, expert };
    }

    @Post(':id/publish')
    async publish(
        @Headers('x-admin-secret') adminSecret: string,
        @Param('id') id: string,
        @Req() req: Request,
    ) {
        this.validateAdmin(adminSecret);

        const credentialCount = await this.prisma.expertCredential.count({
            where: { expertId: id },
        });
        if (credentialCount < 1) {
            throw new BadRequestException(
                'Cannot publish expert without at least one uploaded credential.',
            );
        }

        const expert = await this.prisma.expertProfile.update({
            where: { id },
            data: { isPublished: true, isActive: true },
        });
        await this.expertsService.ensureAccessCodeForExpert(id);
        await this.writeAudit('publish_expert', 'expert', id, null, req);

        this.logger.log(`Expert re-published: id=${id}`);
        return { success: true, expert };
    }

    @Patch(':id/notes')
    async updateNotes(
        @Headers('x-admin-secret') adminSecret: string,
        @Param('id') id: string,
        @Body() body: AdminUpdateNotesDto,
        @Req() req: Request,
    ) {
        this.validateAdmin(adminSecret);
        const expert = await this.prisma.expertProfile.update({
            where: { id },
            data: { adminNotes: body.notes ?? null },
        });
        await this.writeAudit('update_notes', 'expert', id, { notes: body.notes ?? null }, req);
        return { success: true, expert };
    }

    @Post()
    async createExpertManually(
        @Headers('x-admin-secret') adminSecret: string,
        @Body() body: AdminCreateExpertDto & { credentials?: any[]; educationEntries?: any[] },
        @Req() req: Request,
    ) {
        this.validateAdmin(adminSecret);
        const {
            email,
            firstName,
            lastName,
            displayName,
            type,
            bio,
            country,
            city,
            timezone,
            phone,
            licenseNumber,
            education,
            educationEntries,
            experienceYears,
            specializations,
            languages,
            accessCode,
            avatarUrl,
        } = body || {};

        if (!email || !type || !displayName) {
            throw new BadRequestException('email, type and displayName are required');
        }
        const normalizedEmail = String(email).trim().toLowerCase();

        // Validate custom access code if provided
        let codeOverride: string | undefined;
        if (accessCode) {
            const normalized = String(accessCode).trim().toUpperCase();
            if (!/^[A-Z0-9-]{4,32}$/.test(normalized) || normalized.startsWith('-') || normalized.endsWith('-') || normalized.includes('--')) {
                throw new BadRequestException('Invalid accessCode format. Use [A-Z0-9-] 4..32 chars, no leading/trailing/double "-".');
            }
            const existing = await this.prisma.expertAccessCode.findUnique({ where: { code: normalized } });
            if (existing) throw new BadRequestException('Access code already taken');
            codeOverride = normalized;
        }

        const result = await this.prisma.$transaction(async (tx) => {
            // Reuse existing user or create a new one (shell account, magic-link login).
            let user = await tx.user.findUnique({ where: { email: normalizedEmail } });
            if (!user) {
                user = await tx.user.create({
                    data: { email: normalizedEmail, expertsRole: 'EXPERT' as any },
                });
            } else if ((user as any).expertsRole !== 'EXPERT') {
                user = await tx.user.update({ where: { id: user.id }, data: { expertsRole: 'EXPERT' as any } });
            }

            // Upsert UserProfile (firstName/lastName)
            if (firstName || lastName) {
                await tx.userProfile.upsert({
                    where: { userId: user.id },
                    update: { firstName: firstName ?? undefined, lastName: lastName ?? undefined },
                    create: { userId: user.id, firstName: firstName ?? null, lastName: lastName ?? null },
                });
            }

            // Create ExpertProfile (or update if it somehow exists)
            const expert = await tx.expertProfile.upsert({
                where: { userId: user.id },
                update: {
                    type,
                    displayName,
                    bio: bio ?? null,
                    avatarUrl: avatarUrl ?? null,
                    education: education ?? null,
                    experienceYears: experienceYears ?? 0,
                    specializations: Array.isArray(specializations) ? specializations : [],
                    languages: Array.isArray(languages) && languages.length ? languages : ['en'],
                    country: country ?? null,
                    city: city ?? null,
                    timezone: timezone ?? null,
                    phone: phone ?? null,
                    licenseNumber: licenseNumber ?? null,
                    isActive: true,
                    isPublished: true,
                    isVerified: true,
                    verifiedAt: new Date(),
                },
                create: {
                    userId: user.id,
                    type,
                    displayName,
                    bio: bio ?? null,
                    avatarUrl: avatarUrl ?? null,
                    education: education ?? null,
                    experienceYears: experienceYears ?? 0,
                    specializations: Array.isArray(specializations) ? specializations : [],
                    languages: Array.isArray(languages) && languages.length ? languages : ['en'],
                    country: country ?? null,
                    city: city ?? null,
                    timezone: timezone ?? null,
                    phone: phone ?? null,
                    licenseNumber: licenseNumber ?? null,
                    isActive: true,
                    isPublished: true,
                    isVerified: true,
                    verifiedAt: new Date(),
                },
            });

            // Education entries (optional)
            if (Array.isArray(educationEntries) && educationEntries.length) {
                for (const e of educationEntries) {
                    if (!e?.institution || !e?.degree) continue;
                    await tx.expertEducation.create({
                        data: {
                            expertId: expert.id,
                            institution: e.institution,
                            degree: e.degree,
                            year: e.year ? String(e.year) : null,
                            documentUrl: e.documentUrl ?? null,
                            documentType: e.documentType ?? null,
                            documentName: e.documentName ?? null,
                        },
                    }).catch(() => {});
                }
            }

            return { user, expert };
        });

        // Assign access code (custom or auto)
        const code = codeOverride
            ? await this.prisma.expertAccessCode.create({
                  data: { expertId: result.expert.id, code: codeOverride },
              })
            : await this.expertsService.ensureAccessCodeForExpert(result.expert.id);

        // Upload credentials (optional). Each item: { name, issuer?, issuedAt?, base64, mimeType, filename }
        const credentials = Array.isArray(body?.credentials) ? body.credentials : [];
        const uploadedCredentials: any[] = [];
        for (const cred of credentials) {
            if (!cred?.base64 || !cred?.name) continue;
            try {
                const mimeType = String(cred.mimeType || 'application/pdf');
                if (!/^(application\/pdf|image\/(png|jpeg|jpg))$/.test(mimeType)) {
                    this.logger.warn(`Skipping credential with unsupported mime: ${mimeType}`);
                    continue;
                }
                // Strip data URL prefix if present.
                const b64 = cred.base64.replace(/^data:[^;]+;base64,/, '');
                // Pre-decode size check (each base64 char ≈ 0.75 bytes). 20MB
                // encoded ≈ 15MB decoded — reject before allocating Buffer.
                if (b64.length > 20 * 1024 * 1024) {
                    this.logger.warn(`Skipping credential — base64 payload >20MB: ${cred.name}`);
                    continue;
                }
                const buf = Buffer.from(b64, 'base64');
                if (buf.length > 15 * 1024 * 1024) {
                    this.logger.warn(`Skipping credential >15MB: ${cred.name}`);
                    continue;
                }
                const synthetic: any = {
                    buffer: buf,
                    originalname: String(cred.filename || `${cred.name}.${mimeType === 'application/pdf' ? 'pdf' : 'jpg'}`),
                    mimetype: mimeType,
                    size: buf.length,
                };
                const uploaded = await this.media.uploadDocument(synthetic, result.user.id);
                const created = await this.prisma.expertCredential.create({
                    data: {
                        expertId: result.expert.id,
                        name: cred.name,
                        issuer: cred.issuer ?? null,
                        issuedAt: cred.issuedAt ? new Date(cred.issuedAt) : null,
                        fileUrl: uploaded.url,
                        fileType: mimeType === 'application/pdf' ? 'pdf' : 'image',
                        status: 'approved',
                    },
                });
                uploadedCredentials.push(created);
            } catch (err: any) {
                this.logger.warn(`Failed to attach credential "${cred.name}": ${err?.message}`);
            }
        }

        await this.writeAudit('create_expert_manual', 'expert', result.expert.id, { email: normalizedEmail, credentialCount: uploadedCredentials.length }, req);
        this.logger.log(`Expert created manually: id=${result.expert.id} email=${normalizedEmail} code=${(code as any)?.code}`);

        // Auto-send a welcome magic-link so the expert can log into the portal
        // immediately, without the admin having to message them out-of-band.
        const magicLinkResult = await this.auth.sendInitialExpertMagicLink(result.user.id).catch((err) => {
            this.logger.warn(`Magic-link send failed for expert=${result.expert.id}: ${err?.message}`);
            return { sent: false };
        });

        return {
            success: true,
            expert: result.expert,
            user: { id: result.user.id, email: result.user.email },
            accessCode: (code as any)?.code,
            credentials: uploadedCredentials.length,
            magicLinkSent: magicLinkResult?.sent ?? false,
        };
    }

    @Get('access-code/suggest')
    async suggestAccessCode(
        @Headers('x-admin-secret') adminSecret: string,
        @Query('firstName') firstName?: string,
        @Query('lastName') lastName?: string,
        @Query('type') type?: string,
        @Query('city') city?: string,
    ) {
        this.validateAdmin(adminSecret);
        const translitMap: Record<string, string> = {
            А: 'A', Б: 'B', В: 'V', Г: 'G', Д: 'D', Е: 'E', Ё: 'E', Ж: 'ZH', З: 'Z', И: 'I', Й: 'Y', К: 'K', Л: 'L', М: 'M', Н: 'N', О: 'O', П: 'P', Р: 'R', С: 'S', Т: 'T', У: 'U', Ф: 'F', Х: 'KH', Ц: 'TS', Ч: 'CH', Ш: 'SH', Щ: 'SCH', Ъ: '', Ы: 'Y', Ь: '', Э: 'E', Ю: 'YU', Я: 'YA',
            Ә: 'A', Ғ: 'G', Қ: 'K', Ң: 'N', Ө: 'O', Ұ: 'U', Ү: 'U', Һ: 'H', І: 'I',
        };
        const translit = (s?: string) => String(s || '').replace(/[А-ЯЁӘҒҚҢӨҰҮҺІ]/gi, (ch) => translitMap[ch.toUpperCase()] ?? '');
        const slug = (s?: string) => translit(s).toUpperCase().replace(/[^A-Z0-9]/g, '');
        const fn = slug(firstName);
        const ln = slug(lastName);
        const ty = slug(type);
        const ci = slug(city);
        const candidates: string[] = [];
        if (fn && ty) candidates.push(`${fn}-${ty}`);
        if (fn && ci) candidates.push(`${fn}-${ci}-01`);
        if (fn && ln) candidates.push(`${fn}-${ln}`);
        if (fn) candidates.push(fn);
        const results = await Promise.all(
            candidates.map(async (c) => {
                if (!/^[A-Z0-9-]{4,32}$/.test(c)) return null;
                const exists = await this.prisma.expertAccessCode.findUnique({ where: { code: c } });
                return exists ? null : c;
            }),
        );
        return { suggestions: results.filter(Boolean) };
    }

    @Post('access-code/check')
    async checkAccessCodeAvailability(
        @Headers('x-admin-secret') adminSecret: string,
        @Body() body: { code?: string },
    ) {
        this.validateAdmin(adminSecret);
        const raw = String(body?.code || '').trim().toUpperCase();
        if (!/^[A-Z0-9-]{4,32}$/.test(raw) || raw.startsWith('-') || raw.endsWith('-') || raw.includes('--')) {
            return { available: false, reason: 'invalid_format' };
        }
        const existing = await this.prisma.expertAccessCode.findUnique({ where: { code: raw } });
        return { available: !existing, code: raw };
    }

}
