import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  return (
    <div className="auth-page">
      <div className="animated-bg" />
      <SignIn
        fallbackRedirectUrl="/dashboard"
        forceRedirectUrl="/dashboard"
        appearance={{
          elements: {
            rootBox: { width: '100%', maxWidth: '440px' },
            card: { background: 'rgba(13, 13, 26, 0.8)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.08)' },
          }
        }}
      />
    </div>
  );
}
