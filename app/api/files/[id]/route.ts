import { NextRequest, NextResponse } from 'next/server';
import { GridFSBucket, ObjectId } from 'mongodb';
import { connectToDatabase } from '@/lib/mongodb';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid file id' }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const bucket = new GridFSBucket(db, { bucketName: 'uploads' });

    const files = await db
      .collection('uploads.files')
      .find({ _id: new ObjectId(id) })
      .limit(1)
      .toArray();

    const fileDoc = files[0];
    if (!fileDoc) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const contentType =
      (typeof fileDoc.contentType === 'string' && fileDoc.contentType) || 'application/octet-stream';

    const downloadStream = bucket.openDownloadStream(new ObjectId(id));
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        downloadStream.on('data', (chunk: Buffer) => controller.enqueue(new Uint8Array(chunk)));
        downloadStream.on('end', () => controller.close());
        downloadStream.on('error', err => controller.error(err));
      },
      cancel() {
        try {
          downloadStream.destroy();
        } catch {
          // ignore
        }
      },
    });

    // Cache aggressively; file URLs are immutable (by id).
    return new NextResponse(stream, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('[v0] File fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch file' }, { status: 500 });
  }
}

