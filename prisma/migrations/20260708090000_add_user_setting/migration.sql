-- CreateTable
CREATE TABLE `UserSetting` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `persona` TEXT NOT NULL,
    `defaultTopic` VARCHAR(50) NOT NULL DEFAULT 'swimming',
    `defaultStyle` VARCHAR(50) NOT NULL DEFAULT 'natural',
    `aiProvider` VARCHAR(50) NOT NULL DEFAULT 'openai',
    `currentModel` VARCHAR(100) NOT NULL DEFAULT 'gpt-4o-mini',
    `outputLang` VARCHAR(20) NOT NULL DEFAULT 'zh-CN',
    `storageMethod` VARCHAR(50) NOT NULL DEFAULT 'local',
    `storageRegion` VARCHAR(50) NOT NULL DEFAULT 'ap-east',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `UserSetting_userId_key`(`userId`),
    INDEX `UserSetting_aiProvider_currentModel_idx`(`aiProvider`, `currentModel`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `UserSetting` ADD CONSTRAINT `UserSetting_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
