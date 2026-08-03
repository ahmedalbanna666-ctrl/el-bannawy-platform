-- Add missing index on live_sessions.availabilitySlotId
CREATE INDEX "live_sessions_availabilitySlotId_idx" ON "live_sessions"("availabilitySlotId");
