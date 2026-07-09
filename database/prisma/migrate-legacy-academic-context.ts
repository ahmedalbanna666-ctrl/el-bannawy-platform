import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "..", "..", ".env") });

import { PrismaClient } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";

const prisma = new PrismaClient();

const DRY_RUN = process.argv.includes("--dry-run");
const ALLOW_SEED = process.argv.includes("--allow-seed");

interface LegacyUser {
  id: string;
  fullName: string;
  role: string;
  educationalSystem: string | null;
  educationalStage: string | null;
  grade: string | null;
  academicTerm: string | null;
  gradeId: string | null;
  academicYearId: string | null;
  termId: string | null;
}

interface MigrationResult {
  processed: number;
  migrated: number;
  alreadyValid: { id: string; name: string }[];
  invalidExisting: { id: string; name: string; reason: string }[];
  skipped: { id: string; name: string; reason: string }[];
  invalid: { id: string; name: string; fields: string[] }[];
  noLegacyData: { id: string; name: string }[];
  needsManualSystem: { id: string; name: string; fields: string[] }[];
  partialContext: { id: string; name: string; fields: string[] }[];
  prerequisiteFailures: string[];
}

const EGYPTIAN_GRADES: Record<string, string[]> = {
  PRIMARY: [
    "الصف الأول الابتدائي",
    "الصف الثاني الابتدائي",
    "الصف الثالث الابتدائي",
    "الصف الرابع الابتدائي",
    "الصف الخامس الابتدائي",
    "الصف السادس الابتدائي",
  ],
  PREPARATORY: [
    "الصف الأول الإعدادي",
    "الصف الثاني الإعدادي",
    "الصف الثالث الإعدادي",
  ],
  SECONDARY: [
    "الصف الأول الثانوي",
    "الصف الثاني الثانوي",
    "الصف الثالث الثانوي",
  ],
};

const STAGE_ALIASES: Record<string, string> = {
  "PRIMARY": "PRIMARY",
  "primary": "PRIMARY",
  "PREPARATORY": "PREPARATORY",
  "preparatory": "PREPARATORY",
  "SECONDARY": "SECONDARY",
  "secondary": "SECONDARY",
  "ابتدائي": "PRIMARY",
  "إعدادي": "PREPARATORY",
  "اعدادي": "PREPARATORY",
  "ثانوي": "SECONDARY",
};

const TERM_ALIASES: Record<string, string> = {
  "FIRST_TERM": "FIRST_TERM",
  "first_term": "FIRST_TERM",
  "SECOND_TERM": "SECOND_TERM",
  "second_term": "SECOND_TERM",
  "الترم الأول": "FIRST_TERM",
  "ترم اول": "FIRST_TERM",
  "الترم الثاني": "SECOND_TERM",
  "ترم ثاني": "SECOND_TERM",
};

function normalizeArabic(text: string): string {
  return text.trim().normalize("NFC");
}

function normalizeStage(raw: string | null): string | null {
  if (!raw) return null;
  const key = normalizeArabic(raw);
  if (!key) return null;
  const direct = STAGE_ALIASES[key];
  if (direct) return direct;
  const lower = key.toLowerCase();
  for (const [alias, resolved] of Object.entries(STAGE_ALIASES)) {
    if (normalizeArabic(alias).toLowerCase() === lower) return resolved;
  }
  return key;
}

function normalizeTerm(raw: string | null): string | null {
  if (!raw) return null;
  const key = normalizeArabic(raw);
  if (!key) return null;
  const direct = TERM_ALIASES[key];
  if (direct) return direct;
  const lower = key.toLowerCase();
  for (const [alias, resolved] of Object.entries(TERM_ALIASES)) {
    if (normalizeArabic(alias).toLowerCase() === lower) return resolved;
  }
  return null;
}

async function validateExistingFK(
  gradeId: string | null,
  academicYearId: string | null,
  termId: string | null,
): Promise<string[]> {
  const issues: string[] = [];

  if (gradeId) {
    const grade = await prisma.grade.findUnique({ where: { id: gradeId }, select: { id: true } });
    if (!grade) issues.push(`gradeId ${gradeId.slice(0, 8)}... does not reference an existing Grade`);
  }

  if (academicYearId) {
    const year = await prisma.academicYear.findUnique({ where: { id: academicYearId }, select: { id: true } });
    if (!year) issues.push(`academicYearId ${academicYearId.slice(0, 8)}... does not reference an existing AcademicYear`);
  }

  if (termId) {
    const term = await prisma.term.findUnique({ where: { id: termId }, select: { id: true, academicYearId: true } });
    if (!term) {
      issues.push(`termId ${termId.slice(0, 8)}... does not reference an existing Term`);
    } else if (academicYearId && term.academicYearId !== academicYearId) {
      issues.push(`termId belongs to a different AcademicYear than academicYearId`);
    }
  }

  return issues;
}

function validateCoherentContext(
  gradeId: string | null,
  academicYearId: string | null,
  termId: string | null,
): string[] {
  const missing: string[] = [];
  if (!gradeId) missing.push("gradeId");
  if (!academicYearId) missing.push("academicYearId");
  if (!termId) missing.push("termId");
  return missing;
}

function checkPrerequisites(
  activeCtx: { academicYearId: string | null; termId: string | null },
  stageCount: number,
  gradeCount: number,
): string[] {
  const issues: string[] = [];

  if (!activeCtx.academicYearId) {
    issues.push("No active academic year found. SystemSetting 'active_academic_year_id' is missing and no AcademicYear records exist.");
  }
  if (!activeCtx.termId) {
    issues.push("No active term found. SystemSetting 'active_term_id' is missing and no Term records exist.");
  }
  if (stageCount === 0) {
    issues.push("No Stage records exist. Stages are required to map legacy educationalStage values.");
  }
  if (gradeCount === 0) {
    issues.push("No Grade records exist. Grades are required to map legacy grade values.");
  }

  return issues;
}

async function seedPrerequisites(): Promise<Map<string, Map<string, string>>> {
  const result = new Map<string, Map<string, string>>();

  const academicYears = await prisma.academicYear.findMany({ orderBy: { createdAt: "asc" } });
  let academicYearId = academicYears[0]?.id;

  const existingStages = await prisma.stage.findMany({ select: { id: true, name: true } });

  for (const [stageName, gradeNames] of Object.entries(EGYPTIAN_GRADES)) {
    let stage = existingStages.find((s) => s.name.toLowerCase() === stageName.toLowerCase());

    if (!stage) {
      if (DRY_RUN) {
        console.log(`  [DRY-RUN] Would create stage: ${stageName}`);
      } else {
        stage = await prisma.stage.create({
          data: { id: uuidv4(), name: stageName, displayOrder: existingStages.length + 1 },
        });
        existingStages.push(stage);
        console.log(`  Created stage: ${stageName} (${stage.id.slice(0, 8)}...)`);
      }
    }

    const stageId = stage?.id ?? "dry-run-placeholder";
    const gradeMap = new Map<string, string>();
    const existingGrades = stage?.id
      ? await prisma.grade.findMany({
          where: { stageId: stage.id },
          select: { id: true, name: true },
        })
      : [];

    for (let i = 0; i < gradeNames.length; i++) {
      const gradeName = gradeNames[i];
      const normalizedGradeName = normalizeArabic(gradeName);
      let grade = existingGrades.find((g) => normalizeArabic(g.name) === normalizedGradeName);

      if (!grade) {
        if (DRY_RUN) {
          console.log(`    [DRY-RUN] Would create grade: ${gradeName} in ${stageName}`);
          gradeMap.set(gradeName, "dry-run-grade-placeholder");
          continue;
        }
        grade = await prisma.grade.create({
          data: { id: uuidv4(), name: gradeName, displayOrder: i + 1, stageId },
        });
        console.log(`    Created grade: ${gradeName} in ${stageName}`);
      }

      gradeMap.set(gradeName, grade.id);
    }

    result.set(stageName.toLowerCase(), gradeMap);
  }

  if (!academicYearId) {
    if (DRY_RUN) {
      console.log("  [DRY-RUN] Would create academic year: 2025-2026 with 2 terms");
    } else {
      academicYearId = uuidv4();
      const yearName = "2025-2026";
      const term1Id = uuidv4();
      const term2Id = uuidv4();

      await prisma.academicYear.create({
        data: {
          id: academicYearId,
          name: yearName,
          displayOrder: 1,
          terms: {
            create: [
              { id: term1Id, name: "الترم الأول", displayOrder: 1, academicYearId },
              { id: term2Id, name: "الترم الثاني", displayOrder: 2, academicYearId },
            ],
          },
        },
      });
      console.log(`  Created academic year: ${yearName} with 2 terms`);
    }
  }

  if (!DRY_RUN && academicYearId) {
    await prisma.systemSetting.upsert({
      where: { key: "active_academic_year_id" },
      create: { key: "active_academic_year_id", value: academicYearId },
      update: {},
    });

    const firstTerm = await prisma.term.findFirst({
      where: { academicYearId },
      orderBy: { displayOrder: "asc" },
      select: { id: true },
    });

    if (firstTerm) {
      await prisma.systemSetting.upsert({
        where: { key: "active_term_id" },
        create: { key: "active_term_id", value: firstTerm.id },
        update: {},
      });
    }
  } else if (DRY_RUN) {
    console.log("  [DRY-RUN] Would upsert SystemSetting entries");
  }

  return result;
}

async function resolveGrade(
  educationalStage: string | null,
  grade: string | null,
  stageGradeMap: Map<string, Map<string, string>> | null,
): Promise<{ stageId: string | null; gradeId: string | null }> {
  if (!educationalStage || !grade) return { stageId: null, gradeId: null };

  const normalizedStage = normalizeStage(educationalStage);
  const stageKey = normalizedStage?.toLowerCase() ?? "";
  const normalizedGrade = normalizeArabic(grade);

  if (stageGradeMap && stageKey) {
    const gradeMap = stageGradeMap.get(stageKey);
    if (gradeMap) {
      const gradeId = gradeMap.get(normalizedGrade);
      if (gradeId && gradeId !== "dry-run-grade-placeholder") return { gradeId, stageId: null };
    }
  }

  const stages = await prisma.stage.findMany({
    where: { name: { equals: educationalStage, mode: "insensitive" } },
    select: { id: true },
  });

  if (stages.length === 0 && normalizedStage) {
    const aliasStages = await prisma.stage.findMany({
      where: { name: { equals: normalizedStage, mode: "insensitive" } },
      select: { id: true },
    });
    if (aliasStages.length === 1) {
      const matches = await prisma.grade.findMany({
        where: { name: { equals: grade, mode: "insensitive" }, stageId: aliasStages[0].id },
        select: { id: true },
      });
      if (matches.length === 1) return { stageId: aliasStages[0].id, gradeId: matches[0].id };
    }
    return { stageId: null, gradeId: null };
  }

  if (stages.length === 0) return { stageId: null, gradeId: null };
  if (stages.length > 1) return { stageId: null, gradeId: null };

  const matches = await prisma.grade.findMany({
    where: { name: { equals: grade, mode: "insensitive" }, stageId: stages[0].id },
    select: { id: true },
  });

  if (matches.length === 0) return { stageId: stages[0].id, gradeId: null };
  if (matches.length > 1) return { stageId: stages[0].id, gradeId: null };

  return { stageId: stages[0].id, gradeId: matches[0].id };
}

async function resolveActiveContext(): Promise<{
  academicYearId: string | null;
  termId: string | null;
}> {
  const [activeYearSetting, activeTermSetting] = await Promise.all([
    prisma.systemSetting.findUnique({ where: { key: "active_academic_year_id" } }),
    prisma.systemSetting.findUnique({ where: { key: "active_term_id" } }),
  ]);

  const academicYearId = activeYearSetting?.value ?? null;
  const termId = activeTermSetting?.value ?? null;

  if (academicYearId && termId) {
    return { academicYearId, termId };
  }

  const activeYear = await prisma.academicYear.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
    select: { id: true, terms: { orderBy: { displayOrder: "asc" }, take: 1, select: { id: true } } },
  });

  if (activeYear) {
    return {
      academicYearId: activeYear.id,
      termId: activeYear.terms[0]?.id ?? null,
    };
  }

  const latestYear = await prisma.academicYear.findFirst({
    orderBy: { createdAt: "desc" },
    select: { id: true, terms: { orderBy: { displayOrder: "asc" }, take: 1, select: { id: true } } },
  });

  if (latestYear) {
    return {
      academicYearId: latestYear.id,
      termId: latestYear.terms[0]?.id ?? null,
    };
  }

  return { academicYearId: null, termId: null };
}

async function getTermId(
  academicYearId: string,
  academicTerm: string | null,
): Promise<string | null> {
  if (!academicTerm) return null;

  const normalized = normalizeTerm(academicTerm);
  if (!normalized) return null;

  const allTerms = await prisma.term.findMany({
    where: { academicYearId },
    orderBy: { displayOrder: "asc" },
    select: { id: true, displayOrder: true },
  });

  if (allTerms.length === 0) return null;

  if (allTerms.length !== 2) {
    console.log(`    [AMBIGUOUS] Academic year has ${allTerms.length} terms — cannot resolve FIRST_TERM/SECOND_TERM positionally`);
    return null;
  }

  if (normalized === "FIRST_TERM") {
    return allTerms[0].id;
  }

  if (normalized === "SECOND_TERM") {
    return allTerms[1].id;
  }

  return null;
}

async function main(): Promise<void> {
  if (DRY_RUN) {
    console.log("=== DRY-RUN MODE — Zero writes ===\n");
  }
  if (ALLOW_SEED) {
    console.log("=== SEED MODE — Prerequisites will be created if missing ===\n");
  }
  console.log("=== Legacy Academic Context Migration ===\n");

  console.log("--- Step 0: Prerequisite Validation ---");
  const activeCtx = await resolveActiveContext();
  const stageCount = await prisma.stage.count();
  const gradeCount = await prisma.grade.count();
  const prereqIssues = checkPrerequisites(activeCtx, stageCount, gradeCount);

  if (prereqIssues.length > 0) {
    if (!ALLOW_SEED) {
      console.log("\n  PREREQUISITE CHECK FAILED:");
      for (const issue of prereqIssues) {
        console.log(`  - ${issue}`);
      }
      console.log("\n  Re-run with --allow-seed to automatically create missing prerequisite data,");
      console.log("  or populate the database manually before running the migration.");
      console.log("");
      await prisma.$disconnect();
      process.exit(1);
    }
    console.log("  Prerequisites missing but --allow-seed enabled. Will create as needed.\n");
  } else {
    console.log("  All prerequisites satisfied.");
  }
  console.log(`  Active academic year: ${activeCtx.academicYearId ?? "NONE"}`);
  console.log(`  Active term: ${activeCtx.termId ?? "NONE"}`);
  console.log(`  Existing stages: ${stageCount}, grades: ${gradeCount}`);
  console.log("");

  console.log("--- Step 1: Ensure prerequisite structures ---");
  const stageGradeMap = ALLOW_SEED || DRY_RUN ? await seedPrerequisites() : new Map<string, Map<string, string>>();
  console.log("");

  console.log("--- Step 2: Identify all students ---");
  const allStudents = await prisma.user.findMany({
    where: { role: "STUDENT", deletedAt: null },
    select: {
      id: true,
      fullName: true,
      role: true,
      educationalSystem: true,
      educationalStage: true,
      grade: true,
      academicTerm: true,
      gradeId: true,
      academicYearId: true,
      termId: true,
    },
    orderBy: { createdAt: "asc" },
  });

  const fullyPopulated = allStudents.filter(
    (u) => u.gradeId && u.academicYearId && u.termId,
  );
  const legacyUsers = allStudents.filter(
    (u) => !u.gradeId || !u.academicYearId || !u.termId,
  ) as LegacyUser[];

  console.log(`Total students: ${allStudents.length}`);
  console.log(`Already fully populated: ${fullyPopulated.length}`);
  console.log(`Legacy users (incomplete context): ${legacyUsers.length}\n`);

  const result: MigrationResult = {
    processed: 0,
    migrated: 0,
    alreadyValid: [],
    invalidExisting: [],
    skipped: [],
    invalid: [],
    noLegacyData: [],
    needsManualSystem: [],
    partialContext: [],
    prerequisiteFailures: [],
  };

  console.log("--- Step 3: Validate already-populated users ---");
  for (const u of fullyPopulated) {
    const fkIssues = await validateExistingFK(u.gradeId, u.academicYearId, u.termId);
    if (fkIssues.length === 0) {
      result.alreadyValid.push({ id: u.id, name: u.fullName });
    } else {
      result.invalidExisting.push({
        id: u.id,
        name: u.fullName,
        reason: fkIssues.join("; "),
      });
      console.log(`  [INVALID EXISTING] ${u.fullName} — ${fkIssues.join("; ")}`);
    }
  }
  console.log(`  Valid fully-populated: ${result.alreadyValid.length}`);
  console.log(`  Invalid fully-populated: ${result.invalidExisting.length}\n`);

  if (legacyUsers.length === 0) {
    console.log("No legacy users to migrate.");
    printReport(result, allStudents.length);
    await prisma.$disconnect();
    return;
  }

  console.log("--- Step 4: Migrate legacy users ---\n");

  for (const user of legacyUsers) {
    result.processed++;
    const invalidFields: string[] = [];

    if (!user.educationalSystem) invalidFields.push("educationalSystem");
    if (!user.educationalStage) invalidFields.push("educationalStage");
    if (!user.grade) invalidFields.push("grade");

    const hasPartialFK =
      (user.gradeId && !user.academicYearId) ||
      (user.gradeId && !user.termId) ||
      (user.academicYearId && !user.gradeId) ||
      (user.academicYearId && !user.termId) ||
      (user.termId && !user.gradeId) ||
      (user.termId && !user.academicYearId);

    if (hasPartialFK) {
      const fkIssues = await validateExistingFK(user.gradeId, user.academicYearId, user.termId);
      if (fkIssues.length > 0) {
        result.invalidExisting.push({
          id: user.id,
          name: user.fullName,
          reason: `Partial FK context with invalid references: ${fkIssues.join("; ")}`,
        });
        console.log(`  [INVALID EXISTING] ${user.fullName} — ${fkIssues.join("; ")}`);
        continue;
      }
    }

    if (hasPartialFK && invalidFields.length === 0) {
      const missing: string[] = [];
      if (!user.gradeId) missing.push("gradeId");
      if (!user.academicYearId) missing.push("academicYearId");
      if (!user.termId) missing.push("termId");
      result.partialContext.push({
        id: user.id,
        name: user.fullName,
        fields: missing,
      });
      console.log(`  [PARTIAL] ${user.fullName} — Has some FK context but missing: ${missing.join(", ")}. Will backfill missing fields.`);
    }

    if (invalidFields.length > 0) {
      if (!user.educationalStage && !user.grade && !user.educationalSystem) {
        result.noLegacyData.push({ id: user.id, name: user.fullName });
        console.log(`  [NO DATA] ${user.fullName} — No legacy academic data`);
        continue;
      }
      if (!user.educationalSystem && user.educationalStage && user.grade) {
        result.needsManualSystem.push({ id: user.id, name: user.fullName, fields: invalidFields });
        console.log(`  [NEEDS SYSTEM] ${user.fullName} — Requires manual educational system assignment`);
        continue;
      }
      result.invalid.push({ id: user.id, name: user.fullName, fields: invalidFields });
      console.log(`  [INVALID] ${user.fullName} — Missing: ${invalidFields.join(", ")}`);
      continue;
    }

    const gradeIds = user.gradeId
      ? { gradeId: user.gradeId, stageId: null as string | null }
      : await resolveGrade(user.educationalStage, user.grade, stageGradeMap);

    if (!gradeIds.gradeId && !user.gradeId) {
      const stages = await prisma.stage.findMany({
        where: { name: { equals: user.educationalStage!, mode: "insensitive" } },
        select: { id: true, name: true },
      });
      if (stages.length === 0) {
        const normalized = normalizeStage(user.educationalStage);
        if (normalized && normalized !== user.educationalStage) {
          const aliasResult = await resolveGrade(normalized, user.grade, stageGradeMap);
          if (aliasResult.gradeId) {
            gradeIds.gradeId = aliasResult.gradeId;
          } else {
            result.skipped.push({
              id: user.id,
              name: user.fullName,
              reason: `No matching stage for "${user.educationalStage}" (normalized to "${normalized}")`,
            });
            console.log(`  [SKIPPED] ${user.fullName} — stage "${user.educationalStage}" not found`);
            continue;
          }
        } else {
          result.skipped.push({
            id: user.id,
            name: user.fullName,
            reason: `No matching stage for "${user.educationalStage}"`,
          });
          console.log(`  [SKIPPED] ${user.fullName} — stage "${user.educationalStage}" not found`);
          continue;
        }
      } else if (stages.length > 1) {
        result.skipped.push({
          id: user.id,
          name: user.fullName,
          reason: `Ambiguous stage: ${stages.length} stages match "${user.educationalStage}"`,
        });
        console.log(`  [SKIPPED] ${user.fullName} — ambiguous stage "${user.educationalStage}"`);
        continue;
      } else {
        result.skipped.push({
          id: user.id,
          name: user.fullName,
          reason: `No matching grade for "${user.grade}" in stage "${user.educationalStage}"`,
        });
        console.log(`  [SKIPPED] ${user.fullName} — grade "${user.grade}" not found in "${user.educationalStage}"`);
        continue;
      }
    }

    const finalGradeId = gradeIds.gradeId ?? user.gradeId;
    const finalAcademicYearId = user.academicYearId ?? activeCtx.academicYearId;
    const resolvedTermId = await getTermId(
      finalAcademicYearId ?? "",
      user.academicTerm,
    );
    const hasLegacyTerm = typeof user.academicTerm === "string" && user.academicTerm.trim().length > 0;
    const finalTermId = user.termId
      ?? resolvedTermId
      ?? (hasLegacyTerm ? null : activeCtx.termId);

    const missingContext = validateCoherentContext(finalGradeId, finalAcademicYearId, finalTermId);
    if (missingContext.length > 0) {
      result.skipped.push({
        id: user.id,
        name: user.fullName,
        reason: `Cannot resolve: ${missingContext.join(", ")}`,
      });
      console.log(`  [SKIPPED] ${user.fullName} — Cannot resolve: ${missingContext.join(", ")}`);
      continue;
    }

    if (user.termId && user.academicYearId && finalTermId !== user.termId) {
      result.skipped.push({
        id: user.id,
        name: user.fullName,
        reason: `Existing termId would be overwritten (${user.termId.slice(0, 8)}... → ${finalTermId.slice(0, 8)}...)`,
      });
      console.log(`  [SKIPPED] ${user.fullName} — termId conflict`);
      continue;
    }

    if (user.gradeId && finalGradeId !== user.gradeId) {
      result.skipped.push({
        id: user.id,
        name: user.fullName,
        reason: `Existing gradeId would be overwritten`,
      });
      console.log(`  [SKIPPED] ${user.fullName} — gradeId conflict`);
      continue;
    }

    if (user.academicYearId && finalAcademicYearId !== user.academicYearId) {
      result.skipped.push({
        id: user.id,
        name: user.fullName,
        reason: `Existing academicYearId would be overwritten`,
      });
      console.log(`  [SKIPPED] ${user.fullName} — academicYearId conflict`);
      continue;
    }

    if (DRY_RUN) {
      console.log(`  [DRY-RUN] Would update ${user.fullName}: gradeId=${finalGradeId.slice(0, 8)}... academicYearId=${finalAcademicYearId.slice(0, 8)}... termId=${finalTermId.slice(0, 8)}...`);
    } else {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          gradeId: finalGradeId,
          academicYearId: finalAcademicYearId,
          termId: finalTermId,
        },
      });
    }

    result.migrated++;
    const termSrc = user.termId
      ? "(existing)"
      : resolvedTermId
        ? `(from legacy: ${user.academicTerm ?? "N/A"})`
        : "(fallback)";
    const gradeSrc = user.gradeId ? "(existing)" : "(from legacy)";
    const yearSrc = user.academicYearId ? "(existing)" : "(from SystemSetting)";
    console.log(
      `  [MIGRATED] ${user.fullName} → grade ${gradeSrc}, year ${yearSrc}, term ${termSrc}`,
    );
  }

  printReport(result, allStudents.length);
}

function printReport(result: MigrationResult, totalStudents: number): void {
  console.log("\n=== Migration Report ===\n");
  console.log(`Total students:     ${totalStudents}`);
  console.log(`Already valid:      ${result.alreadyValid.length}`);
  console.log(`Invalid existing:   ${result.invalidExisting.length}`);
  console.log(`Users processed:    ${result.processed}`);
  console.log(`Users migrated:     ${result.migrated}`);
  console.log(`Users skipped:      ${result.skipped.length}`);
  console.log(`No legacy data:     ${result.noLegacyData.length}`);
  console.log(`Needs manual sys:   ${result.needsManualSystem.length}`);
  console.log(`Partial context:    ${result.partialContext.length}`);
  console.log(`Users invalid:      ${result.invalid.length}\n`);

  if (result.alreadyValid.length > 0) {
    console.log(`--- Already Valid (${result.alreadyValid.length} users) ---`);
    console.log("  These users have complete and valid academic context. No action needed.\n");
  }

  if (result.invalidExisting.length > 0) {
    console.log("--- Invalid Existing Context (MANUAL REMEDIATION REQUIRED) ---");
    console.log("  These users have populated FK fields with invalid references.");
    console.log("  An administrator must fix these records manually.\n");
    for (const inv of result.invalidExisting) {
      console.log(`  ${inv.name} (${inv.id}) — ${inv.reason}`);
    }
    console.log("");
  }

  if (result.skipped.length > 0) {
    console.log("--- Skipped (Cannot resolve) ---");
    for (const s of result.skipped) {
      console.log(`  ${s.name} (${s.id}) — ${s.reason}`);
    }
    console.log("");
  }

  if (result.noLegacyData.length > 0) {
    console.log("--- No Legacy Academic Data (Skipped) ---");
    console.log("  These accounts have no legacy academic fields. The account should complete");
    console.log("  its academic context on the next profile completion or login flow.\n");
    for (const n of result.noLegacyData) {
      console.log(`  ${n.name} (${n.id})`);
    }
    console.log("");
  }

  if (result.needsManualSystem.length > 0) {
    console.log("--- Requires Manual Educational System Assignment ---");
    console.log("  These users have stage/grade resolved but missing educationalSystem.");
    console.log("  An administrator must assign the educational system manually.\n");
    for (const n of result.needsManualSystem) {
      console.log(`  ${n.name} (${n.id}) — has educationalStage + grade, missing educationalSystem`);
    }
    console.log("");
  }

  if (result.partialContext.length > 0) {
    console.log("--- Partial FK Context (Backfilled) ---");
    console.log("  These users had some new FK fields populated but not all.");
    console.log("  Missing fields were backfilled from legacy data or SystemSettings.\n");
    for (const p of result.partialContext) {
      console.log(`  ${p.name} (${p.id}) — had some context, missing: ${p.fields.join(", ")}`);
    }
    console.log("");
  }

  if (result.invalid.length > 0) {
    console.log("--- Invalid Legacy Data ---");
    for (const inv of result.invalid) {
      console.log(`  ${inv.name} (${inv.id}) — missing: ${inv.fields.join(", ")}`);
    }
    console.log("");
  }

  console.log("=== Post-Migration Validation ===\n");
  prisma.user.findMany({
    where: {
      role: "STUDENT",
      deletedAt: null,
      OR: [{ gradeId: null }, { academicYearId: null }, { termId: null }],
    },
    select: { id: true, fullName: true },
  }).then((remaining) => {
    console.log(`Students still with incomplete context: ${remaining.length}`);
    for (const r of remaining) {
      console.log(`  ${r.fullName} (${r.id})`);
    }
  });

  prisma.user.count({
    where: {
      role: "STUDENT",
      deletedAt: null,
      gradeId: { not: null },
      academicYearId: { not: null },
      termId: { not: null },
    },
  }).then((complete) => {
    console.log(`Students with COMPLETE academic context: ${complete} / ${totalStudents}`);
  });
}

main()
  .catch((e) => {
    console.error("Migration error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
