-- CreateTable
CREATE TABLE "Practice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "handle" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'America/New_York',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Practitioner" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "handle" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "specialty" TEXT,
    "practiceId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Practitioner_practiceId_fkey" FOREIGN KEY ("practiceId") REFERENCES "Practice" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Patient" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "handle" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "calendarConnected" BOOLEAN NOT NULL DEFAULT false,
    "practiceId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Patient_practiceId_fkey" FOREIGN KEY ("practiceId") REFERENCES "Practice" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PatientPractitioner" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "patientId" TEXT NOT NULL,
    "practitionerId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PatientPractitioner_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PatientPractitioner_practitionerId_fkey" FOREIGN KEY ("practitionerId") REFERENCES "Practitioner" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Appointment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "practiceId" TEXT NOT NULL,
    "practitionerId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "dateTime" DATETIME NOT NULL,
    "duration" INTEGER NOT NULL DEFAULT 30,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "type" TEXT NOT NULL DEFAULT 'PT_SESSION',
    "notes" TEXT,
    "relayMessageId" TEXT,
    "recurring" BOOLEAN NOT NULL DEFAULT false,
    "recurringDay" INTEGER,
    "recurringTime" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Appointment_practiceId_fkey" FOREIGN KEY ("practiceId") REFERENCES "Practice" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Appointment_practitionerId_fkey" FOREIGN KEY ("practitionerId") REFERENCES "Practitioner" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Appointment_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Practice_handle_key" ON "Practice"("handle");

-- CreateIndex
CREATE UNIQUE INDEX "Practice_email_key" ON "Practice"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Practitioner_handle_key" ON "Practitioner"("handle");

-- CreateIndex
CREATE UNIQUE INDEX "Patient_handle_key" ON "Patient"("handle");

-- CreateIndex
CREATE UNIQUE INDEX "PatientPractitioner_patientId_practitionerId_key" ON "PatientPractitioner"("patientId", "practitionerId");

-- CreateIndex
CREATE INDEX "Appointment_practiceId_dateTime_idx" ON "Appointment"("practiceId", "dateTime");

-- CreateIndex
CREATE INDEX "Appointment_practitionerId_dateTime_idx" ON "Appointment"("practitionerId", "dateTime");

-- CreateIndex
CREATE INDEX "Appointment_patientId_dateTime_idx" ON "Appointment"("patientId", "dateTime");

-- CreateIndex
CREATE INDEX "Appointment_status_idx" ON "Appointment"("status");
