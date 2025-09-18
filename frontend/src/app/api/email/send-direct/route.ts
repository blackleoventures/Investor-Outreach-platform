import { NextRequest, NextResponse } from 'next/server';
import { getApiBase } from '@/lib/api';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const backendUrl = await getApiBase();
    const apiUrl = `${backendUrl}/api/email/send-direct`;

    const tryFetch = async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      try {
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });
        clearTimeout(timeout);
        return response;
      } catch (err) {
        clearTimeout(timeout);
        throw err;
      }
    };

    let response: Response;
    try {
      response = await tryFetch();
    } catch (_) {
      // Retry once after a brief delay on network errors
      await new Promise((r) => setTimeout(r, 300));
      response = await tryFetch();
    }

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data?.error || 'Failed to send email' },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Email proxy error:', error);
    return NextResponse.json(
      { error: 'Backend server is not responding. Please check if the backend is running.' },
      { status: 500 }
    );
  }
}