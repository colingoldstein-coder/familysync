import { useEffect, useRef } from 'react';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

export default function GoogleSignInButton({ onSuccess, onError }) {
  const btnRef = useRef(null);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || !window.google?.accounts?.id) return;

    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: (response) => {
        if (response.credential) {
          onSuccess(response.credential);
        } else {
          onError?.(new Error('Google sign-in failed'));
        }
      },
    });

    window.google.accounts.id.renderButton(btnRef.current, {
      theme: 'filled_black',
      size: 'large',
      width: btnRef.current.offsetWidth,
      text: 'signin_with',
    });
  }, [onSuccess, onError]);

  if (!GOOGLE_CLIENT_ID) return null;

  return <div ref={btnRef} className="google-btn-wrapper" />;
}
