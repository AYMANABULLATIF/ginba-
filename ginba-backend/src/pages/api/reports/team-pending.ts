import { NextApiRequest, NextApiResponse } from 'next'
import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'

const prisma = new PrismaClient()
const SECRET = process.env.JWT_SECRET || 'mysupersecret'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  const { authorization } = req.headers
  if (!authorization) {
    return res.status(401).json({ message: 'No auth token' })
  }

  try {
    const token = authorization.replace('Bearer ', '')
    const decoded: any = jwt.verify(token, SECRET)

    // check role
    if (decoded.role !== 'TEAM_LEADER') {
      return res.status(403).json({ message: 'Forbidden: not a team leader' })
    }

    // find user in DB
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } })
    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    // for now, let's say you have a "teamId" on user (not in your code yet?)
    // or if you just want to show all pending, remove the team filter
    const reports = await prisma.report.findMany({
      where: {
        status: 'PENDING',
        // user: { teamId: user.teamId },  // if you store a teamId
      },
      include: { user: true },
    })

    return res.status(200).json({ reports })
  } catch (err: any) {
    console.log(err)
    return res.status(401).json({ message: 'Invalid token or error' })
  }
}
