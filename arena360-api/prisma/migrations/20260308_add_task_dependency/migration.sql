-- CreateTable
CREATE TABLE "TaskDependency" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "predecessorTaskId" TEXT NOT NULL,
    "successorTaskId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskDependency_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TaskDependency_predecessorTaskId_successorTaskId_key" ON "TaskDependency"("predecessorTaskId", "successorTaskId");

-- CreateIndex
CREATE INDEX "TaskDependency_projectId_idx" ON "TaskDependency"("projectId");

-- CreateIndex
CREATE INDEX "TaskDependency_predecessorTaskId_idx" ON "TaskDependency"("predecessorTaskId");

-- CreateIndex
CREATE INDEX "TaskDependency_successorTaskId_idx" ON "TaskDependency"("successorTaskId");

-- AddForeignKey
ALTER TABLE "TaskDependency" ADD CONSTRAINT "TaskDependency_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskDependency" ADD CONSTRAINT "TaskDependency_predecessorTaskId_fkey" FOREIGN KEY ("predecessorTaskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskDependency" ADD CONSTRAINT "TaskDependency_successorTaskId_fkey" FOREIGN KEY ("successorTaskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
