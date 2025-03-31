import { NextApiRequest, NextApiResponse } from 'next'
import { PrismaClient, ReportStatus } from '@prisma/client'
import jwt from 'jsonwebtoken'

const prisma = new PrismaClient()
const SECRET = process.env.JWT_SECRET || 'mysupersecret'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { reportId } = req.query
  if (req.method !== 'PUT') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  const { authorization } = req.headers
  if (!authorization) {
    return res.status(401).json({ message: 'No auth token' })
  }

  try {
    const token = authorization.replace('Bearer ', '')
    const decoded: any = jwt.verify(token, SECRET)

    if (decoded.role !== 'TEAM_LEADER') {
      return res.status(403).json({ message: 'Forbidden: not a team leader' })
    }

    const { action, comment } = req.body

    // Use the actual ReportStatus enum values instead of strings
    let newStatus: ReportStatus = ReportStatus.PENDING
    if (action === 'approve') {
      newStatus = ReportStatus.LEADER_APPROVED
    } else if (action === 'reject') {
      newStatus = ReportStatus.LEADER_REJECTED
    } else {
      return res.status(400).json({ message: 'Invalid action' })
    }

    const updated = await prisma.report.update({
      where: { id: String(reportId) },
      data: {
        status: newStatus,
        // you might store comment in a separate field or table
      }
    })

    return res.status(200).json({ report: updated })
  } catch (err: any) {
    console.log(err)
    return res.status(401).json({ message: 'Invalid token or error' })
  }
}