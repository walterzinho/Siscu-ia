import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const scripts = await db.generatedScript.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    return NextResponse.json({ scripts })
  } catch (error) {
    console.error('Error fetching scripts:', error)
    return NextResponse.json({ error: 'Error al obtener libretos' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { id } = await request.json()
    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
    }
    await db.generatedScript.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting script:', error)
    return NextResponse.json({ error: 'Error al eliminar libreto' }, { status: 500 })
  }
}
