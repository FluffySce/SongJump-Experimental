-- CreateIndex
CREATE INDEX "TransferItem_transferJobId_idx" ON "public"."TransferItem"("transferJobId");

-- CreateIndex
CREATE INDEX "TransferJob_userId_idx" ON "public"."TransferJob"("userId");

-- CreateIndex
CREATE INDEX "TransferJob_status_idx" ON "public"."TransferJob"("status");

-- CreateIndex
CREATE INDEX "TransferJob_userId_status_idx" ON "public"."TransferJob"("userId", "status");
