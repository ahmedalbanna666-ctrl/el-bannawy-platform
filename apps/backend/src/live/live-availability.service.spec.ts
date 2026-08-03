import { Test, type TestingModule } from "@nestjs/testing";
import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { LiveAvailabilityService } from "./live-availability.service";
import { PrismaService } from "../prisma/prisma.service";
import { LiveAccessService } from "./live-access.service";

describe("LiveAvailabilityService (scheduling engine)", () => {
  let service: LiveAvailabilityService;
  let prisma: {
    teacherAvailability: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    teacherDateBlock: {
      findMany: jest.Mock;
    };
    liveSession: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
    };
  };
  let access: { assertSessionOwner: jest.Mock };

  beforeEach(async () => {
    prisma = {
      teacherAvailability: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      teacherDateBlock: { findMany: jest.fn().mockResolvedValue([]) },
      liveSession: { findMany: jest.fn().mockResolvedValue([]), findFirst: jest.fn(), create: jest.fn() },
    };
    access = { assertSessionOwner: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LiveAvailabilityService,
        { provide: PrismaService, useValue: prisma },
        { provide: LiveAccessService, useValue: access },
      ],
    }).compile();
    service = module.get<LiveAvailabilityService>(LiveAvailabilityService);
  });

  describe("createAvailability conflict detection", () => {
    it("rejects an end time before the start time", async () => {
      await expect(
        service.createAvailability({
          teacherId: "t1",
          dayOfWeek: 1,
          startTime: "2026-01-05T10:00:00.000Z",
          endTime: "2026-01-05T09:00:00.000Z",
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("rejects overlapping recurring windows for the same teacher/day", async () => {
      prisma.teacherAvailability.findMany.mockResolvedValue([
        {
          id: "a1",
          startTime: new Date("2026-01-05T10:00:00.000Z"),
          endTime: new Date("2026-01-05T11:00:00.000Z"),
        },
      ]);

      await expect(
        service.createAvailability({
          teacherId: "t1",
          dayOfWeek: 1,
          startTime: "2026-01-05T10:30:00.000Z",
          endTime: "2026-01-05T12:00:00.000Z",
        }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.teacherAvailability.create).not.toHaveBeenCalled();
    });

    it("accepts non-overlapping windows and creates", async () => {
      prisma.teacherAvailability.findMany.mockResolvedValue([
        {
          id: "a1",
          startTime: new Date("2026-01-05T10:00:00.000Z"),
          endTime: new Date("2026-01-05T11:00:00.000Z"),
        },
      ]);
      prisma.teacherAvailability.create.mockResolvedValue({ id: "a2" });

      const result = await service.createAvailability({
        teacherId: "t1",
        dayOfWeek: 1,
        startTime: "2026-01-05T11:30:00.000Z",
        endTime: "2026-01-05T12:30:00.000Z",
      });

      expect(result).toEqual({ id: "a2" });
      expect(prisma.teacherAvailability.create).toHaveBeenCalled();
    });

    it("accepts HH:mm times and stores them as valid UTC time-of-day dates", async () => {
      prisma.teacherAvailability.findMany.mockResolvedValue([]);
      const created: Record<string, unknown> = {};
      prisma.teacherAvailability.create.mockImplementation(({ data }: { data: Record<string, unknown> }) => {
        Object.assign(created, data);
        return Promise.resolve({ id: "a3" });
      });

      await service.createAvailability({
        teacherId: "t1",
        dayOfWeek: 1,
        startTime: "09:00",
        endTime: "10:00",
        maxStudents: 4,
      });

      const start = created.startTime as Date;
      const end = created.endTime as Date;
      expect(Number.isNaN(start.getTime())).toBe(false);
      expect(Number.isNaN(end.getTime())).toBe(false);
      expect(start.toISOString()).toBe("1970-01-01T09:00:00.000Z");
      expect(end.toISOString()).toBe("1970-01-01T10:00:00.000Z");
    });
  });

  describe("updateAvailability guards", () => {
    it("throws when the availability is missing", async () => {
      prisma.teacherAvailability.findFirst.mockResolvedValue(null);
      await expect(
        service.updateAvailability("a1", "u1", "TEACHER", {}),
      ).rejects.toThrow(NotFoundException);
    });

    it("throws when a teacher edits another teacher's availability", async () => {
      prisma.teacherAvailability.findFirst.mockResolvedValue({
        id: "a1",
        teacherId: "t1",
      });
      await expect(
        service.updateAvailability("a1", "u1", "TEACHER", {}),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe("getAvailableSlots materialization", () => {
    it("uses the authoritative session availableSeats for existing sessions", async () => {
      prisma.teacherAvailability.findMany.mockResolvedValue([
        {
          id: "a1",
          teacherId: "t1",
          dayOfWeek: 1,
          startTime: new Date("2026-01-05T10:00:00.000Z"),
          endTime: new Date("2026-01-05T11:00:00.000Z"),
          type: "PRIVATE",
          maxStudents: 4,
          gradeId: "g1",
          teacher: { fullName: "Teacher One" },
        },
      ]);
      prisma.liveSession.findMany.mockResolvedValue([
        {
          id: "s1",
          teacherId: "t1",
          date: new Date("2026-01-05T00:00:00.000Z"),
          status: "PUBLISHED",
          availableSeats: 2,
        },
      ]);

      const slots = await service.getAvailableSlots({
        teacherId: "t1",
        dateFrom: "2026-01-04",
        dateTo: "2026-01-06",
      });

      expect(slots).toHaveLength(1);
      expect(slots[0]).toMatchObject({
        existingSessionId: "s1",
        availableSeats: 2,
      });
    });

    it("skips terminal sessions when materializing slots", async () => {
      prisma.teacherAvailability.findMany.mockResolvedValue([
        {
          id: "a1",
          teacherId: "t1",
          dayOfWeek: 1,
          startTime: new Date("2026-01-05T10:00:00.000Z"),
          endTime: new Date("2026-01-05T11:00:00.000Z"),
          type: "PRIVATE",
          maxStudents: 4,
          gradeId: null,
          teacher: { fullName: "Teacher One" },
        },
      ]);
      prisma.liveSession.findMany.mockResolvedValue([
        {
          id: "s1",
          teacherId: "t1",
          date: new Date("2026-01-05T00:00:00.000Z"),
          status: "CANCELLED",
          availableSeats: 0,
        },
      ]);

      const slots = await service.getAvailableSlots({
        teacherId: "t1",
        dateFrom: "2026-01-04",
        dateTo: "2026-01-06",
      });

      expect(slots[0]).toMatchObject({
        existingSessionId: null,
        availableSeats: 4,
      });
    });
  });

  describe("materializeSessionFromSlot", () => {
    it("throws NotFoundException when the slot is missing", async () => {
      prisma.teacherAvailability.findFirst.mockResolvedValue(null);
      await expect(service.materializeSessionFromSlot("avail1", "2026-08-01")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("reuses an existing session for the teacher and date", async () => {
      prisma.teacherAvailability.findFirst.mockResolvedValue({
        id: "avail1",
        teacherId: "t1",
        type: "PRIVATE",
      });
      prisma.liveSession.findFirst.mockResolvedValue({ id: "s1", teacherId: "t1", type: "PRIVATE" });

      const result = await service.materializeSessionFromSlot("avail1", "2026-08-01");

      expect(result).toEqual({ id: "s1", teacherId: "t1", type: "PRIVATE" });
      expect(prisma.liveSession.create).not.toHaveBeenCalled();
    });

    it("creates a PUBLISHED session when none exists", async () => {
      prisma.teacherAvailability.findFirst.mockResolvedValue({
        id: "avail1",
        teacherId: "t1",
        gradeId: "g1",
        startTime: new Date("2026-08-01T10:00:00.000Z"),
        endTime: new Date("2026-08-01T11:00:00.000Z"),
        maxStudents: 4,
        type: "GROUP",
      });
      prisma.liveSession.findFirst.mockResolvedValue(null);
      prisma.liveSession.create.mockResolvedValue({ id: "s1", teacherId: "t1", type: "GROUP" });

      const result = await service.materializeSessionFromSlot("avail1", "2026-08-01");

      expect(prisma.liveSession.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            teacherId: "t1",
            availabilitySlotId: "avail1",
            date: new Date("2026-08-01T00:00:00.000Z"),
            availableSeats: 4,
            type: "GROUP",
            status: "PUBLISHED",
          }),
        }),
      );
      expect(result).toEqual({ id: "s1", teacherId: "t1", type: "GROUP" });
    });
  });
});
