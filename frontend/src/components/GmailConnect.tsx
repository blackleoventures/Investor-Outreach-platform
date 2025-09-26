"use client";

import { useState } from 'react';
import { Button, message } from 'antd';
import { GoogleOutlined } from '@ant-design/icons';

interface GmailConnectProps {
  clientId?: string;
  onConnected?: (tokens: any) => void;
}

export default function GmailConnect({ clientId, onConnected }: GmailConnectProps) {
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);

  const connectGmail = async () => {
    setConnecting(true);
    try {
      // Get OAuth URL from backend
      const response = await fetch('/api/oauth/google/url');
      const data = await response.json();
      
      if (data.success) {
        // Open Google OAuth popup
        const popup = window.open(
          data.authUrl,
          'gmail-oauth',
          'width=500,height=600,scrollbars=yes,resizable=yes'
        );

        // Listen for OAuth callback
        const checkClosed = setInterval(() => {
          if (popup?.closed) {
            clearInterval(checkClosed);
            setConnecting(false);
          }
        }, 1000);

        // Handle OAuth success (simplified - in production use postMessage)
        window.addEventListener('message', (event) => {
          if (event.data.type === 'GMAIL_OAUTH_SUCCESS') {
            setConnected(true);
            setConnecting(false);
            message.success('Gmail connected successfully!');
            onConnected?.(event.data.tokens);
            popup?.close();
          }
        });
      }
    } catch (error) {
      console.error('Gmail connect error:', error);
      message.error('Failed to connect Gmail');
      setConnecting(false);
    }
  };

  if (connected) {
    return (
      <div className="flex items-center gap-2 text-green-600">
        <GoogleOutlined />
        <span>Gmail Connected ✓</span>
      </div>
    );
  }

  return (
    <Button
      type="primary"
      icon={<GoogleOutlined />}
      loading={connecting}
      onClick={connectGmail}
      className="bg-red-500 hover:bg-red-600 border-red-500"
    >
      {connecting ? 'Connecting...' : 'Connect Gmail'}
    </Button>
  );
}