import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from 'react-email';

interface EduFlowPasswordChangedEmailProps {
  userName: string;
}

export const EduFlowPasswordChangedEmail = ({
  userName,
}: EduFlowPasswordChangedEmailProps) => (
  <Html>
    <Head />
    <Preview>Your password has been successfully changed</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Password Changed</Heading>
        <Section style={section}>
          <Text style={text}>Hi {userName},</Text>
          <Text style={text}>
            This is a confirmation that the password for your EduFlow account
            has just been changed.
          </Text>
          <Text style={text}>
            If you did not make this change, please contact our support team
            immediately or try to reset your password.
          </Text>
          <Text style={text}>Happy learning!</Text>
          <Text style={footer}>— The EduFlow Team</Text>
        </Section>
      </Container>
    </Body>
  </Html>
);

export default EduFlowPasswordChangedEmail;

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
};

const section = {
  padding: '0 48px',
};

const h1 = {
  color: '#333',
  fontSize: '24px',
  fontWeight: 'bold',
  textAlign: 'center' as const,
  margin: '30px 0',
};

const text = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '26px',
  textAlign: 'left' as const,
};

const footer = {
  color: '#8898aa',
  fontSize: '12px',
  lineHeight: '16px',
};
