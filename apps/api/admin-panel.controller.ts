import { Controller, Get, Res, Header } from '@nestjs/common';
import { Response } from 'express';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

/**
 * Serves the admin panel HTML at GET /admin
 * No JWT required — the panel itself authenticates via ADMIN_SECRET header
 */
@Controller('admin')
export class AdminPanelController {
  private adminHtml: string;

  constructor() {
    // Try multiple paths: works in both dev (ts-node) and prod (compiled dist/)
    const candidates = [
      join(__dirname, '..', 'admin', 'index.html'),        // dev: src/ -> admin/
      join(__dirname, '..', '..', 'admin', 'index.html'),   // prod: dist/ -> api/ -> apps/admin/
      join(process.cwd(), 'apps', 'admin', 'index.html'),   // fallback: cwd-based
    ];

    this.adminHtml = '<html><body><h1>Admin panel file not found</h1></body></html>';
    for (const path of candidates) {
      if (existsSync(path)) {
        this.adminHtml = readFileSync(path, 'utf-8');
        break;
      }
    }
  }

  @Get()
  @Header('Content-Type', 'text/html')
  getAdminPanel(@Res() res: Response) {
    res.send(this.adminHtml);
  }
}
