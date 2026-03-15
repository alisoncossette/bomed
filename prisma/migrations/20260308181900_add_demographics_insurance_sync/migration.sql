-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Patient" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "handle" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "calendarConnected" BOOLEAN NOT NULL DEFAULT false,
    "practiceId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "dateOfBirth" DATETIME,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zip" TEXT,
    "emergencyName" TEXT,
    "emergencyPhone" TEXT,
    "emergencyRelation" TEXT,
    "insuranceCarrier" TEXT,
    "insurancePlan" TEXT,
    "insuranceGroupNo" TEXT,
    "insuranceMemberId" TEXT,
    "insuranceEffDate" DATETIME,
    "insuranceExpDate" DATETIME,
    "insuranceVerified" BOOLEAN NOT NULL DEFAULT false,
    "insuranceVerifiedAt" DATETIME,
    "boloSyncedAt" DATETIME,
    "demographicsGranted" BOOLEAN NOT NULL DEFAULT false,
    "insuranceGranted" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Patient_practiceId_fkey" FOREIGN KEY ("practiceId") REFERENCES "Practice" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Patient" ("calendarConnected", "createdAt", "email", "handle", "id", "name", "phone", "practiceId", "updatedAt") SELECT "calendarConnected", "createdAt", "email", "handle", "id", "name", "phone", "practiceId", "updatedAt" FROM "Patient";
DROP TABLE "Patient";
ALTER TABLE "new_Patient" RENAME TO "Patient";
CREATE UNIQUE INDEX "Patient_handle_key" ON "Patient"("handle");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
