// pages/api/reports/index.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { verifyToken } from '../../../lib/auth';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Check HTTP method
  if (req.method === 'POST') {
    return await createReport(req, res);
  } else if (req.method === 'GET') {
    return await listReports(req, res);
  } else {
    return res.status(405).json({ message: 'Method not allowed' });
  }
}

// Create a new report
async function createReport(req: NextApiRequest, res: NextApiResponse) {
  const { authorization } = req.headers;
  if (!authorization) {
    return res.status(401).json({ message: 'Missing Authorization header' });
  }

  const token = authorization.replace('Bearer ', '');
  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ message: 'Invalid token' });
  }

  const userId = (decoded as any).userId;

  try {
    const { workDate, location, description, overtimeHours } = req.body;

    // Basic validation
    if (!workDate || !location || !description) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Ensure workDate is a valid date
    let parsedDate;
    try {
      parsedDate = new Date(workDate);
      if (isNaN(parsedDate.getTime())) {
        return res.status(400).json({ message: 'Invalid date format for workDate' });
      }
    } catch (err) {
      return res.status(400).json({ message: 'Invalid date format for workDate' });
    }

    // Create the report
    const newReport = await prisma.report.create({
      data: {
        userId,
        workDate: parsedDate,
        location,
        description,
        overtimeHours: Number(overtimeHours) || 0,
        status: 'PENDING'
      },
    });

    return res.status(201).json({ report: newReport });
  } catch (error: any) {
    console.error('Report creation error:', error);
    return res.status(500).json({ message: error.message });
  }
}

// List reports (optional)
async function listReports(req: NextApiRequest, res: NextApiResponse) {
  // Authentication check
  const { authorization } = req.headers;
  if (!authorization) {
    return res.status(401).json({ message: 'Missing Authorization header' });
  }

  const token = authorization.replace('Bearer ', '');
  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ message: 'Invalid token' });
  }

  const userId = (decoded as any).userId;

  try {
    // Get reports for this user
    const reports = await prisma.report.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });
    
    return res.status(200).json({ reports });
  } catch (error: any) {
    console.error('Error listing reports:', error);
    return res.status(500).json({ message: error.message });
  }
}