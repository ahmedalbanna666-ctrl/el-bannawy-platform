export interface BaseUserProfile {
  id: string;
  fullName: string;
  email: string | null;
  mobileNumber: string | null;
  role: "STUDENT" | "TEACHER" | "STAFF" | "ADMINISTRATOR";
  status: string;
  avatarUrl: string | null;
  educationalSystem: string | null;
  governorate: string | null;
  school: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StudentProfileResponse extends BaseUserProfile {
  role: "STUDENT";
  roleProfile: {
    stage: { id: string; name: string } | null;
    grade: { id: string; name: string } | null;
    currentTerm: { id: string; name: string } | null;
  };
}

export interface TeacherProfileResponse extends BaseUserProfile {
  role: "TEACHER";
  roleProfile: {
    assignedGrades: { id: string; name: string }[];
    totalStudents: number;
  };
}

export interface StaffProfileResponse extends BaseUserProfile {
  role: "STAFF";
  roleProfile: {
    jobTitle: string | null;
    permissions: { key: string; label: string }[];
  };
}

export interface AdminProfileResponse extends BaseUserProfile {
  role: "ADMINISTRATOR";
  roleProfile: {
    administrationType: string;
    accessScope: "FULL" | "CUSTOM";
  };
}

export type UserProfileResponse =
  | StudentProfileResponse
  | TeacherProfileResponse
  | StaffProfileResponse
  | AdminProfileResponse;
