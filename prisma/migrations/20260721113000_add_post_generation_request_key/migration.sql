-- AlterTable
ALTER TABLE `Post`
    ADD COLUMN `generationRequestKey` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `Post_generationRequestKey_key` ON `Post`(`generationRequestKey`);
