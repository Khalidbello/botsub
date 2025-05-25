import { Request, Response } from 'express';
import mongoose from 'mongoose';
import WhatsappBotUsers from '../../models/whatsaap_bot_users';

interface PaginationOptions {
  limit: number;
  offset: number;
}

interface DateRange {
  startDate: Date;
  endDate: Date;
}

interface ListWhatsappUsersRequest {
  dateRange?: DateRange;
  pagination?: PaginationOptions;
  sortBy?: 'lastMessage' | 'lastTransact' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export const listWhatsappUsers = async (req: Request, res: Response) => {
  try {
    const { dateRange, pagination, sortBy, sortOrder }: ListWhatsappUsersRequest = req.body;

    if (!dateRange) return res.status(400).json({ error: 'Invalid parameter format.' });

    // Default values
    const limit = pagination?.limit || 10;
    const offset = pagination?.offset || 0;
    const sortField = sortBy || 'lastMessage';
    const sortDirection = sortOrder === 'asc' ? 1 : -1;
    const startDate = new Date(dateRange.startDate);
    const endDate = new Date(dateRange.endDate);
    startDate.setUTCHours(0, 0, 0, 0);
    endDate.setUTCHours(23, 59, 59, 999);

    // Build query
    const query: any = {};

    // Date range filter
    if (dateRange) {
      query.lastMessage = {
        $gte: startDate,
        $lte: endDate,
      };
    }

    // Get total count for pagination
    const totalCount = await WhatsappBotUsers.countDocuments(query);

    // Fetch users with pagination and sorting
    const users = await WhatsappBotUsers.find(query)
      .sort({ [sortField]: sortDirection })
      .skip(offset)
      .limit(limit)
      .lean();

    // Transform data for frontend
    const transformedUsers = users.map((user) => ({
      id: user.id,
      phoneNumber: user.purchasePayload?.phoneNumber || '',
      name: user.email || `User ${user.id}`,
      lastMessage: user.lastMessage,
      lastTransaction: user.lastTransact,
      transactionCount: user.transactNum,
      firstPurchase: user.firstPurchase,
      createdAt: user.createdAt,
    }));

    res.json({
      success: true,
      data: transformedUsers,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount,
      },
    });
  } catch (error) {
    console.error('Error fetching WhatsApp users:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch WhatsApp users',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};
