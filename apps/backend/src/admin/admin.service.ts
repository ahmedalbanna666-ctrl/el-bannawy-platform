import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { QueryTeachersDto } from "./dto/query-teachers.dto";
import { CreateTeacherDto } from "./dto/create-teacher.dto";
import { UpdateTeacherDto } from "./dto/update-teacher.dto";
import { UpdateTeacherStatusDto } from "./dto/update-teacher-status.dto";
import { AssignGradesDto } from "./dto/assign-grades.dto";
import { UpdateSettingsDto } from "./dto/update-settings.dto";
import { CreateAcademicYearDto } from "./dto/create-academic-year.dto";
import { UpdateAcademicYearDto } from "./dto/update-academic-year.dto";
import { CreateTermDto } from "./dto/create-term.dto";
import { UpdateTermDto } from "./dto/update-term.dto";
import { QueryStudentsDto } from "./dto/query-students.dto";
import { UpdateStudentDto } from "./dto/update-student.dto";
import { UpdateStudentPhoneDto } from "./dto/update-student-phone.dto";
import { ResetStudentPasswordDto } from "./dto/reset-student-password.dto";
import { CoinAdjustDto } from "./dto/coin-adjust.dto";
import { XpAdjustDto } from "./dto/xp-adjust.dto";
import * as bcrypt from "bcryptjs";

const TEACHER_SELECT = {
  id: true,
  fullName: true,
  englishName: true,
  email: true,
  mobileNumber: true,
  role: true,
  status: true,
  governorate: true,
  school: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
} as const;

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async listTeachers(query: QueryTeachersDto): Promise<unknown> {
    const { search, status, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { role: "TEACHER" };

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: "insensitive" } },
        { englishName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { mobileNumber: { contains: search, mode: "insensitive" } },
      ];
    }

    const [teachers, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          ...TEACHER_SELECT,
          teacherGrades: {
            include: {
              grade: {
                include: {
                  stage: {
                    select: { id: true, name: true },
                  },
                },
              },
            },
          },
          loginHistory: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { createdAt: true },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.user.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    const mapped = teachers.map((t) => ({
      id: t.id,
      fullName: t.fullName,
      englishName: t.englishName,
      email: t.email,
      mobileNumber: t.mobileNumber,
      role: t.role,
      status: t.status,
      governorate: t.governorate,
      school: t.school,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
      lastLogin: t.loginHistory[0]?.createdAt?.toISOString() ?? null,
      assignedGrades: t.teacherGrades.map((tg) => ({
        id: tg.grade.id,
        name: tg.grade.name,
        stage: { id: tg.grade.stage.id, name: tg.grade.stage.name },
      })),
    }));

    return {
      teachers: mapped,
      meta: { total, page, limit, totalPages },
    };
  }

  async getTeacher(id: string): Promise<unknown> {
    const t = await this.prisma.user.findFirst({
      where: { id, role: "TEACHER" },
      select: {
        ...TEACHER_SELECT,
        teacherGrades: {
          include: {
            grade: {
              include: {
                stage: {
                  select: { id: true, name: true },
                },
              },
            },
          },
        },
        loginHistory: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { createdAt: true },
        },
      },
    });

    if (!t) {
      throw new NotFoundException("Teacher not found");
    }

    return {
      id: t.id,
      fullName: t.fullName,
      englishName: t.englishName,
      email: t.email,
      mobileNumber: t.mobileNumber,
      role: t.role,
      status: t.status,
      governorate: t.governorate,
      school: t.school,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
      deletedAt: t.deletedAt?.toISOString() ?? null,
      lastLogin: t.loginHistory[0]?.createdAt?.toISOString() ?? null,
      assignedGrades: t.teacherGrades.map((tg) => ({
        id: tg.grade.id,
        name: tg.grade.name,
        stage: { id: tg.grade.stage.id, name: tg.grade.stage.name },
      })),
    };
  }

  async createTeacher(dto: CreateTeacherDto): Promise<unknown> {
    if (dto.email) {
      const existingEmail = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });
      if (existingEmail?.deletedAt === null) {
        throw new ConflictException("Email already exists");
      }
    }

    if (dto.mobileNumber) {
      const existingMobile = await this.prisma.user.findUnique({
        where: { mobileNumber: dto.mobileNumber },
      });
      if (existingMobile?.deletedAt === null) {
        throw new ConflictException("Mobile number already exists");
      }
    }

    const teacher = await this.prisma.user.create({
      data: {
        fullName: dto.fullName,
        englishName: dto.englishName,
        email: dto.email,
        mobileNumber: dto.mobileNumber,
        governorate: dto.governorate,
        school: dto.school,
        role: "TEACHER",
        status: "PENDING_VERIFICATION",
      },
      select: {
        id: true,
        fullName: true,
        englishName: true,
        email: true,
        mobileNumber: true,
        role: true,
        status: true,
        governorate: true,
        school: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return {
      ...teacher,
      createdAt: teacher.createdAt.toISOString(),
      updatedAt: teacher.updatedAt.toISOString(),
      lastLogin: null,
      assignedGrades: [],
    };
  }

  async updateTeacher(id: string, dto: UpdateTeacherDto): Promise<unknown> {
    const teacher = await this.prisma.user.findFirst({
      where: { id, role: "TEACHER", deletedAt: null },
    });
    if (!teacher) {
      throw new NotFoundException("Teacher not found");
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.fullName !== undefined && { fullName: dto.fullName }),
        ...(dto.englishName !== undefined && { englishName: dto.englishName }),
        ...(dto.governorate !== undefined && { governorate: dto.governorate }),
        ...(dto.school !== undefined && { school: dto.school }),
      },
    });

    return { id: updated.id };
  }

  async updateTeacherStatus(id: string, dto: UpdateTeacherStatusDto): Promise<unknown> {
    const teacher = await this.prisma.user.findFirst({
      where: { id, role: "TEACHER" },
    });
    if (!teacher) {
      throw new NotFoundException("Teacher not found");
    }

    const data: Record<string, unknown> = { status: dto.status };

    if (dto.status === "DELETED") {
      data.deletedAt = new Date();
    } else {
      data.deletedAt = null;
    }

    await this.prisma.user.update({ where: { id }, data });

    return { id };
  }

  async assignGrades(id: string, dto: AssignGradesDto): Promise<unknown> {
    const teacher = await this.prisma.user.findFirst({
      where: { id, role: "TEACHER", deletedAt: null },
    });
    if (!teacher) {
      throw new NotFoundException("Teacher not found");
    }

    const grades = await this.prisma.grade.findMany({
      where: { id: { in: dto.gradeIds } },
      select: { id: true },
    });
    const foundIds = new Set(grades.map((g) => g.id));
    const missing = dto.gradeIds.filter((gid) => !foundIds.has(gid));
    if (missing.length > 0) {
      throw new NotFoundException(
        `Grades not found: ${missing.join(", ")}`,
      );
    }

    await this.prisma.$transaction([
      this.prisma.teacherGrade.deleteMany({ where: { userId: id } }),
      this.prisma.teacherGrade.createMany({
        data: dto.gradeIds.map((gradeId) => ({ userId: id, gradeId })),
      }),
    ]);

    return { gradeIds: dto.gradeIds };
  }

  async listStages(): Promise<unknown> {
    const stages = await this.prisma.stage.findMany({
      orderBy: { displayOrder: "asc" },
      include: {
        grades: {
          orderBy: { displayOrder: "asc" },
          select: {
            id: true,
            name: true,
            displayOrder: true,
            _count: {
              select: { users: true },
            },
          },
        },
      },
    });

    return stages.map((s) => ({
      id: s.id,
      name: s.name,
      grades: s.grades.map((g) => ({
        id: g.id,
        name: g.name,
        displayOrder: g.displayOrder,
        _count: g._count,
      })),
    }));
  }

  async getSettings(): Promise<unknown> {
    const settings = await this.prisma.systemSetting.findMany({
      select: { key: true, value: true },
    });

    const get = (key: string): string | null =>
      settings.find((s) => s.key === key)?.value ?? null;

    return {
      termManagementMode: get("term_management_mode") ?? "MANUAL",
      activeAcademicYearId: get("active_academic_year_id"),
      activeTermId: get("active_term_id"),
      autoTermStartDate: get("auto_term_start_date"),
      autoTermEndDate: get("auto_term_end_date"),
      maintenanceMode: get("maintenance_mode") === "true",
    };
  }

  async updateSettings(dto: UpdateSettingsDto): Promise<unknown> {
    const entries: { key: string; value: string }[] = [];

    if (dto.termManagementMode !== undefined) {
      entries.push({ key: "term_management_mode", value: dto.termManagementMode });
    }
    if (dto.activeAcademicYearId !== undefined) {
      entries.push({ key: "active_academic_year_id", value: dto.activeAcademicYearId });
    }
    if (dto.activeTermId !== undefined) {
      entries.push({ key: "active_term_id", value: dto.activeTermId });
    }
    if (dto.autoTermStartDate !== undefined) {
      entries.push({ key: "auto_term_start_date", value: dto.autoTermStartDate });
    }
    if (dto.autoTermEndDate !== undefined) {
      entries.push({ key: "auto_term_end_date", value: dto.autoTermEndDate });
    }
    if (dto.maintenanceMode !== undefined) {
      entries.push({ key: "maintenance_mode", value: String(dto.maintenanceMode) });
    }

    await Promise.all(
      entries.map((e) =>
        this.prisma.systemSetting.upsert({
          where: { key: e.key },
          create: { key: e.key, value: e.value },
          update: { value: e.value },
        }),
      ),
    );

    return this.getSettings();
  }

  async listAcademicYears(): Promise<unknown> {
    const years = await this.prisma.academicYear.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        terms: {
          orderBy: { displayOrder: "asc" },
        },
        _count: {
          select: { users: true, units: true },
        },
      },
    });

    return years.map((y) => ({
      id: y.id,
      name: y.name,
      isActive: y.isActive,
      terms: y.terms,
      _count: y._count,
    }));
  }

  async createAcademicYear(dto: CreateAcademicYearDto): Promise<unknown> {
    const existing = await this.prisma.academicYear.findUnique({
      where: { name: dto.name },
    });
    if (existing) {
      throw new ConflictException("Academic year already exists");
    }

    return this.prisma.academicYear.create({ data: { name: dto.name } });
  }

  async updateAcademicYear(
    id: string,
    dto: UpdateAcademicYearDto,
  ): Promise<unknown> {
    const year = await this.prisma.academicYear.findUnique({ where: { id } });
    if (!year) {
      throw new NotFoundException("Academic year not found");
    }

    if (dto.name !== undefined) {
      const dup = await this.prisma.academicYear.findUnique({
        where: { name: dto.name },
      });
      if (dup && dup.id !== id) {
        throw new ConflictException("Academic year name already exists");
      }
    }

    return this.prisma.academicYear.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  }

  async deleteAcademicYear(id: string): Promise<unknown> {
    const year = await this.prisma.academicYear.findUnique({ where: { id } });
    if (!year) {
      throw new NotFoundException("Academic year not found");
    }

    const termCount = await this.prisma.term.count({
      where: { academicYearId: id },
    });
    if (termCount > 0) {
      throw new BadRequestException(
        "Cannot delete academic year that has terms. Delete all terms first.",
      );
    }

    await this.prisma.academicYear.delete({ where: { id } });
    return { id };
  }

  async createTerm(
    academicYearId: string,
    dto: CreateTermDto,
  ): Promise<unknown> {
    const year = await this.prisma.academicYear.findUnique({
      where: { id: academicYearId },
    });
    if (!year) {
      throw new NotFoundException("Academic year not found");
    }

    return this.prisma.term.create({
      data: {
        name: dto.name,
        displayOrder: dto.displayOrder ?? 0,
        academicYearId,
      },
    });
  }

  async updateTerm(id: string, dto: UpdateTermDto): Promise<unknown> {
    const term = await this.prisma.term.findUnique({ where: { id } });
    if (!term) {
      throw new NotFoundException("Term not found");
    }

    return this.prisma.term.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.displayOrder !== undefined && {
          displayOrder: dto.displayOrder,
        }),
      },
    });
  }

  async deleteTerm(id: string): Promise<unknown> {
    const term = await this.prisma.term.findUnique({ where: { id } });
    if (!term) {
      throw new NotFoundException("Term not found");
    }

    await this.prisma.term.delete({ where: { id } });
    return { id };
  }

  async listStudents(query: QueryStudentsDto): Promise<unknown> {
    const { search, status, stageId, gradeId, academicYearId, termId, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { role: "STUDENT" };

    if (status) where.status = status;
    if (gradeId) where.gradeId = gradeId;
    if (academicYearId) where.academicYearId = academicYearId;
    if (termId) where.termId = termId;

    if (stageId) {
      const stageGrades = await this.prisma.grade.findMany({
        where: { stageId },
        select: { id: true },
      });
      where.gradeId = { in: stageGrades.map((g) => g.id) };
    }

    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: "insensitive" } },
        { englishName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { mobileNumber: { contains: search, mode: "insensitive" } },
      ];
    }

    const [students, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          fullName: true,
          englishName: true,
          email: true,
          mobileNumber: true,
          parentMobile: true,
          role: true,
          status: true,
          educationalSystem: true,
          gradeId: true,
          academicYearId: true,
          termId: true,
          governorate: true,
          school: true,
          createdAt: true,
          updatedAt: true,
          assignedGrade: {
            select: {
              id: true,
              name: true,
              stage: { select: { name: true } },
            },
          },
          academicYear: {
            select: { id: true, name: true },
          },
          term: {
            select: { id: true, name: true },
          },
          coinWallet: {
            select: { balance: true },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.user.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    const mapped = students.map((s) => ({
      id: s.id,
      fullName: s.fullName,
      englishName: s.englishName,
      email: s.email,
      mobileNumber: s.mobileNumber,
      parentMobile: s.parentMobile,
      role: s.role,
      status: s.status,
      educationalSystem: s.educationalSystem,
      gradeId: s.gradeId,
      academicYearId: s.academicYearId,
      termId: s.termId,
      governorate: s.governorate,
      school: s.school,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
      coins: s.coinWallet?.balance ?? 0,
      assignedGrade: s.assignedGrade
        ? {
            id: s.assignedGrade.id,
            name: s.assignedGrade.name,
            stage: { name: s.assignedGrade.stage.name },
          }
        : null,
      academicYear: s.academicYear,
      term: s.term,
    }));

    return {
      students: mapped,
      meta: { total, page, limit, totalPages },
    };
  }

  async getStudent(id: string): Promise<unknown> {
    const s = await this.prisma.user.findFirst({
      where: { id, role: "STUDENT" },
      select: {
        id: true,
        fullName: true,
        englishName: true,
        email: true,
        mobileNumber: true,
        parentMobile: true,
        role: true,
        status: true,
        educationalSystem: true,
        gradeId: true,
        academicYearId: true,
        termId: true,
        governorate: true,
        school: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
        assignedGrade: {
          select: {
            id: true,
            name: true,
            stage: { select: { name: true } },
          },
        },
        academicYear: {
          select: { id: true, name: true },
        },
        term: {
          select: { id: true, name: true },
        },
        coinWallet: {
          select: { balance: true },
        },
      },
    });

    if (!s) {
      throw new NotFoundException("Student not found");
    }

    return {
      id: s.id,
      fullName: s.fullName,
      englishName: s.englishName,
      email: s.email,
      mobileNumber: s.mobileNumber,
      parentMobile: s.parentMobile,
      role: s.role,
      status: s.status,
      educationalSystem: s.educationalSystem,
      gradeId: s.gradeId,
      academicYearId: s.academicYearId,
      termId: s.termId,
      governorate: s.governorate,
      school: s.school,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
      deletedAt: s.deletedAt?.toISOString() ?? null,
      coins: s.coinWallet?.balance ?? 0,
      assignedGrade: s.assignedGrade
        ? {
            id: s.assignedGrade.id,
            name: s.assignedGrade.name,
            stage: { name: s.assignedGrade.stage.name },
          }
        : null,
      academicYear: s.academicYear,
      term: s.term,
    };
  }

  async updateStudent(id: string, dto: UpdateStudentDto): Promise<unknown> {
    const student = await this.prisma.user.findFirst({
      where: { id, role: "STUDENT", deletedAt: null },
    });
    if (!student) {
      throw new NotFoundException("Student not found");
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.fullName !== undefined && { fullName: dto.fullName }),
        ...(dto.englishName !== undefined && { englishName: dto.englishName }),
        ...(dto.governorate !== undefined && { governorate: dto.governorate }),
        ...(dto.school !== undefined && { school: dto.school }),
      },
    });

    return { id: updated.id };
  }

  async updateStudentPhone(
    id: string,
    dto: UpdateStudentPhoneDto,
  ): Promise<unknown> {
    const student = await this.prisma.user.findFirst({
      where: { id, role: "STUDENT", deletedAt: null },
    });
    if (!student) {
      throw new NotFoundException("Student not found");
    }

    const dup = await this.prisma.user.findUnique({
      where: { mobileNumber: dto.newMobileNumber },
    });
    if (dup && dup.id !== id) {
      throw new ConflictException("Mobile number already in use");
    }

    await this.prisma.user.update({
      where: { id },
      data: { mobileNumber: dto.newMobileNumber },
    });

    return { id };
  }

  async resetStudentPassword(
    id: string,
    dto: ResetStudentPasswordDto,
  ): Promise<unknown> {
    const student = await this.prisma.user.findFirst({
      where: { id, role: "STUDENT", deletedAt: null },
    });
    if (!student) {
      throw new NotFoundException("Student not found");
    }

    const SALT_ROUNDS = 12;
    const passwordHash = await bcrypt.hash(dto.newPassword, SALT_ROUNDS);

    await this.prisma.user.update({
      where: { id },
      data: { passwordHash },
    });

    return { id };
  }

  async resetStudentDevice(id: string): Promise<unknown> {
    const student = await this.prisma.user.findFirst({
      where: { id, role: "STUDENT", deletedAt: null },
    });
    if (!student) {
      throw new NotFoundException("Student not found");
    }

    await this.prisma.session.deleteMany({ where: { userId: id } });

    return { id };
  }

  async addCoins(id: string, dto: CoinAdjustDto): Promise<unknown> {
    const student = await this.prisma.user.findFirst({
      where: { id, role: "STUDENT", deletedAt: null },
    });
    if (!student) {
      throw new NotFoundException("Student not found");
    }

    await this.prisma.coinWallet.upsert({
      where: { userId: id },
      create: { userId: id, balance: dto.amount },
      update: { balance: { increment: dto.amount } },
    });

    return { id };
  }

  async removeCoins(id: string, dto: CoinAdjustDto): Promise<unknown> {
    const student = await this.prisma.user.findFirst({
      where: { id, role: "STUDENT", deletedAt: null },
    });
    if (!student) {
      throw new NotFoundException("Student not found");
    }

    const wallet = await this.prisma.coinWallet.findUnique({
      where: { userId: id },
    });

    if (!wallet || wallet.balance < dto.amount) {
      throw new BadRequestException("Insufficient coins");
    }

    await this.prisma.coinWallet.update({
      where: { userId: id },
      data: { balance: { decrement: dto.amount } },
    });

    return { id };
  }

  async adjustXp(id: string, dto: XpAdjustDto): Promise<unknown> {
    const student = await this.prisma.user.findFirst({
      where: { id, role: "STUDENT", deletedAt: null },
    });
    if (!student) {
      throw new NotFoundException("Student not found");
    }

    await this.prisma.xPTransaction.create({
      data: {
        userId: id,
        amount: dto.amount,
        reason: dto.reason ?? "Administrator adjustment",
      },
    });

    return { id };
  }

  async updateStudentStatus(
    id: string,
    dto: UpdateTeacherStatusDto,
  ): Promise<unknown> {
    const student = await this.prisma.user.findFirst({
      where: { id, role: "STUDENT" },
    });
    if (!student) {
      throw new NotFoundException("Student not found");
    }

    const data: Record<string, unknown> = { status: dto.status };

    if (dto.status === "DELETED") {
      data.deletedAt = new Date();
    } else {
      data.deletedAt = null;
    }

    await this.prisma.user.update({ where: { id }, data });

    return { id };
  }

  async getStudentProgress(id: string): Promise<unknown> {
    const student = await this.prisma.user.findFirst({
      where: { id, role: "STUDENT", deletedAt: null },
    });
    if (!student) {
      throw new NotFoundException("Student not found");
    }

    const [lessonProgress, quizAttempts, homeworkAttempts] =
      await Promise.all([
        this.prisma.lessonProgress.findMany({
          where: { userId: id },
          select: {
            lessonId: true,
            completed: true,
            progress: true,
          },
        }),
        this.prisma.quizAttempt.findMany({
          where: { userId: id },
          select: {
            quizId: true,
            score: true,
            passed: true,
          },
        }),
        this.prisma.studentHomeworkAttempt.findMany({
          where: { userId: id },
          select: {
            homeworkId: true,
            score: true,
            submitted: true,
          },
        }),
      ]);

    return { lessonProgress, quizAttempts, homeworkAttempts };
  }

  async getStudentAttendance(id: string): Promise<unknown> {
    const student = await this.prisma.user.findFirst({
      where: { id, role: "STUDENT", deletedAt: null },
    });
    if (!student) {
      throw new NotFoundException("Student not found");
    }

    const records = await this.prisma.attendanceRecord.findMany({
      where: { userId: id },
      orderBy: { date: "desc" },
      select: { id: true, date: true, present: true },
    });

    return records.map((r) => ({
      id: r.id,
      date: r.date.toISOString(),
      present: r.present,
    }));
  }

  async getStudentLoginHistory(id: string): Promise<unknown> {
    const student = await this.prisma.user.findFirst({
      where: { id, role: "STUDENT", deletedAt: null },
    });
    if (!student) {
      throw new NotFoundException("Student not found");
    }

    const records = await this.prisma.loginHistory.findMany({
      where: { userId: id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        createdAt: true,
        success: true,
        ipAddress: true,
        failureReason: true,
      },
    });

    return records.map((r) => ({
      id: r.id,
      createdAt: r.createdAt.toISOString(),
      success: r.success,
      ipAddress: r.ipAddress,
      failureReason: r.failureReason,
    }));
  }

  async getStudentSubscription(id: string): Promise<unknown> {
    const student = await this.prisma.user.findFirst({
      where: { id, role: "STUDENT", deletedAt: null },
    });
    if (!student) {
      throw new NotFoundException("Student not found");
    }

    const payments = await this.prisma.payment.findMany({
      where: { userId: id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        productType: true,
        amount: true,
        status: true,
        createdAt: true,
      },
    });

    return {
      payments: payments.map((p) => ({
        id: p.id,
        productType: p.productType,
        amount: p.amount,
        status: p.status,
        createdAt: p.createdAt.toISOString(),
      })),
    };
  }
}
