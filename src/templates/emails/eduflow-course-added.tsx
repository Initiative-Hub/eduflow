import {
  Body,
  Button,
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
} from 'react-email';
import { APP_URL } from '@/lib/api/endpoints';

interface EduFlowCourseAddedEmailProps {
  courseName: string;
  courseUrl: string;
  userName: string;
}

export function EduFlowCourseAddedEmail({
  courseName,
  courseUrl,
  userName,
}: EduFlowCourseAddedEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>You were added to {courseName}</Preview>
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
              <Heading className="m-0 text-center font-semibold text-[28px] text-slate-950 tracking-tight">
                You were added to a course
              </Heading>
              <Text className="mt-6 mb-0 text-center text-[15px] text-slate-600 leading-7">
                Hi {userName || 'there'}, you now have access to{' '}
                <strong>{courseName}</strong> on EduFlow.
              </Text>
              <Section className="mt-8 text-center">
                <Button
                  href={courseUrl}
                  className="rounded-xl bg-slate-950 px-6 py-3 font-semibold text-[14px] text-white"
                >
                  Open course
                </Button>
              </Section>
              <Hr className="my-8 border-slate-200" />
              <Text className="m-0 text-center text-[12px] text-slate-400 leading-6">
                If you were not expecting this, contact the course owner.
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

EduFlowCourseAddedEmail.PreviewProps = {
  courseName: 'Practical English Communication',
  courseUrl: `${APP_URL}/courses/example`,
  userName: 'Khang',
} satisfies EduFlowCourseAddedEmailProps;

export default EduFlowCourseAddedEmail;
