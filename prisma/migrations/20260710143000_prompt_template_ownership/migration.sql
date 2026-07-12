-- AlterTable
ALTER TABLE `PromptTemplate`
    DROP INDEX `PromptTemplate_scene_version_key`,
    ADD COLUMN `userId` VARCHAR(191) NULL,
    ADD COLUMN `templateKey` VARCHAR(191) NULL;

-- Backfill
UPDATE `PromptTemplate`
SET `userId` = NULL,
    `templateKey` = CONCAT('system:', `scene`, ':', `version`)
WHERE `templateKey` IS NULL;

-- AlterTable
ALTER TABLE `PromptTemplate`
    MODIFY `templateKey` VARCHAR(191) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX `PromptTemplate_templateKey_key` ON `PromptTemplate`(`templateKey`);

-- CreateIndex
CREATE INDEX `PromptTemplate_userId_scene_isActive_idx` ON `PromptTemplate`(`userId`, `scene`, `isActive`);

-- AddForeignKey
ALTER TABLE `PromptTemplate` ADD CONSTRAINT `PromptTemplate_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
