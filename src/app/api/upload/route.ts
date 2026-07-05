import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0) {
      // 兼容单文件字段名可能为 'file' 的情况
      const singleFile = formData.get('file') as File | null;
      if (singleFile) {
        files.push(singleFile);
      }
    }

    if (files.length === 0) {
      return apiError('请至少选择一张要上传的图片', 400);
    }

    if (files.length > 9) {
      return apiError('最多支持同时上传 9 张图片', 400);
    }

    // TODO: 1. 检查图片格式 (image/jpeg, image/png, image/webp) 与大小 (如限制单张最大 10MB)
    // TODO: 2. 生成本地唯一文件名并写入 ./uploads 文件夹，或将文件持久化存储至阿里云 OSS/AWS S3
    // TODO: 3. 若使用本地存储，通过 fs.writeFile 存入磁盘，获取真实分辨率 (width, height)

    // 框架阶段：模拟返回上传成功的图片元数据信息
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');

    const images = files.map((file, index) => {
      const ext = file.name ? file.name.split('.').pop() || 'jpg' : 'jpg';
      const uniqueName = `${Date.now()}-${index}.${ext}`;
      return {
        url: `/uploads/${year}/${month}/${uniqueName}`,
        width: 1080,
        height: 1440,
        size: file.size || 234567,
        mimeType: file.type || 'image/jpeg',
      };
    });

    return apiSuccess({ images });
  } catch (error) {
    return apiError('图片上传失败或文件体积过大', 500);
  }
}
