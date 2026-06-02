import { NextResponse } from 'next/server';
import { GridFSBucket } from 'mongodb';
import { connectToDatabase } from '@/lib/mongodb';

export async function POST(request: Request) {
  try {
    console.log('[v0] Upload request received');
    
    const formData = await request.formData();
    console.log('[v0] FormData parsed');
    
    const file = formData.get('file') as File;
    console.log('[v0] File from formData:', file?.name, file?.size, file?.type);

    if (!file) {
      console.error('[v0] No file in request');
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (file.size === 0) {
      console.error('[v0] File is empty');
      return NextResponse.json({ error: 'File is empty' }, { status: 400 });
    }

    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    if (!isImage && !isVideo) {
      console.error('[v0] Unsupported file type:', file.type);
      return NextResponse.json({ error: 'File must be an image or video' }, { status: 400 });
    }

    // Check file size (images: 5MB, videos: 10MB)
    const maxSize = isVideo ? 10 * 1024 * 1024 : 5 * 1024 * 1024;
    if (file.size > maxSize) {
      console.error('[v0] File too large:', file.size);
      return NextResponse.json({ 
        error: 'File too large', 
        details: isVideo
          ? 'Maximum video size is 10MB. Please compress your video and try again.'
          : 'Maximum image size is 5MB. Please compress your image and try again.',
      }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const bucket = new GridFSBucket(db, { bucketName: 'uploads' });

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const uploadStream = bucket.openUploadStream(file.name || 'upload', {
      contentType: file.type || 'application/octet-stream',
      metadata: {
        originalName: file.name,
        size: file.size,
        uploadedAt: new Date(),
      },
    });

    const fileId = await new Promise<string>((resolve, reject) => {
      uploadStream.on('error', reject);
      uploadStream.on('finish', () => resolve(uploadStream.id.toString()));
      uploadStream.end(buffer);
    });

    const url = `/api/files/${fileId}`;
    console.log('[v0] Upload successful, returning file URL:', url);
    return NextResponse.json({ url, contentType: file.type });
  } catch (error) {
    console.error('[v0] Upload error details:', error);
    return NextResponse.json({ 
      error: 'Upload failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
