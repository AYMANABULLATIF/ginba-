// pages/api/reports/[id].ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { PrismaClient } from '@prisma/client'
import { verifyToken } from '../../../lib/auth'

const prisma = new PrismaClient()

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Set CORS headers - VERY IMPORTANT
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle preflight request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Get the report ID from the request
  const { id } = req.query
  
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ message: 'Invalid report ID' })
  }

  // Authentication check
  const { authorization } = req.headers
  if (!authorization) {
    return res.status(401).json({ message: 'Missing Authorization header' })
  }

  const token = authorization.replace('Bearer ', '')
  const decoded = verifyToken(token)
  if (!decoded) {
    return res.status(401).json({ message: 'Invalid token' })
  }

  try {
    if (req.method === 'GET') {
      const report = await prisma.report.findUnique({
        where: { id },
      })

      if (!report) {
        return res.status(404).json({ message: 'Report not found' })
      }

      return res.status(200).json({ report })
    } else {
      return res.status(405).json({ message: 'Method not allowed' })
    }
  } catch (error: any) {
    console.error("Error handling report request:", error);
    return res.status(500).json({ message: error.message })
  }
}