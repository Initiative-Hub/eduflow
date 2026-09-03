import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/middlewares';
import { oneDrivePickerTokenSchema } from '@/lib/validations/onedrive-export.schema';
import { OneDriveOAuthTokenService } from '@/services/onedrive/OneDriveOAuthTokenService';

export const POST = withAuth(async (req, session) => {
  const parsed = oneDrivePickerTokenSchema.safeParse(
    await req.json().catch(() => ({}))
  );
  if (!parsed.success) {
    return NextResponse.json(
      { message: 'Invalid OneDrive picker token request.' },
      { status: 400 }
    );
  }

  try {
    const token = await OneDriveOAuthTokenService.getPickerToken(
      session.user.id,
      parsed.data
    );

    return NextResponse.json({ data: token });
  } catch (error: any) {
    if (error?.message === 'OneDrive is not connected.') {
      return NextResponse.json({ message: error.message }, { status: 409 });
    }

    return NextResponse.json(
      { message: error?.message || 'Could not prepare OneDrive Picker.' },
      { status: 500 }
    );
  }
});
