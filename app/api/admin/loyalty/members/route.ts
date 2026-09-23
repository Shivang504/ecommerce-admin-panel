import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';

export async function GET(request: NextRequest) {
  try {
    const unauthorized = requireAdminAuth(request);
    if (unauthorized) return unauthorized;

    const { db } = await connectToDatabase();
    const search = request.nextUrl.searchParams.get('q')?.trim() || '';
    const page = Math.max(1, Number(request.nextUrl.searchParams.get('page') || 1));
    const limit = Math.min(50, Math.max(10, Number(request.nextUrl.searchParams.get('limit') || 20)));
    const skip = (page - 1) * limit;

    const query: any = {
      $or: [
        { rewardPoints: { $gt: 0 } },
        { loyaltyTotalEarned: { $gt: 0 } },
        { loyaltyReferralCode: { $exists: true, $ne: null } },
      ],
    };
    if (search) {
      query.$and = [
        {
          $or: [
            { name: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
            { phone: { $regex: search, $options: 'i' } },
            { loyaltyReferralCode: { $regex: search, $options: 'i' } },
          ],
        },
      ];
    }

    const [members, total] = await Promise.all([
      db
        .collection('customers')
        .find(query)
        .project({
          name: 1,
          email: 1,
          phone: 1,
          rewardPoints: 1,
          loyaltyTotalEarned: 1,
          loyaltyTotalRedeemed: 1,
          loyaltyReferralCode: 1,
          status: 1,
          createdAt: 1,
        })
        .sort({ rewardPoints: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      db.collection('customers').countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      members: members.map(m => ({ ...m, _id: m._id.toString() })),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to load loyalty members' },
      { status: 500 }
    );
  }
}
