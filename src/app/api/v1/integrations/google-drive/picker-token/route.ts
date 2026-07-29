import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/middlewares';
import { GoogleDriveOAuthTokenService } from '@/services/google-drive/GoogleDriveOAuthTokenService';

export const GET = withAuth(async (_req, session) => {
  try {
    const token = await GoogleDriveOAuthTokenService.getPickerToken(
      session.user.id
    );

    return NextResponse.json({ data: token });
  } catch (error: any) {
    if (error?.message === 'Google Drive is not connected.') {
      return NextResponse.json({ message: error.message }, { status: 409 });
    }

    return NextResponse.json(
      { message: error?.message || 'Could not prepare Google Drive Picker.' },
      { status: 500 }
    );
  }
});
