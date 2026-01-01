// ============================================================
// ДОБАВИТЬ В apps/api/app.module.ts
// ============================================================

// 1. Добавить импорты после строки 36 (после MedicationsModule):

import { SpecialistsModule } from './specialists/specialists.module';
import { ConsultationsModule } from './consultations/consultations.module';
import { MessagesModule } from './messages/messages.module';
import { ReviewsModule } from './reviews/reviews.module';
import { DietProgramsModule } from './diet-programs/diet-programs.module';
import { ReferralsModule } from './referrals/referrals.module';

// 2. Добавить модули в массив imports (после MedicationsModule, строка ~103):

    SpecialistsModule,
    ConsultationsModule,
    MessagesModule,
    ReviewsModule,
    DietProgramsModule,
    ReferralsModule,
