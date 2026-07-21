"use client";

import type { ReactNode } from "react";
import type { UserProfileResponse } from "../types";
import { StudentProfileSection } from "./student-profile-section";
import { TeacherProfileSection } from "./teacher-profile-section";
import { StaffProfileSection } from "./staff-profile-section";
import { AdminProfileSection } from "./admin-profile-section";

interface Props {
  profile: UserProfileResponse;
  onSave: (key: string, value: string) => Promise<void>;
}

export function RoleProfileSection({ profile, onSave }: Props): ReactNode {
  if (!profile.roleProfile) return null;

  switch (profile.role) {
    case "STUDENT":
      return <StudentProfileSection profile={profile.roleProfile} onSave={onSave} />;
    case "TEACHER":
      return <TeacherProfileSection profile={profile.roleProfile} />;
    case "STAFF":
      return <StaffProfileSection profile={profile.roleProfile} />;
    case "ADMINISTRATOR":
      return <AdminProfileSection profile={profile.roleProfile} />;
    default: {
      const _exhaustive: never = profile;
      void _exhaustive;
      return null;
    }
  }
}
