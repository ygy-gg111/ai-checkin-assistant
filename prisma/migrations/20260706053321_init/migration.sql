-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(255) NOT NULL,
    `name` VARCHAR(100) NULL,
    `avatar` VARCHAR(2048) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Post` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `promptTemplateId` VARCHAR(191) NULL,
    `topic` VARCHAR(50) NOT NULL,
    `dayCount` INTEGER NULL,
    `style` VARCHAR(50) NOT NULL DEFAULT 'normal',
    `inputText` TEXT NOT NULL,
    `analysisJson` JSON NULL,
    `title` VARCHAR(255) NOT NULL,
    `content` TEXT NOT NULL,
    `tags` JSON NOT NULL,
    `coverText` VARCHAR(255) NULL,
    `provider` VARCHAR(50) NOT NULL DEFAULT 'openai',
    `model` VARCHAR(100) NOT NULL DEFAULT 'gpt-4o-mini',
    `status` ENUM('DRAFT', 'GENERATED', 'DELETED') NOT NULL DEFAULT 'GENERATED',
    `checkinDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Post_userId_createdAt_idx`(`userId`, `createdAt`),
    INDEX `Post_promptTemplateId_idx`(`promptTemplateId`),
    INDEX `Post_topic_checkinDate_idx`(`topic`, `checkinDate`),
    INDEX `Post_status_createdAt_idx`(`status`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PostImage` (
    `id` VARCHAR(191) NOT NULL,
    `postId` VARCHAR(191) NOT NULL,
    `url` VARCHAR(2048) NOT NULL,
    `width` INTEGER NULL,
    `height` INTEGER NULL,
    `size` INTEGER NULL,
    `mimeType` VARCHAR(100) NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `PostImage_postId_idx`(`postId`),
    UNIQUE INDEX `PostImage_postId_sortOrder_key`(`postId`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PromptTemplate` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `scene` VARCHAR(50) NOT NULL,
    `version` VARCHAR(20) NOT NULL DEFAULT '1.0',
    `content` TEXT NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `PromptTemplate_scene_isActive_idx`(`scene`, `isActive`),
    UNIQUE INDEX `PromptTemplate_scene_version_key`(`scene`, `version`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AIUsageLog` (
    `id` VARCHAR(191) NOT NULL,
    `postId` VARCHAR(191) NULL,
    `provider` VARCHAR(50) NOT NULL,
    `model` VARCHAR(100) NOT NULL,
    `success` BOOLEAN NOT NULL DEFAULT true,
    `errorCode` VARCHAR(100) NULL,
    `errorMessage` TEXT NULL,
    `inputTokens` INTEGER NULL,
    `outputTokens` INTEGER NULL,
    `totalTokens` INTEGER NULL,
    `durationMs` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `AIUsageLog_postId_idx`(`postId`),
    INDEX `AIUsageLog_provider_model_idx`(`provider`, `model`),
    INDEX `AIUsageLog_success_createdAt_idx`(`success`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Post` ADD CONSTRAINT `Post_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Post` ADD CONSTRAINT `Post_promptTemplateId_fkey` FOREIGN KEY (`promptTemplateId`) REFERENCES `PromptTemplate`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PostImage` ADD CONSTRAINT `PostImage_postId_fkey` FOREIGN KEY (`postId`) REFERENCES `Post`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AIUsageLog` ADD CONSTRAINT `AIUsageLog_postId_fkey` FOREIGN KEY (`postId`) REFERENCES `Post`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
