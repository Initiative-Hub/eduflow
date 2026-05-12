import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Tailwind,
  Text,
} from 'react-email';
import { APP_URL } from '@/lib/api/endpoints';

interface EduFlowResetPasswordEmailProps {
  expirationMinutes?: number;
  resetPasswordUrl?: string;
  userName?: string;
}

export function EduFlowResetPasswordEmail({
  expirationMinutes,
  resetPasswordUrl,
  userName,
}: EduFlowResetPasswordEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Reset your EduFlow password</Preview>
      <Tailwind>
        <Body className="bg-slate-100 px-4 py-8 font-sans text-slate-950">
          <Container className="mx-auto max-w-150 overflow-hidden rounded-3xl border border-slate-200 border-solid bg-white shadow-sm">
            <Section className="border-slate-200 border-b border-solid bg-white px-8 py-8 text-center">
              <Img
                src={`${APP_URL}/branding.png`}
                alt="EduFlow logo"
                width="180"
                height="49"
                className="mx-auto h-auto w-45 max-w-full"
              />
            </Section>

            <Section className="px-8 py-10">
              <Heading className="m-0 font-semibold text-[28px] text-slate-950 tracking-tight">
                Reset your password
              </Heading>

              <Text className="mt-6 mb-0 text-[15px] text-slate-700 leading-7">
                Hello {userName || 'User'},
              </Text>

              <Text className="mt-4 mb-0 text-[15px] text-slate-600 leading-7">
                We received a request to reset your password. Click the button
                below to proceed:
              </Text>

              <Section className="py-8 text-center">
                <Button
                  href={resetPasswordUrl}
                  className="rounded-xl bg-violet-600 px-6 py-3 text-center font-semibold text-[15px] text-white no-underline"
                >
                  Reset Password
                </Button>
              </Section>

              <Text className="m-0 text-[14px] text-slate-500 leading-6">
                This link will expire in {expirationMinutes} minutes. If you
                didn&apos;t request this, you can safely ignore this email.
              </Text>

              <Hr className="my-8 border-slate-200" />

              <Text className="m-0 text-[12px] text-slate-400 leading-6">
                Or copy and paste this link in your browser:
              </Text>
              <Link
                href={resetPasswordUrl}
                className="mt-3 block break-all text-[13px] text-violet-700 leading-6 underline"
              >
                {resetPasswordUrl}
              </Link>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

EduFlowResetPasswordEmail.PreviewProps = {
  expirationMinutes: 15,
  resetPasswordUrl: 'http://localhost:3000/reset-password?token=example',
  userName: 'Alex',
} satisfies EduFlowResetPasswordEmailProps;

export default EduFlowResetPasswordEmail;
