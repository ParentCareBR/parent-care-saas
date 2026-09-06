import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

function isValidUuid(id?: string | null): boolean {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    if (!id || !isValidUuid(id)) {
      return NextResponse.json({ error: 'ID inválido.' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('photo') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado.' }, { status: 400 });
    }

    // Validate size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'A imagem deve ter no máximo 5MB.' }, { status: 400 });
    }

    // Validate MIME
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Formato inválido. Use JPEG, PNG ou WebP.' }, { status: 400 });
    }

    const adminSupabase = createAdminClient();
    const buffer = Buffer.from(await file.arrayBuffer());
    const fileExt = file.name.split('.').pop() || 'jpg';
    const filePath = `cared-people/${id}/${Date.now()}.${fileExt}`;

    let photoUrl = '';

    try {
      // 1. Ensure bucket exists
      const { data: buckets } = await adminSupabase.storage.listBuckets();
      const bucketName = 'cared-people-photos';
      const exists = buckets?.some(b => b.name === bucketName);
      if (!exists) {
        await adminSupabase.storage.createBucket(bucketName, {
          public: true,
          fileSizeLimit: 5242880,
        });
      }

      // 2. Upload file
      const { error: uploadError } = await adminSupabase.storage
        .from(bucketName)
        .upload(filePath, buffer, {
          contentType: file.type,
          upsert: true,
        });

      if (uploadError) {
        throw uploadError;
      }

      // 3. Get Public / Signed URL
      const { data: publicUrlData } = adminSupabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);

      photoUrl = publicUrlData.publicUrl;
    } catch (storageErr: any) {
      console.warn('Storage upload error, using base64 fallback:', storageErr?.message);
      // Fallback: encode as inline data URL
      photoUrl = `data:${file.type};base64,${buffer.toString('base64')}`;
    }

    // Update cared_people
    await adminSupabase
      .from('cared_people')
      .update({
        photo_url: photoUrl,
        photo_path: filePath,
      })
      .eq('id', id);

    return NextResponse.json({
      success: true,
      photo_url: photoUrl,
      photo_path: filePath,
      message: 'Foto atualizada com sucesso.',
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Erro ao processar upload da foto.' }, { status: 500 });
  }
}
