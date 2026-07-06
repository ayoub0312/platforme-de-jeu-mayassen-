import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'Aucun fichier fourni.' }, { status: 400 })
    }

    // Validate size (2MB max — stockage en base de données)
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Le fichier dépasse la limite de 2 Mo.' },
        { status: 400 }
      )
    }

    // Validate type (image or PDF)
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Format de fichier invalide. Seuls les images et les PDF sont autorisés.' },
        { status: 400 }
      )
    }

    // Convert to base64 for storage in SQLite database
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const fileData = buffer.toString('base64')
    const fileMimeType = file.type

    return NextResponse.json({ fileData, fileMimeType })
  } catch (error: any) {
    console.error('Erreur lors de la conversion du ticket en base64:', error)
    return NextResponse.json(
      { error: error.message || 'Erreur lors du traitement du ticket.' },
      { status: 500 }
    )
  }
}
