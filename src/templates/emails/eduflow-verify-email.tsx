import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Preview,
  Section,
  Tailwind,
  Text,
} from '@react-email/components';
import { APP_URL } from '@/lib/api/endpoints';

interface EduFlowVerifyEmailProps {
  otp?: string;
}

export function EduFlowVerifyEmail({ otp }: EduFlowVerifyEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Your EduFlow verification code</Preview>
      <Tailwind>
        <Body className="bg-slate-100 px-4 py-8 font-sans text-slate-950">
          <Container className="mx-auto max-w-[600px] overflow-hidden rounded-3xl border border-slate-200 border-solid bg-white shadow-sm">
            <Section className="border-slate-200 border-b border-solid bg-white px-8 py-8 text-center">
              <Img
                src={`${APP_URL}/branding.png`}
                alt="EduFlow logo"
                width="180"
                height="49"
                className="mx-auto h-auto w-[180px] max-w-full"
              />
            </Section>

            <Section className="px-8 py-10">
              <Heading className="m-0 text-center font-semibold text-[28px] text-slate-950 tracking-tight">
                Welcome to EduFlow
              </Heading>

              <Text className="mt-6 mb-0 text-center text-[15px] text-slate-600 leading-7">
                Thank you for joining us. Please use the following code to
                verify your email address:
              </Text>

              <Section className="my-8 rounded-2xl bg-violet-50 px-6 py-7 text-center">
                <Text className="m-0 font-medium text-[13px] text-violet-700 uppercase tracking-[0.28em]">
                  Verification code
                </Text>
                <Text className="m-0 mt-4 font-semibold text-[36px] text-slate-950 tracking-[0.35em]">
                  {otp}
                </Text>
              </Section>

              <Text className="m-0 text-center text-[14px] text-slate-500 leading-6">
                This code is valid for a few minutes. For your security, do not
                share this code with anyone.
              </Text>

              <Hr className="my-8 border-slate-200" />

              <Text className="m-0 text-center text-[12px] text-slate-400 leading-6">
                If you did not request this code, you can safely ignore this
                email.
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

EduFlowVerifyEmail.PreviewProps = {
  otp: '666666',
} satisfies EduFlowVerifyEmailProps;

export default EduFlowVerifyEmail;
